const PurchaseOrder = require('../models/purchaseOrder');
const { getBranchFilter } = require('../utils/branchFilter');

// Get all purchase orders
exports.getAllPOs = async (req, res) => {
  try {
    const branchFilter = getBranchFilter(req);
    const pos = await PurchaseOrder.find(branchFilter).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: pos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get purchase order by ID
exports.getPOById = async (req, res) => {
  try {
    const po = await PurchaseOrder.findOne({ poNumber: req.params.id });
    if (!po) {
      return res.status(404).json({
        success: false,
        message: 'Purchase Order not found'
      });
    }
    res.status(200).json({
      success: true,
      data: po
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create new purchase order
exports.createPO = async (req, res) => {
  try {
    const { poNumber, status, orderType, supplier, branch, orderDate, expectedDate, total, createdBy, createdByBranch, items, orderDetails } = req.body;

    // Better validation with specific field messages
    const missingFields = [];
    if (!poNumber) missingFields.push('poNumber');
    if (!orderType) missingFields.push('orderType');
    if (!createdBy) missingFields.push('createdBy');
    if (!createdByBranch) missingFields.push('createdByBranch');
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Check if PO number already exists
    const existingPO = await PurchaseOrder.findOne({ poNumber });
    if (existingPO) {
      return res.status(400).json({
        success: false,
        message: 'PO number already exists'
      });
    }

    const newPO = new PurchaseOrder({
      poNumber,
      status: status && ['Pending', 'Received', 'Cancelled'].includes(status) ? status : 'Pending',
      orderType,
      supplier: supplier || '',
      branch: branch || '',
      orderDate,
      expectedDate,
      total: total || '',
      createdBy,
      createdByBranch,
      items: items || [],
      orderDetails: orderDetails || {}
    });

    await newPO.save();
    res.status(201).json({
      success: true,
      message: 'Purchase Order created successfully',
      data: newPO
    });
  } catch (error) {
    console.error('PO Creation Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update purchase order
exports.updatePO = async (req, res) => {
  try {
    const { poNumber } = req.params;
    const updateData = req.body;

    // Validate status if it's being updated
    if (updateData.status && !['Pending', 'Received', 'Cancelled'].includes(updateData.status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: Pending, Received, Cancelled`
      });
    }

    const po = await PurchaseOrder.findOneAndUpdate(
      { poNumber },
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!po) {
      return res.status(404).json({
        success: false,
        message: 'Purchase Order not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Purchase Order updated successfully',
      data: po
    });
  } catch (error) {
    console.error('PO Update Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Cancel/Delete purchase order
exports.cancelPO = async (req, res) => {
  try {
    const { poNumber } = req.params;
    const deleteDetails = req.body;

    const po = await PurchaseOrder.findOneAndUpdate(
      { poNumber },
      {
        status: 'Cancelled',
        deleted: deleteDetails,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!po) {
      return res.status(404).json({
        success: false,
        message: 'Purchase Order not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Purchase Order cancelled successfully',
      data: po
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Search purchase orders
exports.searchPOs = async (req, res) => {
  try {
    const { query } = req.query;
    const branchFilter = getBranchFilter(req);
    
    const pos = await PurchaseOrder.find({
      $and: [
        branchFilter,
        {
          $or: [
            { poNumber: { $regex: query, $options: 'i' } },
            { supplier: { $regex: query, $options: 'i' } },
            { createdBy: { $regex: query, $options: 'i' } },
            { branch: { $regex: query, $options: 'i' } }
          ]
        }
      ]
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: pos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get purchase orders by status
exports.getPOsByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const branchFilter = getBranchFilter(req);

    const pos = await PurchaseOrder.find({ status, ...branchFilter }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: pos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get purchase orders by branch
exports.getPOsByBranch = async (req, res) => {
  try {
    const { branch } = req.params;

    const pos = await PurchaseOrder.find({ createdByBranch: branch }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: pos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
