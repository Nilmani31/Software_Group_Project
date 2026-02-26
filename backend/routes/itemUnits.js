const express = require('express');
const router = express.Router();
const itemUnitsController = require('../controllers/itemUnits');

// Get all price options for an item
router.get('/item/:itemId/prices', itemUnitsController.getItemPriceOptions);

// Get all items with price ranges
router.get('/price-ranges', itemUnitsController.getItemsWithPriceRange);

// Get all items with complete stock info
router.get('/all-with-stock', itemUnitsController.getAllItemsWithCompleteStock);

// Get all units for an item with stock info
router.get('/item/:itemId/units', itemUnitsController.getItemUnitsWithStock);

// Get stock matrix for an item (compact view)
router.get('/item/:itemId/matrix', itemUnitsController.getStockMatrix);

// Get item stock across all branches for all units
router.get('/item/:itemId/all-branches', itemUnitsController.getItemStockAllBranches);

// Get stock for specific unit in specific branch
router.get('/:itemUnitId/branch/:branchId', itemUnitsController.getUnitStockByBranch);

// Get stock for all units of an item in a branch
router.get('/:itemId/branch/:branchId/stock', itemUnitsController.getItemStockByBranch);

// Add new unit price for an item
router.post('/', itemUnitsController.addItemUnit);

// Update unit price
router.put('/:unitId', itemUnitsController.updateItemUnit);

module.exports = router;
