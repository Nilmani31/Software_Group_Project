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
        }).populate('itemId', 'name').populate('branchId', 'name');

        if (lowStocks.length === 0) {
            return '✅ <strong>All items are well stocked!</strong>';
        }

        let response = '🚨 <strong>Low Stock Items:</strong><br>';
        lowStocks.forEach((stock, index) => {
            const itemName = stock.itemId?.name || 'Unknown';
            const branch = stock.branchId?.name || 'Unknown';
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

module.exports = {
    checkStock,
    getLowStockItems,
    addStock,
    removeStock
};
