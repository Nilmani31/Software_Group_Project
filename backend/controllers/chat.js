const { getGeminiService } = require('../services/geminiService');

async function sendMessage(req, res) {
    const { userMessage } = req.body;

    if (!userMessage) {
        return res.status(400).json({
            success: false,
            message: 'No message provided'
        });
    }

    try {
        console.log(`\n📨 User message: "${userMessage}"`);

        // Get Groq AI service instance
        const geminiService = await getGeminiService();

        // Process message with Groq AI
        const response = await geminiService.chat(userMessage);

        console.log(`✅ Groq Response: ${response.intent}`);
        console.log(`📊 Executed: ${response.executedFunctions?.join(', ') || 'None'}\n`);

        res.json({
            success: response.success,
            message: response.message,
            intent: response.intent,
            offline: false,
            powered: 'Groq AI',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Chat error:', error);
        res.status(500).json({
            success: false,
            message: `Error: ${error.message}`,
            offline: false,
            powered: 'Groq AI'
        });
    }
}

module.exports = {
    sendMessage
};
