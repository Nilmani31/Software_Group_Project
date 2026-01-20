//generate route for user login and management
const express = require('express');
const router = express.Router();
const authController = require('../controllers/users');    

// User Management Routes
router.get('/', authController.getAllUsers);                // Get all users
router.post('/create', authController.createUser);      // Create new user
router.put('/:id', authController.updateUser);          // Update user
router.delete('/:id', authController.deleteUser);       // Delete user
router.post('/login', authController.login);             // Login user

module.exports = router;