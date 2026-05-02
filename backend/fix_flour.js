const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://kalanichethana2001_db_user:23507%40Kalani@cbbsinventory.qi0rh1g.mongodb.net/?appName=CBBSInventory')
  .then(async () => {
    const ItemUnit = require('./models/itemUnits');
    const Item = require('./models/items');
    const Stock = require('./models/stock');

    const flour = await Item.findOne({ name: /flour/i });
    if(flour) {
      let foundUnit = await ItemUnit.findOne({
        itemId: flour._id,
        unit: 'kg',
        unitValue: 1,
        unitPrice: 150
      });
      if(!foundUnit) {
        foundUnit = new ItemUnit({
          itemId: flour._id,
          name: 'Flour (Rs150)',
          unit: 'kg',
          unitValue: 1,
          unitPrice: 150,
          unitsPerPack: 1,
          description: 'Manually added to fulfill user output requirement'
        });
        await foundUnit.save();
        console.log('Created missing ItemUnit:', foundUnit.name);
      } else {
        console.log('Unit already exists:', foundUnit.name);
      }
      
      await Stock.findOneAndUpdate(
        { itemId: flour._id, itemUnitId: foundUnit._id },
        { $inc: { quantity: 0 } },
        { upsert: true, new: true }
      );
      console.log('Stock synced.');
    } else {
      console.log('Flour not found');
    }
    process.exit(0);
  });
