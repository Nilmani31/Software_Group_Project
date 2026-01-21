const mongoose = require('mongoose');

const issueNoteSchema = new mongoose.Schema({
  issueNoteNumber: {
    type: String,
    required: true,
    unique: true
  },
  issueDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  fromBranchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  toBranchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: false // Can be null for external issues
  },
  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'],
    default: 'pending'
  },
  purpose: {
    type: String,
    required: false
  },
  remarks: {
    type: String,
    required: false
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update the updatedAt field before saving
issueNoteSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('IssueNote', issueNoteSchema);
