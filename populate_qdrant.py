import os
import sys

# Add ml-service to path to use CLIP
sys.path.insert(0, r"C:\Users\nethm\Desktop\Software Project New\Software_Group_Project\ml-service")

from app.services.clip import image_to_embedding
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct

# Connect to Qdrant
qdrant_client = QdrantClient(url="http://localhost:6333")
collection_name = "inventory_items"

# Base folder containing category subfolders (bartender / barista)
BASE_DIR = "data/images"

def get_category(category_folder):
    """Map folder name to category label."""
    name = category_folder.lower()
    if "barista" in name:
        return "barista"
    elif "bartender" in name:
        return "bartender"
    return category_folder

def populate_from_folder(base_dir):
    total_added = 0
    total_skipped = 0
    point_id = 1

    # Loop through category folders (bartender, barista)
    for category_folder in os.listdir(base_dir):
        category_path = os.path.join(base_dir, category_folder)
        if not os.path.isdir(category_path):
            continue

        category = get_category(category_folder)
        print(f"\n📂 Processing category: {category} ({category_folder})")

        # Loop through item folders inside category
        for item_folder in os.listdir(category_path):
            item_path = os.path.join(category_path, item_folder)
            if not os.path.isdir(item_path):
                continue

            # Get all images in the item folder
            image_files = [
                f for f in os.listdir(item_path)
                if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))
            ]

            if not image_files:
                print(f"  ⚠️  Skipping {item_folder} — no images found")
                total_skipped += 1
                continue

            print(f"  🔄 {item_folder} ({len(image_files)} images)...")

            for img_file in image_files:
                img_path = os.path.join(item_path, img_file)

                try:
                    # Read image as bytes and generate CLIP embedding
                    with open(img_path, "rb") as f:
                        image_bytes = f.read()
                    embedding = image_to_embedding(image_bytes)

                    # Build Qdrant point
                    point = PointStruct(
                        id=point_id,
                        vector=embedding,
                        payload={
                            "productId": f"{category}_{item_folder}",
                            "name": item_folder,
                            "category": category,
                            "sku": item_folder.upper()[:20],
                            "imageUrl": img_path.replace("\\", "/"),
                            "currentQty": 0,
                            "unit": "BOTTLE",
                            "reorderThreshold": 5,
                            "subCategory": "",
                            "flavor": "",
                            "lastUpdated": ""
                        }
                    )

                    qdrant_client.upsert(
                        collection_name=collection_name,
                        points=[point]
                    )

                    point_id += 1
                    total_added += 1

                except Exception as e:
                    print(f"    ❌ Failed on {img_file}: {e}")
                    total_skipped += 1

            print(f"    ✅ Done")

    return total_added, total_skipped


if __name__ == "__main__":
    print(f"🚀 Starting Qdrant population from '{BASE_DIR}'...")
    print(f"📡 Connecting to Qdrant at http://localhost:6333\n")

    added, skipped = populate_from_folder(BASE_DIR)

    print(f"\n{'='*50}")
    print(f"✅ Done! Added {added} embeddings to '{collection_name}'")
    print(f"⚠️  Skipped: {skipped} items")
    print(f"{'='*50}")
    print(f"\nQdrant collection is ready for image search!")