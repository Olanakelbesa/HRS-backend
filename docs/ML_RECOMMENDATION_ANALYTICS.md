# ML Recommendation System — Analytics & Training

This document describes the **LightFM-based recommendation pipeline**, how training is triggered, how performance metrics are stored and exposed, and how the **admin ML Analytics** UI consumes those APIs.

---

## Table of contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Services & ports](#services--ports)
4. [Training pipeline](#training-pipeline)
5. [Interaction weights](#interaction-weights)
6. [Performance metrics](#performance-metrics)
7. [Data storage](#data-storage)
8. [API reference](#api-reference)
9. [Admin frontend](#admin-frontend)
10. [Environment variables](#environment-variables)
11. [Docker & local development](#docker--local-development)
12. [Troubleshooting](#troubleshooting)

---

## Overview

The Smart House Rental platform uses a **collaborative filtering** model ([LightFM](https://github.com/lyst/lightfm)) to rank properties per renter. Training:

1. Pulls interaction and catalog data from the main backend.
2. Builds a sparse user–item matrix with weighted implicit feedback.
3. Trains a WARP-loss model and evaluates AUC / precision@10.
4. Precomputes top-20 property IDs per user into **recommendation-db** and **Redis**.

Admins can **train the model**, view **scores and dataset analytics**, and inspect **training history** via dedicated APIs and the **ML Analytics** admin page.

---

## Architecture

```text
┌─────────────────┐     POST /admin/recommendations/train      ┌──────────────────────────┐
│  SHR Frontend   │ ─────────────────────────────────────────► │  Express Backend         │
│  /admin/ml-     │     GET  /admin/recommendations/analytics  │  (port 5000)             │
│   analytics     │     GET  /admin/recommendations/history    └───────────┬──────────────┘
└─────────────────┘                                                        │
                                                                             │ HTTP (Docker network)
                                                                             ▼
┌─────────────────┐     GET /api/v1/internal/recommendation-data ┌──────────────────────────┐
│  Main Postgres  │ ◄───────────────────────────────────────────── │  Recommendation Service  │
│  (house_rental) │                                                │  FastAPI (port 8001)     │
└─────────────────┘                                                └───────────┬──────────────┘
                                                                             │
                    ┌────────────────────────────────────────────────────────┼────────────────────┐
                    ▼                                                        ▼                    ▼
         ┌──────────────────┐                              ┌──────────────────┐    ┌─────────────┐
         │ recommendation-db │                            │ Redis (db 1)     │    │ train.py    │
         │ user_recommendations│                            │ recommendations:*│    │ LightFM     │
         │ training_analytics  │                            │ training:analytics│   └─────────────┘
         └──────────────────┘                              └──────────────────┘
```

**Flow summary**

| Step | Actor                  | Action                                                            |
| ---- | ---------------------- | ----------------------------------------------------------------- |
| 1    | Admin UI               | `POST /api/v1/admin/recommendations/train`                        |
| 2    | Backend                | Proxies to `POST http://recommendation-service:8001/api/v1/train` |
| 3    | Recommendation service | `GET http://backend:5000/api/v1/internal/recommendation-data`     |
| 4    | Recommendation service | Train LightFM, evaluate, save predictions + analytics             |
| 5    | Admin UI               | `GET /api/v1/admin/recommendations/analytics` for dashboard       |

---

## Services & ports

| Service                | Container name                 | Default port | Role                                         |
| ---------------------- | ------------------------------ | ------------ | -------------------------------------------- |
| Backend                | `smart-rental-backend`         | 5000         | Main API, internal data export               |
| Recommendation service | `smart-rental-recommendations` | 8001         | Training + inference API                     |
| Recommendation DB      | `smart-rental-rec-db`          | 5433 (host)  | Stores precomputed lists + analytics         |
| Main Postgres          | `smart-rental-postgres`        | 5432         | Source data for training export              |
| Redis                  | `smart-rental-redis`           | 6379         | Cache for recommendations + latest analytics |

---

## Training pipeline

Implementation: `backend_fork/recommendation-service/train.py`

### 1. Fetch training data

- **URL:** `{BACKEND_URL}/api/v1/internal/recommendation-data`
- **Default `BACKEND_URL`:** `http://backend:5000` (Docker Compose)
- **Payload sections:**
  - `interactions` — user events (VIEW, LIKE_ADDED, SAVE_ADDED, etc.)
  - `preferences` — renter preference profiles (cold-start users)
  - `properties` — listing IDs in the catalog

### 2. Preprocess interactions

- Map event `type` → numeric weight (see [Interaction weights](#interaction-weights)).
- **Deduplicate** `(userId, propertyId)` pairs (keep max score).
- Fit LightFM `Dataset` with all users (interactions + preferences) and all property IDs.

### 3. Train / test split

- **80% train / 20% test** via `random_train_test_split` (`random_state=42`).
- **Sample weights** must be a **COO sparse matrix** with identical `(row, col)` ordering as `train_interactions` (LightFM requirement).

### 4. Model training

| Hyperparameter    | Value                                       |
| ----------------- | ------------------------------------------- |
| Algorithm         | LightFM                                     |
| Loss              | `warp` (Weighted Approximate-Rank Pairwise) |
| Latent components | 30                                          |
| Epochs            | 10                                          |
| Learning rate     | 0.05                                        |
| Random state      | 42                                          |

### 5. Evaluation

- **Train AUC** — ranking quality on training interactions.
- **Test AUC** — generalization on held-out 20% (requires `train_interactions` mask for LightFM).
- **Precision@10** — fraction of top-10 recommendations that match known interactions.
- If test evaluation fails (e.g. split overlap), train-only metrics are still recorded and `evaluation_note` is set.

### 6. Deployment

- For each user in the dataset: `predict` scores for all items → top **20** property IDs.
- **Upsert** into `user_recommendations` (PostgreSQL).
- **Cache** in Redis: `recommendations:{userId}` (TTL 3600s).
- **Persist** full analytics report (PostgreSQL + Redis `training:analytics:latest`).

Typical training duration: **~15–30 seconds** with seeded demo data (depends on interaction volume).

---

## Interaction weights

Events are treated as **implicit feedback** with fixed weights:

| Event type   | Weight | Meaning             |
| ------------ | ------ | ------------------- |
| `VIEW`       | 1.0    | Weak signal         |
| `SHARE`      | 3.0    | Light engagement    |
| `LIKE_ADDED` | 5.0    | Positive preference |
| `SAVE_ADDED` | 8.0    | Strong intent       |
| `CONTACT`    | 15.0   | High intent         |
| `SCHEDULE`   | 15.0   | High intent         |

Types not in this map default to `0.0` and are effectively ignored after scoring.

---

## Performance metrics

### AUC (Area Under the Curve)

- Range: **0.0 – 1.0** (higher is better).
- Measures how well the model ranks positive interactions above negatives.
- **Train AUC** — fit on training data.
- **Test AUC** — held-out users/interactions; primary **generalization** indicator.

**Grades** (used in UI `performance_summary`):

| Grade             | AUC range |
| ----------------- | --------- |
| excellent         | ≥ 0.90    |
| good              | ≥ 0.80    |
| fair              | ≥ 0.70    |
| needs_improvement | &lt; 0.70 |

### Precision@10

- Fraction of the model’s **top-10** recommended items that appear in the user’s known interaction set.
- **Test precision@10** is usually lower than train — normal for recommendation systems.

### Coverage (`deployment.users_recommended`)

- Count of users for whom top-20 lists were written to DB/cache after the last successful run.

---

## Data storage

### PostgreSQL (`recommendation-db`)

**`user_recommendations`**

| Column                     | Type         | Description                            |
| -------------------------- | ------------ | -------------------------------------- |
| `user_id`                  | VARCHAR (PK) | Renter user ID                         |
| `recommended_property_ids` | JSONB        | Ordered array of property IDs (max 20) |
| `updated_at`               | TIMESTAMP    | Last training write                    |

**`training_analytics`**

| Column   | Type      | Description                              |
| -------- | --------- | ---------------------------------------- |
| `id`     | SERIAL    | Run ID                                   |
| `run_at` | TIMESTAMP | Insert time                              |
| `status` | VARCHAR   | `completed` or `failed`                  |
| `report` | JSONB     | Full analytics object (see sample below) |

### Redis

| Key pattern                 | TTL   | Content                    |
| --------------------------- | ----- | -------------------------- |
| `recommendations:{userId}`  | 3600s | JSON array of property IDs |
| `training:analytics:latest` | none  | Latest full analytics JSON |

---

## API reference

All admin routes require **authentication** and role **`admin`** (`requireAuth` + `restrictTo('admin')`).

Base path: `/api/v1/admin`

### Trigger training

```http
POST /api/v1/admin/recommendations/train
Authorization: Bearer <admin_jwt>
```

**Success (200)**

```json
{
  "status": "success",
  "data": {
    "message": "Training pipeline completed successfully.",
    "analytics": { "...full report..." }
  }
}
```

**Error (500)** — e.g. recommendation service unreachable, empty dataset, LightFM error.

---

### Latest analytics

```http
GET /api/v1/admin/recommendations/analytics
Authorization: Bearer <admin_jwt>
```

**Success (200)**

```json
{
  "status": "success",
  "data": {
    "status": "completed",
    "trained_at": "2026-06-03T21:15:10.925082+00:00",
    "model": {
      "algorithm": "LightFM",
      "loss": "warp",
      "components": 30,
      "epochs": 10,
      "learning_rate": 0.05,
      "test_split_ratio": 0.2
    },
    "interaction_weights": { "VIEW": 1.0, "LIKE_ADDED": 5.0, "...": "..." },
    "dataset": {
      "users": 100,
      "items": 300,
      "properties": 300,
      "users_with_preferences": 100,
      "interactions_raw": 16487,
      "interactions_unique": 6114,
      "train_interactions": 4891,
      "test_interactions": 1223
    },
    "interaction_breakdown": {
      "VIEW": 9566,
      "LIKE_ADDED": 3399
    },
    "performance": {
      "train_auc": 0.917,
      "test_auc": 0.834,
      "train_precision_at_10": 0.826,
      "test_precision_at_10": 0.265,
      "evaluation_note": null
    },
    "performance_summary": {
      "train_auc_grade": "excellent",
      "test_auc_grade": "good",
      "train_auc_percent": 91.68,
      "test_auc_percent": 83.41
    },
    "deployment": {
      "users_recommended": 100,
      "recommendations_per_user": 20,
      "cache_ttl_seconds": 3600
    }
  }
}
```

**Not found (404)** — no training run recorded yet.

---

### Training history

```http
GET /api/v1/admin/recommendations/history?limit=10
Authorization: Bearer <admin_jwt>
```

- `limit`: 1–50 (default 10).

**Success (200)**

```json
{
  "status": "success",
  "data": {
    "runs": [
      {
        "id": 3,
        "run_at": "2026-06-03T21:15:11.123456",
        "status": "completed",
        "trained_at": "2026-06-03T21:15:10.925082+00:00",
        "train_auc": 0.917,
        "test_auc": 0.834,
        "users": 100,
        "items": 300,
        "users_recommended": 100
      }
    ]
  }
}
```

---

### Internal data export (service-to-service)

```http
GET /api/v1/internal/recommendation-data
```

Used by the recommendation service during training. Intended for **internal network** (Docker Compose); not for public clients.

---

### Recommendation service (direct)

| Method | Path                                         | Description                |
| ------ | -------------------------------------------- | -------------------------- |
| `POST` | `/api/v1/train`                              | Run training synchronously |
| `GET`  | `/api/v1/training/analytics`                 | Latest report              |
| `GET`  | `/api/v1/training/history?limit=N`           | Run summaries              |
| `GET`  | `/api/v1/recommendations/{user_id}?limit=10` | Cached or DB-backed list   |
| `GET`  | `/health`                                    | Health check               |

---

## Admin frontend

### Navigation

| Sidebar label    | Route                 | Component                                          |
| ---------------- | --------------------- | -------------------------------------------------- |
| Analytics        | `/admin/analytics`    | Platform-wide stats (users, listings, audit, etc.) |
| **ML Analytics** | `/admin/ml-analytics` | ML training & performance dashboard                |

### ML Analytics page features

- **Train model** — calls `POST /admin/recommendations/train` (~15–30s; show loading toast).
- **Refresh** — reloads latest analytics.
- **KPI cards** — Train/Test AUC (progress + grade badges), Test precision@10, users with recommendations.
- **Dataset panel** — users, items, raw vs unique interactions, train/test split sizes.
- **Model configuration** — LightFM hyperparameter chips.
- **Interaction bar chart** — event type distribution (Recharts).
- **Training history table** — last 8 runs with AUC and coverage.
- **Empty state** — prompts first training when API returns 404.

### Frontend files

| Path                                                                     | Purpose                                   |
| ------------------------------------------------------------------------ | ----------------------------------------- |
| `SHR-frontend/src/pages/admin/MlAnalyticsPage.jsx`                       | Page shell                                |
| `SHR-frontend/src/features/admin/components/AdminMlAnalyticsSection.jsx` | UI implementation                         |
| `SHR-frontend/src/features/admin/api.js`                                 | API client methods                        |
| `SHR-frontend/src/features/admin/hooks/useAdmin.js`                      | React Query hooks                         |
| `SHR-frontend/src/components/AdminSidebar.jsx`                           | Sidebar entry                             |
| `SHR-frontend/src/locales/en/translation.json`                           | `adminMlAnalytics`, `sidebar.mlAnalytics` |
| `SHR-frontend/src/locales/am/translation.json`                           | Amharic strings                           |

### React Query hooks

- `useMlRecommendationAnalytics()` — latest report; treats 404 as empty (not error).
- `useMlTrainingHistory(limit)` — history rows.
- `useTriggerMlTraining()` — mutation; invalidates analytics + history on success.

### Overview page (optional)

`admin/Overview` still has a **Retrain ML Model** shortcut button; full metrics live on **ML Analytics**.

---

## Environment variables

### Backend (`backend_fork/.env` / `docker-compose.yml`)

| Variable             | Default (Compose)                    | Description                      |
| -------------------- | ------------------------------------ | -------------------------------- |
| `RECOMMENDATION_URL` | `http://recommendation-service:8001` | Proxy target for train/analytics |
| `DATABASE_URL`       | (see compose)                        | Main DB for internal export      |
| `REDIS_URL`          | `redis://redis:6379`                 | Main app Redis                   |

For **local Docker**, comment out host `DATABASE_URL` / `REDIS_URL` in `.env` so Compose uses internal `postgres` and `redis` hostnames.

### Recommendation service

| Variable                | Default                                                                 | Description                     |
| ----------------------- | ----------------------------------------------------------------------- | ------------------------------- |
| `BACKEND_URL`           | `http://backend:5000`                                                   | Training data source            |
| `RECOMMENDATION_DB_URL` | `postgresql://postgres:postgres@recommendation-db:5432/recommendations` | Analytics + precomputed lists   |
| `REDIS_URL`             | `redis://redis:6379/1`                                                  | Cache (DB index 1)              |
| `MAIN_DB_URL`           | (compose)                                                               | Used by other modules if needed |

---

## Docker & local development

### Start stack

```bash
cd backend_fork
docker compose up --build -d
```

Ensure these containers are healthy:

- `smart-rental-backend`
- `smart-rental-recommendations`
- `smart-rental-postgres`
- `smart-rental-rec-db`
- `smart-rental-redis`

### Rebuild after code changes

```bash
docker compose build recommendation-service backend
docker compose up -d recommendation-service backend
```

### Frontend

```bash
cd SHR-frontend
npm run dev
```

Open: `http://localhost:5173/admin/ml-analytics` (port may vary).

### Manual API test

```bash
# Train (direct to recommendation service)
curl -X POST http://localhost:8001/api/v1/train

# Analytics
curl http://localhost:8001/api/v1/training/analytics
```

With admin JWT:

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/v1/admin/recommendations/analytics
```

---

## Troubleshooting

### `POST .../train` returns 500

| Symptom                              | Likely cause                        | Fix                                                                   |
| ------------------------------------ | ----------------------------------- | --------------------------------------------------------------------- |
| `Can't reach database` (Prisma)      | Backend points to unreachable RDS   | Use Compose Postgres: unset `DATABASE_URL` in `.env` for local Docker |
| `Sample_weight must be a COO matrix` | Old recommendation image            | Rebuild `recommendation-service`                                      |
| `Failed to fetch training data`      | Backend down or wrong `BACKEND_URL` | Check `smart-rental-backend` logs and network                         |
| `Empty dataset`                      | No interactions/properties in DB    | Seed data or generate user activity                                   |

### Analytics 404

- No successful training run yet → run **Train model** once.

### `users_recommended: 0` in report

- Usually a user-ID mapping bug (fixed: use `user_id_to_internal` from LightFM mapping). Rebuild recommendation service and retrain.

### Frontend cannot load ML Analytics

- Confirm backend exposes new routes (rebuild backend image).
- Check `VITE_API_URL` (or equivalent) points to backend `http://localhost:5000`.
- Admin role required.

### Redis `ECONNREFUSED` on host dev

- If backend runs on **host** with `REDIS_URL=redis://localhost:6379`, start Redis or use Docker backend with `redis://redis:6379`.

### Slow Docker builds (`npm ci` ~5+ min)

- First build downloads all Node deps; subsequent builds cache unless `package-lock.json` changes.
- Dockerfile uses BuildKit npm cache mount; keep project off OneDrive sync if I/O is slow.

---

## Related backend source files

| File                              | Role                              |
| --------------------------------- | --------------------------------- |
| `recommendation-service/train.py` | Training, evaluation, persistence |
| `recommendation-service/app.py`   | FastAPI routes                    |
| `src/modules/admin/controller.ts` | Admin proxy handlers              |
| `src/modules/admin/routes.ts`     | Route + Swagger definitions       |
| `src/modules/internal/routes.ts`  | `recommendation-data` export      |
| `docker-compose.yml`              | Service wiring                    |

---

## Version notes

- **LightFM** requires aligned COO weight matrices for `sample_weight`.
- Analytics are **append-only** in `training_analytics`; “latest” is the most recent row by `run_at`.
- Renter-facing recommendations may also be served from main backend logic; precomputed lists in recommendation-db accelerate reads via `GET /api/v1/recommendations/{user_id}` on the recommendation service.

For platform-wide admin metrics (non-ML), use **`GET /api/v1/admin/analytics`** and the **Analytics** sidebar page.
