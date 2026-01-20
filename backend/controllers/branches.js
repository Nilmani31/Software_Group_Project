const Branch = require('../models/branches');

// Fetch every branch record (used by Branches page table/grid)
exports.getBranches = async (req, res) => {
  try {
    const branches = await Branch.find().sort({ branch_id: 1 }).lean();
    res.json({ success: true, data: branches });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Fetch a single branch by its numeric identifier
exports.getBranchById = async (req, res) => {
  try {
    const branchId = Number(req.params.branchId);
    const branch = await Branch.findOne({ branch_id: branchId }).lean();

    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    res.json({ success: true, data: branch });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create a new branch document adhering to BRANCHES structure
exports.createBranch = async (req, res) => {
  try {
    const { branch_name, location, contact_person, phone } = req.body;

    if (!branch_name) {
      return res.status(400).json({ success: false, message: 'branch_name is required' });
    }

    const newBranch = await Branch.create({ 
      branchName: branch_name,
      location: location,
      city: location, // Use location as city if not provided
      state: location, // Use location as state if not provided
      address: location, // Use location as address if not provided
      phoneNumber: phone,
      email: 'branch@company.com', // Default email
      branchCode: branch_name.substring(0, 3).toUpperCase() + Date.now().toString().slice(-4) // Generate code
    });

    res.status(201).json({ success: true, data: newBranch });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Branch name must be unique' });
    }

    res.status(500).json({ success: false, message: error.message });
  }
};

// Update branch details partially or fully
exports.updateBranch = async (req, res) => {
  try {
    const branchId = Number(req.params.branchId);
    const { branch_name, location, contact_person, phone } = req.body;
    
    // Map incoming field names to schema field names
    const update = {};
    if (branch_name !== undefined) update.branchName = branch_name;
    if (location !== undefined) {
      update.location = location;
      update.city = location;
      update.state = location;
      update.address = location;
    }
    if (phone !== undefined) update.phoneNumber = phone;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    const updated = await Branch.findOneAndUpdate(
      { branchId },
      update,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Branch name must be unique' });
    }

    res.status(500).json({ success: false, message: error.message });
  }
};

// Remove a branch document
exports.deleteBranch = async (req, res) => {
  try {
    const branchId = Number(req.params.branchId);
    const removed = await Branch.findOneAndDelete({ branch_id: branchId });

    if (!removed) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    res.json({ success: true, message: 'Branch removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
