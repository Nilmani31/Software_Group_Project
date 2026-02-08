const mongoose = require('mongoose');
require('dotenv').config();

const seedRoles = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const Role = require('./models/roles');

    // Clear existing roles
    await Role.deleteMany({});
    console.log('🗑️ Cleared existing roles');

    // Create roles
    const roles = [
      {
        roleId: 'ROLE_ADMIN',
        roleName: 'ADMIN',
        description: 'Administrator with full access',
        permissions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE_USERS', 'MANAGE_ROLES'],
        status: 'ACTIVE'
      },
      {
        roleId: 'ROLE_DIRECTOR',
        roleName: 'DIRECTOR',
        description: 'Director with management access',
        permissions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE_USERS'],
        status: 'ACTIVE'
      },
      {
        roleId: 'ROLE_MANAGER',
        roleName: 'MANAGER',
        description: 'Manager with standard access',
        permissions: ['CREATE', 'READ', 'UPDATE'],
        status: 'ACTIVE'
      },
      {
        roleId: 'ROLE_BRANCH_MANAGER',
        roleName: 'BRANCH_MANAGER',
        description: 'Branch Manager with branch-level access',
        permissions: ['READ', 'UPDATE'],
        status: 'ACTIVE'
      },
      {
        roleId: 'ROLE_STAFF',
        roleName: 'STAFF',
        description: 'Staff with basic access',
        permissions: ['READ'],
        status: 'ACTIVE'
      }
    ];

    const createdRoles = await Role.insertMany(roles);
    console.log('✅ Roles created successfully:');
    createdRoles.forEach(role => {
      console.log(`  • ${role.roleName} (${role.description})`);
    });

    console.log('\n✅ Role seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding roles:', error.message);
    process.exit(1);
  }
};

seedRoles();
