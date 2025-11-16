
const User = require("../models/users");
const bcrypt = require("bcrypt");

// CREATE USER
exports.createUser = async (req, res) => {
  try {
    const { username, roleId, branchId, phoneNumber, email, createdBy } = req.body;

 
    const autoPassword = generatePasswordByRole(roleId);

    const hashedPassword = await bcrypt.hash(autoPassword, 10);

    const newUser = await User.create({
      username,
      password: hashedPassword,
      role,
      roleId,
      branchId,
      phoneNumber,
      email,
      createdBy
    });

    res.status(201).json({
      message: "User created successfully",
      userId: newUser.userId,
      username: newUser.username,
      role: newUser.role,
      roleId: newUser.roleId,
      password: autoPassword   
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
// UPDATE USER
exports.updateUser = async (req, res) => {
  try {
    const data = req.body;

    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    const updated = await User.findByIdAndUpdate(req.params.id, data, { new: true });

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

    // Return user data (exclude password)
    const userResponse = {
      userId: user.userId,
      username: user.username,
      email: user.email,
      roleId: user.roleId,
      branchId: user.branchId,
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

// Helper function to generate password by role
function generatePasswordByRole(roleId) {
  const passwords = {
    'ADMIN': 'admin123',
    'MANAGER': 'manager123', 
    'USER': 'user123',
    'VIEWER': 'viewer123'
  };
  return passwords[roleId] || 'default123';
}
