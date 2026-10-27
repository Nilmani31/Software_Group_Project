import requests

# Test 1: Health check
print("Testing ML service health...")
try:
    response = requests.get("http://localhost:8000/health", timeout=5)
    print(f"✅ Health check: {response.json()}")
except Exception as e:
    print(f"❌ Health check failed: {e}")

# Test 2: Image embedding
print("\nTesting image embedding...")
image_path = r"C:\Users\nethm\Downloads\OIP.webp"

try:
    with open(image_path, "rb") as f:
        files = {"image": f}
        print("Sending image to ML service (timeout=60 seconds)...")
        response = requests.post("http://localhost:8000/embed-and-search", files=files, timeout=60)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
except Exception as e:
    print(f"❌ Error: {e}")
