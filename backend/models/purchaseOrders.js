const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema({
  poNumber: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Received', 'Cancelled'],
    default: 'Pending'
  },
  orderType: {
    type: String,
    enum: ['Supplier', 'Branch'],
    required: true
  },
  supplier: {
    type: String,
    default: ''
  },
  branch: {
    type: String,
    default: ''
  },
  orderDate: {
    type: String,
    required: true
  },
  expectedDate: {
    type: String,
    required: true
  },
  total: {
    type: String,
    default: ''
  },
  createdBy: {
    type: String,
    required: true
  },
  createdByBranch: {
    type: String,
    required: true
  },
  items: [{
    type: String
  }],
  orderDetails: {
    supplierName: String,
    phone: String,
    branch: String
  },
  deleted: {
    deletedBy: String,
    contactNumber: String,
    deletedDate: String,
    branchName: String,
    reason: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
