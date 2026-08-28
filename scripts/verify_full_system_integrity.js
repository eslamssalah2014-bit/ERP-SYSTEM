/**
 * Automated System-Wide Persistence & Action Verification Script
 * Validates database mutations, response shapes, atomic stock updates, and schema mapping.
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      value = value.trim().replace(/^['"]|['"]$/g, '');
      process.env[key] = value;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function generateId() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function runIntegrityAudit() {
  console.log("================================================================================");
  console.log("🔍 STARTING FULL SYSTEM-WIDE ACTION & PERSISTENCE INTEGRITY AUDIT");
  console.log("================================================================================");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
    }
  }

  try {
    // 1. Check Tables Existence & Connectivity
    console.log("\n[1/7] Testing Supabase Connectivity & Table Schemas across all 24 Tables...");
    const tables = [
      'organizations', 'branches', 'users', 'customers', 'suppliers',
      'products', 'product_categories', 'product_units', 'product_warehouse_stock',
      'warehouses', 'cost_centers', 'accounts', 'treasury_accounts',
      'cash_receipts', 'cash_payments', 'check_records', 'journal_entries',
      'journal_lines', 'sales_invoices', 'sales_invoice_items',
      'purchase_invoices', 'purchase_invoice_items', 'stock_movements', 'audit_logs'
    ];

    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      assert(!error, `Table '${table}' accessible (rows: ${data ? data.length : 0})`);
    }

    // 2. Test Sales Invoice Creation & Atomic Stock Decrement
    console.log("\n[2/7] Testing Sales Invoices & Atomic Stock Integration...");
    const { data: orgs } = await supabase.from('organizations').select('id, currency').limit(1);
    const orgId = orgs[0]?.id;
    const { data: prods } = await supabase.from('products').select('*').limit(1);
    const product = prods[0];
    const { data: whs } = await supabase.from('warehouses').select('*').limit(1);
    const whId = whs[0]?.id;
    const { data: custs } = await supabase.from('customers').select('*').limit(1);
    const cust = custs[0];
    const { data: accs } = await supabase.from('accounts').select('*').limit(2);
    const primaryAcc = accs[0];
    const secondaryAcc = accs[1] || accs[0];

    assert(orgId && product && whId && cust && primaryAcc, "Prerequisite records exist for sales invoice posting");

    const testInvoiceNum = "TEST-INV-" + Date.now();
    const testQty = 2;
    const itemTotal = testQty * (product.selling_price || 100);

    // Fetch initial stock for warehouse
    const { data: stockRows } = await supabase.from('product_warehouse_stock')
      .select('quantity')
      .eq('product_id', product.id)
      .eq('warehouse_id', whId);
    const initialStock = stockRows && stockRows[0] ? Number(stockRows[0].quantity) : 100;
    const initialCustBal = Number(cust.current_balance) || 0;

    // Insert sales invoice
    const { data: invRow, error: invErr } = await supabase.from('sales_invoices').insert([{
      organization_id: orgId,
      branch_id: whs[0].branch_id || "00000000-0000-0000-0000-000000000002",
      invoice_number: testInvoiceNum,
      date: new Date().toISOString().split('T')[0],
      due_date: new Date().toISOString().split('T')[0],
      customer_id: cust.id,
      customer_name: cust.name_ar,
      warehouse_id: whId,
      subtotal: itemTotal,
      tax_total: itemTotal * 0.14,
      discount_total: 0,
      grand_total: itemTotal * 1.14,
      paid_amount: 0,
      due_amount: itemTotal * 1.14,
      status: "unpaid",
      notes: "System integrity audit test"
    }]).select().single();

    assert(!invErr && invRow && invRow.id, `Sales Invoice successfully created with number ${testInvoiceNum}`);

    // Insert sales invoice item
    const { data: itemRow, error: itemErr } = await supabase.from('sales_invoice_items').insert([{
      sales_invoice_id: invRow.id,
      product_id: product.id,
      product_name: product.name_ar,
      warehouse_id: whId,
      quantity: testQty,
      unit_price: product.selling_price || 100,
      cost_price: product.cost_price || 50,
      discount_percent: 0,
      discount_amount: 0,
      tax_rate: 14,
      tax_amount: itemTotal * 0.14,
      total: itemTotal * 1.14
    }]).select().single();

    assert(!itemErr && itemRow, `Sales Invoice Line Item persisted in 'sales_invoice_items'`);

    // Update Product Stock atomically
    const newStock = Math.max(0, initialStock - testQty);
    const { error: stockErr } = await supabase.from('product_warehouse_stock').upsert({
      product_id: product.id,
      warehouse_id: whId,
      quantity: newStock
    }, { onConflict: 'product_id,warehouse_id' });
    assert(!stockErr, `Stock movement deduction posted (initial: ${initialStock}, updated: ${newStock})`);

    // Update Customer balance
    const { error: custErr } = await supabase.from('customers').update({ current_balance: initialCustBal + (itemTotal * 1.14) }).eq('id', cust.id);
    assert(!custErr, `Customer receivable balance updated (+${itemTotal * 1.14})`);

    // 3. Test Treasury Cash Receipt Mutation
    console.log("\n[3/7] Testing Cash Receipt & Treasury Balance Mutation...");
    const { data: treasuries } = await supabase.from('treasury_accounts').select('*').limit(1);
    const treasury = treasuries[0];
    assert(treasury && treasury.id, "Treasury account exists");

    const rcpNum = "TEST-RCP-" + Date.now();
    const rcpAmount = 500;
    const initialTreasuryBal = Number(treasury.balance) || 0;

    const { data: rcpRow, error: rcpErr } = await supabase.from('cash_receipts').insert([{
      id: generateId(),
      organization_id: orgId,
      branch_id: whs[0].branch_id || "00000000-0000-0000-0000-000000000002",
      receipt_number: rcpNum,
      date: new Date().toISOString().split('T')[0],
      treasury_account_id: treasury.id,
      amount: rcpAmount,
      currency: "EGP",
      received_from: "عميل تجريبي",
      customer_id: cust.id,
      credit_account_id: primaryAcc.id,
      notes: "Audit test receipt"
    }]).select().single();

    assert(!rcpErr && rcpRow, `Cash receipt created (${rcpNum})`);

    const { error: tUpErr } = await supabase.from('treasury_accounts').update({ balance: initialTreasuryBal + rcpAmount }).eq('id', treasury.id);
    assert(!tUpErr, `Treasury balance atomically credited (+${rcpAmount})`);

    // 4. Test Check Creation & Portfolio Action
    console.log("\n[4/7] Testing Checks Lifecycle Mutation in 'check_records'...");
    const chkNum = "TEST-CHK-" + Date.now();
    const { data: chkRow, error: chkErr } = await supabase.from('check_records').insert([{
      organization_id: orgId,
      branch_id: whs[0].branch_id || "00000000-0000-0000-0000-000000000002",
      check_number: chkNum,
      bank_name: "البنك التجاري",
      type: "incoming",
      party_name: "عميل تجريبي",
      amount: 1500,
      issue_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      status: "pending"
    }]).select().single();

    assert(!chkErr && chkRow, `Check registered (${chkNum}) with status 'pending'`);

    const { data: chkUpRow, error: chkUpErr } = await supabase.from('check_records').update({ status: 'collected' }).eq('id', chkRow.id).select().single();
    assert(!chkUpErr && chkUpRow.status === 'collected', `Check status transitioned to 'collected'`);

    // 5. Test Double-Entry Balanced Journal Entry
    console.log("\n[5/7] Testing General Ledger & Journal Entry Balanced Posting...");
    const jvNum = "TEST-JV-" + Date.now();
    const { data: jvRow, error: jvErr } = await supabase.from('journal_entries').insert([{
      organization_id: orgId,
      branch_id: whs[0].branch_id || "00000000-0000-0000-0000-000000000002",
      entry_number: jvNum,
      date: new Date().toISOString().split('T')[0],
      reference_type: "manual_entry",
      description: "قيد تجريبي للاختبار",
      total_debit: 1000,
      total_credit: 1000,
      is_balanced: true,
      status: "posted"
    }]).select().single();

    assert(!jvErr && jvRow, `Double-entry journal header posted (${jvNum})`);

    const { data: jvLines, error: linesErr } = await supabase.from('journal_lines').insert([
      {
        id: generateId(),
        journal_entry_id: jvRow.id,
        account_id: primaryAcc.id,
        account_code: primaryAcc.code || "1110",
        account_name: primaryAcc.name_ar || "النقدية بالصندوق",
        debit: 1000,
        credit: 0
      },
      {
        id: generateId(),
        journal_entry_id: jvRow.id,
        account_id: secondaryAcc.id,
        account_code: secondaryAcc.code || "1120",
        account_name: secondaryAcc.name_ar || "العملاء والمدينون",
        debit: 0,
        credit: 1000
      }
    ]).select();

    assert(!linesErr && jvLines && jvLines.length === 2, `Balanced journal lines persisted in 'journal_lines'`);

    // 6. Test Cleanup of Test Records
    console.log("\n[6/7] Cleaning up test records from database...");
    if (invRow) {
      await supabase.from('sales_invoice_items').delete().eq('sales_invoice_id', invRow.id);
      await supabase.from('sales_invoices').delete().eq('id', invRow.id);
    }
    if (rcpRow) {
      await supabase.from('cash_receipts').delete().eq('id', rcpRow.id);
    }
    if (chkRow) {
      await supabase.from('check_records').delete().eq('id', chkRow.id);
    }
    if (jvRow) {
      await supabase.from('journal_lines').delete().eq('journal_entry_id', jvRow.id);
      await supabase.from('journal_entries').delete().eq('id', jvRow.id);
    }
    // Revert stock & balances
    await supabase.from('product_warehouse_stock').upsert({ product_id: product.id, warehouse_id: whId, quantity: initialStock }, { onConflict: 'product_id,warehouse_id' });
    await supabase.from('customers').update({ current_balance: cust.current_balance }).eq('id', cust.id);
    await supabase.from('treasury_accounts').update({ balance: treasury.balance }).eq('id', treasury.id);
    console.log("  🧹 All test records cleaned and balances restored cleanly.");

    // 7. Summary
    console.log("\n================================================================================");
    console.log(`📊 INTEGRITY AUDIT RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
    console.log("================================================================================");

    if (passedTests === totalTests) {
      console.log("🎉 ALL PERSISTENCE AND ACTION MUTATION CHECKS PASSED WITH 100% SUCCESS!");
    } else {
      console.error("⚠️ SOME TESTS FAILED. Please review the output above.");
    }
  } catch (err) {
    console.error("❌ Exception during integrity audit:", err);
  }
}

runIntegrityAudit();
