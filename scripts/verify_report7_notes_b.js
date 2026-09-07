/**
 * verify_report7_notes_b.js
 * Comprehensive Accounting Validation Audit for Report #7 Notes (B)
 * -----------------------------------------------------------------
 * Validates against live Supabase database:
 * 1. Accumulated Depreciation Contra-Asset Treatment & Credit Nature
 * 2. Fixed Asset Net Book Value Formula (Cost - Accumulated Depreciation)
 * 3. Balance Sheet Accounting Equation Equilibrium (Net Assets = Liab + Equity)
 * 4. Opening Inventory Single Source of Truth from Opening Entry (GL 1103)
 * 5. Complete Decoupling from Product Card Quantities
 * 6. Income Statement Periodic COGS Formulation
 * 7. Chart of Accounts Recursive Depth-First Traversal Sequence (1 -> 2 -> 3 -> 4 -> 5)
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
  console.error("❌ Missing Supabase environment variables in .env.local!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

// Accounting Engine functions mirroring src/lib/accounting-engine.ts
function buildHierarchicalAccountTree(accounts) {
  const typeOrder = {
    assets: 1,
    liabilities: 2,
    equity: 3,
    revenue: 4,
    expense: 5,
  };

  const roots = accounts
    .filter(a => a.level === 1 || !a.parentId)
    .sort((a, b) => {
      const orderA = typeOrder[a.type] || 99;
      const orderB = typeOrder[b.type] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.code.localeCompare(b.code, undefined, { numeric: true });
    });

  const result = [];
  const visited = new Set();

  function traverse(parent) {
    if (visited.has(parent.id)) return;
    visited.add(parent.id);
    result.push(parent);

    const children = accounts
      .filter(a => a.parentId === parent.id || (!a.parentId && a.code.startsWith(parent.code) && a.level === parent.level + 1))
      .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

    children.forEach(child => traverse(child));
  }

  roots.forEach(root => traverse(root));

  const remaining = accounts
    .filter(a => !visited.has(a.id))
    .sort((a, b) => {
      const orderA = typeOrder[a.type] || 99;
      const orderB = typeOrder[b.type] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.code.localeCompare(b.code, undefined, { numeric: true });
    });

  return [...result, ...remaining];
}

function computeIncomeStatement(accounts, entries, products = [], purchaseInvoices = []) {
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
  const revenues = leafAccounts.filter(a => a.type === "revenue").map(a => ({ ...a, balance: getAccountPeriodBalance(a) }));
  const cogs = leafAccounts.filter(a => a.type === "expense" && a.code.startsWith("51")).map(a => ({ ...a, balance: getAccountPeriodBalance(a) }));
  const expenses = leafAccounts.filter(a => a.type === "expense" && !a.code.startsWith("51")).map(a => ({ ...a, balance: getAccountPeriodBalance(a) }));

  const totalRevenue = revenues.reduce((s, a) => s + a.balance, 0);
  const totalCOGS = cogs.reduce((s, a) => s + a.balance, 0);
  const grossProfit = totalRevenue - totalCOGS;
  const totalExpenses = expenses.reduce((s, a) => s + a.balance, 0);
  const netIncome = grossProfit - totalExpenses;

  // Single Source of Truth: Opening Inventory strictly from Opening Journal Entry (1103xxx accounts)
  let openingInventoryValue = 0;
  (entries || []).forEach(e => {
    const isOpening = e.referenceType === "opening_entry" || e.entryNumber?.startsWith("OPENING-") || e.entryNumber?.startsWith("JV-OPENING-");
    if (isOpening) {
      (e.lines || []).forEach(l => {
        if (l.accountCode?.startsWith("1103")) {
          openingInventoryValue += (Number(l.debit) || 0) - (Number(l.credit) || 0);
        }
      });
    }
  });
  openingInventoryValue = Math.max(0, openingInventoryValue);

  const purchasesValue = (purchaseInvoices || []).reduce((sum, pinv) => sum + (Number(pinv.subtotal) || 0), 0);
  const closingInventoryValue = Math.max(0, openingInventoryValue + purchasesValue - totalCOGS);
  const periodicCOGS = Math.max(0, openingInventoryValue + purchasesValue - closingInventoryValue);

  return {
    revenues,
    cogs,
    expenses,
    totalRevenue,
    totalCOGS,
    grossProfit,
    totalExpenses,
    netIncome,
    openingInventoryValue,
    purchasesValue,
    closingInventoryValue,
    periodicCOGS,
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
    const net = acc.nature === "credit" ? (cr - dr) : (dr - cr);
    if (dr > 0 || cr > 0) return Math.max(0, net);
    return Number(acc.balance) || 0;
  };

  const leafAccounts = accounts.filter(a => a.level === 4 || !accounts.some(sub => sub.parentId === a.id));

  const currentAssets = leafAccounts
    .filter(a => a.type === "assets" && a.code.startsWith("11"))
    .map(a => ({ ...a, balance: getAccountCumulativeBalance(a) }));
  const totalCurrentAssets = currentAssets.reduce((s, a) => s + a.balance, 0);

  const fixedCostAccounts = leafAccounts.filter(a => a.type === "assets" && a.code.startsWith("1201"));
  const deprAccounts = leafAccounts.filter(a => a.type === "assets" && a.code.startsWith("1202"));

  const fixedAssetGroups = [
    { key: "lands", nameAr: "الأراضي", costCode: "1201001", costBalance: 0, depreciationBalance: 0, netBookValue: 0 },
    { key: "buildings", nameAr: "المباني والإنشاءات", costCode: "1201002", depreciationCode: "1202001", costBalance: 0, depreciationBalance: 0, netBookValue: 0 },
    { key: "vehicles", nameAr: "السيارات ووسائل النقل", costCode: "1201003", depreciationCode: "1202002", costBalance: 0, depreciationBalance: 0, netBookValue: 0 },
    { key: "equipment", nameAr: "الآلات والمعدات", costCode: "1201004", costBalance: 0, depreciationBalance: 0, netBookValue: 0 },
    { key: "computers", nameAr: "أجهزة الحاسب والبرمجيات", costCode: "1201005", depreciationCode: "1202003", costBalance: 0, depreciationBalance: 0, netBookValue: 0 },
    { key: "furniture", nameAr: "الأثاث والتجهيزات المكتبية", costCode: "1201006", depreciationCode: "1202004", costBalance: 0, depreciationBalance: 0, netBookValue: 0 },
  ];

  fixedAssetGroups.forEach(g => {
    const costAcc = fixedCostAccounts.find(a => a.code === g.costCode);
    if (costAcc) g.costBalance = getAccountCumulativeBalance(costAcc);
    if (g.depreciationCode) {
      const deprAcc = deprAccounts.find(a => a.code === g.depreciationCode);
      if (deprAcc) g.depreciationBalance = getAccountCumulativeBalance(deprAcc);
    }
    g.netBookValue = g.costBalance - g.depreciationBalance;
  });

  const totalFixedAssetsCost = fixedCostAccounts.reduce((s, a) => s + getAccountCumulativeBalance(a), 0);
  const totalAccumulatedDepreciation = deprAccounts.reduce((s, a) => s + getAccountCumulativeBalance(a), 0);
  const totalNetFixedAssets = totalFixedAssetsCost - totalAccumulatedDepreciation;

  const totalAssets = totalCurrentAssets + totalNetFixedAssets;

  const currentLiabilities = leafAccounts
    .filter(a => a.type === "liabilities" && a.code.startsWith("21"))
    .map(a => ({ ...a, balance: getAccountCumulativeBalance(a) }));
  const totalCurrentLiabilities = currentLiabilities.reduce((s, a) => s + a.balance, 0);

  const nonCurrentLiabilities = leafAccounts
    .filter(a => a.type === "liabilities" && a.code.startsWith("22"))
    .map(a => ({ ...a, balance: getAccountCumulativeBalance(a) }));
  const totalNonCurrentLiabilities = nonCurrentLiabilities.reduce((s, a) => s + a.balance, 0);

  const totalLiabilities = totalCurrentLiabilities + totalNonCurrentLiabilities;

  const equityAccounts = leafAccounts
    .filter(a => a.type === "equity")
    .map(a => ({ ...a, balance: getAccountCumulativeBalance(a) }));
  const totalEquityBeforeProfit = equityAccounts.reduce((s, a) => s + a.balance, 0);

  const { netIncome } = computeIncomeStatement(accounts, entries);
  const totalEquity = totalEquityBeforeProfit + netIncome;
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01;

  return {
    currentAssets,
    totalCurrentAssets,
    fixedAssetGroups,
    totalFixedAssetsCost,
    totalAccumulatedDepreciation,
    totalNetFixedAssets,
    totalAssets,
    totalLiabilities,
    totalEquity,
    totalLiabilitiesAndEquity,
    netIncome,
    isBalanced,
  };
}

async function runAudit() {
  console.log("==================================================================");
  console.log("🚀 STARTING REPORT #7 NOTES (B) LIVE DATABASE & ACCOUNTING AUDIT");
  console.log("==================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Fetch live accounts from Supabase
  const { data: dbAccounts, error: accErr } = await supabase
    .from("accounts")
    .select("*")
    .order("code", { ascending: true });

  if (accErr || !dbAccounts) {
    console.error("❌ Failed to fetch accounts from Supabase:", accErr);
    process.exit(1);
  }

  const accounts = dbAccounts.map(a => ({
    id: a.id,
    organizationId: a.organization_id,
    code: a.code,
    nameAr: a.name_ar,
    nameEn: a.name_en,
    type: a.type,
    parentId: a.parent_id || undefined,
    level: a.level,
    nature: a.nature,
    balance: Number(a.balance) || 0,
    currency: a.currency || "EGP",
    isActive: a.is_active ?? true,
    isSystem: a.is_system ?? true,
  }));

  console.log(`📊 Loaded ${accounts.length} Chart of Accounts from Supabase.\n`);

  // TEST SUITE 1: ACCUMULATED DEPRECIATION ACCOUNTS IN LIVE DB
  console.log("--- TEST SUITE 1: Accumulated Depreciation Contra-Asset Nature ---");
  const deprAccounts = accounts.filter(a => a.code.startsWith("1202"));
  assert(deprAccounts.length >= 4, `Found ${deprAccounts.length} accumulated depreciation accounts in DB`);

  deprAccounts.forEach(acc => {
    assert(acc.type === "assets", `Account ${acc.code} (${acc.nameAr}) belongs to Asset class (type = assets)`);
    assert(acc.nature === "credit", `Account ${acc.code} (${acc.nameAr}) has normal CREDIT nature (nature = credit)`);
  });

  // TEST SUITE 2: FIXED ASSET NET BOOK VALUE & BALANCE SHEET EQUILIBRIUM
  console.log("\n--- TEST SUITE 2: Net Book Value & Balance Sheet Deductions ---");
  const sampleOpeningEntry = {
    id: "entry-ob-report7b-test",
    entryNumber: "OPENING-2026",
    date: "2026-01-01",
    referenceType: "opening_entry",
    description: "Opening Entry with Fixed Assets and Depreciation",
    lines: [
      // Current Assets
      { accountCode: "1101001", debit: 100000, credit: 0 },
      { accountCode: "1103001", debit: 250000, credit: 0 }, // Opening Inventory
      // Fixed Assets (Gross Cost)
      { accountCode: "1201001", debit: 500000, credit: 0 }, // Lands: 500,000
      { accountCode: "1201002", debit: 800000, credit: 0 }, // Buildings: 800,000
      { accountCode: "1201003", debit: 300000, credit: 0 }, // Vehicles: 300,000
      { accountCode: "1201005", debit: 100000, credit: 0 }, // Computers: 100,000
      { accountCode: "1201006", debit: 50000, credit: 0 },  // Furniture: 50,000
      // Contra Assets (Accumulated Depreciation - Credit)
      { accountCode: "1202001", debit: 0, credit: 80000 },  // Building Depr: 80,000 (Net: 720,000)
      { accountCode: "1202002", debit: 0, credit: 60000 },  // Vehicle Depr: 60,000 (Net: 240,000)
      { accountCode: "1202003", debit: 0, credit: 30000 },  // Computer Depr: 30,000 (Net: 70,000)
      { accountCode: "1202004", debit: 0, credit: 15000 },  // Furniture Depr: 15,000 (Net: 35,000)
      // Liabilities
      { accountCode: "2101001", debit: 0, credit: 165000 }, // Suppliers: 165,000
      // Equity
      { accountCode: "3101001", debit: 0, credit: 1750000 }, // Capital: 1,750,000
    ],
  };

  const totalDr = sampleOpeningEntry.lines.reduce((s, l) => s + l.debit, 0);
  const totalCr = sampleOpeningEntry.lines.reduce((s, l) => s + l.credit, 0);
  assert(totalDr === 2100000 && totalCr === 2100000, `Opening Entry is balanced: Dr ${totalDr} = Cr ${totalCr}`);

  const bs = computeBalanceSheet(accounts, [sampleOpeningEntry]);
  
  // Verify Net Values per Fixed Asset Group
  const bldg = bs.fixedAssetGroups.find(g => g.key === "buildings");
  assert(bldg && bldg.costBalance === 800000 && bldg.depreciationBalance === 80000 && bldg.netBookValue === 720000,
    `Buildings Net Book Value: Cost (800k) - Depr (80k) = Net (720k)`);

  const veh = bs.fixedAssetGroups.find(g => g.key === "vehicles");
  assert(veh && veh.costBalance === 300000 && veh.depreciationBalance === 60000 && veh.netBookValue === 240000,
    `Vehicles Net Book Value: Cost (300k) - Depr (60k) = Net (240k)`);

  const comp = bs.fixedAssetGroups.find(g => g.key === "computers");
  assert(comp && comp.costBalance === 100000 && comp.depreciationBalance === 30000 && comp.netBookValue === 70000,
    `Computers Net Book Value: Cost (100k) - Depr (30k) = Net (70k)`);

  const furn = bs.fixedAssetGroups.find(g => g.key === "furniture");
  assert(furn && furn.costBalance === 50000 && furn.depreciationBalance === 15000 && furn.netBookValue === 35000,
    `Furniture Net Book Value: Cost (50k) - Depr (15k) = Net (35k)`);

  assert(bs.totalFixedAssetsCost === 1750000, `Total Fixed Assets Gross Cost = 1,750,000 EGP`);
  assert(bs.totalAccumulatedDepreciation === 185000, `Total Accumulated Depreciation (Contra) = 185,000 EGP`);
  assert(bs.totalNetFixedAssets === 1565000, `Total Net Fixed Assets = 1,565,000 EGP (1.75M - 185k)`);
  assert(bs.totalCurrentAssets === 350000, `Total Current Assets = 350,000 EGP (100k Cash + 250k Inventory)`);
  assert(bs.totalAssets === 1915000, `Total Net Assets = 1,915,000 EGP (350k Current + 1,565k Net Fixed)`);
  assert(bs.totalLiabilities === 165000, `Total Liabilities = 165,000 EGP`);
  assert(bs.totalEquity === 1750000, `Total Equity = 1,750,000 EGP`);
  assert(bs.totalLiabilitiesAndEquity === 1915000, `Total Liabilities & Equity = 1,915,000 EGP`);
  assert(bs.isBalanced === true, `Balance Sheet is 100% Balanced: Net Assets (1.915M) === Liab + Equity (1.915M)`);

  // TEST SUITE 3: OPENING INVENTORY SOURCE & DECOUPLING FROM PRODUCT CARDS
  console.log("\n--- TEST SUITE 3: Opening Inventory Single Source of Truth ---");
  const mockProductsWithBogusOpening = [
    { id: "p1", sku: "SKU-TEST-001", costPrice: 999, warehouseStock: { "wh-01": 900 } }, // 899,100 EGP bogus inventory
  ];

  const incStmt = computeIncomeStatement(accounts, [sampleOpeningEntry], mockProductsWithBogusOpening);
  assert(incStmt.openingInventoryValue === 250000,
    `Opening inventory in Income Statement strictly equals 250,000 EGP from Opening Entry (GL 1103001)`);
  assert(incStmt.openingInventoryValue !== 899100,
    `Product Card opening quantities (899,100 EGP) are 100% excluded from Income Statement`);

  assert(incStmt.closingInventoryValue === 250000, `Closing inventory in periodic model = 250,000 EGP`);
  assert(incStmt.periodicCOGS === 0, `COGS with no sales movements = 0.00 EGP`);

  // TEST SUITE 4: CHART OF ACCOUNTS RECURSIVE HIERARCHY ORDER
  console.log("\n--- TEST SUITE 4: Chart of Accounts Recursive Depth-First Ordering ---");
  const tree = buildHierarchicalAccountTree(accounts);
  assert(tree.length === accounts.length, `Hierarchical tree includes all ${accounts.length} accounts from DB`);

  // Verify class sequence 1 -> 2 -> 3 -> 4 -> 5
  let currentGroup = 1;
  let hierarchyOrderValid = true;
  for (const acc of tree) {
    const rootDigit = parseInt(acc.code.charAt(0));
    if (rootDigit < currentGroup) {
      hierarchyOrderValid = false;
      console.error(`Invalid ordering: Account ${acc.code} (Group ${rootDigit}) appeared after Group ${currentGroup}`);
    }
    if (rootDigit > currentGroup) {
      currentGroup = rootDigit;
    }
  }
  assert(hierarchyOrderValid, `COA Tree maintains strict top-level sequence 1 (Assets) -> 2 (Liab) -> 3 (Equity) -> 4 (Rev) -> 5 (Exp)`);

  // Verify parent appears before children
  let parentChildOrderValid = true;
  const seenIds = new Set();
  for (const acc of tree) {
    if (acc.parentId && !seenIds.has(acc.parentId)) {
      parentChildOrderValid = false;
      console.error(`Invalid parent-child order: Account ${acc.code} appeared before parent ${acc.parentId}`);
    }
    seenIds.add(acc.id);
  }
  assert(parentChildOrderValid, `Every parent account strictly precedes its children in depth-first order`);

  console.log("\n==================================================================");
  console.log(`🏁 AUDIT RESULTS: ${passed} PASSED / ${failed} FAILED`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runAudit().catch(err => {
  console.error("FATAL AUDIT ERROR:", err);
  process.exit(1);
});
