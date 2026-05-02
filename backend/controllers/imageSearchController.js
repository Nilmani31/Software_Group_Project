const { searchByImage } = require("../services/imageSearchService");

const findItemsByImage = async (req, res, next) => {
	console.log(`\n${'═'.repeat(60)}`);
	console.log(`📸 RECEIVED IMAGE SEARCH REQUEST`);
	console.log(`${'═'.repeat(60)}`);
	
	try {
		// STEP 1: Check if file exists
		console.log(`\n1️⃣  Checking request...`);
		console.log(`   Method: ${req.method}`);
		console.log(`   URL: ${req.url}`);
		console.log(`   Body fields: ${Object.keys(req.body).join(', ')}`);
		console.log(`   req.file exists: ${!!req.file}`);
		console.log(`   req.files exists: ${!!req.files}`);
		
		if (!req.file) {
			console.warn(`\n⚠️ NO FILE RECEIVED FROM FRONTEND!`);
			console.warn(`   Expected field name: 'image'`);
			console.warn(`   Multer config: upload.single("image")`);
			console.warn(`   req.file: ${req.file}`);
			console.warn(`   req.files: ${JSON.stringify(req.files)}`);
			return res.status(400).json({
				error: "ImageRequired",
				message: "Please upload an image file with field name 'image'.",
				debug: {
					fileExists: !!req.file,
					filesExist: !!req.files,
					bodyKeys: Object.keys(req.body)
				}
			});
		}

		// STEP 2: Log file details
		console.log(`\n2️⃣  File received from Multer...`);
		console.log(`   Filename: ${req.file.originalname}`);
		console.log(`   Size: ${req.file.size} bytes`);
		console.log(`   MIME: ${req.file.mimetype}`);
		console.log(`   Buffer exists: ${!!req.file.buffer}`);
		console.log(`   Buffer length: ${req.file.buffer ? req.file.buffer.length + ' bytes' : 'NO BUFFER'}`);
		
		// STEP 3: Call service
		console.log(`\n3️⃣  Calling imageSearchService.searchByImage()...`);
		const mlResponse = await searchByImage(req.file);

		// STEP 4: Return success
		console.log(`\n4️⃣  Sending response to client...`);
		console.log(`   Status: 200 OK`);
		console.log(`   Results count: ${mlResponse.count}`);
		
		console.log(`\n${'═'.repeat(60)}`);
		console.log(`✅ IMAGE SEARCH REQUEST COMPLETED SUCCESSFULLY`);
		console.log(`${'═'.repeat(60)}\n`);
		
		return res.status(200).json({
			results: mlResponse.results || [],
			count: mlResponse.count || 0,
		});
	} catch (error) {
		console.error(`\n❌ ERROR IN CONTROLLER`);
		console.error(`   Error: ${error.message}`);
		console.error(`   Type: ${error.constructor.name}`);
		if (error.stack) {
			console.error(`   Stack: ${error.stack.split('\n').slice(0, 5).join('\n')}`);
		}
		console.log(`${'═'.repeat(60)}\n`);
		return next(error);
	}
};

// TEST ENDPOINT: Returns mock response without calling ML service
const testImageSearch = async (req, res) => {
	console.log(`\n🧪 TEST ENDPOINT CALLED`);
	console.log(`   req.file exists: ${!!req.file}`);
	if (req.file) {
		console.log(`   File: ${req.file.originalname} (${req.file.size} bytes)`);
	}
	
	return res.status(200).json({
		results: [
			{
				productId: "test_1",
				name: "Test Product 1",
				category: "Test Category",
				sku: "TEST-001",
				score: 0.95,
				imageUrl: "https://via.placeholder.com/80?text=Test1"
			}
		],
		count: 1,
		debug: {
			fileReceived: !!req.file,
			fileName: req.file ? req.file.originalname : null,
			fileSize: req.file ? req.file.size : null
		}
	});
};

module.exports = {
	findItemsByImage,
	testImageSearch,
};
