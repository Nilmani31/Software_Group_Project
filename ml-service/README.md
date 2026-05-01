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
- **Node.js backend** running on `http://localhost:5000`

---

## Quick Setup Guide

### Step 1: Setup Qdrant Database (REQUIRED)

#### Option A: Download & Run Qdrant Executable (Windows/macOS/Linux)

1. **Download Qdrant:**
   - Go to: https://github.com/qdrant/qdrant/releases
   - Download the latest release for your OS:
     - **Windows:** `qdrant-x86_64-pc-windows-gnu.exe`
     - **macOS:** `qdrant-x86_64-apple-darwin` or `qdrant-aarch64-apple-darwin` (Apple Silicon)
     - **Linux:** `qdrant-x86_64-unknown-linux-gnu`

2. **Create Qdrant directory:**
   ```bash
   mkdir qdrant
   cd qdrant
   ```

3. **Extract/Move executable:**
   - **Windows:** Move the `.exe` file to the `qdrant` folder
   - **macOS/Linux:** 
     ```bash
     chmod +x qdrant-x86_64-unknown-linux-gnu
     mv qdrant-x86_64-unknown-linux-gnu qdrant
     ```

4. **Create required folder:**
   ```bash
   mkdir storage
   ```

5. **Run Qdrant:**
   - **Windows:**
     ```powershell
     .\qdrant.exe
     ```
   - **macOS/Linux:**
     ```bash
     ./qdrant
     ```

   **Expected output:**
   ```
   2024-XX-XX ... Server is running on 0.0.0.0:6333
   ```

6. **Verify it's running:**
   - Open browser: http://localhost:6333/health
   - Should return: `{"status":"ok"}`

#### Option B: Using Docker (Recommended)

```bash
docker run -p 6333:6333 -v qdrant_storage:/qdrant/storage qdrant/qdrant
```

**Note:** Keep Qdrant running in a separate terminal/process throughout development.

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

### 4. Create `.env` file (if it doesn't exist)

Create `ml-service/.env`:
```env
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=inventory_items
QDRANT_TOP_K=5
QDRANT_API_KEY=
```

### 5. Initialize Qdrant Collection

Before running the service for the first time, create the collection:

```bash
# From project root directory
python init_qdrant.py
```

**Expected output:**
```
Creating collection 'inventory_items'...
✅ Collection 'inventory_items' created successfully!
   Vector size: 512 (CLIP ViT-B-32)
   Distance metric: COSINE
```

### 6. (Optional) Populate Test Data

Add sample items to Qdrant for testing:

```bash
# From project root directory
python populate_qdrant.py
```

**Expected output:**
```
📝 Creating test items in Qdrant collection 'inventory_items'...
  ✅ Added: Test Item 1
  ✅ Added: Test Item 2
✅ Successfully populated 2 test items!
Collection is now ready for image search testing.
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

### Issue: "Collection `inventory_items` doesn't exist!" (500 Error)

**Cause:** Qdrant is running but the collection wasn't initialized.

**Solution:**
1. Make sure Qdrant is running (see Quick Setup Guide)
2. Initialize the collection:
   ```bash
   python init_qdrant.py
   ```
3. Restart the ML service

### Issue: "Connection refused to localhost:6333" (500 Error)

**Cause:** Qdrant service is not running.

**Solution:** Start Qdrant:
- **Windows:** Run `qdrant.exe` in the qdrant folder
- **macOS/Linux:** Run `./qdrant` in the qdrant folder
- **Docker:** `docker run -p 6333:6333 qdrant/qdrant`

**Verify it's running:**
```bash
curl http://localhost:6333/health
```

Should return: `{"status":"ok"}`

### Issue: "CLIP model stuck loading"

**Cause:** First load downloads 605 MB model file.

**Solution:** 
- Requires stable internet connection
- At least 2 GB free disk space
- Wait 5-10 minutes for model download
- Monitor: Look for `✅ CLIP model loaded successfully!`

### Issue: "Slow image search response" or "Timeout"

**Possible causes:**
- First request (CLIP model initializing)
- Large image file (recommend < 5 MB)
- Qdrant database has many items (normal, expected)
- Both services running on same machine with limited resources

**Solution:**
- Ensure both Qdrant and ML Service have resources
- Optimize images to < 5 MB
- Check CPU/RAM availability

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
