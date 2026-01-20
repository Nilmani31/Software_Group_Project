const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  branchId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return 'BR_' + this.name.replace(/\s+/g, '').toUpperCase() + '_' + Date.now();
    }
  },
  name: {
    type: String,
    required: true,
    unique: true,
  },
  location: {
    type: String,
    default: '',
  },
  manager: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Branch', branchSchema);
