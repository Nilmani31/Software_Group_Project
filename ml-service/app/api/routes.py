from fastapi import APIRouter, File, HTTPException, UploadFile

router = APIRouter()


@router.get("/health")
def health_check():
	return {"status": "ok"}


@router.post("/embed-and-search")
async def embed_and_search(image: UploadFile = File(...)):
	try:
		print(f"📥 Received image: {image.filename}, size: {image.size}")
		
		from app.services.clip import image_to_embedding
		from app.services.qdrant import search_similar_items

		image_bytes = await image.read()
		print(f"✅ Read {len(image_bytes)} bytes from upload")
		
		if not image_bytes:
			raise HTTPException(status_code=400, detail="Empty image upload.")

		print(f"🔄 Generating CLIP embedding...")
		embedding = image_to_embedding(image_bytes)
		print(f"✅ Embedding generated: {len(embedding)} dimensions")
		
		print(f"🔍 Searching Qdrant database...")
		results = search_similar_items(embedding)
		print(f"✅ Found {len(results)} results")

		return {
			"results": results,
			"count": len(results),
		}
	except HTTPException:
		raise
	except Exception as exc:
		print(f"❌ ERROR in embed-and-search: {exc}")
		import traceback
		traceback.print_exc()
		raise HTTPException(status_code=500, detail=str(exc)) from exc

