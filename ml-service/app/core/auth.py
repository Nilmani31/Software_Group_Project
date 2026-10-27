import os
import secrets

from fastapi import Header, HTTPException


async def require_ml_service_key(
	x_ml_service_key: str | None = Header(default=None),
):
	configured_key = os.getenv("ML_SERVICE_KEY")
	if not configured_key:
		raise HTTPException(
			status_code=503,
			detail="ML service authentication is not configured.",
		)

	if not x_ml_service_key or not secrets.compare_digest(
		x_ml_service_key, configured_key
	):
		raise HTTPException(status_code=401, detail="Invalid ML service key.")
