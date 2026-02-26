const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat');

// POST /api/chat/send-message
router.post('/send-message', chatController.sendMessage);

// GET /api/chat/health
router.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'Node.js NLP Chat Service',
        database: 'MongoDB Atlas',
        offline: true,
        timestamp: new Date()
    });
});

module.exports = router;
