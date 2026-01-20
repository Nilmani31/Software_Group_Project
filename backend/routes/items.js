const express = require('express');
const router = express.Router();
const itemsController = require('../controllers/items');

// GET all items
router.get('/', itemsController.getAllItems);

// POST create item
router.post('/', itemsController.createItem);

// PUT update item
router.put('/:id', itemsController.updateItem);

// DELETE item
router.delete('/:id', itemsController.deleteItem);

module.exports = router;
