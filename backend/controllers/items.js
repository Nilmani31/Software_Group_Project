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
    
    // For each item, fetch total stock quantity and calculate status
    const itemsWithStatus = await Promise.all(items.map(async (item) => {
      const itemObj = item.toObject();
      
      // Get total quantity from Stock collection
      const stockRecords = await Stock.find({ itemId: item._id });
      const totalQuantity = stockRecords.reduce((sum, stock) => sum + (stock.quantity || 0), 0);
      
      // Convert category object to just the name string
      if (itemObj.category && typeof itemObj.category === 'object') {
        itemObj.categoryName = itemObj.category.name;
        itemObj.category = itemObj.category.name;
      }
      // Ensure branch is a string
      if (itemObj.branch && typeof itemObj.branch === 'object') {
        itemObj.branch = itemObj.branch.branchName || itemObj.branch.name || String(itemObj.branch._id);
      }
      
      // Set quantity from database
      itemObj.quantity = totalQuantity;
      itemObj.minStock = itemObj.minStock || 0;
      
      // Calculate status based on actual quantity vs minStock
      if (totalQuantity === 0) {
        itemObj.status = 'out';
      } else if (totalQuantity > 0 && totalQuantity < itemObj.minStock) {
        itemObj.status = 'low';
      } else {
        itemObj.status = 'normal';
      }
      
      itemObj.unit = itemObj.unit || 'kg';
      return itemObj;
    }));
    
    console.log('📊 Fetching all items, total items:', itemsWithStatus.length);
    res.json(itemsWithStatus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get low stock items (quantity <= minStock)
exports.getLowStockItems = async (req, res) => {
  try {
    const items = await Item.find()
      .populate('category', 'name')
      .select('-__v');
    
    // For each item, fetch total stock quantity and calculate status
    const itemsWithStatus = await Promise.all(items.map(async (item) => {
      const itemObj = item.toObject();
      
      // Get total quantity from Stock collection
      const stockRecords = await Stock.find({ itemId: item._id });
      const totalQuantity = stockRecords.reduce((sum, stock) => sum + (stock.quantity || 0), 0);
      
      // Convert category object to just the name string
      if (itemObj.category && typeof itemObj.category === 'object') {
        itemObj.categoryName = itemObj.category.name;
        itemObj.category = itemObj.category.name;
      }
      // Ensure branch is a string
      if (itemObj.branch && typeof itemObj.branch === 'object') {
        itemObj.branch = itemObj.branch.branchName || itemObj.branch.name || String(itemObj.branch._id);
      }
      
      // Set quantity from database
      itemObj.quantity = totalQuantity;
      itemObj.minStock = itemObj.minStock || 0;
      
      // Calculate status based on actual quantity vs minStock
      if (totalQuantity === 0) {
        itemObj.status = 'out';
      } else if (totalQuantity > 0 && totalQuantity < itemObj.minStock) {
        itemObj.status = 'low';
      } else {
        itemObj.status = 'normal';
      }
      
      itemObj.unit = itemObj.unit || 'kg';
      return itemObj;
    }));
    
    // Filter for low stock or out of stock items
    const lowStockItems = itemsWithStatus.filter(item => 
      item.status === 'low' || item.status === 'out'
    );
    
    res.json(lowStockItems);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create a new item
exports.createItem = async (req, res) => {
  try {
    const { itemId, sku, image, ...itemData } = req.body;
    
    console.log('📝 Creating item with data:', { sku, itemId, hasImage: !!image, imageLength: image?.length || 0 });
    
    // Limit image size to 5MB (base64 encoded)
    if (image && image.length > 5242880) {
      return res.status(400).json({ error: 'Image too large. Maximum size is 5MB.' });
    }
    
    // If SKU is provided, use it. Otherwise let itemId auto-generate
    const itemPayload = {
      ...itemData,
      ...(sku && { sku }),
      ...(itemId && { itemId }),
      ...(image && image.length <= 5242880 ? { image } : { image: '' })
    };
    
    const item = new Item(itemPayload);
    await item.save();
    
    console.log('✅ Item saved:', { _id: item._id, sku: item.sku, itemId: item.itemId, name: item.name, hasImage: !!item.image });
    
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
    const updateData = { ...req.body };
    
    // Handle image if provided
    if (req.body.image) {
      // Limit image size to 5MB (base64 encoded)
      if (req.body.image.length > 5242880) {
        return res.status(400).json({ error: 'Image too large. Maximum size is 5MB.' });
      }
      updateData.image = req.body.image;
    }
    
    const item = await Item.findByIdAndUpdate(req.params.id, updateData, { new: true })
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
    
    console.log('✅ Item updated:', { _id: itemObj._id, name: itemObj.name, hasImage: !!itemObj.image });
    
    res.json(itemObj);
  } catch (err) {
    console.error('❌ Error updating item:', err.message);
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

// Get stock data for an item (branch-wise quantities)
exports.getItemStock = async (req, res) => {
  try {
    const itemId = req.params.itemId;
    const stockRecords = await Stock.find({ itemId })
      .populate('branchId', 'branchName branch_name name')
      .select('quantity branchId');
    
    // Format response to include branch names
    const formattedStock = stockRecords.map(stock => ({
      _id: stock._id,
      branchId: stock.branchId._id,
      branchName: stock.branchId.branchName || stock.branchId.branch_name || stock.branchId.name,
      branch: {
        branchName: stock.branchId.branchName,
        branch_name: stock.branchId.branch_name,
        name: stock.branchId.name
      },
      quantity: stock.quantity || 0
    }));
    
    res.json(formattedStock);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

