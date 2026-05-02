const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

const testImageSearch = async () => {
  const imagePath = 'C:\\Users\\nethm\\Downloads\\c.jpg';

  try {
    const form = new FormData();
    const fileStream = fs.createReadStream(imagePath);
    form.append('image', fileStream);

    console.log('Sending image to http://localhost:5005/api/image-search/search...');
    const response = await axios.post(
      'http://localhost:5005/api/image-search/search',
      form,
      {
        headers: form.getHeaders(),
        timeout: 120000,  // 120 seconds to match backend
      }
    );

    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
};

testImageSearch();
