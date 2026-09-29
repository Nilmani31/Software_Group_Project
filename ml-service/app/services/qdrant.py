import os
import uuid
from datetime import datetime, timezone

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointIdsList, PointStruct, VectorParams

EMBEDDING_SIZE = 512  # CLIP ViT-B-32 output size


_client = None


def _get_client():
	global _client
	if _client is None:
		qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333")
		qdrant_api_key = os.getenv("QDRANT_API_KEY")
		_client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key)
	return _client


def search_similar_items(embedding, limit=None):
	collection = os.getenv("QDRANT_COLLECTION", "inventory_items")
	top_k = int(os.getenv("QDRANT_TOP_K", "5"))
	search_limit = limit or top_k

	client = _get_client()

	results = client.search(
		collection_name=collection,
		query_vector=embedding,
		limit=search_limit,
		with_payload=True,
	)

	formatted = []
	for point in results:
		payload = point.payload or {}
		formatted.append(
			{
				"productId": payload.get("productId"),
				"name": payload.get("name"),
				"category": payload.get("category"),
				"sku": payload.get("sku"),
				"score": point.score,
							"imageUrl": payload.get("imageUrl"),
				# "reference" = photo saved through the app for a real item,
				# "dataset" = seeded from the public Roboflow images.
				"source": payload.get("source", "dataset"),
			}
		)

	return formatted


def _collection_name():
	return os.getenv("QDRANT_COLLECTION", "inventory_items")


def _reference_point_id(product_id):
	"""Deterministic point ID for an item's reference photo. The same item
	always maps to the same point, so saving a new photo for an item
	replaces the old one instead of piling up duplicates."""
	return str(uuid.uuid5(uuid.NAMESPACE_URL, f"inventory-reference:{product_id}"))


def _ensure_collection(client, collection):
	try:
		client.get_collection(collection)
	except Exception:
		client.create_collection(
			collection_name=collection,
			vectors_config=VectorParams(size=EMBEDDING_SIZE, distance=Distance.COSINE),
		)


def upsert_reference(product_id, embedding, name, category="", sku=""):
	"""Store (or replace) the reference photo embedding of one real inventory item."""
	collection = _collection_name()
	client = _get_client()
	_ensure_collection(client, collection)

	client.upsert(
		collection_name=collection,
		points=[
			PointStruct(
				id=_reference_point_id(product_id),
				vector=embedding,
				payload={
					"productId": str(product_id),
					"name": name,
					"category": category or "",
					"sku": sku or "",
					"source": "reference",
					"lastUpdated": datetime.now(timezone.utc).isoformat(),
				},
			)
		],
	)


def delete_reference(product_id):
	"""Remove an item's reference photo embedding (e.g. when the item is deleted)."""
	collection = _collection_name()
	client = _get_client()
	_ensure_collection(client, collection)

	client.delete(
		collection_name=collection,
		points_selector=PointIdsList(points=[_reference_point_id(product_id)]),
	)
