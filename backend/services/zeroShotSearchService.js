const axios = require("axios");
const FormData = require("form-data");

/**
 * Sends a photo + the current list of {name, category} items to the ML
 * service's zero-shot endpoint. No reference photos or Qdrant lookup
 * involved -- the ML service compares the photo directly against each
 * item's name and category as text.
 */
const searchByImageZeroShot = async (file, items) => {
	const mlServiceUrl = process.env.ML_SERVICE_URL;

	if (!mlServiceUrl) {
		throw new Error("ML service URL is not configured.");
	}

	const formData = new FormData();
	formData.append("image", file.buffer, {
		filename: file.originalname || "image.jpg",
		contentType: file.mimetype,
	});
	formData.append("items", JSON.stringify(items));

	const response = await axios.post(
		`${mlServiceUrl}/zero-shot-search`,
		formData,
		{
			headers: {
				...formData.getHeaders(),
			},
			timeout: 60000,
			maxContentLength: Infinity,
			maxBodyLength: Infinity,
		}
	);

	return response.data;
};

module.exports = {
	searchByImageZeroShot,
};