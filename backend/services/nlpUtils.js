/**
 * Advanced NLP Processing Utilities - No paid APIs required
 * Implements:
 * - Fuzzy matching for item/entity names
 * - Synonym and abbreviation expansion
 * - Better tokenization and stemming
 * - Intent confidence scoring
 */

class NLPUtils {
    constructor() {
        // Common abbreviations and their expansions
        this.abbreviations = {
            'qty': 'quantity',
            'qty.': 'quantity',
            'amt': 'amount',
            'amt.': 'amount',
            'no.': 'number',
            'no': 'number',
            'vol': 'volume',
            'vol.': 'volume',
            'kg': 'kilogram',
            'ltr': 'liter',
            'hr': 'hour',
            'hrs': 'hours',
            'pcs': 'pieces',
            'pc': 'piece',
            'pkg': 'package',
            'pkgs': 'packages',
            'n/a': 'not available',
            'oos': 'out of stock',
            'po': 'purchase order',
            'grn': 'goods received note',
            'msg': 'message',
            'asap': 'as soon as possible'
        };

        // Common item name variations
        this.itemSynonyms = {
            'coffee': ['coffee', 'espresso', 'brew', 'cafe', 'caffeine'],
            'milk': ['milk', 'dairy', 'whole milk', 'fresh milk'],
            'sugar': ['sugar', 'sweetener', 'glucose'],
            'tea': ['tea', 'chai', 'leaf tea'],
            'keyboard': ['keyboard', 'kb', 'typing board'],
            'mouse': ['mouse', 'pointer', 'pointing device'],
            'monitor': ['monitor', 'screen', 'display', 'lcd'],
            'laptop': ['laptop', 'notebook', 'computer'],
            'printer': ['printer', 'printing machine'],
            'paper': ['paper', 'sheets', 'a4'],
            'pen': ['pen', 'pencil', 'writing'],
            'notebook': ['notebook', 'pad', 'notepad']
        };

        // Stemming rules (basic suffix stripping)
        this.stemmingRules = [
            { regex: /ing$/, replacement: '' },
            { regex: /ed$/, replacement: '' },
            { regex: /ies$/, replacement: 'y' },
            { regex: /es$/, replacement: '' },
            { regex: /s$/, replacement: '' }
        ];
    }

    /**
     * Levenshtein distance - measure similarity between two strings
     * Used for fuzzy matching and typo tolerance
     */
    levenshteinDistance(str1, str2) {
        const len1 = str1.length;
        const len2 = str2.length;
        const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(0));

        for (let i = 0; i <= len1; i++) matrix[0][i] = i;
        for (let i = 0; i <= len2; i++) matrix[i][0] = i;

        for (let j = 1; j <= len2; j++) {
            for (let i = 1; i <= len1; i++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,
                    matrix[j - 1][i] + 1,
                    matrix[j - 1][i - 1] + cost
                );
            }
        }

        return matrix[len2][len1];
    }

    /**
     * Calculate similarity score (0-1) between two strings
     * 1 = identical, 0 = completely different
     */
    stringSimilarity(str1, str2) {
        const maxLen = Math.max(str1.length, str2.length);
        if (maxLen === 0) return 1;
        const distance = this.levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
        return 1 - (distance / maxLen);
    }

    /**
     * Fuzzy match a user input against a list of valid items
     * Returns matches with confidence scores
     */
    fuzzyMatch(userInput, validItems, threshold = 0.6) {
        const userLower = userInput.toLowerCase().trim();
        const matches = [];

        for (const item of validItems) {
            const itemLower = item.toLowerCase();
            
            // Exact match gets highest score
            if (itemLower === userLower) {
                matches.push({ item, score: 1.0, type: 'exact' });
                continue;
            }

            // Substring match
            if (itemLower.includes(userLower) || userLower.includes(itemLower)) {
                matches.push({ item, score: 0.95, type: 'substring' });
                continue;
            }

            // Fuzzy match using Levenshtein distance
            const similarity = this.stringSimilarity(userInput, item);
            if (similarity >= threshold) {
                matches.push({ item, score: similarity, type: 'fuzzy' });
            }
        }

        // Sort by score descending
        return matches.sort((a, b) => b.score - a.score);
    }

    /**
     * Expand abbreviations in text
     * Example: "add 50 qty of coffee" → "add 50 quantity of coffee"
     */
    expandAbbreviations(text) {
        let expanded = text;
        for (const [abbr, full] of Object.entries(this.abbreviations)) {
            const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
            expanded = expanded.replace(regex, full);
        }
        return expanded;
    }

    /**
     * Simple stemming - reduce words to root form
     * Helps match variations like "checking", "checked" → "check"
     */
    stem(word) {
        let stemmed = word.toLowerCase();
        for (const rule of this.stemmingRules) {
            if (rule.regex.test(stemmed)) {
                stemmed = stemmed.replace(rule.regex, rule.replacement);
                break;
            }
        }
        return stemmed;
    }

    /**
     * Tokenize text into meaningful words
     * Removes common stop words
     */
    tokenize(text) {
        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
            'should', 'may', 'might', 'can', 'must', 'shall'
        ]);

        return text
            .toLowerCase()
            .split(/\W+/)
            .filter(word => word.length > 0 && !stopWords.has(word))
            .map(word => this.stem(word));
    }

    /**
     * Extract likely item names from user message
     * Considers quoted text, position, context, and question patterns
     */
    extractItemNames(message) {
        const items = [];
        const questionWords = new Set(['is', 'are', 'do', 'does', 'did', 'can', 'could', 'will', 'would', 'should', 'may', 'might', 'have', 'has', 'had']);

        // 1. Check for quoted text first (highest priority)
        const quoteMatches = message.match(/"([^"]+)"|'([^']+)'/g);
        if (quoteMatches) {
            quoteMatches.forEach(match => {
                const clean = match.slice(1, -1);
                items.push({ name: clean, confidence: 0.95 });
            });
        }

        // 2. Look for item patterns after keywords
        const itemKeywords = ['of', 'for', 'item', 'product', 'about', 'stock', 'check'];
        itemKeywords.forEach(keyword => {
            const regex = new RegExp(
                `${keyword}\\s+([a-z0-9\\s&'.\\-]+?)(?:\\s+(?:units?|kg|liters?|g|box|packet|pieces?|with|supplier|available|in))?(?:\\s|$|\\?)`,
                'i'
            );
            const match = message.match(regex);
            if (match) {
                items.push({ name: match[1].trim(), confidence: 0.75 });
            }
        });

        // 3. Handle question patterns: "is X available?", "do we have X?", etc.
        const questionPatterns = [
            /(?:is|are)\s+([a-z0-9\s&'.\\-]+?)\s+(?:available|in stock|in our|stock|\?)/i,
            /(?:do|does|have|has|can)\s+(?:we\s+)?(?:have|get|find)\s+([a-z0-9\s&'.\\-]+?)(?:\s|\?|$)/i,
            /(?:check|search|find)\s+(?:for\s+)?([a-z0-9\s&'.\\-]+?)(?:\s|\?|$)/i
        ];
        
        questionPatterns.forEach(pattern => {
            const match = message.match(pattern);
            if (match) {
                items.push({ name: match[1].trim(), confidence: 0.85 });
            }
        });

        // 4. Look for capitalized proper nouns (likely item names)
        // But filter out starting question words
        const capitalizedMatches = message.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g);
        if (capitalizedMatches) {
            capitalizedMatches.forEach(name => {
                const firstWord = name.split(' ')[0].toLowerCase();
                // Skip if it's a question word
                if (!questionWords.has(firstWord)) {
                    items.push({ name, confidence: 0.7 });
                }
            });
        }

        // Remove duplicates and return unique items sorted by confidence
        const seen = new Set();
        return items.filter(item => {
            const key = item.name.toLowerCase().trim();
            if (seen.has(key) || key.length === 0) return false;
            seen.add(key);
            return true;
        }).sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Extract numbers and units from message
     * Example: "50 kg", "100 units", "25.5 liters"
     */
    extractQuantities(message) {
        const quantities = [];
        const regex = /(\d+(?:\.\d+)?)\s*(?:(kg|units?|liters?|g|pounds?|box|boxes|packet|packets|pcs|pieces?|l))?/gi;
        
        let match;
        while ((match = regex.exec(message)) !== null) {
            quantities.push({
                amount: parseFloat(match[1]),
                unit: (match[2] || 'units').toLowerCase(),
                fullMatch: match[0]
            });
        }
        return quantities;
    }

    /**
     * Extract entity references (supplier, role, category, etc.)
     */
    extractEntity(message, entityType) {
        const patterns = {
            supplier: /(?:from|with|supplier|vendor|by)\s+([a-z0-9\s&'.]+?)(?:\s+supplier)?$/i,
            role: /(?:role|position)\s+([a-z0-9\s]+?)(?:\s+role)?$/i,
            category: /(?:category|in|type)\s+([a-z0-9\s]+?)(?:\s+category)?$/i,
            branch: /(?:branch|location|at|warehouse)\s+([a-z0-9\s]+?)(?:\s+branch)?$/i
        };

        const pattern = patterns[entityType];
        if (!pattern) return null;

        const match = message.match(pattern);
        return match ? match[1].trim() : null;
    }

    /**
     * Detect intent with confidence scoring
     * Returns intent with confidence level
     */
    detectIntent(message, availableFunctions) {
        const lowerMsg = message.toLowerCase();
        const tokens = this.tokenize(message);
        
        const intentPatterns = {
            'CHECK': {
                keywords: ['check', 'check', 'verify', 'search', 'find', 'how', 'many', 'available', 'stock'],
                confidence: 0.8
            },
            'ADD': {
                keywords: ['add', 'receive', 'import', 'bring', 'stock', 'increase'],
                confidence: 0.85
            },
            'REMOVE': {
                keywords: ['remove', 'use', 'reduce', 'decrease', 'issue', 'remove', 'take'],
                confidence: 0.85
            },
            'LIST': {
                keywords: ['show', 'list', 'all', 'view', 'display', 'tell', 'what'],
                confidence: 0.75
            },
            'REPORT': {
                keywords: ['report', 'summary', 'analytics', 'trend', 'history'],
                confidence: 0.7
            }
        };

        let bestIntent = null;
        let bestScore = 0;

        for (const [intent, pattern] of Object.entries(intentPatterns)) {
            let score = 0;
            let matches = 0;

            for (const keyword of pattern.keywords) {
                if (tokens.includes(this.stem(keyword)) || lowerMsg.includes(keyword)) {
                    matches++;
                }
            }

            if (matches > 0) {
                score = (matches / pattern.keywords.length) * pattern.confidence;
                if (score > bestScore) {
                    bestScore = score;
                    bestIntent = intent;
                }
            }
        }

        return {
            intent: bestIntent || 'CONVERSATION',
            confidence: Math.min(bestScore, 1.0)
        };
    }

    /**
     * Correct common typos/misspellings using fuzzy matching
     * Learns from valid inventory items
     */
    autoCorrect(userText, validItems = []) {
        const words = userText.split(/\s+/);
        const corrected = [];

        for (const word of words) {
            // Check if word is in valid items
            const matches = this.fuzzyMatch(word, validItems, 0.5);
            if (matches.length > 0 && matches[0].score > 0.7) {
                corrected.push(matches[0].item);
            } else {
                corrected.push(word);
            }
        }

        return corrected.join(' ');
    }

    /**
     * Context-aware response formatting
     * Generates appropriate prompt based on extracted information
     */
    buildContextualPrompt(userMessage, extractedData) {
        let context = `User message: "${userMessage}"\n\n`;

        if (extractedData.intent) {
            context += `Intent: ${extractedData.intent.intent} (confidence: ${(extractedData.intent.confidence * 100).toFixed(0)}%)\n`;
        }

        if (extractedData.items && extractedData.items.length > 0) {
            context += `\nLikely items: ${extractedData.items.map(i => `"${i.name}"`).join(', ')}\n`;
        }

        if (extractedData.quantities && extractedData.quantities.length > 0) {
            context += `Quantities: ${extractedData.quantities.map(q => `${q.amount} ${q.unit}`).join(', ')}\n`;
        }

        if (extractedData.entity) {
            context += `\nEntity: ${extractedData.entity}\n`;
        }

        return context;
    }
}

module.exports = new NLPUtils();
