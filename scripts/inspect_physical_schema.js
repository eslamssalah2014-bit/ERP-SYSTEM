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

async function inspectSchema() {
  const env = getEnvVars();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  console.log("=== INSPECTING CUSTOMERS TABLE ===");
  const { data: custRows, error: custErr } = await supabase.from("customers").select("*").limit(1);
  if (custErr) console.error("Error inspecting customers:", custErr);
  else if (custRows && custRows[0]) {
    console.log("Customer table columns:", Object.keys(custRows[0]));
    console.log("Sample customer row:", custRows[0]);
  } else {
    console.log("No customer rows found");
  }

  console.log("\n=== INSPECTING SUPPLIERS TABLE ===");
  const { data: suppRows, error: suppErr } = await supabase.from("suppliers").select("*").limit(1);
  if (suppErr) console.error("Error inspecting suppliers:", suppErr);
  else if (suppRows && suppRows[0]) {
    console.log("Supplier table columns:", Object.keys(suppRows[0]));
    console.log("Sample supplier row:", suppRows[0]);
  } else {
    console.log("No supplier rows found");
  }

  console.log("\n=== INSPECTING COST_CENTERS TABLE ===");
  const { data: ccRows, error: ccErr } = await supabase.from("cost_centers").select("*").limit(1);
  if (ccErr) console.error("Error inspecting cost_centers:", ccErr);
  else if (ccRows && ccRows[0]) {
    console.log("Cost centers table columns:", Object.keys(ccRows[0]));
    console.log("Sample cost center row:", ccRows[0]);
  }

  console.log("\n=== INSPECTING ACCOUNTS TABLE ===");
  const { data: accRows, error: accErr } = await supabase.from("accounts").select("*").limit(1);
  if (accErr) console.error("Error inspecting accounts:", accErr);
  else if (accRows && accRows[0]) {
    console.log("Accounts table columns:", Object.keys(accRows[0]));
  }
}

inspectSchema();
