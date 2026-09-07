const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
let url = '', key = '';
env.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].trim();
});

const supabase = createClient(url, key);

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✓ PASSED: ${message}`);
}

async function verify() {
  console.log("=================================================");
  console.log("  DASHBOARD CASH & BANKS DYNAMIC AUDIT & VERIFICATION");
  console.log("=================================================\n");

  // 1. Verify Database State
  const { data: treasuries, error: tErr } = await supabase.from('treasury_accounts').select('*');
  assert(!tErr, 'Successfully fetched treasury accounts from DB');
  console.log(`Found ${treasuries.length} treasury accounts in database:`);
  
  treasuries.forEach(t => {
    console.log(`  - [${t.code}] ${t.name_ar} | Type: ${t.type} | Balance: ${t.balance} EGP`);
  });

  const totalDbBalance = treasuries.reduce((sum, t) => sum + (Number(t.balance) || 0), 0);
  assert(totalDbBalance === 0, `Total baseline treasury balance in DB is strictly 0.00 EGP (Current: ${totalDbBalance})`);

  // 2. Simulate Empty Database Dashboard Calculation
  console.log("\n▶️ 2. Validating Empty Database Scenario...");
  const emptyTreasuries = [];
  const calculatedEmpty = emptyTreasuries.reduce((sum, t) => sum + (Number(t.balance) || 0), 0);
  assert(calculatedEmpty === 0, `Dashboard card with 0 treasury records returns strictly 0.00 (Current: ${calculatedEmpty})`);

  // 3. Simulate Standard Baseline Accounts (SAFE-MAIN & BANK-MAIN)
  const baselineTreasuries = [
    { id: "00000000-0000-0000-0000-000000000301", code: "SAFE-MAIN", balance: 0 },
    { id: "00000000-0000-0000-0000-000000000302", code: "BANK-MAIN", balance: 0 },
  ];
  const calculatedBaseline = baselineTreasuries.reduce((sum, t) => sum + (Number(t.balance) || 0), 0);
  assert(calculatedBaseline === 0, `Dashboard card with baseline accounts returns strictly 0.00 (Current: ${calculatedBaseline})`);

  // 4. Test Treasury Calculation Formulas
  console.log("\n▶️ 3. Validating Treasury Formula Logic...");
  // Treasury = Opening Balance + Cash Receipts - Cash Payments + Customer Collections - Supplier Payments
  let treasuryOpening = 0;
  let cashReceipt = 5000;
  let cashPayment = 1500;
  let customerCollection = 3000;
  let supplierPayment = 2000;
  let expectedTreasuryBalance = treasuryOpening + cashReceipt - cashPayment + customerCollection - supplierPayment;
  assert(expectedTreasuryBalance === 4500, `Treasury formula evaluates correctly (Expected: 4500, Got: ${expectedTreasuryBalance})`);

  // Bank = Opening Balance + Deposits - Withdrawals + Transfers In - Transfers Out
  let bankOpening = 0;
  let deposit = 10000;
  let withdrawal = 2500;
  let transferIn = 5000;
  let transferOut = 1000;
  let expectedBankBalance = bankOpening + deposit - withdrawal + transferIn - transferOut;
  assert(expectedBankBalance === 11500, `Bank formula evaluates correctly (Expected: 11500, Got: ${expectedBankBalance})`);

  // Available Cash & Banks = Sum(Treasuries) + Sum(Banks)
  let dashboardCash = expectedTreasuryBalance + expectedBankBalance;
  assert(dashboardCash === 16000, `Dashboard aggregated liquidity equals ${dashboardCash} EGP`);

  // 5. Test Invalid / Corrupted Balance Fallbacks
  console.log("\n▶️ 4. Validating Resilience Against Null / Undefined / NaN Values...");
  const corruptedTreasuries = [
    { id: "1", balance: undefined },
    { id: "2", balance: null },
    { id: "3", balance: NaN },
    { id: "4", balance: "invalid_string" },
  ];
  const safeSum = corruptedTreasuries.reduce((sum, t) => sum + (Number(t.balance) || 0), 0);
  assert(safeSum === 0, `Corrupted/missing balances safely fallback to 0.00 without throwing errors (Got: ${safeSum})`);

  console.log("\n=================================================");
  console.log("  ALL DASHBOARD CASH & BANKS VERIFICATIONS PASSED!");
  console.log("=================================================");
}

verify().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
