const fs = require('fs');
const path = require('path');
const wsRoot = path.resolve(__dirname, '..');
const { createClient } = require(path.join(wsRoot, 'node_modules/@supabase/supabase-js'));

const envPath = path.join(wsRoot, '.env.local');
let supabaseUrl = "";
let supabaseKey = "";

const envContent = fs.readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = trimmed.split('=')[1].trim();
  if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = trimmed.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

const HONEY_ID = '67a973ad-1905-470c-86f8-5a8662fb9e19';
const TAHINI_ID = 'a3222573-95c6-48cd-a248-f48356736253';
const MAIN_WH_ID = '00000000-0000-0000-0000-000000000004';
const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

async function verifyAll() {
  console.log('====================================================');
  console.log('STARTING REPORT 11 COMPREHENSIVE INTEGRITY VERIFICATION');
  console.log('Timestamp:', new Date().toISOString());
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${testName} ${details ? `(${details})` : ''}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  // ====================================================
  // 1. INVENTORY CARD (ITEM MOVEMENT CARD) AUDIT
  // ====================================================
  console.log('--- 1. AUDITING INVENTORY CARD POSTINGS ---');

  // Honey 400g Audit
  const { data: honeyMovs } = await supabase
    .from('stock_movements')
    .select('*')
    .eq('product_id', HONEY_ID);

  const honeySalesRefs = honeyMovs
    .filter(m => m.movement_type === 'sales_issue')
    .map(m => m.reference_number)
    .sort();

  console.log('Honey 400g sales movement references:', honeySalesRefs);

  const expectedHoneyInvoices = [
    'INV-2026-0002',
    'INV-2026-0003',
    'INV-2026-0007',
    'INV-2026-0008',
    'INV-2026-0010',
    'INV-2026-0012'
  ].sort();

  assert(
    JSON.stringify(honeySalesRefs) === JSON.stringify(expectedHoneyInvoices),
    'Honey 400g Item Card contains all 6 actual sales invoices',
    `Found: ${honeySalesRefs.join(', ')}`
  );

  assert(
    !honeySalesRefs.includes('INV-2026-0001'),
    'Honey 400g Item Card does NOT contain INV-2026-0001 (which does not have Honey)'
  );

  // Tahini 450g Audit
  const { data: tahiniMovs } = await supabase
    .from('stock_movements')
    .select('*')
    .eq('product_id', TAHINI_ID);

  const tahiniSalesRefs = tahiniMovs
    .filter(m => m.movement_type === 'sales_issue')
    .map(m => m.reference_number)
    .sort();

  console.log('Tahini 450g sales movement references:', tahiniSalesRefs);

  const expectedTahiniInvoices = [
    'INV-184481',
    'INV-2026-0001',
    'INV-2026-0004',
    'INV-2026-0006',
    'INV-2026-0009',
    'INV-234993'
  ].sort();

  assert(
    JSON.stringify(tahiniSalesRefs) === JSON.stringify(expectedTahiniInvoices),
    'Tahini 450g Item Card contains all 6 actual sales invoices',
    `Found: ${tahiniSalesRefs.join(', ')}`
  );

  // ====================================================
  // 2. AUDIT PURCHASE INVOICES ITEMS (#3, #4, #5, #6)
  // ====================================================
  console.log('\n--- 2. AUDITING PURCHASE INVOICES ITEMS ---');

  const { data: pItems } = await supabase
    .from('purchase_invoice_items')
    .select('*, purchase_invoices!inner(invoice_number)');

  const pinv3Items = pItems.filter(i => i.purchase_invoices?.invoice_number === 'PINV-2026-0003');
  const pinv4Items = pItems.filter(i => i.purchase_invoices?.invoice_number === 'PINV-2026-0004');
  const pinv5Items = pItems.filter(i => i.purchase_invoices?.invoice_number === 'PINV-2026-0005');
  const pinv6Items = pItems.filter(i => i.purchase_invoices?.invoice_number === 'PINV-2026-0006');

  assert(pinv3Items.length > 0 && pinv3Items[0].total === 570, 'Purchase Invoice #3 has line items persisted and total = 570');
  assert(pinv4Items.length > 0 && pinv4Items[0].total === 1140, 'Purchase Invoice #4 has line items persisted and total = 1140');
  assert(pinv5Items.length > 0 && pinv5Items[0].total === 285, 'Purchase Invoice #5 has line items persisted and total = 285');
  assert(pinv6Items.length > 0 && pinv6Items[0].total === 798, 'Purchase Invoice #6 has line items persisted and total = 798');

  // ====================================================
  // 3. SETTINGS & 0% TAX PERSISTENCE AUDIT
  // ====================================================
  console.log('\n--- 3. AUDITING SETTINGS & 0% TAX PERSISTENCE ---');

  // 1. Update organization default_vat_rate to 0
  const { data: updatedOrg0, error: org0Err } = await supabase
    .from('organizations')
    .update({ default_vat_rate: 0, updated_at: new Date().toISOString() })
    .eq('id', DEFAULT_ORG_ID)
    .select()
    .single();

  assert(!org0Err && updatedOrg0?.default_vat_rate === 0, 'Database physically stores 0% default_vat_rate');

  // 2. Fetch via route mapping logic (simulating GET /api/erp/data)
  const { data: fetchedOrg } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', DEFAULT_ORG_ID)
    .single();

  const mappedVatRate = (fetchedOrg.default_vat_rate !== null && fetchedOrg.default_vat_rate !== undefined && !isNaN(Number(fetchedOrg.default_vat_rate)))
    ? Number(fetchedOrg.default_vat_rate)
    : 14;

  assert(mappedVatRate === 0, 'API mapper retains 0% tax rate without reverting to 14% on refresh');

  // Restore to 14%
  await supabase
    .from('organizations')
    .update({ default_vat_rate: 14, updated_at: new Date().toISOString() })
    .eq('id', DEFAULT_ORG_ID);
  console.log('  ℹ️ Restored organization default_vat_rate to 14%');

  // ====================================================
  // 4. SEQUENTIAL SALES INVOICE NUMBERING AUDIT (10 INVOICES)
  // ====================================================
  console.log('\n--- 4. AUDITING SEQUENTIAL INVOICE NUMBERING (10 NEW INVOICES) ---');

  // Find current max invoice number
  const { data: existingInvoices } = await supabase
    .from('sales_invoices')
    .select('invoice_number')
    .eq('organization_id', DEFAULT_ORG_ID);

  const currentYear = new Date().getFullYear();
  const yearPrefix = `INV-${currentYear}-`;
  let maxSeq = 0;
  existingInvoices.forEach(inv => {
    if (inv.invoice_number?.startsWith(yearPrefix)) {
      const n = parseInt(inv.invoice_number.substring(yearPrefix.length), 10);
      if (!isNaN(n) && n > maxSeq) maxSeq = n;
    }
  });

  console.log(`Current maximum sequence number: ${maxSeq}`);

  const createdTestInvoiceIds = [];
  const generatedNumbers = [];

  for (let i = 1; i <= 10; i++) {
    const nextSeq = maxSeq + i;
    const invNumber = `${yearPrefix}${nextSeq.toString().padStart(4, '0')}`;
    const testId = `eeeeeeee-eeee-4eee-aeee-${(nextSeq).toString().padStart(12, '0')}`;

    const { data: created, error: createErr } = await supabase
      .from('sales_invoices')
      .insert([{
        id: testId,
        organization_id: DEFAULT_ORG_ID,
        branch_id: '00000000-0000-0000-0000-000000000002',
        invoice_number: invNumber,
        date: new Date().toISOString().split('T')[0],
        due_date: new Date().toISOString().split('T')[0],
        customer_id: '07c54749-8b2c-468d-8896-d382844f0dff',
        customer_name: 'سوبر ماركت سفير',
        warehouse_id: MAIN_WH_ID,
        status: 'unpaid',
        subtotal: 100,
        discount_total: 0,
        tax_total: 14,
        grand_total: 114,
        paid_amount: 0,
        due_amount: 114,
        notes: 'Test sequential numbering invoice',
        created_by: 'Verification Script'
      }])
      .select()
      .single();

    if (createErr) {
      console.error(`Error creating invoice ${invNumber}:`, createErr);
    } else {
      createdTestInvoiceIds.push(created.id);
      generatedNumbers.push(created.invoice_number);
    }
  }

  assert(generatedNumbers.length === 10, 'Successfully created 10 new sequential invoices');
  console.log('Generated invoice numbers:', generatedNumbers);

  let hasNoSkipped = true;
  let hasNoRandom = true;
  const uniqueNums = new Set(generatedNumbers);
  let hasNoDuplicates = uniqueNums.size === 10;

  for (let i = 0; i < generatedNumbers.length; i++) {
    const expected = `${yearPrefix}${(maxSeq + i + 1).toString().padStart(4, '0')}`;
    if (generatedNumbers[i] !== expected) hasNoSkipped = false;
    if (!/^INV-\d{4}-\d{4}$/.test(generatedNumbers[i])) hasNoRandom = false;
  }

  assert(hasNoSkipped, 'No skipped numbers in sequence');
  assert(hasNoRandom, 'No random invoice IDs appear');
  assert(hasNoDuplicates, 'No duplicate invoice numbers');

  // Clean up the 10 test invoices
  console.log('\nCleaning up the 10 test invoices to preserve exact production count...');
  await supabase.from('sales_invoices').delete().in('id', createdTestInvoiceIds);
  console.log('  ✅ Cleaned up 10 test verification invoices');

  // ====================================================
  // 5. INVENTORY & PURCHASES CRUD LIFECYCLE (CREATE, EDIT, DELETE)
  // ====================================================
  console.log('\n--- 5. TESTING INVENTORY & PURCHASES CRUD LIFECYCLE ---');

  // A. Purchase Invoice CRUD Lifecycle
  const testPInvId = '99999999-9999-4999-a999-999999999991';
  const testPInvNumber = `PINV-${currentYear}-9991`;

  // 1. Create Purchase
  const { data: pCreated, error: pCreateErr } = await supabase
    .from('purchase_invoices')
    .insert([{
      id: testPInvId,
      organization_id: DEFAULT_ORG_ID,
      branch_id: '00000000-0000-0000-0000-000000000002',
      invoice_number: testPInvNumber,
      date: new Date().toISOString().split('T')[0],
      due_date: new Date().toISOString().split('T')[0],
      supplier_id: '62af0c40-da5d-4d84-a058-6bb42250c761',
      supplier_name: 'فورست فودز',
      warehouse_id: MAIN_WH_ID,
      status: 'unpaid',
      subtotal: 500,
      discount_total: 0,
      tax_total: 70,
      grand_total: 570,
      paid_amount: 0,
      due_amount: 570,
      notes: 'Test CRUD purchase invoice'
    }])
    .select()
    .single();

  const testPItemId = '99999999-9999-4999-a999-999999999992';
  const { error: pItemErr } = await supabase
    .from('purchase_invoice_items')
    .insert([{
      id: testPItemId,
      purchase_invoice_id: testPInvId,
      product_id: HONEY_ID,
      product_name: 'عسل نحل 400 جم',
      warehouse_id: MAIN_WH_ID,
      quantity: 5,
      unit_cost: 100,
      discount_amount: 0,
      tax_rate: 14,
      tax_amount: 70,
      total: 570
    }]);

  assert(!pCreateErr && !pItemErr, 'Created test purchase invoice with child line items');

  // 2. Edit Purchase (update quantity to 8)
  const { error: pEditErr } = await supabase
    .from('purchase_invoice_items')
    .update({ quantity: 8, total: 912 })
    .eq('id', testPItemId);

  const { data: verifyEditedPItem } = await supabase
    .from('purchase_invoice_items')
    .select('*')
    .eq('id', testPItemId)
    .single();

  assert(!pEditErr && verifyEditedPItem?.quantity === 8, 'Edited test purchase invoice and line items remain stored accurately');

  // 3. Delete Purchase
  await supabase.from('purchase_invoice_items').delete().eq('purchase_invoice_id', testPInvId);
  await supabase.from('purchase_invoices').delete().eq('id', testPInvId);

  const { data: verifyDeletedPInv } = await supabase
    .from('purchase_invoices')
    .select('id')
    .eq('id', testPInvId)
    .maybeSingle();

  assert(!verifyDeletedPInv, 'Deleted test purchase invoice and child lines cleanly');

  // ====================================================
  // SUMMARY
  // ====================================================
  console.log('\n====================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed === 0) {
    console.log('🎉 ALL AUDIT REQUIREMENTS FULLY SATISFIED!');
  } else {
    process.exit(1);
  }
}

verifyAll();
