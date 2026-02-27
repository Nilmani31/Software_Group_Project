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

    // Update item stock only if itemId is provided
    for (const item of items) {
      if (item.quantityReceived > 0 && item.itemId && item.itemId.trim() !== '') {
        try {
          await Stock.findOneAndUpdate(
            { itemId: item.itemId },
            { $inc: { quantity: item.quantityReceived } },
            { upsert: true, new: true }
          );
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
    for (const item of items) {
      if (item.quantityReceived > 0 && item.itemId && item.itemId.trim() !== '') {
        try {
          await Stock.findOneAndUpdate(
            { itemId: item.itemId },
            { $inc: { quantity: item.quantityReceived } },
            { upsert: true }
          );
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
