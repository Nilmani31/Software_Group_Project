const mongoose = require('mongoose');
require('dotenv').config();

const Item = require('./models/items');

const dropBarcodeIndex = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://test:test@cluster0.mongodb.net/test');
    console.log('Connected!');

    // Drop barcode index
    try {
      await Item.collection.dropIndex('barcode_1');
      console.log('✅ Dropped barcode unique index');
    } catch (err) {
      console.log('ℹ️  Barcode index does not exist or already dropped');
    }

    // Ensure SKU index is unique
    try {
      await Item.collection.dropIndex('sku_1');
      console.log('Dropped old SKU index');
    } catch (err) {
      console.log('Old SKU index does not exist');
    }

    await Item.collection.createIndex({ sku: 1 }, { unique: true });
    console.log('✅ Created unique SKU index');

    console.log('\n✅ Success! Items model now uses only SKU for uniqueness.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

dropBarcodeIndex();
