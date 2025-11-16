//generate route for user login
const express = require('express');
const router = express.Router();
const authController = require('../controllers/users');    
// POST /api/auth/login
router.post('/login', authController.login);
module.exports = router;