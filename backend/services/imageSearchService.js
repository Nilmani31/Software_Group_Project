const axios = require("axios");
const FormData = require("form-data");

const searchByImage = async (file) => {
	const mlServiceUrl = process.env.ML_SERVICE_URL;
	
	console.log(`\n${'═'.repeat(60)}`);
	console.log(`🔍 [ImageSearch] IMAGE SEARCH REQUEST STARTED`);
	console.log(`${'═'.repeat(60)}`);
	
	// STEP 1: Validate ML_SERVICE_URL
	console.log(`\n1️⃣  Checking ML_SERVICE_URL...`);
	if (!mlServiceUrl) {
		console.error(`❌ ML_SERVICE_URL is undefined!`);
		console.error(`   Check: backend/.env file has ML_SERVICE_URL=...`);
		throw new Error("ML service URL is not configured.");
	}
	console.log(`   ✅ ML_SERVICE_URL = ${mlServiceUrl}`);
	
	// STEP 2: Log file details
	console.log(`\n2️⃣  File Details...`);
	console.log(`   Filename: ${file.originalname}`);
	console.log(`   Size: ${file.size} bytes`);
	console.log(`   MIME type: ${file.mimetype}`);
	console.log(`   Buffer length: ${file.buffer ? file.buffer.length : 'NO BUFFER'}`);
	
	// STEP 3: Create FormData
	console.log(`\n3️⃣  Creating FormData...`);
	const formData = new FormData();
	formData.append("image", file.buffer, {
		filename: file.originalname || "image.jpg",
		contentType: file.mimetype,
	});
	console.log(`   ✅ FormData created`);
	
	// STEP 4: Prepare request
	console.log(`\n4️⃣  Preparing axios request...`);
	const fullUrl = `${mlServiceUrl}/embed-and-search`;
	console.log(`   URL: ${fullUrl}`);
	console.log(`   Method: POST`);
	console.log(`   Timeout: 120000ms`);
	console.log(`   Headers: ${JSON.stringify(formData.getHeaders())}`);
	
	try {
		// STEP 5: Send request
		console.log(`\n5️⃣  ⏳ SENDING REQUEST TO ML SERVICE...`);
		console.log(`   Timestamp: ${new Date().toISOString()}`);
		
		const response = await axios.post(
			fullUrl,
			formData,
			{
				headers: {
					...formData.getHeaders(),
				},
				timeout: 120000,
				maxContentLength: Infinity,
				maxBodyLength: Infinity,
			}
		);
		
		// STEP 6: Log success response
		console.log(`\n6️⃣  ✅ RESPONSE RECEIVED FROM ML SERVICE`);
		console.log(`   Status: ${response.status}`);
		console.log(`   Timestamp: ${new Date().toISOString()}`);
		console.log(`   Results count: ${response.data.count}`);
		console.log(`   Response keys: ${Object.keys(response.data).join(', ')}`);
		
		console.log(`\n${'═'.repeat(60)}`);
		console.log(`✅ IMAGE SEARCH COMPLETED SUCCESSFULLY`);
		console.log(`${'═'.repeat(60)}\n`);
		
		return response.data;
	} catch (error) {
		// STEP 7: Log error with full details
		console.log(`\n❌ ERROR IN IMAGE SEARCH`);
		console.log(`   Error code: ${error.code}`);
		console.log(`   Error message: ${error.message}`);
		console.log(`   Error type: ${error.constructor.name}`);
		
		if (error.response) {
			console.error(`   HTTP Status: ${error.response.status}`);
			console.error(`   Response data: ${JSON.stringify(error.response.data)}`);
		} else if (error.request) {
			console.error(`   Request sent but no response received`);
			console.error(`   Request method: ${error.request.method}`);
		} else {
			console.error(`   Request could not be sent`);
		}
		
		console.log(`\n${'═'.repeat(60)}`);
		console.log(`❌ IMAGE SEARCH FAILED`);
		console.log(`${'═'.repeat(60)}\n`);
		
		throw error;
	}
};

module.exports = {
	searchByImage,
};
