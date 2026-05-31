import os
import json
import logging
from fastapi import FastAPI, HTTPException, BackgroundTasks
import redis
import psycopg2

app = FastAPI(title="Recommendation Service", version="1.0.0")

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Redis Client Setup
REDIS_URL = os.environ.get("REDIS_URL", "redis://redis:6379/1")
try:
    redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
    logger.info("Connected to Redis successfully.")
except Exception as e:
    logger.warning(f"Could not connect to Redis: {e}")
    redis_client = None

@app.get("/health")
def health():
    return {"status": "ok", "service": "recommendation-service"}

@app.post("/api/v1/train")
def trigger_training():
    """
    Manually triggers the ML training pipeline synchronously and returns metrics.
    """
    logger.info("Starting synchronous training pipeline...")
    try:
        from train import train_model
        metrics = train_model()
        return {"message": "Training pipeline completed successfully.", "metrics": metrics}
    except Exception as e:
        logger.error(f"Error during training pipeline: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/recommendations/{user_id}")
def get_recommendations(user_id: str, limit: int = 10):
    """
    Get top K property recommendations for a user.
    """
    if redis_client:
        cache_key = f"recommendations:{user_id}"
        cached = redis_client.get(cache_key)
        if cached:
            try:
                # Return parsed JSON list
                property_ids = json.loads(cached)
                return {"user_id": user_id, "recommendations": property_ids[:limit], "source": "cache"}
            except json.JSONDecodeError:
                pass

    # Fallback to Database if cachemiss
    # Ideally, train.py saves results to recommendation_db. 
    # For now, if no cache, return empty list or fallback to querying the recommendations table.
    
    # Check recommendation_db...
    try:
        REC_DB_URL = os.environ.get("RECOMMENDATION_DB_URL", "postgresql://postgres:postgres@recommendation-db:5432/recommendations")
        conn = psycopg2.connect(REC_DB_URL)
        cursor = conn.cursor()
        cursor.execute("SELECT recommended_property_ids FROM user_recommendations WHERE user_id = %s", (user_id,))
        result = cursor.fetchone()
        cursor.close()
        conn.close()

        if result and result[0]:
            property_ids = result[0]
            # Cache the result for future calls (1 hr expire)
            if redis_client:
                redis_client.setex(f"recommendations:{user_id}", 3600, json.dumps(property_ids))
                
            return {"user_id": user_id, "recommendations": property_ids[:limit], "source": "database"}
    except Exception as e:
        logger.error(f"Failed to fetch from DB: {e}")
        
    # If entirely missing from Cache and DB, this is a COLD START user.
    # We dynamically train and cache it! 
    logger.info(f"Cold-start cache miss for {user_id}. Training dynamically...")
    try:
        from train import train_model
        train_model()
        if redis_client:
            cached = redis_client.get(f"recommendations:{user_id}")
            if cached:
                property_ids = json.loads(cached)
                return {"user_id": user_id, "recommendations": property_ids[:limit], "source": "dynamic_training"}
    except Exception as e:
        logger.error(f"Failed dynamic training: {e}")

    return {"user_id": user_id, "recommendations": [], "source": "none"}
