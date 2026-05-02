# ML Service - Image Search Backend

This is the **FastAPI-based machine learning service** that handles image embedding generation and similarity search for the "Find Item by Image" feature.

## Overview

The ML service provides a REST API that:
1. **Receives images** from the Node.js backend
2. **Generates embeddings** using OpenAI's CLIP model (ViT-B-32)
3. **Searches for similar items** in Qdrant vector database
4. **Returns matching inventory items** sorted by similarity score

### Architecture Flow
```
React Frontend
     ↓
Node.js Backend (Express)
     ↓
FastAPI ML Service (Port 8000)
     ↓
Qdrant Vector Database (Port 6333)
```

---

## Prerequisites

- **Python 3.10+** (Tested on Python 3.10, 3.11)
- **Qdrant vector database** running on `http://localhost:6333`
- **Node.js backend** running on `http://localhost:5005`

---

## Installation & Setup

### 1. Create Virtual Environment

```bash
cd ml-service
python -m venv .venv
```

### 2. Activate Virtual Environment

**Windows:**
```powershell
.venv\Scripts\Activate.ps1
```

**macOS/Linux:**
```bash
source .venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Create `.env` file

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
SERVICE_NAME=ml-service
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=inventory_items
QDRANT_TOP_K=5
```

---

## Running the Service

### Start ML Service

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Expected output:
```
🔄 Pre-loading CLIP model...
✅ CLIP model loaded successfully!
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### First Run
⚠️ **Note:** On first run, the service downloads the CLIP model (~605 MB). This takes **1-2 minutes**. Wait for:
```
✅ CLIP model loaded successfully!
```

---

## API Endpoints

### 1. Health Check
```
GET /health
```
**Response:**
```json
{
  "status": "ok"
}
```

### 2. Image Embedding & Search
```
POST /embed-and-search
Content-Type: multipart/form-data

Body:
  image: <binary image file>
```

**Supported formats:** JPEG, PNG, WebP

**Response:**
```json
{
  "results": [
    {
      "productId": "item_1",
      "name": "Product Name",
      "category": "Electronics",
      "sku": "SKU001",
      "score": 0.85,
      "imageUrl": "http://example.com/image.jpg"
    }
  ],
  "count": 1
}
```

**Error Response (500):**
```json
{
  "detail": "Collection `inventory_items` doesn't exist!"
}
```

---

## Testing

### Test ML Service Directly

```bash
# From backend directory
node test_ml_direct.js
```

Or using Python:
```bash
python -c "
import requests
files = {'image': open('path/to/image.png', 'rb')}
response = requests.post('http://localhost:8000/embed-and-search', files=files)
print(response.json())
"
```

---

## Project Structure

```
ml-service/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app & startup
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes.py           # API endpoints
│   ├── services/
│   │   ├── __init__.py
│   │   ├── clip.py             # CLIP model for embeddings
│   │   └── qdrant.py           # Qdrant vector DB search
│   └── core/
│       ├── __init__.py
│       └── config.py           # Configuration
├── .env                        # Configuration (create from .env.example)
├── .env.example                # Example configuration
├── requirements.txt            # Python dependencies
└── README.md                   # This file
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SERVICE_NAME` | `ml-service` | Service name for logging |
| `QDRANT_URL` | `http://localhost:6333` | Qdrant server URL |
| `QDRANT_COLLECTION` | `inventory_items` | Vector collection name |
| `QDRANT_TOP_K` | `5` | Number of results to return |

---

## Troubleshooting

### Issue: "Collection `inventory_items` doesn't exist!"

**Solution:** Initialize the Qdrant collection:
```bash
# From project root
python init_qdrant.py
```

### Issue: "CLIP model stuck loading"

**Solution:** The first load downloads 605 MB. Make sure you have:
- Stable internet connection
- At least 2 GB free disk space
- 5-10 minutes wait time

### Issue: "Connection refused to localhost:6333"

**Solution:** Qdrant is not running. Start it:
```bash
# If you have Qdrant executable
qdrant.exe

# Or using Docker
docker run -p 6333:6333 qdrant/qdrant
```

### Issue: Slow image search response

**Possible causes:**
- First request after startup (CLIP model initializing)
- Large image file (optimize to < 5 MB)
- Qdrant database has many items (normal, expected)

---

## Dependencies

### Key Packages

| Package | Purpose |
|---------|---------|
| `fastapi` | Web framework |
| `uvicorn` | ASGI server |
| `torch` | Deep learning framework |
| `open_clip` | CLIP model implementation |
| `pillow` | Image processing |
| `qdrant-client` | Vector database client |
| `python-dotenv` | Environment configuration |

Install all with:
```bash
pip install -r requirements.txt
```

---

## Performance Notes

- **CLIP Model:** Runs on CPU (optimized for ViT-B-32)
- **Embedding Size:** 512 dimensions
- **Search Metric:** Cosine similarity
- **Average Response Time:** 2-5 seconds per image (after model load)

---

## Integration with Node.js Backend

The backend calls this service at:
```
POST http://localhost:8000/embed-and-search
```

With logging:
```
🔍 [ImageSearch] Starting image search...
📤 [ImageSearch] File: image.png, Size: 245800 bytes
⏳ [ImageSearch] Sending request to ML service...
✅ [ImageSearch] Response received from ML service
📊 [ImageSearch] Results count: 5
```

---

## Next Steps

1. **Populate Qdrant** with real product images and embeddings
2. **Fine-tune CLIP** for your specific inventory domain (optional)
3. **Add batch embedding** support for bulk imports
4. **Cache embeddings** in database for faster searches

---

## Support

For issues or questions about the ML service:
1. Check logs in the ML service terminal
2. Verify Qdrant is running: `curl http://localhost:6333/health`
3. Test with `test_ml_direct.js` to isolate issues

---

## License

Part of the inventory management system project.
