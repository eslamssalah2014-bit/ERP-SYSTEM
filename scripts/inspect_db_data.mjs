import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

let envContent = "";
try {
  envContent = fs.readFileSync(path.resolve(process.cwd(), ".env.local"), "utf-8");
} catch (e) {}

const env = {};
envContent.split("\n").forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith("#")) {
    const idx = trimmed.indexOf("=");
    if (idx !== -1) {
      env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
    }
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log("Connecting to Supabase at:", supabaseUrl);

  const tables = [
    "organizations", "branches", "users", "warehouses", "product_categories",
    "product_units", "products", "customers", "suppliers", "sales_invoices",
    "purchase_invoices", "treasury_accounts", "cash_receipts", "cash_payments",
    "check_records", "accounts", "cost_centers", "journal_entries"
  ];

  for (const t of tables) {
    const { data, count, error } = await supabase.from(t).select("*", { count: "exact" });
    if (error) {
      console.log(`  ❌ [${t}]: Error - ${error.message}`);
    } else {
      console.log(`  📊 [${t}]: ${data?.length} rows found`);
      if (data && data.length > 0 && data.length <= 5) {
        console.log(`     Sample:`, data.map(d => ({ id: d.id, name: d.name_ar || d.name || d.code || d.invoice_number })));
      }
    }
  }
}

main().catch(console.error);
