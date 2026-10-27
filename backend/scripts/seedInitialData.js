const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const User = require('../models/users');
const Role = require('../models/roles');
const Branch = require('../models/branches');
const Category = require('../models/categories');
const Supplier = require('../models/suppliers');
const Item = require('../models/items');
const ItemUnit = require('../models/itemUnits');
const Stock = require('../models/stock');

const roles = [
  {
    roleId: 'ROLE_ADMIN',
    roleName: 'Admin',
    description: 'Full system access',
    permissions: ['ALL'],
  },
  {
    roleId: 'ROLE_DIRECTOR',
    roleName: 'Director',
    description: 'Executive access across branches',
    permissions: ['DASHBOARD', 'REPORTS', 'INVENTORY', 'PURCHASE_ORDERS', 'USERS'],
  },
  {
    roleId: 'ROLE_MANAGER',
    roleName: 'Manager',
    description: 'Manage inventory and operations',
    permissions: ['DASHBOARD', 'INVENTORY', 'PURCHASE_ORDERS', 'ISSUE_NOTES'],
  },
  {
    roleId: 'ROLE_BRANCH_MANAGER',
    roleName: 'Branch Manager',
    description: 'Manage assigned branch inventory',
    permissions: ['DASHBOARD', 'INVENTORY', 'PURCHASE_ORDERS', 'ISSUE_NOTES'],
  },
  {
    roleId: 'ROLE_STAFF',
    roleName: 'Staff',
    description: 'Operational access',
    permissions: ['DASHBOARD', 'INVENTORY', 'GOODS_RECEIVED'],
  },
];

const categoryNames = [
  ['Coffee Supplies', 'Coffee beans, powders, and cafe ingredients'],
  ['Bar Supplies', 'Bartender bottles, mixers, and bar stock'],
  ['Dairy', 'Milk and dairy products'],
  ['Consumables', 'Cups, napkins, straws, and disposable supplies'],
  ['Cleaning Supplies', 'Cleaning and sanitation inventory'],
  ['Equipment', 'Reusable tools and equipment'],
  ['Packaging', 'Bags, cup sleeves, retail coffee pouches, and packaging materials'],
];

async function upsertInitialData() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set. Add it to backend/.env.');
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
  });

  // Seed system roles
  for (const role of roles) {
    await Role.findOneAndUpdate(
      { roleId: role.roleId },
      { $set: { ...role, status: 'ACTIVE', updatedAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: false }
    );
  }

  // Seed system categories
  for (const [name, description] of categoryNames) {
    await Category.findOneAndUpdate(
      { name },
      {
        $set: { name, description },
        $setOnInsert: {
          categoryId: `CAT_${name.replace(/\s+/g, '').toUpperCase()}`,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: false }
    );
  }

  // Seed admin user for system access
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  await User.findOneAndUpdate(
    { username: 'admin' },
    {
      $set: {
        email: 'admin@cbbs.lk',
        password: adminPassword,
        role: 'ADMIN',
        roleId: 'ROLE_ADMIN',
        phoneNumber: '0000000000',
        status: 'ACTIVE',
        updatedBy: 'SEED',
      },
      $setOnInsert: {
        createdBy: 'SEED',
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const counts = {};
  for (const model of [
    ['roles', Role],
    ['branches', Branch],
    ['categories', Category],
    ['suppliers', Supplier],
    ['users', User],
    ['items', Item],
    ['itemunits', ItemUnit],
    ['stocks', Stock],
  ]) {
    counts[model[0]] = await model[1].countDocuments();
  }

  console.log(JSON.stringify({ success: true, counts }, null, 2));
}

upsertInitialData()
  .catch((error) => {
    console.error('Seed failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
