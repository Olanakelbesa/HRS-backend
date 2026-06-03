import os
import logging
import psycopg2
import pandas as pd
import numpy as np
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
    cursor.close()
    conn.close()

def train_model():
    """Main training pipeline leveraging LightFM via HTTP API data fetch"""
    logger.info("Starting model training pipeline...")
    
    # 1. Fetch Data from Backend API
    try:
        logger.info(f"Fetching data from {BACKEND_URL}/api/v1/internal/recommendation-data")
        # In a real app we'd need an internal API key/secret header here to authorize
        # Assuming the endpoint is protected via intra-network compose for now
        resp = requests.get(f"{BACKEND_URL}/api/v1/internal/recommendation-data", timeout=300)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        logger.error(f"Failed to fetch training data: {e}")
        return

    # Create DataFrames
    df_interactions = pd.DataFrame(data.get("interactions", []))
    df_prefs = pd.DataFrame(data.get("preferences", []))
    df_props = pd.DataFrame(data.get("properties", []))
    
    if df_interactions.empty or df_props.empty:
        logger.warning("Empty datasets. Aborting training.")
        return {"error": "Empty dataset"}

    # Map interactions to scores
    df_interactions['score'] = df_interactions['type'].map(WEIGHTS).fillna(0.0)
    
    # 2. Prepare Dataset for LightFM
    logger.info("Building LightFM dataset...")
    dataset = Dataset()
    
    # Include all users from interactions AND preferences so new cold-start users are mapped!
    all_users = pd.concat([df_interactions['userId'], df_prefs['userId']]).unique() if not df_prefs.empty else df_interactions['userId'].unique()
    item_ids = df_props['id'].unique()
    
    dataset.fit(
        users=(x for x in all_users),
        items=(x for x in item_ids)
    )
    
    num_users, num_items = dataset.interactions_shape()
    logger.info(f"Dataset mapped: {num_users} users, {num_items} items.")
    
    # Build Interactions
    (interactions, weights) = dataset.build_interactions(
        ((row['userId'], row['propertyId'], row['score']) for idx, row in df_interactions.iterrows() if row['propertyId'] in item_ids)
    )
    
    # 5. Train/Test Split
    logger.info("Splitting dataset 80/20 for evaluation...")
    train_interactions, test_interactions = random_train_test_split(interactions, test_percentage=0.2, random_state=42)
    
    # LightFM requires sample_weight as COO with identical (row, col) ordering as interactions.
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
    
    # 6. Train LightFM
    logger.info("Training LightFM model...")
    # using WARP (Weighted Approximate-Rank Pairwise) loss for recommendations
    model = LightFM(loss='warp', no_components=30, learning_rate=0.05, random_state=42)
    
    model.fit(train_interactions, sample_weight=train_weights, epochs=10, num_threads=2)
    
    # 7. Evaluate Model
    logger.info("Evaluating model metrics...")
    try:
        train_auc = auc_score(model, train_interactions, num_threads=2).mean()
        test_auc = auc_score(model, test_interactions, train_interactions=train_interactions, num_threads=2).mean()
        
        train_precision = precision_at_k(model, train_interactions, k=10, num_threads=2).mean()
        test_precision = precision_at_k(model, test_interactions, train_interactions=train_interactions, k=10, num_threads=2).mean()
        
        metrics = {
            "train_auc": float(train_auc),
            "test_auc": float(test_auc),
            "train_precision_at_10": float(train_precision),
            "test_precision_at_10": float(test_precision)
        }
    except Exception as e:
        logger.error(f"Evaluation skipped due to empty test splits or error: {e}")
        metrics = {"error": str(e)}
        
    logger.info(f"Evaluation Metrics: {metrics}")
    
    # 8. Precompute recommendations for all users
    init_rec_db()
    rec_conn = psycopg2.connect(REC_DB_URL)
    cursor = rec_conn.cursor()
    
    redis_client = None
    try:
        redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
    except:
        pass
        
    logger.info("Precomputing recommendations and saving to DB + Cache...")
    item_internal_ids = np.arange(num_items)
    item_mapping = dataset.mapping()[2]  # internal id -> external item id
    reverse_item_mapping = {v: k for k, v in item_mapping.items()}
    
    user_mapping = dataset.mapping()[0] # internal id -> external user id
    reverse_user_mapping = {v: k for k, v in user_mapping.items()}
    
    for user_id in all_users:
        if user_id not in reverse_user_mapping:
            continue
            
        uid_internal = reverse_user_mapping[user_id]
        
        # Predict scores for all items
        predictions = model.predict(uid_internal, item_internal_ids)
        
        # Get top 20 property internal indices
        top_indices = np.argsort(-predictions)[:20]
        
        # Convert to property IDs
        top_property_ids = [reverse_item_mapping[idx] for idx in top_indices]
        
        # Save to PostgreSQL (recommendation-db)
        props_json = json.dumps(top_property_ids)
        cursor.execute("""
            INSERT INTO user_recommendations (user_id, recommended_property_ids, updated_at) 
            VALUES (%s, %s::jsonb, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id) 
            DO UPDATE SET recommended_property_ids = EXCLUDED.recommended_property_ids, updated_at = CURRENT_TIMESTAMP
        """, (user_id, props_json))
        
        # Update Redis Cache (refresh recommendations)
        if redis_client:
            redis_client.setex(f"recommendations:{user_id}", 3600, props_json)
            
    rec_conn.commit()
    cursor.close()
    rec_conn.close()
    logger.info("Training complete and predictions saved successfully!")
    return metrics

if __name__ == "__main__":
    train_model()
