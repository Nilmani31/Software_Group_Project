const Branch = require('../models/branches');

const DEFAULT_BRANCH_EMAIL = 'branch@company.com';

const toApiBranch = (branch) => {
  const data = typeof branch?.toObject === 'function' ? branch.toObject() : branch;

  if (!data) {
    return null;
  }

  return {
    branchId: data.branchId,
    branchCode: data.branchCode,
    branchName: data.branchName,
    location: data.location,
    city: data.city,
    state: data.state,
    address: data.address,
    phoneNumber: data.phoneNumber,
    email: data.email,
    manager: data.manager,
    status: data.status,
    createdBy: data.createdBy,
    updatedBy: data.updatedBy,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    branch_id: data.branchId,
    branch_code: data.branchCode,
    branch_name: data.branchName,
    contact_person: data.manager,
    phone: data.phoneNumber,
  };
};

const sanitizePhoneNumber = (phone) => {
  if (phone === undefined || phone === null) {
    return '';
  }

  return String(phone).replace(/\D+/g, '');
};

const buildBranchCode = (branchName) => {
  const namePart = branchName.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 3) || 'BRN';
  return `${namePart}${Date.now().toString(36).toUpperCase()}`;
};

exports.getBranches = async (req, res) => {
  try {
    const branches = await Branch.find().sort({ branchName: 1 }).lean();
    res.json({ success: true, data: branches.map(toApiBranch) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBranchById = async (req, res) => {
  try {
    const branchId = req.params.branchId;
    const branch = await Branch.findOne({ branchId }).lean();

    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    res.json({ success: true, data: toApiBranch(branch) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createBranch = async (req, res) => {
  try {
    const { branch_name, location, contact_person, phone } = req.body;

    if (!branch_name || !location || !contact_person || !phone) {
      return res.status(400).json({ success: false, message: 'branch_name, location, contact_person, and phone are required' });
    }

    const sanitizedPhone = sanitizePhoneNumber(phone);

    if (!/^\d{10,15}$/.test(sanitizedPhone)) {
      return res.status(400).json({ success: false, message: 'Phone number must contain 10-15 digits' });
    }

    const trimmedLocation = location.trim();
    const trimmedName = branch_name.trim();
    const trimmedManager = contact_person.trim();

    const newBranch = await Branch.create({
      branchName: trimmedName,
      branchCode: buildBranchCode(trimmedName),
      location: trimmedLocation,
      city: trimmedLocation,
      state: trimmedLocation,
      address: trimmedLocation,
      phoneNumber: sanitizedPhone,
      email: DEFAULT_BRANCH_EMAIL,
      manager: trimmedManager,
      createdBy: req.user?.username || 'SYSTEM',
      updatedBy: req.user?.username || 'SYSTEM',
    });

    res.status(201).json({ success: true, data: toApiBranch(newBranch) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Branch name must be unique' });
    }

    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateBranch = async (req, res) => {
  try {
    const branchId = req.params.branchId;
    const { branch_name, location, contact_person, phone } = req.body;

    const update = {};

    if (branch_name !== undefined) {
      const trimmedName = branch_name.trim();
      update.branchName = trimmedName;
    }

    if (location !== undefined) {
      const trimmedLocation = location.trim();
      update.location = trimmedLocation;
      update.city = trimmedLocation;
      update.state = trimmedLocation;
      update.address = trimmedLocation;
    }

    if (contact_person !== undefined) {
      update.manager = contact_person.trim();
    }

    if (phone !== undefined) {
      const sanitizedPhone = sanitizePhoneNumber(phone);

      if (!/^\d{10,15}$/.test(sanitizedPhone)) {
        return res.status(400).json({ success: false, message: 'Phone number must contain 10-15 digits' });
      }

      update.phoneNumber = sanitizedPhone;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    update.updatedBy = req.user?.username || 'SYSTEM';

    const updated = await Branch.findOneAndUpdate(
      { branchId },
      update,
      { new: true, runValidators: true, context: 'query' }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    res.json({ success: true, data: toApiBranch(updated) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Branch name must be unique' });
    }

    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteBranch = async (req, res) => {
  try {
    const branchId = req.params.branchId;
    const removed = await Branch.findOneAndDelete({ branchId });

    if (!removed) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    res.json({ success: true, message: 'Branch removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
