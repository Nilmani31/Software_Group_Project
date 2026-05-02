const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function debugImageSearch() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🔍 COMPREHENSIVE DEBUG TEST');
  console.log('═══════════════════════════════════════════════════════════\n');

  // STEP 1: Check environment variables
  console.log('STEP 1: Check Backend Environment Variables');
  console.log('─────────────────────────────────────────────');
  try {
    const envResponse = await axios.get('http://localhost:5005/api/debug/env', { timeout: 5005 });
    console.log('✅ Backend responded:');
    console.log(`   ML_SERVICE_URL: ${envResponse.data.ML_SERVICE_URL}`);
    console.log(`   IMAGE_UPLOAD_MAX_MB: ${envResponse.data.IMAGE_UPLOAD_MAX_MB}`);
    console.log(`   NODE_ENV: ${envResponse.data.NODE_ENV}`);

    if (!envResponse.data.ML_SERVICE_URL) {
      console.error('❌ ERROR: ML_SERVICE_URL is undefined!');
      console.error('   Fix: Check backend/.env file');
      return;
    }
  } catch (error) {
    console.error('❌ Backend is not responding');
    console.error(`   Error: ${error.message}`);
    console.error('   Make sure: npm start is running in backend folder');
    return;
  }

  // STEP 2: Test FastAPI health endpoint
  console.log('\n\nSTEP 2: Test FastAPI Health Endpoint');
  console.log('─────────────────────────────────────────────');
  try {
    const healthResponse = await axios.get('http://127.0.0.1:8000/health', { timeout: 5005 });
    console.log('✅ FastAPI is reachable!');
    console.log(`   Response: ${JSON.stringify(healthResponse.data)}`);
  } catch (error) {
    console.error('❌ Cannot reach FastAPI at http://127.0.0.1:8000');
    console.error(`   Error code: ${error.code}`);
    console.error(`   Error message: ${error.message}`);
    console.error('   Make sure:');
    console.error('   1. uvicorn app.main:app --reload is running');
    console.error('   2. ML service is on port 8000');
    console.error('   3. Firewall allows localhost connections');
    return;
  }

  // STEP 3: Test image upload to FastAPI directly
  console.log('\n\nSTEP 3: Test Image Upload to FastAPI Directly');
  console.log('─────────────────────────────────────────────');
  const imagePath = 'C:\\Users\\nethm\\Downloads\\c.png';

  if (!fs.existsSync(imagePath)) {
    console.error(`❌ Image file not found: ${imagePath}`);
    return;
  }

  try {
    const form = new FormData();
    const fileStream = fs.createReadStream(imagePath);
    form.append('image', fileStream);

    console.log(`Sending image: c.png`);
    console.log(`Endpoint: http://127.0.0.1:8000/embed-and-search`);
    console.log(`Timeout: 120000ms`);

    const mlResponse = await axios.post(
      'http://127.0.0.1:8000/embed-and-search',
      form,
      {
        headers: form.getHeaders(),
        timeout: 120000,
      }
    );

    console.log('✅ FastAPI responded successfully!');
    console.log(`   Results count: ${mlResponse.data.count}`);
    console.log(`   Results: ${JSON.stringify(mlResponse.data.results, null, 2)}`);
  } catch (error) {
    console.error('❌ FastAPI request failed');
    console.error(`   Error code: ${error.code}`);
    console.error(`   Error message: ${error.message}`);
    console.error(`   Status: ${error.response?.status}`);
    console.error(`   Data: ${JSON.stringify(error.response?.data)}`);
  }

  // STEP 4: Test through Node backend
  console.log('\n\nSTEP 4: Test Through Node Backend Route');
  console.log('─────────────────────────────────────────────');

  try {
    const form = new FormData();
    const fileStream = fs.createReadStream(imagePath);
    form.append('image', fileStream);

    console.log(`Sending to: http://localhost:5005/api/image-search/search`);
    console.log(`Timeout: 120000ms`);

    const backendResponse = await axios.post(
      'http://localhost:5005/api/image-search/search',
      form,
      {
        headers: form.getHeaders(),
        timeout: 120000,
      }
    );

    console.log('✅ Backend returned results!');
    console.log(`   Results count: ${backendResponse.data.count}`);
    console.log(`   Results: ${JSON.stringify(backendResponse.data.results, null, 2)}`);
  } catch (error) {
    console.error('❌ Backend request failed');
    console.error(`   Error code: ${error.code}`);
    console.error(`   Error message: ${error.message}`);
    console.error(`   Status: ${error.response?.status}`);
    if (error.response?.data) {
      console.error(`   Response data: ${JSON.stringify(error.response.data)}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🔍 DEBUG TEST COMPLETE');
  console.log('═══════════════════════════════════════════════════════════\n');
}

debugImageSearch();
