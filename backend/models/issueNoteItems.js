const mongoose = require('mongoose');

const issueNoteItemSchema = new mongoose.Schema({
  issueNoteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IssueNote',
    required: true
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  itemUnitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ItemUnit',
    required: false
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unitPrice: {
    type: Number,
    default: 0
  },
  totalPrice: {
    type: Number,
    default: 0
  },
  remarks: {
    type: String,
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate total price before saving
issueNoteItemSchema.pre('save', function(next) {
  this.totalPrice = this.quantity * this.unitPrice;
  next();
});

module.exports = mongoose.model('IssueNoteItem', issueNoteItemSchema);
