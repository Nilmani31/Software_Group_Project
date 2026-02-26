const GoodsReceived = require('../models/goodsReceived');
const Item = require('../models/items');

async function viewGoodsReceived() {
    try {
        const grns = await GoodsReceived.find({})
            .sort({ receivedDate: -1 })
            .limit(15);

        if (grns.length === 0) {
            return '📭 No goods received records found in system yet.';
        }

        let response = `📥 <strong>Recent Goods Received (${grns.length}):</strong><br><br>`;
        
        grns.forEach((grn, index) => {
            const itemCount = grn.items ? grn.items.length : 0;
            const receivedDate = new Date(grn.receivedDate).toLocaleDateString();
            const receivedTime = new Date(grn.receivedDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            response += `<strong>${index + 1}. GRN: ${grn.grnNumber}</strong> ✅<br>`;
            response += `   From PO: <strong>${grn.poNumber}</strong><br>`;
            response += `   Items Received: ${itemCount}<br>`;
            response += `   Date: ${receivedDate} at ${receivedTime}<br><br>`;
        });

        return response;

    } catch (error) {
        console.error('Error viewing GRNs:', error);
        return `❌ Error fetching goods received: ${error.message}`;
    }
}

async function checkGoodsReceivedItem(itemName) {
    if (!itemName) {
        return '❌ Please specify which item to check. Example: "Show goods received for coffee"';
    }

    try {
        console.log(`🔍 Searching GRN for: "${itemName}"`);

        // Find with better matching
        const grns = await GoodsReceived.find({
            'items.itemName': { $regex: itemName, $options: 'i' }
        })
        .sort({ receivedDate: -1 })
        .limit(10);

        if (grns.length === 0) {
            return `❌ No goods received records found for <strong>"${itemName}"</strong><br>` +
                   `Try checking: "Show goods received" to see all items received.`;
        }

        let response = `📥 <strong>Goods Received - ${itemName}</strong><br><br>`;
        let totalQty = 0;

        grns.forEach((grn, index) => {
            response += `${index + 1}. <strong>GRN: ${grn.grnNumber}</strong><br>`;
            response += `   PO: ${grn.poNumber} | `;
            response += `Date: ${new Date(grn.receivedDate).toLocaleDateString()}<br>`;
            
            const matchingItems = grn.items.filter(i => 
                i.itemName.toLowerCase().includes(itemName.toLowerCase())
            );

            matchingItems.forEach(item => {
                const qty = item.quantityReceived || item.quantity || 0;
                const unit = item.unit || 'units';
                response += `   ✓ Received: <strong>${qty} ${unit}</strong><br>`;
                totalQty += qty;
            });
            response += '<br>';
        });

        response += `<strong>📊 Total Received: ${totalQty} units</strong>`;
        return response;

    } catch (error) {
        console.error('Error checking GRN item:', error);
        return `❌ Error checking goods: ${error.message}`;
    }
}

module.exports = {
    viewGoodsReceived,
    checkGoodsReceivedItem
};
