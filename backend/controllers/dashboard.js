const Item = require('../models/items');
const ItemUnit = require('../models/itemUnits');
const Stock = require('../models/stock');
const PurchaseOrder = require('../models/purchaseOrder');
const IssueNote = require('../models/issueNotes');
const IssueNoteItem = require('../models/issueNoteItems');
const { getBranchFilter, getIssueNoteBranchFilter } = require('../utils/branchFilter');

exports.getDashboardStats = async (req, res) => {
  try {
    const branchFilter = getBranchFilter(req);
    const issueNoteFilter = getIssueNoteBranchFilter(req);

    // 1. Total Items (unique items in catalog)
    const totalItems = await Item.countDocuments();

    // 2 & 3. Low Stock and Out of Stock
    const items = await Item.find({});
    const stocks = await Stock.find(branchFilter);
    
    let lowStockCount = 0;
    let outOfStockCount = 0;
    
    items.forEach(item => {
      const itemStocks = stocks.filter(s => String(s.itemId) === String(item._id));
      const totalQuantity = itemStocks.reduce((sum, s) => sum + (s.quantity || 0), 0);
      
      if (totalQuantity === 0) {
        outOfStockCount++;
      } else if (totalQuantity > 0 && totalQuantity < (item.minStock || 0)) {
        lowStockCount++;
      }
    });

    // 4. Pending Purchase Orders
    const pendingPOs = await PurchaseOrder.countDocuments({ status: 'Pending', ...branchFilter });

    // 5. Pending Request Orders (Issue Notes)
    const pendingRequests = await IssueNote.countDocuments({ status: 'Pending', ...issueNoteFilter });

    // 6. Inventory Value
    const itemUnits = await ItemUnit.find({});
    let totalInventoryValue = 0;
    
    // Values for Pie Chart
    let inStockValue = 0;
    let lowStockValue = 0;

    stocks.forEach(stock => {
      if (stock.quantity > 0) {
        let price = 0;
        if (stock.itemUnitId) {
          const unit = itemUnits.find(u => String(u._id) === String(stock.itemUnitId));
          if (unit) price = unit.unitPrice || 0;
        } else {
          const unit = itemUnits.find(u => String(u.itemId) === String(stock.itemId));
          if (unit) price = unit.unitPrice || 0;
        }
        
        const value = stock.quantity * price;
        totalInventoryValue += value;

        // Categorize the value for pie chart
        const item = items.find(i => String(i._id) === String(stock.itemId));
        if (item && stock.quantity < (item.minStock || 0)) {
          lowStockValue += value;
        } else {
          inStockValue += value;
        }
      }
    });

    // 7. Top 10 Product Issues
    let topIssues = await IssueNoteItem.aggregate([
      {
        $group: {
          _id: '$itemId',
          totalIssued: { $sum: '$quantity' }
        }
      },
      { $sort: { totalIssued: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'items', 
          localField: '_id',
          foreignField: '_id',
          as: 'itemDetails'
        }
      },
      { $unwind: '$itemDetails' },
      {
        $project: {
          name: '$itemDetails.name',
          totalIssued: 1
        }
      }
    ]);

    let top10ProductIssues = topIssues.map(issue => ({
      name: issue.name,
      value: issue.totalIssued
    }));

    if (top10ProductIssues.length === 0) {
      const sortedByStock = items.map(item => {
        const itemStocks = stocks.filter(s => String(s.itemId) === String(item._id));
        const totalQuantity = itemStocks.reduce((sum, s) => sum + (s.quantity || 0), 0);
        return { name: item.name, value: totalQuantity };
      }).filter(i => i.value > 0).sort((a, b) => b.value - a.value).slice(0, 10);
      
      top10ProductIssues.push(...sortedByStock);
    }

    res.status(200).json({
      success: true,
      data: {
        totalItems,
        lowStock: lowStockCount,
        outOfStock: outOfStockCount,
        purchaseOrders: pendingPOs,
        requestOrders: pendingRequests,
        inventoryValue: totalInventoryValue,
        inStockValue,
        lowStockValue,
        topProducts: top10ProductIssues
      }
    });
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message, stack: error.stack });
  }
};
