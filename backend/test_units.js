const mongoose = require('mongoose');
const ItemUnit = require('./models/itemUnits');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/software_project').then(async () => {
  const units = await ItemUnit.find({});
  console.log('All Units:');
  units.forEach(u => console.log(`${u.name} -> unitValue: ${u.unitValue}, unit: ${u.unit}`));
  process.exit(0);
});
