const IssueNote = require('../models/issueNotes');
const Item = require('../models/items');

async function viewRecentIssueNotes() {
    try {
        const issueNotes = await IssueNote.find({})
            .sort({ issueDate: -1 })
            .limit(15)
            .populate('issuedBy', 'name email');

        if (issueNotes.length === 0) {
            return '📭 No issue notes found in system.';
        }

        let response = `📋 <strong>Recent Issue Notes (${issueNotes.length}):</strong><br><br>`;
        
        issueNotes.forEach((note, index) => {
            const itemCount = note.items ? note.items.length : 0;
            const issueDate = new Date(note.issueDate).toLocaleDateString();
            
            response += `<strong>${index + 1}. Issue Note: ${note.issueNumber}</strong><br>`;
            response += `   Items: ${itemCount}<br>`;
            response += `   Date: ${issueDate}<br>`;
            response += `   Status: ${note.status || 'N/A'}<br><br>`;
        });

        return response;

    } catch (error) {
        console.error('Error viewing issue notes:', error);
        return `❌ Error fetching issue notes: ${error.message}`;
    }
}

async function getIssueNoteDetails(issueNumber) {
    if (!issueNumber) {
        return '❌ Please specify which issue note. Example: "Show details of issue note IN-001"';
    }

    try {
        const issueNote = await IssueNote.findOne({
            issueNumber: { $regex: issueNumber, $options: 'i' }
        })
        .populate('issuedBy', 'name email');

        if (!issueNote) {
            return `❌ Issue note "${issueNumber}" not found.`;
        }

        const itemCount = issueNote.items ? issueNote.items.length : 0;
        const issueDate = new Date(issueNote.issueDate).toLocaleDateString();
        
        let response = `📋 <strong>Issue Note: ${issueNote.issueNumber}</strong><br>`;
        response += `Date: ${issueDate}<br>`;
        response += `Issued By: ${issueNote.issuedBy?.name || 'Unknown'}<br>`;
        response += `Items Issued: ${itemCount}<br>`;
        response += `Status: ${issueNote.status || 'N/A'}<br>`;
        response += `Notes: ${issueNote.notes || 'None'}<br>`;

        return response;

    } catch (error) {
        console.error('Error getting issue note details:', error);
        return `❌ Error fetching issue note: ${error.message}`;
    }
}

async function checkIssuedItems(itemName) {
    if (!itemName) {
        return '❌ Please specify which item. Example: "How much coffee was issued?"';
    }

    try {
        console.log(`🔍 Searching issued items for: "${itemName}"`);

        const issueNotes = await IssueNote.find({
            'items.itemName': { $regex: itemName, $options: 'i' }
        })
        .sort({ issueDate: -1 })
        .limit(10);

        if (issueNotes.length === 0) {
            return `❌ No issue notes found for "${itemName}".`;
        }

        let response = `📋 <strong>Issue History for ${itemName}:</strong><br><br>`;
        let totalIssued = 0;

        issueNotes.forEach((note, index) => {
            const itemData = note.items?.find(i => 
                i.itemName?.toLowerCase().includes(itemName.toLowerCase())
            );
            
            if (itemData) {
                const quantity = itemData.quantity || 0;
                totalIssued += quantity;
                const issueDate = new Date(note.issueDate).toLocaleDateString();
                response += `${index + 1}. ${note.issueNumber} - ${quantity} units on ${issueDate}<br>`;
            }
        });

        response += `<br><strong>Total Issued: ${totalIssued} units</strong>`;
        return response;

    } catch (error) {
        console.error('Error checking issued items:', error);
        return `❌ Error: ${error.message}`;
    }
}

module.exports = {
    viewRecentIssueNotes,
    getIssueNoteDetails,
    checkIssuedItems
};
