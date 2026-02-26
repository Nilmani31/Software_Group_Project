const PurchaseOrder = require('../models/purchaseOrder');

async function viewAllPurchaseOrders() {
    try {
        const pos = await PurchaseOrder.find({})
            .sort({ createdAt: -1 })
            .limit(50);

        if (pos.length === 0) {
            return '📋 No purchase orders found in system.';
        }

        let response = `📋 <strong>All Purchase Orders (${pos.length} total):</strong><br><br>`;
        
        pos.forEach((po, index) => {
            const statusEmoji = po.status === 'PENDING' ? '⏳' : 
                              po.status === 'RECEIVED' ? '✅' : '❌';
            
            const itemCount = po.items ? po.items.length : 0;
            const orderedDate = po.orderedDate ? new Date(po.orderedDate).toLocaleDateString() : 'N/A';
            const expectedDate = po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : 'N/A';
            
            response += `<strong>${index + 1}. PO: ${po.poNumber}</strong> ${statusEmoji}<br>`;
            response += `   Supplier: <strong>${po.supplierName}</strong><br>`;
            response += `   Items: ${itemCount} | Amount: $${po.totalAmount || 0}<br>`;
            response += `   Ordered: ${orderedDate} | Expected: ${expectedDate}<br><br>`;
        });

        return response;

    } catch (error) {
        console.error('Error viewing POs:', error);
        return `❌ Error fetching purchase orders: ${error.message}`;
    }
}

async function getPendingPurchaseOrders() {
    try {
        const pos = await PurchaseOrder.find({ status: 'PENDING' })
            .sort({ createdAt: -1 });

        if (pos.length === 0) {
            return '✅ <strong>No pending purchase orders!</strong><br>All orders are either received or cancelled.';
        }

        let response = `⏳ <strong>Pending Purchase Orders (${pos.length}):</strong><br><br>`;
        
        pos.forEach((po, index) => {
            const itemCount = po.items ? po.items.length : 0;
            const expectedDate = po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : 'Not specified';
            const orderedDate = po.orderedDate ? new Date(po.orderedDate).toLocaleDateString() : 'N/A';
            
            response += `<strong>${index + 1}. ${po.poNumber}</strong><br>`;
            response += `   Supplier: <strong>${po.supplierName}</strong><br>`;
            response += `   Items: ${itemCount} | Amount: <strong>$${po.totalAmount || 0}</strong><br>`;
            response += `   Ordered: ${orderedDate} | Expected: ${expectedDate}<br><br>`;
        });

        return response;

    } catch (error) {
        console.error('Error getting pending POs:', error);
        return `❌ Error fetching pending orders: ${error.message}`;
    }
}

module.exports = {
    viewAllPurchaseOrders,
    getPendingPurchaseOrders
};
