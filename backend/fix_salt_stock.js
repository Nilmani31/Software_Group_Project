const mongoose = require('mongoose');
const Stock = require('./models/stock');
const ItemUnit = require('./models/itemUnits');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/software_project').then(async () => {
  try {
    const salt5kg200 = await ItemUnit.findOne({ name: 'salt - 5kg' }) || await ItemUnit.findOne({ name: /salt - 5kg \(Rs200\)/i });
    const salt1kg = await ItemUnit.findOne({ name: 'salt - 1kg' }) || await ItemUnit.findOne({ name: 'salt - kg' });

    if (salt5kg200 && salt1kg) {
      // Create stock for 5kg Rs 200
      const stock1kg = await Stock.findOne({ itemUnitId: salt1kg._id });
      if (stock1kg && stock1kg.quantity >= 10) {
        // Move 10 from 1kg to 5kg
        stock1kg.quantity -= 10;
        await stock1kg.save();

        const branchId = stock1kg.branchId;
        await Stock.findOneAndUpdate(
          { itemId: salt5kg200.itemId, itemUnitId: salt5kg200._id, branchId },
          { $inc: { quantity: 10 } },
          { upsert: true, new: true }
        );
        console.log('Fixed stock for salt 5kg Rs200');
      }
    }
  } catch(e) { console.log(e.message); }
  process.exit(0);
});
