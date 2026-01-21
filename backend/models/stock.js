const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true,
  },
  itemUnitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ItemUnit',
    required: false,
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    default: 0,
  },
  minStockLevel: {
    type: Number,
    default: 0,
  },
  maxStockLevel: {
    type: Number,
    default: 1000,
  },
  reorderPoint: {
    type: Number,
    default: 10,
  },
  lastRestockedDate: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
}, {
  timestamps: true
});

// Create compound index for efficient queries
stockSchema.index({ itemId: 1, branchId: 1 }, { unique: true });

// Update the updatedAt field before saving
stockSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Stock', stockSchema);
