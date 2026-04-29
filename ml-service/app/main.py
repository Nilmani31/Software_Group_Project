from fastapi import FastAPI

from app.api.routes import router

app = FastAPI(title="Image Search ML Service", version="1.0.0")

app.include_router(router, prefix="")

@app.on_event("startup")
async def startup_event():
	"""Pre-load CLIP model on startup to avoid timeout on first request"""
	print("🔄 Pre-loading CLIP model...")
	try:
		from app.services.clip import _init_model
		_init_model()
		print("✅ CLIP model loaded successfully!")
	except Exception as e:
		print(f"⚠️ Warning: Could not pre-load CLIP model: {e}")
