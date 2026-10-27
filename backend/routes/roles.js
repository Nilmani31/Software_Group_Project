const express = require('express');
const router = express.Router();
const { getAllRoles, getRole, createRole, updateRole, deleteRole } = require('../controllers/roles');

// Get all roles
router.get('/', getAllRoles);

// Get single role
router.get('/:id', getRole);

// Create new role
router.post('/', createRole);

// Update role
router.put('/:id', updateRole);

// Delete role
router.delete('/:id', deleteRole);

module.exports = router;
