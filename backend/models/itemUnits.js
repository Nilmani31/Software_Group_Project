const mongoose = require('mongoose');

const itemUnitSchema = new mongoose.Schema({
  unitId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return 'UNIT_' + this.name.replace(/\s+/g, '').toUpperCase() + '_' + Date.now();
    }
  },
  name: {
    type: String,
    required: true,
  },
  // Make the combination of name and itemId unique instead of just name
  // This allows the same unit name for different items
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true,
  },
  unit: {
    type: String,
    required: true,
    enum: ['pcs', 'kg', 'ltr', 'box', 'pack', 'meter', 'dozen'],
    default: 'pcs',
  },
  unitsPerPack: {
    type: Number,
    required: true,
    default: 1,
  },
  unitPrice: {
    type: Number,
    required: true,
    default: 0,
  },
  description: {
    type: String,
    default: '',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index to ensure unique unit names per item
itemUnitSchema.index({ itemId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('ItemUnit', itemUnitSchema);
