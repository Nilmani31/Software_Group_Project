const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  categoryId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return 'CAT_' + this.name.replace(/\s+/g, '').toUpperCase() + '_' + Date.now();
    }
  },
  name: {
    type: String,
    required: true,
    unique: true,
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

module.exports = mongoose.model('Category', categorySchema);
