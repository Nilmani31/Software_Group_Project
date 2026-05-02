const express = require("express");
const { uploadImage } = require("../middleware/imageUpload");
const { findItemsByImage, testImageSearch } = require("../controllers/imageSearchController");

const router = express.Router();

router.post("/search", uploadImage, findItemsByImage);

// TEST ENDPOINT: Returns mock data to test if frontend receives responses
router.post("/test", uploadImage, testImageSearch);

module.exports = router;
