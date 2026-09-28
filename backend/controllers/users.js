const User = require("../models/users");
const bcrypt = require("bcrypt");
const { generatePasswordByRole } = require("../utils/passwordGenerator");
const { sendWelcomeMessage } = require("../services/messageService");
const { resolveBranchName } = require("../utils/branchFilter");

const DEFAULT_ROLE_PERMISSIONS = {
  ROLE_ADMIN: ['ALL'],
  ROLE_DIRECTOR: ['DASHBOARD', 'REPORTS', 'INVENTORY', 'PURCHASE_ORDERS', 'GOODS_RECEIVED', 'ISSUE_NOTES', 'USERS', 'BRANCHES', 'CATEGORIES'],
  ROLE_MANAGER: ['DASHBOARD', 'INVENTORY', 'PURCHASE_ORDERS', 'GOODS_RECEIVED', 'ISSUE_NOTES', 'REPORTS'],
  ROLE_BRANCH_MANAGER: ['DASHBOARD', 'INVENTORY', 'PURCHASE_ORDERS', 'GOODS_RECEIVED', 'ISSUE_NOTES'],
  ROLE_STAFF: ['DASHBOARD', 'INVENTORY', 'GOODS_RECEIVED']
};

// GET ALL USERS
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').lean();
    
    // Attach resolved branchName and effective permissions
    const enrichedUsers = await Promise.all(
      users.map(async (u) => {
        const branchName = await resolveBranchName(u.branchId);
        const permissions = (u.permissions && u.permissions.length > 0)
          ? u.permissions
          : (DEFAULT_ROLE_PERMISSIONS[u.roleId] || ['DASHBOARD', 'INVENTORY']);
        return {
          ...u,
          branchName,
          permissions
        };
      })
    );

    res.json({
      success: true,
      count: enrichedUsers.length,
      data: enrichedUsers
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// CREATE USER
exports.createUser = async (req, res) => {
  try {
    const { username, roleId, branchId, phoneNumber, email, password, createdBy, permissions } = req.body;

    if (!username || !roleId || !branchId || !phoneNumber || !email) {
      return res.status(400).json({
        success: false,
        error: 'username, roleId, branchId, phoneNumber, and email are required'
      });
    }

    // Use provided password or generate one
    let finalPassword;
    
    if (password) {
      const trimmed = String(password).trim();
      if (trimmed.length > 0) {
        finalPassword = trimmed;
      } else {
        finalPassword = generatePasswordByRole(roleId);
      }
    } else {
      finalPassword = generatePasswordByRole(roleId);
    }

    // Validate password exists
    if (!finalPassword || typeof finalPassword !== 'string' || finalPassword.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Password is invalid'
      });
    }

    const hashedPassword = await bcrypt.hash(finalPassword, 10);

    // Map roleId to role (remove ROLE_ prefix if present)
    const roleValue = roleId.startsWith('ROLE_') ? roleId.substring(5) : roleId;
    
    // Resolve permissions: custom permissions or fallback to role defaults
    let finalPermissions = permissions;
    if (!finalPermissions || !Array.isArray(finalPermissions) || finalPermissions.length === 0) {
      finalPermissions = DEFAULT_ROLE_PERMISSIONS[roleId] || ['DASHBOARD', 'INVENTORY'];
    }

    const newUser = await User.create({
      username,
      password: hashedPassword,
      role: roleValue,
      roleId,
      branchId,
      allowedBranches: req.body.allowedBranches || [],
      permissions: finalPermissions,
      phoneNumber,
      email,
      createdBy
    });

    let messageStatus = { sent: false, reason: 'Not attempted' };
    try {
      messageStatus = await sendWelcomeMessage({
        email,
        username,
        password: finalPassword,
        roleId
      });
    } catch (messageError) {
      console.error('Welcome message error:', messageError.message);
      messageStatus = {
        sent: false,
        reason: `Message could not be sent: ${messageError.message}`
      };
    }

    res.status(201).json({
      success: true,
      message: "User created successfully",
      _id: newUser._id,
      id: newUser._id,
      userId: newUser.userId,
      username: newUser.username,
      role: newUser.role,
      roleId: newUser.roleId,
      permissions: newUser.permissions,
      password: finalPassword,
      messageSent: messageStatus.sent,
      messageStatus: messageStatus.reason || 'Message sent successfully'
    });
  } catch (err) {
    console.error('Create user error:', err.message);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// UPDATE USER
exports.updateUser = async (req, res) => {
  try {
    const data = req.body;

    // Only hash password if it's provided and not empty
    if (data.password && data.password.trim() !== '') {
      data.password = await bcrypt.hash(data.password, 10);
    } else {
      // Remove password from update if it's empty to keep existing password
      delete data.password;
    }

    if (data.roleId) {
      data.role = data.roleId.startsWith('ROLE_') ? data.roleId.substring(5) : data.roleId;
    }

    const updated = await User.findByIdAndUpdate(req.params.id, data, { new: true }).select('-password');

    if (!updated) return res.status(404).json({ error: "User not found" });

    res.json({
      message: "User updated successfully",
      user: updated
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// DELETE USER
exports.deleteUser = async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "User not found" });

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// LOGIN USER
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Find user by username
    const user = await User.findOne({ username: username });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Check password with bcrypt
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Account is not active. Please contact administrator.'
      });
    }

    // Update last login time
    user.lastLoginAt = new Date();
    await user.save();

    // Resolve branch name and permissions
    const branchName = await resolveBranchName(user.branchId);
    const permissions = (user.permissions && user.permissions.length > 0)
      ? user.permissions
      : (DEFAULT_ROLE_PERMISSIONS[user.roleId] || ['DASHBOARD', 'INVENTORY']);

    // Return user data (exclude password)
    const userResponse = {
      userId: user.userId,
      username: user.username,
      email: user.email,
      roleId: user.roleId,
      role: user.role,
      branchId: user.branchId,
      branchName: branchName,
      allowedBranches: user.allowedBranches || [],
      permissions: permissions,
      phoneNumber: user.phoneNumber,
      status: user.status,
      lastLoginAt: user.lastLoginAt
    };

    res.json({
      success: true,
      message: 'Login successful',
      user: userResponse
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
