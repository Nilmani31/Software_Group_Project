const mongoose = require('mongoose');

const goodsReceivedSchema = new mongoose.Schema({
    grnNumber: {
        type: String,
        unique: true,
        required: true
    },
    purchaseOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PurchaseOrder'
    },
    items: [{
        itemId: String,
        itemName: String,
        unit: String,
        quantityOrdered: Number,
        quantityReceived: Number,
        unitPrice: Number
    }],
    receivedDate: {
        type: Date,
        default: Date.now
    },
    receivedBy: String,
    poNumber: String,
    supplierName: String,
    status: {
        type: String,
        enum: ['RECEIVED'],
        default: 'RECEIVED'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('GoodsReceived', goodsReceivedSchema);
