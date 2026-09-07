const express = require("express");
const { uploadImage } = require("../middleware/imageUpload");
const { findItemsByImage } = require("../controllers/imageSearchController");

const router = express.Router();

router.post("/search", uploadImage, findItemsByImage);

module.exports = router;
