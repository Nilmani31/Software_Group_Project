const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  branchId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return 'BR' + Date.now() + Math.floor(Math.random() * 1000);
    }
  },
  branchName: {
    type: String,
    required: true,
    unique: true
  },
  branchCode: {
    type: String,
    required: true,
    unique: true
  },
  location: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /\d{10,15}/.test(v);
      },
      message: props => `${props.value} is not a valid phone number!`
    }
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
      },
      message: props => `${props.value} is not a valid email!`
    }
  },
  manager: {
    type: String,
    required: true,
    default: 'To Be Assigned'
  },
  status: {
    type: String,
    required: true,
    enum: ['ACTIVE', 'INACTIVE', 'CLOSED'],
    default: 'ACTIVE'
  },
  createdBy: {
    type: String,
    default: 'SYSTEM'
  },
  updatedBy: {
    type: String,
    default: 'SYSTEM'
  }
}, { timestamps: true });

const Branch = mongoose.model('Branch', branchSchema);

module.exports = Branch;
