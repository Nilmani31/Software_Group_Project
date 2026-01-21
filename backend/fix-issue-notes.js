const mongoose = require('mongoose');
require('dotenv').config();

async function fixIssueNotes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Drop the entire collection to start fresh
    try {
      await mongoose.connection.db.dropCollection('issuenotes');
      console.log('✅ Dropped issuenotes collection completely');
    } catch (err) {
      console.log('ℹ️  Collection does not exist or already dropped');
    }

    console.log('✅ All done! The collection has been reset.');
    console.log('✅ Restart your backend server and try again.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixIssueNotes();
