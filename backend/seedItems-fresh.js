const mongoose = require('mongoose');
require('dotenv').config();

const seedItems = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get the actual Item, Category models
    const Item = require('./models/items');
    const Category = require('./models/categories');

    // Clear existing items
    await Item.deleteMany({});
    console.log('🗑️ Cleared existing items');

    // Drop all indexes to avoid conflicts
    try {
      await Item.collection.dropIndexes();
      console.log('🗑️ Dropped all indexes');
    } catch (err) {
      // Indexes don't exist, that's fine
    }

    // Fetch all categories
    const categories = await Category.find().lean();
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.name] = cat._id;
    });

    console.log('📦 Available categories:', Object.keys(categoryMap));

    // Create initial items with proper structure
    const initialItems = [
      {
        name: 'Flour',
        category: categoryMap['Raw Materials'],
        unit: 'kg',
        minStock: 5,
        maxStock: 50,
        branch: 'Colombo',
        quantity: 20,
        status: 'normal'
      },
      {
        name: 'Sugar',
        category: categoryMap['Raw Materials'],
        unit: 'kg',
        minStock: 10,
        maxStock: 100,
        branch: 'Colombo',
        quantity: 5,
        status: 'low'
      },
      {
        name: 'Vanilla',
        category: categoryMap['Raw Materials'],
        unit: 'ltr',
        minStock: 2,
        maxStock: 20,
        branch: 'Kandy',
        quantity: 0,
        status: 'out'
      },
      {
        name: 'Butter',
        category: categoryMap['Supplies'],
        unit: 'kg',
        minStock: 5,
        maxStock: 50,
        branch: 'Galle',
        quantity: 15,
        status: 'normal'
      },
      {
        name: 'Eggs',
        category: categoryMap['Supplies'],
        unit: 'pcs',
        minStock: 10,
        maxStock: 100,
        branch: 'Colombo',
        quantity: 8,
        status: 'low'
      },
      {
        name: 'Milk',
        category: categoryMap['Raw Materials'],
        unit: 'ltr',
        minStock: 5,
        maxStock: 50,
        branch: 'Kandy',
        quantity: 25,
        status: 'normal'
      },
      {
        name: 'Baking Powder',
        category: categoryMap['Supplies'],
        unit: 'kg',
        minStock: 5,
        maxStock: 30,
        branch: 'Galle',
        quantity: 3,
        status: 'low'
      },
      {
        name: 'Vegetable Oil',
        category: categoryMap['Raw Materials'],
        unit: 'ltr',
        minStock: 10,
        maxStock: 100,
        branch: 'Colombo',
        quantity: 35,
        status: 'normal'
      },
      {
        name: 'Salt',
        category: categoryMap['Raw Materials'],
        unit: 'kg',
        minStock: 5,
        maxStock: 50,
        branch: 'Kandy',
        quantity: 12,
        status: 'normal'
      },
      {
        name: 'Packaging Boxes',
        category: categoryMap['Packaging'],
        unit: 'pcs',
        minStock: 100,
        maxStock: 500,
        branch: 'Galle',
        quantity: 150,
        status: 'normal'
      }
    ];

    const createdItems = await Item.insertMany(initialItems);
    console.log('✅ Items created successfully:');
    createdItems.forEach(item => {
      console.log(`  • ${item.name} (${item.category}) - ${item.quantity} ${item.unit}`);
    });

    console.log('\n✅ Database seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    process.exit(1);
  }
};

seedItems();
