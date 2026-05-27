from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastembed import TextEmbedding
import uvicorn

import os
import shutil

# ─────────────────────────────────────────────
# Model is loaded once at startup via lifespan
# ─────────────────────────────────────────────
model: TextEmbedding | None = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global model
    print("🔄 Loading BAAI/bge-small-en-v1.5 model (384-dim) via FastEmbed...")
    try:
        # Using bge-small-en-v1.5 (384-dim, ~130MB) - fast and accurate
        model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
    except Exception as e:
        print(f"⚠️ Failed to load model due to potential cache corruption: {e}")
        # Try to locate and delete the cache directory to recover
        cache_path = os.environ.get("FASTEMBED_CACHE_PATH", os.path.expanduser("~/.fastembed_cache"))
        print(f"🧹 Clearing corrupt cache directory at {cache_path}...")
        if os.path.exists(cache_path):
            try:
                shutil.rmtree(cache_path)
            except Exception as rmerr:
                print(f"❌ Failed to delete cache directory: {rmerr}")
        
        # Also clean up the fallback /tmp/fastembed_cache just in case
        fallback_path = "/tmp/fastembed_cache"
        if os.path.exists(fallback_path) and fallback_path != cache_path:
            print(f"🧹 Clearing fallback cache directory at {fallback_path}...")
            try:
                shutil.rmtree(fallback_path)
            except Exception as rmerr:
                print(f"❌ Failed to delete fallback directory: {rmerr}")
                
        print("🔄 Retrying model load and download...")
        model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
        
    print("✅ Model loaded. Embedding service ready.")
    yield
    print("🛑 Shutting down embedding service.")

app = FastAPI(title="BGE Embedding Service (FastEmbed)", version="1.0.0", lifespan=lifespan)

class EmbedRequest(BaseModel):
    text: str

class EmbedResponse(BaseModel):
    embedding: list[float]
    dimension: int

@app.get("/health")
def health():
    return {"status": "ok", "model": "BAAI/bge-small-en-v1.5", "dimension": 384}

@app.post("/embed", response_model=EmbedResponse)
def embed(req: EmbedRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet")
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="text field must not be empty")
    
    try:
        # FastEmbed expects a list of documents and yields embeddings
        embeddings = list(model.embed([req.text]))
        vector = embeddings[0].tolist()
        return {"embedding": vector, "dimension": len(vector)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=False)
