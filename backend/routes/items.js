const express = require('express');
const router = express.Router();
const itemsController = require('../controllers/items');

// GET all items
router.get('/', itemsController.getAllItems);

<<<<<<< Updated upstream
// GET low stock items
router.get('/low-stock', itemsController.getLowStockItems);

// GET stock by branches for a specific item
router.get('/:id/stock-by-branches', itemsController.getItemStockByBranches);
=======
// GET stock data for a specific item
router.get('/stock/:itemId', itemsController.getItemStock);
>>>>>>> Stashed changes

// POST create item
router.post('/', itemsController.createItem);

// PUT update item
router.put('/:id', itemsController.updateItem);

// DELETE item
router.delete('/:id', itemsController.deleteItem);

module.exports = router;
