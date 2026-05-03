#!/usr/bin/env python3
import os

file_path = r"c:\Users\nethm\Desktop\Software Project New\Software_Group_Project\frontend\src\Components\FindItemByImageModal.jsx"

# Read the file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Make replacements
# 1. Change useState(false) to useState(true) for useTestEndpoint
content = content.replace(
    'const [useTestEndpoint, setUseTestEndpoint] = useState(false);',
    'const [useTestEndpoint, setUseTestEndpoint] = useState(true);'
)

# 2. Replace relative API paths with full URLs
content = content.replace(
    "const endpoint = useTestEndpoint ? '/api/image-search/test' : '/api/image-search/search';",
    "const endpoint = useTestEndpoint ? 'http://localhost:5000/api/image-search/test' : 'http://localhost:5000/api/image-search/search';"
)

# Write the file back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ FindItemByImageModal.jsx updated successfully!")
print("   ✓ Default test mode enabled")
print("   ✓ Full backend URLs configured")
