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

async function inspectSchema() {
  console.log("Checking sales_invoices columns...");
  const { data: sinv, error: sinvErr } = await supabase.from('sales_invoices').select('*').limit(1);
  if (sinvErr) {
    console.error("Error reading sales_invoices:", sinvErr);
  } else {
    console.log("sales_invoices sample row keys:", sinv.length > 0 ? Object.keys(sinv[0]) : "table is empty");
  }

  console.log("Checking purchase_invoices columns...");
  const { data: pinv, error: pinvErr } = await supabase.from('purchase_invoices').select('*').limit(1);
  if (pinvErr) {
    console.error("Error reading purchase_invoices:", pinvErr);
  } else {
    console.log("purchase_invoices sample row keys:", pinv.length > 0 ? Object.keys(pinv[0]) : "table is empty");
  }

  console.log("Checking customers columns...");
  const { data: cust, error: custErr } = await supabase.from('customers').select('*').limit(1);
  if (custErr) {
    console.error("Error reading customers:", custErr);
  } else {
    console.log("customers sample row keys:", cust.length > 0 ? Object.keys(cust[0]) : "table is empty");
  }

  console.log("Checking suppliers columns...");
  const { data: supp, error: suppErr } = await supabase.from('suppliers').select('*').limit(1);
  if (suppErr) {
    console.error("Error reading suppliers:", suppErr);
  } else {
    console.log("suppliers sample row keys:", supp.length > 0 ? Object.keys(supp[0]) : "table is empty");
  }

  console.log("Checking customer_categories table...");
  const { data: cc, error: ccErr } = await supabase.from('customer_categories').select('*').limit(1);
  if (ccErr) {
    console.log("customer_categories table status:", ccErr.message);
  } else {
    console.log("customer_categories exists!");
  }

  console.log("Checking sales_returns table...");
  const { data: sr, error: srErr } = await supabase.from('sales_returns').select('*').limit(1);
  if (srErr) {
    console.log("sales_returns table status:", srErr.message);
  } else {
    console.log("sales_returns exists!");
  }

  console.log("Checking purchase_returns table...");
  const { data: pr, error: prErr } = await supabase.from('purchase_returns').select('*').limit(1);
  if (prErr) {
    console.log("purchase_returns table status:", prErr.message);
  } else {
    console.log("purchase_returns exists!");
  }
}

inspectSchema().catch(console.error);
