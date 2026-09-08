const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// Read .env.local
const envPath = path.resolve(__dirname, "..", ".env.local");
let supabaseUrl = "";
let supabaseKey = "";

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith("NEXT_PUBLIC_SUPABASE_URL=")) {
      supabaseUrl = trimmed.split("=")[1].trim();
    }
    if (trimmed.startsWith("SUPABASE_SERVICE_ROLE_KEY=")) {
      supabaseKey = trimmed.split("=")[1].trim();
    } else if (!supabaseKey && trimmed.startsWith("NEXT_PUBLIC_SUPABASE_ANON_KEY=")) {
      supabaseKey = trimmed.split("=")[1].trim();
    }
  });
}

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

const tables = [
  "organizations",
  "branches",
  "users",
  "product_categories",
  "product_units",
  "warehouses",
  "products",
  "product_warehouse_stock",
  "customers",
  "customer_categories",
  "suppliers",
  "cost_centers",
  "accounts",
  "treasury_accounts",
  "cash_receipts",
  "cash_payments",
  "check_records",
  "check_vouchers",
  "sales_invoices",
  "sales_invoice_items",
  "sales_returns",
  "sales_return_items",
  "purchase_invoices",
  "purchase_invoice_items",
  "purchase_returns",
  "purchase_return_items",
  "journal_entries",
  "journal_lines",
  "stock_movements",
  "product_change_logs",
  "period_closings",
  "audit_logs"
];

async function runBackup() {
  console.log("==========================================");
  console.log("STARTING FULL PRODUCTION DATABASE BACKUP");
  console.log("Timestamp:", new Date().toISOString());
  console.log("==========================================\n");

  const backupDir = path.resolve(__dirname, "..", "backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(backupDir, `production_backup_${timestamp}.json`);

  const backupData = {
    timestamp: new Date().toISOString(),
    supabaseUrl: supabaseUrl,
    tableCounts: {},
    data: {}
  };

  for (const table of tables) {
    try {
      const { data, error, count } = await supabase.from(table).select("*", { count: "exact" });
      if (error) {
        console.warn(`⚠️ Warning: Could not backup table '${table}': ${error.message}`);
        backupData.data[table] = [];
        backupData.tableCounts[table] = 0;
      } else {
        backupData.data[table] = data || [];
        backupData.tableCounts[table] = data ? data.length : 0;
        console.log(`✅ Backed up '${table}': ${backupData.tableCounts[table]} records`);
      }
    } catch (e) {
      console.warn(`⚠️ Error accessing table '${table}':`, e.message);
      backupData.data[table] = [];
      backupData.tableCounts[table] = 0;
    }
  }

  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), "utf-8");
  console.log(`\n🎉 Full backup successfully written to: ${backupFile}`);
  console.log("Table records summary:", JSON.stringify(backupData.tableCounts, null, 2));
}

runBackup();
