const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema({
    poNumber: {
        type: String,
        unique: true,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Received', 'Cancelled'],
        default: 'Pending'
    },
    orderType: {
        type: String,
        enum: ['Supplier', 'Branch'],
        default: 'Supplier'
    },
    supplier: String,
    branch: String,
    orderDate: {
        type: Date,
        default: Date.now
    },
    expectedDate: Date,
    total: String,
    createdBy: String,
    createdByBranch: String,
    items: [String],
    orderDetails: {
        supplierName: String,
        phone: String,
        branch: String
    },
    deleted: {
        by: String,
        branchName: String,
        date: Date,
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
