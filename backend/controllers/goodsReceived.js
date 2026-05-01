const GoodsReceived = require('../models/goodsReceived');
const PurchaseOrder = require('../models/purchaseOrder');
const Item = require('../models/items');
const Stock = require('../models/stock');
const User = require('../models/users');

// Get all GRNs with pagination
exports.getAllGRNs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const grns = await GoodsReceived.find({})
      .sort({ receivedDate: -1 })
      .skip(skip)
      .limit(limit);

    const total = await GoodsReceived.countDocuments();

    res.status(200).json({
      success: true,
      data: grns,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        limit
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching GRNs',
      error: error.message
    });
  }
};

// Get single GRN by ID
exports.getGRNById = async (req, res) => {
  try {
    const grn = await GoodsReceived.findById(req.params.id);

    if (!grn) {
      return res.status(404).json({
        success: false,
        message: 'GRN not found'
      });
    }

    res.status(200).json({
      success: true,
      data: grn
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching GRN',
      error: error.message
    });
  }
};

// Create new GRN
exports.createGRN = async (req, res) => {
  try {
    const {
      purchaseOrderId,
      items,
      receivedDate,
      receivedBy,
      poNumber,
      supplierName,
      branch
    } = req.body;

    // Validate items array
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Items array is required and cannot be empty'
      });
    }

    // Generate GRN number
    const count = await GoodsReceived.countDocuments();
    const grnNumber = `GRN-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

    // Create GRN with items
    const newGRN = new GoodsReceived({
      grnNumber,
      purchaseOrderId,
      branch: branch || '',
      items: items.map(item => ({
        itemId: item.itemId || '',
        itemName: item.itemName || '',
        unit: item.unit || '',
        quantityOrdered: item.quantityOrdered || 0,
        quantityReceived: item.quantityReceived || 0,
        unitPrice: item.unitPrice || 0
      })),
      receivedDate: receivedDate || new Date(),
      receivedBy: receivedBy || '',
      poNumber: poNumber || '',
      supplierName: supplierName || '',
      status: 'RECEIVED'
    });

    await newGRN.save();

    // Update item stock
    const Branch = require('../models/branches');
    const ItemUnit = require('../models/itemUnits');

    for (const item of items) {
      if (item.quantityReceived > 0) {
        try {
          let targetItemId = item.itemId;
          
          // If no itemId provided, try to find by itemName (since PO stores items as strings)
          if (!targetItemId || targetItemId.trim() === '') {
            const foundItem = await Item.findOne({ name: new RegExp(`^${item.itemName.trim()}$`, 'i') });
            if (foundItem) {
              targetItemId = foundItem._id;
              // Also update the GRN item to save the ID for future reference
              item.itemId = foundItem._id.toString();
            }
          }

          if (targetItemId) {
            // Parse unit string (e.g. "5kg" -> 5, "kg")
            let parsedUnitValue = 1;
            let parsedUnitName = item.unit || 'kg';
            if (item.unit) {
              const match = item.unit.match(/^(\d+(\.\d+)?)\s*(.*)$/);
              if (match) {
                parsedUnitValue = parseFloat(match[1]);
                parsedUnitName = match[3] || 'kg';
              } else {
                parsedUnitName = item.unit; // fallback if no number found
              }
            }

            // Find or Create the exact ItemUnit
            let targetItemUnitId = null;
            let foundUnit = await ItemUnit.findOne({ 
              itemId: targetItemId, 
              unit: parsedUnitName, 
              unitValue: parsedUnitValue, 
              unitPrice: item.unitPrice || 0
            });

            if (!foundUnit) {
              const itemNameStr = item.itemName || 'Item';
              const newUnitName = parsedUnitValue > 1 ? `${parsedUnitValue}${parsedUnitName}` : parsedUnitName;
              foundUnit = new ItemUnit({
                itemId: targetItemId,
                name: `${itemNameStr} - ${newUnitName}`,
                unit: parsedUnitName,
                unitValue: parsedUnitValue,
                unitPrice: item.unitPrice || 0,
                unitsPerPack: 1,
                description: `Created from GRN for ${itemNameStr}`
              });
              try {
                await foundUnit.save();
                console.log(`Created new ItemUnit from GRN: ${foundUnit._id} for ${foundUnit.name}`);
              } catch (saveErr) {
                // If it fails (e.g. duplicate name index), append a timestamp or price to name
                foundUnit.name = `${itemNameStr} - ${newUnitName} (Rs${item.unitPrice})`;
                await foundUnit.save();
                console.log(`Created new ItemUnit from GRN (with price in name): ${foundUnit._id}`);
              }
            }
            targetItemUnitId = foundUnit._id;

            // Find branch
            const branchQuery = branch ? { branchName: new RegExp(branch, 'i') } : { branchName: /colombo/i };
            let branchObj = await Branch.findOne(branchQuery) || await Branch.findOne();
            let targetBranchId = branchObj ? branchObj._id : null;

            if (targetItemUnitId && targetBranchId) {
              await Stock.findOneAndUpdate(
                { itemId: targetItemId, itemUnitId: targetItemUnitId, branchId: targetBranchId },
                { $inc: { quantity: item.quantityReceived } },
                { upsert: true, new: true }
              );
              console.log(`Stock updated correctly for ${item.itemName} (+${item.quantityReceived})`);
            } else {
              // Fallback
              await Stock.findOneAndUpdate(
                { itemId: targetItemId },
                { $inc: { quantity: item.quantityReceived } },
                { upsert: true, new: true }
              );
              console.log(`Stock updated (fallback) for ${item.itemName} (+${item.quantityReceived})`);
            }
          } else {
            console.warn(`Could not find item in DB to update stock for: ${item.itemName}`);
          }
        } catch (stockErr) {
          console.error(`Failed to update stock for item ${item.itemName}:`, stockErr.message);
        }
      }
    }

    // Update PO status to Received if PO number is provided
    if (poNumber) {
      try {
        await PurchaseOrder.findOneAndUpdate(
          { poNumber },
          { status: 'Received' },
          { new: true }
        );
        console.log(`Updated PO ${poNumber} status to Received`);
      } catch (poErr) {
        console.error(`Failed to update PO status for ${poNumber}:`, poErr.message);
      }
    }

    res.status(201).json({
      success: true,
      message: 'GRN created successfully',
      data: newGRN
    });
  } catch (error) {
    console.error('GRN Creation Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating GRN',
      error: error.message
    });
  }
};

// Update GRN
exports.updateGRN = async (req, res) => {
  try {
    const { id } = req.params;
    const { items, receivedDate, receivedBy } = req.body;

    const grn = await GoodsReceived.findById(id);
    if (!grn) {
      return res.status(404).json({
        success: false,
        message: 'GRN not found'
      });
    }

    // Update items and adjust stock
    const oldItems = grn.items;
    
    // Reverse old stock adjustments (only for items with valid itemId)
    for (const item of oldItems) {
      if (item.itemId && item.itemId.trim() !== '') {
        try {
          await Stock.findOneAndUpdate(
            { itemId: item.itemId },
            { $inc: { quantity: -item.quantityReceived } }
          );
        } catch (err) {
          console.error(`Failed to reverse stock for item ${item.itemName}:`, err.message);
        }
      }
    }

    // Add new stock adjustments
    const Branch = require('../models/branches');
    const ItemUnit = require('../models/itemUnits');
    const Item = require('../models/items');

    for (const item of items) {
      if (item.quantityReceived > 0) {
        try {
          let targetItemId = item.itemId;
          
          if (!targetItemId || targetItemId.trim() === '') {
            const foundItem = await Item.findOne({ name: new RegExp(`^${item.itemName.trim()}$`, 'i') });
            if (foundItem) {
              targetItemId = foundItem._id;
              item.itemId = foundItem._id.toString();
            }
          }

          if (targetItemId) {
            // Parse unit string (e.g. "5kg" -> 5, "kg")
            let parsedUnitValue = 1;
            let parsedUnitName = item.unit || 'kg';
            if (item.unit) {
              const match = item.unit.match(/^(\d+(\.\d+)?)\s*(.*)$/);
              if (match) {
                parsedUnitValue = parseFloat(match[1]);
                parsedUnitName = match[3] || 'kg';
              } else {
                parsedUnitName = item.unit;
              }
            }

            // Find or Create the exact ItemUnit
            let targetItemUnitId = null;
            let foundUnit = await ItemUnit.findOne({ 
              itemId: targetItemId, 
              unit: parsedUnitName, 
              unitValue: parsedUnitValue, 
              unitPrice: item.unitPrice || 0
            });

            if (!foundUnit) {
              const itemNameStr = item.itemName || 'Item';
              const newUnitName = parsedUnitValue > 1 ? `${parsedUnitValue}${parsedUnitName}` : parsedUnitName;
              foundUnit = new ItemUnit({
                itemId: targetItemId,
                name: `${itemNameStr} - ${newUnitName}`,
                unit: parsedUnitName,
                unitValue: parsedUnitValue,
                unitPrice: item.unitPrice || 0,
                unitsPerPack: 1,
                description: `Created from GRN for ${itemNameStr}`
              });
              try {
                await foundUnit.save();
              } catch (saveErr) {
                foundUnit.name = `${itemNameStr} - ${newUnitName} (Rs${item.unitPrice})`;
                await foundUnit.save();
              }
            }
            targetItemUnitId = foundUnit._id;

            const branchQuery = grn.branch ? { branchName: new RegExp(grn.branch, 'i') } : { branchName: /colombo/i };
            let branchObj = await Branch.findOne(branchQuery) || await Branch.findOne();
            let targetBranchId = branchObj ? branchObj._id : null;

            if (targetItemUnitId && targetBranchId) {
              await Stock.findOneAndUpdate(
                { itemId: targetItemId, itemUnitId: targetItemUnitId, branchId: targetBranchId },
                { $inc: { quantity: item.quantityReceived } },
                { upsert: true }
              );
            } else {
              await Stock.findOneAndUpdate(
                { itemId: targetItemId },
                { $inc: { quantity: item.quantityReceived } },
                { upsert: true }
              );
            }
          }
        } catch (err) {
          console.error(`Failed to update stock for item ${item.itemName}:`, err.message);
        }
      }
    }

    const updatedGRN = await GoodsReceived.findByIdAndUpdate(
      id,
      {
        items,
        receivedDate,
        receivedBy
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'GRN updated successfully',
      data: updatedGRN
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating GRN',
      error: error.message
    });
  }
};

// Delete GRN
exports.deleteGRN = async (req, res) => {
  try {
    const { id } = req.params;

    const grn = await GoodsReceived.findById(id);
    if (!grn) {
      return res.status(404).json({
        success: false,
        message: 'GRN not found'
      });
    }

    // Reverse stock adjustments (only for items with valid itemId)
    for (const item of grn.items) {
      if (item.itemId && item.itemId.trim() !== '') {
        try {
          await Stock.findOneAndUpdate(
            { itemId: item.itemId },
            { $inc: { quantity: -item.quantityReceived } }
          );
        } catch (err) {
          console.error(`Failed to reverse stock for item ${item.itemName}:`, err.message);
        }
      }
    }

    // Update PO status back to Pending if needed
    if (grn.poNumber) {
      try {
        await PurchaseOrder.findOneAndUpdate(
          { poNumber: grn.poNumber },
          { status: 'Pending' }
        );
      } catch (err) {
        console.error(`Failed to update PO status for ${grn.poNumber}:`, err.message);
      }
    }

    await GoodsReceived.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'GRN deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting GRN',
      error: error.message
    });
  }
};

// Get GRNs by PO number
exports.getGRNsByPONumber = async (req, res) => {
  try {
    const { poNumber } = req.params;

    const grns = await GoodsReceived.find({ poNumber });

    res.status(200).json({
      success: true,
      data: grns
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching GRNs',
      error: error.message
    });
  }
};

// Get GRN summary report
exports.getGRNSummary = async (req, res) => {
  try {
    const totalGRNs = await GoodsReceived.countDocuments();
    const thisMonth = new Date();
    thisMonth.setDate(1);

    const monthlyGRNs = await GoodsReceived.countDocuments({
      receivedDate: { $gte: thisMonth }
    });

    const totalItemsReceived = await GoodsReceived.aggregate([
      {
        $group: {
          _id: null,
          totalItems: {
            $sum: { $size: '$items' }
          },
          totalQuantity: {
            $sum: {
              $sum: '$items.quantityReceived'
            }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalGRNs,
        monthlyGRNs,
        totalItemsReceived: totalItemsReceived[0]?.totalItems || 0,
        totalQuantityReceived: totalItemsReceived[0]?.totalQuantity || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching summary',
      error: error.message
    });
  }
};

// Search GRNs
exports.searchGRNs = async (req, res) => {
  try {
    const { query, type } = req.query;

    let searchCriteria = {};

    if (type === 'grn') {
      searchCriteria.grnNumber = { $regex: query, $options: 'i' };
    } else if (type === 'po') {
      searchCriteria.poNumber = { $regex: query, $options: 'i' };
    } else if (type === 'supplier') {
      searchCriteria.supplierName = { $regex: query, $options: 'i' };
    } else {
      searchCriteria = {
        $or: [
          { grnNumber: { $regex: query, $options: 'i' } },
          { poNumber: { $regex: query, $options: 'i' } },
          { supplierName: { $regex: query, $options: 'i' } }
        ]
      };
    }

    const results = await GoodsReceived.find(searchCriteria).limit(20);

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error searching GRNs',
      error: error.message
    });
  }
};
