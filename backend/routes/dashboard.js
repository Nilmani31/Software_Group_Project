const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard');

// Get dashboard statistics
router.get('/stats', dashboardController.getDashboardStats);

module.exports = router;
