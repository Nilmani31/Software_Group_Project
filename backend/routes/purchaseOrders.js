const express = require('express');
const router = express.Router();
const purchaseOrdersController = require('../controllers/purchaseOrders');

// Get all purchase orders
router.get('/', purchaseOrdersController.getAllPOs);

// Create new purchase order
router.post('/', purchaseOrdersController.createPO);

// Search purchase orders (must be before /:id)
router.get('/search', purchaseOrdersController.searchPOs);

// Get purchase orders by status (must be before /:id)
router.get('/status/:status', purchaseOrdersController.getPOsByStatus);

// Get purchase orders by branch (must be before /:id)
router.get('/branch/:branch', purchaseOrdersController.getPOsByBranch);

// Get purchase order by ID (must be last among GET routes)
router.get('/:id', purchaseOrdersController.getPOById);

// Update purchase order
router.put('/:poNumber', purchaseOrdersController.updatePO);

// Cancel purchase order
router.patch('/:poNumber/cancel', purchaseOrdersController.cancelPO);

module.exports = router;
