const express = require('express');
const router = express.Router();
const itemsController = require('../controllers/items');

// More specific routes first
// GET stock data for a specific item
router.get('/stock/:itemId', itemsController.getItemStock);

// GET stock by branches for a specific item
router.get('/:id/stock-by-branches', itemsController.getItemStockByBranches);

// GET low stock items
router.get('/low-stock', itemsController.getLowStockItems);

// GET all items
router.get('/', itemsController.getAllItems);

// POST create item
router.post('/', itemsController.createItem);

// POST add price tier
router.post('/:id/price-tier', itemsController.addPriceTier);

// PUT update item
router.put('/:id', itemsController.updateItem);

// DELETE item
router.delete('/:id', itemsController.deleteItem);

module.exports = router;
