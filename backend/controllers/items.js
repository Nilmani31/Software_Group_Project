const Item = require('../models/items');
const Category = require('../models/categories');
const ItemUnit = require('../models/itemUnits');
const Branch = require('../models/branches');
const Stock = require('../models/stock');
const GoodsReceived = require('../models/goodsReceived');
const { getBranchFilter } = require('../utils/branchFilter');

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
      const branchFilter = getBranchFilter(req);
      const stockRecords = await Stock.find({ itemId: item._id, ...branchFilter })
        .populate('branchId', 'branchId name branchName branchCode _id');
      const totalQuantity = stockRecords.reduce((sum, stock) => sum + (stock.quantity || 0), 0);
      const branchStocks = stockRecords.map(stock => ({
        stockId: stock._id,
        branchObjectId: stock.branchId?._id,
        branchId: stock.branchId?.branchId || stock.branchId?._id,
        branchName: stock.branchId?.branchName || stock.branchId?.name || 'Unknown Branch',
        branchCode: stock.branchId?.branchCode || '',
        quantity: stock.quantity || 0,
      }));
      
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
        // Group by physical unit signature to detect multiple prices for the same unit
        const unitSignatures = {};
        itemUnits.forEach(u => {
          const sig = `${u.unitValue}_${u.unit}`;
          unitSignatures[sig] = (unitSignatures[sig] || 0) + 1;
        });

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
          
          // Build the unit display using unitValue and unit (e.g. 1kg, 2kg, 1pcs)
          const rawUnit = (unit.unit || itemObj.unit || 'kg').replace(/^\d+/, '');
          const val = (unit.unitValue !== undefined && unit.unitValue !== null && unit.unitValue !== '') ? unit.unitValue : 1;
          const displayUnit = `${val}${rawUnit}`;

          // Differentiate name if there are multiple prices for the same physical unit
          let distinctName = itemObj.name;
          const sig = `${val}_${rawUnit}`;
          if (unitSignatures[sig] > 1) {
            distinctName = `${itemObj.name} (Rs${unit.unitPrice || 0})`;
          }

          return {
            ...itemObj,
            uniqueId: `${item._id}_${unit._id}`,
            name: distinctName,
            unitPrice: unit.unitPrice || 0,
            unit: rawUnit,
            baseUnit: rawUnit,
            unitValue: val,
            unitSize: displayUnit,
            itemUnitId: unit._id,
            quantity: unitTotalQuantity,
            status: unitStatus,
            branchStocks: unitStockRecords.map(stock => ({
              stockId: stock._id,
              branchObjectId: stock.branchId?._id,
              branchId: stock.branchId?.branchId || stock.branchId?._id,
              branchName: stock.branchId?.branchName || stock.branchId?.name || 'Unknown Branch',
              branchCode: stock.branchId?.branchCode || '',
              quantity: stock.quantity || 0,
            }))
          };
        });
      } else {
        let fallbackStatus = 'normal';
        if (totalQuantity === 0) {
          fallbackStatus = 'out';
        } else if (totalQuantity > 0 && totalQuantity < itemObj.minStock) {
          fallbackStatus = 'low';
        }
        const rawUnit = (itemObj.unit || 'kg').replace(/^\d+/, '');
        const val = (itemObj.unitValue !== undefined && itemObj.unitValue !== null && itemObj.unitValue !== '') ? itemObj.unitValue : 1;
        const displayUnit = `${val}${rawUnit}`;
        itemObj.uniqueId = item._id.toString();
        itemObj.unitPrice = 0;
        itemObj.unit = rawUnit;
        itemObj.baseUnit = rawUnit;
        itemObj.unitValue = val;
        itemObj.unitSize = displayUnit;
        itemObj.quantity = totalQuantity;
        itemObj.status = fallbackStatus;
        itemObj.branchStocks = branchStocks;
        return [itemObj];
      }
    }));
    
    const flattenedItems = itemsWithStatus.flat();
    
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
    const branchFilter = getBranchFilter(req);
    
    // For each item, calculate stock status from Stock records, not cached item fields.
    const itemsWithStatus = await Promise.all(items.map(async (item) => {
      const itemObj = item.toObject();

      const stockRecords = await Stock.find({ itemId: item._id, ...branchFilter })
        .populate('branchId', 'branchId branchName branchCode location city');
      const totalQuantity = stockRecords.reduce((sum, stock) => sum + (stock.quantity || 0), 0);

      const itemUnit = await ItemUnit.findOne({ itemId: item._id });
      itemObj.unitPrice = itemUnit ? itemUnit.unitPrice : 0;

      if (itemObj.category && typeof itemObj.category === 'object') {
        itemObj.categoryName = itemObj.category.name;
        itemObj.category = itemObj.category.name;
      }

      const minStock = itemObj.minStock || 0;
      const shortage = Math.max(0, minStock - totalQuantity);
      let status = 'normal';
      if (totalQuantity === 0) {
        status = 'out';
      } else if (totalQuantity < minStock) {
        status = 'low';
      }

      const branchStocks = stockRecords.map(stock => {
        const branch = stock.branchId;
        const quantity = stock.quantity || 0;
        return {
          stockId: stock._id,
          branchObjectId: branch?._id,
          branchId: branch?.branchId || branch?._id,
          branchName: branch?.branchName || 'Unknown Branch',
          branchCode: branch?.branchCode || '',
          location: branch?.location || branch?.city || '',
          quantity,
          status: quantity === 0 ? 'out' : quantity < minStock ? 'low' : 'normal',
        };
      });

      itemObj.quantity = totalQuantity;
      itemObj.currentStock = totalQuantity;
      itemObj.minStock = minStock;
      itemObj.shortage = shortage;
      itemObj.status = status;
      itemObj.unit = itemObj.unit || 'kg';
      itemObj.branchStocks = branchStocks;
      itemObj.availableBranches = branchStocks.filter(branch => branch.quantity > 0);

      return itemObj;
    }));
    
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
    const { itemId, sku, image, name, ...itemData } = req.body;
    const initialStockQuantity = 0;
    
    console.log('📝 Creating item with data:', { sku, itemId, name, hasImage: !!image, imageLength: image?.length || 0 });
    
    // Limit image size to 5MB (base64 encoded)
    if (image && image.length > 5242880) {
      return res.status(400).json({ error: 'Image too large. Maximum size is 5MB.' });
    }

    // Check if an item with this exact name already exists
    const escapedName = name ? name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
    let item = escapedName ? await Item.findOne({ name: new RegExp(`^${escapedName}$`, 'i') }) : null;
    let isNewItem = false;

    if (!item) {
      isNewItem = true;
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
            existingItems.forEach(existingItem => {
              const numberStr = existingItem.sku.replace(new RegExp(`^${prefix}`, 'i'), '');
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
        name,
        quantity: initialStockQuantity,
        status: 'out',
        ...(finalSku && { sku: finalSku }),
        ...(itemId && { itemId }),
        ...(image && image.length <= 5242880 ? { image } : { image: '' })
      };
      
      item = new Item(itemPayload);
      await item.save();
      console.log('✅ Item saved:', { _id: item._id, sku: item.sku, itemId: item.itemId, name: item.name, hasImage: !!item.image });
    } else {
      console.log(`♻️ Found existing item '${name}', adding new unit variation instead of duplicating.`);
    }

    // AUTOMATICALLY CREATE ITEMUNITS AND STOCKS
    let defaultUnit;
    try {
      const unitVal = req.body.unitAmount || req.body.unitValue || 1;
      const parsedUnitName = req.body.unit || item.unit || 'kg';
      const providedPrice = req.body.unitPrice || 0;
      
      // Check if this EXACT ItemUnit already exists
      const existingUnit = await ItemUnit.findOne({
          itemId: item._id,
          unit: parsedUnitName,
          unitValue: unitVal,
          unitPrice: providedPrice
      });
      
      if (existingUnit) {
          if (!isNewItem) {
              return res.status(400).json({ error: `An item variation with this exact unit amount and price already exists.` });
          }
          defaultUnit = existingUnit;
      } else {
          defaultUnit = new ItemUnit({
            name: `${item.name} - ${unitVal}${parsedUnitName}`,
            itemId: item._id,
            unit: parsedUnitName,
            unitValue: unitVal,
            unitsPerPack: 1,
            unitPrice: providedPrice,
            description: `${item.name} in ${parsedUnitName}`
          });
          await defaultUnit.save();
          console.log('✅ ItemUnit created:', defaultUnit._id);

          // Create stock records for each branch
          const branches = await Branch.find();
          console.log(`📍 Creating stock for ${branches.length} branches...`);

          for (const branch of branches) {
            const stock = new Stock({
              itemId: item._id,
              itemUnitId: defaultUnit._id,
              branchId: branch._id,
              quantity: initialStockQuantity,
              minStock: itemData.minStock || 0,
              maxStock: itemData.maxStock || 100,
              status: 'out-of-stock'
            });
            await stock.save();
            console.log(`✅ Stock created for branch: ${branch.branchName}`);
          }
          console.log('✅ ItemUnits and Stocks automatically created');
      }
    } catch (unitsError) {
      console.warn('⚠️  Warning: Could not auto-create ItemUnits/Stocks:', unitsError.message);
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
    
    // AUTO-UPDATE STOCKS IF BRANCHSTOCKS PROVIDED OR QUANTITY CHANGED
    if (Array.isArray(req.body.branchStocks) && req.body.branchStocks.length > 0) {
      try {
        const itemUnits = await ItemUnit.find({ itemId: item._id });
        const defaultUnit = itemUnits[0] || await ItemUnit.findOne({ itemId: item._id });

        for (const bs of req.body.branchStocks) {
          const targetBranchId = bs.branchId || bs.branchObjectId || bs._id;
          if (targetBranchId) {
            const qty = Math.max(0, parseInt(bs.quantity) || 0);
            await Stock.findOneAndUpdate(
              { itemId: item._id, branchId: targetBranchId },
              {
                $set: {
                  quantity: qty,
                  status: qty === 0 ? 'out-of-stock' : (qty <= (item.minStock || 0) ? 'low' : 'in-stock'),
                  ...(defaultUnit && { itemUnitId: defaultUnit._id })
                }
              },
              { upsert: true, new: true, setDefaultsOnInsert: true }
            );
          }
        }
        console.log('✅ Branch stocks updated directly for item:', item.name);
      } catch (bsError) {
        console.warn('⚠️ Warning: Could not update branch stocks:', bsError.message);
      }
    } else if (req.body.quantity !== undefined || req.body.minStock !== undefined || req.body.maxStock !== undefined) {
      try {
        // Get all default itemUnits for this item
        const itemUnits = await ItemUnit.find({ itemId: item._id });
        
        for (const unit of itemUnits) {
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
      }
    }

    // Recalculate total item quantity and status across branches
    const allStocks = await Stock.find({ itemId: item._id });
    if (allStocks && allStocks.length > 0) {
      const totalStockQty = allStocks.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);
      item.quantity = totalStockQty;
      item.status = totalStockQty === 0 ? 'out' : (totalStockQty <= (item.minStock || 0) ? 'low' : 'normal');
      await item.save();
    }
    
    // UPDATE OR CREATE ITEMUNIT
    if (req.body.unitPrice !== undefined || req.body.unitAmount !== undefined || req.body.unit !== undefined || req.body.unitValue !== undefined) {
      try {
        let itemUnit = await ItemUnit.findOne({ itemId: item._id });
        const newUnitValue = req.body.unitAmount || req.body.unitValue || (itemUnit ? itemUnit.unitValue : 1);
        const newUnit = (req.body.unit || item.unit || 'kg').replace(/^\d+/, '');
        
        if (itemUnit) {
          if (req.body.unitPrice !== undefined) itemUnit.unitPrice = req.body.unitPrice;
          itemUnit.unitValue = newUnitValue;
          itemUnit.unit = newUnit;
          itemUnit.name = `${item.name} - ${newUnitValue > 1 ? newUnitValue : ''}${newUnit}`;
          await itemUnit.save();
          console.log('✅ ItemUnit updated');
        } else {
          itemUnit = new ItemUnit({
            name: `${item.name} - ${newUnitValue > 1 ? newUnitValue : ''}${newUnit}`,
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
    const itemUnitId = req.query.itemUnitId;
    
    // Get item details
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Get all branches
    const branches = await Branch.find();

    // Get all itemUnits for this item
    const itemUnits = await ItemUnit.find({ itemId });

    // Get all stocks for this item across all price tiers and branches
    const stockRecords = await Stock.find({ itemId }).populate('branchId', 'branchName branch_name name location city');
    
    // Create map of branch stocks
    const stockByBranch = {};
    
    branches.forEach(branch => {
      stockByBranch[String(branch._id)] = {
        branchId: branch._id,
        branchName: branch.branchName || branch.branch_name || branch.name,
        location: branch.location || branch.city,
        totalQuantity: 0,
        totalValue: 0,
        units: []
      };
    });

    // Populate with actual stock data
    stockRecords.forEach(stock => {
      if (!stock.branchId) return;
      const branchKey = String(stock.branchId._id || stock.branchId);
      if (stockByBranch[branchKey]) {
        const unit = itemUnits.find(u => u._id.equals(stock.itemUnitId));
        const defaultUnitPrice = itemUnits[0]?.unitPrice || item.unitPrice || 0;
        const unitPrice = unit ? (Number(unit.unitPrice) || 0) : defaultUnitPrice;
        const qty = Number(stock.quantity) || 0;
        const totalVal = qty * unitPrice;

        stockByBranch[branchKey].units.push({
          _id: stock._id,
          stockId: stock._id,
          unitId: stock.itemUnitId,
          unitName: unit ? unit.name : 'Standard Unit',
          unitPrice: unitPrice,
          unit: unit?.unit || item.unit || 'kg',
          quantity: qty,
          totalValue: totalVal,
          status: stock.status,
          minStock: stock.minStock,
          maxStock: stock.maxStock
        });
        
        stockByBranch[branchKey].totalQuantity += qty;
        stockByBranch[branchKey].totalValue += totalVal;
        if (!stockByBranch[branchKey]._id) {
          stockByBranch[branchKey]._id = stock._id;
          stockByBranch[branchKey].stockId = stock._id;
        }
      }
    });

    // Ensure all branches have at least default unit row if units exist
    Object.values(stockByBranch).forEach(branchStock => {
      if (branchStock.units.length === 0 && itemUnits.length > 0) {
        itemUnits.forEach(unit => {
          branchStock.units.push({
            unitId: unit._id,
            unitName: unit.name,
            unitPrice: unit.unitPrice || 0,
            unit: unit.unit || item.unit || 'kg',
            quantity: 0,
            totalValue: 0,
            status: 'out-of-stock'
          });
        });
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
        totalStockAcrossAllBranches: Object.values(stockByBranch).reduce((sum, b) => sum + b.totalQuantity, 0),
        totalValueAcrossAllBranches: Object.values(stockByBranch).reduce((sum, b) => sum + b.totalValue, 0)
      }
    };
    
    res.json(formattedResponse);
  } catch (err) {
    console.error('Error in getItemStock:', err);
    res.status(500).json({ error: err.message });
  }
};

// Add or update a price tier for an item
exports.addPriceTier = async (req, res) => {
  try {
    const { id } = req.params;
    const { branchId, unitPrice, quantity } = req.body;

    if (!unitPrice || Number(unitPrice) <= 0) {
      return res.status(400).json({ error: 'Please provide a valid unit price' });
    }

    const item = await Item.findById(id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const parsedPrice = Number(unitPrice);
    const parsedQty = Math.max(0, Number(quantity) || 0);

    // Find or create ItemUnit for this price tier
    let itemUnit = await ItemUnit.findOne({
      itemId: item._id,
      unitPrice: parsedPrice
    });

    if (!itemUnit) {
      itemUnit = new ItemUnit({
        unitId: `UNIT_${(item.name || '').replace(/\s+/g, '').toUpperCase()}_${Date.now()}`,
        name: `${item.name} - (Rs${parsedPrice})`,
        itemId: item._id,
        unit: item.unit || 'kg',
        unitValue: 1,
        unitsPerPack: 1,
        unitPrice: parsedPrice,
        description: `${item.name} at Rs ${parsedPrice}`
      });
      await itemUnit.save();
    }

    // Determine branch (use provided or default to first branch)
    let targetBranchId = branchId;
    if (!targetBranchId) {
      const defaultBranch = await Branch.findOne();
      targetBranchId = defaultBranch?._id;
    }

    if (targetBranchId) {
      let stock = await Stock.findOne({
        itemId: item._id,
        itemUnitId: itemUnit._id,
        branchId: targetBranchId
      });

      if (stock) {
        stock.quantity = (stock.quantity || 0) + parsedQty;
        stock.updatedAt = new Date();
        await stock.save();
      } else {
        stock = new Stock({
          itemId: item._id,
          itemUnitId: itemUnit._id,
          branchId: targetBranchId,
          quantity: parsedQty,
          minStockLevel: 0,
          maxStockLevel: 1000
        });
        await stock.save();
      }
    }

    res.json({
      success: true,
      message: 'Price tier added successfully',
      itemUnitId: itemUnit._id,
      unitPrice: parsedPrice,
      quantity: parsedQty
    });
  } catch (err) {
    console.error('Error in addPriceTier:', err);
    res.status(500).json({ error: err.message });
  }
};
