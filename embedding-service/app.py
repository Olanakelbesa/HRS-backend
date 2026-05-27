from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import uvicorn

# ─────────────────────────────────────────────
# Model is loaded once at startup via lifespan
# ─────────────────────────────────────────────
model: SentenceTransformer | None = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global model
    print("🔄 Loading BAAI/bge-large-en model (1024-dim)...")
    model = SentenceTransformer("BAAI/bge-large-en")
    print("✅ Model loaded. Embedding service ready.")
    yield
    print("🛑 Shutting down embedding service.")

app = FastAPI(title="BGE Embedding Service", version="1.0.0", lifespan=lifespan)

class EmbedRequest(BaseModel):
    text: str

class EmbedResponse(BaseModel):
    embedding: list[float]
    dimension: int

@app.get("/health")
def health():
    return {"status": "ok", "model": "BAAI/bge-large-en", "dimension": 1024}

@app.post("/embed", response_model=EmbedResponse)
def embed(req: EmbedRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet")
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="text field must not be empty")
    
    vector = model.encode(req.text, normalize_embeddings=True).tolist()
    return {"embedding": vector, "dimension": len(vector)}

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=False)
