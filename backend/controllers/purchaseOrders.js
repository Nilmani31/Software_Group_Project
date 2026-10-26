const PurchaseOrder = require('../models/purchaseOrder');
const { getPOBranchFilter, resolveBranchName } = require('../utils/branchFilter');

// Get all purchase orders
exports.getAllPOs = async (req, res) => {
  try {
    const branchFilter = await getPOBranchFilter(req);
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
    const userBranchName = req.user && req.user.branchId
      ? await resolveBranchName(req.user.branchId)
      : 'Colombo Main Branch';
    const finalCreatedByBranch = req.body.createdByBranch || userBranchName;
    let { poNumber, status, orderType, supplier, branch, orderDate, expectedDate, total, createdBy, items, orderDetails } = req.body;
    const createdByBranch = finalCreatedByBranch;

    // Normalize orderType
    let finalOrderType = orderType;
    if (finalOrderType === 'Branches') finalOrderType = 'Branch';
    if (!finalOrderType) finalOrderType = 'Supplier';

    // Normalize createdBy
    const finalCreatedBy = createdBy || (req.user && (req.user.fullName || req.user.username)) || 'Admin User';

    // Auto-generate poNumber if not provided
    let finalPONumber = poNumber;
    if (!finalPONumber) {
      const year = new Date().getFullYear();
      const count = await PurchaseOrder.countDocuments();
      let seq = count + 1;
      while (await PurchaseOrder.findOne({ poNumber: `PO-${year}-${String(seq).padStart(3, '0')}` })) {
        seq++;
      }
      finalPONumber = `PO-${year}-${String(seq).padStart(3, '0')}`;
    }

    // Check if PO number already exists
    const existingPO = await PurchaseOrder.findOne({ poNumber: finalPONumber });
    if (existingPO) {
      return res.status(400).json({
        success: false,
        message: 'PO number already exists'
      });
    }

    const newPO = new PurchaseOrder({
      poNumber: finalPONumber,
      status: status && ['Pending', 'Received', 'Cancelled'].includes(status) ? status : 'Pending',
      orderType: finalOrderType,
      supplier: supplier || '',
      branch: branch || '',
      orderDate: orderDate || new Date(),
      expectedDate: expectedDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      total: total || '',
      createdBy: finalCreatedBy,
      createdByBranch: createdByBranch || 'Colombo Main Branch',
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
    const branchFilter = await getPOBranchFilter(req);
    
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
    const branchFilter = await getPOBranchFilter(req);

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
