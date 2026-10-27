const Category = require('../models/categories');

async function viewAllCategories() {
    try {
        const categories = await Category.find({})
            .sort({ name: 1 });

        if (categories.length === 0) {
            return '📭 No categories found in system.';
        }

        let response = `📂 <strong>All Categories (${categories.length} total):</strong><br><br>`;
        
        categories.forEach((category, index) => {
            response += `<strong>${index + 1}. ${category.name}</strong><br>`;
            response += `   Description: ${category.description || 'No description'}<br>`;
            response += `   Status: ${category.active ? '✅ Active' : '❌ Inactive'}<br><br>`;
        });

        return response;

    } catch (error) {
        console.error('Error viewing categories:', error);
        return `❌ Error fetching categories: ${error.message}`;
    }
}

async function getCategoryDetails(categoryName) {
    if (!categoryName) {
        return '❌ Please specify which category. Example: "Tell me about Beverages"';
    }

    try {
        const category = await Category.findOne({
            name: { $regex: categoryName, $options: 'i' }
        });

        if (!category) {
            return `❌ Category "${categoryName}" not found.`;
        }

        let response = `📂 <strong>${category.name}</strong><br>`;
        response += `Description: ${category.description || 'No description'}<br>`;
        response += `Status: ${category.active ? '✅ Active' : '❌ Inactive'}<br>`;

        return response;

    } catch (error) {
        console.error('Error getting category details:', error);
        return `❌ Error fetching category: ${error.message}`;
    }
}

module.exports = {
    viewAllCategories,
    getCategoryDetails
};
