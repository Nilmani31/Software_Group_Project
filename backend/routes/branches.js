const express = require('express');
const router = express.Router();
const branchesController = require('../controllers/branches');

router.get('/', branchesController.getBranches);
router.get('/:branchId', branchesController.getBranchById);
router.post('/', branchesController.createBranch);
router.put('/:branchId', branchesController.updateBranch);
router.delete('/:branchId', branchesController.deleteBranch);

module.exports = router;
