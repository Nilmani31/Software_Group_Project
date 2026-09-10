const { searchByImageZeroShot } = require("../services/zeroShotSearchService");
const Item = require("../models/items");
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
// POST /api/image-search/zero-shot
// No reference photos needed: fetches current item names from MongoDB,
// sends the uploaded photo + names to the ML service's zero-shot endpoint,
// then looks up full live data for the top-matching item(s).
const findItemsByImageZeroShot = async (req, res, next) => {
	try {
		if (!req.file) {
			return res.status(400).json({
				error: "ImageRequired",
				message: "Please upload an image file with field name 'image'.",
			});
		}

				const items = await Item.find({}, "name").lean();
		if (!items.length) {
			return res.status(400).json({
				error: "NoItems",
				message: "No inventory items exist yet to match against.",
			});
		}
		const itemNames = items.map((item) => item.name);

		const mlResponse = await searchByImageZeroShot(req.file, itemNames);
		const scored = mlResponse.results || [];

		// Look up full live item data for the top few matches, with category
		// populated since it's stored as a MongoDB reference, not a plain string.
		const topNames = scored.slice(0, 5).map((r) => r.name);
		const matchedItems = await Item.find({ name: { $in: topNames } })
			.populate("category", "name")
			.lean();

		const results = scored.slice(0, 5).map((r) => {
			const fullItem = matchedItems.find((i) => i.name === r.name);
			return {
				name: r.name,
				score: r.score,
				productId: fullItem?._id || null,
				sku: fullItem?.sku || "",
				category: fullItem?.category?.name || "",
				imageUrl: fullItem?.image || "",
				quantity: fullItem?.quantity ?? 0,
				status: fullItem?.status || "",
			};
		});

		return res.status(200).json({ results, count: results.length });
	} catch (error) {
		console.error("Error in findItemsByImageZeroShot:", error.message);
		return next(error);
	}
};
module.exports = {
	findItemsByImage,
	findItemsByImageZeroShot,	
};
