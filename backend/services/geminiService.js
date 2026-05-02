const Groq = require('groq-sdk');
const nlpUtils = require('./nlpUtils');
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
        
        // Cache for valid items, suppliers, roles, categories
        this.validItems = [];
        this.validSuppliers = [];
        this.validRoles = [];
        this.validCategories = [];
        this.cacheTime = Date.now();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    }
    
    /**
     * Load and cache valid items, suppliers, roles, and categories for fuzzy matching
     */
    async loadValidEntities() {
        try {
            const now = Date.now();
            // Only refresh cache every 5 minutes
            if (now - this.cacheTime < this.cacheExpiry && this.validItems.length > 0) {
                return;
            }
            
            // Load items
            const itemsResult = await inventoryService.getLowStockItems();
            if (itemsResult) {
                this.validItems = this.extractItemNames(itemsResult);
            }
            
            // Load suppliers
            const suppliersResult = await suppliersService.viewAllSuppliers();
            if (suppliersResult) {
                this.validSuppliers = this.extractEntityNames(suppliersResult, 'supplier');
            }
            
            // Load roles
            const rolesResult = await rolesService.viewAllRoles();
            if (rolesResult) {
                this.validRoles = this.extractEntityNames(rolesResult, 'role');
            }
            
            // Load categories
            const categoriesResult = await categoriesService.viewAllCategories();
            if (categoriesResult) {
                this.validCategories = this.extractEntityNames(categoriesResult, 'category');
            }
            
            this.cacheTime = now;
            console.log(`✅ NLP Cache loaded: ${this.validItems.length} items, ${this.validSuppliers.length} suppliers, ${this.validRoles.length} roles, ${this.validCategories.length} categories`);
        } catch (error) {
            console.error('Error loading valid entities:', error);
        }
    }
    
    /**
     * Extract item names from results
     */
    extractItemNames(result) {
        const items = [];
        if (typeof result === 'string') {
            // Parse string results
            const matches = result.match(/(?:Item|Name|Product):\s*([^\n,]+)/gi);
            if (matches) {
                matches.forEach(match => {
                    const name = match.split(':')[1].trim();
                    if (name && name.length > 0) items.push(name);
                });
            }
        } else if (Array.isArray(result)) {
            result.forEach(item => {
                if (item.itemName) items.push(item.itemName);
                if (item.name) items.push(item.name);
            });
        }
        return [...new Set(items)]; // Remove duplicates
    }
    
    /**
     * Extract entity names from results
     */
    extractEntityNames(result, type = 'supplier') {
        const entities = [];
        if (typeof result === 'string') {
            // Parse string results
            const matches = result.match(/(?:Name|Supplier|Category|Role):\s*([^\n,]+)/gi);
            if (matches) {
                matches.forEach(match => {
                    const name = match.split(':')[1].trim();
                    if (name && name.length > 0) entities.push(name);
                });
            }
        } else if (Array.isArray(result)) {
            result.forEach(entity => {
                if (entity.name) entities.push(entity.name);
                if (entity.supplierName) entities.push(entity.supplierName);
                if (entity.categoryName) entities.push(entity.categoryName);
                if (entity.roleName) entities.push(entity.roleName);
            });
        }
        return [...new Set(entities)]; // Remove duplicates
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
            // Load valid entities for fuzzy matching (cached)
            await this.loadValidEntities();
            
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
            
            // Expand abbreviations in user message
            const expandedMessage = nlpUtils.expandAbbreviations(userMessage);
            if (expandedMessage !== userMessage) {
                console.log(`🔤 Expanded abbreviations: "${userMessage}" → "${expandedMessage}"`);
            }
            
            // Parse functions locally with improved NLP
            const functions = this.parseFunctionsLocally(expandedMessage);
            
            // Detect intent with confidence scoring
            const intentDetection = nlpUtils.detectIntent(expandedMessage, null);
            
            let results = [];
            let intent = intentDetection.intent;

            // Execute the identified functions (no API call)
            if (functions.length > 0) {
                results = await this.executeFunctions(functions);
                intent = functions[0]?.name || intentDetection.intent;
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
                confidence: intentDetection.confidence,
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
        // IMPROVED LOCAL function parsing with NLP utilities
        // Detects keywords in user message to identify what to execute
        const functions = [];
        const lowerMsg = userMessage.toLowerCase();
        const tokens = nlpUtils.tokenize(userMessage);

        // Keywords mapping with stemmed versions - Order matters! More specific patterns first
        const functionMap = {
            'pending order|pending purchase': { name: 'getPendingPurchaseOrders', extract: null },
            'purchase order|purchase\\s+order|po': { name: 'viewAllPurchaseOrders', extract: null },
            'how many.*out of stock|items.*out of stock|count.*out of stock|out of stock': { name: 'getOutOfStockItems', extract: null },
            'out of stock|out of stok|no stock|zero stock|empty|none left': { name: 'getLowStockItems', extract: null },
            'low stock|low on|running low|critical stock|reorder|below|urgent': { name: 'getLowStockItems', extract: null },
            'check stock|available|how much|do we have|stock level|inventory|in stock': { name: 'checkStock', extract: 'itemName' },
            'add stock|add to|add \\d+|receive|incoming|stock in|receive item': { name: 'addStock', extract: 'itemName,quantity' },
            'remove stock|use|remove \\d+|issue|consume|take out|subtract': { name: 'removeStock', extract: 'itemName,quantity' },
            'goods received items|grn items|received items|goods receipt': { name: 'viewGoodsReceived', extract: null },
            'goods received|grn|show received|received': { name: 'checkGoodsReceivedItem', extract: 'itemName' },
            'supplier|vendor|supplier list': { name: 'viewAllSuppliers', extract: 'supplierName' },
            'role|position|user role': { name: 'viewAllRoles', extract: 'roleName' },
            'categor|type|group': { name: 'viewAllCategories', extract: 'categoryName' },
            'issue note|issue|issued': { name: 'viewRecentIssueNotes', extract: 'issueNumber' }
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
        // IMPROVED LOCAL parameter extraction with NLP utilities and fuzzy matching
        const params = {};
        const lowerMsg = message.toLowerCase();

        // Extract item name with fuzzy matching
        if (['checkStock', 'addStock', 'removeStock', 'checkGoodsReceivedItem', 'checkIssuedItems'].includes(functionName)) {
            // First try quoted text
            const quoteMatch = message.match(/"([^"]+)"|'([^']+)'/);
            if (quoteMatch) {
                params.itemName = quoteMatch[1] || quoteMatch[2];
                console.log(`📌 Quoted item extracted: "${params.itemName}"`);
            } else {
                // Extract potential item names from message
                const itemExtraction = nlpUtils.extractItemNames(message);
                console.log(`🔍 Item extraction results:`, itemExtraction);
                
                if (itemExtraction.length > 0) {
                    const userItemName = itemExtraction[0].name;
                    console.log(`📍 Top candidate: "${userItemName}" (confidence: ${(itemExtraction[0].confidence * 100).toFixed(0)}%)`);
                    
                    // Try fuzzy matching against valid items if available
                    if (this.validItems.length > 0) {
                        const matches = nlpUtils.fuzzyMatch(userItemName, this.validItems, 0.6);
                        if (matches.length > 0) {
                            params.itemName = matches[0].item;
                            if (matches[0].score < 1.0) {
                                console.log(`🔀 Fuzzy matched: "${userItemName}" → "${matches[0].item}" (similarity: ${(matches[0].score * 100).toFixed(0)}%, type: ${matches[0].type})`);
                            } else {
                                console.log(`✅ Exact match found: "${matches[0].item}"`);
                            }
                        } else {
                            params.itemName = userItemName;
                            console.log(`⚠️ No fuzzy match found, using original: "${userItemName}"`);
                        }
                    } else {
                        params.itemName = userItemName;
                        console.log(`⏭️ Cache not loaded, using extracted name: "${userItemName}"`);
                    }
                } else {
                    console.log(`⚠️ No item names extracted from message`);
                }
            }
        }

        // Extract supplier name with fuzzy matching
        if (['getSupplierDetails', 'viewAllSuppliers'].includes(functionName)) {
            if (!params.supplierName) {
                const quoteMatch = message.match(/"([^"]+)"|'([^']+)'/);
                if (quoteMatch) {
                    params.supplierName = quoteMatch[1] || quoteMatch[2];
                } else {
                    const supplierEntity = nlpUtils.extractEntity(message, 'supplier');
                    if (supplierEntity) {
                        // Try fuzzy matching
                        if (this.validSuppliers.length > 0) {
                            const matches = nlpUtils.fuzzyMatch(supplierEntity, this.validSuppliers, 0.6);
                            params.supplierName = matches.length > 0 ? matches[0].item : supplierEntity;
                        } else {
                            params.supplierName = supplierEntity;
                        }
                    }
                }
            }
        }

        // Extract role name with fuzzy matching
        if (['getRoleDetails', 'viewAllRoles'].includes(functionName)) {
            if (!params.roleName) {
                const quoteMatch = message.match(/"([^"]+)"|'([^']+)'/);
                if (quoteMatch) {
                    params.roleName = quoteMatch[1] || quoteMatch[2];
                } else {
                    const roleEntity = nlpUtils.extractEntity(message, 'role');
                    if (roleEntity) {
                        // Try fuzzy matching
                        if (this.validRoles.length > 0) {
                            const matches = nlpUtils.fuzzyMatch(roleEntity, this.validRoles, 0.6);
                            params.roleName = matches.length > 0 ? matches[0].item : roleEntity;
                        } else {
                            params.roleName = roleEntity;
                        }
                    }
                }
            }
        }

        // Extract category name with fuzzy matching
        if (['getCategoryDetails', 'viewAllCategories'].includes(functionName)) {
            if (!params.categoryName) {
                const quoteMatch = message.match(/"([^"]+)"|'([^']+)'/);
                if (quoteMatch) {
                    params.categoryName = quoteMatch[1] || quoteMatch[2];
                } else {
                    const categoryEntity = nlpUtils.extractEntity(message, 'category');
                    if (categoryEntity) {
                        // Try fuzzy matching
                        if (this.validCategories.length > 0) {
                            const matches = nlpUtils.fuzzyMatch(categoryEntity, this.validCategories, 0.6);
                            params.categoryName = matches.length > 0 ? matches[0].item : categoryEntity;
                        } else {
                            params.categoryName = categoryEntity;
                        }
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

        // Extract quantities using NLP utility
        if (['addStock', 'removeStock'].includes(functionName)) {
            const quantities = nlpUtils.extractQuantities(message);
            if (quantities.length > 0) {
                params.quantity = quantities[0].amount;
                params.unit = quantities[0].unit;
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
                    case 'getOutOfStockItems':
                        result = await inventoryService.getOutOfStockItems();
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
