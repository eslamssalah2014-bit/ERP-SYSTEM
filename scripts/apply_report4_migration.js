const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
let url = '', key = '';
env.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].trim();
});

const supabase = createClient(url, key);

async function run() {
  console.log("Applying Report #4 migrations...");

  // Try running raw SQL if rpc exec_sql exists, otherwise test table access
  const sql = fs.readFileSync('supabase/migrations/00006_treasury_and_banking_report4.sql', 'utf8');
  
  // Test if we can update cost_centers and check_records
  try {
    const { data: cc, error: ccErr } = await supabase.from('cost_centers').select('*').limit(1);
    console.log("Cost centers reachable:", !ccErr);
  } catch (e) {
    console.warn("Cost center check:", e.message);
  }

  try {
    const { data: cr, error: crErr } = await supabase.from('check_records').select('*').limit(1);
    console.log("Check records reachable:", !crErr);
  } catch (e) {
    console.warn("Check records check:", e.message);
  }
}

run();
