const Groq = require('groq-sdk');
const inventoryService = require('./inventoryService');
const poService = require('./poService');
const grnService = require('./grnService');
const suppliersService = require('./suppliersService');
const rolesService = require('./rolesService');
const categoriesService = require('./categoriesService');
const issueNotesService = require('./issueNotesService');

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

INVENTORY & STOCK:
1. checkStock(itemName) - Check stock levels for an item
2. addStock(itemName, quantity) - Add stock 
3. removeStock(itemName, quantity) - Remove/use stock
4. getLowStockItems() - Show items below minimum stock

PURCHASE ORDERS:
5. viewAllPurchaseOrders() - Show all purchase orders
6. getPendingPurchaseOrders() - Show pending orders only

GOODS RECEIVED:
7. viewGoodsReceived() - Show recent goods received
8. checkGoodsReceivedItem(itemName) - Check GRN for specific item

SUPPLIERS:
9. viewAllSuppliers() - Show all suppliers
10. getSupplierDetails(supplierName) - Get specific supplier info

ROLES:
11. viewAllRoles() - Show all roles
12. getRoleDetails(roleName) - Get specific role details

CATEGORIES:
13. viewAllCategories() - Show all categories
14. getCategoryDetails(categoryName) - Get specific category details

ISSUE NOTES:
15. viewRecentIssueNotes() - Show recent issue notes
16. getIssueNoteDetails(issueNumber) - Get issue note details
17. checkIssuedItems(itemName) - Check issued quantities of an item

Based on what the user asks, identify which function(s) to call with extracted parameters.

IMPORTANT:
- Always be helpful and user-friendly
- If you need clarification, ask politely
- Provide clear, formatted responses
- Use emojis and formatting for clarity
- If unsure which function to call, ask the user for clarification
- For stock operations, always ask for quantity if not provided
- For listings (suppliers, roles, categories), show all results

Examples:
- "Do we have coffee?" → Call checkStock("coffee")
- "Show suppliers" → Call viewAllSuppliers()
- "Show all roles" → Call viewAllRoles()
- "Show categories" → Call viewAllCategories()
- "Show issue notes" → Call viewRecentIssueNotes()`;
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

        // Keywords mapping - Order matters! More specific patterns first
        const functionMap = {
            'pending order|pending purchase': { name: 'getPendingPurchaseOrders', extract: null },
            'purchase order|purchase\\s+order': { name: 'viewAllPurchaseOrders', extract: null },
            'low stock|low on|running low|critical stock|reorder': { name: 'getLowStockItems', extract: null },
            'check stock|available|how much|do we have': { name: 'checkStock', extract: 'itemName' },
            'add stock|add to|add \\d+': { name: 'addStock', extract: 'itemName,quantity' },
            'remove stock|use|remove \\d+': { name: 'removeStock', extract: 'itemName,quantity' },
            'goods received items|grn items|received items': { name: 'viewGoodsReceived', extract: null },
            'goods received|grn|show received': { name: 'checkGoodsReceivedItem', extract: 'itemName' },
            'supplier': { name: 'viewAllSuppliers', extract: 'supplierName' },
            'role': { name: 'viewAllRoles', extract: 'roleName' },
            'categor': { name: 'viewAllCategories', extract: 'categoryName' },
            'issue': { name: 'viewRecentIssueNotes', extract: 'issueNumber' }
        };

        // Check which functions are mentioned
        for (const [keywords, funcInfo] of Object.entries(functionMap)) {
            const pattern = new RegExp(keywords, 'i');
            if (pattern.test(lowerMsg)) {
                const params = this.extractParametersLocally(userMessage, funcInfo.name);
                
                // Special handling for list vs detail queries
                if (funcInfo.name === 'checkGoodsReceivedItem' && !params.itemName) {
                    functions.push({
                        name: 'viewGoodsReceived',
                        params: {}
                    });
                } else if (funcInfo.name === 'viewAllSuppliers' && params.supplierName) {
                    functions.push({
                        name: 'getSupplierDetails',
                        params
                    });
                } else if (funcInfo.name === 'viewAllSuppliers' && !params.supplierName) {
                    functions.push({
                        name: 'viewAllSuppliers',
                        params: {}
                    });
                } else if (funcInfo.name === 'viewAllRoles' && params.roleName) {
                    functions.push({
                        name: 'getRoleDetails',
                        params
                    });
                } else if (funcInfo.name === 'viewAllRoles' && !params.roleName) {
                    functions.push({
                        name: 'viewAllRoles',
                        params: {}
                    });
                } else if (funcInfo.name === 'viewAllCategories' && params.categoryName) {
                    functions.push({
                        name: 'getCategoryDetails',
                        params
                    });
                } else if (funcInfo.name === 'viewAllCategories' && !params.categoryName) {
                    functions.push({
                        name: 'viewAllCategories',
                        params: {}
                    });
                } else if (funcInfo.name === 'viewRecentIssueNotes' && params.issueNumber) {
                    functions.push({
                        name: 'getIssueNoteDetails',
                        params
                    });
                } else if (funcInfo.name === 'viewRecentIssueNotes' && !params.issueNumber) {
                    functions.push({
                        name: 'viewRecentIssueNotes',
                        params: {}
                    });
                } else {
                    functions.push({
                        name: funcInfo.name,
                        params
                    });
                }
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
        if (['checkStock', 'addStock', 'removeStock', 'checkGoodsReceivedItem', 'checkIssuedItems', 'viewAllSuppliers'].includes(functionName)) {
            const quoteMatch = message.match(/"([^"]+)"|'([^']+)'/);
            if (quoteMatch) {
                if (functionName === 'viewAllSuppliers') {
                    params.supplierName = quoteMatch[1] || quoteMatch[2];
                } else if (functionName === 'checkIssuedItems') {
                    params.itemName = quoteMatch[1] || quoteMatch[2];
                } else {
                    params.itemName = quoteMatch[1] || quoteMatch[2];
                }
            } else {
                const itemKeywords = ['of', 'for', 'item', 'product', 'about'];
                for (const keyword of itemKeywords) {
                    const regex = new RegExp(`${keyword}\\s+([a-z0-9\\s&'.]+?)(?:\\s+(?:units?|kg|liters?|g|box|packet|with|supplier))?$`, 'i');
                    const match = message.match(regex);
                    if (match) {
                        const extractedName = match[1].trim();
                        if (functionName === 'viewAllSuppliers') {
                            params.supplierName = extractedName;
                        } else if (functionName === 'checkIssuedItems') {
                            params.itemName = extractedName;
                        } else {
                            params.itemName = extractedName;
                        }
                        break;
                    }
                }
            }
        }

        // Extract supplier name
        if (['getSupplierDetails', 'viewAllSuppliers'].includes(functionName)) {
            if (!params.supplierName) {
                const quoteMatch = message.match(/"([^"]+)"|'([^']+)'/);
                if (quoteMatch) {
                    params.supplierName = quoteMatch[1] || quoteMatch[2];
                } else {
                    const supplierMatch = message.match(/(?:about|for|tell me about|show|from)\s+([a-z0-9\s&'.]+?)(?:\s+supplier)?$/i);
                    if (supplierMatch) {
                        params.supplierName = supplierMatch[1].trim();
                    }
                }
            }
        }

        // Extract role name
        if (['getRoleDetails', 'viewAllRoles'].includes(functionName)) {
            if (!params.roleName) {
                const quoteMatch = message.match(/"([^"]+)"|'([^']+)'/);
                if (quoteMatch) {
                    params.roleName = quoteMatch[1] || quoteMatch[2];
                } else {
                    const roleMatch = message.match(/(?:about|for|tell me about|show|role)\s+([a-z0-9\s]+?)(?:\s+role)?$/i);
                    if (roleMatch) {
                        params.roleName = roleMatch[1].trim();
                    }
                }
            }
        }

        // Extract category name
        if (['getCategoryDetails', 'viewAllCategories'].includes(functionName)) {
            if (!params.categoryName) {
                const quoteMatch = message.match(/"([^"]+)"|'([^']+)'/);
                if (quoteMatch) {
                    params.categoryName = quoteMatch[1] || quoteMatch[2];
                } else {
                    const categoryMatch = message.match(/(?:about|for|tell me about|show|categor)\s+([a-z0-9\s]+?)(?:\s+categor)?$/i);
                    if (categoryMatch) {
                        params.categoryName = categoryMatch[1].trim();
                    }
                }
            }
        }

        // Extract issue number
        if (['getIssueNoteDetails', 'viewRecentIssueNotes'].includes(functionName)) {
            if (!params.issueNumber) {
                const quoteMatch = message.match(/"([^"]+)"|'([^']+)'/);
                if (quoteMatch) {
                    params.issueNumber = quoteMatch[1] || quoteMatch[2];
                } else {
                    const issueMatch = message.match(/(?:issue|note|notes?)\s+([a-z0-9\-]+)/i);
                    if (issueMatch) {
                        params.issueNumber = issueMatch[1].trim();
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
                    case 'viewAllSuppliers':
                        result = await suppliersService.viewAllSuppliers();
                        break;
                    case 'getSupplierDetails':
                        result = await suppliersService.getSupplierDetails(func.params.supplierName);
                        break;
                    case 'viewAllRoles':
                        result = await rolesService.viewAllRoles();
                        break;
                    case 'getRoleDetails':
                        result = await rolesService.getRoleDetails(func.params.roleName);
                        break;
                    case 'viewAllCategories':
                        result = await categoriesService.viewAllCategories();
                        break;
                    case 'getCategoryDetails':
                        result = await categoriesService.getCategoryDetails(func.params.categoryName);
                        break;
                    case 'viewRecentIssueNotes':
                        result = await issueNotesService.viewRecentIssueNotes();
                        break;
                    case 'getIssueNoteDetails':
                        result = await issueNotesService.getIssueNoteDetails(func.params.issueNumber);
                        break;
                    case 'checkIssuedItems':
                        result = await issueNotesService.checkIssuedItems(func.params.itemName);
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
