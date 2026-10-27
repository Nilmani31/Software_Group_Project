const Role = require('../models/roles');

async function viewAllRoles() {
    try {
        const roles = await Role.find({})
            .sort({ name: 1 });

        if (roles.length === 0) {
            return '📭 No roles found in system.';
        }

        let response = `👥 <strong>Available Roles (${roles.length} total):</strong><br><br>`;
        
        roles.forEach((role, index) => {
            response += `<strong>${index + 1}. ${role.name}</strong><br>`;
            response += `   Description: ${role.description || 'No description'}<br>`;
            response += `   Status: ${role.active ? '✅ Active' : '❌ Inactive'}<br><br>`;
        });

        return response;

    } catch (error) {
        console.error('Error viewing roles:', error);
        return `❌ Error fetching roles: ${error.message}`;
    }
}

async function getRoleDetails(roleName) {
    if (!roleName) {
        return '❌ Please specify which role. Example: "Tell me about Admin"';
    }

    try {
        const role = await Role.findOne({
            name: { $regex: roleName, $options: 'i' }
        });

        if (!role) {
            return `❌ Role "${roleName}" not found.`;
        }

        let response = `👥 <strong>${role.name}</strong><br>`;
        response += `Description: ${role.description || 'No description'}<br>`;
        response += `Status: ${role.active ? '✅ Active' : '❌ Inactive'}<br>`;

        return response;

    } catch (error) {
        console.error('Error getting role details:', error);
        return `❌ Error fetching role: ${error.message}`;
    }
}

module.exports = {
    viewAllRoles,
    getRoleDetails
};
