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
    unique: true,
  },
  unitsPerPack: {
    type: Number,
    required: true,
    default: 1,
  },
  price: {
    type: Number,
    required: true,
    default: 0,
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('ItemUnit', itemUnitSchema);
