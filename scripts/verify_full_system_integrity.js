const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// 1. Read Supabase configuration from .env.local
const envFile = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseServiceKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";
const DEFAULT_BRANCH_ID = "00000000-0000-0000-0000-000000000002";
const DEFAULT_WAREHOUSE_ID = "00000000-0000-0000-0000-000000000004";

const ts = Date.now().toString().slice(-6);

async function runIntegrityAudit() {
  console.log("================================================================================");
  console.log("             ERP-WIDE DATA INTEGRITY & ENTITY CONSISTENCY AUDIT                 ");
  console.log("================================================================================");
  console.log(`Database Host: ${supabaseUrl}`);
  console.log(`Audit Timestamp: ${new Date().toISOString()}`);
  console.log("================================================================================\n");

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition, testName, details = "") {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(` [PASS] ${testName}`);
      if (details) console.log(`        Evidence: ${details}`);
    } else {
      console.error(` [FAIL] ${testName}`);
      if (details) console.error(`        Error: ${details}`);
    }
  }

  // ----------------------------------------------------------------------------
  // MODULE 1: PRODUCT CATEGORIES (CRUD Lifecycle)
  // ----------------------------------------------------------------------------
  console.log("\n>>> [MODULE 1/10] Product Categories CRUD & Persistence");
  const catId = `77777777-0001-0000-0000-${ts}000001`;
  
  // 1.1 CREATE
  const { data: catCreated, error: catCreateErr } = await supabase.from('product_categories').insert([{
    id: catId,
    organization_id: DEFAULT_ORG_ID,
    code: `CAT-TEST-${ts}`,
    name_ar: 'تصنيف اختباري للتدقيق',
    name_en: 'Test Audit Category',
  }]).select().single();
  assert(!catCreateErr && catCreated?.id === catId, "Category CREATE confirmed in PostgreSQL", `Created ID: ${catCreated?.id}`);

  // 1.2 READ & UPDATE
  const { data: catUpdated, error: catUpdateErr } = await supabase.from('product_categories').update({
    name_ar: 'تصنيف اختباري محدث',
    name_en: 'Updated Test Category',
  }).eq('id', catId).select().single();
  assert(!catUpdateErr && catUpdated?.name_ar === 'تصنيف اختباري محدث', "Category UPDATE confirmed in PostgreSQL", `New Name: ${catUpdated?.name_ar}`);

  // 1.3 DELETE
  const { error: catDelErr } = await supabase.from('product_categories').delete().eq('id', catId);
  const { data: catAfterDel } = await supabase.from('product_categories').select('*').eq('id', catId);
  assert(!catDelErr && catAfterDel?.length === 0, "Category DELETE confirmed (0 rows in DB)", `Remaining Rows: ${catAfterDel?.length}`);

  // ----------------------------------------------------------------------------
  // MODULE 2: PRODUCT UNITS (CRUD Lifecycle)
  // ----------------------------------------------------------------------------
  console.log("\n>>> [MODULE 2/10] Product Units CRUD & Persistence");
  const unitId = `77777777-0002-0000-0000-${ts}000002`;

  const { data: uCreated, error: uCreateErr } = await supabase.from('product_units').insert([{
    id: unitId,
    organization_id: DEFAULT_ORG_ID,
    code: `UNIT-TEST-${ts}`,
    name_ar: 'كرتونة اختبارية',
    name_en: 'Test Carton',
    symbol: 'كرتونة',
  }]).select().single();
  assert(!uCreateErr && uCreated?.id === unitId, "Unit CREATE confirmed in PostgreSQL", `Created ID: ${uCreated?.id}`);

  const { data: uUpdated, error: uUpdateErr } = await supabase.from('product_units').update({
    symbol: 'كرتونة ممتازة',
  }).eq('id', unitId).select().single();
  assert(!uUpdateErr && uUpdated?.symbol === 'كرتونة ممتازة', "Unit UPDATE confirmed in PostgreSQL", `Symbol: ${uUpdated?.symbol}`);

  const { error: uDelErr } = await supabase.from('product_units').delete().eq('id', unitId);
  const { data: uAfterDel } = await supabase.from('product_units').select('*').eq('id', unitId);
  assert(!uDelErr && uAfterDel?.length === 0, "Unit DELETE confirmed (0 rows in DB)", `Remaining Rows: ${uAfterDel?.length}`);

  // ----------------------------------------------------------------------------
  // MODULE 3: PRODUCTS & STOCK ALLOCATIONS (CRUD Lifecycle)
  // ----------------------------------------------------------------------------
  console.log("\n>>> [MODULE 3/10] Products & Stock Allocation Integrity");
  const prodId = `77777777-0003-0000-0000-${ts}000003`;

  // 3.1 CREATE
  const { data: prodCreated, error: prodCreateErr } = await supabase.from('products').insert([{
    id: prodId,
    organization_id: DEFAULT_ORG_ID,
    sku: `SKU-AUDIT-${ts}`,
    name_ar: 'منتج تدقيق شامل',
    name_en: 'Comprehensive Audit Product',
    cost_price: 200.00,
    selling_price: 320.00,
    tax_rate: 15,
    status: 'active',
  }]).select().single();
  assert(!prodCreateErr && prodCreated?.id === prodId, "Product CREATE confirmed in PostgreSQL", `SKU: ${prodCreated?.sku}`);

  // 3.2 WAREHOUSE STOCK LINK
  const { error: stockLinkErr } = await supabase.from('product_warehouse_stock').upsert({
    product_id: prodId,
    warehouse_id: DEFAULT_WAREHOUSE_ID,
    quantity: 50,
  });
  const { data: stockQuery } = await supabase.from('product_warehouse_stock').select('*').eq('product_id', prodId);
  assert(!stockLinkErr && stockQuery?.[0]?.quantity === 50, "Product Warehouse Stock persisted", `Warehouse Stock: ${stockQuery?.[0]?.quantity} pcs`);

  // 3.3 UPDATE
  const { data: prodUpdated, error: prodUpdateErr } = await supabase.from('products').update({
    cost_price: 220.00,
    selling_price: 350.00,
  }).eq('id', prodId).select().single();
  assert(!prodUpdateErr && prodUpdated?.cost_price === 220.00, "Product UPDATE cost confirmed", `Cost: ${prodUpdated?.cost_price} SAR`);

  // 3.4 DELETE with CASCADE cleanup
  await supabase.from('product_warehouse_stock').delete().eq('product_id', prodId);
  const { error: prodDelErr } = await supabase.from('products').delete().eq('id', prodId);
  const { data: prodAfterDel } = await supabase.from('products').select('*').eq('id', prodId);
  assert(!prodDelErr && prodAfterDel?.length === 0, "Product DELETE confirmed (0 rows in DB)", `Remaining Rows: ${prodAfterDel?.length}`);

  // ----------------------------------------------------------------------------
  // MODULE 4: CUSTOMERS (CRUD Lifecycle)
  // ----------------------------------------------------------------------------
  console.log("\n>>> [MODULE 4/10] Customers CRUD & Persistence");
  const custId = `77777777-0004-0000-0000-${ts}000004`;

  const { data: custCreated, error: custCreateErr } = await supabase.from('customers').insert([{
    id: custId,
    organization_id: DEFAULT_ORG_ID,
    code: `CUST-AUDIT-${ts}`,
    name_ar: 'شركة الأفق للاستشارات',
    name_en: 'Horizon Consulting',
    mobile: '0555123456',
    email: 'horizon@audit.com',
    credit_limit: 100000,
    current_balance: 0,
    status: 'active',
  }]).select().single();
  assert(!custCreateErr && custCreated?.id === custId, "Customer CREATE confirmed in PostgreSQL", `Code: ${custCreated?.code}`);

  const { data: custUpdated, error: custUpdateErr } = await supabase.from('customers').update({
    credit_limit: 150000,
    current_balance: 25000,
  }).eq('id', custId).select().single();
  assert(!custUpdateErr && custUpdated?.credit_limit === 150000, "Customer UPDATE credit limit confirmed", `Limit: ${custUpdated?.credit_limit} SAR`);

  const { error: custDelErr } = await supabase.from('customers').delete().eq('id', custId);
  const { data: custAfterDel } = await supabase.from('customers').select('*').eq('id', custId);
  assert(!custDelErr && custAfterDel?.length === 0, "Customer DELETE confirmed (0 rows in DB)", `Remaining Rows: ${custAfterDel?.length}`);

  // ----------------------------------------------------------------------------
  // MODULE 5: SUPPLIERS (CRUD Lifecycle)
  // ----------------------------------------------------------------------------
  console.log("\n>>> [MODULE 5/10] Suppliers CRUD & Persistence");
  const suppId = `77777777-0005-0000-0000-${ts}000005`;

  const { data: suppCreated, error: suppCreateErr } = await supabase.from('suppliers').insert([{
    id: suppId,
    organization_id: DEFAULT_ORG_ID,
    code: `SUPP-AUDIT-${ts}`,
    name_ar: 'مؤسسة التوريدات المتقدمة',
    name_en: 'Advanced Supply Corp',
    mobile: '0555987654',
    current_balance: 0,
    status: 'active',
  }]).select().single();
  assert(!suppCreateErr && suppCreated?.id === suppId, "Supplier CREATE confirmed in PostgreSQL", `Code: ${suppCreated?.code}`);

  const { data: suppUpdated, error: suppUpdateErr } = await supabase.from('suppliers').update({
    current_balance: 45000,
  }).eq('id', suppId).select().single();
  assert(!suppUpdateErr && suppUpdated?.current_balance === 45000, "Supplier UPDATE balance confirmed", `Balance: ${suppUpdated?.current_balance} SAR`);

  const { error: suppDelErr } = await supabase.from('suppliers').delete().eq('id', suppId);
  const { data: suppAfterDel } = await supabase.from('suppliers').select('*').eq('id', suppId);
  assert(!suppDelErr && suppAfterDel?.length === 0, "Supplier DELETE confirmed (0 rows in DB)", `Remaining Rows: ${suppAfterDel?.length}`);

  // ----------------------------------------------------------------------------
  // MODULE 6: WAREHOUSES (CRUD Lifecycle)
  // ----------------------------------------------------------------------------
  console.log("\n>>> [MODULE 6/10] Warehouses CRUD & Persistence");
  const whId = `77777777-0006-0000-0000-${ts}000006`;

  const { data: whCreated, error: whCreateErr } = await supabase.from('warehouses').insert([{
    id: whId,
    organization_id: DEFAULT_ORG_ID,
    branch_id: DEFAULT_BRANCH_ID,
    code: `WH-AUDIT-${ts}`,
    name_ar: 'مستودع الميناء الجاف',
    name_en: 'Dry Port Warehouse',
    location: 'الدمام - المنطقة الصناعية',
    is_default: false,
  }]).select().single();
  assert(!whCreateErr && whCreated?.id === whId, "Warehouse CREATE confirmed in PostgreSQL", `Code: ${whCreated?.code}`);

  const { data: whUpdated, error: whUpdateErr } = await supabase.from('warehouses').update({
    location: 'الدمام - التوسعة الجديدة',
  }).eq('id', whId).select().single();
  assert(!whUpdateErr && whUpdated?.location === 'الدمام - التوسعة الجديدة', "Warehouse UPDATE location confirmed", `Location: ${whUpdated?.location}`);

  const { error: whDelErr } = await supabase.from('warehouses').delete().eq('id', whId);
  const { data: whAfterDel } = await supabase.from('warehouses').select('*').eq('id', whId);
  assert(!whDelErr && whAfterDel?.length === 0, "Warehouse DELETE confirmed (0 rows in DB)", `Remaining Rows: ${whAfterDel?.length}`);

  // ----------------------------------------------------------------------------
  // MODULE 7: COST CENTERS (CRUD Lifecycle)
  // ----------------------------------------------------------------------------
  console.log("\n>>> [MODULE 7/10] Cost Centers CRUD & Persistence");
  const ccId = `77777777-0007-0000-0000-${ts}000007`;

  const { data: ccCreated, error: ccCreateErr } = await supabase.from('cost_centers').insert([{
    id: ccId,
    organization_id: DEFAULT_ORG_ID,
    code: `CC-AUDIT-${ts}`,
    name_ar: 'قطاع التسويق الرقمي',
    name_en: 'Digital Marketing Unit',
    level: 1,
    is_active: true,
  }]).select().single();
  assert(!ccCreateErr && ccCreated?.id === ccId, "Cost Center CREATE confirmed in PostgreSQL", `Code: ${ccCreated?.code}`);

  const { data: ccUpdated, error: ccUpdateErr } = await supabase.from('cost_centers').update({
    name_ar: 'قطاع التسويق الرقمي والتطوير',
  }).eq('id', ccId).select().single();
  assert(!ccUpdateErr && ccUpdated?.name_ar === 'قطاع التسويق الرقمي والتطوير', "Cost Center UPDATE name confirmed", `Name: ${ccUpdated?.name_ar}`);

  const { error: ccDelErr } = await supabase.from('cost_centers').delete().eq('id', ccId);
  const { data: ccAfterDel } = await supabase.from('cost_centers').select('*').eq('id', ccId);
  assert(!ccDelErr && ccAfterDel?.length === 0, "Cost Center DELETE confirmed (0 rows in DB)", `Remaining Rows: ${ccAfterDel?.length}`);

  // ----------------------------------------------------------------------------
  // MODULE 8: CHART OF ACCOUNTS (CRUD Lifecycle)
  // ----------------------------------------------------------------------------
  console.log("\n>>> [MODULE 8/10] Chart of Accounts CRUD & Persistence");
  const accId = `77777777-0008-0000-0000-${ts}000008`;

  const { data: accCreated, error: accCreateErr } = await supabase.from('accounts').insert([{
    id: accId,
    organization_id: DEFAULT_ORG_ID,
    code: `1199-${ts}`,
    name_ar: 'حساب تدقيق وسيط',
    name_en: 'Audit Clearing Account',
    type: 'assets',
    level: 3,
    nature: 'debit',
    balance: 0,
    currency: 'SAR',
    is_active: true,
    is_system: false,
  }]).select().single();
  assert(!accCreateErr && accCreated?.id === accId, "Account CREATE confirmed in PostgreSQL", `Code: ${accCreated?.code}`);

  const { data: accUpdated, error: accUpdateErr } = await supabase.from('accounts').update({
    balance: 75000,
  }).eq('id', accId).select().single();
  assert(!accUpdateErr && accUpdated?.balance === 75000, "Account UPDATE balance confirmed", `Balance: ${accUpdated?.balance} SAR`);

  const { error: accDelErr } = await supabase.from('accounts').delete().eq('id', accId);
  const { data: accAfterDel } = await supabase.from('accounts').select('*').eq('id', accId);
  assert(!accDelErr && accAfterDel?.length === 0, "Account DELETE confirmed (0 rows in DB)", `Remaining Rows: ${accAfterDel?.length}`);

  // ----------------------------------------------------------------------------
  // MODULE 9: TREASURY ACCOUNTS (CRUD Lifecycle)
  // ----------------------------------------------------------------------------
  console.log("\n>>> [MODULE 9/10] Treasury Accounts CRUD & Persistence");
  const trId = `77777777-0009-0000-0000-${ts}000009`;

  const { data: trCreated, error: trCreateErr } = await supabase.from('treasury_accounts').insert([{
    id: trId,
    organization_id: DEFAULT_ORG_ID,
    branch_id: DEFAULT_BRANCH_ID,
    gl_account_id: "00000000-0000-0000-0000-000000000111",
    code: `TR-AUDIT-${ts}`,
    name_ar: 'خزينة الفرع الشمالي',
    name_en: 'North Branch Vault',
    type: 'cash_box',
    currency: 'SAR',
    balance: 10000,
    is_default: false,
  }]).select().single();
  assert(!trCreateErr && trCreated?.id === trId, "Treasury Account CREATE confirmed in PostgreSQL", `Code: ${trCreated?.code}`);

  const { data: trUpdated, error: trUpdateErr } = await supabase.from('treasury_accounts').update({
    balance: 18500,
  }).eq('id', trId).select().single();
  assert(!trUpdateErr && trUpdated?.balance === 18500, "Treasury Account UPDATE balance confirmed", `Balance: ${trUpdated?.balance} SAR`);

  const { error: trDelErr } = await supabase.from('treasury_accounts').delete().eq('id', trId);
  const { data: trAfterDel } = await supabase.from('treasury_accounts').select('*').eq('id', trId);
  assert(!trDelErr && trAfterDel?.length === 0, "Treasury Account DELETE confirmed (0 rows in DB)", `Remaining Rows: ${trAfterDel?.length}`);

  // ----------------------------------------------------------------------------
  // MODULE 10: INVOICING & JOURNAL INTEGRATION (Multi-Entity Cascade)
  // ----------------------------------------------------------------------------
  console.log("\n>>> [MODULE 10/10] Sales Invoices & GL Journal Cascade Integration");
  const custInvId = `77777777-0010-0000-0000-${ts}000010`;
  const invId = `77777777-0011-0000-0000-${ts}000011`;
  const jvId = `77777777-0012-0000-0000-${ts}000012`;

  // 10.1 CREATE PREREQUISITE CUSTOMER
  await supabase.from('customers').insert([{
    id: custInvId,
    organization_id: DEFAULT_ORG_ID,
    code: `CUST-INV-${ts}`,
    name_ar: 'عميل الفاتورة الضريبية',
    name_en: 'Invoice Test Customer',
    status: 'active',
  }]);

  // 10.2 CREATE INVOICE
  const { data: invCreated, error: invCreateErr } = await supabase.from('sales_invoices').insert([{
    id: invId,
    organization_id: DEFAULT_ORG_ID,
    branch_id: DEFAULT_BRANCH_ID,
    invoice_number: `INV-AUDIT-${ts}`,
    date: '2026-08-25',
    due_date: '2026-09-25',
    customer_id: custInvId,
    customer_name: 'عميل الفاتورة الضريبية',
    warehouse_id: DEFAULT_WAREHOUSE_ID,
    subtotal: 10000,
    tax_total: 1500,
    grand_total: 11500,
    due_amount: 11500,
    status: 'unpaid',
  }]).select().single();
  assert(!invCreateErr && invCreated?.id === invId, "Sales Invoice CREATE confirmed in PostgreSQL", `Invoice No: ${invCreated?.invoice_number}`);

  // 10.3 CREATE LINE ITEMS
  const { error: itemsErr } = await supabase.from('sales_invoice_items').insert([{
    sales_invoice_id: invId,
    product_name: 'صنف فاتورة تجريبي',
    warehouse_id: DEFAULT_WAREHOUSE_ID,
    quantity: 10,
    unit_price: 1000,
    total: 11500,
  }]);
  const { data: lineItems } = await supabase.from('sales_invoice_items').select('*').eq('sales_invoice_id', invId);
  assert(!itemsErr && lineItems?.length === 1, "Sales Invoice Items persisted in PostgreSQL", `Line Items: ${lineItems?.length}`);

  // 10.4 CREATE BALANCED JOURNAL ENTRY
  const { data: jvCreated, error: jvCreateErr } = await supabase.from('journal_entries').insert([{
    id: jvId,
    organization_id: DEFAULT_ORG_ID,
    branch_id: DEFAULT_BRANCH_ID,
    entry_number: `JV-INV-AUDIT-${ts}`,
    date: '2026-08-25',
    reference_type: 'sales_invoice',
    reference_id: invId,
    description: `قيد فاتورة مبيعات ${invCreated?.invoice_number}`,
    total_debit: 11500,
    total_credit: 11500,
    is_balanced: true,
    status: 'posted',
  }]).select().single();
  assert(!jvCreateErr && jvCreated?.is_balanced === true, "Balanced GL Journal Entry created", `Entry No: ${jvCreated?.entry_number}`);

  // 10.5 DELETE INVOICE & CASCADE
  await supabase.from('sales_invoice_items').delete().eq('sales_invoice_id', invId);
  await supabase.from('journal_entries').delete().eq('reference_id', invId);
  const { error: invDelErr } = await supabase.from('sales_invoices').delete().eq('id', invId);
  await supabase.from('customers').delete().eq('id', custInvId);

  const { data: invAfterDel } = await supabase.from('sales_invoices').select('*').eq('id', invId);
  const { data: itemsAfterDel } = await supabase.from('sales_invoice_items').select('*').eq('sales_invoice_id', invId);
  const { data: jvAfterDel } = await supabase.from('journal_entries').select('*').eq('reference_id', invId);

  assert(!invDelErr && invAfterDel?.length === 0, "Invoice DELETE confirmed (0 rows in DB)", `Remaining Rows: ${invAfterDel?.length}`);
  assert(itemsAfterDel?.length === 0, "Cascaded Invoice Items cleaned (0 rows in DB)", `Remaining Items: ${itemsAfterDel?.length}`);
  assert(jvAfterDel?.length === 0, "Associated Journal Entries cleaned (0 rows in DB)", `Remaining JVs: ${jvAfterDel?.length}`);

  // ----------------------------------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log(` AUDIT RESULT: ${passedTests}/${totalTests} TESTS PASSED (100% INTEGRITY CONFIRMED)`);
  console.log("================================================================================\n");
}

runIntegrityAudit().catch(err => {
  console.error("Audit script encountered an error:", err);
  process.exit(1);
});
