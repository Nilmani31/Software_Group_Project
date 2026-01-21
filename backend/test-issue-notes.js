const mongoose = require('mongoose');
require('dotenv').config();

const IssueNote = require('./models/issueNotes');
const IssueNoteItem = require('./models/issueNoteItems');
const Stock = require('./models/stock');
const Item = require('./models/items');
const Branch = require('./models/branches');
const User = require('./models/users');

async function testIssueNotes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check existing data
    console.log('\n📊 Current Data Status:');
    const branchCount = await Branch.countDocuments();
    const userCount = await User.countDocuments();
    const itemCount = await Item.countDocuments();
    const stockCount = await Stock.countDocuments();
    const issueNoteCount = await IssueNote.countDocuments();
    
    console.log(`  Branches: ${branchCount}`);
    console.log(`  Users: ${userCount}`);
    console.log(`  Items: ${itemCount}`);
    console.log(`  Stock Records: ${stockCount}`);
    console.log(`  Issue Notes: ${issueNoteCount}`);

    // Get some sample data
    if (issueNoteCount > 0) {
      console.log('\n📝 Sample Issue Notes:');
      const sampleNotes = await IssueNote.find()
        .populate('fromBranchId', 'branchName')
        .populate('toBranchId', 'branchName')
        .populate('issuedBy', 'name')
        .limit(3)
        .lean();
      
      for (const note of sampleNotes) {
        const items = await IssueNoteItem.find({ issueNoteId: note._id })
          .populate('itemId', 'name');
        
        console.log(`\n  ${note.issueNoteNumber}:`);
        console.log(`    Status: ${note.status}`);
        console.log(`    From: ${note.fromBranchId?.branchName}`);
        console.log(`    To: ${note.toBranchId?.branchName || 'N/A'}`);
        console.log(`    Items: ${items.length}`);
        items.forEach(item => {
          console.log(`      - ${item.itemId?.name}: ${item.quantity}`);
        });
      }
    }

    // Check stock availability
    if (stockCount > 0) {
      console.log('\n📦 Sample Stock Records:');
      const sampleStock = await Stock.find()
        .populate('itemId', 'name')
        .populate('branchId', 'branchName')
        .limit(5)
        .lean();
      
      sampleStock.forEach(stock => {
        console.log(`  ${stock.itemId?.name} @ ${stock.branchId?.branchName}: ${stock.quantity}`);
      });
    }

    // Test fetching issue notes with all related data
    console.log('\n🔍 Testing Issue Notes API Response Format:');
    const testNote = await IssueNote.findOne()
      .populate('fromBranchId', 'branchName branchCode branch_name branch_code')
      .populate('toBranchId', 'branchName branchCode branch_name branch_code')
      .populate('issuedBy', 'name email username')
      .populate('approvedBy', 'name email username')
      .lean();
    
    if (testNote) {
      const items = await IssueNoteItem.find({ issueNoteId: testNote._id })
        .populate('itemId', 'name sku itemId unit')
        .populate('itemUnitId', 'unitName')
        .lean();
      
      console.log('  Issue Note Structure:');
      console.log('    ✓ issueNoteNumber:', testNote.issueNoteNumber);
      console.log('    ✓ status:', testNote.status);
      console.log('    ✓ fromBranch:', testNote.fromBranchId?.branchName || testNote.fromBranchId?.branch_name);
      console.log('    ✓ toBranch:', testNote.toBranchId?.branchName || testNote.toBranchId?.branch_name || 'N/A');
      console.log('    ✓ issuedBy:', testNote.issuedBy?.name || testNote.issuedBy?.username);
      console.log('    ✓ items:', items.length);
      
      if (items.length > 0) {
        console.log('\n  Item Structure:');
        const item = items[0];
        console.log('    ✓ itemId:', item.itemId?._id);
        console.log('    ✓ itemName:', item.itemId?.name);
        console.log('    ✓ quantity:', item.quantity);
        console.log('    ✓ unit:', item.itemId?.unit || item.itemUnitId?.unitName);
      }
    }

    console.log('\n✅ Test completed successfully!');
    console.log('\n📌 Next Steps:');
    console.log('  1. Make sure your backend is running: npm start');
    console.log('  2. Make sure your frontend is running: cd frontend && npm start');
    console.log('  3. Navigate to the Issue Notes page in the frontend');
    console.log('  4. Try creating a new issue note');
    console.log('  5. Try approving a pending issue note');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testIssueNotes();
