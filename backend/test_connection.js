const axios = require('axios');

async function testConnection() {
  console.log('🧪 Testing ML Service connectivity...\n');
  
  try {
    console.log('1. Testing health endpoint...');
    const response = await axios.get('http://localhost:8000/health', { timeout: 5000 });
    console.log('✅ Connected to ML service!');
    console.log('   Response:', response.data);
  } catch (error) {
    console.error('❌ Cannot connect to ML service');
    console.error('   Error:', error.message);
    console.error('   This means:');
    console.error('   - ML service may not be running');
    console.error('   - Port 8000 may be blocked');
    console.error('   - localhost vs 127.0.0.1 issue');
  }
}

testConnection();
