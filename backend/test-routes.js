// Test if routes are loading correctly
console.log('🔍 Testing route loading...\n');

try {
  console.log('1. Testing middleware...');
  const { uploadImage } = require('./middleware/imageUpload');
  console.log('   ✅ uploadImage middleware loaded');
} catch (e) {
  console.error('   ❌ ERROR loading uploadImage:', e.message);
}

try {
  console.log('2. Testing controller...');
  const controller = require('./controllers/imageSearchController');
  console.log('   ✅ Controller loaded');
  console.log('   Exports:', Object.keys(controller));
  console.log('   findItemsByImage:', typeof controller.findItemsByImage);
  console.log('   testImageSearch:', typeof controller.testImageSearch);
} catch (e) {
  console.error('   ❌ ERROR loading controller:', e.message);
  console.error(e.stack);
}

try {
  console.log('\n3. Testing imageSearch router...');
  const imageSearchRouter = require('./routes/imageSearch');
  console.log('   ✅ imageSearch router loaded');
  console.log('   Type:', typeof imageSearchRouter);
  console.log('   Stack length:', imageSearchRouter.stack?.length);
} catch (e) {
  console.error('   ❌ ERROR loading imageSearch router:', e.message);
  console.error(e.stack);
}

console.log('\n✅ All tests completed');
