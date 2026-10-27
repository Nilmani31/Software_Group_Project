import requests

image_path = r"C:\Users\nethm\Downloads\c.jpg"

try:
    with open(image_path, "rb") as f:
        files = {"image": f}  # Field name MUST be "image" to match middleware
        print("Sending request to http://localhost:5005/api/image-search/search...")
        response = requests.post("http://localhost:5005/api/image-search/search", files=files, timeout=30)
        print("Status:", response.status_code)
        print("Response:", response.json())
except Exception as e:
    print(f"Error: {e}")
