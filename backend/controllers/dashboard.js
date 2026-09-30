const mongoose = require('mongoose');
const Item = require('../models/items');
const ItemUnit = require('../models/itemUnits');
const Stock = require('../models/stock');
const PurchaseOrder = require('../models/purchaseOrder');
const IssueNote = require('../models/issueNotes');
const IssueNoteItem = require('../models/issueNoteItems');
const GoodsReceived = require('../models/goodsReceived');
const Category = require('../models/categories');
const Branch = require('../models/branches');
const { getBranchFilter, getIssueNoteBranchFilter, getPOBranchFilter } = require('../utils/branchFilter');

exports.getDashboardStats = async (req, res) => {
  try {
    const selectedBranchId = req.query.branchId;
    const hasBranchQuery = selectedBranchId && selectedBranchId !== 'all';

    let branchFilter = {};
    let issueNoteFilter = {};
    let poFilter = {};

    const branches = await Branch.find({ status: 'ACTIVE' }).lean();
    const branchMap = {};
    branches.forEach(b => {
      branchMap[String(b._id)] = b.branchName;
      if (b.branchId) branchMap[b.branchId] = b.branchName;
    });

    if (hasBranchQuery) {
      if (mongoose.Types.ObjectId.isValid(selectedBranchId)) {
        branchFilter = { branchId: new mongoose.Types.ObjectId(selectedBranchId) };
        issueNoteFilter = {
          $or: [
            { fromBranchId: new mongoose.Types.ObjectId(selectedBranchId) },
            { toBranchId: new mongoose.Types.ObjectId(selectedBranchId) }
          ]
        };
        const branchObj = branches.find(b => String(b._id) === String(selectedBranchId));
        const branchName = branchObj ? branchObj.branchName : '';
        if (branchName) {
          poFilter = {
            $or: [
              { createdByBranch: new RegExp(`^${branchName}$`, 'i') },
              { branch: new RegExp(`^${branchName}$`, 'i') }
            ]
          };
        }
      }
    } else {
      const roleId = req.headers['x-user-role'];
      const branchHeader = req.headers['x-user-branch'];

      // If no credentials supplied or admin/director, show company-wide overview
      if (!roleId && !branchHeader) {
        branchFilter = {};
        issueNoteFilter = {};
        poFilter = {};
      } else {
        branchFilter = await getBranchFilter(req);
        issueNoteFilter = await getIssueNoteBranchFilter(req);
        poFilter = await getPOBranchFilter(req);
      }
    }

    // Parallel fetch of catalog, categories, stock, units, orders
    const [
      items,
      categories,
      stocks,
      itemUnits,
      pendingPOs,
      totalPOs,
      pendingRequests,
      totalIssueNotes,
      totalGRNs,
      recentPOsRaw,
      recentIssuesRaw
    ] = await Promise.all([
      Item.find({}).lean(),
      Category.find({}).lean(),
      Stock.find(branchFilter).lean(),
      ItemUnit.find({}).lean(),
      PurchaseOrder.countDocuments({ status: 'Pending', ...poFilter }),
      PurchaseOrder.countDocuments(poFilter),
      IssueNote.countDocuments({ status: 'pending', ...issueNoteFilter }),
      IssueNote.countDocuments(issueNoteFilter),
      GoodsReceived.countDocuments(),
      PurchaseOrder.find(poFilter).sort({ createdAt: -1 }).limit(5).lean(),
      IssueNote.find(issueNoteFilter).populate('fromBranchId toBranchId').sort({ createdAt: -1 }).limit(5).lean()
    ]);

    const totalItems = items.length;
    const totalCategories = categories.length;
    const totalBranches = branches.length;

    // Unit price index
    const unitPriceMap = {};
    itemUnits.forEach(u => {
      if (u.unitPrice !== undefined && u.unitPrice !== null) {
        unitPriceMap[String(u._id)] = u.unitPrice;
        if (!unitPriceMap[String(u.itemId)]) {
          unitPriceMap[String(u.itemId)] = u.unitPrice;
        }
      }
    });

    // Item details index
    const itemMap = {};
    const itemStockTotal = {};
    items.forEach(item => {
      itemMap[String(item._id)] = item;
      itemStockTotal[String(item._id)] = 0;
    });

    // Category index
    const catMap = {};
    categories.forEach(c => {
      catMap[String(c._id)] = {
        id: c._id,
        name: c.name,
        count: 0,
        units: 0,
        value: 0
      };
    });

    items.forEach(i => {
      const cId = String(i.category);
      if (catMap[cId]) {
        catMap[cId].count++;
      }
    });

    let totalStockUnits = 0;
    let totalInventoryValue = 0;
    let inStockValue = 0;
    let lowStockValue = 0;

    // Calculate totals across filtered stocks
    stocks.forEach(stock => {
      const qty = stock.quantity || 0;
      totalStockUnits += qty;
      const sItemId = String(stock.itemId);

      if (itemStockTotal[sItemId] !== undefined) {
        itemStockTotal[sItemId] += qty;
      }

      let price = 0;
      if (stock.itemUnitId && unitPriceMap[String(stock.itemUnitId)] !== undefined) {
        price = unitPriceMap[String(stock.itemUnitId)];
      } else if (unitPriceMap[sItemId] !== undefined) {
        price = unitPriceMap[sItemId];
      }

      const val = qty * price;
      totalInventoryValue += val;

      const item = itemMap[sItemId];
      const minStock = stock.minStock || (item && item.minStock) || 5;

      if (qty < minStock) {
        lowStockValue += val;
      } else {
        inStockValue += val;
      }

      if (item) {
        const cId = String(item.category);
        if (catMap[cId]) {
          catMap[cId].units += qty;
          catMap[cId].value += val;
        }
      }
    });

    // Calculate item health and critical alerts
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let inStockCount = 0;
    const criticalAlerts = [];

    items.forEach(item => {
      const currentQty = itemStockTotal[String(item._id)] || 0;
      const minStock = item.minStock || 10;
      const catObj = catMap[String(item.category)];
      const categoryName = catObj ? catObj.name : 'General';

      if (currentQty === 0) {
        outOfStockCount++;
        criticalAlerts.push({
          _id: item._id,
          name: item.name,
          sku: item.sku || 'N/A',
          category: categoryName,
          unit: item.unit || 'units',
          currentStock: currentQty,
          minStock,
          status: 'out'
        });
      } else if (currentQty < minStock) {
        lowStockCount++;
        criticalAlerts.push({
          _id: item._id,
          name: item.name,
          sku: item.sku || 'N/A',
          category: categoryName,
          unit: item.unit || 'units',
          currentStock: currentQty,
          minStock,
          status: 'low'
        });
      } else {
        inStockCount++;
      }
    });

    // Branch breakdown
    const allStocksForBranches = hasBranchQuery ? await Stock.find({}).lean() : stocks;
    const branchBreakdown = branches.map(b => {
      const bId = String(b._id);
      const bStocks = allStocksForBranches.filter(s => String(s.branchId) === bId);
      let units = 0;
      let val = 0;
      let low = 0;

      bStocks.forEach(s => {
        const q = s.quantity || 0;
        units += q;
        const p = (s.itemUnitId && unitPriceMap[String(s.itemUnitId)]) || unitPriceMap[String(s.itemId)] || 0;
        val += q * p;
        if (q <= (s.minStock || 5)) {
          low++;
        }
      });

      return {
        branchId: b._id,
        name: b.branchName,
        code: b.branchCode,
        city: b.city,
        totalUnits: units,
        totalValue: val,
        stockItemsCount: bStocks.length,
        lowStockCount: low
      };
    });

    // Category breakdown list
    const categoryBreakdown = Object.values(catMap)
      .sort((a, b) => b.value - a.value);

    // Top Product Issues / High Movement
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
          sku: '$itemDetails.sku',
          totalIssued: 1
        }
      }
    ]);

    let topProducts = topIssues.map(issue => ({
      name: issue.name,
      sku: issue.sku,
      value: issue.totalIssued
    }));

    if (topProducts.length === 0) {
      topProducts = items.map(item => {
        return {
          name: item.name,
          sku: item.sku,
          value: itemStockTotal[String(item._id)] || 0
        };
      }).filter(i => i.value > 0).sort((a, b) => b.value - a.value).slice(0, 10);
    }

    // Format recent Purchase Orders
    const recentPOs = recentPOsRaw.map(po => ({
      _id: po._id,
      poNumber: po.poNumber,
      orderType: po.orderType || 'Supplier',
      supplier: po.supplier || (po.orderDetails && po.orderDetails.supplierName) || 'Standard Supplier',
      branch: po.branch || po.createdByBranch || 'Main Branch',
      status: po.status || 'Pending',
      orderDate: po.orderDate || po.createdAt,
      itemsCount: Array.isArray(po.items) ? po.items.length : 0,
      total: po.total || '0'
    }));

    // Format recent Issue Notes
    const recentIssues = recentIssuesRaw.map(issue => ({
      _id: issue._id,
      issueNoteNumber: issue.issueNoteNumber,
      fromBranch: (issue.fromBranchId && issue.fromBranchId.branchName) || 'Main Warehouse',
      toBranch: (issue.toBranchId && issue.toBranchId.branchName) || 'Branch Store',
      purpose: issue.purpose || 'Stock Replenishment',
      status: issue.status || 'pending',
      totalAmount: issue.totalAmount || 0,
      issueDate: issue.issueDate || issue.createdAt
    }));

    // Branches list for dropdown selector
    const branchesList = branches.map(b => ({
      _id: b._id,
      branchId: b.branchId,
      branchName: b.branchName,
      branchCode: b.branchCode,
      city: b.city
    }));

    res.status(200).json({
      success: true,
      data: {
        // High-level summary metrics
        totalItems,
        totalCategories,
        totalBranches,
        totalStockUnits,
        inventoryValue: totalInventoryValue,
        inStockCount,
        lowStock: lowStockCount,
        outOfStock: outOfStockCount,
        inStockValue,
        lowStockValue,
        purchaseOrders: pendingPOs,
        totalPurchaseOrders: totalPOs,
        requestOrders: pendingRequests,
        totalIssueNotes,
        totalGoodsReceived: totalGRNs,

        // Analytical breakdowns
        branchBreakdown,
        categoryBreakdown,
        criticalAlerts,
        topProducts,

        // Operational Activity
        recentPOs,
        recentIssues,
        branchesList,
        selectedBranch: hasBranchQuery ? selectedBranchId : 'all'
      }
    });
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

