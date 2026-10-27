const express = require('express');
const router = express.Router();
const grnController = require('../controllers/goodsReceived');

// Get all GRNs with pagination
router.get('/', grnController.getAllGRNs);

// Get GRN summary report
router.get('/summary/report', grnController.getGRNSummary);

// Search GRNs
router.get('/search', grnController.searchGRNs);

// Get GRNs by PO number
router.get('/po/:poNumber', grnController.getGRNsByPONumber);

// Get single GRN by ID
router.get('/:id', grnController.getGRNById);

// Create new GRN
router.post('/', grnController.createGRN);

// Update GRN
router.put('/:id', grnController.updateGRN);

// Delete GRN
router.delete('/:id', grnController.deleteGRN);

module.exports = router;
