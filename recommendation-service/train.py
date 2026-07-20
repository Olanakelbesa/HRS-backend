import os
import logging
import psycopg2
import pandas as pd
import numpy as np
from datetime import datetime, timezone
from scipy.sparse import coo_matrix
from lightfm import LightFM
from lightfm.data import Dataset
from lightfm.cross_validation import random_train_test_split
from lightfm.evaluation import auc_score, precision_at_k
import json
import redis
import requests

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
BACKEND_URL = os.environ.get("BACKEND_URL", "http://backend:5000")
REC_DB_URL = os.environ.get("RECOMMENDATION_DB_URL", "postgresql://postgres:postgres@recommendation-db:5432/recommendations")
REDIS_URL = os.environ.get("REDIS_URL", "redis://redis:6379/1")
ANALYTICS_CACHE_KEY = "training:analytics:latest"

MODEL_CONFIG = {
    "algorithm": "LightFM",
    "loss": "warp",
    "components": 30,
    "epochs": 10,
    "learning_rate": 0.05,
    "test_split_ratio": 0.2,
}

# Interaction weights matching implementation plan
WEIGHTS = {
    'VIEW': 1.0,
    'LIKE_ADDED': 5.0,
    'SAVE_ADDED': 8.0,
    'CONTACT': 15.0,
    'SCHEDULE': 15.0,
    'SHARE': 3.0
}


def _parse_category(category) -> str:
    if isinstance(category, dict):
        label = category.get("en") or category.get("am") or ""
        return str(label).upper().replace(" ", "_")
    if isinstance(category, str):
        return category.upper().replace(" ", "_")
    return ""


def _parse_amenities(raw) -> list[str]:
    if not isinstance(raw, list):
        return []
    labels = []
    for entry in raw:
        if isinstance(entry, str):
            labels.append(entry.lower())
        elif isinstance(entry, dict):
            label = entry.get("en") or entry.get("am") or ""
            if label:
                labels.append(str(label).lower())
    return labels


def _budget_bucket(max_price) -> str | None:
    if max_price is None or (isinstance(max_price, float) and np.isnan(max_price)):
        return None
    value = float(max_price)
    if value <= 10000:
        return "budget:low"
    if value <= 25000:
        return "budget:mid"
    return "budget:high"


def _pref_to_features(row) -> list[str]:
    feats = []
    preferred_type = row.get("preferredType")
    if preferred_type and not (isinstance(preferred_type, float) and np.isnan(preferred_type)):
        feats.append(f"type:{str(preferred_type).upper()}")

    furnish = row.get("furnishStatus")
    if furnish and not (isinstance(furnish, float) and np.isnan(furnish)):
        feats.append(f"furnish:{str(furnish).lower()}")

    bedrooms = row.get("preferredBedrooms")
    if bedrooms is not None and not (isinstance(bedrooms, float) and np.isnan(bedrooms)):
        feats.append(f"bedrooms:{int(bedrooms)}")

    bucket = _budget_bucket(row.get("preferredPriceMax"))
    if bucket:
        feats.append(bucket)

    amenities = row.get("preferredAmenities") or []
    if isinstance(amenities, list):
        for amenity in amenities:
            if amenity:
                feats.append(f"amenity:{str(amenity).lower()}")

    return feats


def _property_to_features(row) -> list[str]:
    feats = []
    category = _parse_category(row.get("category"))
    if category:
        feats.append(f"type:{category}")

    bedrooms = row.get("bedrooms")
    if bedrooms is not None and not (isinstance(bedrooms, float) and np.isnan(bedrooms)):
        feats.append(f"bedrooms:{int(bedrooms)}")

    furnish = row.get("furnishingStatus")
    if furnish and not (isinstance(furnish, float) and np.isnan(furnish)):
        feats.append(f"furnish:{str(furnish).lower()}")

    for amenity in _parse_amenities(row.get("amenities")):
        feats.append(f"amenity:{amenity}")

    return feats


def _build_user_feature_tuples(all_users, df_prefs: pd.DataFrame):
    pref_by_user = {}
    if not df_prefs.empty:
        for _, row in df_prefs.iterrows():
            pref_by_user[str(row["userId"])] = row

    return [(str(user_id), _pref_to_features(pref_by_user[str(user_id)])) if str(user_id) in pref_by_user else (str(user_id), []) for user_id in all_users]


def _build_item_feature_tuples(df_props: pd.DataFrame):
    return [(str(row["id"]), _property_to_features(row)) for _, row in df_props.iterrows()]


def init_rec_db():
    logger.info("Initializing recommendation DB...")
    conn = psycopg2.connect(REC_DB_URL)
    conn.autocommit = True
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_recommendations (
            user_id VARCHAR(255) PRIMARY KEY,
            recommended_property_ids JSONB NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS training_analytics (
            id SERIAL PRIMARY KEY,
            run_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            status VARCHAR(32) NOT NULL,
            report JSONB NOT NULL
        )
    ''')
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_training_analytics_run_at
        ON training_analytics (run_at DESC)
    ''')
    cursor.close()
    conn.close()


def save_training_report(report: dict) -> None:
    """Persist analytics to PostgreSQL and Redis."""
    init_rec_db()
    status = report.get("status", "completed")
    conn = psycopg2.connect(REC_DB_URL)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO training_analytics (status, report) VALUES (%s, %s::jsonb)",
        (status, json.dumps(report)),
    )
    conn.commit()
    cursor.close()
    conn.close()

    try:
        client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
        client.set(ANALYTICS_CACHE_KEY, json.dumps(report))
    except Exception as e:
        logger.warning(f"Could not cache training analytics in Redis: {e}")


def get_latest_training_analytics():
    """Return the most recent training report, or None."""
    try:
        client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
        cached = client.get(ANALYTICS_CACHE_KEY)
        if cached:
            return json.loads(cached)
    except Exception:
        pass

    init_rec_db()
    conn = psycopg2.connect(REC_DB_URL)
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT report, run_at, status
        FROM training_analytics
        ORDER BY run_at DESC
        LIMIT 1
        """
    )
    row = cursor.fetchone()
    cursor.close()
    conn.close()

    if not row:
        return None

    report, run_at, status = row
    if isinstance(report, str):
        report = json.loads(report)
    report["stored_at"] = run_at.isoformat() if hasattr(run_at, "isoformat") else str(run_at)
    report["status"] = status
    return report


def get_training_history(limit: int = 10):
    """Return recent training run summaries (newest first)."""
    init_rec_db()
    conn = psycopg2.connect(REC_DB_URL)
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, run_at, status, report
        FROM training_analytics
        ORDER BY run_at DESC
        LIMIT %s
        """,
        (limit,),
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    history = []
    for run_id, run_at, status, report in rows:
        if isinstance(report, str):
            report = json.loads(report)
        perf = report.get("performance", {})
        dataset = report.get("dataset", {})
        history.append({
            "id": run_id,
            "run_at": run_at.isoformat() if hasattr(run_at, "isoformat") else str(run_at),
            "status": status,
            "trained_at": report.get("trained_at"),
            "train_auc": perf.get("train_auc"),
            "test_auc": perf.get("test_auc"),
            "users": dataset.get("users"),
            "items": dataset.get("items"),
            "users_recommended": report.get("deployment", {}).get("users_recommended"),
        })
    return history


def _evaluate_model(model, train_interactions, test_interactions, user_features=None, item_features=None):
    """Compute LightFM metrics; fall back to train-only metrics if test eval fails."""
    performance = {
        "train_auc": None,
        "test_auc": None,
        "train_precision_at_10": None,
        "test_precision_at_10": None,
        "evaluation_note": None,
    }

    eval_kwargs = {"num_threads": 2}
    if user_features is not None:
        eval_kwargs["user_features"] = user_features
    if item_features is not None:
        eval_kwargs["item_features"] = item_features

    try:
        performance["train_auc"] = float(
            auc_score(model, train_interactions, **eval_kwargs).mean()
        )
        performance["train_precision_at_10"] = float(
            precision_at_k(model, train_interactions, k=10, **eval_kwargs).mean()
        )
        test_kwargs = {
            **eval_kwargs,
            "train_interactions": train_interactions,
        }
        performance["test_auc"] = float(
            auc_score(model, test_interactions, **test_kwargs).mean()
        )
        performance["test_precision_at_10"] = float(
            precision_at_k(
                model,
                test_interactions,
                k=10,
                **test_kwargs,
            ).mean()
        )
    except Exception as e:
        logger.error(f"Test-set evaluation failed, using train-only metrics: {e}")
        performance["evaluation_note"] = str(e)
        try:
            if performance["train_auc"] is None:
                performance["train_auc"] = float(
                    auc_score(model, train_interactions, **eval_kwargs).mean()
                )
            if performance["train_precision_at_10"] is None:
                performance["train_precision_at_10"] = float(
                    precision_at_k(model, train_interactions, k=10, **eval_kwargs).mean()
                )
        except Exception as inner:
            performance["evaluation_note"] = str(inner)

    return performance


def train_model():
    """Main training pipeline leveraging LightFM via HTTP API data fetch."""
    logger.info("Starting model training pipeline...")
    trained_at = datetime.now(timezone.utc).isoformat()

    # 1. Fetch Data from Backend API
    try:
        logger.info(f"Fetching data from {BACKEND_URL}/api/internal/recommendation-data")
        resp = requests.get(f"{BACKEND_URL}/api/internal/recommendation-data", timeout=300)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        logger.error(f"Failed to fetch training data: {e}")
        report = {
            "status": "failed",
            "trained_at": trained_at,
            "error": f"Failed to fetch training data: {e}",
        }
        save_training_report(report)
        return report

    df_interactions_raw = pd.DataFrame(data.get("interactions", []))
    df_prefs = pd.DataFrame(data.get("preferences", []))
    df_props = pd.DataFrame(data.get("properties", []))

    if df_interactions_raw.empty or df_props.empty:
        logger.warning("Empty datasets. Aborting training.")
        report = {
            "status": "failed",
            "trained_at": trained_at,
            "error": "Empty dataset (interactions or properties missing)",
        }
        save_training_report(report)
        return report

    interaction_breakdown = (
        df_interactions_raw["type"].value_counts().to_dict()
        if "type" in df_interactions_raw.columns
        else {}
    )

    df_interactions = df_interactions_raw.copy()
    df_interactions["score"] = df_interactions["type"].map(WEIGHTS).fillna(0.0)
    df_interactions = (
        df_interactions.groupby(["userId", "propertyId"], as_index=False)["score"]
        .max()
        .reset_index()
    )

    logger.info("Building LightFM dataset...")
    dataset = Dataset()

    all_users = (
        pd.concat([df_interactions["userId"], df_prefs["userId"]]).unique()
        if not df_prefs.empty
        else df_interactions["userId"].unique()
    )
    item_ids = df_props["id"].unique()

    user_feature_tuples = _build_user_feature_tuples(all_users, df_prefs)
    item_feature_tuples = _build_item_feature_tuples(df_props)

    all_user_feats = {feat for _, feats in user_feature_tuples for feat in feats}
    all_item_feats = {feat for _, feats in item_feature_tuples for feat in feats}

    fit_kwargs = {
        "users": (str(x) for x in all_users),
        "items": (str(x) for x in item_ids),
    }
    if all_user_feats:
        fit_kwargs["user_features"] = all_user_feats
    if all_item_feats:
        fit_kwargs["item_features"] = all_item_feats

    dataset.fit(**fit_kwargs)

    num_users, num_items = dataset.interactions_shape()
    logger.info(f"Dataset mapped: {num_users} users, {num_items} items.")

    user_features_matrix = None
    item_features_matrix = None
    if all_user_feats:
        # LightFM >= 1.17 returns only the CSR matrix (not a matrix + mapping tuple).
        user_features_matrix = dataset.build_user_features(
            ((uid, feats) for uid, feats in user_feature_tuples),
            normalize=True,
        )
    if all_item_feats:
        item_features_matrix = dataset.build_item_features(
            ((iid, feats) for iid, feats in item_feature_tuples),
            normalize=True,
        )

    logger.info(
        f"Hybrid features: {len(all_user_feats)} user features, {len(all_item_feats)} item features."
    )

    (interactions, weights) = dataset.build_interactions(
        (
            (row["userId"], row["propertyId"], row["score"])
            for _, row in df_interactions.iterrows()
            if row["propertyId"] in item_ids
        )
    )

    logger.info("Splitting dataset 80/20 for evaluation...")
    train_interactions, test_interactions = random_train_test_split(
        interactions, test_percentage=MODEL_CONFIG["test_split_ratio"], random_state=42
    )

    train_coo = train_interactions.tocoo()
    weight_lookup = {
        (int(r), int(c)): float(d)
        for r, c, d in zip(weights.tocoo().row, weights.tocoo().col, weights.tocoo().data)
    }
    train_weight_data = np.array(
        [weight_lookup.get((int(r), int(c)), 1.0) for r, c in zip(train_coo.row, train_coo.col)],
        dtype=np.float32,
    )
    train_weights = coo_matrix(
        (train_weight_data, (train_coo.row, train_coo.col)),
        shape=train_coo.shape,
    )

    logger.info("Training LightFM model...")
    model = LightFM(
        loss=MODEL_CONFIG["loss"],
        no_components=MODEL_CONFIG["components"],
        learning_rate=MODEL_CONFIG["learning_rate"],
        random_state=42,
    )
    fit_model_kwargs = {
        "epochs": MODEL_CONFIG["epochs"],
        "num_threads": 2,
    }
    if user_features_matrix is not None:
        fit_model_kwargs["user_features"] = user_features_matrix
    if item_features_matrix is not None:
        fit_model_kwargs["item_features"] = item_features_matrix

    model.fit(
        train_interactions,
        sample_weight=train_weights,
        **fit_model_kwargs,
    )

    logger.info("Evaluating model metrics...")
    performance = _evaluate_model(
        model,
        train_interactions,
        test_interactions,
        user_features=user_features_matrix,
        item_features=item_features_matrix,
    )
    logger.info(f"Evaluation Metrics: {performance}")

    init_rec_db()
    rec_conn = psycopg2.connect(REC_DB_URL)
    cursor = rec_conn.cursor()

    redis_client = None
    try:
        redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
    except Exception:
        pass

    logger.info("Precomputing recommendations and saving to DB + Cache...")
    item_internal_ids = np.arange(num_items)
    item_mapping = dataset.mapping()[2]
    reverse_item_mapping = {v: k for k, v in item_mapping.items()}
    user_id_to_internal = {str(k): v for k, v in dataset.mapping()[0].items()}

    users_recommended = 0
    for raw_user_id in all_users:
        user_id = str(raw_user_id)
        if user_id not in user_id_to_internal:
            continue

        uid_internal = user_id_to_internal[user_id]
        predict_kwargs = {}
        if user_features_matrix is not None:
            predict_kwargs["user_features"] = user_features_matrix
        if item_features_matrix is not None:
            predict_kwargs["item_features"] = item_features_matrix

        predictions = model.predict(uid_internal, item_internal_ids, **predict_kwargs)
        top_indices = np.argsort(-predictions)[:20]
        top_property_ids = [reverse_item_mapping[idx] for idx in top_indices]

        props_json = json.dumps(top_property_ids)
        cursor.execute(
            """
            INSERT INTO user_recommendations (user_id, recommended_property_ids, updated_at)
            VALUES (%s, %s::jsonb, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id)
            DO UPDATE SET recommended_property_ids = EXCLUDED.recommended_property_ids,
                          updated_at = CURRENT_TIMESTAMP
            """,
            (user_id, props_json),
        )

        if redis_client:
            redis_client.setex(f"recommendations:{user_id}", 3600, props_json)

        users_recommended += 1

    rec_conn.commit()
    cursor.close()
    rec_conn.close()

    report = {
        "status": "completed",
        "trained_at": trained_at,
        "model": MODEL_CONFIG.copy(),
        "interaction_weights": WEIGHTS,
        "dataset": {
            "users": int(num_users),
            "items": int(num_items),
            "properties": int(len(item_ids)),
            "users_with_preferences": int(df_prefs["userId"].nunique()) if not df_prefs.empty else 0,
            "user_features": len(all_user_feats),
            "item_features": len(all_item_feats),
            "interactions_raw": int(len(df_interactions_raw)),
            "interactions_unique": int(len(df_interactions)),
            "train_interactions": int(train_interactions.nnz),
            "test_interactions": int(test_interactions.nnz),
        },
        "interaction_breakdown": {k: int(v) for k, v in interaction_breakdown.items()},
        "performance": performance,
        "performance_summary": _performance_summary(performance),
        "deployment": {
            "users_recommended": users_recommended,
            "recommendations_per_user": 20,
            "cache_ttl_seconds": 3600,
        },
    }

    save_training_report(report)
    logger.info("Training complete and predictions saved successfully!")
    return report


def _performance_summary(performance: dict) -> dict:
    """Human-readable labels for admin dashboards."""
    def grade_auc(value):
        if value is None:
            return "unavailable"
        if value >= 0.9:
            return "excellent"
        if value >= 0.8:
            return "good"
        if value >= 0.7:
            return "fair"
        return "needs_improvement"

    train_auc = performance.get("train_auc")
    test_auc = performance.get("test_auc")
    return {
        "train_auc_grade": grade_auc(train_auc),
        "test_auc_grade": grade_auc(test_auc),
        "train_auc_percent": round(train_auc * 100, 2) if train_auc is not None else None,
        "test_auc_percent": round(test_auc * 100, 2) if test_auc is not None else None,
    }


if __name__ == "__main__":
    train_model()
