const fs = require('fs');
const babel = require('@babel/core');

try {
  const code = fs.readFileSync('frontend/src/Pages/PurchaseOrder.jsx', 'utf8');
  babel.transformSync(code, {
    presets: ['@babel/preset-react']
  });
  console.log("No syntax errors!");
} catch (e) {
  console.error("Syntax Error:", e.message);
}
