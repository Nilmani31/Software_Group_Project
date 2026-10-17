# ML Service - Image Search

FastAPI service for the **Colombo Bartender & Barista School (CBBS) Inventory Management System**. It powers the **Find Item by Image** feature: staff upload a photo and the system suggests the matching inventory item.

It uses **CLIP** (open_clip ViT-B-32) to turn images and text into 512-dimension vectors, and **Qdrant** to store and search real item photos.

---

## Architecture

```
React Frontend (:3000)
     ↓  POST /api/image-search/zero-shot
Node.js / Express Backend (:5005)  ←→  MongoDB Atlas (items, categories)
     ↓
FastAPI ML Service (:8000)  ←→  Qdrant Vector DB (:6333)
```

---

## How the search works

The app uses a **hybrid search** with two layers:

1. **Reference-photo match (image-to-image)** - when an item is saved with a photo, the backend sends it to `/add-reference`. The photo's CLIP embedding is stored in Qdrant. A new search photo is compared against these real photos. A match needs a cosine score of **0.75 or higher**.
2. **Zero-shot match (image-to-text)** - for items without a confident photo match, the backend sends the search photo plus the list of `{name, category}` items from MongoDB to `/zero-shot-search`. CLIP compares the photo embedding with a text embedding of each item name. A match needs a score of **0.24 or higher**.

The backend puts photo matches first, then zero-shot matches, and returns at most **5 results**.

> **Status:** the reference-photo layer is controlled by `ENABLE_REFERENCE_PHOTO_SEARCH` in `backend/.env` and is **off by default**. With it off, only zero-shot runs. Photos are still embedded and stored in Qdrant whenever an item is saved with an image, so switching the flag on later needs no re-upload (items saved before the ML service was running need to be re-saved once).

### Why two thresholds?
CLIP image-to-text similarity is naturally low (roughly 0.2 to 0.35 even for a correct match). Image-to-image similarity is much higher. So the scores of the two layers are not comparable, and each has its own threshold. The UI shows `score × 100` as "% match". For zero-shot results this is a **ranking score, not a probability**.

### Zero-shot prompt ensembling
Each item name is embedded using several phrasings, then averaged and re-normalised:

- `a photo of {name}`
- `a close-up product photo of {name}`
- `{name}, an item in a bar and kitchen inventory`
- `a picture of {name}`
- if a category exists: `a photo of {name}, a type of {category}` and `{name}, an item in the {category} category of a bar and kitchen inventory`

The category helps separate look-alikes (for example spirits vs. cleaning supplies, or bar vs. barista items). Text embeddings are **cached** by `(name, category)`, because they never change unless the name or category changes. This fixed the early search timeouts.

---

## Quick Start

### 1. Start Qdrant

**Docker (recommended):**
```bash
docker run -p 6333:6333 -v qdrant_storage:/qdrant/storage qdrant/qdrant
```

Or download the executable from https://github.com/qdrant/qdrant/releases and run it (it listens on port 6333).

Check it: http://localhost:6333/health

Qdrant is only needed for the reference-photo features. Zero-shot search works without it.

### 2. Create a virtual environment

```bash
cd ml-service
python -m venv .venv

# Windows
.venv\Scripts\Activate.ps1

# macOS / Linux
source .venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

(Python 3.10 or newer. `torch` is a large download.)

### 4. Configure environment variables

The ML service reads these **from the environment**. If you do nothing, the defaults below are used, which is fine for local development.

| Variable | Default | Meaning |
|----------|---------|---------|
| `QDRANT_URL` | `http://localhost:6333` | Qdrant address |
| `QDRANT_API_KEY` | *(empty)* | Only for secured/cloud Qdrant |
| `QDRANT_COLLECTION` | `inventory_items` | Collection name |
| `QDRANT_TOP_K` | `5` | Results returned by `/embed-and-search` |
| `SERVICE_NAME` | `ml-service` | Label only |

See `ml-service/.env.example`. The service does not load a `.env` file by itself, so set values in your shell if you change them.

**Backend settings** (add these to your `backend/.env`):

```env
ML_SERVICE_URL=http://127.0.0.1:8000
IMAGE_UPLOAD_MAX_MB=5
ENABLE_REFERENCE_PHOTO_SEARCH=false   # set to true to enable image-to-image matching
```

### 5. Start the ML service

```bash
cd ml-service
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

On startup it pre-loads the CLIP model so the first search doesn't time out:

```
🔄 Pre-loading CLIP model...
✅ CLIP model loaded successfully!
```

The first run downloads the model weights (about 600 MB). Wait for the success message.

You can also start everything together from the project root with `npm run dev` (Windows).

### 6. (Optional) Create the Qdrant collection manually

The collection is created automatically the first time a reference photo is saved. To create it up front, run this from the **project root**:

```bash
python init_qdrant.py
```

It creates `inventory_items` with 512-dimension vectors and cosine distance.

---

## API endpoints

### ML service (FastAPI, port 8000)

**Health check**
```
GET /health
→ {"status": "ok"}
```

**Zero-shot search** (photo vs. item names, no Qdrant)
```
POST /zero-shot-search
Content-Type: multipart/form-data
Fields: image = <file>
        items = JSON array of {"name": "...", "category": "..."}
```
```json
{
  "success": true,
  "results": [
    { "name": "Vodka", "score": 0.2871 },
    { "name": "Gin", "score": 0.2514 }
  ],
  "count": 2
}
```
Results are sorted by score, highest first. Thresholding is done by the backend.

**Save a reference photo**
```
POST /add-reference
Content-Type: multipart/form-data
Fields: image, productId, name, category (optional), sku (optional)
→ {"success": true, "productId": "..."}
```
Embeds the photo and stores it in Qdrant. The point ID is a deterministic UUID derived from `productId`, so saving again for the same item **replaces** the old photo.

**Delete a reference photo**
```
DELETE /reference/{product_id}
→ {"success": true, "productId": "..."}
```

**Image-to-image search** (Qdrant)
```
POST /embed-and-search
Content-Type: multipart/form-data
Fields: image = <file>
```
```json
{
  "results": [
    {
      "productId": "64f...",
      "name": "Vodka",
      "category": "Bar Materials",
      "sku": "SKU-BAR-001",
      "score": 0.87,
      "imageUrl": null,
      "source": "reference"
    }
  ],
  "count": 1
}
```
`source` is `"reference"` (a real photo saved through the app) or `"dataset"` (a seeded dataset image).

### Backend (Express, port 5005)

| Endpoint | Purpose |
|----------|---------|
| `POST /api/image-search/zero-shot` | Main endpoint used by the UI (hybrid search). Field name: `image`. |
| `POST /api/image-search/search` | Raw Qdrant search (image-to-image only). |

Uploads accept **JPEG, PNG or WebP**, with a default maximum of **5 MB** (`IMAGE_UPLOAD_MAX_MB`).

The hybrid endpoint returns live item data:
```json
{
  "results": [
    {
      "name": "Vodka",
      "score": 0.2871,
      "matchType": "text",
      "productId": "64f...",
      "sku": "SKU-BAR-001",
      "category": "Bar Materials",
      "imageUrl": "data:image/jpeg;base64,...",
      "quantity": 12,
      "status": "normal"
    }
  ],
  "count": 1
}
```
`matchType` is `"photo"` (reference-photo match) or `"text"` (zero-shot).

---

## Keeping photos in sync with items

The backend (`backend/controllers/items.js`) keeps Qdrant in step with the inventory:

| Event | What happens |
|-------|--------------|
| Item created or updated **with a photo** | Photo is sent to `/add-reference` and stored or replaced in Qdrant |
| Item deleted | Its reference photo is removed via `DELETE /reference/{id}` |
| ML service is down | The item still saves. The embedding failure is logged as a warning and never blocks the save. |

The photo must be sent as a base64 data URL (`data:image/...;base64,...`), which is how the frontend saves item images.

---

## Qdrant payload

**Reference photos (created by the app)**

| Field | Example |
|-------|---------|
| `productId` | MongoDB item `_id` |
| `name` | `Vodka` |
| `category` | `Bar Materials` |
| `sku` | `SKU-BAR-001` |
| `source` | `reference` |
| `lastUpdated` | ISO date string |

Vector: 512 dimensions, cosine distance, collection `inventory_items`.

---

## Quick test

```bash
curl http://localhost:8000/health

curl -X POST http://localhost:8000/zero-shot-search \
  -F "image=@test_bottle.jpg" \
  -F 'items=[{"name":"Vodka","category":"Bar Materials"},{"name":"Gin","category":"Bar Materials"}]'
```

To seed the real item list into MongoDB for testing, run `python add_real_items.py` from the project root with the backend running.

---

## Optional: legacy dataset seeding

The original version of this feature matched photos against public Roboflow datasets (liquor and coffee images). That approach is no longer used by the app, because dataset bottles don't match the school's real items. The script is still in the repo:

- `populate_qdrant.py` (run from the project root) reads images from `data/images/<category>/<item>/` and stores their embeddings in Qdrant. Before running it, edit the hardcoded `sys.path.insert(...)` line near the top so it points to your own `ml-service` folder.
- The dataset images are **not in git** (too large, and licensed per Roboflow account). Download them yourself.
- Dataset points never match a real inventory item, so they are dropped from the final results. If you seed them, keep in mind they share the same Qdrant collection as the real reference photos.

---

## Performance

| Metric | Value |
|--------|-------|
| Model | CLIP ViT-B-32 (`laion2b_s34b_b79k`) |
| Device | GPU if available, otherwise CPU |
| Embedding size | 512 |
| Search time | a few seconds per image on CPU (the model is pre-loaded at startup) |
| Zero-shot threshold | 0.24 (set in `backend/controllers/imageSearchController.js`) |
| Photo-match threshold | 0.75 (same file) |

---

## Known limitations

- Zero-shot struggles with look-alike items (for example clear spirits) and does not reliably read label text.
- Accuracy improves a lot once real reference photos exist for each item. Turn on `ENABLE_REFERENCE_PHOTO_SEARCH` once they do.
- Thresholds come from limited testing and should be re-tuned on a larger set of real photos.
- There is no formal accuracy benchmark yet.
- Runs on CPU by default, so searches take a few seconds.

---

## Troubleshooting

**"Connection refused" to localhost:6333**
Start Qdrant before the ML service (only needed for reference-photo features).

**"Collection doesn't exist"**
Run `python init_qdrant.py` from the project root, or save an item with a photo (this creates it).

**Search times out**
Make sure the ML service has finished loading CLIP (look for the success message). Check that `ML_SERVICE_URL` in `backend/.env` is correct.

**"Uploaded file is not a valid image"**
Use JPEG, PNG or WebP.

**"a bytes-like object is required, not Image"**
`image_to_embedding` expects raw bytes. Pass `open(path, "rb").read()`, never a PIL Image.

**Reference photos are saved but never match**
Check that `ENABLE_REFERENCE_PHOTO_SEARCH=true` in `backend/.env`, that Qdrant is running, and that the item was saved with a photo while the ML service was up.

---

## Project structure

```
ml-service/
├── app/
│   ├── main.py              # FastAPI app, pre-loads CLIP on startup
│   ├── api/routes.py        # /health, /embed-and-search, /zero-shot-search,
│   │                        #   /add-reference, /reference/{id}
│   ├── services/
│   │   ├── clip.py          # image + text embeddings, prompt ensembling, cache
│   │   └── qdrant.py        # search, upsert and delete reference photos
│   └── core/config.py
├── requirements.txt
├── .env.example
└── README.md

(project root)
├── init_qdrant.py           # create the Qdrant collection
├── populate_qdrant.py       # optional legacy dataset seeding
└── add_real_items.py        # bulk-add real items to MongoDB for testing
```

---

## Status

- ✅ CLIP + Qdrant setup
- ✅ Zero-shot search with prompt ensembling, category context and caching
- ✅ Reference photos auto-embedded on item create/update, removed on delete
- ✅ Hybrid search in the backend, find-by-image modal in the UI (with cancel)
- ⬜ Enable and tune reference-photo matching once real item photos exist
- ⬜ Accuracy benchmark on real photos
- ⬜ Rescale zero-shot scores in the UI so "% match" is more meaningful

---

Part of the CBBS Inventory Management System.