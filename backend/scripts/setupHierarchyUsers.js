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

async function setupHierarchyUsers() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI not found in backend/.env');
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
  });

  console.log('Connected to MongoDB.');

  const branches = await Branch.find({ status: 'ACTIVE' }).lean();
  console.log(`Found ${branches.length} branches:`, branches.map(b => `${b.branchCode}: ${b.branchName}`));

  const allBranchIds = branches.map(b => b._id.toString());
  
  const branchByCode = {};
  branches.forEach(b => {
    branchByCode[b.branchCode] = b;
  });

  const colombo = branchByCode['CMB'] || branches[0];
  const kandy = branchByCode['KND'] || branches[1];
  const galle = branchByCode['GAL'] || branches[2];
  const negombo = branchByCode['NEG'] || branches[3];
  const cwh = branchByCode['CWH'] || branches[4];
  const anuradhapura = branchByCode['B06'] || branches[5];

  // Western cluster: Colombo, Negombo, Central Warehouse
  const westernBranchIds = [colombo, negombo, cwh].filter(Boolean).map(b => b._id.toString());
  
  // Regional cluster: Kandy, Galle, Anuradhapura
  const regionalBranchIds = [kandy, galle, anuradhapura].filter(Boolean).map(b => b._id.toString());

  // Define target users according to the desired business architecture
  const targetUsers = [
    // 1. GLOBAL ADMIN (1 user - Access to ALL branches)
    {
      username: 'admin',
      role: 'ADMIN',
      roleId: 'ROLE_ADMIN',
      branchId: colombo._id.toString(),
      allowedBranches: allBranchIds,
      permissions: DEFAULT_ROLE_PERMS.ROLE_ADMIN,
      passwordPlain: PASSWORDS.ADMIN,
      email: 'admin@cbbs.lk',
      phoneNumber: '0771000001',
      description: 'System Administrator (Full access to all branches)'
    },

    // 2. GLOBAL DIRECTOR (1 user - Access to ALL branches)
    {
      username: 'director',
      role: 'DIRECTOR',
      roleId: 'ROLE_DIRECTOR',
      branchId: colombo._id.toString(),
      allowedBranches: allBranchIds,
      permissions: DEFAULT_ROLE_PERMS.ROLE_DIRECTOR,
      passwordPlain: PASSWORDS.DIRECTOR,
      email: 'director@cbbs.lk',
      phoneNumber: '0771000002',
      description: 'Executive Director (Full access to all branches)'
    },

    // 3. MANAGERS (Can access multiple branches)
    {
      username: 'manager',
      role: 'MANAGER',
      roleId: 'ROLE_MANAGER',
      branchId: colombo._id.toString(),
      allowedBranches: allBranchIds, // Access to ALL branches
      permissions: DEFAULT_ROLE_PERMS.ROLE_MANAGER,
      passwordPlain: PASSWORDS.MANAGER,
      email: 'manager@cbbs.lk',
      phoneNumber: '0771000003',
      description: 'General Operations Manager (Multi-Branch: ALL branches)'
    },
    {
      username: 'manager_western',
      role: 'MANAGER',
      roleId: 'ROLE_MANAGER',
      branchId: colombo._id.toString(),
      allowedBranches: westernBranchIds, // Access to Western cluster (Colombo, Negombo, Central Warehouse)
      permissions: DEFAULT_ROLE_PERMS.ROLE_MANAGER,
      passwordPlain: PASSWORDS.MANAGER,
      email: 'manager.western@cbbs.lk',
      phoneNumber: '0771000004',
      description: 'Western Area Manager (Multi-Branch: Colombo, Negombo, Warehouse)'
    },
    {
      username: 'manager_regional',
      role: 'MANAGER',
      roleId: 'ROLE_MANAGER',
      branchId: kandy ? kandy._id.toString() : colombo._id.toString(),
      allowedBranches: regionalBranchIds, // Access to Regional cluster (Kandy, Galle, Anuradhapura)
      permissions: DEFAULT_ROLE_PERMS.ROLE_MANAGER,
      passwordPlain: PASSWORDS.MANAGER,
      email: 'manager.regional@cbbs.lk',
      phoneNumber: '0771000005',
      description: 'Outstation Area Manager (Multi-Branch: Kandy, Galle, Anuradhapura)'
    },

    // 4. BRANCH MANAGERS (1 per branch)
    {
      username: 'bm_colombo',
      role: 'BRANCH_MANAGER',
      roleId: 'ROLE_BRANCH_MANAGER',
      branchId: colombo._id.toString(),
      allowedBranches: [colombo._id.toString()],
      permissions: DEFAULT_ROLE_PERMS.ROLE_BRANCH_MANAGER,
      passwordPlain: PASSWORDS.BRANCH_MANAGER,
      email: 'bm_colombo@cbbs.lk',
      phoneNumber: '0771000011',
      description: 'Branch Manager - Colombo Main Branch'
    },
    {
      username: 'bm_kandy',
      role: 'BRANCH_MANAGER',
      roleId: 'ROLE_BRANCH_MANAGER',
      branchId: kandy._id.toString(),
      allowedBranches: [kandy._id.toString()],
      permissions: DEFAULT_ROLE_PERMS.ROLE_BRANCH_MANAGER,
      passwordPlain: PASSWORDS.BRANCH_MANAGER,
      email: 'bm_kandy@cbbs.lk',
      phoneNumber: '0771000012',
      description: 'Branch Manager - Kandy Heritage Branch'
    },
    {
      username: 'bm_galle',
      role: 'BRANCH_MANAGER',
      roleId: 'ROLE_BRANCH_MANAGER',
      branchId: galle._id.toString(),
      allowedBranches: [galle._id.toString()],
      permissions: DEFAULT_ROLE_PERMS.ROLE_BRANCH_MANAGER,
      passwordPlain: PASSWORDS.BRANCH_MANAGER,
      email: 'bm_galle@cbbs.lk',
      phoneNumber: '0771000013',
      description: 'Branch Manager - Galle Coastal Branch'
    },
    {
      username: 'bm_negombo',
      role: 'BRANCH_MANAGER',
      roleId: 'ROLE_BRANCH_MANAGER',
      branchId: negombo._id.toString(),
      allowedBranches: [negombo._id.toString()],
      permissions: DEFAULT_ROLE_PERMS.ROLE_BRANCH_MANAGER,
      passwordPlain: PASSWORDS.BRANCH_MANAGER,
      email: 'bm_negombo@cbbs.lk',
      phoneNumber: '0771000014',
      description: 'Branch Manager - Negombo Training Academy'
    },
    {
      username: 'bm_cwh',
      role: 'BRANCH_MANAGER',
      roleId: 'ROLE_BRANCH_MANAGER',
      branchId: cwh._id.toString(),
      allowedBranches: [cwh._id.toString()],
      permissions: DEFAULT_ROLE_PERMS.ROLE_BRANCH_MANAGER,
      passwordPlain: PASSWORDS.BRANCH_MANAGER,
      email: 'bm_cwh@cbbs.lk',
      phoneNumber: '0771000015',
      description: 'Warehouse Manager - CBBS Central Warehouse'
    },
    {
      username: 'bm_anuradhapura',
      role: 'BRANCH_MANAGER',
      roleId: 'ROLE_BRANCH_MANAGER',
      branchId: anuradhapura._id.toString(),
      allowedBranches: [anuradhapura._id.toString()],
      permissions: DEFAULT_ROLE_PERMS.ROLE_BRANCH_MANAGER,
      passwordPlain: PASSWORDS.BRANCH_MANAGER,
      email: 'bm_anuradhapura@cbbs.lk',
      phoneNumber: '0771000016',
      description: 'Branch Manager - Anuradhapura Main'
    },

    // 5. STAFF / OPERATIONAL USERS (Branch-wise)
    {
      username: 'staff_colombo',
      role: 'STAFF',
      roleId: 'ROLE_STAFF',
      branchId: colombo._id.toString(),
      allowedBranches: [colombo._id.toString()],
      permissions: DEFAULT_ROLE_PERMS.ROLE_STAFF,
      passwordPlain: PASSWORDS.STAFF,
      email: 'staff_colombo@cbbs.lk',
      phoneNumber: '0771000021',
      description: 'Staff - Colombo Main Branch'
    },
    {
      username: 'staff_kandy',
      role: 'STAFF',
      roleId: 'ROLE_STAFF',
      branchId: kandy._id.toString(),
      allowedBranches: [kandy._id.toString()],
      permissions: DEFAULT_ROLE_PERMS.ROLE_STAFF,
      passwordPlain: PASSWORDS.STAFF,
      email: 'staff_kandy@cbbs.lk',
      phoneNumber: '0771000022',
      description: 'Staff - Kandy Heritage Branch'
    },
    {
      username: 'staff_galle',
      role: 'STAFF',
      roleId: 'ROLE_STAFF',
      branchId: galle._id.toString(),
      allowedBranches: [galle._id.toString()],
      permissions: DEFAULT_ROLE_PERMS.ROLE_STAFF,
      passwordPlain: PASSWORDS.STAFF,
      email: 'staff_galle@cbbs.lk',
      phoneNumber: '0771000023',
      description: 'Staff - Galle Coastal Branch'
    },
    {
      username: 'staff_negombo',
      role: 'STAFF',
      roleId: 'ROLE_STAFF',
      branchId: negombo._id.toString(),
      allowedBranches: [negombo._id.toString()],
      permissions: DEFAULT_ROLE_PERMS.ROLE_STAFF,
      passwordPlain: PASSWORDS.STAFF,
      email: 'staff_negombo@cbbs.lk',
      phoneNumber: '0771000024',
      description: 'Staff - Negombo Training Academy'
    },
    {
      username: 'staff_cwh',
      role: 'STAFF',
      roleId: 'ROLE_STAFF',
      branchId: cwh._id.toString(),
      allowedBranches: [cwh._id.toString()],
      permissions: DEFAULT_ROLE_PERMS.ROLE_STAFF,
      passwordPlain: PASSWORDS.STAFF,
      email: 'staff_cwh@cbbs.lk',
      phoneNumber: '0771000025',
      description: 'Staff - CBBS Central Warehouse'
    },
    {
      username: 'staff_anuradhapura',
      role: 'STAFF',
      roleId: 'ROLE_STAFF',
      branchId: anuradhapura._id.toString(),
      allowedBranches: [anuradhapura._id.toString()],
      permissions: DEFAULT_ROLE_PERMS.ROLE_STAFF,
      passwordPlain: PASSWORDS.STAFF,
      email: 'staff_anuradhapura@cbbs.lk',
      phoneNumber: '0771000026',
      description: 'Staff - Anuradhapura Main'
    }
  ];

  // Clean up unwanted redundant accounts created in previous test
  const redundantUsernames = [
    'admin_colombo', 'admin_kandy', 'admin_galle', 'admin_negombo', 'admin_cwh', 'admin_anuradhapura',
    'director_colombo', 'director_kandy', 'director_galle', 'director_negombo', 'director_cwh', 'director_anuradhapura',
    'manager_colombo', 'manager_kandy', 'manager_galle', 'manager_negombo', 'manager_cwh', 'manager_anuradhapura',
    'branch_manager', 'staff'
  ];

  console.log('Cleaning up redundant temporary users...');
  const deleteResult = await User.deleteMany({ username: { $in: redundantUsernames } });
  console.log(`Deleted ${deleteResult.deletedCount} redundant users.`);

  // Upsert the defined users
  console.log(`Upserting ${targetUsers.length} standardized users...`);
  const finalSummary = [];

  for (const item of targetUsers) {
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
      existing.allowedBranches = item.allowedBranches;
      existing.permissions = item.permissions;
      existing.phoneNumber = item.phoneNumber;
      existing.status = 'ACTIVE';
      existing.updatedBy = 'HIERARCHY_SETUP';
      await existing.save();

      finalSummary.push({
        status: 'UPDATED',
        role: item.role,
        username: item.username,
        password: item.passwordPlain,
        description: item.description,
        branchCount: item.allowedBranches.length
      });
    } else {
      await User.create({
        username: item.username,
        email: item.email,
        password: hashedPassword,
        role: item.role,
        roleId: item.roleId,
        branchId: item.branchId,
        allowedBranches: item.allowedBranches,
        permissions: item.permissions,
        phoneNumber: item.phoneNumber,
        status: 'ACTIVE',
        createdBy: 'HIERARCHY_SETUP',
        updatedBy: 'HIERARCHY_SETUP'
      });

      finalSummary.push({
        status: 'CREATED',
        role: item.role,
        username: item.username,
        password: item.passwordPlain,
        description: item.description,
        branchCount: item.allowedBranches.length
      });
    }
  }

  console.log('\n======================================================');
  console.log('ROLE & BRANCH HIERARCHY SETUP COMPLETED');
  console.log('======================================================\n');
  console.table(finalSummary);
}

setupHierarchyUsers()
  .catch(err => {
    console.error('Setup failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
