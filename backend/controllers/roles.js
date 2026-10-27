const Role = require('../models/roles');

// Get all roles
exports.getAllRoles = async (req, res) => {
  try {
    const roles = await Role.find().select('-__v');
    res.status(200).json({
      success: true,
      data: roles,
      message: 'Roles fetched successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      message: 'Error fetching roles'
    });
  }
};

// Get single role
exports.getRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }
    res.status(200).json({
      success: true,
      data: role,
      message: 'Role fetched successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      message: 'Error fetching role'
    });
  }
};

// Create new role
exports.createRole = async (req, res) => {
  try {
    const { roleId, roleName, description, permissions } = req.body;

    // Check if role already exists
    const existingRole = await Role.findOne({ roleId });
    if (existingRole) {
      return res.status(400).json({
        success: false,
        message: 'Role already exists'
      });
    }

    const newRole = await Role.create({
      roleId: roleId.toUpperCase(),
      roleName,
      description,
      permissions: permissions || []
    });

    res.status(201).json({
      success: true,
      data: newRole,
      message: 'Role created successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      message: 'Error creating role'
    });
  }
};

// Update role
exports.updateRole = async (req, res) => {
  try {
    const { roleName, description, permissions, status } = req.body;
    
    const role = await Role.findByIdAndUpdate(
      req.params.id,
      {
        roleName,
        description,
        permissions: permissions || [],
        status,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    res.status(200).json({
      success: true,
      data: role,
      message: 'Role updated successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      message: 'Error updating role'
    });
  }
};

// Delete role
exports.deleteRole = async (req, res) => {
  try {
    const role = await Role.findByIdAndDelete(req.params.id);
    
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Role deleted successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      message: 'Error deleting role'
    });
  }
};
