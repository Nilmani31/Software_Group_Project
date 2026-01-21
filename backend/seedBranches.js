const mongoose = require('mongoose');
require('dotenv').config();

const seedBranches = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const Branch = require('./models/branches');

    // Check if branches already exist
    const count = await Branch.countDocuments();
    if (count > 0) {
      console.log(`✅ Branches already exist: ${count} branches found`);
      const branches = await Branch.find().select('branchName branchCode location city phoneNumber email');
      console.log('\n📋 Current Branches:');
      branches.forEach((b, idx) => {
        console.log(`${idx + 1}. ${b.branchName} (${b.branchCode}) - ${b.city}`);
      });
      process.exit(0);
    }

    // Sample branches to seed
    const sampleBranches = [
      {
        branchName: 'CBBS Colombo',
        branchCode: 'CMB001',
        location: 'Colombo Fort',
        city: 'Colombo',
        state: 'Western',
        address: '123 Main Street, Colombo Fort, Colombo 01',
        phoneNumber: '0112434567',
        email: 'colombo@cbbs.lk',
        manager: 'Rajesh Kumar',
        status: 'ACTIVE'
      },
      {
        branchName: 'CBBS Galle',
        branchCode: 'GAL002',
        location: 'Galle City',
        city: 'Galle',
        state: 'Southern',
        address: '456 Beach Road, Galle City, Galle 80000',
        phoneNumber: '0912234567',
        email: 'galle@cbbs.lk',
        manager: 'Amara Silva',
        status: 'ACTIVE'
      },
      {
        branchName: 'CBBS Kandy',
        branchCode: 'KDY003',
        location: 'Kandy City',
        city: 'Kandy',
        state: 'Central',
        address: '789 Temple Street, Kandy City, Kandy 20000',
        phoneNumber: '0812156789',
        email: 'kandy@cbbs.lk',
        manager: 'Nimal Perera',
        status: 'ACTIVE'
      }
    ];

    const created = await Branch.insertMany(sampleBranches);
    console.log(`\n✅ Successfully seeded ${created.length} branches:`);
    created.forEach((branch, idx) => {
      console.log(`${idx + 1}. ${branch.branchName} (${branch.branchCode}) - ${branch.city}`);
    });

    console.log('\n✅ Done! Branches are now available in the system.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

seedBranches();
