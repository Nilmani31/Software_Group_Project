const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://kalanichethana2001_db_user:23507%40Kalani@cbbsinventory.qi0rh1g.mongodb.net/?appName=CBBSInventory', { dbName: 'cbbs_inventory' })
  .then(async () => {
    const GoodsReceived = require('./models/goodsReceived');
    const Item = require('./models/items');
    const ItemUnit = require('./models/itemUnits');
    const Stock = require('./models/stock');
    
    const grns = await GoodsReceived.find({});
    for (const grn of grns) {
      for (const item of grn.items) {
        if (item.quantityReceived === 0) {
          console.log('Processing zero-qty item:', item.itemName);
          let targetItemId = item.itemId;
          if (!targetItemId || targetItemId.trim() === '') {
            const foundItem = await Item.findOne({ name: new RegExp('^' + item.itemName.trim() + '$', 'i') });
            if (foundItem) targetItemId = foundItem._id;
          }
          
          if (targetItemId) {
            let parsedUnitValue = 1;
            let parsedUnitName = item.unit || 'kg';
            if (item.unit) {
              const match = item.unit.match(/^(\d+(\.\d+)?)\s*(.*)$/);
              if (match) {
                parsedUnitValue = parseFloat(match[1]);
                parsedUnitName = match[3] || 'kg';
              } else {
                parsedUnitName = item.unit;
              }
            }
            
            let foundUnit = await ItemUnit.findOne({ 
              itemId: targetItemId, 
              unit: parsedUnitName, 
              unitValue: parsedUnitValue, 
              unitPrice: item.unitPrice || 0
            });
            
            if (!foundUnit) {
              const itemNameStr = item.itemName || 'Item';
              const newUnitName = parsedUnitValue > 1 ? parsedUnitValue + parsedUnitName : parsedUnitName;
              
              const existsOtherPrice = await ItemUnit.findOne({
                 itemId: targetItemId,
                 unit: parsedUnitName,
                 unitValue: parsedUnitValue
              });
              
              const finalUnitName = existsOtherPrice 
                 ? itemNameStr + ' - ' + newUnitName + ' (Rs' + item.unitPrice + ')'
                 : itemNameStr + ' - ' + newUnitName;
              
              foundUnit = new ItemUnit({
                itemId: targetItemId,
                name: finalUnitName,
                unit: parsedUnitName,
                unitValue: parsedUnitValue,
                unitPrice: item.unitPrice || 0,
                unitsPerPack: 1,
                description: 'Created from GRN for ' + itemNameStr
              });
              await foundUnit.save();
              console.log('Created ItemUnit:', foundUnit.name);
            }
            
            await Stock.findOneAndUpdate(
              { itemId: targetItemId, itemUnitId: foundUnit._id },
              { $inc: { quantity: 0 } },
              { upsert: true, new: true }
            );
          }
        }
      }
    }
    console.log('Done!');
    process.exit(0);
  });
