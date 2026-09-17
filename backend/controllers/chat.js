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

        // Get AI service instance
        const geminiService = await getGeminiService();

        // Process message with AI
        const response = await geminiService.chat(userMessage);

        if (response.isStream) {
            // Setup SSE headers
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            
            // Send initial intent/metadata
            res.write(`data: ${JSON.stringify({ type: 'meta', intent: response.intent, executedFunctions: response.executedFunctions })}\n\n`);

            for await (const chunk of response.stream) {
                const text = chunk.text();
                res.write(`data: ${JSON.stringify({ type: 'chunk', text: text })}\n\n`);
            }
            
            res.write(`data: [DONE]\n\n`);
            res.end();
            return;
        }

        console.log(`✅ AI Response: ${response.intent}`);
        console.log(`📊 Executed: ${response.executedFunctions?.join(', ') || 'None'}\n`);

        res.json({
            success: response.success,
            message: response.message,
            intent: response.intent,
            offline: false,
            powered: 'Gemini AI',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Chat error:', error);
        
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: `Error: ${error.message}`,
                offline: false,
                powered: 'Gemini AI'
            });
        } else {
            res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
            res.end();
        }
    }
}

module.exports = {
    sendMessage
};
