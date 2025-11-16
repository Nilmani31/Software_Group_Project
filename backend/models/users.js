const { default: mongoose } = require("mongoose");

//want wirite code for user scehma
const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return 'USR' + Date.now() + Math.floor(Math.random() * 1000);
    }
  },
  username: {
    type: String,   
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role:{
    type: String,
    required: true,
    enum: ['ADMIN', 'MANAGER', 'BRANCH_MANAGER', 'DIRECTOR', 'STAFF'],
    default: 'STAFF'
  },
  roleId: {
    type: String,
    required: true,
    enum: ['ADMIN', 'MANAGER', 'BRANCH_MANAGER', 'DIRECTOR', 'STAFF'],
    default: 'STAFF'
  },
  branchId: {
    type: String,
    required: true,
    default: 'MAIN_BRANCH'
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
    unique: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
      },
      message: props => `${props.value} is not a valid email!`
    }
  },
  status: {
    type: String,
    required: true,
    enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING'],
    default: 'ACTIVE'
  },
  lastLoginAt: {
    type: Date,
    default: null
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

const User = mongoose.model('User', userSchema);

module.exports = User;