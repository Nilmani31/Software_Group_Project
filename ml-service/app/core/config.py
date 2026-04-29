import os


def get_settings():
	return {
		"service_name": os.getenv("SERVICE_NAME", "ml-service"),
		"qdrant_url": os.getenv("QDRANT_URL", "http://localhost:6333"),
		"qdrant_api_key": os.getenv("QDRANT_API_KEY"),
		"qdrant_collection": os.getenv("QDRANT_COLLECTION", "inventory_items"),
		"qdrant_top_k": int(os.getenv("QDRANT_TOP_K", "5")),
	}
