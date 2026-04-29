import os

from qdrant_client import QdrantClient


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
			}
		)

	return formatted
