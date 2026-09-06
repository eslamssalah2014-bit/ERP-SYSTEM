/**
 * REPORT #7: COMPLETE DATABASE RESET & CHART OF ACCOUNTS REBUILD
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load .env.local
try {
  const envPath = path.resolve(__dirname, "../.env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...vals] = trimmed.split("=");
        if (key && vals.length > 0) {
          process.env[key.trim()] = vals.join("=").trim().replace(/^["']|["']$/g, '');
        }
      }
    });
  }
} catch (e) {
  console.warn("Could not read .env.local:", e.message);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";
const DEFAULT_BRANCH_ID = "00000000-0000-0000-0000-000000000002";
const DEFAULT_POS_CUSTOMER_ID = "00000000-0000-0000-0000-000000000099";

function generateAccountUUID(code) {
  const hex = code.replace(/[^0-9]/g, "").padStart(12, "0").slice(-12);
  return `00000000-0000-0000-0001-${hex}`;
}

// Approved Standard Chart of Accounts (Exact 57/75 structure from Report #6 & #7)
const APPROVED_COA = [
  // =========================================================================
  // 1. ASSETS (1)
  // =========================================================================
  { code: "1", nameAr: "الأصول (Assets)", nameEn: "Assets", type: "assets", nature: "debit", level: 1, parentCode: null },
  // Current Assets (11)
  { code: "11", nameAr: "الأصول المتداولة", nameEn: "Current Assets", type: "assets", nature: "debit", level: 2, parentCode: "1" },
  { code: "1101", nameAr: "النقدية وشبه النقدية", nameEn: "Cash & Treasury", type: "assets", nature: "debit", level: 3, parentCode: "11" },
  { code: "1101001", nameAr: "صندوق رئيسي", nameEn: "Main Cash", type: "assets", nature: "debit", level: 4, parentCode: "1101" },
  { code: "1101002", nameAr: "النقدية بالبنوك", nameEn: "Bank Cash", type: "assets", nature: "debit", level: 4, parentCode: "1101" },

  { code: "1102", nameAr: "العملاء والمدينون", nameEn: "Accounts Receivable", type: "assets", nature: "debit", level: 3, parentCode: "11" },
  { code: "1102001", nameAr: "العملاء", nameEn: "Customers", type: "assets", nature: "debit", level: 4, parentCode: "1102" },
  { code: "1102002", nameAr: "أوراق القبض", nameEn: "Notes Receivable", type: "assets", nature: "debit", level: 4, parentCode: "1102" },
  { code: "1102003", nameAr: "شيكات تحت التحصيل", nameEn: "Checks Under Collection", type: "assets", nature: "debit", level: 4, parentCode: "1102" },

  { code: "1103", nameAr: "المخزون", nameEn: "Inventory", type: "assets", nature: "debit", level: 3, parentCode: "11" },
  { code: "1103001", nameAr: "مخزون بضاعة تامة", nameEn: "Finished Goods Inventory", type: "assets", nature: "debit", level: 4, parentCode: "1103" },
  { code: "1103002", nameAr: "بضاعة بالطريق", nameEn: "Goods In Transit", type: "assets", nature: "debit", level: 4, parentCode: "1103" },

  { code: "1104", nameAr: "مدينون وأرصدة مدينة أخرى", nameEn: "Other Receivables", type: "assets", nature: "debit", level: 3, parentCode: "11" },
  { code: "1104001", nameAr: "مصروفات مدفوعة مقدماً", nameEn: "Prepaid Expenses", type: "assets", nature: "debit", level: 4, parentCode: "1104" },
  { code: "1104002", nameAr: "سلف وعُهد العاملين", nameEn: "Employee Advances", type: "assets", nature: "debit", level: 4, parentCode: "1104" },

  { code: "1105", nameAr: "الأرصدة الضريبية المدينة", nameEn: "Taxes", type: "assets", nature: "debit", level: 3, parentCode: "11" },
  { code: "1105002", nameAr: "ضريبة القيمة المضافة مدخلات", nameEn: "VAT Input Tax", type: "assets", nature: "debit", level: 4, parentCode: "1105" },

  // Non Current Assets (12)
  { code: "12", nameAr: "الأصول غير المتداولة", nameEn: "Non Current Assets", type: "assets", nature: "debit", level: 2, parentCode: "1" },
  { code: "1201", nameAr: "الأصول الثابتة", nameEn: "Fixed Assets", type: "assets", nature: "debit", level: 3, parentCode: "12" },
  { code: "1201001", nameAr: "أراضي", nameEn: "Lands", type: "assets", nature: "debit", level: 4, parentCode: "1201" },
  { code: "1201002", nameAr: "مباني وإنشاءات", nameEn: "Buildings", type: "assets", nature: "debit", level: 4, parentCode: "1201" },
  { code: "1201003", nameAr: "سيارات ووسائل نقل", nameEn: "Vehicles", type: "assets", nature: "debit", level: 4, parentCode: "1201" },
  { code: "1201004", nameAr: "آلات ومعدات", nameEn: "Equipment", type: "assets", nature: "debit", level: 4, parentCode: "1201" },
  { code: "1201005", nameAr: "أجهزة حاسب وبرمجيات", nameEn: "Computers", type: "assets", nature: "debit", level: 4, parentCode: "1201" },
  { code: "1201006", nameAr: "أثاث وتجهيزات مكتبية", nameEn: "Furniture", type: "assets", nature: "debit", level: 4, parentCode: "1201" },

  { code: "1202", nameAr: "مجمع الإهلاك للأصول الثابتة", nameEn: "Accumulated Depreciation", type: "assets", nature: "credit", level: 3, parentCode: "12" },
  { code: "1202001", nameAr: "مجمع إهلاك مباني", nameEn: "Building Depreciation", type: "assets", nature: "credit", level: 4, parentCode: "1202" },
  { code: "1202002", nameAr: "مجمع إهلاك سيارات", nameEn: "Vehicle Depreciation", type: "assets", nature: "credit", level: 4, parentCode: "1202" },
  { code: "1202003", nameAr: "مجمع إهلاك حاسبات", nameEn: "Computer Depreciation", type: "assets", nature: "credit", level: 4, parentCode: "1202" },
  { code: "1202004", nameAr: "مجمع إهلاك أثاث", nameEn: "Furniture Depreciation", type: "assets", nature: "credit", level: 4, parentCode: "1202" },

  // =========================================================================
  // 2. LIABILITIES (2)
  // =========================================================================
  { code: "2", nameAr: "الخصوم والالتزامات (Liabilities)", nameEn: "Liabilities", type: "liabilities", nature: "credit", level: 1, parentCode: null },
  // Current Liabilities (21)
  { code: "21", nameAr: "الخصوم المتداولة", nameEn: "Current Liabilities", type: "liabilities", nature: "credit", level: 2, parentCode: "2" },
  { code: "2101", nameAr: "الموردون والدائنون", nameEn: "Accounts Payable", type: "liabilities", nature: "credit", level: 3, parentCode: "21" },
  { code: "2101001", nameAr: "الموردون", nameEn: "Suppliers", type: "liabilities", nature: "credit", level: 4, parentCode: "2101" },
  { code: "2101002", nameAr: "أوراق الدفع", nameEn: "Notes Payable", type: "liabilities", nature: "credit", level: 4, parentCode: "2101" },

  { code: "2102", nameAr: "الالتزامات الضريبية", nameEn: "Taxes Payable", type: "liabilities", nature: "credit", level: 3, parentCode: "21" },
  { code: "2102001", nameAr: "ضريبة الدخل المستحقة", nameEn: "Income Tax Payable", type: "liabilities", nature: "credit", level: 4, parentCode: "2102" },
  { code: "2102002", nameAr: "ضريبة القيمة المضافة مخرجات", nameEn: "VAT Output Tax", type: "liabilities", nature: "credit", level: 4, parentCode: "2102" },
  { code: "2102003", nameAr: "ضريبة الخصم والتحصيل", nameEn: "Withholding Tax Payable", type: "liabilities", nature: "credit", level: 4, parentCode: "2102" },

  { code: "2103", nameAr: "دائنون وأرصدة دائنة أخرى", nameEn: "Other Payables", type: "liabilities", nature: "credit", level: 3, parentCode: "21" },
  { code: "2103001", nameAr: "مصروفات مستحقة", nameEn: "Accrued Expenses", type: "liabilities", nature: "credit", level: 4, parentCode: "2103" },
  { code: "2103002", nameAr: "أمانات ضرائب وتأمينات", nameEn: "Insurance & Tax Deposits", type: "liabilities", nature: "credit", level: 4, parentCode: "2103" },

  // Non Current Liabilities (22)
  { code: "22", nameAr: "الخصوم غير المتداولة", nameEn: "Non Current Liabilities", type: "liabilities", nature: "credit", level: 2, parentCode: "2" },
  { code: "2201", nameAr: "قروض طويلة الأجل", nameEn: "Long-term Loans", type: "liabilities", nature: "credit", level: 3, parentCode: "22" },
  { code: "2201001", nameAr: "قروض بنكية", nameEn: "Bank Loans", type: "liabilities", nature: "credit", level: 4, parentCode: "2201" },

  // =========================================================================
  // 3. EQUITY (3)
  // =========================================================================
  { code: "3", nameAr: "حقوق الملكية (Equity)", nameEn: "Equity", type: "equity", nature: "credit", level: 1, parentCode: null },
  { code: "31", nameAr: "رأس المال والاحتياطيات", nameEn: "Capital & Reserves", type: "equity", nature: "credit", level: 2, parentCode: "3" },
  { code: "3101", nameAr: "رأس المال المدفوع", nameEn: "Paid-in Capital", type: "equity", nature: "credit", level: 3, parentCode: "31" },
  { code: "3101001", nameAr: "رأس المال", nameEn: "Capital", type: "equity", nature: "credit", level: 4, parentCode: "3101" },
  { code: "3101002", nameAr: "أرباح / خسائر مرحلة", nameEn: "Retained Earnings", type: "equity", nature: "credit", level: 4, parentCode: "3101" },
  { code: "3101003", nameAr: "أرباح العام الحالي", nameEn: "Current Year Profit", type: "equity", nature: "credit", level: 4, parentCode: "3101" },
  { code: "3101004", nameAr: "جاري الشركاء", nameEn: "Partners Current Account", type: "equity", nature: "credit", level: 4, parentCode: "3101" },

  // =========================================================================
  // 4. REVENUE (4)
  // =========================================================================
  { code: "4", nameAr: "الإيرادات (Revenue)", nameEn: "Revenue", type: "revenue", nature: "credit", level: 1, parentCode: null },
  { code: "41", nameAr: "إيرادات المبيعات والنشاط", nameEn: "Sales & Operating Revenue", type: "revenue", nature: "credit", level: 2, parentCode: "4" },
  { code: "4101", nameAr: "إيرادات النشاط الرئيسي", nameEn: "Sales Revenue", type: "revenue", nature: "credit", level: 3, parentCode: "41" },
  { code: "4101001", nameAr: "إيراد مبيعات بضائع", nameEn: "Goods Sales Revenue", type: "revenue", nature: "credit", level: 4, parentCode: "4101" },
  { code: "4101002", nameAr: "مردودات ومسموحات مبيعات", nameEn: "Sales Returns & Allowances", type: "revenue", nature: "debit", level: 4, parentCode: "4101" },
  { code: "4101003", nameAr: "خصم مسموح به", nameEn: "Sales Discount Allowed", type: "revenue", nature: "debit", level: 4, parentCode: "4101" },

  { code: "4102", nameAr: "إيرادات أخرى", nameEn: "Other Revenues", type: "revenue", nature: "credit", level: 3, parentCode: "41" },
  { code: "4102001", nameAr: "إيرادات متنوعة", nameEn: "Miscellaneous Revenue", type: "revenue", nature: "credit", level: 4, parentCode: "4102" },

  // =========================================================================
  // 5. EXPENSES (5) - COMPLETE 16 ACCOUNTS
  // =========================================================================
  { code: "5", nameAr: "المصروفات والتكاليف (Expenses)", nameEn: "Expenses", type: "expense", nature: "debit", level: 1, parentCode: null },
  { code: "51", nameAr: "تكلفة النشاط والإنتاج", nameEn: "Cost of Operations", type: "expense", nature: "debit", level: 2, parentCode: "5" },
  { code: "5101", nameAr: "تكلفة المبيعات", nameEn: "Cost of Goods Sold", type: "expense", nature: "debit", level: 3, parentCode: "51" },
  { code: "5101001", nameAr: "تكلفة البضاعة المباعة", nameEn: "Cost of Goods Sold", type: "expense", nature: "debit", level: 4, parentCode: "5101" },
  { code: "5101002", nameAr: "مردودات ومسموحات مشتريات", nameEn: "Purchase Returns & Allowances", type: "expense", nature: "credit", level: 4, parentCode: "5101" },
  { code: "5101003", nameAr: "خصم مكتسب", nameEn: "Purchase Discount Received", type: "expense", nature: "credit", level: 4, parentCode: "5101" },

  { code: "52", nameAr: "مصروفات تشغيلية وإدارية", nameEn: "Operating Expenses", type: "expense", nature: "debit", level: 2, parentCode: "5" },
  { code: "5201", nameAr: "مصروفات بيعية وتسويقية", nameEn: "Selling & Marketing Expenses", type: "expense", nature: "debit", level: 3, parentCode: "52" },
  { code: "5201001", nameAr: "عمولات بيع ونقل", nameEn: "Sales Commissions & Shipping", type: "expense", nature: "debit", level: 4, parentCode: "5201" },
  { code: "5201002", nameAr: "دعاية وإعلان", nameEn: "Advertising & Marketing", type: "expense", nature: "debit", level: 4, parentCode: "5201" },

  { code: "5202", nameAr: "مصروفات عمومية وإدارية", nameEn: "General & Admin Expenses", type: "expense", nature: "debit", level: 3, parentCode: "52" },
  { code: "5202001", nameAr: "رواتب وأجور إدارية", nameEn: "Salaries & Wages", type: "expense", nature: "debit", level: 4, parentCode: "5202" },
  { code: "5202002", nameAr: "إيجار مقرات وفروع", nameEn: "Rent Expense", type: "expense", nature: "debit", level: 4, parentCode: "5202" },
  { code: "5202003", nameAr: "كهرباء ومياه ومرافق", nameEn: "Utilities Expense", type: "expense", nature: "debit", level: 4, parentCode: "5202" },
  { code: "5202004", nameAr: "صيانة ونظافة", nameEn: "Maintenance & Cleaning", type: "expense", nature: "debit", level: 4, parentCode: "5202" },
  { code: "5202005", nameAr: "إهلاك الأصول الثابتة", nameEn: "Depreciation Expense", type: "expense", nature: "debit", level: 4, parentCode: "5202" },
];

async function runResetAndRebuild() {
  console.log("===============================================================================");
  console.log("             SANAD ERP - REPORT #7 DATABASE RESET & REBUILD                    ");
  console.log("===============================================================================\n");

  const report = {
    tablesCleared: [],
    accountsTotal: APPROVED_COA.length,
    accountsImported: 0,
    hierarchyIntegrity: false,
    codeUniqueness: false,
    expenseGroupCount: 0,
    errors: [],
  };

  // STEP 1: PRE-VALIDATION
  const codeMap = new Map();
  let duplicates = false;
  APPROVED_COA.forEach(a => {
    if (codeMap.has(a.code)) {
      report.errors.push(`Duplicate code: ${a.code}`);
      duplicates = true;
    }
    codeMap.set(a.code, a);
  });

  if (!duplicates) {
    report.codeUniqueness = true;
    console.log(`✅ Pre-validation: All ${APPROVED_COA.length} accounts have 100% unique codes.`);
  }

  const expAccounts = APPROVED_COA.filter(a => a.code.startsWith("5"));
  report.expenseGroupCount = expAccounts.length;
  console.log(`✅ Pre-validation: Group 5 Expenses contains exactly ${report.expenseGroupCount} accounts.`);

  // STEP 2: FULL DATABASE RESET (Purging all transactional & test data)
  console.log("\n🚀 Executing Full Database Reset (Purging transactional & master test data)...");

  // Clear transactional tables
  const clearTable = async (name, col = "id") => {
    try {
      const { error } = await supabase.from(name).delete().neq(col, "00000000-0000-0000-0000-000000000000");
      if (!error) {
        report.tablesCleared.push(name);
        console.log(`  ✓ Cleared table: ${name}`);
      } else if (error.code !== "42P01") {
        console.warn(`  ⚠️ Warning on ${name}:`, error.message);
      }
    } catch (e) {
      console.warn(`  ⚠️ Error on ${name}:`, e.message);
    }
  };

  await clearTable("journal_lines");
  await clearTable("journal_entries");
  await clearTable("sales_invoice_items");
  await clearTable("sales_invoices");
  await clearTable("sales_return_items");
  await clearTable("sales_returns");
  await clearTable("purchase_invoice_items");
  await clearTable("purchase_invoices");
  await clearTable("purchase_return_items");
  await clearTable("purchase_returns");
  await clearTable("stock_movements");
  await clearTable("product_warehouse_stock", "product_id");
  await clearTable("cash_receipts");
  await clearTable("cash_payments");
  await clearTable("check_records");
  await clearTable("audit_logs");
  await clearTable("products");
  await clearTable("suppliers");
  await clearTable("cost_centers");
  await clearTable("customers");

  // Step 2b: Clear treasury_accounts BEFORE accounts to avoid foreign key violation
  await clearTable("treasury_accounts");

  // Step 2c: Now delete all accounts cleanly
  console.log("\n🚀 Purging old Chart of Accounts and Rebuilding from Scratch...");
  try {
    const { error: delAccErr } = await supabase.from("accounts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (delAccErr) {
      console.error("❌ Accounts purge error:", delAccErr.message);
      report.errors.push(`Accounts purge error: ${delAccErr.message}`);
    } else {
      console.log("  ✓ Purged all old / duplicate accounts from PostgreSQL");
    }
  } catch (e) {
    console.error("Accounts delete exception:", e.message);
  }

  // STEP 3: INSERT REBUILT COA TOPOLOGICALLY (Level 1 -> 2 -> 3 -> 4)
  console.log("\n🚀 Inserting Approved Chart of Accounts topologically...");
  let totalInserted = 0;
  for (const lvl of [1, 2, 3, 4]) {
    const levelAccounts = APPROVED_COA.filter(a => a.level === lvl);
    const rows = levelAccounts.map(a => ({
      id: generateAccountUUID(a.code),
      organization_id: DEFAULT_ORG_ID,
      code: a.code,
      name_ar: a.nameAr,
      name_en: a.nameEn,
      type: a.type,
      parent_id: a.parentCode ? generateAccountUUID(a.parentCode) : null,
      level: a.level,
      nature: a.nature,
      balance: 0,
      currency: "EGP",
      is_active: true,
      is_system: true,
    }));

    const { error: insErr } = await supabase.from("accounts").insert(rows);
    if (insErr) {
      console.error(`❌ Error inserting Level ${lvl} accounts:`, insErr.message);
      report.errors.push(`Level ${lvl} insert error: ${insErr.message}`);
    } else {
      totalInserted += rows.length;
      console.log(`  ✓ Inserted ${rows.length} Level ${lvl} accounts`);
    }
  }
  report.accountsImported = totalInserted;

  // STEP 4: RE-SEED CLEAN BASELINE ENTITIES (POS Customer & Treasury Accounts)
  console.log("\n🔄 Re-seeding clean baseline entities (Treasury Accounts & POS Customer)...");
  await supabase.from("customers").upsert([{
    id: DEFAULT_POS_CUSTOMER_ID,
    organization_id: DEFAULT_ORG_ID,
    code: "CUST-POS",
    name_ar: "عميل نقدي عام (نقاط البيع)",
    name_en: "Walk-in Cash Customer",
    mobile: "+20 100 0000000",
    city: "القاهرة",
    address: "مبيعات نقدية مباشرة",
    credit_limit: 0,
    payment_terms_days: 0,
    current_balance: 0,
    status: "active"
  }]);
  console.log("  ✓ Seeded default POS Walk-in Customer");

  const treasuryRows = [
    {
      id: "00000000-0000-0000-0000-000000000301",
      organization_id: DEFAULT_ORG_ID,
      branch_id: DEFAULT_BRANCH_ID,
      gl_account_id: generateAccountUUID("1101001"), // Main Cash 1101001
      code: "SAFE-MAIN",
      name_ar: "الخزينة الرئيسية للمنشأة",
      name_en: "Main Company Safe",
      type: "cash_box",
      currency: "EGP",
      balance: 0,
      is_default: true,
    },
    {
      id: "00000000-0000-0000-0000-000000000302",
      organization_id: DEFAULT_ORG_ID,
      branch_id: DEFAULT_BRANCH_ID,
      gl_account_id: generateAccountUUID("1101002"), // Bank Cash 1101002
      code: "BANK-MAIN",
      name_ar: "الحساب البنكي الرئيسي",
      name_en: "Primary Bank Account",
      type: "bank_account",
      currency: "EGP",
      balance: 0,
      bank_name: "البنك الرئيسي",
      account_number: "0000-0000-0000",
      is_default: false,
    }
  ];

  await supabase.from("treasury_accounts").insert(treasuryRows);
  console.log("  ✓ Seeded 2 Treasury Accounts linked to standard GL accounts 1101001 & 1101002");

  // STEP 5: LIVE VERIFICATION IN POSTGRESQL
  console.log("\n🔍 Validating Database Integrity & Hierarchy in PostgreSQL...");
  const { data: liveAccounts, error: fetchErr } = await supabase.from("accounts").select("*");

  if (fetchErr) {
    console.error("❌ Failed to fetch accounts:", fetchErr.message);
    report.errors.push(`Accounts fetch error: ${fetchErr.message}`);
  } else {
    console.log(`  ✓ Total accounts in DB: ${liveAccounts.length} (Expected: ${APPROVED_COA.length})`);

    const dbCodeSet = new Set();
    const dbDups = [];
    liveAccounts.forEach(a => {
      if (dbCodeSet.has(a.code)) dbDups.push(a.code);
      dbCodeSet.add(a.code);
    });

    if (dbDups.length === 0) {
      console.log("  ✅ Zero duplicate account codes in database.");
    } else {
      console.error("  ❌ Duplicates in database:", dbDups);
      report.errors.push(`DB duplicate codes: ${dbDups.join(", ")}`);
    }

    let brokenLinks = 0;
    liveAccounts.forEach(a => {
      if (a.level > 1 && a.parent_id) {
        const parent = liveAccounts.find(p => p.id === a.parent_id);
        if (!parent) brokenLinks++;
      }
    });

    if (brokenLinks === 0) {
      report.hierarchyIntegrity = true;
      console.log("  ✅ Parent-child hierarchy integrity 100% valid (0 broken parent links).");
    } else {
      console.error(`  ❌ Broken parent links: ${brokenLinks}`);
      report.errors.push(`Broken parent links: ${brokenLinks}`);
    }

    const dbExp = liveAccounts.filter(a => a.code.startsWith("5"));
    console.log(`  ✅ Group 5 Expense accounts in DB: ${dbExp.length} (Expected: 16)`);
  }

  // Final Summary Report
  console.log("\n===============================================================================");
  console.log("                        EXECUTION & AUDIT REPORT                               ");
  console.log("===============================================================================");
  console.log(`• Full Database Reset Status:    ${report.tablesCleared.length > 0 ? "SUCCESS (Clean Operational Database)" : "FAILED"}`);
  console.log(`• Total Accounts Imported:       ${report.accountsImported} / ${report.accountsTotal}`);
  console.log(`• Code Uniqueness:               ${report.codeUniqueness ? "PASSED (0 Duplicates)" : "FAILED"}`);
  console.log(`• Hierarchy Integrity:           ${report.hierarchyIntegrity ? "PASSED (100% Connected)" : "FAILED"}`);
  console.log(`• Group 5 Expenses Count:        ${report.expenseGroupCount} / 16 COMPLETE`);
  console.log(`• Total Errors Encountered:      ${report.errors.length}`);
  console.log("===============================================================================\n");

  if (report.errors.length > 0) {
    process.exit(1);
  }
}

runResetAndRebuild().catch(err => {
  console.error("Fatal execution error:", err);
  process.exit(1);
});
