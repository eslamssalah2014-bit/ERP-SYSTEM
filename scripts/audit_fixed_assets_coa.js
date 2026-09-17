const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

function getEnv() {
  const envPath = path.resolve(__dirname, "..", ".env.local");
  const env = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const l of lines) {
      const trimmed = l.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const idx = trimmed.indexOf("=");
        if (idx !== -1) {
          env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
        }
      }
    }
  }
  return env;
}

const env = getEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function run() {
  const { data: accounts, error } = await supabase
    .from("accounts")
    .select("*")
    .order("code", { ascending: true });

  if (error) {
    console.error("Accounts error:", error);
    return;
  }

  console.log("=== TOTAL ACCOUNTS:", accounts.length, "===");
  console.log("Accounts columns:", Object.keys(accounts[0] || {}));

  console.log("\n--- FIXED ASSETS & RELATED (12xxx, 'assets', etc.) ---");
  const fixedAssets = accounts.filter(a => 
    a.code.startsWith("12") || 
    a.name_ar.includes("أصول") || 
    a.name_ar.includes("ثابت") || 
    a.name_ar.includes("إهلاك") || 
    a.name_ar.includes("مجمع") ||
    (a.name_en && /asset|deprec/i.test(a.name_en))
  );

  fixedAssets.forEach(a => {
    console.log(`[${a.code}] ${a.name_ar} | EN: ${a.name_en || "-"} | type: ${a.type} | nature: ${a.nature} | level: ${a.level} | id: ${a.id}`);
  });

  console.log("\n--- EXPENSE / DEPRECIATION EXPENSE (5xxx) ---");
  const expAccounts = accounts.filter(a => 
    a.code.startsWith("5") && (
      a.name_ar.includes("إهلاك") || 
      (a.name_en && /deprec/i.test(a.name_en))
    )
  );

  expAccounts.forEach(a => {
    console.log(`[${a.code}] ${a.name_ar} | EN: ${a.name_en || "-"} | type: ${a.type} | nature: ${a.nature} | id: ${a.id}`);
  });

  // Check if fixed_assets table already exists
  const { data: faTest, error: faErr } = await supabase.from("fixed_assets").select("*").limit(1);
  console.log("\n--- TABLE 'fixed_assets' status:", faErr ? faErr.message : "EXISTS");
}

run().catch(console.error);
