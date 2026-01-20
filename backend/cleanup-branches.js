const mongoose = require('mongoose');
const Branch = require('./models/branches');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/inventory_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB');
  cleanupBranches();
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

async function cleanupBranches() {
  try {
    // Delete all existing branches to clear corrupted data
    const result = await Branch.deleteMany({});
    console.log(`Deleted ${result.deletedCount} corrupted branches`);
    
    // Create fresh branches
    const freshBranches = [
      {
        branchName: 'Main Campus - Colombo',
        branchCode: 'MAIN001',
        location: 'Colombo',
        city: 'Colombo',
        state: 'Western Province',
        address: 'Main Street, Colombo',
        phoneNumber: '0112345678',
        email: 'colombo@company.com',
        manager: 'System Administrator',
        status: 'ACTIVE'
      },
      {
        branchName: 'Kandy Branch',
        branchCode: 'KAN001',
        location: 'Kandy',
        city: 'Kandy',
        state: 'Central Province',
        address: 'Kandy Road, Kandy',
        phoneNumber: '0812234567',
        email: 'kandy@company.com',
        manager: 'System Administrator',
        status: 'ACTIVE'
      },
      {
        branchName: 'Galle Branch',
        branchCode: 'GAL001',
        location: 'Galle',
        city: 'Galle',
        state: 'Southern Province',
        address: 'Main Street, Galle',
        phoneNumber: '0912123456',
        email: 'galle@company.com',
        manager: 'System Administrator',
        status: 'ACTIVE'
      }
    ];
    
    const inserted = await Branch.insertMany(freshBranches);
    console.log(`Created ${inserted.length} fresh branches:`);
    inserted.forEach(b => console.log(`- ${b.branchName}`));
    
    console.log('Cleanup completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Cleanup error:', err);
    process.exit(1);
  }
}
