# Backend Services Documentation

## Overview
This directory contains all the service layer logic for the NLP-powered inventory management system. Each service handles specific business logic and database queries.

---

## 1. Intent Detector Service
**File:** `intentDetector.js`

### Purpose
Analyzes user messages and determines what action they want to perform.

### Supported Intents
| Intent | Keywords | Example |
|--------|----------|---------|
| **CHECK_STOCK** | do/have/check/show/search/any/much/how/stock/qty/quantity | "Do we have coffee?" |
| **ADD_STOCK** | add/increase/receive/stock in/bring in/incoming/received/supply | "Add 50 kg of sugar" |
| **REMOVE_STOCK** | remove/take/use/subtract/reduce/picked/issued/used/consume | "Remove 10 units of milk" |
| **LOW_STOCK** | low/critical/urgent/shortage/running low/nearly | "Show low stock items" |
| **VIEW_PURCHASE_ORDERS** | purchase/orders/po/pending/expected/received | "Show pending orders" |
| **VIEW_PENDING_PO** | pending/awaiting/expected | "What orders are pending?" |
| **CHECK_GOODS_RECEIVED** | goods/received/grn/incoming/arrived/deliveries | "Show goods received" |
| **CHECK_GRN_ITEM** | goods received/grn + item name | "Check goods received for coffee" |
| **UNKNOWN** | No matches | Asks for clarification |

### Usage
```javascript
const { detectIntent } = require('./intentDetector');
const intent = detectIntent(userMessage);
// Returns: 'CHECK_STOCK', 'ADD_STOCK', etc.
```

---

## 2. Entity Extractor Service
**File:** `entityExtractor.js`

### Purpose
Extracts specific information from user messages (item names, quantities, units, etc.)

### Key Features
✅ **Dynamic Database Loading** - Learns actual items from MongoDB Item collection
✅ **Fuzzy Matching** - Handles typos and misspellings (e.g., "coffe" → "coffee")
✅ **Smart Item Extraction** - 4-method cascade:
  1. Exact match in database
  2. Partial match (last word of multi-word items)
  3. Fuzzy match using Levenshtein distance (60% threshold)
  4. Extract first meaningful word

✅ **Unit Recognition** - 24+ unit types:
- Weight: kg, gram, g, milligram, mg, ounce, oz, lb, pound, ton
- Volume: liter, litre, l, milliliter, ml, gallon, cup
- Count: packet, pack, box, carton, bottle, tin, can, bag, bundle, dozen, piece

✅ **Quantity Extraction** - Handles:
- Numeric: "50", "100.5"
- Written: "twenty", "thirty five", "one hundred"
- Special: "dozen", "couple", "few"

✅ **Stop Word Removal** - Cleans input for better matching

### Usage
```javascript
const { extractItemName, extractQuantity, extractUnit } = require('./entityExtractor');

const itemName = extractItemName("Do we have any coffee?");
const qty = extractQuantity("Add 50 units");
const unit = extractUnit("20 kg of sugar");
```

### Similarity Threshold
Current: **0.6** (60% match required for fuzzy matching)
- Lower threshold (0.5) = more lenient, may match unrelated items
- Higher threshold (0.7) = stricter, may miss similar items
- Adjust in `entityExtractor.js` line where `bestMatch.score > 0.6` appears

---

## 3. Inventory Service
**File:** `inventoryService.js`

### Functions

#### `checkStock(itemName)`
**Returns:** HTML-formatted stock status for all branches
**Features:**
- Exact + partial item matching
- Shows quantity per branch
- Color-coded status indicators:
  - 🟢 Good level (>= minStock)
  - 🟡 Low (< 10)
  - 🟠 Critical (< 5)
  - 🔴 Out of stock (0)
- Helpful error messages with suggestions

**Example Response:**
```
📦 COFFEE
✅ Main Branch: 50 units
✅ Warehouse: 30 units
📊 Total: 80 units
🟢 Good stock level
```

#### `addStock(itemName, quantity)`
**Returns:** Confirmation of stock addition
**Features:**
- Validates item exists
- Updates stock with increment operator
- Shows new total
- Better error messages

**Example Response:**
```
✅ STOCK ADDED
Item: Coffee
Branch: Main Branch
Quantity Added: +50 units
New Total: 130 units
📊 Health: 🟢 Optimal
```

#### `removeStock(itemName, quantity)`
**Returns:** Confirmation of stock removal
**Features:**
- Validates item exists
- Checks sufficient stock available
- Shows shortage if not enough
- Updates stock with decrement
- Warns if falls below minimum

**Example Response:**
```
✅ STOCK REMOVED
Item: Milk
Branch: Main Branch
Quantity Removed: -10 units
Remaining: 15 units
📊 Status: ✅ OK
```

#### `getLowStockItems()`
**Returns:** HTML table of items below minimum stock
**Features:**
- Finds items where quantity < minStock
- Shows shortfall amount
- Lists affected branches

**Example Response:**
```
🚨 Low Stock Items:
1. Sugar
   Current: 3 | Required: 10 | Short by: 7 | Branch: Main
2. Tea
   Current: 2 | Required: 5 | Short by: 3 | Branch: Warehouse
```

---

## 4. Purchase Order Service
**File:** `poService.js`

### Functions

#### `viewAllPurchaseOrders()`
**Returns:** List of all purchase orders (last 50)
**Shows:**
- PO number
- Supplier name
- Item count
- Total amount
- Dates (ordered, expected)
- Status with emoji (⏳ PENDING, ✅ RECEIVED, ❌ CANCELLED)

#### `getPendingPurchaseOrders()`
**Returns:** Filtered list of pending orders only
**Shows:**
- Same as above but filtered for PENDING status
- Helps identify expected deliveries

---

## 5. Goods Received Note Service
**File:** `grnService.js`

### Functions

#### `viewGoodsReceived()`
**Returns:** Recent goods received records (last 15)
**Shows:**
- GRN number
- Source PO
- Number of items
- Received date and time

#### `checkGoodsReceivedItem(itemName)`
**Returns:** All GRN records containing specific item
**Features:**
- Searches item by name
- Shows quantity received
- Calculates total received
- Date information

**Example Response:**
```
📥 Goods Received - Coffee

1. GRN: GRN-001
   PO: PO-2024-001 | Date: 12/15/2024
   ✓ Received: 50 kg

📊 Total Received: 50 units
```

---

## Testing the Services

### 1. Start Backend
```bash
cd backend
npm install  # if first time
npm run dev
```

### 2. Test Chat Endpoint
```bash
# Via frontend chat UI: http://localhost:3000
# Via direct API call:
curl -X POST http://localhost:5000/api/chat/send-message \
  -H "Content-Type: application/json" \
  -d '{"userMessage":"Do we have coffee?"}'
```

### 3. Test Natural Language Variations
Try these to verify fuzzy matching works:

**Typos:**
- "Do we have coffe?" (missing 'e')
- "show sugar stock" (typo in display)
- "check thee milk" (typo in 'the')

**Natural Variations:**
- "Do we have any milk?"
- "Is there sugar in stock?"
- "How much coffee do we have?"
- "Check if we're low on milk"

**Different Formats:**
- "Add 50 coffee"
- "Receive 100 kg sugar"
- "Remove 10 units milk"
- "Take out 5 liters oil"

**Expected Results:**
✅ All should work and extract the correct item/quantity/unit

---

## Error Handling

### User-Friendly Error Messages
All services provide helpful feedback:

**Item Not Found:**
```
❌ Item "coffe" not found.
Available items: Coffee, Tea, Milk, Sugar
Try asking: "Do we have milk?" or "Check sugar"
```

**Missing Quantity:**
```
❌ Please provide: item name and quantity. 
Example: "Add 50 kg of coffee"
```

**Not Enough Stock:**
```
❌ NOT ENOUGH STOCK
Item: Milk
Available: 5 units
Requested: 10 units
Short by: 5 units
```

**No Records:**
```
✅ No pending purchase orders!
All orders are either received or cancelled.
```

---

## Database Models Used

### Item Model
- `_id`: ObjectId
- `name`: String (unique)
- `sku`: String
- `barcode`: String
- `minStock`: Number
- `maxStock`: Number

### Stock Model
- `itemId`: Reference to Item
- `branchId`: Reference to Branch
- `quantity`: Number

### PurchaseOrder Model
- `poNumber`: String (unique)
- `supplierName`: String
- `items`: Array
- `totalAmount`: Number
- `status`: PENDING | RECEIVED | CANCELLED

### GoodsReceived Model
- `grnNumber`: String (unique)
- `poNumber`: String
- `items`: Array
- `purchaseOrderId`: Reference
- `receivedDate`: Date

---

## Performance Notes

| Operation | Time | Notes |
|-----------|------|-------|
| checkStock | < 100ms | Database lookup + branch population |
| Fuzzy match | < 200ms | Levenshtein distance calculation |
| Entity extraction | < 50ms | Regex and string operations |
| Intent detection | < 10ms | Keyword matching only |

---

## Customization

### Adjust Fuzzy Match Sensitivity
In `entityExtractor.js`, change similarity threshold:
```javascript
if (bestMatch && bestMatch.score > 0.6) {  // Increase to 0.7 for stricter
```

### Add New Intent
In `intentDetector.js`, add to `INTENTS` enum and keyword array:
```javascript
NEW_INTENT: ['keyword1', 'keyword2', 'keyword3']
```

### Add New Units
In `entityExtractor.js`, add to `UNITS` array:
```javascript
'your_unit': ['variant1', 'variant2']
```

### Add Stop Words
In `entityExtractor.js`, expand `STOP_WORDS` array:
```javascript
const STOP_WORDS = ['the', 'a', 'an', 'of', 'in', 'for', 'your_word'];
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "Item not found" | Item doesn't exist in DB | Check MongoDB Item collection |
| Fuzzy match fails | Threshold too high | Decrease from 0.6 to 0.5 |
| Wrong item matched | Threshold too low | Increase from 0.6 to 0.7 |
| Quantity not extracted | Format not recognized | Check UNITS and number patterns |
| No branches in system | Empty Branch collection | Add branches via admin panel |

---

## API Response Format

All services return JSON:
```json
{
  "success": true,
  "message": "HTML formatted response",
  "intent": "CHECK_STOCK",
  "offline": true,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## Next Steps

1. **Test** with actual MongoDB data
2. **Tune** similarity threshold based on your items
3. **Add** custom units/keywords specific to your business
4. **Monitor** chat logs for improvement opportunities
5. **Deploy** to production when ready

