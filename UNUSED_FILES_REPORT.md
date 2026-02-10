// UNUSED FILES ANALYSIS REPORT
// This file documents which files are not imported or used in the application

// BACKEND UNUSED FILES:
// These are utility/maintenance/test scripts that are NOT imported anywhere

const unusedBackendFiles = [
  {
    file: 'backend/hash.js',
    type: 'Utility Script',
    purpose: 'One-time password hashing utility for bcrypt',
    used: false,
    imports: []
  },
  {
    file: 'backend/cleanup-branches.js',
    type: 'Maintenance Script',
    purpose: 'Delete all branches to clear corrupted data',
    used: false,
    imports: []
  },
  {
    file: 'backend/fix-issue-notes.js',
    type: 'Maintenance Script',
    purpose: 'Drop the entire issuenotes collection',
    used: false,
    imports: []
  },
  {
    file: 'backend/test-issue-notes.js',
    type: 'Test Script',
    purpose: 'Test issue note functionality',
    used: false,
    imports: []
  },
  {
    file: 'backend/seedItems-fresh.js',
    type: 'Seed Script',
    purpose: 'Seed initial items data',
    used: false,
    imports: []
  },
  {
    file: 'backend/seedRoles.js',
    type: 'Seed Script',
    purpose: 'Seed initial roles data',
    used: false,
    imports: []
  },
  {
    file: 'backend/seedUsers.js',
    type: 'Seed Script',
    purpose: 'Seed initial users data',
    used: false,
    imports: []
  },
  {
    file: 'backend/verify-items-branches.js',
    type: 'Utility Script',
    purpose: 'Verify database items and branches connection',
    used: false,
    imports: []
  },
  {
    file: 'backend/seed-stock-data.js',
    type: 'Utility Script',
    purpose: 'Seed stock data linking items to branches',
    used: false,
    imports: []
  }
];

// FRONTEND UNUSED FILES:
const unusedFrontendFiles = [
  {
    file: 'frontend/src/Components/ScrollToTop.jsx',
    type: 'Component',
    purpose: 'Scroll to top functionality (not imported anywhere)',
    used: false,
    imports: []
  }
];

// USED FILES:
const usedModels = [
  'backend/models/users.js ✅',
  'backend/models/roles.js ✅',
  'backend/models/categories.js ✅',
  'backend/models/branches.js ✅',
  'backend/models/items.js ✅',
  'backend/models/itemUnits.js ✅',
  'backend/models/stock.js ✅',
  'backend/models/suppliers.js ✅',
  'backend/models/issueNotes.js ✅',
  'backend/models/issueNoteItems.js ✅'
];

const usedControllers = [
  'backend/controllers/users.js ✅',
  'backend/controllers/roles.js ✅',
  'backend/controllers/categories.js ✅',
  'backend/controllers/branches.js ✅',
  'backend/controllers/items.js ✅',
  'backend/controllers/suppliers.js ✅',
  'backend/controllers/issueNotes.js ✅'
];

const usedRoutes = [
  'backend/routes/users.js ✅',
  'backend/routes/roles.js ✅',
  'backend/routes/categories.js ✅',
  'backend/routes/branches.js ✅',
  'backend/routes/items.js ✅',
  'backend/routes/suppliers.js ✅',
  'backend/routes/stock.js ✅',
  'backend/routes/issueNotes.js ✅'
];

const usedFrontendPages = [
  'frontend/src/Pages/Login.jsx ✅',
  'frontend/src/Pages/Dashboard.jsx ✅',
  'frontend/src/Pages/Report.jsx ✅',
  'frontend/src/Pages/LowStock.jsx ✅',
  'frontend/src/Pages/IssueNote.jsx ✅',
  'frontend/src/Pages/Inventory.jsx ✅',
  'frontend/src/Pages/PurchaseOrder.jsx ✅',
  'frontend/src/Pages/Branches.jsx ✅',
  'frontend/src/Pages/Users.jsx ✅',
  'frontend/src/Pages/Categories.jsx ✅',
  'frontend/src/Pages/GoodReceived.jsx ✅'
];

const usedFrontendComponents = [
  'frontend/src/Components/Card.jsx ✅',
  'frontend/src/Components/ChatAssistant.jsx ✅',
  'frontend/src/Components/MainLayout.jsx ✅',
  'frontend/src/Components/Modal.jsx ✅',
  'frontend/src/Components/Navbar.jsx ✅',
  'frontend/src/Components/ProtectedRoute.jsx ✅',
  'frontend/src/Components/Sidebar.jsx ✅'
];

const usedUtils = [
  'backend/utils/passwordGenerator.js ✅ (used in controllers/users.js)'
];
