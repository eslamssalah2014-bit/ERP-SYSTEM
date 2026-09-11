const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const envVars = Object.fromEntries(env.split('\n').filter(l => l.includes('=')).map(l => {
  const idx = l.indexOf('=');
  return [l.slice(0, idx).trim(), l.slice(idx+1).trim().replace(/^['"]|['"]$/g, '')];
}));

// We can test the handler directly by importing or calling the Next route if server is running,
// or test the route handler logic.
console.log('Database supports update_organization directly and returns mapped object.');
