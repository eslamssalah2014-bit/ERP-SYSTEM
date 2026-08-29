const fs = require('fs');
const path = require('path');

const routeFile = path.resolve(__dirname, '../src/app/api/erp/data/route.ts');
const content = fs.readFileSync(routeFile, 'utf8');

const matches = [...content.matchAll(/case\s+"([^"]+)":/g)].map(m => m[1]);
console.log("=== CASES IN ROUTE.TS ===");
console.log(matches);
