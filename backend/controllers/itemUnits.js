const ItemUnit = require('../models/itemUnits');
const Stock = require('../models/stock');
const Item = require('../models/items');

// Get all units for an item with stock info
exports.getItemUnitsWithStock = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { branchId } = req.query;

    // Get all units for this item
    const units = await ItemUnit.find({ itemId }).sort({ unitPrice: 1 });

    if (!units || units.length === 0) {
      return res.status(404).json({ message: 'No units found for this item' });
    }

    // If branchId provided, get stock info
    let unitsWithStock = units;
    if (branchId) {
      unitsWithStock = await Promise.all(
        units.map(async (unit) => {
          const stock = await Stock.findOne({
            itemId,
            itemUnitId: unit._id,
            branchId
          });
          return {
            ...unit.toObject(),
            stock: stock ? stock.quantity : 0,
            status: stock ? stock.status : 'out-of-stock'
          };
        })
      );
    }

    res.json({
      success: true,
      data: unitsWithStock
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get stock for specific unit in specific branch
exports.getUnitStockByBranch = async (req, res) => {
  try {
    const { itemUnitId, branchId } = req.params;

    const stock = await Stock.findOne({
      itemUnitId,
      branchId
    }).populate('itemId itemUnitId branchId');

    if (!stock) {
      return res.status(404).json({ message: 'Stock not found' });
    }

    res.json({
      success: true,
      data: stock
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all available prices for an item (for displaying in frontend)
exports.getItemPriceOptions = async (req, res) => {
  try {
    const { itemId } = req.params;

    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const units = await ItemUnit.find({ itemId, isActive: true })
      .sort({ unitsPerPack: 1 });

    const priceOptions = units.map(unit => ({
      unitId: unit._id,
      quantity: unit.unitsPerPack,
      unit: unit.unit,
      price: unit.unitPrice,
      pricePerUnit: (unit.unitPrice / unit.unitsPerPack).toFixed(2),
      description: unit.description
    }));

    res.json({
      success: true,
      item: {
        id: item._id,
        name: item.name,
        sku: item.sku
      },
      priceOptions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all items with their price ranges
exports.getItemsWithPriceRange = async (req, res) => {
  try {
    const items = await Item.find().limit(50);

    const itemsWithPrices = await Promise.all(
      items.map(async (item) => {
        const units = await ItemUnit.find({ itemId: item._id, isActive: true });
        
        if (units.length === 0) {
          return null;
        }

        const prices = units.map(u => u.unitPrice);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);

        return {
          id: item._id,
          name: item.name,
          sku: item.sku,
          category: item.category,
          minPrice,
          maxPrice,
          unitCount: units.length,
          units: units.map(u => ({
            id: u._id,
            quantity: u.unitsPerPack,
            unit: u.unit,
            price: u.unitPrice
          }))
        };
      })
    );

    res.json({
      success: true,
      data: itemsWithPrices.filter(item => item !== null)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Add new unit price for an item
exports.addItemUnit = async (req, res) => {
  try {
    const { itemId, unit, unitsPerPack, unitPrice, description } = req.body;

    // Check if item exists
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Check if this unit already exists
    const existingUnit = await ItemUnit.findOne({
      itemId,
      unit,
      unitsPerPack
    });

    if (existingUnit) {
      return res.status(400).json({ 
        message: 'This unit option already exists for this item' 
      });
    }

    const newUnit = new ItemUnit({
      name: `${item.name} - ${unitsPerPack}${unit}`,
      itemId,
      unit,
      unitsPerPack,
      unitPrice,
      description: description || `${unitsPerPack}${unit} pack of ${item.name}`,
      isActive: true
    });

    await newUnit.save();

    res.status(201).json({
      success: true,
      message: 'Unit added successfully',
      data: newUnit
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update unit price
exports.updateItemUnit = async (req, res) => {
  try {
    const { unitId } = req.params;
    const { unitPrice, description, isActive } = req.body;

    const unit = await ItemUnit.findByIdAndUpdate(
      unitId,
      {
        unitPrice: unitPrice || undefined,
        description: description || undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!unit) {
      return res.status(404).json({ message: 'Unit not found' });
    }

    res.json({
      success: true,
      message: 'Unit updated successfully',
      data: unit
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get stock for all units of an item in a branch
exports.getItemStockByBranch = async (req, res) => {
  try {
    const { itemId, branchId } = req.params;

    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const units = await ItemUnit.find({ itemId, isActive: true });
    
    const stockData = await Promise.all(
      units.map(async (unit) => {
        const stock = await Stock.findOne({
          itemId,
          itemUnitId: unit._id,
          branchId
        });
        
        return {
          unit: unit,
          quantity: stock ? stock.quantity : 0,
          status: stock ? stock.status : 'out-of-stock',
          minStock: stock ? stock.minStock : 0,
          maxStock: stock ? stock.maxStock : 100
        };
      })
    );

    res.json({
      success: true,
      item: {
        id: item._id,
        name: item.name,
        sku: item.sku
      },
      stock: stockData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get item stock availability across all branches for all unit prices
exports.getItemStockAllBranches = async (req, res) => {
  try {
    const { itemId } = req.params;

    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Get all units for this item
    const units = await ItemUnit.find({ itemId, isActive: true }).sort({ unitPrice: 1 });
    if (!units || units.length === 0) {
      return res.status(404).json({ message: 'No units found for this item' });
    }

    // Get all branches
    const Branch = require('../models/branches');
    const branches = await Branch.find();

    // Get stock for each unit in each branch
    const branchStockData = await Promise.all(
      branches.map(async (branch) => {
        const unitsStock = await Promise.all(
          units.map(async (unit) => {
            const stock = await Stock.findOne({
              itemId,
              itemUnitId: unit._id,
              branchId: branch._id
            });

            return {
              unitId: unit._id,
              unit: unit.unit,
              quantity: unit.unitsPerPack,
              unitPrice: unit.unitPrice,
              stockQuantity: stock ? stock.quantity : 0,
              status: stock ? stock.status : 'out-of-stock',
              minStock: stock ? stock.minStock : 0,
              maxStock: stock ? stock.maxStock : 100,
              pricePerUnit: (unit.unitPrice / unit.unitsPerPack).toFixed(2)
            };
          })
        );

        return {
          branchId: branch._id,
          branchName: branch.branchName,
          location: branch.location,
          units: unitsStock
        };
      })
    );

    // Calculate totals
    const totalByUnit = {};
    const totalByBranch = {};

    units.forEach(unit => {
      totalByUnit[unit._id] = 0;
    });

    branches.forEach(branch => {
      totalByBranch[branch._id] = 0;
    });

    branchStockData.forEach(branch => {
      branch.units.forEach(unit => {
        totalByUnit[unit.unitId] = (totalByUnit[unit.unitId] || 0) + unit.stockQuantity;
        totalByBranch[branch.branchId] = (totalByBranch[branch.branchId] || 0) + unit.stockQuantity;
      });
    });

    res.json({
      success: true,
      item: {
        id: item._id,
        name: item.name,
        sku: item.sku,
        category: item.category
      },
      branches: branchStockData,
      summary: {
        totalByUnit,
        totalByBranch,
        overallTotal: Object.values(totalByUnit).reduce((a, b) => a + b, 0),
        unitCount: units.length,
        branchCount: branches.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get stock matrix (compact view for dashboard)
exports.getStockMatrix = async (req, res) => {
  try {
    const { itemId } = req.params;

    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Get all units
    const units = await ItemUnit.find({ itemId, isActive: true }).sort({ unitPrice: 1 });
    if (!units || units.length === 0) {
      return res.status(404).json({ message: 'No units found for this item' });
    }

    // Get all branches
    const Branch = require('../models/branches');
    const branches = await Branch.find();

    // Build matrix: rows = branches, columns = units
    const matrix = {
      item: item.name,
      sku: item.sku,
      units: units.map(u => ({
        id: u._id,
        label: `${u.unitsPerPack}${u.unit}`,
        price: u.unitPrice
      })),
      branches: await Promise.all(
        branches.map(async (branch) => {
          const stocks = await Stock.find({
            itemId,
            branchId: branch._id
          }).populate('itemUnitId');

          const stockMap = {};
          stocks.forEach(stock => {
            stockMap[stock.itemUnitId._id] = stock.quantity;
          });

          return {
            branchName: branch.branchName,
            branchId: branch._id,
            stocks: units.map(u => stockMap[u._id] || 0)
          };
        })
      )
    };

    res.json({
      success: true,
      data: matrix
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all items with complete stock information
exports.getAllItemsWithCompleteStock = async (req, res) => {
  try {
    const Item = require('../models/items');
    const Branch = require('../models/branches');

    const items = await Item.find().limit(50);
    const branches = await Branch.find();

    const itemsWithStock = await Promise.all(
      items.map(async (item) => {
        const units = await ItemUnit.find({ itemId: item._id, isActive: true });

        if (units.length === 0) {
          return null;
        }

        const branchStocks = await Promise.all(
          branches.map(async (branch) => {
            const stocks = await Promise.all(
              units.map(async (unit) => {
                const stock = await Stock.findOne({
                  itemId: item._id,
                  itemUnitId: unit._id,
                  branchId: branch._id
                });

                return {
                  unit: `${unit.unitsPerPack}${unit.unit}`,
                  price: unit.unitPrice,
                  quantity: stock ? stock.quantity : 0
                };
              })
            );

            return {
              branch: branch.branchName,
              stocks
            };
          })
        );

        return {
          itemId: item._id,
          name: item.name,
          sku: item.sku,
          branchInventory: branchStocks
        };
      })
    );

    res.json({
      success: true,
      data: itemsWithStock.filter(item => item !== null)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
