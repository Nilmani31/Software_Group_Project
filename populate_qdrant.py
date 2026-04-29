import os
import sys
from io import BytesIO
from PIL import Image

# Add ml-service to path to use CLIP
sys.path.insert(0, r"C:\Users\nethm\Desktop\Software Project New\Software_Group_Project\ml-service")

from app.services.clip import image_to_embedding
from app.services.qdrant import search_similar_items
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct

# Connect to Qdrant
qdrant_client = QdrantClient(url="http://localhost:6333")
collection_name = "inventory_items"

# Create test items with embeddings
test_items = [
    {
        "productId": "item_1",
        "name": "Test Item 1",
        "category": "Electronics",
        "sku": "SKU001",
        "imageUrl": "http://example.com/item1.jpg"
    },
    {
        "productId": "item_2", 
        "name": "Test Item 2",
        "category": "Tools",
        "sku": "SKU002",
        "imageUrl": "http://example.com/item2.jpg"
    }
]

# Create dummy embeddings for test items (in real scenario, these would come from actual images)
# Using a simple pattern for testing
import numpy as np

print(f"📝 Creating test items in Qdrant collection '{collection_name}'...")

for idx, item in enumerate(test_items):
    # Create a simple embedding pattern for testing
    embedding = [float(i % 512) / 512.0 for i in range(512)]
    
    point = PointStruct(
        id=idx + 1,
        vector=embedding,
        payload={
            "productId": item["productId"],
            "name": item["name"],
            "category": item["category"],
            "sku": item["sku"],
            "imageUrl": item["imageUrl"]
        }
    )
    
    qdrant_client.upsert(
        collection_name=collection_name,
        points=[point]
    )
    print(f"  ✅ Added: {item['name']}")

print(f"\n✅ Successfully populated {len(test_items)} test items!")
print(f"Collection is now ready for image search testing.")
