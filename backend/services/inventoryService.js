const Item = require('../models/items');
const Stock = require('../models/stock');
const Branch = require('../models/branches');

async function checkStock(itemName) {
    if (!itemName) {
        return '❌ Please tell me which item you want to check. Example: "Do we have coffee?"';
    }

    try {
        console.log(`🔍 Looking for item: "${itemName}"`);

        // Find item - with better fuzzy matching
        let item = await Item.findOne({
            name: { $regex: itemName, $options: 'i' }
        });

        // If not found exact match, try partial match
        if (!item) {
            console.log(`⚠️ Exact match not found, trying partial...`);
            item = await Item.findOne({
                name: { $regex: itemName.split(' ')[0], $options: 'i' }
            });
        }

        if (!item) {
            // Get list of available items to suggest
            const allItems = await Item.find({}, { name: 1 }).limit(10);
            const suggestions = allItems.map(i => i.name).join(', ');
            
            return `❌ Item "${itemName}" not found.<br>` +
                   `Available items: ${suggestions}<br>` +
                   `Try asking: "Do we have milk?" or "Check sugar"`;
        }

        console.log(`✅ Found item: "${item.name}"`);

        // Get stock quantities
        const stocks = await Stock.find({
            itemId: item._id
        }).populate('branchId', 'name');

        if (stocks.length === 0) {
            return `⚠️ No stock records found for <strong>${item.name}</strong>.`;
        }

        let response = `📦 <strong>${item.name.toUpperCase()}</strong><br>`;
        let totalQty = 0;

        for (const stock of stocks) {
            const qty = stock.quantity || 0;
            const branch = stock.branchId?.name || 'Unknown Branch';
            const minStock = stock.minStock || 10;
            const status = qty < minStock ? '⚠️' : (qty === 0 ? '❌' : '✅');

            response += `${status} <strong>${branch}:</strong> ${qty} units<br>`;
            totalQty += qty;
        }

        response += `<br>📊 <strong>Total: ${totalQty} units</strong>`;

        if (totalQty === 0) {
            response += '<br>🔴 <strong>OUT OF STOCK - Please order immediately!</strong>';
        } else if (totalQty < 5) {
            response += '<br>🟠 <strong>CRITICAL - Reorder recommended!</strong>';
        } else if (totalQty < 10) {
            response += '<br>🟡 <strong>LOW - Consider reordering soon</strong>';
        } else {
            response += '<br>🟢 <strong>Good stock level</strong>';
        }

        return response;

    } catch (error) {
        console.error('Error checking stock:', error);
        return `❌ Error: ${error.message}`;
    }
}

async function getLowStockItems() {
    try {
        const lowStocks = await Stock.find({
            $expr: { $lt: ['$quantity', '$minStock'] }
        }).populate('itemId', 'name').populate('branchId', 'branchName');

        if (lowStocks.length === 0) {
            return '✅ <strong>All items are well stocked!</strong>';
        }

        let response = '🚨 <strong>Low Stock Items:</strong><br>';
        lowStocks.forEach((stock, index) => {
            const itemName = stock.itemId?.name || 'Unknown Item';
            const branch = stock.branchId?.branchName || 'Unknown';
            const shortBy = stock.minStock - stock.quantity;

            response += `${index + 1}. <strong>${itemName}</strong><br>`;
            response += `   Current: ${stock.quantity} | Required: ${stock.minStock} | `;
            response += `Short by: ${shortBy} | Branch: ${branch}<br>`;
        });

        return response;

    } catch (error) {
        console.error('Error getting low stock:', error);
        return `❌ Error: ${error.message}`;
    }
}

async function addStock(itemName, quantity) {
    if (!itemName || !quantity || quantity <= 0) {
        return '❌ Please provide: item name and quantity. Example: "Add 50 units of coffee" or "Receive 100 kg milk"';
    }

    try {
        console.log(`📦 Adding stock for: "${itemName}" x ${quantity}`);

        // Find item with better matching
        let item = await Item.findOne({
            name: { $regex: itemName, $options: 'i' }
        });

        if (!item) {
            console.log(`⚠️ Exact match failed, trying partial match`);
            item = await Item.findOne({
                name: { $regex: itemName.split(' ')[0], $options: 'i' }
            });
        }

        if (!item) {
            return `❌ Item "${itemName}" not found in system.`;
        }

        // Get first branch
        const branch = await Branch.findOne();
        if (!branch) {
            return '❌ No branch found in system. Please add a branch first.';
        }

        // Update stock
        const updatedStock = await Stock.findOneAndUpdate(
            { itemId: item._id, branchId: branch._id },
            { $inc: { quantity: parseInt(quantity) } },
            { new: true, upsert: true }
        );

        const branchName = branch.name || branch.branchName || 'Main Branch';
        return `✅ <strong>STOCK ADDED</strong><br>` +
               `Item: <strong>${item.name}</strong><br>` +
               `Branch: <strong>${branchName}</strong><br>` +
               `Quantity Added: <strong>+${quantity} units</strong><br>` +
               `New Total: <strong>${updatedStock.quantity} units</strong><br>` +
               `📊 Health: ${updatedStock.quantity >= item.maxStock ? '🟢 Optimal' : 'ℹ️ Above min'}`;

    } catch (error) {
        console.error('Error adding stock:', error);
        return `❌ Error adding stock: ${error.message}`;
    }
}

async function removeStock(itemName, quantity) {
    if (!itemName || !quantity || quantity <= 0) {
        return '❌ Please provide: item name and quantity to remove. Example: "Remove 10 units of milk" or "Use 5 kg coffee"';
    }

    try {
        console.log(`📦 Removing stock for: "${itemName}" x ${quantity}`);

        // Find item with better matching
        let item = await Item.findOne({
            name: { $regex: itemName, $options: 'i' }
        });

        if (!item) {
            item = await Item.findOne({
                name: { $regex: itemName.split(' ')[0], $options: 'i' }
            });
        }

        if (!item) {
            return `❌ Item "${itemName}" not found in system.`;
        }

        // Get first branch
        const branch = await Branch.findOne();
        if (!branch) {
            return '❌ No branch found in system.';
        }

        // Check available stock
        const currentStock = await Stock.findOne({
            itemId: item._id,
            branchId: branch._id
        });

        const availableQty = currentStock?.quantity || 0;
        if (availableQty < quantity) {
            return `❌ <strong>NOT ENOUGH STOCK</strong><br>` +
                   `Item: <strong>${item.name}</strong><br>` +
                   `Available: <strong>${availableQty} units</strong><br>` +
                   `Requested: <strong>${quantity} units</strong><br>` +
                   `Short by: <strong>${quantity - availableQty} units</strong>`;
        }

        // Remove stock
        const updatedStock = await Stock.findOneAndUpdate(
            { itemId: item._id, branchId: branch._id },
            { $inc: { quantity: -parseInt(quantity) } },
            { new: true }
        );

        const branchName = branch.name || branch.branchName || 'Main Branch';
        return `✅ <strong>STOCK REMOVED</strong><br>` +
               `Item: <strong>${item.name}</strong><br>` +
               `Branch: <strong>${branchName}</strong><br>` +
               `Quantity Removed: <strong>-${quantity} units</strong><br>` +
               `Remaining: <strong>${updatedStock.quantity} units</strong><br>` +
               `📊 Status: ${updatedStock.quantity < item.minStock ? '⚠️ BELOW MIN' : '✅ OK'}`;

    } catch (error) {
        console.error('Error removing stock:', error);
        return `❌ Error removing stock: ${error.message}`;
    }
}

async function getOutOfStockItems() {
    try {
        const stocks = await Stock.find({ quantity: 0 })
            .populate('itemId', 'name sku')
            .populate('branchId', 'branchName');

        if (stocks.length === 0) {
            return '✅ <strong>No out-of-stock items!</strong> All items have available stock.';
        }

        let response = `🔴 <strong>Out of Stock Items (${stocks.length}):</strong><br><br>`;
        stocks.forEach((stock, index) => {
            const itemName = stock.itemId?.name || 'Unknown';
            const branch = stock.branchId?.branchName || 'Unknown';
            response += `${index + 1}. <strong>${itemName}</strong><br>`;
            response += `   Branch: ${branch} | Min Required: ${stock.minStock || 0}<br><br>`;
        });

        return response;
    } catch (error) {
        console.error('Error getting out of stock items:', error);
        return `❌ Error: ${error.message}`;
    }
}

async function getInventorySummary() {
    try {
        const totalItems = await Item.countDocuments();
        const stocks = await Stock.find({});
        const items = await Item.find({});

        let totalQuantity = 0;
        let lowStockCount = 0;
        let outOfStockCount = 0;
        let inStockCount = 0;

        items.forEach(item => {
            const itemStocks = stocks.filter(s => String(s.itemId) === String(item._id));
            const totalQty = itemStocks.reduce((sum, s) => sum + (s.quantity || 0), 0);

            if (totalQty === 0) outOfStockCount++;
            else if (totalQty < (item.minStock || 0)) lowStockCount++;
            else inStockCount++;

            totalQuantity += totalQty;
        });

        const branches = await Branch.countDocuments();

        let response = `📊 <strong>Inventory Summary</strong><br><br>`;
        response += `📦 Total Item Types: <strong>${totalItems}</strong><br>`;
        response += `🏢 Total Branches: <strong>${branches}</strong><br>`;
        response += `📈 Total Stock Units: <strong>${totalQuantity}</strong><br><br>`;
        response += `🟢 In Stock: <strong>${inStockCount}</strong><br>`;
        response += `🟡 Low Stock: <strong>${lowStockCount}</strong><br>`;
        response += `🔴 Out of Stock: <strong>${outOfStockCount}</strong><br>`;

        return response;
    } catch (error) {
        console.error('Error getting inventory summary:', error);
        return `❌ Error: ${error.message}`;
    }
}

async function searchItem(itemName) {
    if (!itemName) {
        return '❌ Please specify what to search for. Example: "Find items with coffee"';
    }

    try {
        const items = await Item.find({
            name: { $regex: itemName, $options: 'i' }
        }).populate('category', 'name').limit(20);

        if (items.length === 0) {
            return `❌ No items found matching "<strong>${itemName}</strong>".`;
        }

        let response = `🔍 <strong>Search Results for "${itemName}" (${items.length} found):</strong><br><br>`;
        items.forEach((item, index) => {
            const category = item.category?.name || 'Uncategorized';
            response += `${index + 1}. <strong>${item.name}</strong><br>`;
            response += `   SKU: ${item.sku} | Category: ${category} | Unit: ${item.unit}<br><br>`;
        });

        return response;
    } catch (error) {
        console.error('Error searching items:', error);
        return `❌ Error: ${error.message}`;
    }
}

async function getItemsByCategory(categoryName) {
    if (!categoryName) {
        return '❌ Please specify a category. Example: "What items are in Coffee Supplies?"';
    }

    try {
        const Category = require('../models/categories');
        const category = await Category.findOne({
            name: { $regex: categoryName, $options: 'i' }
        });

        if (!category) {
            const allCategories = await Category.find({}, { name: 1 });
            const names = allCategories.map(c => c.name).join(', ');
            return `❌ Category "${categoryName}" not found.<br>Available: ${names}`;
        }

        const items = await Item.find({ category: category._id });

        if (items.length === 0) {
            return `📂 No items found in category "<strong>${category.name}</strong>".`;
        }

        let response = `📂 <strong>Items in ${category.name} (${items.length}):</strong><br><br>`;
        items.forEach((item, index) => {
            response += `${index + 1}. <strong>${item.name}</strong><br>`;
            response += `   SKU: ${item.sku} | Unit: ${item.unit} | Status: ${item.status}<br><br>`;
        });

        return response;
    } catch (error) {
        console.error('Error getting items by category:', error);
        return `❌ Error: ${error.message}`;
    }
}

async function getBranchList() {
    try {
        const branches = await Branch.find({});

        if (branches.length === 0) {
            return '📭 No branches found in system.';
        }

        let response = `🏢 <strong>All Branches (${branches.length}):</strong><br><br>`;
        branches.forEach((branch, index) => {
            response += `${index + 1}. <strong>${branch.branchName}</strong><br>`;
            response += `   Code: ${branch.branchCode || 'N/A'} | Location: ${branch.location || 'N/A'}<br>`;
            response += `   Phone: ${branch.phoneNumber || 'N/A'} | Email: ${branch.email || 'N/A'}<br><br>`;
        });

        return response;
    } catch (error) {
        console.error('Error getting branch list:', error);
        return `❌ Error: ${error.message}`;
    }
}

module.exports = {
    checkStock,
    getLowStockItems,
    addStock,
    removeStock,
    getOutOfStockItems,
    getInventorySummary,
    searchItem,
    getItemsByCategory,
    getBranchList
};
