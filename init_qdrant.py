from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

# Connect to Qdrant
client = QdrantClient(url="http://localhost:6333")

collection_name = "inventory_items"

# Check if collection exists
try:
    client.get_collection(collection_name)
    print(f"✅ Collection '{collection_name}' already exists")
except Exception as e:
    print(f"Creating collection '{collection_name}'...")
    
    # Create collection with 512-dimensional vectors (CLIP ViT-B-32 output)
    client.create_collection(
        collection_name=collection_name,
        vectors_config=VectorParams(size=512, distance=Distance.COSINE),
    )
    print(f"✅ Collection '{collection_name}' created successfully!")
    print(f"   Vector size: 512 (CLIP ViT-B-32)")
    print(f"   Distance metric: COSINE")
