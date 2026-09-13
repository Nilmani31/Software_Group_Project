const { GoogleGenerativeAI } = require('@google/generative-ai');
const inventoryService = require('./inventoryService');
const poService = require('./poService');
const grnService = require('./grnService');
const suppliersService = require('./suppliersService');
const rolesService = require('./rolesService');
const categoriesService = require('./categoriesService');
const issueNotesService = require('./issueNotesService');

class GeminiService {
    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY environment variable not set');
        }

        this.genAI = new GoogleGenerativeAI(apiKey);
        this.modelName = "gemini-3.5-flash-lite"; // lighter model to reduce quota limits
        
        // Rate limiting for quota management  
        this.lastRequestTime = 0;
        this.minInterval = 2000; // 2 seconds between requests to stay well within 15 RPM limits
    }

    getSystemPrompt() {
        return `You are a READ-ONLY inventory management assistant for CBBS (Colombo Bartender & Barista School).

STRICT RULES:
- ONLY answer questions related to inventory, stock, items, purchase orders, goods received, suppliers, categories, branches, and issue notes.
- If the user asks something outside inventory (weather, coding, math, general knowledge, personal questions), politely decline and say: "I can only help with inventory-related questions."
- NEVER reveal any sensitive information such as passwords, API keys, database details, user emails, or internal system details.
- When presenting data with multiple properties (e.g., lists of items, orders, or suppliers), ALWAYS use Markdown tables.
- For other information or summaries, use concise bullet points instead of long paragraphs.
- Keep the overall tone professional and formal, formatting your answers like a brief business report.
- Do NOT use emojis or overly casual language. Maintain a formal tone.
- If a function returns an error, explain it simply and professionally to the user.
- If you are unsure which function to call, ask the user to clarify.`;
    }

    // Define all available tools (READ-ONLY functions only) for Gemini
    getTools() {
        return [{
            functionDeclarations: [
                // STOCK & INVENTORY
                {
                    name: "checkStock",
                    description: "Check stock levels and availability for a specific item across all branches",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            itemName: {
                                type: "STRING",
                                description: "The name of the item to check stock for (e.g. 'coffee', 'milk', 'shaker')"
                            }
                        },
                        required: ["itemName"]
                    }
                },
                {
                    name: "getLowStockItems",
                    description: "Get all items that are below their minimum stock level and need reordering"
                },
                {
                    name: "getOutOfStockItems",
                    description: "Get all items that have zero stock and are completely out of stock"
                },
                {
                    name: "getInventorySummary",
                    description: "Get a high-level overview/summary of the entire inventory including total items, branches, stock status counts"
                },
                {
                    name: "searchItem",
                    description: "Search for items by name in the inventory catalog",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            itemName: {
                                type: "STRING",
                                description: "The search term to find items (e.g. 'coffee', 'milk', 'cup')"
                            }
                        },
                        required: ["itemName"]
                    }
                },
                {
                    name: "getItemsByCategory",
                    description: "Get all items that belong to a specific category",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            categoryName: {
                                type: "STRING",
                                description: "The category name (e.g. 'Coffee Supplies', 'Bar Supplies', 'Equipment', 'Dairy')"
                            }
                        },
                        required: ["categoryName"]
                    }
                },

                // PURCHASE ORDERS
                {
                    name: "viewAllPurchaseOrders",
                    description: "View all purchase orders in the system with their status, supplier, and amounts"
                },
                {
                    name: "getPendingPurchaseOrders",
                    description: "View only the pending/awaiting purchase orders that have not been received yet"
                },

                // GOODS RECEIVED NOTES (GRN)
                {
                    name: "viewGoodsReceived",
                    description: "View recent goods received notes (GRN) showing what deliveries have arrived"
                },
                {
                    name: "checkGoodsReceivedItem",
                    description: "Check goods received records for a specific item to see delivery history",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            itemName: {
                                type: "STRING",
                                description: "The item name to search in goods received records"
                            }
                        },
                        required: ["itemName"]
                    }
                },
                {
                    name: "getReconciliationReport",
                    description: "Get a reconciliation report showing total value of goods received and monthly statistics"
                },
                {
                    name: "checkPOGRNDiscrepancies",
                    description: "Check for discrepancies between a purchase order and what was actually received in the GRN",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            poNumber: {
                                type: "STRING",
                                description: "The purchase order number to check (e.g. 'PO-001')"
                            }
                        },
                        required: ["poNumber"]
                    }
                },

                // SUPPLIERS
                {
                    name: "viewAllSuppliers",
                    description: "View all suppliers with their contact information"
                },
                {
                    name: "getSupplierDetails",
                    description: "Get detailed information about a specific supplier",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            supplierName: {
                                type: "STRING",
                                description: "The name of the supplier to look up"
                            }
                        },
                        required: ["supplierName"]
                    }
                },

                // CATEGORIES & BRANCHES
                {
                    name: "viewAllCategories",
                    description: "View all item categories in the system"
                },
                {
                    name: "getCategoryDetails",
                    description: "Get details about a specific category",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            categoryName: {
                                type: "STRING",
                                description: "The category name to look up"
                            }
                        },
                        required: ["categoryName"]
                    }
                },
                {
                    name: "getBranchList",
                    description: "View all branches/locations with their contact details"
                },

                // ISSUE NOTES
                {
                    name: "viewRecentIssueNotes",
                    description: "View recent issue notes (stock transfer records between branches)"
                },
                {
                    name: "getIssueNoteDetails",
                    description: "Get details of a specific issue note by its number",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            issueNumber: {
                                type: "STRING",
                                description: "The issue note number to look up"
                            }
                        },
                        required: ["issueNumber"]
                    }
                },
                {
                    name: "checkIssuedItems",
                    description: "Check how much of a specific item has been issued/transferred",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            itemName: {
                                type: "STRING",
                                description: "The item name to check issue history for"
                            }
                        },
                        required: ["itemName"]
                    }
                },

                // ROLES
                {
                    name: "viewAllRoles",
                    description: "View all user roles defined in the system"
                },
                {
                    name: "getRoleDetails",
                    description: "Get details about a specific user role",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            roleName: {
                                type: "STRING",
                                description: "The role name to look up (e.g. 'Admin', 'Manager', 'Staff')"
                            }
                        },
                        required: ["roleName"]
                    }
                }
            ]
        }];
    }

    async chat(userMessage) {
        try {
            // Rate limiting
            const now = Date.now();
            const timeSinceLastRequest = now - this.lastRequestTime;
            const waitTime = Math.max(0, this.minInterval - timeSinceLastRequest);
            
            if (waitTime > 0) {
                // Return immediate rate limit error
                return {
                    success: false,
                    isStream: false,
                    message: `⏳ Please wait ${Math.ceil(waitTime / 1000)} seconds before sending another message`,
                    intent: 'RATE_LIMITED'
                };
            }

            this.lastRequestTime = now;
            console.log(`\n📨 User message: "${userMessage}"`);

            const model = this.genAI.getGenerativeModel({ 
                model: this.modelName,
                systemInstruction: this.getSystemPrompt(),
                tools: this.getTools()
            });

            // Using stateless prompt accumulation to completely bypass SDK history bugs (like missing thought_signature)
            const allExecutedFunctions = [];
            let accumulatedData = "";

            while (true) {
                // Construct a stateless prompt
                let prompt = userMessage;
                if (accumulatedData) {
                    prompt = `User message: ${userMessage}\n\nRetrieved Database Data:\n${accumulatedData}\n\nPlease answer the user's message using the provided database data.`;
                }

                const streamResult = await model.generateContentStream(prompt);
                const iterator = streamResult.stream[Symbol.asyncIterator]();
                const firstResult = await iterator.next();
                
                if (firstResult.done) {
                    return { success: false, isStream: false, message: "Empty response from AI." };
                }
                
                const firstChunk = firstResult.value;

                if (firstChunk.functionCalls() && firstChunk.functionCalls().length > 0) {
                    // It's a tool call turn.
                    try { for await (const chunk of iterator) { /* drain */ } } catch (e) { }

                    const response = await streamResult.response;
                    const functionCalls = response.functionCalls();
                    
                    console.log(`🔧 Gemini wants to call ${functionCalls.length} function(s)`);

                    for (const call of functionCalls) {
                        const funcName = call.name;
                        const args = call.args || {};
                        console.log(`   📞 Calling: ${funcName}(${JSON.stringify(args)})`);
                        allExecutedFunctions.push(funcName);
                        
                        let funcResult;
                        try {
                            funcResult = await this.executeFunction(funcName, args);
                        } catch (err) {
                            funcResult = { error: err.message };
                        }
                        
                        accumulatedData += `\n- Result from ${funcName}: ${typeof funcResult === 'string' ? funcResult : JSON.stringify(funcResult)}`;
                    }
                    
                    // Loop again, appending the new database results to the next stateless prompt
                } else {
                    // It's a text response! Yield the first chunk, then the rest.
                    console.log(`✅ Started streaming final text response`);
                    if (allExecutedFunctions.length > 0) {
                        console.log(`📊 Functions executed: ${allExecutedFunctions.join(', ')}`);
                    }

                    async function* wrappedStream() {
                        yield firstChunk;
                        for await (const chunk of iterator) {
                            yield chunk;
                        }
                    }

                    return {
                        success: true,
                        isStream: true,
                        stream: wrappedStream(),
                        intent: allExecutedFunctions[0] || 'CONVERSATION',
                        executedFunctions: allExecutedFunctions
                    };
                }
            }

        } catch (error) {
            console.error("Gemini Service Error:", error);
            return {
                success: false,
                isStream: false,
                message: `Sorry, I encountered an error: ${error.message}`,
                intent: 'ERROR'
            };
        }
    }

    // Execute a single function by name
    async executeFunction(funcName, params) {
        try {
            switch (funcName) {
                // Stock & Inventory
                case 'checkStock':
                    return await inventoryService.checkStock(params.itemName);
                case 'getLowStockItems':
                    return await inventoryService.getLowStockItems();
                case 'getOutOfStockItems':
                    return await inventoryService.getOutOfStockItems();
                case 'getInventorySummary':
                    return await inventoryService.getInventorySummary();
                case 'searchItem':
                    return await inventoryService.searchItem(params.itemName);
                case 'getItemsByCategory':
                    return await inventoryService.getItemsByCategory(params.categoryName);

                // Purchase Orders
                case 'viewAllPurchaseOrders':
                    return await poService.viewAllPurchaseOrders();
                case 'getPendingPurchaseOrders':
                    return await poService.getPendingPurchaseOrders();

                // Goods Received
                case 'viewGoodsReceived':
                    return await grnService.viewGoodsReceived();
                case 'checkGoodsReceivedItem':
                    return await grnService.checkGoodsReceivedItem(params.itemName);
                case 'getReconciliationReport':
                    return await grnService.getReconciliationReport();
                case 'checkPOGRNDiscrepancies':
                    return await grnService.checkPOGRNDiscrepancies(params.poNumber);

                // Suppliers
                case 'viewAllSuppliers':
                    return await suppliersService.viewAllSuppliers();
                case 'getSupplierDetails':
                    return await suppliersService.getSupplierDetails(params.supplierName);

                // Categories & Branches
                case 'viewAllCategories':
                    return await categoriesService.viewAllCategories();
                case 'getCategoryDetails':
                    return await categoriesService.getCategoryDetails(params.categoryName);
                case 'getBranchList':
                    return await inventoryService.getBranchList();

                // Issue Notes
                case 'viewRecentIssueNotes':
                    return await issueNotesService.viewRecentIssueNotes();
                case 'getIssueNoteDetails':
                    return await issueNotesService.getIssueNoteDetails(params.issueNumber);
                case 'checkIssuedItems':
                    return await issueNotesService.checkIssuedItems(params.itemName);

                // Roles
                case 'viewAllRoles':
                    return await rolesService.viewAllRoles();
                case 'getRoleDetails':
                    return await rolesService.getRoleDetails(params.roleName);

                default:
                    return `❌ Unknown function: ${funcName}`;
            }
        } catch (error) {
            console.error(`❌ Error executing ${funcName}:`, error);
            return `❌ Error executing ${funcName}: ${error.message}`;
        }
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
