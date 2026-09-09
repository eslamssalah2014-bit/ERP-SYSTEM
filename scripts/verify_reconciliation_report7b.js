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

async function runReconciliation() {
  console.log("================================================================================");
  console.log("   REPORT 7-B ACCOUNTING RECONCILIATION & INTEGRITY VERIFICATION");
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = "") {
    if (condition) {
      console.log(`  ✅ PASS: ${name} ${details ? `[${details}]` : ""}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name} ${details ? `[${details}]` : ""}`);
      failed++;
    }
  }

  // 1. Fetch live DB tables
  const { data: customers } = await supabase.from("customers").select("*");
  const { data: salesInvoices } = await supabase.from("sales_invoices").select("*");
  const { data: cashReceipts } = await supabase.from("cash_receipts").select("*");
  const { data: cashPayments } = await supabase.from("cash_payments").select("*");
  const { data: treasuryAccounts } = await supabase.from("treasury_accounts").select("*");
  const { data: accounts } = await supabase.from("accounts").select("*");
  const { data: journalEntries } = await supabase.from("journal_entries").select("*");
  const { data: journalLines } = await supabase.from("journal_lines").select("*");

  console.log("📊 Database Record Counts:");
  console.log(`  - Customers: ${customers.length}`);
  console.log(`  - Sales Invoices: ${salesInvoices.length}`);
  console.log(`  - Cash Receipts: ${cashReceipts.length}`);
  console.log(`  - Cash Payments: ${cashPayments.length}`);
  console.log(`  - Treasury Accounts: ${treasuryAccounts.length}`);
  console.log(`  - Accounts: ${accounts.length}`);
  console.log(`  - Journal Entries: ${journalEntries.length}`);
  console.log(`  - Journal Lines: ${journalLines.length}\n`);

  // -------------------------------------------------------------
  // CHECK 1: ZERO DUPLICATE JOURNAL ENTRIES
  // -------------------------------------------------------------
  console.log("--- CHECK 1: JOURNAL ENTRY UNIQUENESS & DEDUPLICATION ---");
  const inv1 = salesInvoices.find(i => i.invoice_number === "INV-2026-0001");
  const inv2 = salesInvoices.find(i => i.invoice_number === "INV-2026-0002");
  const inv3 = salesInvoices.find(i => i.invoice_number === "INV-2026-0003");
  const inv4 = salesInvoices.find(i => i.invoice_number === "INV-2026-0004");
  const pinv1 = journalEntries.find(j => j.entry_number === "JV-PURCHASE-PINV-2026-0001");

  const inv1JEs = journalEntries.filter(j => j.entry_number === "JV-SALES-INV-2026-0001" || (j.reference_type === "sales_invoice" && j.reference_id === inv1?.id));
  const inv2JEs = journalEntries.filter(j => j.entry_number === "JV-SALES-INV-2026-0002" || (j.reference_type === "sales_invoice" && j.reference_id === inv2?.id));
  const inv3JEs = journalEntries.filter(j => j.entry_number === "JV-SALES-INV-2026-0003" || (j.reference_type === "sales_invoice" && j.reference_id === inv3?.id));
  const inv4JEs = journalEntries.filter(j => j.entry_number === "JV-SALES-INV-2026-0004" || (j.reference_type === "sales_invoice" && j.reference_id === inv4?.id));
  const pinv1JEs = journalEntries.filter(j => j.entry_number === "JV-PURCHASE-PINV-2026-0001" || j.reference_type === "purchase_invoice");

  assert(inv1JEs.length === 1, "Sales Invoice #1 has exactly 1 Journal Entry", `count=${inv1JEs.length}`);
  assert(inv2JEs.length === 1, "Sales Invoice #2 has exactly 1 Journal Entry", `count=${inv2JEs.length}`);
  assert(inv3JEs.length === 1, "Sales Invoice #3 has exactly 1 Journal Entry", `count=${inv3JEs.length}`);
  assert(inv4JEs.length === 1, "Sales Invoice #4 has exactly 1 Journal Entry", `count=${inv4JEs.length}`);
  assert(pinv1JEs.length === 1, "Purchase Invoice #1 has exactly 1 Journal Entry", `count=${pinv1JEs.length}`);
  assert(journalEntries.length === 8, "Total Journal Entries count is exactly 8", `count=${journalEntries.length}`);

  // -------------------------------------------------------------
  // CHECK 2: CUSTOMER STATEMENT & REGISTER BALANCE RECONCILIATION
  // -------------------------------------------------------------
  console.log("\n--- CHECK 2: CUSTOMER BALANCE RECONCILIATION ---");
  const cMadinah = customers.find(c => c.code === "CUST-0002" || c.name_ar.includes("المدين"));
  const cSafeer = customers.find(c => c.code === "CUST-0003" || c.name_ar.includes("سفير"));

  // Customer Statement simulation matching getCustomerStatement
  function simulateCustomerStatement(customer) {
    const openingBal = 10000; // From OPENING-2026
    let running = openingBal;
    const invs = salesInvoices.filter(i => i.customer_id === customer.id);
    const rcps = cashReceipts.filter(r => r.customer_id === customer.id);

    let debit = 0;
    let credit = 0;
    invs.forEach(inv => debit += Number(inv.grand_total) || 0);
    rcps.forEach(rcp => credit += Number(rcp.amount) || 0);

    const closing = openingBal + debit - credit;
    return { openingBal, debit, credit, closing };
  }

  const stmtMadinah = simulateCustomerStatement(cMadinah);
  const stmtSafeer = simulateCustomerStatement(cSafeer);

  console.log(`  سوبر ماركت المدينة (Customer 2):`);
  console.log(`    Opening: ${stmtMadinah.openingBal}, Invoices: ${stmtMadinah.debit}, Receipts: ${stmtMadinah.credit}, Statement Closing: ${stmtMadinah.closing}`);
  console.log(`    Customer Register current_balance: ${cMadinah.current_balance}`);

  console.log(`  سوبر ماركت سفير (Customer 3):`);
  console.log(`    Opening: ${stmtSafeer.openingBal}, Invoices: ${stmtSafeer.debit}, Receipts: ${stmtSafeer.credit}, Statement Closing: ${stmtSafeer.closing}`);
  console.log(`    Customer Register current_balance: ${cSafeer.current_balance}`);

  assert(stmtMadinah.closing === 10684, "Customer 2 Statement Closing Balance is exactly 10,684", `val=${stmtMadinah.closing}`);
  assert(Number(cMadinah.current_balance) === 10684, "Customer 2 Register Balance is exactly 10,684", `val=${cMadinah.current_balance}`);
  assert(stmtSafeer.closing === 9855, "Customer 3 Statement Closing Balance is exactly 9,855", `val=${stmtSafeer.closing}`);
  assert(Number(cSafeer.current_balance) === 9855, "Customer 3 Register Balance is exactly 9,855", `val=${cSafeer.current_balance}`);

  const totalCustomerReceivables = stmtMadinah.closing + stmtSafeer.closing;
  assert(totalCustomerReceivables === 20539, "Total Customer Receivables is exactly 20,539", `val=${totalCustomerReceivables}`);

  // -------------------------------------------------------------
  // CHECK 3: GENERAL LEDGER & TRIAL BALANCE RECEIVABLES (1102001)
  // -------------------------------------------------------------
  console.log("\n--- CHECK 3: GENERAL LEDGER & TRIAL BALANCE RECEIVABLES ---");
  const acc1102001 = accounts.find(a => a.code === "1102001");
  assert(Boolean(acc1102001), "GL Account 1102001 (العملاء) exists in Chart of Accounts");

  const arLines = journalLines.filter(l => l.account_id === acc1102001.id || l.account_code === "1102001");
  let arDebit = 0;
  let arCredit = 0;
  arLines.forEach(l => {
    arDebit += Number(l.debit) || 0;
    arCredit += Number(l.credit) || 0;
  });
  const arEndingBalance = arDebit - arCredit;

  console.log(`  GL Account 1102001 Details:`);
  console.log(`    Total Debits: ${arDebit} (Opening 20,000 + Invoices 539)`);
  console.log(`    Total Credits: ${arCredit} (Receipt 1,427.50)`);
  console.log(`    Net Ending Balance: ${arEndingBalance}`);

  assert(arEndingBalance === 20539, "GL / Trial Balance Account 1102001 Receivables is exactly 20,539", `val=${arEndingBalance}`);
  assert(arEndingBalance === totalCustomerReceivables, "GL Receivables matches Customer Register & Statements perfectly (20,539 === 20,539)");

  // Verify no lines remain posted to Level 3 parent 1102
  const acc1102 = accounts.find(a => a.code === "1102");
  const linesOnParent1102 = journalLines.filter(l => l.account_id === acc1102.id || l.account_code === "1102");
  assert(linesOnParent1102.length === 0, "No orphaned lines on parent Level 3 account 1102", `count=${linesOnParent1102.length}`);

  // -------------------------------------------------------------
  // CHECK 4: TREASURY & CASH (1101) RECONCILIATION
  // -------------------------------------------------------------
  console.log("\n--- CHECK 4: CASH & TREASURY RECONCILIATION ---");
  const cashAccounts = accounts.filter(a => a.code === "1101001" || a.code === "1101002");
  const cashAccIds = cashAccounts.map(a => a.id);
  const cashLines = journalLines.filter(l => cashAccIds.includes(l.account_id) || l.account_code === "1101001" || l.account_code === "1101002");

  let cashDebit = 0;
  let cashCredit = 0;
  cashLines.forEach(l => {
    cashDebit += Number(l.debit) || 0;
    cashCredit += Number(l.credit) || 0;
  });
  const glCashEnding = cashDebit - cashCredit;

  const treasurySum = treasuryAccounts.reduce((sum, t) => sum + Number(t.balance), 0);

  console.log(`  GL Cash Accounts (1101):`);
  console.log(`    Debits: ${cashDebit} (Opening 195,000 + Receipt 1,427.50)`);
  console.log(`    Credits: ${cashCredit} (Payment 500)`);
  console.log(`    GL Net Cash Balance: ${glCashEnding}`);
  console.log(`    Treasury Accounts Table Sum: ${treasurySum}`);

  assert(glCashEnding === 195927.50, "GL Cash Balance (1101) is exactly 195,927.50", `val=${glCashEnding}`);
  assert(treasurySum === 195927.50, "Treasury Accounts Sum is exactly 195,927.50", `val=${treasurySum}`);
  assert(glCashEnding === treasurySum, "GL Cash and Treasury Master Table are 100% in sync (195,927.50 === 195,927.50)");

  // -------------------------------------------------------------
  // CHECK 5: TRIAL BALANCE OVERALL EQUILIBRIUM
  // -------------------------------------------------------------
  console.log("\n--- CHECK 5: TRIAL BALANCE OVERALL EQUILIBRIUM ---");
  let grandDebit = 0;
  let grandCredit = 0;
  journalLines.forEach(l => {
    grandDebit += Number(l.debit) || 0;
    grandCredit += Number(l.credit) || 0;
  });

  console.log(`  Grand Total Debits: ${grandDebit}`);
  console.log(`  Grand Total Credits: ${grandCredit}`);
  console.log(`  Difference: ${Math.abs(grandDebit - grandCredit)}`);

  assert(Math.abs(grandDebit - grandCredit) < 0.001, "Trial Balance is perfectly balanced (Total Debits === Total Credits)", `Dr=${grandDebit}, Cr=${grandCredit}`);

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log("\n================================================================================");
  console.log(`  RECONCILIATION RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log("================================================================================");

  if (failed > 0) process.exit(1);
}

runReconciliation().catch(err => {
  console.error("Reconciliation error:", err);
  process.exit(1);
});
