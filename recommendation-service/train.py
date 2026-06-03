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


def _evaluate_model(model, train_interactions, test_interactions):
    """Compute LightFM metrics; fall back to train-only metrics if test eval fails."""
    performance = {
        "train_auc": None,
        "test_auc": None,
        "train_precision_at_10": None,
        "test_precision_at_10": None,
        "evaluation_note": None,
    }

    try:
        performance["train_auc"] = float(
            auc_score(model, train_interactions, num_threads=2).mean()
        )
        performance["train_precision_at_10"] = float(
            precision_at_k(model, train_interactions, k=10, num_threads=2).mean()
        )
        performance["test_auc"] = float(
            auc_score(
                model,
                test_interactions,
                train_interactions=train_interactions,
                num_threads=2,
            ).mean()
        )
        performance["test_precision_at_10"] = float(
            precision_at_k(
                model,
                test_interactions,
                train_interactions=train_interactions,
                k=10,
                num_threads=2,
            ).mean()
        )
    except Exception as e:
        logger.error(f"Test-set evaluation failed, using train-only metrics: {e}")
        performance["evaluation_note"] = str(e)
        try:
            if performance["train_auc"] is None:
                performance["train_auc"] = float(
                    auc_score(model, train_interactions, num_threads=2).mean()
                )
            if performance["train_precision_at_10"] is None:
                performance["train_precision_at_10"] = float(
                    precision_at_k(model, train_interactions, k=10, num_threads=2).mean()
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
        logger.info(f"Fetching data from {BACKEND_URL}/api/v1/internal/recommendation-data")
        resp = requests.get(f"{BACKEND_URL}/api/v1/internal/recommendation-data", timeout=300)
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

    dataset.fit(users=(x for x in all_users), items=(x for x in item_ids))

    num_users, num_items = dataset.interactions_shape()
    logger.info(f"Dataset mapped: {num_users} users, {num_items} items.")

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
    model.fit(
        train_interactions,
        sample_weight=train_weights,
        epochs=MODEL_CONFIG["epochs"],
        num_threads=2,
    )

    logger.info("Evaluating model metrics...")
    performance = _evaluate_model(model, train_interactions, test_interactions)
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
        predictions = model.predict(uid_internal, item_internal_ids)
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
