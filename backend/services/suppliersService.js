const Supplier = require('../models/suppliers');

async function viewAllSuppliers() {
    try {
        const suppliers = await Supplier.find({})
            .sort({ name: 1 })
            .limit(50);

        if (suppliers.length === 0) {
            return '📭 No suppliers found in system.';
        }

        let response = `🏢 <strong>All Suppliers (${suppliers.length} total):</strong><br><br>`;
        
        suppliers.forEach((supplier, index) => {
            response += `<strong>${index + 1}. ${supplier.name}</strong><br>`;
            response += `   Contact: ${supplier.contactPerson || 'N/A'}<br>`;
            response += `   Phone: ${supplier.phone || 'N/A'}<br>`;
            response += `   Email: ${supplier.email || 'N/A'}<br>`;
            response += `   Address: ${supplier.address || 'N/A'}<br><br>`;
        });

        return response;

    } catch (error) {
        console.error('Error viewing suppliers:', error);
        return `❌ Error fetching suppliers: ${error.message}`;
    }
}

async function getSupplierDetails(supplierName) {
    if (!supplierName) {
        return '❌ Please specify which supplier. Example: "Tell me about CoffeeLanka"';
    }

    try {
        const supplier = await Supplier.findOne({
            name: { $regex: supplierName, $options: 'i' }
        });

        if (!supplier) {
            return `❌ Supplier "${supplierName}" not found.`;
        }

        let response = `🏢 <strong>${supplier.name}</strong><br>`;
        response += `Contact Person: ${supplier.contactPerson || 'N/A'}<br>`;
        response += `Phone: ${supplier.phone || 'N/A'}<br>`;
        response += `Email: ${supplier.email || 'N/A'}<br>`;
        response += `Address: ${supplier.address || 'N/A'}<br>`;
        response += `Payment Terms: ${supplier.paymentTerms || 'N/A'}<br>`;

        return response;

    } catch (error) {
        console.error('Error getting supplier details:', error);
        return `❌ Error fetching supplier: ${error.message}`;
    }
}

module.exports = {
    viewAllSuppliers,
    getSupplierDetails
};
