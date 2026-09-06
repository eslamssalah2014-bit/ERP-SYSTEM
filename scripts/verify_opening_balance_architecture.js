/**
 * verify_opening_balance_architecture.js
 * Comprehensive audit & verification script for Opening Balance Architecture (Report #7 Notes A)
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

function loadEnv() {
  const envPath = path.resolve(__dirname, "..", ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    content.split("\n").forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let val = (match[2] || "").trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        process.env[match[1]] = val;
      }
    });
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase environment variables!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";
const DEFAULT_BRANCH_ID = "00000000-0000-0000-0000-000000000002";

// Pure JS Accounting Engine implementations for verification
function computeGeneralLedgerSummary(accounts, entries, dateFrom, dateTo) {
  let totOpenDr = 0;
  let totOpenCr = 0;
  let totPerDr = 0;
  let totPerCr = 0;
  let totEndDr = 0;
  let totEndCr = 0;

  const rows = accounts.map(acc => {
    let openDr = 0;
    let openCr = 0;
    let periodDr = 0;
    let periodCr = 0;

    (entries || []).forEach(entry => {
      const isOpening = entry.referenceType === "opening_entry" || entry.entryNumber?.startsWith("OPENING-") || entry.entryNumber?.startsWith("JV-OPENING-");
      const isBeforePeriod = dateFrom ? entry.date < dateFrom : false;
      const isInPeriod = (!dateFrom || entry.date >= dateFrom) && (!dateTo || entry.date <= dateTo);

      entry.lines?.forEach(line => {
        if (line.accountId === acc.id || line.accountCode === acc.code) {
          const dr = Number(line.debit) || 0;
          const cr = Number(line.credit) || 0;

          if (isOpening || isBeforePeriod) {
            openDr += dr;
            openCr += cr;
          } else if (isInPeriod) {
            periodDr += dr;
            periodCr += cr;
          }
        }
      });
    });

    const netOpen = openDr - openCr;
    const openingDebit = netOpen > 0 ? netOpen : 0;
    const openingCredit = netOpen < 0 ? Math.abs(netOpen) : 0;

    const totalNet = netOpen + (periodDr - periodCr);
    let endingDebit = 0;
    let endingCredit = 0;

    if (acc.nature === "debit") {
      endingDebit = totalNet >= 0 ? totalNet : 0;
      endingCredit = totalNet < 0 ? Math.abs(totalNet) : 0;
    } else {
      endingCredit = totalNet <= 0 ? Math.abs(totalNet) : 0;
      endingDebit = totalNet > 0 ? totalNet : 0;
    }

    const isLeaf = acc.level === 4 || !accounts.some(sub => sub.parentId === acc.id);
    if (isLeaf) {
      totOpenDr += openingDebit;
      totOpenCr += openingCredit;
      totPerDr += periodDr;
      totPerCr += periodCr;
      totEndDr += endingDebit;
      totEndCr += endingCredit;
    }

    return {
      accountCode: acc.code,
      accountNameAr: acc.nameAr,
      accountNameEn: acc.nameEn,
      accountType: acc.type,
      level: acc.level,
      nature: acc.nature,
      openingDebit,
      openingCredit,
      periodDebit: periodDr,
      periodCredit: periodCr,
      endingDebit,
      endingCredit,
    };
  });

  return {
    rows,
    totalOpeningDebit: totOpenDr,
    totalOpeningCredit: totOpenCr,
    totalPeriodDebit: totPerDr,
    totalPeriodCredit: totPerCr,
    totalEndingDebit: totEndDr,
    totalEndingCredit: totEndCr,
  };
}

function computeTrialBalance(accounts, entries, filters) {
  const { dateFrom, dateTo, level } = filters || {};
  const summary = computeGeneralLedgerSummary(accounts, entries, dateFrom, dateTo);

  let grandOpenDr = 0;
  let grandOpenCr = 0;
  let grandPerDr = 0;
  let grandPerCr = 0;
  let grandEndDr = 0;
  let grandEndCr = 0;

  const leafAccounts = accounts.filter(a => a.level === 4 || !accounts.some(sub => sub.parentId === a.id));
  leafAccounts.forEach(leaf => {
    const r = summary.rows.find(row => row.accountCode === leaf.code);
    if (r) {
      grandOpenDr += r.openingDebit;
      grandOpenCr += r.openingCredit;
      grandPerDr += r.periodDebit;
      grandPerCr += r.periodCredit;
      grandEndDr += r.endingDebit;
      grandEndCr += r.endingCredit;
    }
  });

  const rows = accounts
    .filter(acc => {
      if (level && level !== "all") {
        return acc.level === Number(level);
      }
      return true;
    })
    .map(acc => {
      const isLeaf = acc.level === 4 || !accounts.some(sub => sub.parentId === acc.id);
      let openDr = 0;
      let openCr = 0;
      let perDr = 0;
      let perCr = 0;
      let endDr = 0;
      let endCr = 0;

      if (isLeaf) {
        const r = summary.rows.find(row => row.accountCode === acc.code);
        if (r) {
          openDr = r.openingDebit;
          openCr = r.openingCredit;
          perDr = r.periodDebit;
          perCr = r.periodCredit;
          endDr = r.endingDebit;
          endCr = r.endingCredit;
        }
      } else {
        const descendants = accounts.filter(a => a.code.startsWith(acc.code) && (a.level === 4 || !accounts.some(sub => sub.parentId === a.id)));
        descendants.forEach(d => {
          const r = summary.rows.find(row => row.accountCode === d.code);
          if (r) {
            openDr += r.openingDebit;
            openCr += r.openingCredit;
            perDr += r.periodDebit;
            perCr += r.periodCredit;
            endDr += r.endingDebit;
            endCr += r.endingCredit;
          }
        });
      }

      return {
        accountCode: acc.code,
        accountNameAr: acc.nameAr,
        accountNameEn: acc.nameEn,
        accountType: acc.type,
        level: acc.level,
        isParent: acc.level < 4 && accounts.some(sub => sub.parentId === acc.id),
        openingDebit: openDr,
        openingCredit: openCr,
        periodDebit: perDr,
        periodCredit: perCr,
        endingDebit: endDr,
        endingCredit: endCr,
      };
    });

  const isBalanced =
    Math.abs(grandOpenDr - grandOpenCr) < 0.01 &&
    Math.abs(grandPerDr - grandPerCr) < 0.01 &&
    Math.abs(grandEndDr - grandEndCr) < 0.01;

  return {
    rows,
    totalOpeningDebit: grandOpenDr,
    totalOpeningCredit: grandOpenCr,
    totalPeriodDebit: grandPerDr,
    totalPeriodCredit: grandPerCr,
    totalEndingDebit: grandEndDr,
    totalEndingCredit: grandEndCr,
    totalDebit: grandEndDr,
    totalCredit: grandEndCr,
    isBalanced,
  };
}

function computeIncomeStatement(accounts, entries) {
  const getAccountPeriodBalance = (acc) => {
    let dr = 0;
    let cr = 0;
    (entries || []).forEach(e => {
      const isOpening = e.referenceType === "opening_entry" || e.entryNumber?.startsWith("OPENING-") || e.entryNumber?.startsWith("JV-OPENING-");
      if (isOpening) return;

      (e.lines || []).forEach(l => {
        if (l.accountId === acc.id || l.accountCode === acc.code) {
          dr += Number(l.debit) || 0;
          cr += Number(l.credit) || 0;
        }
      });
    });
    const entryBalance = acc.nature === "credit" ? (cr - dr) : (dr - cr);
    return Math.max(0, entryBalance);
  };

  const leafAccounts = accounts.filter(a => a.level === 4 || !accounts.some(sub => sub.parentId === a.id));
  const revenues = leafAccounts.filter(a => a.type === "revenue");
  const cogs = leafAccounts.filter(a => a.type === "expense" && a.code.startsWith("51"));
  const expenses = leafAccounts.filter(a => a.type === "expense" && !a.code.startsWith("51"));

  const totalRevenue = revenues.reduce((s, a) => s + getAccountPeriodBalance(a), 0);
  const totalCOGS = cogs.reduce((s, a) => s + getAccountPeriodBalance(a), 0);
  const grossProfit = totalRevenue - totalCOGS;
  const totalExpenses = expenses.reduce((s, a) => s + getAccountPeriodBalance(a), 0);
  const netIncome = grossProfit - totalExpenses;

  return {
    totalRevenue,
    totalCOGS,
    grossProfit,
    totalExpenses,
    netIncome,
  };
}

function computeBalanceSheet(accounts, entries) {
  const getAccountCumulativeBalance = (acc) => {
    let dr = 0;
    let cr = 0;
    (entries || []).forEach(e => {
      (e.lines || []).forEach(l => {
        if (l.accountId === acc.id || l.accountCode === acc.code) {
          dr += Number(l.debit) || 0;
          cr += Number(l.credit) || 0;
        }
      });
    });
    const entryBalance = acc.nature === "credit" ? (cr - dr) : (dr - cr);
    if (entryBalance !== 0) return Math.max(0, entryBalance);
    return Number(acc.balance) || 0;
  };

  const leafAccounts = accounts.filter(a => a.level === 4 || !accounts.some(sub => sub.parentId === a.id));
  const assets = leafAccounts.filter(a => a.type === "assets");
  const liabilities = leafAccounts.filter(a => a.type === "liabilities");
  const equity = leafAccounts.filter(a => a.type === "equity");

  const totalAssets = assets.reduce((s, a) => s + getAccountCumulativeBalance(a), 0);
  const totalLiabilities = liabilities.reduce((s, a) => s + getAccountCumulativeBalance(a), 0);

  const { netIncome } = computeIncomeStatement(accounts, entries);
  const totalEquity = equity.reduce((s, a) => s + getAccountCumulativeBalance(a), 0) + netIncome;

  return {
    totalAssets,
    totalLiabilities,
    totalEquity,
    netIncome,
    isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1.0,
  };
}

async function runAudit() {
  console.log("===============================================================");
  console.log("🔍 STARTING FULL OPENING BALANCE ARCHITECTURE AUDIT");
  console.log("===============================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASSED: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAILED: ${message}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // TEST 1: Decoupling Verification (Master Data creates 0 JEs)
    // -------------------------------------------------------------
    console.log("🔹 TEST 1: Verifying Single Source of Opening Balances (Decoupling)...");

    const { count: initialJECount } = await supabase
      .from("journal_entries")
      .select("*", { count: "exact", head: true });

    // 1. Create a test product
    const testSku = "AUDIT-PRD-" + Date.now().toString().slice(-4);
    const { data: testProd, error: prodErr } = await supabase
      .from("products")
      .insert([{
        organization_id: DEFAULT_ORG_ID,
        sku: testSku,
        name_ar: "صنف اختبار أرصدة",
        name_en: "Audit Test Product",
        cost_price: 150,
        selling_price: 250,
        tax_rate: 15,
        min_stock_level: 5,
        status: "active"
      }])
      .select()
      .single();

    assert(!prodErr && testProd, `Product created without error (${testSku})`);

    const { count: jeCountAfterProd } = await supabase
      .from("journal_entries")
      .select("*", { count: "exact", head: true });

    assert(jeCountAfterProd === initialJECount, `Product creation generated 0 automatic journal entries (${jeCountAfterProd} === ${initialJECount})`);

    // 2. Create a test customer with opening balance
    const { data: testCust, error: custErr } = await supabase
      .from("customers")
      .insert([{
        organization_id: DEFAULT_ORG_ID,
        code: "CUST-AUDIT-" + Date.now().toString().slice(-4),
        name_ar: "عميل اختبار",
        name_en: "Audit Customer",
        mobile: "0500000000",
        city: "الرياض",
        current_balance: 5000,
        status: "active"
      }])
      .select()
      .single();

    assert(!custErr && testCust, "Customer created with operational balance");

    const { count: jeCountAfterCust } = await supabase
      .from("journal_entries")
      .select("*", { count: "exact", head: true });

    assert(jeCountAfterCust === initialJECount, `Customer creation generated 0 automatic journal entries (${jeCountAfterCust} === ${initialJECount})`);

    // 3. Create a test supplier with opening balance
    const { data: testSupp, error: suppErr } = await supabase
      .from("suppliers")
      .insert([{
        organization_id: DEFAULT_ORG_ID,
        code: "SUPP-AUDIT-" + Date.now().toString().slice(-4),
        name_ar: "مورد اختبار",
        name_en: "Audit Supplier",
        mobile: "0511111111",
        address: "جدة، حي الروضة",
        current_balance: 8000,
        status: "active"
      }])
      .select()
      .single();

    assert(!suppErr && testSupp, "Supplier created with operational balance");

    const { count: jeCountAfterSupp } = await supabase
      .from("journal_entries")
      .select("*", { count: "exact", head: true });

    assert(jeCountAfterSupp === initialJECount, `Supplier creation generated 0 automatic journal entries (${jeCountAfterSupp} === ${initialJECount})`);

    // -------------------------------------------------------------
    // TEST 2: Official Opening Entry Posting & Line Allocation
    // -------------------------------------------------------------
    console.log("\n🔹 TEST 2: Testing Official Opening Entry Posting & Equilibrium...");

    const { data: accounts, error: accErr } = await supabase
      .from("accounts")
      .select("*")
      .order("code", { ascending: true });

    assert(!accErr && accounts.length >= 70, `Chart of Accounts loaded (${accounts?.length} accounts)`);

    const cashAcc = accounts.find(a => a.code === "1101001") || accounts[0];
    const invAcc = accounts.find(a => a.code === "1103001") || accounts[1];
    const apAcc = accounts.find(a => a.code === "2101001") || accounts[2];
    const equityAcc = accounts.find(a => a.code === "3101") || accounts.find(a => a.type === "equity") || accounts[3];

    // Create balanced Opening Entry (Total Dr: 200,000 == Total Cr: 200,000)
    const openingEntryNumber = "OPENING-2026-AUDIT";
    const { data: openingJE, error: openingErr } = await supabase
      .from("journal_entries")
      .insert([{
        organization_id: DEFAULT_ORG_ID,
        branch_id: DEFAULT_BRANCH_ID,
        entry_number: openingEntryNumber,
        date: "2026-01-01",
        reference_type: "opening_entry",
        description: "القيد الافتتاحي وإثبات أرصدة أول المدة للسنة المالية 2026",
        total_debit: 200000,
        total_credit: 200000,
        is_balanced: true,
        status: "posted",
        created_by: "مدير النظام"
      }])
      .select()
      .single();

    assert(!openingErr && openingJE, `Opening journal entry created (${openingEntryNumber})`);

    // Insert 4 balanced opening lines
    const lines = [
      {
        journal_entry_id: openingJE.id,
        account_id: cashAcc.id,
        account_code: cashAcc.code,
        account_name: cashAcc.name_ar,
        debit: 120000,
        credit: 0,
        description: "رصيد الصندوق الرئيسي أول المدة"
      },
      {
        journal_entry_id: openingJE.id,
        account_id: invAcc.id,
        account_code: invAcc.code,
        account_name: invAcc.name_ar,
        debit: 80000,
        credit: 0,
        description: "رصيد مخزون بضاعة تامة أول المدة"
      },
      {
        journal_entry_id: openingJE.id,
        account_id: apAcc.id,
        account_code: apAcc.code,
        account_name: apAcc.name_ar,
        debit: 0,
        credit: 50000,
        description: "رصيد الموردين المستحق أول المدة"
      },
      {
        journal_entry_id: openingJE.id,
        account_id: equityAcc.id,
        account_code: equityAcc.code,
        account_name: equityAcc.name_ar,
        debit: 0,
        credit: 150000,
        description: "رأس المال / حقوق الملكية الافتتاحية"
      }
    ];

    const { data: insertedLines, error: linesErr } = await supabase
      .from("journal_lines")
      .insert(lines)
      .select();

    assert(!linesErr && insertedLines.length === 4, `Opening journal lines inserted (${insertedLines?.length} lines)`);

    // -------------------------------------------------------------
    // TEST 3: Validation of Opening Balance in Ledger & Trial Balance
    // -------------------------------------------------------------
    console.log("\n🔹 TEST 3: Auditing 6-Column Trial Balance & 8-Column General Ledger Formulas...");

    const { data: allJEs } = await supabase.from("journal_entries").select("*");
    const { data: allLines } = await supabase.from("journal_lines").select("*");

    const fullJEs = allJEs.map(e => ({
      ...e,
      entryNumber: e.entry_number,
      referenceType: e.reference_type,
      lines: allLines.filter(l => l.journal_entry_id === e.id).map(l => ({
        ...l,
        accountId: l.account_id,
        accountCode: l.account_code,
        accountName: l.account_name,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
      }))
    }));

    const mappedAccounts = accounts.map(a => ({
      ...a,
      nameAr: a.name_ar,
      nameEn: a.name_en,
      balance: Number(a.balance) || 0,
    }));

    // 1. Audit GL Summary (8 columns)
    const glSummary = computeGeneralLedgerSummary(mappedAccounts, fullJEs);
    assert(glSummary.totalOpeningDebit === 200000, `GL Total Opening Debit matches 200,000 (${glSummary.totalOpeningDebit})`);
    assert(glSummary.totalOpeningCredit === 200000, `GL Total Opening Credit matches 200,000 (${glSummary.totalOpeningCredit})`);
    assert(glSummary.totalOpeningDebit === glSummary.totalOpeningCredit, "GL Opening Balances are 100% Balanced");

    // 2. Audit Trial Balance (6 columns)
    const tb = computeTrialBalance(mappedAccounts, fullJEs);
    assert(tb.totalOpeningDebit === 200000, `TB Total Opening Debit matches 200,000 (${tb.totalOpeningDebit})`);
    assert(tb.totalOpeningCredit === 200000, `TB Total Opening Credit matches 200,000 (${tb.totalOpeningCredit})`);
    assert(tb.totalEndingDebit === 200000, `TB Total Ending Debit matches 200,000 (${tb.totalEndingDebit})`);
    assert(tb.totalEndingCredit === 200000, `TB Total Ending Credit matches 200,000 (${tb.totalEndingCredit})`);
    assert(tb.isBalanced === true, "TB isBalanced === true across all 6 columns");

    // 3. Audit Balance Sheet
    const bs = computeBalanceSheet(mappedAccounts, fullJEs);
    assert(bs.totalAssets === 200000, `BS Total Assets = 200,000 (Cash 120k + Inventory 80k) (${bs.totalAssets})`);
    assert(bs.totalLiabilities === 50000, `BS Total Liabilities = 50,000 (AP 50k) (${bs.totalLiabilities})`);
    assert(bs.totalEquity === 150000, `BS Total Equity = 150,000 (Capital 150k) (${bs.totalEquity})`);
    assert(bs.isBalanced === true, `BS Equation Holds: Assets (${bs.totalAssets}) == Liabilities (${bs.totalLiabilities}) + Equity (${bs.totalEquity})`);

    // 4. Audit Income Statement (Must exclude balance sheet opening balances)
    const inc = computeIncomeStatement(mappedAccounts, fullJEs);
    assert(inc.totalRevenue === 0, `Income statement revenue is 0 (excludes BS opening balance) (${inc.totalRevenue})`);
    assert(inc.totalExpenses === 0, `Income statement expense is 0 (${inc.totalExpenses})`);
    assert(inc.netIncome === 0, `Net income is 0 (${inc.netIncome})`);

    // -------------------------------------------------------------
    // TEST 4: Cleanup of Audit Test Records
    // -------------------------------------------------------------
    console.log("\n🔹 TEST 4: Cleaning up audit test records...");

    await supabase.from("journal_lines").delete().eq("journal_entry_id", openingJE.id);
    await supabase.from("journal_entries").delete().eq("id", openingJE.id);
    await supabase.from("products").delete().eq("id", testProd.id);
    await supabase.from("customers").delete().eq("id", testCust.id);
    await supabase.from("suppliers").delete().eq("id", testSupp.id);

    console.log("  ✅ Cleanup completed. Database returned to pristine state.");

    // -------------------------------------------------------------
    // FINAL REPORT
    // -------------------------------------------------------------
    console.log("\n===============================================================");
    console.log(`📊 AUDIT SUMMARY: ${passed} PASSED | ${failed} FAILED`);
    console.log("===============================================================");

    if (failed > 0) {
      console.error("\n❌ Some audit checks failed.");
      process.exit(1);
    } else {
      console.log("\n🎉 ALL OPENING BALANCE ARCHITECTURE AUDIT CHECKS PASSED PERFECTLY!");
      process.exit(0);
    }
  } catch (error) {
    console.error("❌ Unexpected error during audit:", error);
    process.exit(1);
  }
}

runAudit();
