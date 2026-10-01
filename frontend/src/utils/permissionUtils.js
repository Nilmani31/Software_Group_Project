/**
 * System-wide Permission Definitions and Utilities
 * All permissions are dynamically checked without hardcoding roles.
 */

export const AVAILABLE_PERMISSIONS = [
  {
    id: 'ALL',
    label: 'Full System Access (Super Admin)',
    description: 'Master unrestricted access across all system features, branches, and data',
    badge: 'Super Admin',
    category: 'System'
  },
  {
    id: 'DASHBOARD',
    label: 'Dashboard & Business Analytics',
    description: 'View dashboard overview, KPI summaries, inventory valuations, and alerts',
    badge: 'Analytics',
    category: 'Analytics'
  },
  {
    id: 'INVENTORY',
    label: 'Inventory & Stock Catalog',
    description: 'View catalog items, stock quantities, batches, barcode search, and item setup',
    badge: 'Core',
    category: 'Inventory'
  },
  {
    id: 'LOW_STOCK',
    label: 'Low Stock Alerts & Reorder',
    description: 'Monitor low stock warnings, reorder points, and replenishment shortages',
    badge: 'Inventory',
    category: 'Inventory'
  },
  {
    id: 'PURCHASE_ORDERS',
    label: 'Purchase Orders',
    description: 'Create, review, approve, and track purchase orders with suppliers',
    badge: 'Procurement',
    category: 'Procurement'
  },
  {
    id: 'GOODS_RECEIVED',
    label: 'Goods Received Notes (GRN)',
    description: 'Inspect supplier deliveries and receive items directly into branch stock',
    badge: 'Warehouse',
    category: 'Warehouse'
  },
  {
    id: 'ISSUE_NOTES',
    label: 'Issue Notes & Stock Transfers',
    description: 'Dispatch stock, handle training session requests, and inter-branch issues',
    badge: 'Transfers',
    category: 'Warehouse'
  },
  {
    id: 'REPORTS',
    label: 'Analytics & Reports Studio',
    description: 'Generate stock valuation reports, ledger movements, and audit exports',
    badge: 'Reports',
    category: 'Reports'
  },
  {
    id: 'BRANCHES',
    label: 'Branch Management',
    description: 'Manage company branches, locations, contact info, and warehouse setup',
    badge: 'Admin',
    category: 'Administration'
  },
  {
    id: 'CATEGORIES',
    label: 'Categories & Measurement Units',
    description: 'Manage inventory item categories, subcategories, and measurement units',
    badge: 'Admin',
    category: 'Administration'
  },
  {
    id: 'USERS',
    label: 'User & Permission Management',
    description: 'Create, edit, and deactivate user accounts, assign roles and granular feature permissions',
    badge: 'Security',
    category: 'Administration'
  }
];

// Initial prefill presets when selecting a role (fully editable in the UI)
export const ROLE_DEFAULT_PERMISSIONS = {
  ROLE_ADMIN: ['ALL', 'DASHBOARD', 'INVENTORY', 'LOW_STOCK', 'PURCHASE_ORDERS', 'GOODS_RECEIVED', 'ISSUE_NOTES', 'REPORTS', 'BRANCHES', 'CATEGORIES', 'USERS'],
  ROLE_DIRECTOR: ['DASHBOARD', 'INVENTORY', 'LOW_STOCK', 'PURCHASE_ORDERS', 'GOODS_RECEIVED', 'ISSUE_NOTES', 'REPORTS', 'BRANCHES', 'CATEGORIES', 'USERS'],
  ROLE_MANAGER: ['DASHBOARD', 'INVENTORY', 'LOW_STOCK', 'PURCHASE_ORDERS', 'GOODS_RECEIVED', 'ISSUE_NOTES', 'REPORTS', 'CATEGORIES'],
  ROLE_BRANCH_MANAGER: ['DASHBOARD', 'INVENTORY', 'LOW_STOCK', 'PURCHASE_ORDERS', 'GOODS_RECEIVED', 'ISSUE_NOTES', 'CATEGORIES'],
  ROLE_STAFF: ['DASHBOARD', 'INVENTORY', 'LOW_STOCK', 'GOODS_RECEIVED']
};

/**
 * Get current session permissions from localStorage
 */
export const getUserPermissions = () => {
  try {
    const raw = localStorage.getItem('permissions');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};

/**
 * Check if the active logged in user has a specific permission
 * @param {string} permission
 * @returns {boolean}
 */
export const hasPermission = (permission) => {
  const perms = getUserPermissions();
  if (perms.includes('ALL')) return true;
  return perms.includes(permission);
};

/**
 * Check if the active user has at least one of the listed permissions
 * @param {string[]} permissions
 * @returns {boolean}
 */
export const hasAnyPermission = (...permissions) => {
  const perms = getUserPermissions();
  if (perms.includes('ALL')) return true;
  return permissions.some(p => perms.includes(p));
};
