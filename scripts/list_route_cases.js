const fs = require('fs');
const path = require('path');

const routeFile = path.resolve(__dirname, '../src/app/api/erp/data/route.ts');
const content = fs.readFileSync(routeFile, 'utf8');

const lines = content.split('\n');
console.log("=== CASES IN ROUTE.TS ===");
lines.forEach((l, i) => {
  const m = l.match(/case "([^"]+)":/);
  if (m) console.log(`${i + 1}: ${m[1]}`);
});
