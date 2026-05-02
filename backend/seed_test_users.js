const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/users');
const Branch = require('./models/branches');
require('dotenv').config();

const seedTestUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://dina:dina123@cluster0.p78wz.mongodb.net/cbbs_inventory?retryWrites=true&w=majority');
    console.log('Connected to MongoDB');

    // Get branches to assign
    const branches = await Branch.find();
    if (branches.length === 0) {
      console.log('No branches found. Creating a test branch...');
      const testBranch = await Branch.create({
        branchName: 'Test Branch',
        branchCode: 'TST001',
        location: 'Test Location',
        city: 'Test City',
        state: 'Test State',
        address: 'Test Address',
        phoneNumber: '0712345678',
        email: 'test@branch.com'
      });
      branches.push(testBranch);
    }
    
    const branch1Id = branches[0]._id.toString();
    const branch2Id = branches.length > 1 ? branches[1]._id.toString() : branch1Id;

    const defaultPassword = await bcrypt.hash('password123', 10);

    const testUsers = [
      {
        username: 'test_director',
        password: defaultPassword,
        role: 'DIRECTOR',
        roleId: 'ROLE_DIRECTOR',
        branchId: branch1Id,
        email: 'director@test.com',
        phoneNumber: '0711111111',
        status: 'ACTIVE'
      },
      {
        username: 'test_manager',
        password: defaultPassword,
        role: 'MANAGER',
        roleId: 'ROLE_MANAGER',
        branchId: branch1Id,
        allowedBranches: [branch1Id, branch2Id], // Manager gets access to two branches
        email: 'manager@test.com',
        phoneNumber: '0722222222',
        status: 'ACTIVE'
      },
      {
        username: 'test_branch_manager',
        password: defaultPassword,
        role: 'BRANCH_MANAGER',
        roleId: 'ROLE_BRANCH_MANAGER',
        branchId: branch1Id,
        email: 'bmanager@test.com',
        phoneNumber: '0733333333',
        status: 'ACTIVE'
      },
      {
        username: 'test_staff',
        password: defaultPassword,
        role: 'STAFF',
        roleId: 'ROLE_STAFF',
        branchId: branch1Id,
        email: 'staff@test.com',
        phoneNumber: '0744444444',
        status: 'ACTIVE'
      }
    ];

    for (const userData of testUsers) {
      const existing = await User.findOne({ username: userData.username });
      if (existing) {
        // Update existing
        await User.findByIdAndUpdate(existing._id, userData);
        console.log(`Updated existing user: ${userData.username}`);
      } else {
        // Create new
        await User.create(userData);
        console.log(`Created new user: ${userData.username}`);
      }
    }

    console.log('Seeding complete! Passwords are all "password123"');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding test users:', error);
    process.exit(1);
  }
};

seedTestUsers();
