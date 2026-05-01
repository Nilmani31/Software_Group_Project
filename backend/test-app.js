// Comprehensive test to verify imageSearch routes are registered in main app
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

console.log('🔍 Creating test Express app...\n');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Test health endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

console.log('✅ Middleware registered\n');

// Test route registration
console.log('📋 Loading imageSearch router...');
const imageSearchRouter = require('./routes/imageSearch');
console.log('✅ Router loaded\n');

console.log('📋 Registering routes...');
app.use('/api/image-search', imageSearchRouter);
console.log('✅ Routes registered\n');

// List all registered routes
console.log('📊 Registered routes:');
const routes = [];
app._router.stack.forEach((middleware) => {
  if (middleware.route) {
    console.log(`   GET/POST ${middleware.route.path}`);
  } else if (middleware.name === 'router') {
    middleware.handle.stack.forEach((handler) => {
      if (handler.route) {
        const methods = Object.keys(handler.route.methods).map(m => m.toUpperCase()).join('/');
        console.log(`   ${methods} /api/image-search${handler.route.path}`);
      }
    });
  }
});

// Start test server
const PORT = 5001;
const server = app.listen(PORT, () => {
  console.log(`\n✅ Test server running on port ${PORT}\n`);
  console.log('Testing endpoints:');
  console.log(`   curl http://localhost:${PORT}/api/health`);
  console.log(`   curl http://localhost:${PORT}/api/image-search/test (POST with image)`);
  console.log(`\nPress Ctrl+C to stop\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down test server...');
  server.close(() => {
    console.log('Server stopped');
    process.exit(0);
  });
});
