const axios = require("axios");
const FormData = require("form-data");

/**
 * Talks to the ML service to keep Qdrant in sync with the real photos
 * saved on inventory items.
 *
 *  - addReferenceImage: embed an item's photo and store/replace it in Qdrant
 *  - deleteReferenceImage: remove an item's photo embedding
 *
 * Callers (items controller) treat failures as non-fatal: an item must
 * still save even if the ML service is down.
 */

const getMlBaseUrl = () => {
	const url = process.env.ML_SERVICE_URL;
	if (!url) {
		throw new Error("ML service URL is not configured.");
	}
	return url.replace(/\/+$/, "");
};

/**
 * @param {{buffer: Buffer, originalname?: string, mimetype?: string}} file
 * @param {{productId: string, name: string, category?: string, sku?: string}} meta
 */
const addReferenceImage = async (file, meta) => {
	if (!file || !file.buffer || !file.buffer.length) {
		throw new Error("No image data to embed.");
	}
	if (!meta || !meta.productId || !meta.name) {
		throw new Error("productId and name are required to store a reference image.");
	}

	const formData = new FormData();
	formData.append("image", file.buffer, {
		filename: file.originalname || "image.jpg",
		contentType: file.mimetype || "image/jpeg",
	});
	formData.append("productId", String(meta.productId));
	formData.append("name", meta.name);
	formData.append("category", meta.category || "");
	formData.append("sku", meta.sku || "");

	const response = await axios.post(`${getMlBaseUrl()}/add-reference`, formData, {
		headers: { ...formData.getHeaders() },
		timeout: 60000,
		maxContentLength: Infinity,
		maxBodyLength: Infinity,
	});

	return response.data;
};

const deleteReferenceImage = async (productId) => {
	if (!productId) return null;

	const response = await axios.delete(
		`${getMlBaseUrl()}/reference/${encodeURIComponent(String(productId))}`,
		{ timeout: 15000 }
	);

	return response.data;
};

module.exports = {
	addReferenceImage,
	deleteReferenceImage,
};