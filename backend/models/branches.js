const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema(
  {
    branch_id: {
      type: Number,
      unique: true,
      required: true,
    },
    branch_name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    location: {
      type: String,
      default: '',
      trim: true,
    },
    contact_person: {
      type: String,
      default: '',
      trim: true,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  },
  {
    collection: 'branches',
    timestamps: false,
  }
);

// Ensure monotonically increasing branch_id for new records.
branchSchema.pre('validate', async function assignBranchId(next) {
  if (this.branch_id != null) return next();

  try {
    const lastBranch = await this.constructor.findOne().sort('-branch_id').lean();
    this.branch_id = lastBranch ? lastBranch.branch_id + 1 : 1;
    next();
  } catch (error) {
    next(error);
  }
});

const Branch = mongoose.model('Branch', branchSchema);

module.exports = Branch;
