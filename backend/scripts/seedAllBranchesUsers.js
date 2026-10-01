const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const User = require('../models/users');
const Branch = require('../models/branches');

const DEFAULT_ROLE_PERMS = {
  ROLE_ADMIN: ['ALL'],
  ROLE_DIRECTOR: ['USERS', 'INVENTORY', 'PURCHASE_ORDERS', 'GOODS_RECEIVED', 'ISSUE_NOTES', 'REPORTS', 'BRANCHES', 'CATEGORIES'],
  ROLE_MANAGER: ['INVENTORY', 'PURCHASE_ORDERS', 'GOODS_RECEIVED', 'ISSUE_NOTES', 'REPORTS'],
  ROLE_BRANCH_MANAGER: ['INVENTORY', 'PURCHASE_ORDERS', 'GOODS_RECEIVED', 'ISSUE_NOTES'],
  ROLE_STAFF: ['INVENTORY', 'GOODS_RECEIVED']
};

const PASSWORDS = {
  ADMIN: 'Admin@123',
  DIRECTOR: 'Director@123',
  MANAGER: 'Manager@123',
  BRANCH_MANAGER: 'Branch@123',
  STAFF: 'Staff@123'
};

async function seedAllBranchesUsers() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI not found in backend/.env');
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
  });

  console.log('Connected to MongoDB.');

  const branches = await Branch.find({ status: 'ACTIVE' }).lean();
  console.log(`Found ${branches.length} active branches.`);

  // Map branch key names for easy usernames
  const branchKeyMap = {
    'CMB': 'colombo',
    'KND': 'kandy',
    'GAL': 'galle',
    'NEG': 'negombo',
    'CWH': 'cwh',
    'B06': 'anuradhapura'
  };

  const roles = [
    { role: 'ADMIN', roleId: 'ROLE_ADMIN', prefix: 'admin' },
    { role: 'DIRECTOR', roleId: 'ROLE_DIRECTOR', prefix: 'director' },
    { role: 'MANAGER', roleId: 'ROLE_MANAGER', prefix: 'manager' },
    { role: 'BRANCH_MANAGER', roleId: 'ROLE_BRANCH_MANAGER', prefix: 'bm' },
    { role: 'STAFF', roleId: 'ROLE_STAFF', prefix: 'staff' },
  ];

  let phoneCounter = 1000;
  const userList = [];

  // 1. Root default users
  for (const r of roles) {
    phoneCounter++;
    userList.push({
      username: r.role === 'BRANCH_MANAGER' ? 'branch_manager' : r.prefix,
      role: r.role,
      roleId: r.roleId,
      branchId: branches[0]._id.toString(),
      branchName: branches[0].branchName,
      branchCode: branches[0].branchCode,
      passwordPlain: PASSWORDS[r.role],
      email: `${r.prefix}@cbbs.lk`,
      phoneNumber: `0771${String(phoneCounter).padStart(6, '0')}`,
      permissions: DEFAULT_ROLE_PERMS[r.roleId]
    });
  }

  // 2. Branch-specific users for each active branch
  for (const b of branches) {
    const slug = branchKeyMap[b.branchCode] || b.branchCode.toLowerCase();
    for (const r of roles) {
      const username = `${r.prefix}_${slug}`;
      phoneCounter++;
      userList.push({
        username,
        role: r.role,
        roleId: r.roleId,
        branchId: b._id.toString(),
        branchName: b.branchName,
        branchCode: b.branchCode,
        passwordPlain: PASSWORDS[r.role],
        email: `${username}@cbbs.lk`,
        phoneNumber: `0771${String(phoneCounter).padStart(6, '0')}`,
        permissions: DEFAULT_ROLE_PERMS[r.roleId]
      });
    }
  }

  console.log(`Upserting ${userList.length} users into database...`);

  const createdRecords = [];

  for (const item of userList) {
    const hashedPassword = await bcrypt.hash(item.passwordPlain, 10);

    let existing = await User.findOne({
      $or: [{ username: item.username }, { email: item.email }]
    });

    if (existing) {
      existing.username = item.username;
      existing.email = item.email;
      existing.password = hashedPassword;
      existing.role = item.role;
      existing.roleId = item.roleId;
      existing.branchId = item.branchId;
      existing.allowedBranches = [item.branchId];
      existing.permissions = item.permissions;
      existing.phoneNumber = item.phoneNumber;
      existing.status = 'ACTIVE';
      existing.updatedBy = 'ALL_BRANCH_SEEDER';
      await existing.save();

      createdRecords.push({
        Status: 'UPDATED',
        Branch: `${item.branchName} (${item.branchCode})`,
        Role: item.role,
        Username: item.username,
        Password: item.passwordPlain,
        Email: item.email
      });
    } else {
      await User.create({
        username: item.username,
        email: item.email,
        password: hashedPassword,
        role: item.role,
        roleId: item.roleId,
        branchId: item.branchId,
        allowedBranches: [item.branchId],
        permissions: item.permissions,
        phoneNumber: item.phoneNumber,
        status: 'ACTIVE',
        createdBy: 'ALL_BRANCH_SEEDER',
        updatedBy: 'ALL_BRANCH_SEEDER'
      });

      createdRecords.push({
        Status: 'CREATED',
        Branch: `${item.branchName} (${item.branchCode})`,
        Role: item.role,
        Username: item.username,
        Password: item.passwordPlain,
        Email: item.email
      });
    }
  }

  console.log('\n======================================================');
  console.log(`SUCCESSFULLY PROVISIONED ${createdRecords.length} USERS ACROSS ALL BRANCHES`);
  console.log('======================================================\n');
  console.table(createdRecords);
}

seedAllBranchesUsers()
  .catch(err => {
    console.error('Failed to seed users:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
