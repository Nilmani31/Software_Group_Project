const mongoose = require('mongoose');
require('dotenv').config();

const Item = require('./models/items');

const fixDuplicateBarcode = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://test:test@cluster0.mongodb.net/test');
    console.log('Connected!');

    // Find all items
    const allItems = await Item.find();
    console.log(`Total items: ${allItems.length}`);

    // Find duplicates
    const barcodeMap = {};
    const duplicates = [];

    allItems.forEach(item => {
      if (barcodeMap[item.barcode]) {
        duplicates.push({
          barcode: item.barcode,
          items: [barcodeMap[item.barcode]._id, item._id]
        });
      } else {
        barcodeMap[item.barcode] = item;
      }
    });

    if (duplicates.length > 0) {
      console.log(`\nFound ${duplicates.length} duplicate barcodes:`);
      duplicates.forEach(dup => {
        console.log(`  Barcode: ${dup.barcode}, IDs: ${dup.items.join(', ')}`);
      });

      // Generate new barcodes for duplicates
      console.log('\nGenerating new barcodes for duplicates...');
      for (const duplicate of duplicates) {
        // Keep the first one, regenerate the second
        const itemToUpdate = await Item.findById(duplicate.items[1]);
        let newBarcode;
        let isUnique = false;
        
        // Generate unique barcode
        while (!isUnique) {
          newBarcode = Math.floor(100000000000 + Math.random() * 900000000000).toString();
          const exists = await Item.findOne({ barcode: newBarcode });
          isUnique = !exists;
        }
        
        itemToUpdate.barcode = newBarcode;
        await itemToUpdate.save();
        console.log(`  Updated item ${itemToUpdate._id}: ${duplicate.barcode} -> ${newBarcode}`);
      }

      console.log('\nDone! All duplicate barcodes have been fixed.');
    } else {
      console.log('No duplicate barcodes found.');
    }

    // Drop and rebuild indexes
    console.log('\nDropping and rebuilding indexes...');
    await Item.collection.dropIndex('barcode_1');
    console.log('Dropped barcode index');
    
    await Item.collection.createIndex({ barcode: 1 }, { unique: true });
    console.log('Created unique barcode index');

    console.log('\nSuccess! Database is clean.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

fixDuplicateBarcode();
