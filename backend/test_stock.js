const mongoose = require('mongoose');
const Stock = require('./models/stock');
const Branch = require('./models/branches');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/software_project').then(async () => {
  try {
    let branchObj = await Branch.findOne();
    let targetBranchId = branchObj._id;
    let targetItemId = '69a2847d1b86de45e48fd07a';
    let targetItemUnitId = '69f486f96c24d2ee6f130858';
    
    const res = await Stock.findOneAndUpdate(
      { itemId: targetItemId, itemUnitId: targetItemUnitId, branchId: targetBranchId },
      { $inc: { quantity: 10 } },
      { upsert: true, new: true, runValidators: true }
    );
    console.log('Success:', res);
  } catch (e) {
    console.log('Error:', e.message);
  }
  process.exit(0);
});
