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
// POST /api/image-search/zero-shot
// Hybrid search: first checks Qdrant for real reference-photo matches
// (auto-embedded whenever someone adds/edits an item with a photo via the
// normal item forms), then fills any remaining slots with zero-shot text
// matching for items that don't have a reference photo yet.
const findItemsByImageZeroShot = async (req, res, next) => {
	try {
		if (!req.file) {
			return res.status(400).json({
				error: "ImageRequired",
				message: "Please upload an image file with field name 'image'.",
			});
		}

		const allItems = await Item.find({}).populate("category", "name").lean();
		if (!allItems.length) {
			return res.status(400).json({
				error: "NoItems",
				message: "No inventory items exist yet to match against.",
			});
		}

		// 1) Try real reference-photo matches first (Qdrant, image-to-image).
		// Image-to-image cosine similarity runs on a much higher scale than
		// text-to-image, so a much higher bar is used here. This threshold is
		// a starting point based on limited testing -- re-check it once more
		// real item photos exist and can be tested against.
		const REAL_PHOTO_THRESHOLD = 0.75;
		let confidentPhotoMatches = [];
		try {
			const qdrantResponse = await searchByImage(req.file);
			confidentPhotoMatches = (qdrantResponse.results || [])
				.filter((r) => (r.score || 0) >= REAL_PHOTO_THRESHOLD)
				.map((r) => ({
					name: r.name,
					score: r.score,
					productId: r.productId,
					matchType: "photo",
				}));
		} catch (err) {
			console.warn("⚠️  Real-photo (Qdrant) search failed, continuing with zero-shot only:", err.message);
		}

		// 2) Fill remaining slots with zero-shot text matches for items that
		// don't already have a confident real-photo match.
		const matchedProductIds = new Set(confidentPhotoMatches.map((r) => String(r.productId)));
		const remainingItems = allItems.filter((i) => !matchedProductIds.has(String(i._id)));

		let confidentZeroShot = [];
		if (remainingItems.length > 0) {
			const itemsForMatching = remainingItems.map((item) => ({
				name: item.name,
				category: item.category?.name || "",
			}));

			const CONFIDENCE_THRESHOLD = 0.24;
			const mlResponse = await searchByImageZeroShot(req.file, itemsForMatching);
			confidentZeroShot = (mlResponse.results || [])
				.filter((r) => r.score >= CONFIDENCE_THRESHOLD)
				.map((r) => ({ ...r, matchType: "text" }));
		}

		// 3) Combine: real photo matches first, then zero-shot, capped at 5
		const combined = [...confidentPhotoMatches, ...confidentZeroShot].slice(0, 5);

		// 4) Attach full live item data for the response
		const results = combined.map((r) => {
			const fullItem = allItems.find(
				(i) => String(i._id) === String(r.productId) || i.name === r.name
			);
			return {
				name: r.name,
				score: r.score,
				matchType: r.matchType,
				productId: fullItem?._id || r.productId || null,
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
 