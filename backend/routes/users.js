//generate route for user login and management
const express = require('express');
const router = express.Router();
const authController = require('../controllers/users');    
const authenticate = require('../middleware/authenticate');

router.post('/login', authController.login);

// User management routes require authentication. Login remains public.
router.use(authenticate);
router.get('/', authController.getAllUsers);
router.post('/create', authController.createUser);
router.put('/:id', authController.updateUser);
router.delete('/:id', authController.deleteUser);

module.exports = router;