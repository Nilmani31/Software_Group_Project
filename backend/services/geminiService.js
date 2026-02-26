const Groq = require('groq-sdk');
const inventoryService = require('./inventoryService');
const poService = require('./poService');
const grnService = require('./grnService');

class GeminiService {
    constructor() {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            throw new Error('GROQ_API_KEY environment variable not set');
        }

        this.client = new Groq({ apiKey });
        
        // Rate limiting for quota management  
        this.lastRequestTime = 0;
        this.minInterval = 10000; // 10 seconds between requests (Groq is generous)
    }

    getSystemPrompt() {
        return `You are an intelligent inventory management assistant. Your job is to help users manage inventory effectively.

Available Functions you can call:
1. checkStock(itemName) - Check stock levels for an item
2. addStock(itemName, quantity) - Add stock 
3. removeStock(itemName, quantity) - Remove/use stock
4. getLowStockItems() - Show items below minimum stock
5. viewAllPurchaseOrders() - Show all purchase orders
6. getPendingPurchaseOrders() - Show pending orders only
7. viewGoodsReceived() - Show recent goods received
8. checkGoodsReceivedItem(itemName) - Check GRN for specific item

Based on what the user asks, identify which function(s) to call with extracted parameters.

IMPORTANT:
- Always be helpful and user-friendly
- If you need clarification, ask politely
- Provide clear, formatted responses
- Use emojis and formatting for clarity
- If unsure which function to call, ask the user for clarification
- For stock operations, always ask for quantity if not provided

Examples:
- "Do we have coffee?" → Call checkStock("coffee")
- "Add 50 units of milk" → Call addStock("milk", 50)
- "What's our low stock?" → Call getLowStockItems()
- "Show pending orders" → Call getPendingPurchaseOrders()`;
    }

    async chat(userMessage) {
        try {
            // Rate limiting for quota management (Groq is generous - 10s is enough)
            const now = Date.now();
            const timeSinceLastRequest = now - this.lastRequestTime;
            const waitTime = Math.max(0, this.minInterval - timeSinceLastRequest);
            
            if (waitTime > 0) {
                const waitSeconds = Math.ceil(waitTime / 1000);
                console.log(`⏳ Rate limit: Wait ${waitSeconds}s before next request`);
                return {
                    success: false,
                    message: `⏳ Please wait ${waitSeconds} seconds before sending another message`,
                    intent: 'RATE_LIMITED',
                    offline: false,
                    timestamp: new Date().toISOString(),
                    waitSeconds: waitSeconds
                };
            }

            this.lastRequestTime = now;
            
            // Parse functions locally
            const functions = this.parseFunctionsLocally(userMessage);
            
            let results = [];
            let intent = 'CONVERSATION';

            // Execute the identified functions (no API call)
            if (functions.length > 0) {
                results = await this.executeFunctions(functions);
                intent = functions[0]?.name || 'CONVERSATION';
                console.log(`📊 Execution Results:`, results);
            }

            // SINGLE API CALL: Get Groq's response with results
            const responsePrompt = functions.length > 0
                ? `User asked: "${userMessage}"\n\nI executed these operations with results:\n\n${results.map(r => `${r.function}: ${r.result}`).join('\n\n')}\n\nProvide a clear, helpful response based on these results. Use emojis and formatting.`
                : `User message: "${userMessage}"\n\nRespond helpfully as an inventory assistant. Use emojis and formatting.`;

            const response = await this.client.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'system',
                        content: this.getSystemPrompt()
                    },
                    {
                        role: 'user',
                        content: responsePrompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 1024
            });

            const responseText = response.choices[0].message.content;
            console.log(`✅ Groq Response:\n${responseText}`);

            return {
                success: true,
                message: responseText,
                intent: intent,
                offline: false,
                timestamp: new Date().toISOString(),
                executedFunctions: functions.map(f => f.name)
            };

        } catch (error) {
            console.error('Groq Service Error:', error);
            return {
                success: false,
                message: `❌ Error: ${error.message}`,
                intent: 'ERROR',
                offline: false,
                timestamp: new Date().toISOString()
            };
        }
    }

    parseFunctionsLocally(userMessage) {
        // LOCAL function parsing - NO API CALL
        // Detects keywords in user message to identify what to execute
        const functions = [];
        const lowerMsg = userMessage.toLowerCase();

        // Keywords mapping
        const functionMap = {
            'low stock|low on|running low|critical stock|reorder': { name: 'getLowStockItems', extract: null },
            'check stock|available|how much|do we have': { name: 'checkStock', extract: 'itemName' },
            'add stock|add to|add \\d+': { name: 'addStock', extract: 'itemName,quantity' },
            'remove stock|use|remove \\d+': { name: 'removeStock', extract: 'itemName,quantity' },
            'goods received|grn|received items': { name: 'checkGoodsReceivedItem', extract: 'itemName' },
            'purchase order|purchase|order|pending order': { name: 'viewAllPurchaseOrders', extract: null }
        };

        // Check which functions are mentioned
        for (const [keywords, funcInfo] of Object.entries(functionMap)) {
            const pattern = new RegExp(keywords, 'i');
            if (pattern.test(lowerMsg)) {
                const params = this.extractParametersLocally(userMessage, funcInfo.name);
                functions.push({
                    name: funcInfo.name,
                    params
                });
                break; // Execute first matching function
            }
        }

        return functions;
    }

    extractParametersLocally(message, functionName) {
        // LOCAL parameter extraction - NO API CALL
        const params = {};
        const lowerMsg = message.toLowerCase();

        // Extract item name
        if (['checkStock', 'addStock', 'removeStock', 'checkGoodsReceivedItem'].includes(functionName)) {
            // Look for quoted text
            const quoteMatch = message.match(/"([^"]+)"|'([^']+)'/);
            if (quoteMatch) {
                params.itemName = quoteMatch[1] || quoteMatch[2];
            } else {
                // Extract after keywords
                const itemKeywords = ['of', 'for', 'item', 'product'];
                for (const keyword of itemKeywords) {
                    const regex = new RegExp(`${keyword}\\s+([a-z0-9\\s]+?)(?:\\s+(?:units?|kg|liters?|g|box|packet|with))?$`, 'i');
                    const match = message.match(regex);
                    if (match) {
                        params.itemName = match[1].trim();
                        break;
                    }
                }
            }
        }

        // Extract quantity
        if (['addStock', 'removeStock'].includes(functionName)) {
            const numberMatch = message.match(/(\d+(?:\.\d+)?)\s*(?:kg|units?|liters?|g|pound|box|packet)/i);
            if (numberMatch) {
                params.quantity = parseInt(numberMatch[1]);
            }
        }

        return params;
    }

    async executeFunctions(functions) {
        const results = [];

        for (const func of functions) {
            try {
                let result;
                
                switch (func.name) {
                    case 'checkStock':
                        result = await inventoryService.checkStock(func.params.itemName);
                        break;
                    case 'addStock':
                        if (!func.params.quantity) {
                            result = '❌ Please specify quantity. Example: "Add 50 units of coffee"';
                        } else {
                            result = await inventoryService.addStock(func.params.itemName, func.params.quantity);
                        }
                        break;
                    case 'removeStock':
                        if (!func.params.quantity) {
                            result = '❌ Please specify quantity. Example: "Remove 10 units of milk"';
                        } else {
                            result = await inventoryService.removeStock(func.params.itemName, func.params.quantity);
                        }
                        break;
                    case 'getLowStockItems':
                        result = await inventoryService.getLowStockItems();
                        break;
                    case 'viewAllPurchaseOrders':
                        result = await poService.viewAllPurchaseOrders();
                        break;
                    case 'getPendingPurchaseOrders':
                        result = await poService.getPendingPurchaseOrders();
                        break;
                    case 'viewGoodsReceived':
                        result = await grnService.viewGoodsReceived();
                        break;
                    case 'checkGoodsReceivedItem':
                        result = await grnService.checkGoodsReceivedItem(func.params.itemName);
                        break;
                    default:
                        result = '❌ Function not recognized';
                }

                results.push({
                    function: func.name,
                    result: result
                });

            } catch (error) {
                console.error(`Error executing ${func.name}:`, error);
                results.push({
                    function: func.name,
                    result: `❌ Error: ${error.message}`
                });
            }
        }

        return results;
    }
}

// Singleton instance
let geminiService = null;

async function getGeminiService() {
    if (!geminiService) {
        geminiService = new GeminiService();
    }
    return geminiService;
}

module.exports = {
    getGeminiService,
    GeminiService
};
