// Simpler diagnostic test
require('dotenv').config();
const express = require('express');

console.log('🔍 Express version:', require('express/package.json').version);

const app = express();
app.use(express.json());

// Add health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Load and register imageSearch router  
const imageSearchRouter = require('./routes/imageSearch');
console.log('Router type:', typeof imageSearchRouter);
console.log('Router is Express.Router?', imageSearchRouter.name || 'router function');

app.use('/api/image-search', imageSearchRouter);

// Add a test route to see if any routing works
app.post('/api/image-search/test-simple', (req, res) => {
  res.json({ message: 'Simple route works' });
});

// Try to access router info
try {
  console.log('\nRouter stack:');
  if (imageSearchRouter._router) {
    console.log('  Has _router');
  }
  if (imageSearchRouter.stack) {
    console.log('  Has stack, length:', imageSearchRouter.stack.length);
    imageSearchRouter.stack.forEach((layer, i) => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase());
        console.log(`  [${i}] ${methods.join('/')} ${layer.route.path}`);
      } else if (layer.name === 'router') {
        console.log(`  [${i}] Nested router`);
      } else {
        console.log(`  [${i}] ${layer.name}`);
      }
    });
  }
} catch (e) {
  console.log('  Error:', e.message);
}

const PORT = 5001;
const server = app.listen(PORT, () => {
  console.log(`\n✅ Server running on port ${PORT}`);
  console.log('\nTry these in another terminal:');
  console.log(`  curl -X GET http://localhost:${PORT}/api/health`);
  console.log(`  curl -X POST http://localhost:${PORT}/api/image-search/test`);
  console.log(`  curl -X POST http://localhost:${PORT}/api/image-search/test-simple`);
  console.log('\nPress Ctrl+C to stop\n');
});

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close(() => process.exit(0));
});
