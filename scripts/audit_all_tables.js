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

async function auditAllTables() {
  const env = getEnvVars();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  const tables = [
    "organizations",
    "branches",
    "users",
    "customers",
    "customer_categories",
    "suppliers",
    "warehouses",
    "product_categories",
    "product_units",
    "products",
    "product_warehouse_stock",
    "cost_centers",
    "accounts",
    "treasury_accounts",
    "cash_receipts",
    "cash_payments",
    "check_records",
    "sales_invoices",
    "sales_invoice_items",
    "sales_returns",
    "purchase_invoices",
    "purchase_invoice_items",
    "purchase_returns",
    "journal_entries",
    "journal_lines",
    "stock_movements",
    "audit_logs"
  ];

  const schemaMap = {};

  for (const t of tables) {
    try {
      const { data, error } = await supabase.from(t).select("*").limit(1);
      if (error) {
        schemaMap[t] = { exists: false, error: error.message };
      } else {
        const cols = data && data[0] ? Object.keys(data[0]) : [];
        schemaMap[t] = { exists: true, columns: cols };
      }
    } catch (err) {
      schemaMap[t] = { exists: false, error: err.message };
    }
  }

  console.log(JSON.stringify(schemaMap, null, 2));
}

auditAllTables();
