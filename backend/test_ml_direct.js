const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function testImageUpload() {
  console.log('🧪 Testing image upload to FastAPI...\n');
  
  const imagePath = 'C:\\Users\\nethm\\Downloads\\c.jpg';
  
  try {
    const form = new FormData();
    const fileStream = fs.createReadStream(imagePath);
    form.append('image', fileStream);

    console.log('Uploading image to ML service...');
    const response = await axios.post(
      'http://localhost:8000/embed-and-search',
      form,
      {
        headers: form.getHeaders(),
        timeout: 120000,  // 120 seconds
      }
    );
    
    console.log('✅ SUCCESS! ML service responded');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ ERROR uploading to ML service');
    console.error('   Message:', error.message);
    console.error('   Status:', error.response?.status);
    console.error('   Data:', error.response?.data);
  }
}

testImageUpload();
