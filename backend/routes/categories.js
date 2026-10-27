const express = require('express');
const router = express.Router();
const Category = require('../models/categories');
const Item = require('../models/items');

// GET all categories
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find().select('-__v');
    const itemCounts = await Item.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    const countMap = itemCounts.reduce((map, entry) => {
      map[String(entry._id)] = entry.count;
      return map;
    }, {});

    res.json(categories.map(category => {
      const categoryObj = category.toObject();
      return {
        ...categoryObj,
        itemCount: countMap[String(category._id)] || 0,
      };
    }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create category
router.post('/', async (req, res) => {
  try {
    const category = new Category(req.body);
    await category.save();
    res.status(201).json(category);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT update category
router.put('/:id', async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json(category);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE category
router.delete('/:id', async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
