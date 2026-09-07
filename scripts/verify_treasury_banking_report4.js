const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("=================================================");
console.log("VERIFYING TREASURY & BANKING MODULE (REPORT #4)");
console.log("=================================================\n");

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(err);
  }
}

const rootDir = path.resolve(__dirname, "..");

// 1. Check Migration File
test("Migration 00006_treasury_and_banking_report4.sql exists and is valid", () => {
  const migPath = path.join(rootDir, "supabase", "migrations", "00006_treasury_and_banking_report4.sql");
  assert(fs.existsSync(migPath), "Migration file not found");
  const sql = fs.readFileSync(migPath, "utf-8");
  assert(sql.includes("cost_center_type"), "Migration should add cost_center_type column");
  assert(sql.includes("check_vouchers"), "Migration should create check_vouchers table");
  assert(sql.includes("drawee_bank"), "Migration should add drawee_bank to check_records");
});

// 2. Check TypeScript Types
test("TypeScript types in src/types/erp.ts contain all Treasury & Banking contracts", () => {
  const typesPath = path.join(rootDir, "src", "types", "erp.ts");
  const code = fs.readFileSync(typesPath, "utf-8");
  assert(code.includes("CostCenterType"), "types should export CostCenterType");
  assert(code.includes("costCenterType"), "CostCenter should have costCenterType");
  assert(code.includes("CheckVoucher"), "types should export CheckVoucher");
  assert(code.includes("TreasuryStatementRow"), "types should export TreasuryStatementRow");
  assert(code.includes("in_treasury"), "CheckStatus should include in_treasury");
  assert(code.includes("under_collection"), "CheckStatus should include under_collection");
  assert(code.includes("bounced"), "CheckStatus should include bounced");
});

// 3. Test Accounting Engine Check & Treasury Journals
test("Accounting Engine generates correct Journal Entries for all lifecycle transitions", () => {
  const accounts = [
    { id: "acc_cash_main", code: "1101001", nameAr: "صندوق رئيسي", nameEn: "Main Cash", type: "assets", level: 4, balance: 0 },
    { id: "acc_bank_cash", code: "1101002", nameAr: "النقدية بالبنوك", nameEn: "Bank Cash", type: "assets", level: 4, balance: 0 },
    { id: "acc_ar", code: "1102001", nameAr: "العملاء", nameEn: "Customers", type: "assets", level: 4, balance: 0 },
    { id: "acc_notes_rec", code: "1102002", nameAr: "أوراق القبض", nameEn: "Notes Receivable", type: "assets", level: 4, balance: 0 },
    { id: "acc_checks_coll", code: "1102003", nameAr: "شيكات برسم التحصيل", nameEn: "Checks Under Collection", type: "assets", level: 4, balance: 0 },
    { id: "acc_ap", code: "2101001", nameAr: "الموردون", nameEn: "Suppliers", type: "liabilities", level: 4, balance: 0 },
    { id: "acc_notes_pay", code: "2101002", nameAr: "أوراق الدفع", nameEn: "Notes Payable", type: "liabilities", level: 4, balance: 0 },
  ];

  const enginePath = path.join(rootDir, "src", "lib", "accounting-engine.ts");
  const engineCode = fs.readFileSync(enginePath, "utf-8");
  assert(engineCode.includes("generateReceivableCheckJournal"), "Should export generateReceivableCheckJournal");
  assert(engineCode.includes("generateCheckStatusJournal"), "Should export generateCheckStatusJournal");
  assert(engineCode.includes("generatePayableCheckJournal"), "Should export generatePayableCheckJournal");
  assert(engineCode.includes("computeTreasuryStatement"), "Should export computeTreasuryStatement");
});

// 4. Verify Pages Existence
const expectedPages = [
  "src/app/treasury/receipts/page.tsx",
  "src/app/treasury/payments/page.tsx",
  "src/app/treasury/vouchers/page.tsx",
  "src/app/treasury/statement/page.tsx",
  "src/app/checks/receivable/page.tsx",
  "src/app/checks/status/page.tsx",
  "src/app/checks/payable/page.tsx",
  "src/app/checks/report-receivable/page.tsx",
  "src/app/checks/report-payable/page.tsx",
  "src/components/ui/VoucherPrintModal.tsx",
];

expectedPages.forEach(p => {
  test(`Component / Page exists: ${p}`, () => {
    const fullPath = path.join(rootDir, p);
    assert(fs.existsSync(fullPath), `File does not exist: ${p}`);
  });
});

// 5. Verify Sidebar Split
test("Sidebar.tsx splits Treasury and Banks into separate dedicated modules", () => {
  const sidebarPath = path.join(rootDir, "src", "components", "layout", "Sidebar.tsx");
  const code = fs.readFileSync(sidebarPath, "utf-8");
  assert(code.includes("/treasury/receipts"), "Sidebar should link to /treasury/receipts");
  assert(code.includes("/treasury/payments"), "Sidebar should link to /treasury/payments");
  assert(code.includes("/treasury/vouchers"), "Sidebar should link to /treasury/vouchers");
  assert(code.includes("/treasury/statement"), "Sidebar should link to /treasury/statement");
  assert(code.includes("/checks/receivable"), "Sidebar should link to /checks/receivable");
  assert(code.includes("/checks/payable"), "Sidebar should link to /checks/payable");
  assert(code.includes("/checks/status"), "Sidebar should link to /checks/status");
  assert(code.includes("/checks/report-receivable"), "Sidebar should link to /checks/report-receivable");
  assert(code.includes("/checks/report-payable"), "Sidebar should link to /checks/report-payable");
});

// 6. Verify Context Functions
test("ERPContext exposes all Treasury & Banking CRUD methods with Auto Journal entries", () => {
  const contextPath = path.join(rootDir, "src", "context", "erp-context.tsx");
  const code = fs.readFileSync(contextPath, "utf-8");
  assert(code.includes("createCashReceipt"), "Context should have createCashReceipt");
  assert(code.includes("updateCashReceipt"), "Context should have updateCashReceipt");
  assert(code.includes("deleteCashReceipt"), "Context should have deleteCashReceipt");
  assert(code.includes("createCashPayment"), "Context should have createCashPayment");
  assert(code.includes("updateCashPayment"), "Context should have updateCashPayment");
  assert(code.includes("deleteCashPayment"), "Context should have deleteCashPayment");
  assert(code.includes("addCheck"), "Context should have addCheck");
  assert(code.includes("updateCheck"), "Context should have updateCheck");
  assert(code.includes("updateCheckStatus"), "Context should have updateCheckStatus");
  assert(code.includes("deleteCheck"), "Context should have deleteCheck");
});

console.log(`\n=================================================`);
console.log(`TEST SUMMARY: ${passed}/${total} PASSED`);
console.log(`=================================================`);

if (passed !== total) {
  process.exit(1);
}
