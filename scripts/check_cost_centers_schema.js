const path = require("path");
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

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
    }
  });
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectCostCenters() {
  console.log("Checking cost_centers table...");
  // Try selecting cost_center_type
  const { data, error } = await supabase.from("cost_centers").select("id, code, name_ar, cost_center_type").limit(1);
  if (error) {
    console.error("❌ Error selecting cost_center_type:", error.message);
  } else {
    console.log("✅ cost_center_type exists and query succeeded:", data);
  }

  // Try inserting a test cost center
  const testId = "00000000-0000-0000-0000-000000000999";
  const { data: insData, error: insErr } = await supabase.from("cost_centers").insert([{
    id: testId,
    organization_id: "00000000-0000-0000-0000-000000000001",
    code: "CC-TEST",
    name_ar: "مركز اختبار",
    name_en: "Test Center",
    cost_center_type: "expense"
  }]).select();

  if (insErr) {
    console.error("❌ Insert with cost_center_type error:", insErr.message);
  } else {
    console.log("✅ Insert with cost_center_type succeeded:", insData);
    // clean up test record
    await supabase.from("cost_centers").delete().eq("id", testId);
    console.log("Cleaned up test record.");
  }
}

inspectCostCenters();
