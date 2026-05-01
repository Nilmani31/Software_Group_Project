const Item = require('../models/items');
const Category = require('../models/categories');
const ItemUnit = require('../models/itemUnits');
const Branch = require('../models/branches');
const Stock = require('../models/stock');
const GoodsReceived = require('../models/goodsReceived');

// Get all inventory items with populated fields
exports.getAllItems = async (req, res) => {
  try {
    const items = await Item.find()
      .populate('category', 'name')
      .select('-__v');
      
    // Fetch GRN history to determine which items/units have been received
    const grns = await GoodsReceived.find({}, 'items.itemId items.unitPrice');
    const receivedItemIds = new Set();
    const receivedUnits = new Set();
    
    grns.forEach(grn => {
      if (grn.items && grn.items.length > 0) {
        grn.items.forEach(gItem => {
          if (gItem.itemId) {
            receivedItemIds.add(gItem.itemId.toString());
            receivedUnits.add(`${gItem.itemId.toString()}_${gItem.unitPrice || 0}`);
          }
        });
      }
    });
    
    // For each item, fetch total stock quantity and calculate status
    const itemsWithStatus = await Promise.all(items.map(async (item) => {
      const itemObj = item.toObject();
      
      // Get stock records with branch information
      const stockRecords = await Stock.find({ itemId: item._id })
        .populate('branchId', 'name branchName _id');
      const totalQuantity = stockRecords.reduce((sum, stock) => sum + (stock.quantity || 0), 0);
      
      // Find ALL ItemUnits for this item
      const itemUnits = await ItemUnit.find({ itemId: item._id });
      
      // Convert category object to just the name string
      if (itemObj.category && typeof itemObj.category === 'object') {
        itemObj.categoryName = itemObj.category.name;
        itemObj.category = itemObj.category.name;
      }
      // Ensure branch is a string
      if (itemObj.branch && typeof itemObj.branch === 'object') {
        itemObj.branch = itemObj.branch.branchName || itemObj.branch.name || String(itemObj.branch._id);
      }
      
      if (itemUnits && itemUnits.length > 0) {
        return itemUnits.map(unit => {
          // Calculate stock specifically for this unit
          const unitStockRecords = stockRecords.filter(s => String(s.itemUnitId) === String(unit._id));
          const unitTotalQuantity = unitStockRecords.reduce((sum, stock) => sum + (stock.quantity || 0), 0);
          
          let unitStatus = 'normal';
          if (unitTotalQuantity === 0) {
            unitStatus = 'out';
          } else if (unitTotalQuantity > 0 && unitTotalQuantity < itemObj.minStock) {
            unitStatus = 'low';
          }
          
          // Build the unit display using unitValue and unit
          let displayUnit = unit.unit || itemObj.unit || 'kg';
          if (unit.unitValue !== undefined && unit.unitValue !== null) {
            displayUnit = `${unit.unitValue}${displayUnit}`;
          }

          return {
            ...itemObj,
            uniqueId: `${item._id}_${unit._id}`,
            name: itemObj.name,
            unitPrice: unit.unitPrice || 0,
            unit: displayUnit,
            itemUnitId: unit._id,
            quantity: unitTotalQuantity,
            status: unitStatus
          };
        });
      } else {
        let fallbackStatus = 'normal';
        if (totalQuantity === 0) {
          fallbackStatus = 'out';
        } else if (totalQuantity > 0 && totalQuantity < itemObj.minStock) {
          fallbackStatus = 'low';
        }
        itemObj.uniqueId = item._id.toString();
        itemObj.unitPrice = 0;
        itemObj.unit = itemObj.unit || 'kg';
        itemObj.quantity = totalQuantity;
        itemObj.status = fallbackStatus;
        return [itemObj];
      }
    }));
    
    // Flatten and filter: only show items that have stock OR have been received via GRN
    let flattenedItems = itemsWithStatus.flat();
    flattenedItems = flattenedItems.filter(item => {
      // Always show if it has stock
      if (item.quantity > 0) return true;
      // If out of stock, only show if it was part of a GRN history
      if (item.itemUnitId && item.unitPrice !== undefined) {
         return receivedUnits.has(`${item._id.toString()}_${item.unitPrice}`);
      }
      return receivedItemIds.has(item._id.toString());
    });
    
    console.log('📊 Fetching all items, total items:', flattenedItems.length);
    res.json(flattenedItems);
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
      
      // Get unit price from ItemUnit
      const itemUnit = await ItemUnit.findOne({ itemId: item._id });
      itemObj.unitPrice = itemUnit ? itemUnit.unitPrice : 0;

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
    
    let finalSku = sku;
    
    // Auto-generate SKU if not provided or empty
    if (!finalSku) {
      try {
        // Get the category name
        const category = await Category.findById(itemData.category);
        if (category) {
          // Get first 3 letters of category name
          const initials = category.name
            .substring(0, 3)
            .toUpperCase();
          
          // Find all items with this category to get the next number
          const prefix = `SKU-${initials}-`;
          const existingItems = await Item.find({ sku: { $regex: `^${prefix}`, $options: 'i' } });
          
          // Find the highest number
          let maxNumber = 0;
          existingItems.forEach(item => {
            const numberStr = item.sku.replace(new RegExp(`^${prefix}`, 'i'), '');
            const number = parseInt(numberStr, 10);
            if (!isNaN(number) && number > maxNumber) {
              maxNumber = number;
            }
          });
          
          // Generate next number with padding (001, 002, etc.)
          const nextNumber = String(maxNumber + 1).padStart(3, '0');
          finalSku = `${prefix}${nextNumber}`;
        }
      } catch (err) {
        console.warn('⚠️ Could not auto-generate SKU:', err.message);
      }
    }
    
    // If SKU is provided, use it. Otherwise let itemId auto-generate
    const itemPayload = {
      ...itemData,
      ...(finalSku && { sku: finalSku }),
      ...(itemId && { itemId }),
      ...(image && image.length <= 5242880 ? { image } : { image: '' })
    };
    
    const item = new Item(itemPayload);
    await item.save();
    
    console.log('✅ Item saved:', { _id: item._id, sku: item.sku, itemId: item.itemId, name: item.name, hasImage: !!item.image });

    // AUTOMATICALLY CREATE ITEMUNITS AND STOCKS
    try {
      // Create default ItemUnit for the item
      const unitVal = req.body.unitAmount || req.body.unitValue || 1;
      const defaultUnit = new ItemUnit({
        name: `${item.name} - ${unitVal}${item.unit}`,
        itemId: item._id,
        unit: item.unit,
        unitValue: unitVal,
        unitsPerPack: 1,
        unitPrice: req.body.unitPrice || 100, // Use provided unitPrice or default
        description: `${item.name} in ${item.unit}`
      });
      await defaultUnit.save();
      console.log('✅ Default ItemUnit created:', defaultUnit._id);

      // Create stock records for each branch
      const branches = await Branch.find();
      console.log(`📍 Creating stock for ${branches.length} branches...`);

      for (const branch of branches) {
        const stock = new Stock({
          itemId: item._id,
          itemUnitId: defaultUnit._id,
          branchId: branch._id,
          quantity: itemData.quantity || 0,
          minStock: itemData.minStock || 0,
          maxStock: itemData.maxStock || 100,
          status: itemData.quantity > 0 ? 'in-stock' : 'out-of-stock'
        });
        await stock.save();
        console.log(`✅ Stock created for branch: ${branch.branchName}`);
      }

      console.log('✅ ItemUnits and Stocks automatically created');
    } catch (unitsError) {
      console.warn('⚠️  Warning: Could not auto-create ItemUnits/Stocks:', unitsError.message);
      // Don't fail the item creation if units fail
    }
    
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
    
    res.status(201).json({
      ...itemObj,
      message: 'Item created successfully with default unit and stock for all branches'
    });
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
    
    // AUTO-UPDATE STOCKS IF QUANTITY CHANGED
    if (req.body.quantity !== undefined || req.body.minStock !== undefined || req.body.maxStock !== undefined) {
      try {
        // Get all default itemUnits for this item
        const itemUnits = await ItemUnit.find({ itemId: item._id });
        
        for (const unit of itemUnits) {
          // Update quantity in all branch stocks for this unit
          await Stock.updateMany(
            { itemId: item._id, itemUnitId: unit._id },
            {
              ...(req.body.quantity !== undefined && { quantity: req.body.quantity }),
              ...(req.body.minStock !== undefined && { minStock: req.body.minStock }),
              ...(req.body.maxStock !== undefined && { maxStock: req.body.maxStock }),
              status: req.body.quantity > 0 ? 'in-stock' : 'out-of-stock'
            }
          );
        }
        console.log('✅ Stock records updated for item:', item.name);
      } catch (stockError) {
        console.warn('⚠️  Warning: Could not update stocks:', stockError.message);
        // Don't fail item update if stocks fail
      }
    }
    
    // UPDATE OR CREATE ITEMUNIT
    if (req.body.unitPrice !== undefined || req.body.unitAmount !== undefined || req.body.unit !== undefined || req.body.unitValue !== undefined) {
      try {
        let itemUnit = await ItemUnit.findOne({ itemId: item._id });
        const newUnitValue = req.body.unitAmount || req.body.unitValue || (itemUnit ? itemUnit.unitValue : 1);
        const newUnit = req.body.unit || item.unit;
        
        if (itemUnit) {
          if (req.body.unitPrice !== undefined) itemUnit.unitPrice = req.body.unitPrice;
          itemUnit.unitValue = newUnitValue;
          itemUnit.unit = newUnit;
          itemUnit.name = `${item.name} - ${newUnitValue}${newUnit}`;
          await itemUnit.save();
          console.log('✅ ItemUnit updated');
        } else {
          itemUnit = new ItemUnit({
            name: `${item.name} - ${newUnitValue}${newUnit}`,
            itemId: item._id,
            unit: newUnit,
            unitValue: newUnitValue,
            unitsPerPack: 1,
            unitPrice: req.body.unitPrice || 0,
            description: `${item.name} in ${newUnit}`
          });
          await itemUnit.save();
          console.log('✅ ItemUnit created');
        }
      } catch (unitError) {
        console.warn('⚠️  Warning: Could not update/create ItemUnit:', unitError.message);
      }
    }
    
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
    
    // AUTO-DELETE ITEMUNITS AND STOCKS
    try {
      // Delete all itemUnits for this item
      const deletedUnits = await ItemUnit.deleteMany({ itemId: item._id });
      console.log(`✅ Deleted ${deletedUnits.deletedCount} ItemUnits`);

      // Delete all stocks for this item
      const deletedStocks = await Stock.deleteMany({ itemId: item._id });
      console.log(`✅ Deleted ${deletedStocks.deletedCount} Stock records`);
    } catch (error) {
      console.warn('⚠️  Warning: Could not delete related units/stocks:', error.message);
    }
    
    res.json({ message: 'Item and related itemUnits/stocks deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};



// Get stock availability for an item across all branches
exports.getItemStockByBranches = async (req, res) => {
  try {
    const itemId = req.params.id;

    // Get item details
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Fetch all branches
    const branches = await Branch.find().lean();
    console.log('[getItemStockByBranches] branches found:', branches.length);

    // Get all itemUnits for this item
    const itemUnits = await ItemUnit.find({ itemId }).lean();
    console.log('[getItemStockByBranches] itemUnits found:', itemUnits.length);

    // Fetch stock records for this item and all its units
    const stockData = await Stock.find({ itemId }).lean();
    console.log('[getItemStockByBranches] stock records found:', stockData.length, 'for item', itemId);

    // Create a map of branch to total quantity
    const quantityByBranchId = new Map();
    
    stockData.forEach(stock => {
      const branchKey = String(stock.branchId);
      const currentQty = quantityByBranchId.get(branchKey) || 0;
      quantityByBranchId.set(branchKey, currentQty + (stock.quantity || 0));
    });

    // Build response with item info and branch stock
    const response = {
      item: {
        _id: item._id,
        name: item.name,
        sku: item.sku,
        unit: item.unit,
        itemId: item.itemId,
        category: item.category
      },
      branchStocks: branches.map(branch => {
        const branchKey = String(branch._id);
        const totalQuantity = quantityByBranchId.get(branchKey) || 0;
        
        return {
          branchId: branch._id,
          branchName: branch.branchName || branch.branch_name || branch.name || 'Unknown',
          location: branch.location || branch.city || '',
          quantity: totalQuantity,
          status: totalQuantity > 0 ? 'in-stock' : 'out-of-stock'
        };
      }),
      itemUnitsCount: itemUnits.length
    };

    res.json(response);
  } catch (err) {
    console.error('Error in getItemStockByBranches:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get stock data for an item (branch-wise quantities with detailed info)
exports.getItemStock = async (req, res) => {
  try {
    const itemId = req.params.itemId;
    
    // Get item details
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Get all branches
    const branches = await Branch.find();

    // Get all itemUnits for this item
    const itemUnits = await ItemUnit.find({ itemId });

    // Get all stocks for this item
    const stockRecords = await Stock.find({ itemId }).populate('branchId', 'branchName branch_name name location city');
    
    // Create map of branch stocks
    const stockByBranch = {};
    
    branches.forEach(branch => {
      stockByBranch[String(branch._id)] = {
        branchId: branch._id,
        branchName: branch.branchName || branch.branch_name || branch.name,
        location: branch.location || branch.city,
        totalQuantity: 0,
        units: []
      };
    });

    // Populate with actual stock data
    stockRecords.forEach(stock => {
      const branchKey = String(stock.branchId._id);
      if (stockByBranch[branchKey]) {
        const unit = itemUnits.find(u => u._id.equals(stock.itemUnitId));
        
        stockByBranch[branchKey].units.push({
          unitId: stock.itemUnitId,
          unitName: unit ? unit.name : 'Unknown',
          quantity: stock.quantity,
          status: stock.status,
          minStock: stock.minStock,
          maxStock: stock.maxStock
        });
        
        stockByBranch[branchKey].totalQuantity += stock.quantity;
      }
    });

    // Format final response
    const formattedResponse = {
      item: {
        _id: item._id,
        name: item.name,
        sku: item.sku,
        unit: item.unit,
        itemId: item.itemId
      },
      branchInventory: Object.values(stockByBranch),
      summary: {
        totalUnits: itemUnits.length,
        totalBranches: branches.length,
        totalStockAcrossAllBranches: Object.values(stockByBranch).reduce((sum, b) => sum + b.totalQuantity, 0)
      }
    };
    
    res.json(formattedResponse);
  } catch (err) {
    console.error('Error in getItemStock:', err);
    res.status(500).json({ error: err.message });
  }
};

