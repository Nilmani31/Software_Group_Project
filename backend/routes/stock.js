const express = require('express');
const router = express.Router();
const Stock = require('../models/stock');

// GET all stock
router.get('/', async (req, res) => {
  try {
    const stock = await Stock.find()
      .populate('itemId', 'name sku')
      .populate('branchId', 'branchName');
    res.json(stock);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET stock by id
router.get('/:id', async (req, res) => {
  try {
    const stock = await Stock.findById(req.params.id)
      .populate('itemId', 'name sku')
      .populate('branchId', 'branchName');
    if (!stock) return res.status(404).json({ error: 'Stock not found' });
    res.json(stock);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE stock quantity
router.put('/:id', async (req, res) => {
  try {
    const { quantity } = req.body;
    
    if (quantity === undefined || quantity === null) {
      return res.status(400).json({ error: 'Quantity is required' });
    }
    
    const stock = await Stock.findByIdAndUpdate(
      req.params.id,
      { quantity: parseInt(quantity) || 0 },
      { new: true }
    )
      .populate('itemId', 'name sku')
      .populate('branchId', 'branchName');
    
    if (!stock) return res.status(404).json({ error: 'Stock not found' });
    
    console.log('✅ Stock updated:', { _id: stock._id, quantity: stock.quantity, itemId: stock.itemId?.name });
    res.json(stock);
  } catch (err) {
    console.error('❌ Error updating stock:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// DELETE stock
router.delete('/:id', async (req, res) => {
  try {
    const stock = await Stock.findByIdAndDelete(req.params.id);
    if (!stock) return res.status(404).json({ error: 'Stock not found' });
    res.json({ message: 'Stock deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
