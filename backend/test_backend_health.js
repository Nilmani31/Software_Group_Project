const axios = require('axios');

async function testBackend() {
  console.log('🧪 Testing backend health...\n');

  try {
    const response = await axios.get('http://localhost:5000/api/health', { timeout: 5000 });
    console.log('✅ Backend is running!');
    console.log('Response:', response.data);
  } catch (error) {
    console.error('❌ Backend is NOT responding');
    console.error('Error:', error.message);
    console.error('\nMake sure backend is running with: npm start');
  }
}

testBackend();
