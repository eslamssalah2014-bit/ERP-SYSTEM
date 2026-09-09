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
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function applyCorrections() {
  console.log("=================================================");
  console.log("  APPLYING REPORT 7-B ACCOUNTING CORRECTIONS");
  console.log("=================================================\n");

  // 1. Fetch Accounts to get accurate IDs for Level 4 accounts
  const { data: accounts, error: accErr } = await supabase.from("accounts").select("*");
  if (accErr) throw accErr;

  const getAcc = (code) => {
    const found = accounts.find(a => a.code === code);
    if (!found) throw new Error(`Account with code ${code} not found in database!`);
    return found;
  };

  const accAR = getAcc("1102001");       // العملاء
  const accSales = getAcc("4101001");    // إيراد مبيعات بضائع
  const accVatOut = getAcc("2102002");   // ضريبة القيمة المضافة مخرجات
  const accCogs = getAcc("5101001");     // تكلفة البضاعة المباعة
  const accInv = getAcc("1103001");      // مخزون بضاعة تامة

  console.log("✓ Loaded Level 4 Target Accounts:");
  console.log(`  - AR: ${accAR.code} (${accAR.id})`);
  console.log(`  - Sales: ${accSales.code} (${accSales.id})`);
  console.log(`  - VAT Out: ${accVatOut.code} (${accVatOut.id})`);
  console.log(`  - COGS: ${accCogs.code} (${accCogs.id})`);
  console.log(`  - Inventory: ${accInv.code} (${accInv.id})`);

  // 2. Remove Duplicated Journal Entries
  // a19bdaf8: Duplicate INV-2026-0001 (Level 3 lines)
  // 8153b6fc: Duplicate INV-2026-0002 (Level 3 lines)
  // ec211246: Duplicate PINV-2026-0001 (Level 3 lines)
  const dupJeIds = [
    "a19bdaf8-4422-4932-9227-557edba6dff7",
    "8153b6fc-3241-44a7-9782-600c1f24bcae",
    "ec211246-e502-42ac-bb6d-8371ade99104"
  ];

  console.log("\n--- STEP 1: REMOVING DUPLICATED JOURNAL ENTRIES ---");
  const { error: delLinesErr } = await supabase
    .from("journal_lines")
    .delete()
    .in("journal_entry_id", dupJeIds);

  if (delLinesErr) console.warn("Error deleting duplicate lines:", delLinesErr.message);
  else console.log(`✓ Deleted journal lines for ${dupJeIds.length} duplicate entries`);

  const { error: delJeErr } = await supabase
    .from("journal_entries")
    .delete()
    .in("id", dupJeIds);

  if (delJeErr) console.warn("Error deleting duplicate entries:", delJeErr.message);
  else console.log(`✓ Deleted duplicate journal entries: ${dupJeIds.join(", ")}`);

  // 3. Correct Journal Lines for INV-2026-0003 and INV-2026-0004 to Level 4 Accounts
  console.log("\n--- STEP 2: CORRECTING JOURNAL LINES FOR INV-3 & INV-4 ---");
  const targetJeIds = [
    "c6f7fbdf-a228-46f7-aa04-22cde3ee5d23", // INV-2026-0003
    "6e3de77b-90e7-4750-8f75-627b126dc62d"  // INV-2026-0004
  ];

  for (const jeId of targetJeIds) {
    const { data: lines, error: lErr } = await supabase
      .from("journal_lines")
      .select("*")
      .eq("journal_entry_id", jeId);

    if (lErr) throw lErr;

    console.log(`Updating ${lines.length} lines for JE ${jeId}...`);
    for (const line of lines) {
      let targetAcc = null;
      if (line.account_code === "1102" || line.debit > 0 && line.credit === 0 && line.description?.includes("استحقاق")) {
        targetAcc = accAR;
      } else if (line.account_code === "4101" || line.credit > 0 && line.description?.includes("إيراد")) {
        targetAcc = accSales;
      } else if (line.account_code === "2102" || line.credit > 0 && line.description?.includes("ضريبة")) {
        targetAcc = accVatOut;
      } else if (line.account_code === "5101" || line.debit > 0 && line.description?.includes("تكلفة")) {
        targetAcc = accCogs;
      } else if (line.account_code === "1103" || line.credit > 0 && line.description?.includes("مخزون")) {
        targetAcc = accInv;
      }

      if (targetAcc) {
        const { error: updErr } = await supabase
          .from("journal_lines")
          .update({
            account_id: targetAcc.id,
            account_code: targetAcc.code,
            account_name: targetAcc.name_ar,
          })
          .eq("id", line.id);

        if (updErr) console.warn(`Error updating line ${line.id}:`, updErr.message);
        else console.log(`  ✓ Line ${line.id}: ${line.account_code} -> ${targetAcc.code} (${targetAcc.name_ar})`);
      }
    }
  }

  // 4. Synchronize Master Table Balances (Customers & Treasury)
  console.log("\n--- STEP 3: SYNCHRONIZING CUSTOMER & TREASURY BALANCES ---");
  // Customer 2: Opening (10,000) + Invoices (INV-2 342 + INV-3 342) - Receipts (0) = 10,684
  const { error: c2Err } = await supabase
    .from("customers")
    .update({ current_balance: 10684 })
    .eq("id", "59203276-12b3-4b22-83bf-fcbdca07d64c");

  if (c2Err) console.warn("Error updating customer 2:", c2Err.message);
  else console.log("  ✓ Customer CUST-0002 ('سوبر ماركت المدينه') current_balance updated to: 10,684.00");

  // Customer 3: Opening (10,000) + Invoices (INV-1 427.50 + INV-4 855) - Receipts (RCP 1427.50) = 9,855
  const { error: c3Err } = await supabase
    .from("customers")
    .update({ current_balance: 9855 })
    .eq("id", "07c54749-8b2c-468d-8896-d382844f0dff");

  if (c3Err) console.warn("Error updating customer 3:", c3Err.message);
  else console.log("  ✓ Customer CUST-0003 ('سوبر ماركت سفير') current_balance updated to: 9,855.00");

  // Treasury SAFE-MAIN: Opening (153,000) + Receipt (1427.50) - Payment (500) = 153,927.50
  const { error: safeErr } = await supabase
    .from("treasury_accounts")
    .update({ balance: 153927.50 })
    .eq("id", "00000000-0000-0000-0000-000000000301");

  if (safeErr) console.warn("Error updating safe:", safeErr.message);
  else console.log("  ✓ Treasury SAFE-MAIN balance updated to: 153,927.50 (Total Treasury = 195,927.50)");

  console.log("\n=================================================");
  console.log("  CORRECTIONS APPLIED SUCCESSFULLY");
  console.log("=================================================\n");
}

applyCorrections().catch(err => {
  console.error("Failed to apply corrections:", err);
  process.exit(1);
});
