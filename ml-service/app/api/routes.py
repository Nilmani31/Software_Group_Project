from fastapi import APIRouter, File, Form, HTTPException, UploadFile

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

@router.post("/zero-shot-search")
async def zero_shot_search(
	image: UploadFile = File(...),
	items: str = Form(...),
):
	"""Match an uploaded photo against a list of {name, category} items,
	with no stored reference photos and no Qdrant lookup. Compares the
	photo's CLIP embedding against a text embedding of each item (name +
	category) and ranks by cosine similarity."""
	try:
		import json

		from app.services.clip import image_to_embedding, text_to_embedding_ensemble

		try:
			item_list = json.loads(items)
		except json.JSONDecodeError:
			raise HTTPException(status_code=400, detail="items must be a JSON array.")

		if not isinstance(item_list, list) or not item_list:
			raise HTTPException(status_code=400, detail="items must be a non-empty JSON array.")

		image_bytes = await image.read()
		if not image_bytes:
			raise HTTPException(status_code=400, detail="Empty image upload.")

		image_embedding = image_to_embedding(image_bytes)

		scored = []
		for entry in item_list:
			if isinstance(entry, dict):
				name = entry.get("name")
				category = entry.get("category") or None
			else:
				name = entry
				category = None

			if not name:
				continue

			text_embedding = text_to_embedding_ensemble(name, category=category)
			score = sum(a * b for a, b in zip(image_embedding, text_embedding))
			scored.append({"name": name, "score": round(score, 4)})

		scored.sort(key=lambda r: r["score"], reverse=True)

		return {"success": True, "results": scored, "count": len(scored)}
	except HTTPException:
		raise
	except Exception as exc:
		print(f"❌ ERROR in zero-shot-search: {exc}")
		import traceback
		traceback.print_exc()
		raise HTTPException(status_code=500, detail=str(exc)) from exc