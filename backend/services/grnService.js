const GoodsReceived = require('../models/goodsReceived');
const Item = require('../models/items');
const Stock = require('../models/stock');

// View all Goods Received with intelligent summary
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

// Check specific item in goods received
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

// Advanced: Get inventory reconciliation report
async function getReconciliationReport() {
    try {
        const totalReceivedValue = await GoodsReceived.aggregate([
            {
                $group: {
                    _id: null,
                    totalValue: {
                        $sum: {
                            $sum: {
                                $map: {
                                    input: '$items',
                                    as: 'item',
                                    in: { $multiply: ['$$item.quantityReceived', '$$item.unitPrice'] }
                                }
                            }
                        }
                    },
                    totalItems: { $sum: 1 }
                }
            }
        ]);

        const monthlyStats = await GoodsReceived.aggregate([
            {
                $group: {
                    _id: {
                        year: { $year: '$receivedDate' },
                        month: { $month: '$receivedDate' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
            { $limit: 12 }
        ]);

        return {
            totalValue: totalReceivedValue[0]?.totalValue || 0,
            totalGRNs: totalReceivedValue[0]?.totalItems || 0,
            monthlyStats
        };
    } catch (error) {
        console.error('Error generating reconciliation report:', error);
        throw error;
    }
}

// Check for discrepancies between PO and GRN
async function checkPOGRNDiscrepancies(poNumber) {
    try {
        const PurchaseOrder = require('../models/purchaseOrder');
        const po = await PurchaseOrder.findOne({ poNumber });
        
        if (!po) {
            return `❌ Purchase Order ${poNumber} not found`;
        }

        const grns = await GoodsReceived.find({ poNumber });

        if (grns.length === 0) {
            return `⚠️ No GRNs received for PO: ${poNumber}<br>` +
                   `Expected items: ${po.items ? po.items.length : 0}`;
        }

        let response = `📊 <strong>PO-GRN Reconciliation: ${poNumber}</strong><br><br>`;
        let discrepancies = 0;

        po.items.forEach(poItem => {
            let totalReceived = 0;
            
            grns.forEach(grn => {
                const grnItem = grn.items.find(i => 
                    i.itemName.toLowerCase() === poItem.itemName.toLowerCase()
                );
                if (grnItem) {
                    totalReceived += grnItem.quantityReceived;
                }
            });

            if (totalReceived !== poItem.quantity) {
                discrepancies++;
                const diff = poItem.quantity - totalReceived;
                const icon = diff > 0 ? '⚠️' : '✓';
                response += `${icon} <strong>${poItem.itemName}</strong><br>`;
                response += `   Expected: ${poItem.quantity} | Received: ${totalReceived} | Difference: ${diff}<br>`;
            }
        });

        if (discrepancies === 0) {
            response += `✅ All items matched! PO fully received.`;
        }

        return response;
    } catch (error) {
        console.error('Error checking discrepancies:', error);
        return `❌ Error: ${error.message}`;
    }
}

module.exports = {
    viewGoodsReceived,
    checkGoodsReceivedItem,
    getReconciliationReport,
    checkPOGRNDiscrepancies
};
