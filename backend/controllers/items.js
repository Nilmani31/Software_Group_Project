const Item = require('../models/items');
const Category = require('../models/categories');
const ItemUnit = require('../models/itemUnits');
const Branch = require('../models/branches');
const Stock = require('../models/stock');

// Get all inventory items with populated fields
exports.getAllItems = async (req, res) => {
  try {
    const items = await Item.find()
      .populate('category', 'name')
      .select('-__v');
    // Transform to include category name as string for frontend
    const itemsWithCategoryNames = items.map(item => {
      const itemObj = item.toObject();
      // Convert category object to just the name string
      if (itemObj.category && typeof itemObj.category === 'object') {
        itemObj.categoryName = itemObj.category.name;
        itemObj.category = itemObj.category.name;
      }
      // Ensure branch is a string
      if (itemObj.branch && typeof itemObj.branch === 'object') {
        itemObj.branch = itemObj.branch.branchName || itemObj.branch.name || String(itemObj.branch._id);
      }
      // Ensure these are proper values
      itemObj.quantity = itemObj.quantity || 0;
      itemObj.status = itemObj.status || 'normal';
      itemObj.unit = itemObj.unit || 'kg';
      return itemObj;
    });
    console.log('📊 Fetching all items, first item:', itemsWithCategoryNames[0]?.sku ? 'HAS SKU' : 'NO SKU', itemsWithCategoryNames[0]?.name);
    res.json(itemsWithCategoryNames);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get low stock items (quantity <= minStock)
exports.getLowStockItems = async (req, res) => {
  try {
    const items = await Item.find({
      $expr: {
        $lte: ['$quantity', '$minStock']
      }
    })
      .populate('category', 'name')
      .select('-__v');
    
    // Transform to include category name as string for frontend
    const itemsWithCategoryNames = items.map(item => {
      const itemObj = item.toObject();
      // Convert category object to just the name string
      if (itemObj.category && typeof itemObj.category === 'object') {
        itemObj.categoryName = itemObj.category.name;
        itemObj.category = itemObj.category.name;
      }
      // Ensure branch is a string
      if (itemObj.branch && typeof itemObj.branch === 'object') {
        itemObj.branch = itemObj.branch.branchName || itemObj.branch.name || String(itemObj.branch._id);
      }
      // Ensure these are proper values
      itemObj.quantity = itemObj.quantity || 0;
      itemObj.status = itemObj.status || 'normal';
      itemObj.unit = itemObj.unit || 'kg';
      return itemObj;
    });
    
    res.json(itemsWithCategoryNames);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create a new item
exports.createItem = async (req, res) => {
  try {
    const { itemId, sku, ...itemData } = req.body;
    
    console.log('📝 Creating item with data:', { sku, itemId, ...itemData });
    
    // If SKU is provided, use it. Otherwise let itemId auto-generate
    const itemPayload = {
      ...itemData,
      ...(sku && { sku }),
      ...(itemId && { itemId })
    };
    
    const item = new Item(itemPayload);
    await item.save();
    
    console.log('✅ Item saved:', { _id: item._id, sku: item.sku, itemId: item.itemId, name: item.name });
    
    // Populate and transform for consistent response
    await item.populate('category', 'name');
    const itemObj = item.toObject();
    if (itemObj.category && typeof itemObj.category === 'object') {
      itemObj.categoryName = itemObj.category.name;
      itemObj.category = itemObj.category.name;
    }
    if (itemObj.branch && typeof itemObj.branch === 'object') {
      itemObj.branch = itemObj.branch.branchName || itemObj.branch.branch_name || itemObj.branch.name || String(itemObj.branch._id);
    }
    
    console.log('📤 Sending response:', { _id: itemObj._id, sku: itemObj.sku, itemId: itemObj.itemId });
    
    res.status(201).json(itemObj);
  } catch (err) {
    console.error('❌ Error creating item:', err.message);
    res.status(400).json({ error: err.message });
  }
};

// Update an item
exports.updateItem = async (req, res) => {
  try {
    const item = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('category', 'name');
    if (!item) return res.status(404).json({ error: 'Item not found' });
    
    // Transform to ensure consistent format
    const itemObj = item.toObject();
    if (itemObj.category && typeof itemObj.category === 'object') {
      itemObj.categoryName = itemObj.category.name;
      itemObj.category = itemObj.category.name;
    }
    if (itemObj.branch && typeof itemObj.branch === 'object') {
      itemObj.branch = itemObj.branch.branchName || itemObj.branch.branch_name || itemObj.branch.name || String(itemObj.branch._id);
    }
    
    res.json(itemObj);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete an item
exports.deleteItem = async (req, res) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get stock availability for an item across all branches
exports.getItemStockByBranches = async (req, res) => {
  try {
    const itemId = req.params.id;

    // Fetch all branches so we can return zero stock rows as well
    const branches = await Branch.find().lean();
    console.log('[getItemStockByBranches] branches found:', branches.length);

    // Fetch stock records for this item (if any)
    const stockData = await Stock.find({ itemId }).lean();
    console.log('[getItemStockByBranches] stock records found:', stockData.length, 'for item', itemId);

    const quantityByBranchId = new Map();
    stockData.forEach(stock => {
      // Support both ObjectId and string forms
      const branchKey = String(stock.branchId);
      const currentQty = quantityByBranchId.get(branchKey) || 0;
      quantityByBranchId.set(branchKey, currentQty + (stock.quantity || 0));
    });

    const response = branches.map(branch => {
      const branchKey = String(branch._id);
      return {
        branchId: branch._id,
        branchName: branch.branchName || branch.branch_name || branch.name || 'Unknown',
        location: branch.location || branch.city || '',
        quantity: quantityByBranchId.get(branchKey) || 0
      };
    });

    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};