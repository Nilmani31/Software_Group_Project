const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const User = require('../models/users');
const Branch = require('../models/branches');
const Role = require('../models/roles');

async function seedAllRoleUsers() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set in backend/.env');
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
  });

  console.log('Connected to MongoDB.');

  // Find Colombo Main Branch (B-01)
  let targetBranch = await Branch.findOne({
    $or: [
      { branchCode: 'CMB' },
      { branchId: 'B-01' },
      { branchName: { $regex: /colombo/i } }
    ]
  });

  if (!targetBranch) {
    // Fallback to first available branch
    targetBranch = await Branch.findOne({});
  }

  if (!targetBranch) {
    throw new Error('No branches found in database! Please seed branches first.');
  }

  console.log(`Target Branch selected: "${targetBranch.branchName}" (ID: ${targetBranch.branchId}, ObjectId: ${targetBranch._id})`);

  const branchObjectIdStr = targetBranch._id.toString();

  // Define users for all 5 roles
  const usersToSeed = [
    {
      username: 'admin',
      role: 'ADMIN',
      roleId: 'ROLE_ADMIN',
      email: 'admin@cbbs.lk',
      phoneNumber: '0771110001',
      passwordPlain: 'Admin@123',
      permissions: ['ALL'],
      allowedBranches: [branchObjectIdStr]
    },
    {
      username: 'director',
      role: 'DIRECTOR',
      roleId: 'ROLE_DIRECTOR',
      email: 'director@cbbs.lk',
      phoneNumber: '0771110002',
      passwordPlain: 'Director@123',
      permissions: ['USERS', 'INVENTORY', 'PURCHASE_ORDERS', 'GOODS_RECEIVED', 'ISSUE_NOTES', 'REPORTS', 'BRANCHES', 'CATEGORIES'],
      allowedBranches: [branchObjectIdStr]
    },
    {
      username: 'manager',
      role: 'MANAGER',
      roleId: 'ROLE_MANAGER',
      email: 'manager@cbbs.lk',
      phoneNumber: '0771110003',
      passwordPlain: 'Manager@123',
      permissions: ['INVENTORY', 'PURCHASE_ORDERS', 'GOODS_RECEIVED', 'ISSUE_NOTES', 'REPORTS'],
      allowedBranches: [branchObjectIdStr]
    },
    {
      username: 'branch_manager',
      role: 'BRANCH_MANAGER',
      roleId: 'ROLE_BRANCH_MANAGER',
      email: 'branchmanager@cbbs.lk',
      phoneNumber: '0771110004',
      passwordPlain: 'Branch@123',
      permissions: ['INVENTORY', 'PURCHASE_ORDERS', 'GOODS_RECEIVED', 'ISSUE_NOTES'],
      allowedBranches: [branchObjectIdStr]
    },
    {
      username: 'staff',
      role: 'STAFF',
      roleId: 'ROLE_STAFF',
      email: 'staff@cbbs.lk',
      phoneNumber: '0771110005',
      passwordPlain: 'Staff@123',
      permissions: ['INVENTORY', 'GOODS_RECEIVED'],
      allowedBranches: [branchObjectIdStr]
    }
  ];

  const results = [];

  for (const u of usersToSeed) {
    const hashedPassword = await bcrypt.hash(u.passwordPlain, 10);

    // Check if user exists by username or email
    let existingUser = await User.findOne({
      $or: [{ username: u.username }, { email: u.email }]
    });

    if (existingUser) {
      existingUser.username = u.username;
      existingUser.email = u.email;
      existingUser.password = hashedPassword;
      existingUser.role = u.role;
      existingUser.roleId = u.roleId;
      existingUser.branchId = branchObjectIdStr;
      existingUser.allowedBranches = u.allowedBranches;
      existingUser.permissions = u.permissions;
      existingUser.phoneNumber = u.phoneNumber;
      existingUser.status = 'ACTIVE';
      existingUser.updatedBy = 'SEED_SCRIPT';
      await existingUser.save();

      results.push({
        status: 'UPDATED',
        username: u.username,
        role: u.role,
        roleId: u.roleId,
        password: u.passwordPlain,
        email: u.email,
        branch: targetBranch.branchName,
        branchId: branchObjectIdStr
      });
    } else {
      const newUser = await User.create({
        username: u.username,
        email: u.email,
        password: hashedPassword,
        role: u.role,
        roleId: u.roleId,
        branchId: branchObjectIdStr,
        allowedBranches: u.allowedBranches,
        permissions: u.permissions,
        phoneNumber: u.phoneNumber,
        status: 'ACTIVE',
        createdBy: 'SEED_SCRIPT',
        updatedBy: 'SEED_SCRIPT'
      });

      results.push({
        status: 'CREATED',
        username: u.username,
        role: u.role,
        roleId: u.roleId,
        password: u.passwordPlain,
        email: u.email,
        branch: targetBranch.branchName,
        branchId: branchObjectIdStr
      });
    }
  }

  console.log('\n--- ALL ROLE USERS SEEDED SUCCESSFULLY ---');
  console.table(results);
}

seedAllRoleUsers()
  .catch((err) => {
    console.error('Error seeding users:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
