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

// GET stock by item name (for chat assistant)
router.get('/search/byname', async (req, res) => {
  try {
    const { itemName, branchId } = req.query;
    
    if (!itemName) {
      return res.status(400).json({ error: 'Item name is required' });
    }

    const Item = require('../models/items');
    
    // Search for items by name (case-insensitive)
    const items = await Item.find({ 
      name: { $regex: itemName, $options: 'i' } 
    });

    if (!items || items.length === 0) {
      return res.json({ 
        found: false, 
        message: `No items found matching "${itemName}"` 
      });
    }

    // Get stock info for each found item
    const stockInfo = [];
    for (const item of items) {
      let query = { itemId: item._id };
      if (branchId) {
        query.branchId = branchId;
      }
      
      const stocks = await Stock.find(query)
        .populate('branchId', 'branchName')
        .populate('itemUnitId', 'unitName');

      stockInfo.push({
        itemId: item._id,
        itemName: item.name,
        sku: item.sku,
        description: item.description,
        stocks: stocks.map(s => ({
          branchId: s.branchId?._id,
          branchName: s.branchId?.branchName || 'Unknown Branch',
          quantity: s.quantity,
          minStock: s.minStock,
          maxStock: s.maxStock,
          status: s.status,
          unitName: s.itemUnitId?.unitName || 'Unit'
        }))
      });
    }

    res.json({
      found: true,
      results: stockInfo
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
