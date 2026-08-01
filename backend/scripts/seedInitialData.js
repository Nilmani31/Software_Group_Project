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

const branches = [
  {
    branchId: 'MAIN_BRANCH',
    branchName: 'Colombo Main Branch',
    branchCode: 'CMB',
    location: 'Colombo',
    city: 'Colombo',
    state: 'Western Province',
    address: 'Colombo Bartender & Barista School',
    phoneNumber: '0112345678',
    email: 'colombo@cbbs.lk',
    manager: 'Admin',
  },
  {
    branchId: 'TRAINING_BAR',
    branchName: 'Training Bar',
    branchCode: 'TBR',
    location: 'Colombo',
    city: 'Colombo',
    state: 'Western Province',
    address: 'CBBS Training Bar',
    phoneNumber: '0112345679',
    email: 'trainingbar@cbbs.lk',
    manager: 'To Be Assigned',
  },
  {
    branchId: 'TRAINING_CAFE',
    branchName: 'Training Cafe',
    branchCode: 'TCF',
    location: 'Colombo',
    city: 'Colombo',
    state: 'Western Province',
    address: 'CBBS Training Cafe',
    phoneNumber: '0112345680',
    email: 'trainingcafe@cbbs.lk',
    manager: 'To Be Assigned',
  },
];

const categoryNames = [
  ['Coffee Supplies', 'Coffee beans, powders, and cafe ingredients'],
  ['Bar Supplies', 'Bartender bottles, mixers, and bar stock'],
  ['Dairy', 'Milk and dairy products'],
  ['Consumables', 'Cups, napkins, straws, and disposable supplies'],
  ['Cleaning Supplies', 'Cleaning and sanitation inventory'],
  ['Equipment', 'Reusable tools and equipment'],
];

const supplierData = [
  {
    supplierCode: 'SUP-COFFEE-001',
    name: 'Ceylon Coffee Traders',
    contactPerson: 'Sales Team',
    phone: '0771234567',
    email: 'sales@ceyloncoffee.lk',
    address: 'Colombo',
  },
  {
    supplierCode: 'SUP-BAR-001',
    name: 'Island Bar Supplies',
    contactPerson: 'Operations',
    phone: '0772345678',
    email: 'orders@islandbar.lk',
    address: 'Colombo',
  },
  {
    supplierCode: 'SUP-GEN-001',
    name: 'CBBS General Supplier',
    contactPerson: 'Procurement',
    phone: '0773456789',
    email: 'supply@cbbs.lk',
    address: 'Colombo',
  },
];

const inventoryItems = [
  {
    sku: 'SKU-COF-001',
    name: 'Arabica Coffee Beans',
    category: 'Coffee Supplies',
    unit: 'kg',
    unitPrice: 3200,
    quantity: 25,
    minStock: 8,
    maxStock: 60,
    description: 'Whole arabica coffee beans for barista training',
  },
  {
    sku: 'SKU-COF-002',
    name: 'Robusta Coffee Beans',
    category: 'Coffee Supplies',
    unit: 'kg',
    unitPrice: 2400,
    quantity: 18,
    minStock: 6,
    maxStock: 50,
    description: 'Robusta beans for espresso blend practice',
  },
  {
    sku: 'SKU-DAI-001',
    name: 'Fresh Milk',
    category: 'Dairy',
    unit: 'ltr',
    unitPrice: 480,
    quantity: 36,
    minStock: 12,
    maxStock: 80,
    description: 'Fresh milk for steaming and latte art',
  },
  {
    sku: 'SKU-BAR-001',
    name: 'Vodka Training Bottle',
    category: 'Bar Supplies',
    unit: 'pcs',
    unitPrice: 4500,
    quantity: 10,
    minStock: 4,
    maxStock: 24,
    description: 'Bottle stock for bartender training',
  },
  {
    sku: 'SKU-BAR-002',
    name: 'Lime Juice',
    category: 'Bar Supplies',
    unit: 'ltr',
    unitPrice: 900,
    quantity: 16,
    minStock: 5,
    maxStock: 40,
    description: 'Lime juice for cocktails and mocktails',
  },
  {
    sku: 'SKU-CON-001',
    name: 'Paper Cups',
    category: 'Consumables',
    unit: 'pack',
    unitPrice: 650,
    quantity: 40,
    minStock: 15,
    maxStock: 120,
    description: 'Disposable cups for training sessions',
  },
  {
    sku: 'SKU-CON-002',
    name: 'Cocktail Napkins',
    category: 'Consumables',
    unit: 'pack',
    unitPrice: 420,
    quantity: 8,
    minStock: 10,
    maxStock: 60,
    description: 'Napkins for bar service practice',
  },
  {
    sku: 'SKU-CLE-001',
    name: 'Dishwashing Liquid',
    category: 'Cleaning Supplies',
    unit: 'ltr',
    unitPrice: 550,
    quantity: 0,
    minStock: 6,
    maxStock: 30,
    description: 'Cleaning liquid for daily operations',
  },
  {
    sku: 'SKU-EQP-001',
    name: 'Cocktail Shaker',
    category: 'Equipment',
    unit: 'pcs',
    unitPrice: 2800,
    quantity: 14,
    minStock: 5,
    maxStock: 30,
    description: 'Reusable cocktail shakers',
  },
  {
    sku: 'SKU-EQP-002',
    name: 'Milk Pitcher',
    category: 'Equipment',
    unit: 'pcs',
    unitPrice: 1600,
    quantity: 9,
    minStock: 5,
    maxStock: 24,
    description: 'Milk pitchers for latte art practice',
  },
];

const statusFor = (quantity, minStock) => {
  if (quantity <= 0) return 'out-of-stock';
  if (quantity <= Math.max(1, Math.floor(minStock / 2))) return 'critical';
  if (quantity <= minStock) return 'low';
  return 'in-stock';
};

async function upsertInitialData() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set. Add it to backend/.env.');
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
  });

  const roleDocs = [];
  for (const role of roles) {
    const doc = await Role.findOneAndUpdate(
      { roleId: role.roleId },
      { $set: { ...role, status: 'ACTIVE', updatedAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: false }
    );
    roleDocs.push(doc);
  }

  const branchDocs = [];
  for (const branch of branches) {
    const doc = await Branch.findOneAndUpdate(
      { branchId: branch.branchId },
      { $set: { ...branch, status: 'ACTIVE', updatedBy: 'SEED' } },
      { upsert: true, new: true, setDefaultsOnInsert: false }
    );
    branchDocs.push(doc);
  }

  const categoryDocs = new Map();
  for (const [name, description] of categoryNames) {
    const doc = await Category.findOneAndUpdate(
      { name },
      {
        $set: { name, description },
        $setOnInsert: {
          categoryId: `CAT_${name.replace(/\s+/g, '').toUpperCase()}`,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: false }
    );
    categoryDocs.set(name, doc);
  }

  for (const supplier of supplierData) {
    await Supplier.findOneAndUpdate(
      { supplierCode: supplier.supplierCode },
      { $set: { ...supplier, status: 'ACTIVE' } },
      { upsert: true, new: true, setDefaultsOnInsert: false }
    );
  }

  const adminPassword = await bcrypt.hash('Admin@123', 10);
  await User.findOneAndUpdate(
    { username: 'admin' },
    {
      $set: {
        email: 'admin@cbbs.lk',
        password: adminPassword,
        role: 'ADMIN',
        roleId: 'ROLE_ADMIN',
        branchId: 'MAIN_BRANCH',
        allowedBranches: branches.map((branch) => branch.branchId),
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

  for (const itemData of inventoryItems) {
    const category = categoryDocs.get(itemData.category);
    const mainQty = Math.max(0, Math.floor(itemData.quantity * 0.6));
    const barQty = Math.max(0, Math.floor(itemData.quantity * 0.25));
    const cafeQty = Math.max(0, itemData.quantity - mainQty - barQty);

    const item = await Item.findOneAndUpdate(
      { sku: itemData.sku },
      {
        $set: {
          sku: itemData.sku,
          name: itemData.name,
          category: category._id,
          unit: itemData.unit,
          quantity: itemData.quantity,
          branch: 'Colombo Main Branch',
          status: itemData.quantity <= itemData.minStock ? 'low' : 'normal',
          minStock: itemData.minStock,
          maxStock: itemData.maxStock,
          description: itemData.description,
        },
        $setOnInsert: {
          itemId: `ITEM_${itemData.sku.replace(/[^A-Z0-9]/gi, '_').toUpperCase()}`,
        },
      },
      { upsert: true, new: true }
    );

    const itemUnit = await ItemUnit.findOneAndUpdate(
      { itemId: item._id, name: itemData.unit },
      {
        $set: {
          name: itemData.unit,
          itemId: item._id,
          unit: itemData.unit,
          unitValue: 1,
          unitsPerPack: 1,
          unitPrice: itemData.unitPrice,
          description: `Default ${itemData.unit} unit for ${itemData.name}`,
          isActive: true,
        },
        $setOnInsert: {
          unitId: `UNIT_${itemData.sku.replace(/[^A-Z0-9]/gi, '_').toUpperCase()}`,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: false }
    );

    const stockPlan = [
      [branchDocs[0], mainQty],
      [branchDocs[1], barQty],
      [branchDocs[2], cafeQty],
    ];

    for (const [branch, quantity] of stockPlan) {
      await Stock.findOneAndUpdate(
        {
          itemId: item._id,
          itemUnitId: itemUnit._id,
          branchId: branch._id,
        },
        {
          $set: {
            itemId: item._id,
            itemUnitId: itemUnit._id,
            branchId: branch._id,
            quantity,
            minStock: itemData.minStock,
            maxStock: itemData.maxStock,
            reorderLevel: itemData.minStock,
            reorderPoint: itemData.minStock,
            minStockLevel: itemData.minStock,
            maxStockLevel: itemData.maxStock,
            status: statusFor(quantity, itemData.minStock),
            lastRestockDate: new Date(),
            lastRestockedDate: new Date(),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
  }

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
