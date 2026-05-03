# ML Service - Image Search Backend

FastAPI-based machine learning service for the **Barista & Bartender Training School Inventory Management System**. Handles image embedding generation and similarity search using CLIP + Qdrant.

---

## Architecture

```
React Frontend
     ↓
Node.js Backend (Express) — Port 5000
     ↓
FastAPI ML Service — Port 8000
     ↓
Qdrant Vector Database — Port 6333
```

---

## ⚡ Quick Start (after cloning)

Follow these steps in order. Every step is required.

### 1. Start Qdrant

**Option A — Docker (recommended):**
```bash
docker run -p 6333:6333 -v qdrant_storage:/qdrant/storage qdrant/qdrant
```

**Option B — Executable:**
- Download from https://github.com/qdrant/qdrant/releases for your OS
- Run the executable — it starts on port 6333

Verify it's running: http://localhost:6333/health → `{"status":"ok"}`

---

### 2. Create virtual environment

```bash
cd ml-service
python -m venv .venv

# Windows
.venv\Scripts\Activate.ps1

# macOS / Linux
source .venv/bin/activate
```

---

### 3. Install dependencies

```bash
pip install -r requirements.txt
pip install roboflow python-dotenv
```

---

### 4. Create `.env` file

Create a `.env` file in the project root:

```env
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=inventory_items
QDRANT_TOP_K=5
QDRANT_API_KEY=
ROBOFLOW_API_KEY=your_roboflow_api_key_here
```

Get your Roboflow API key:
1. Go to https://app.roboflow.com
2. Click your profile → Settings → Roboflow API
3. Copy the key and paste it above

---

### 5. Initialize Qdrant collection

```bash
python init_qdrant.py
```

Expected output:
```
✅ Collection 'inventory_items' created successfully!
   Vector size: 512 (CLIP ViT-B-32)
   Distance metric: COSINE
```

---

### 6. Download datasets

> ⚠️ Dataset images are NOT included in the git repository (too large).
> Every developer must download them once after cloning.

Run the automated setup script:

```bash
python setup_datasets.py
```

This downloads and organizes:
- **Bartender:** 395 liquor/spirits classes (~9,500 images) → `data/images/bartender/`
- **Barista:** coffee, espresso, café items (~900 images) → `data/images/barista/`

Takes 5–15 minutes depending on your internet speed.

---

### 7. Populate Qdrant with embeddings

```bash
python populate_qdrant.py
```

This runs every image through CLIP and stores the embeddings in Qdrant.

> ⚠️ Takes **30–60 minutes** on CPU for the full dataset.
> See **Quick Test** section below to test with 5 items first.

Expected output:
```
🚀 Starting Qdrant population from 'data/images'...
📂 Processing category: bartender
  🔄 Titos50Ml (24 images)...
    ✅ Done
  ...
✅ Done! Added 9562 embeddings to 'inventory_items'
```

---

### 8. Start the ML service

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Expected output:
```
🔄 Pre-loading CLIP model...
✅ CLIP model loaded successfully!
INFO:     Uvicorn running on http://127.0.0.1:8000
```

> First run downloads the CLIP model (~605 MB). Wait for the success message.

---

## 🧪 Quick Test (5 items, under 2 minutes)

To test the search before running the full populate, load just 5 items:

```python
import os, shutil

src = 'Liquor-data-4/train'
dst = 'data/images/bartender'

test_classes = [
    'Titos50Ml',
    'PatronSilver750Ml',
    'JackDanielsBlack50Ml',
    'Smirnoff80Pr50Ml',
    'JackDanielsApple50Ml'
]

os.makedirs(dst, exist_ok=True)
for cls in test_classes:
    shutil.copytree(os.path.join(src, cls), os.path.join(dst, cls), dirs_exist_ok=True)
    print(f"✅ {cls}")
```

Then run `python populate_qdrant.py` — finishes in ~2 minutes with ~113 images.

Test the search via the React UI or directly:

```python
import requests
files = {'image': open('test_bottle.jpg', 'rb')}
response = requests.post('http://localhost:8000/embed-and-search', files=files)
print(response.json())
```

A good result has `score > 0.75`. Scores of 60–75% are acceptable with only 5 items — accuracy improves as more items are added.

---

## Why datasets are not in git

| Reason | Detail |
|--------|--------|
| Size | ~9,500 images ≈ 400 MB+ |
| License | Roboflow datasets require individual API key download |
| Flexibility | Each developer can start with 5 items for testing, full set for production |

Make sure your `.gitignore` includes:
```
data/
Liquor-data-4/
coffee-ai-6/
Bottles_All-2/
```

---

## Dataset Details

### Currently used

| Dataset | Category | Classes | Images | Source |
|---------|----------|---------|--------|--------|
| Liquor-data v4 | bartender | 395 | ~9,500 | Lamar University · Roboflow |
| coffee-ai v6 | barista | — | ~900 | CoffeeAI · Roboflow |

### Additional datasets (add if search quality is low)

| Dataset | Workspace / Project | Use for |
|---------|---------------------|---------|
| Alcohol Detection | `nitro-bzs43/alcohol-detection-srjag` | Multi-bottle shelf scans |
| Coffee Beans | `coffe-dataset/coffee-beans-znwfe` | Coffee bean quantity |
| CoffeeShop | `arsalene/coffeeshop-dataset` | General café items |

### Monin syrups (no public dataset)

Monin products appear on both barista and bartender inventory sheets. No public dataset exists.

**To add Monin items:**
1. Photograph 30–50 images per bottle at different angles
2. Save to `data/images/barista/monin_{flavor}/`
3. Re-run `python populate_qdrant.py` — upserts safely without wiping existing data

---

## API Endpoints

### Health check
```
GET /health
→ {"status": "ok"}
```

### Image search
```
POST /embed-and-search
Content-Type: multipart/form-data
Body: image = <binary image file>
Supported formats: JPEG, PNG, WebP
```

Response:
```json
{
  "results": [
    {
      "productId": "bartender_Titos50Ml",
      "name": "Titos50Ml",
      "category": "bartender",
      "sku": "TITOS50ML",
      "score": 0.87,
      "currentQty": 0,
      "unit": "BOTTLE",
      "reorderThreshold": 5
    }
  ],
  "count": 5
}
```

---

## Qdrant payload schema

| Field | Type | Example |
|-------|------|---------|
| `productId` | string | `bartender_Titos50Ml` |
| `name` | string | `Titos50Ml` |
| `category` | string | `bartender` or `barista` |
| `sku` | string | `TITOS50ML` |
| `currentQty` | number | `12` |
| `unit` | string | `BOTTLE`, `KG`, `CAN`, `LITERS`, `BOX` |
| `reorderThreshold` | number | `5` |
| `imageUrl` | string | path to source image |
| `subCategory` | string | `syrup`, `puree`, `sauce` |
| `flavor` | string | `mango`, `vanilla` |
| `lastUpdated` | string | ISO date string |

---

## Project structure

```
project-root/
├── ml-service/
│   ├── app/
│   │   ├── main.py
│   │   ├── api/routes.py
│   │   ├── services/
│   │   │   ├── clip.py        # expects image bytes, not PIL Image
│   │   │   └── qdrant.py
│   │   └── core/config.py
│   ├── .env
│   └── requirements.txt
├── data/                      # NOT in git — created by setup_datasets.py
│   └── images/
│       ├── bartender/         # 395 item folders
│       └── barista/
├── setup_datasets.py          # run once after cloning
├── populate_qdrant.py         # run after setup_datasets.py
├── init_qdrant.py
└── README.md
```

---

## Performance

| Metric | Value |
|--------|-------|
| CLIP model | ViT-B-32, CPU |
| Embedding size | 512 dimensions |
| Search metric | Cosine similarity |
| Good match threshold | score > 0.75 |
| Search response time | 2–5 sec per image |
| Full population time | 30–60 min (CPU) |

---

## Troubleshooting

**"Collection doesn't exist" (500 error)**
```bash
python init_qdrant.py
```

**"Connection refused to localhost:6333"**
Start Qdrant first, then the ML service.

**"a bytes-like object is required, not Image"**
`image_to_embedding` in `clip.py` expects raw bytes. Use `open(path, 'rb').read()` — never pass a PIL Image object directly.

**populate_qdrant.py interrupted mid-run**
Safe to re-run. To start completely clean:
```python
from qdrant_client import QdrantClient
client = QdrantClient(url="http://localhost:6333")
client.delete_collection("inventory_items")
# then re-run init_qdrant.py and populate_qdrant.py
```

**Roboflow ZIP fails on Windows (WinError 123)**
Always use the API download method. Never download as ZIP on Windows — long folder names cause extraction failures.

**Search scores below 0.75**
Add the Alcohol Detection dataset and re-run populate_qdrant.py.

---

## Progress tracker

- ✅ CLIP + Qdrant setup
- ✅ `/embed-and-search` endpoint working
- ✅ Bartender dataset downloaded and populated (5 item quick test)
- ✅ Image search tested and working via React UI
- ⬜ Full bartender dataset populated (395 classes)
- ⬜ Barista dataset populated
- ⬜ Node.js inventory routes (stock management)
- ⬜ Qdrant payload sync on stock update
- ⬜ Low stock alert cron job
- ⬜ React Scanner, LowStockTable, AddItemForm components
- ⬜ Monin syrup photos added

---

## License

Part of the Barista & Bartender Training School Inventory Management System.