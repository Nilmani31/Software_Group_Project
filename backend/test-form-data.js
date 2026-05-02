// Test image-search endpoint with FormData
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

async function testImageSearch() {
  try {
    console.log('🧪 Testing image search POST with FormData...\n');
    
    // Create a simple test image (1x1 pixel PNG)
    const imagePath = './test-image.png';
    const pngData = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 image
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // 8-bit RGB
      0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
      0x54, 0x08, 0x99, 0x63, 0xF8, 0xCF, 0xC0, 0x00, // image data
      0x00, 0x00, 0x03, 0x00, 0x01, 0x95, 0x6E, 0xE1, // more data
      0x76, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, // IEND chunk
      0x44, 0xAE, 0x42, 0x60, 0x82 // end marker
    ]);
    
    fs.writeFileSync(imagePath, pngData);
    console.log('✅ Created test image file\n');
    
    // Create FormData
    const formData = new FormData();
    formData.append('image', fs.createReadStream(imagePath), {
      filename: 'test.png',
      contentType: 'image/png'
    });
    
    console.log('📤 Sending POST /api/image-search/test with image...');
    const response = await axios.post(
      'http://localhost:5000/api/image-search/test',
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 10000
      }
    );
    
    console.log('\n✅ SUCCESS! Response:');
    console.log('   Status:', response.status);
    console.log('   Results count:', response.data.count);
    console.log('   First result:', response.data.results[0]?.name);
    console.log('   File was received:', response.data.debug?.fileReceived);
    
    // Cleanup
    fs.unlinkSync(imagePath);
    
  } catch (error) {
    console.error('\n❌ ERROR:');
    console.error('   Message:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

testImageSearch();
