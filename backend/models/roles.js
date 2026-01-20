const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  roleId: {
    type: String,
    required: true,
    unique: true,
  },
  roleName: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  permissions: {
    type: [String],
    default: [],
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE'],
    default: 'ACTIVE'
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Role', roleSchema);
