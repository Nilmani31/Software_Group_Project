const express = require('express');
const router = express.Router();
const unitsController = require('../controllers/units');

router.get('/', unitsController.getAllUnits);
router.get('/:id', unitsController.getUnitById);
router.post('/', unitsController.createUnit);
router.put('/:id', unitsController.updateUnit);
router.delete('/:id', unitsController.deleteUnit);

module.exports = router;
