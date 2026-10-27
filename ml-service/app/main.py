import sys
from pathlib import Path
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from fastapi import Depends, FastAPI
from dotenv import load_dotenv

from app.api.routes import router
from app.core.auth import require_ml_service_key

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

app = FastAPI(title="Image Search ML Service", version="1.0.0")

app.include_router(router, prefix="", dependencies=[Depends(require_ml_service_key)])

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
