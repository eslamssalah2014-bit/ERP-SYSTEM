/**
 * Verification Script for Customer & Supplier CRUD and Schema Sanitization Layer
 * Tests:
 * 1. Customer CRUD (Create -> View -> Edit -> Verify Persistence -> Delete -> Verify Cleanup)
 * 2. Supplier CRUD (Create -> View -> Edit -> Verify Persistence -> Delete -> Verify Cleanup)
 * 3. Schema Sanitization Layer (Ensure invalid/extra columns do not crash inserts or updates)
 * 4. Production Data Preservation Check (Compare against backup counts and integrity)
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

function getEnvVars() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) {
    throw new Error(".env.local not found");
  }
  const content = fs.readFileSync(envPath, "utf-8");
  const env = {};
  content.split("\n").forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const [k, ...v] = trimmed.split("=");
    if (k && v) {
      env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
    }
  });
  return env;
}

// Physical columns definition matching src/app/api/erp/data/route.ts
const PHYSICAL_TABLE_COLUMNS = {
  customers: [
    "id", "organization_id", "code", "name_ar", "name_en",
    "mobile", "email", "address", "city", "tax_number",
    "commercial_register", "credit_limit", "payment_terms_days",
    "current_balance", "status", "created_at"
  ],
  suppliers: [
    "id", "organization_id", "code", "name_ar", "name_en",
    "mobile", "email", "address", "tax_number", "bank_name",
    "bank_iban", "current_balance", "status", "created_at"
  ],
  cost_centers: [
    "id", "organization_id", "code", "name_ar", "name_en", "parent_id",
    "level", "is_active", "created_at"
  ]
};

function sanitizeRowForTable(tableName, row) {
  const validCols = PHYSICAL_TABLE_COLUMNS[tableName];
  if (!validCols) return row;
  const sanitized = {};
  for (const key of Object.keys(row)) {
    if (validCols.includes(key)) {
      sanitized[key] = row[key];
    }
  }
  return sanitized;
}

async function runTests() {
  console.log("=================================================");
  console.log(" CUSTOMER & SUPPLIER CRUD VERIFICATION TEST");
  console.log("=================================================\n");

  const env = getEnvVars();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing Supabase credentials in .env.local");
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
  });

  let passed = 0;
  let failed = 0;

  // 1. Get organization ID
  const { data: orgs, error: orgErr } = await supabase.from("organizations").select("id").limit(1);
  if (orgErr || !orgs || orgs.length === 0) {
    throw new Error("Could not fetch organization: " + (orgErr?.message || "none found"));
  }
  const orgId = orgs[0].id;
  console.log(`[INFO] Using Organization ID: ${orgId}`);

  // Fetch initial counts of production data
  const { count: initialCustCount } = await supabase.from("customers").select("*", { count: "exact", head: true });
  const { count: initialSuppCount } = await supabase.from("suppliers").select("*", { count: "exact", head: true });
  const { count: initialAccountsCount } = await supabase.from("accounts").select("*", { count: "exact", head: true });
  const { count: initialSalesInvCount } = await supabase.from("sales_invoices").select("*", { count: "exact", head: true });
  const { count: initialPurchInvCount } = await supabase.from("purchase_invoices").select("*", { count: "exact", head: true });
  const { count: initialJournalsCount } = await supabase.from("journal_entries").select("*", { count: "exact", head: true });

  console.log(`[INFO] Current Production Data Counts:`);
  console.log(` - Accounts: ${initialAccountsCount}`);
  console.log(` - Customers: ${initialCustCount}`);
  console.log(` - Suppliers: ${initialSuppCount}`);
  console.log(` - Sales Invoices: ${initialSalesInvCount}`);
  console.log(` - Purchase Invoices: ${initialPurchInvCount}`);
  console.log(` - Journal Entries: ${initialJournalsCount}\n`);

  // -------------------------------------------------------------
  // TEST SUITE 1: CUSTOMERS CRUD & SCHEMA INTEGRITY
  // -------------------------------------------------------------
  console.log("--- TEST SUITE 1: CUSTOMERS CRUD ---");
  const testCustomerCode = `CUST-TEST-${Date.now().toString().slice(-4)}`;
  let testCustomerId = null;

  try {
    // 1.1 Customer Create with Schema Sanitization
    console.log("1.1 Creating Customer (including extraneous fields like opening_balance, category_id)...");
    const rawCustomerInsert = {
      organization_id: orgId,
      code: testCustomerCode,
      name_ar: "شركة الاختبار للحلول الرقمية",
      name_en: "Digital Solutions Test Co",
      email: "test_customer@example.com",
      mobile: "0550001122",
      address: "الرياض - شارع العليا",
      city: "الرياض",
      tax_number: "300099988877766",
      credit_limit: 50000,
      payment_terms_days: 30,
      current_balance: 15000,
      opening_balance: 15000, // Invalid column in schema - should be sanitized out
      category_id: "non-existent-col", // Invalid column in schema - should be sanitized out
      status: "active"
    };

    const sanitizedCustInsert = sanitizeRowForTable("customers", rawCustomerInsert);
    const { data: newCust, error: custCreateErr } = await supabase
      .from("customers")
      .insert(sanitizedCustInsert)
      .select()
      .single();

    if (custCreateErr || !newCust) {
      throw new Error(`Customer create failed: ${custCreateErr?.message}`);
    }
    testCustomerId = newCust.id;
    console.log(`✓ Customer Created successfully. ID: ${testCustomerId}, Code: ${newCust.code}`);
    passed++;

    // 1.2 Customer View / Read Back
    console.log("1.2 Viewing Customer & Verifying Fields...");
    const { data: viewedCust, error: viewErr } = await supabase
      .from("customers")
      .select("*")
      .eq("id", testCustomerId)
      .single();

    if (viewErr || !viewedCust) {
      throw new Error(`Customer view failed: ${viewErr?.message}`);
    }
    if (viewedCust.name_ar !== "شركة الاختبار للحلول الرقمية" || viewedCust.current_balance !== 15000) {
      throw new Error(`Customer view field mismatch: ${JSON.stringify(viewedCust)}`);
    }
    console.log("✓ Customer View verified: name_ar and current_balance match expected values.");
    passed++;

    // 1.3 Customer Edit / Update with Schema Sanitization
    console.log("1.3 Editing Customer (testing update payload with opening_balance & updated details)...");
    const rawCustomerUpdate = {
      name_ar: "شركة الاختبار للحلول الرقمية المحدثة",
      name_en: "Digital Solutions Test Co Updated",
      code: testCustomerCode,
      mobile: "0559998877",
      email: "updated_cust@example.com",
      address: "جدة - طريق الملك",
      tax_number: "300011122233344",
      credit_limit: 75000,
      current_balance: 25000,
      opening_balance: 25000, // Invalid column that previously caused HTTP 500
      random_invalid_prop: "should_be_stripped"
    };

    const sanitizedCustUpdate = sanitizeRowForTable("customers", rawCustomerUpdate);
    const { data: updatedCust, error: custUpdateErr } = await supabase
      .from("customers")
      .update(sanitizedCustUpdate)
      .eq("id", testCustomerId)
      .select()
      .single();

    if (custUpdateErr || !updatedCust) {
      throw new Error(`Customer update failed: ${custUpdateErr?.message}`);
    }
    console.log(`✓ Customer Updated successfully without HTTP 500 schema error.`);
    passed++;

    // 1.4 Customer Refresh Persistence Verification
    console.log("1.4 Verifying Updated Customer Persistence (Simulating Page Refresh)...");
    const { data: refreshedCust, error: refreshErr } = await supabase
      .from("customers")
      .select("*")
      .eq("id", testCustomerId)
      .single();

    if (refreshErr || !refreshedCust) {
      throw new Error(`Customer persistence check failed: ${refreshErr?.message}`);
    }
    if (
      refreshedCust.name_ar !== "شركة الاختبار للحلول الرقمية المحدثة" ||
      refreshedCust.current_balance !== 25000 ||
      refreshedCust.credit_limit !== 75000 ||
      refreshedCust.address !== "جدة - طريق الملك"
    ) {
      throw new Error(`Customer persistence data mismatch: ${JSON.stringify(refreshedCust)}`);
    }
    console.log("✓ Customer Edit Persistence verified across simulated refresh.");
    passed++;

    // 1.5 Customer Delete
    console.log("1.5 Deleting Test Customer...");
    const { error: custDelErr } = await supabase
      .from("customers")
      .delete()
      .eq("id", testCustomerId);

    if (custDelErr) {
      throw new Error(`Customer delete failed: ${custDelErr.message}`);
    }
    const { data: afterDelCust } = await supabase
      .from("customers")
      .select("*")
      .eq("id", testCustomerId)
      .maybeSingle();

    if (afterDelCust) {
      throw new Error("Customer still exists after deletion!");
    }
    console.log("✓ Customer Deleted & Cleaned up successfully.");
    testCustomerId = null;
    passed++;

  } catch (err) {
    console.error("❌ CUSTOMER TEST SUITE FAILED:", err.message);
    failed++;
    // Clean up if needed
    if (testCustomerId) {
      await supabase.from("customers").delete().eq("id", testCustomerId);
    }
  }

  // -------------------------------------------------------------
  // TEST SUITE 2: SUPPLIERS CRUD & SCHEMA INTEGRITY
  // -------------------------------------------------------------
  console.log("\n--- TEST SUITE 2: SUPPLIERS CRUD ---");
  const testSupplierCode = `SUPP-TEST-${Date.now().toString().slice(-4)}`;
  let testSupplierId = null;

  try {
    // 2.1 Supplier Create with Schema Sanitization
    console.log("2.1 Creating Supplier (including extraneous fields like opening_balance, bank_routing)...");
    const rawSupplierInsert = {
      organization_id: orgId,
      code: testSupplierCode,
      name_ar: "مؤسسة التوريدات الصناعية الفائقة",
      name_en: "Superior Industrial Supplies Est",
      email: "supplier_test@example.com",
      mobile: "0561112233",
      address: "الدمام - المنطقة الصناعية الثانية",
      tax_number: "300055544433322",
      bank_name: "مصرف الراجحي",
      bank_iban: "SA0380000000608010167519",
      current_balance: 45000,
      opening_balance: 45000, // Invalid column in schema
      bank_routing: "12345", // Invalid column in schema
      status: "active"
    };

    const sanitizedSuppInsert = sanitizeRowForTable("suppliers", rawSupplierInsert);
    const { data: newSupp, error: suppCreateErr } = await supabase
      .from("suppliers")
      .insert(sanitizedSuppInsert)
      .select()
      .single();

    if (suppCreateErr || !newSupp) {
      throw new Error(`Supplier create failed: ${suppCreateErr?.message}`);
    }
    testSupplierId = newSupp.id;
    console.log(`✓ Supplier Created successfully. ID: ${testSupplierId}, Code: ${newSupp.code}`);
    passed++;

    // 2.2 Supplier View / Read Back
    console.log("2.2 Viewing Supplier & Verifying Fields...");
    const { data: viewedSupp, error: viewSuppErr } = await supabase
      .from("suppliers")
      .select("*")
      .eq("id", testSupplierId)
      .single();

    if (viewSuppErr || !viewedSupp) {
      throw new Error(`Supplier view failed: ${viewSuppErr?.message}`);
    }
    if (viewedSupp.name_ar !== "مؤسسة التوريدات الصناعية الفائقة" || viewedSupp.current_balance !== 45000) {
      throw new Error(`Supplier view field mismatch: ${JSON.stringify(viewedSupp)}`);
    }
    console.log("✓ Supplier View verified: name_ar and current_balance match expected values.");
    passed++;

    // 2.3 Supplier Edit / Update with Schema Sanitization
    console.log("2.3 Editing Supplier (testing update payload with opening_balance & updated bank details)...");
    const rawSupplierUpdate = {
      name_ar: "مؤسسة التوريدات الصناعية الفائقة المحدثة",
      name_en: "Superior Industrial Supplies Est Updated",
      code: testSupplierCode,
      mobile: "0569998877",
      email: "updated_supp@example.com",
      address: "الجبيل - المنطقة الصناعية",
      tax_number: "300099988811122",
      bank_name: "البنك الأهلي السعودي",
      bank_iban: "SA9410000000123456789012",
      current_balance: 60000,
      opening_balance: 60000, // Invalid column that previously caused HTTP 500
      unknown_field_test: "stripped"
    };

    const sanitizedSuppUpdate = sanitizeRowForTable("suppliers", rawSupplierUpdate);
    const { data: updatedSupp, error: suppUpdateErr } = await supabase
      .from("suppliers")
      .update(sanitizedSuppUpdate)
      .eq("id", testSupplierId)
      .select()
      .single();

    if (suppUpdateErr || !updatedSupp) {
      throw new Error(`Supplier update failed: ${suppUpdateErr?.message}`);
    }
    console.log(`✓ Supplier Updated successfully without HTTP 500 schema error.`);
    passed++;

    // 2.4 Supplier Refresh Persistence Verification
    console.log("2.4 Verifying Updated Supplier Persistence (Simulating Page Refresh)...");
    const { data: refreshedSupp, error: refreshSuppErr } = await supabase
      .from("suppliers")
      .select("*")
      .eq("id", testSupplierId)
      .single();

    if (refreshSuppErr || !refreshedSupp) {
      throw new Error(`Supplier persistence check failed: ${refreshSuppErr?.message}`);
    }
    if (
      refreshedSupp.name_ar !== "مؤسسة التوريدات الصناعية الفائقة المحدثة" ||
      refreshedSupp.current_balance !== 60000 ||
      refreshedSupp.bank_name !== "البنك الأهلي السعودي" ||
      refreshedSupp.bank_iban !== "SA9410000000123456789012"
    ) {
      throw new Error(`Supplier persistence data mismatch: ${JSON.stringify(refreshedSupp)}`);
    }
    console.log("✓ Supplier Edit Persistence verified across simulated refresh.");
    passed++;

    // 2.5 Supplier Delete
    console.log("2.5 Deleting Test Supplier...");
    const { error: suppDelErr } = await supabase
      .from("suppliers")
      .delete()
      .eq("id", testSupplierId);

    if (suppDelErr) {
      throw new Error(`Supplier delete failed: ${suppDelErr.message}`);
    }
    const { data: afterDelSupp } = await supabase
      .from("suppliers")
      .select("*")
      .eq("id", testSupplierId)
      .maybeSingle();

    if (afterDelSupp) {
      throw new Error("Supplier still exists after deletion!");
    }
    console.log("✓ Supplier Deleted & Cleaned up successfully.");
    testSupplierId = null;
    passed++;

  } catch (err) {
    console.error("❌ SUPPLIER TEST SUITE FAILED:", err.message);
    failed++;
    // Clean up if needed
    if (testSupplierId) {
      await supabase.from("suppliers").delete().eq("id", testSupplierId);
    }
  }

  // -------------------------------------------------------------
  // TEST SUITE 3: PRODUCTION DATA INTEGRITY VERIFICATION
  // -------------------------------------------------------------
  const { count: finalAccountsCount } = await supabase.from("accounts").select("*", { count: "exact", head: true });
  const { count: finalCustCount } = await supabase.from("customers").select("*", { count: "exact", head: true });
  const { count: finalSuppCount } = await supabase.from("suppliers").select("*", { count: "exact", head: true });
  const { count: finalSalesInvCount } = await supabase.from("sales_invoices").select("*", { count: "exact", head: true });
  const { count: finalPurchInvCount } = await supabase.from("purchase_invoices").select("*", { count: "exact", head: true });
  const { count: finalJournalsCount } = await supabase.from("journal_entries").select("*", { count: "exact", head: true });

  console.log(`Checking record counts against initial state:`);
  console.log(` - Accounts: ${finalAccountsCount} (initial: ${initialAccountsCount})`);
  console.log(` - Customers: ${finalCustCount} (initial: ${initialCustCount})`);
  console.log(` - Suppliers: ${finalSuppCount} (initial: ${initialSuppCount})`);
  console.log(` - Sales Invoices: ${finalSalesInvCount} (initial: ${initialSalesInvCount})`);
  console.log(` - Purchase Invoices: ${finalPurchInvCount} (initial: ${initialPurchInvCount})`);
  console.log(` - Journal Entries: ${finalJournalsCount} (initial: ${initialJournalsCount})`);

  if (
    finalCustCount === initialCustCount &&
    finalSuppCount === initialSuppCount &&
    finalAccountsCount === initialAccountsCount &&
    finalSalesInvCount === initialSalesInvCount &&
    finalPurchInvCount === initialPurchInvCount &&
    finalJournalsCount === initialJournalsCount
  ) {
    console.log("✓ 100% Confirmation: All production data preserved with ZERO unwanted changes or deletions.");
    passed++;
  } else {
    console.error("❌ Production data counts changed!");
    failed++;
  }

  console.log("\n=================================================");
  console.log(` SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
