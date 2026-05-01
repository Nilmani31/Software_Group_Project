const mongoose = require('mongoose');
const GoodsReceived = require('./models/goodsReceived');
const Stock = require('./models/stock');
const Item = require('./models/items');
const ItemUnit = require('./models/itemUnits');
const Branch = require('./models/branches');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/software_project').then(async () => {
  console.log('Connected to DB. Starting migration...');
  const grns = await GoodsReceived.find({});
  
  let stockUpdates = 0;
  
  for (const grn of grns) {
    let grnModified = false;
    
    for (const item of grn.items) {
      if (!item.itemId || item.itemId.trim() === '') {
        console.log(`Fixing item '${item.itemName}' in GRN ${grn.grnNumber}...`);
        
        // Find item by name
        const foundItem = await Item.findOne({ name: new RegExp(`^${item.itemName.trim()}$`, 'i') });
        
        if (foundItem) {
          item.itemId = foundItem._id.toString();
          grnModified = true;
          
          // Apply stock update
          let targetItemUnitId = null;
          let foundUnit = null;
          if (item.unit) foundUnit = await ItemUnit.findOne({ itemId: foundItem._id, unit: item.unit });
          if (!foundUnit) foundUnit = await ItemUnit.findOne({ itemId: foundItem._id });
          if (foundUnit) targetItemUnitId = foundUnit._id;
          
          const branchQuery = grn.branch ? { branchName: new RegExp(`^${grn.branch}$`, 'i') } : { branchName: /colombo/i };
          let branchObj = await Branch.findOne(branchQuery) || await Branch.findOne();
          let targetBranchId = branchObj ? branchObj._id : null;
          
          if (targetItemUnitId && targetBranchId) {
            await Stock.findOneAndUpdate(
              { itemId: foundItem._id, itemUnitId: targetItemUnitId, branchId: targetBranchId },
              { $inc: { quantity: item.quantityReceived } },
              { upsert: true }
            );
            console.log(`✅ Stock applied for ${item.itemName} (+${item.quantityReceived})`);
            stockUpdates++;
          } else {
            await Stock.findOneAndUpdate(
              { itemId: foundItem._id },
              { $inc: { quantity: item.quantityReceived } },
              { upsert: true }
            );
            console.log(`✅ Stock applied (fallback) for ${item.itemName} (+${item.quantityReceived})`);
            stockUpdates++;
          }
        } else {
          console.log(`❌ Could not find inventory item matching '${item.itemName}'`);
        }
      }
    }
    
    if (grnModified) {
      await grn.save();
      console.log(`💾 Saved updated GRN ${grn.grnNumber}`);
    }
  }
  
  console.log(`Migration completed. Updated stock for ${stockUpdates} items.`);
  process.exit(0);
});
