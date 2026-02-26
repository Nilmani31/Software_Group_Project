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
        itemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Item'
        },
        itemName: String,
        quantityOrdered: Number,
        quantityReceived: Number,
        unitPrice: Number
    }],
    receivedDate: {
        type: Date,
        default: Date.now
    },
    receivedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    poNumber: String,
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
