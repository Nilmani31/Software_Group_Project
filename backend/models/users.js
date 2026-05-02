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
    enum: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_BRANCH_MANAGER', 'ROLE_DIRECTOR', 'ROLE_STAFF'],
    default: 'ROLE_STAFF'
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
        // Accept phone numbers with 10-15 digits, allowing for spaces, hyphens, and +
        return /^[\d\s\-\+()]{10,}$/.test(v) && /\d/.test(v) && (v.match(/\d/g) || []).length >= 10;
      },
      message: props => `${props.value} is not a valid phone number! (min 10 digits)`
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