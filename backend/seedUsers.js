const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const seedUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const User = require('./models/users');

    // Clear existing users
    await User.deleteMany({});
    console.log('🗑️ Cleared existing users');

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    // Create admin user
    const adminUser = new User({
      userId: 'ADMIN_001',
      username: 'admin',
      email: 'admin@cbbs.com',
      password: hashedPassword,
      roleId: 'ADMIN',
      role: 'ADMIN',
      branchId: 'MAIN_BRANCH',
      phoneNumber: '+94771234567',
      status: 'ACTIVE'
    });

    await adminUser.save();
    console.log('✅ Admin user created:');
    console.log(`  Username: admin`);
    console.log(`  Password: admin123`);

    console.log('\n✅ User seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding users:', error.message);
    process.exit(1);
  }
};

seedUsers();
