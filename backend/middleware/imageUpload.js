const multer = require("multer");

const maxFileSizeMb = parseInt(process.env.IMAGE_UPLOAD_MAX_MB || "5", 10);

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
	const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
	if (!allowedTypes.includes(file.mimetype)) {
		return cb(new Error("Only JPEG, PNG, or WEBP images are allowed."));
	}
	return cb(null, true);
};

const upload = multer({
	storage,
	fileFilter,
	limits: {
		fileSize: maxFileSizeMb * 1024 * 1024,
	},
});

module.exports = {
	uploadImage: upload.single("image"),
};
