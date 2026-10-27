const Unit = require('../models/units');

const defaultUnits = [
  { name: 'Kilogram', symbol: 'kg', type: 'Weight', description: 'Standard metric mass for bulk inventory, powders, and coffee beans', baseUnit: 'g', conversionFactor: 1000 },
  { name: 'Gram', symbol: 'g', type: 'Weight', description: 'Precision weight measurement for ground coffee, tea, and spices', baseUnit: 'g', conversionFactor: 1 },
  { name: 'Liter', symbol: 'ltr', type: 'Volume', description: 'Metric liquid volume for milk, syrups, purees, and beverages', baseUnit: 'ml', conversionFactor: 1000 },
  { name: 'Milliliter', symbol: 'ml', type: 'Volume', description: 'Fluid portion measurement for shots, extracts, and syrups', baseUnit: 'ml', conversionFactor: 1 },
  { name: 'Pieces', symbol: 'pcs', type: 'Count', description: 'Individual discrete items, utensils, cups, and merchandise', baseUnit: 'pcs', conversionFactor: 1 },
  { name: 'Box', symbol: 'box', type: 'Packaging', description: 'Outer cardboard box or carton packaging container', baseUnit: 'pcs', conversionFactor: 1 },
  { name: 'Pack', symbol: 'pack', type: 'Packaging', description: 'Sealed multi-piece packet or consumable pack', baseUnit: 'pcs', conversionFactor: 1 },
  { name: 'Bottle', symbol: 'bottle', type: 'Packaging', description: 'Bar bottle, cordial, syrup or beverage container', baseUnit: 'pcs', conversionFactor: 1 },
  { name: 'Can', symbol: 'can', type: 'Packaging', description: 'Aluminum beverage or soda can', baseUnit: 'pcs', conversionFactor: 1 },
  { name: 'Dozen', symbol: 'dozen', type: 'Count', description: 'Standard dozen grouping (12 discrete pieces)', baseUnit: 'pcs', conversionFactor: 12 },
  { name: 'Meter', symbol: 'meter', type: 'Length', description: 'Linear metric length for rolls, tubing or cables', baseUnit: 'meter', conversionFactor: 1 }
];

// Get all units (auto-seeds defaults if empty)
exports.getAllUnits = async (req, res) => {
  try {
    let units = await Unit.find().sort({ createdAt: -1 });
    if (units.length === 0) {
      await Unit.insertMany(defaultUnits);
      units = await Unit.find().sort({ createdAt: -1 });
    }
    res.status(200).json({ success: true, data: units });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get single unit by ID
exports.getUnitById = async (req, res) => {
  try {
    const unit = await Unit.findById(req.params.id);
    if (!unit) {
      return res.status(404).json({ success: false, error: 'Unit not found' });
    }
    res.status(200).json({ success: true, data: unit });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create a new unit
exports.createUnit = async (req, res) => {
  try {
    const { name, symbol, type, description, baseUnit, conversionFactor, status } = req.body;

    if (!name || !symbol) {
      return res.status(400).json({ success: false, error: 'Name and Symbol are required' });
    }

    const existing = await Unit.findOne({
      $or: [
        { symbol: symbol.trim().toLowerCase() },
        { name: new RegExp(`^${name.trim()}$`, 'i') }
      ]
    });

    if (existing) {
      return res.status(400).json({ success: false, error: 'A unit with this name or symbol already exists' });
    }

    const unit = new Unit({
      name: name.trim(),
      symbol: symbol.trim().toLowerCase(),
      type: type || 'Count',
      description: description || '',
      baseUnit: baseUnit || '',
      conversionFactor: Number(conversionFactor) || 1,
      status: status || 'ACTIVE'
    });

    const saved = await unit.save();
    res.status(201).json({ success: true, data: saved });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update unit
exports.updateUnit = async (req, res) => {
  try {
    const { name, symbol, type, description, baseUnit, conversionFactor, status } = req.body;

    const unit = await Unit.findById(req.params.id);
    if (!unit) {
      return res.status(404).json({ success: false, error: 'Unit not found' });
    }

    if (name) unit.name = name.trim();
    if (symbol) unit.symbol = symbol.trim().toLowerCase();
    if (type) unit.type = type;
    if (description !== undefined) unit.description = description;
    if (baseUnit !== undefined) unit.baseUnit = baseUnit;
    if (conversionFactor !== undefined) unit.conversionFactor = Number(conversionFactor) || 1;
    if (status) unit.status = status;
    unit.updatedAt = new Date();

    const updated = await unit.save();
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete unit
exports.deleteUnit = async (req, res) => {
  try {
    const unit = await Unit.findByIdAndDelete(req.params.id);
    if (!unit) {
      return res.status(404).json({ success: false, error: 'Unit not found' });
    }
    res.status(200).json({ success: true, message: 'Unit deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
