const mongoose = require('mongoose');
const ItemUnit = require('./models/itemUnits');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/software_project').then(async () => {
  const units = await ItemUnit.find({});
  let updated = 0;
  for (const u of units) {
    if (u.unitValue === 1 && u.name) {
      // try to extract number from name
      // e.g., 'Vegetable Oil - 5ltr' -> split by ' - ', get last part, extract number
      const parts = u.name.split(' - ');
      if (parts.length > 1) {
        const unitPart = parts[parts.length - 1]; // e.g. '5ltr'
        const match = unitPart.match(/^(\d+(\.\d+)?)/);
        if (match) {
          const val = parseFloat(match[1]);
          if (val && val !== 1) {
            u.unitValue = val;
            await u.save();
            console.log(`Updated ${u.name} unitValue to ${val}`);
            updated++;
          }
        }
      }
    }
  }
  console.log(`Updated ${updated} units.`);
  process.exit(0);
});
