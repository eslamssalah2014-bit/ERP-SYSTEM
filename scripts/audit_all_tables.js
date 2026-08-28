const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      value = value.trim().replace(/^['"]|['"]$/g, '');
      process.env[key] = value;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const tables = [
  'organizations', 'branches', 'users', 'accounts', 'cost_centers',
  'warehouses', 'product_categories', 'product_units', 'products',
  'product_warehouse_stock', 'stock_movements', 'customers', 'suppliers',
  'sales_invoices', 'sales_invoice_items', 'purchase_invoices', 'purchase_invoice_items',
  'treasury_accounts', 'cash_receipts', 'cash_payments', 'check_records',
  'journal_entries', 'journal_lines', 'audit_logs', 'product_change_history', 'period_closings'
];

async function auditAll() {
  console.log("=== SUPABASE DATABASE PHYSICAL TABLES & COLUMNS AUDIT ===");
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`❌ Table [${table}]: ERROR -> ${error.message}`);
    } else if (data.length > 0) {
      console.log(`✅ Table [${table}]: (${Object.keys(data[0]).length} cols) -> ${Object.keys(data[0]).join(', ')}`);
    } else {
      // test columns by trying an empty match
      console.log(`✅ Table [${table}]: (empty table)`);
    }
  }
}

auditAll().catch(console.error);
