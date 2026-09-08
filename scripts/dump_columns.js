const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

function getEnvVars() {
  const envPath = path.join(__dirname, "..", ".env.local");
  const content = fs.readFileSync(envPath, "utf-8");
  const env = {};
  content.split("\n").forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const [k, ...v] = trimmed.split("=");
    if (k && v) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
  });
  return env;
}

async function dumpPhysicalColumns() {
  const env = getEnvVars();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  const tables = [
    "organizations", "branches", "users", "customers", "suppliers",
    "warehouses", "product_categories", "product_units", "products",
    "product_warehouse_stock", "cost_centers", "accounts", "treasury_accounts",
    "cash_receipts", "cash_payments", "check_records", "sales_invoices",
    "sales_invoice_items", "purchase_invoices", "purchase_invoice_items",
    "journal_entries", "journal_lines"
  ];

  const result = {};
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select("*").limit(1);
    if (!error && data && data.length > 0) {
      result[table] = Object.keys(data[0]);
    } else if (!error) {
      // If table is empty, do an empty insert-rollback or select column list
      result[table] = "EMPTY_OR_AVAILABLE";
    } else {
      result[table] = `ERROR: ${error.message}`;
    }
  }

  console.log(JSON.stringify(result, null, 2));
}

dumpPhysicalColumns();
