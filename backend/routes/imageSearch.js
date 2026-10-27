const express = require("express");
const { uploadImage } = require("../middleware/imageUpload");
const { findItemsByImage, findItemsByImageZeroShot } = require("../controllers/imageSearchController");

const router = express.Router();

router.post("/search", uploadImage, findItemsByImage);
router.post("/zero-shot", uploadImage, findItemsByImageZeroShot);

module.exports = router;
