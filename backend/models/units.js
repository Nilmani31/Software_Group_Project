const mongoose = require('mongoose');

const unitSchema = new mongoose.Schema({
  unitId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      const sym = (this.symbol || this.name || 'UNIT').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      return `UNIT_${sym}_${Date.now()}`;
    }
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  symbol: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['Weight', 'Volume', 'Count', 'Packaging', 'Length', 'Other'],
    default: 'Count'
  },
  description: {
    type: String,
    default: ''
  },
  baseUnit: {
    type: String,
    default: ''
  },
  conversionFactor: {
    type: Number,
    default: 1
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE'],
    default: 'ACTIVE'
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

module.exports = mongoose.model('Unit', unitSchema);
