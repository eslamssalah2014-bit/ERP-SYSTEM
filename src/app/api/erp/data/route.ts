import { NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";
const DEFAULT_BRANCH_ID = "00000000-0000-0000-0000-000000000002";
const DEFAULT_WAREHOUSE_ID = "00000000-0000-0000-0000-000000000004";

// UUID Validator & Sanitizer to prevent PostgreSQL 22P02 errors
function isValidUUID(str: any): boolean {
  if (!str || typeof str !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

function cleanUUID(str: any, fallback: string | null = null): string | null {
  return isValidUUID(str) ? str : fallback;
}

// GET: Hydrate all ERP data from Supabase PostgreSQL
export async function GET() {
  if (!isSupabaseConfigured || !supabaseAdmin) {
    return NextResponse.json({ success: false, message: "Supabase not configured", data: null }, { status: 200 });
  }

  try {
    const [
      customersRes,
      suppliersRes,
      productsRes,
      warehouseStockRes,
      salesInvoicesRes,
      salesItemsRes,
      purchaseInvoicesRes,
      purchaseItemsRes,
      warehousesRes,
      costCentersRes,
      accountsRes,
      treasuryRes,
      checksRes,
      journalEntriesRes,
      journalLinesRes,
      stockMovementsRes,
      auditLogsRes,
      categoriesRes,
      unitsRes,
    ] = await Promise.all([
      supabaseAdmin.from("customers").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("suppliers").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("products").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("product_warehouse_stock").select("*"),
      supabaseAdmin.from("sales_invoices").select("*").order("date", { ascending: false }),
      supabaseAdmin.from("sales_invoice_items").select("*"),
      supabaseAdmin.from("purchase_invoices").select("*").order("date", { ascending: false }),
      supabaseAdmin.from("purchase_invoice_items").select("*"),
      supabaseAdmin.from("warehouses").select("*").order("created_at", { ascending: true }),
      supabaseAdmin.from("cost_centers").select("*").order("created_at", { ascending: true }),
      supabaseAdmin.from("accounts").select("*").order("code", { ascending: true }),
      supabaseAdmin.from("treasury_accounts").select("*").order("created_at", { ascending: true }),
      supabaseAdmin.from("check_records").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("journal_entries").select("*").order("date", { ascending: false }),
      supabaseAdmin.from("journal_lines").select("*"),
      supabaseAdmin.from("stockMovements" in supabaseAdmin ? "stock_movements" : "stock_movements").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100),
      supabaseAdmin.from("product_categories").select("*"),
      supabaseAdmin.from("product_units").select("*"),
    ]);

    // Build warehouse stock map per product
    const stockMap: { [productId: string]: { [whId: string]: number } } = {};
    (warehouseStockRes.data || []).forEach((row: any) => {
      if (!stockMap[row.product_id]) stockMap[row.product_id] = {};
      stockMap[row.product_id][row.warehouse_id] = row.quantity;
    });

    // Map Products
    const products = (productsRes.data || []).map((p: any) => ({
      id: p.id,
      organizationId: p.organization_id,
      sku: p.sku,
      barcode: p.barcode || "",
      nameAr: p.name_ar,
      nameEn: p.name_en || p.name_ar,
      description: p.description || "",
      categoryId: p.category_id || "",
      unitId: p.unit_id || "",
      costPrice: Number(p.cost_price) || 0,
      sellingPrice: Number(p.selling_price) || 0,
      taxRate: Number(p.tax_rate) || 14,
      minStockLevel: Number(p.min_stock_level) || 5,
      status: p.status || "active",
      warehouseStock: stockMap[p.id] || {},
    }));

    // Map Customers
    const customers = (customersRes.data || []).map((c: any) => ({
      id: c.id,
      organizationId: c.organization_id,
      code: c.code,
      nameAr: c.name_ar,
      nameEn: c.name_en || c.name_ar,
      mobile: c.mobile || "",
      email: c.email || "",
      address: c.address || "",
      city: c.city || "",
      taxNumber: c.tax_number || "",
      commercialRegister: c.commercial_register || "",
      creditLimit: Number(c.credit_limit) || 0,
      paymentTermsDays: Number(c.payment_terms_days) || 30,
      currentBalance: Number(c.current_balance) || 0,
      status: c.status || "active",
    }));

    // Map Suppliers
    const suppliers = (suppliersRes.data || []).map((s: any) => ({
      id: s.id,
      organizationId: s.organization_id,
      code: s.code,
      nameAr: s.name_ar,
      nameEn: s.name_en || s.name_ar,
      mobile: s.mobile || "",
      email: s.email || "",
      address: s.address || "",
      taxNumber: s.tax_number || "",
      bankName: s.bank_name || "",
      bankIban: s.bank_iban || "",
      currentBalance: Number(s.current_balance) || 0,
      status: s.status || "active",
    }));

    // Map Sales Invoices & Line Items
    const salesItemsMap: { [invoiceId: string]: any[] } = {};
    (salesItemsRes.data || []).forEach((item: any) => {
      if (!salesItemsMap[item.sales_invoice_id]) salesItemsMap[item.sales_invoice_id] = [];
      salesItemsMap[item.sales_invoice_id].push({
        id: item.id,
        productId: item.product_id,
        productName: item.product_name,
        warehouseId: item.warehouse_id,
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unit_price) || 0,
        costPrice: Number(item.cost_price) || 0,
        discountPercent: Number(item.discount_percent) || 0,
        discountAmount: Number(item.discount_amount) || 0,
        taxRate: Number(item.tax_rate) || 14,
        taxAmount: Number(item.tax_amount) || 0,
        total: Number(item.total) || 0,
      });
    });

    const salesInvoices = (salesInvoicesRes.data || []).map((inv: any) => ({
      id: inv.id,
      organizationId: inv.organization_id,
      branchId: inv.branch_id,
      invoiceNumber: inv.invoice_number,
      date: inv.date,
      dueDate: inv.due_date,
      customerId: inv.customer_id,
      customerName: inv.customer_name,
      customerTaxNumber: inv.customer_tax_number || "",
      salesRepId: inv.sales_rep_id,
      salesRepName: inv.sales_rep_name || "",
      warehouseId: inv.warehouse_id,
      status: inv.status,
      items: salesItemsMap[inv.id] || [],
      subtotal: Number(inv.subtotal) || 0,
      discountTotal: Number(inv.discount_total) || 0,
      taxTotal: Number(inv.tax_total) || 0,
      grandTotal: Number(inv.grand_total) || 0,
      paidAmount: Number(inv.paid_amount) || 0,
      dueAmount: Number(inv.due_amount) || 0,
      notes: inv.notes || "",
      createdBy: inv.created_by || "",
      createdAt: inv.created_at,
    }));

    // Map Purchase Invoices
    const purchaseItemsMap: { [invoiceId: string]: any[] } = {};
    (purchaseItemsRes.data || []).forEach((item: any) => {
      if (!purchaseItemsMap[item.purchase_invoice_id]) purchaseItemsMap[item.purchase_invoice_id] = [];
      purchaseItemsMap[item.purchase_invoice_id].push({
        id: item.id,
        productId: item.product_id,
        productName: item.product_name,
        warehouseId: item.warehouse_id,
        quantity: Number(item.quantity) || 1,
        unitCost: Number(item.unit_cost) || 0,
        discountAmount: Number(item.discount_amount) || 0,
        taxRate: Number(item.tax_rate) || 14,
        taxAmount: Number(item.tax_amount) || 0,
        total: Number(item.total) || 0,
      });
    });

    const purchaseInvoices = (purchaseInvoicesRes.data || []).map((inv: any) => ({
      id: inv.id,
      organizationId: inv.organization_id,
      branchId: inv.branch_id,
      invoiceNumber: inv.invoice_number,
      supplierInvoiceRef: inv.supplier_invoice_ref || "",
      date: inv.date,
      dueDate: inv.due_date,
      supplierId: inv.supplier_id,
      supplierName: inv.supplier_name,
      supplierTaxNumber: inv.supplier_tax_number || "",
      warehouseId: inv.warehouse_id,
      status: inv.status,
      items: purchaseItemsMap[inv.id] || [],
      subtotal: Number(inv.subtotal) || 0,
      discountTotal: Number(inv.discount_total) || 0,
      taxTotal: Number(inv.tax_total) || 0,
      grandTotal: Number(inv.grand_total) || 0,
      paidAmount: Number(inv.paid_amount) || 0,
      dueAmount: Number(inv.due_amount) || 0,
      notes: inv.notes || "",
      createdBy: inv.created_by || "",
      createdAt: inv.created_at,
    }));

    // Map Warehouses
    const warehouses = (warehousesRes.data || []).map((w: any) => ({
      id: w.id,
      organizationId: w.organization_id,
      branchId: w.branch_id,
      code: w.code,
      nameAr: w.name_ar,
      nameEn: w.name_en || w.name_ar,
      location: w.location || "",
      managerName: w.manager_name || "",
      managerPhone: w.manager_phone || "",
      isDefault: Boolean(w.is_default),
    }));

    // Map Cost Centers
    const costCenters = (costCentersRes.data || []).map((cc: any) => ({
      id: cc.id,
      organizationId: cc.organization_id,
      code: cc.code,
      nameAr: cc.name_ar,
      nameEn: cc.name_en || cc.name_ar,
      parentId: cc.parent_id || undefined,
      level: Number(cc.level) || 1,
      isActive: Boolean(cc.is_active),
    }));

    // Map Accounts
    const accounts = (accountsRes.data || []).map((a: any) => ({
      id: a.id,
      organizationId: a.organization_id,
      code: a.code,
      nameAr: a.name_ar,
      nameEn: a.name_en || a.name_ar,
      type: a.type,
      parentId: a.parent_id || undefined,
      level: Number(a.level) || 1,
      nature: a.nature,
      balance: Number(a.balance) || 0,
      currency: a.currency || "EGP",
      isActive: Boolean(a.is_active),
      isSystem: Boolean(a.is_system),
    }));

    // Map Treasury Accounts
    const treasuryAccounts = (treasuryRes.data || []).map((t: any) => ({
      id: t.id,
      organizationId: t.organization_id,
      branchId: t.branch_id,
      glAccountId: t.gl_account_id,
      code: t.code,
      nameAr: t.name_ar,
      nameEn: t.name_en || t.name_ar,
      type: t.type,
      currency: t.currency || "EGP",
      balance: Number(t.balance) || 0,
      bankName: t.bank_name || undefined,
      accountNumber: t.account_number || undefined,
      isDefault: Boolean(t.is_default),
    }));

    // Map Checks
    const checks = (checksRes.data || []).map((chk: any) => ({
      id: chk.id,
      organizationId: chk.organization_id,
      branchId: chk.branch_id,
      checkNumber: chk.check_number,
      bankName: chk.bank_name,
      type: chk.type,
      partyName: chk.party_name,
      customerId: chk.customer_id || undefined,
      supplierId: chk.supplier_id || undefined,
      amount: Number(chk.amount) || 0,
      issueDate: chk.issue_date,
      dueDate: chk.due_date,
      collectionDate: chk.collection_date || undefined,
      status: chk.status,
      targetTreasuryId: chk.target_treasury_id || undefined,
      notes: chk.notes || "",
    }));

    // Map Journal Entries & Lines
    const linesMap: { [entryId: string]: any[] } = {};
    (journalLinesRes.data || []).forEach((line: any) => {
      if (!linesMap[line.journal_entry_id]) linesMap[line.journal_entry_id] = [];
      linesMap[line.journal_entry_id].push({
        id: line.id,
        accountId: line.account_id,
        accountCode: line.account_code,
        accountName: line.account_name,
        debit: Number(line.debit) || 0,
        credit: Number(line.credit) || 0,
        costCenterId: line.cost_center_id || undefined,
        description: line.description || "",
      });
    });

    const journalEntries = (journalEntriesRes.data || []).map((je: any) => ({
      id: je.id,
      organizationId: je.organization_id,
      branchId: je.branch_id,
      entryNumber: je.entry_number,
      date: je.date,
      referenceType: je.reference_type,
      referenceId: je.reference_id || undefined,
      description: je.description,
      lines: linesMap[je.id] || [],
      totalDebit: Number(je.total_debit) || 0,
      totalCredit: Number(je.total_credit) || 0,
      isBalanced: Boolean(je.is_balanced),
      status: je.status || "posted",
      createdBy: je.created_by || "",
    }));

    // Map Stock Movements
    const stockMovements = (stockMovementsRes.data || []).map((sm: any) => ({
      id: sm.id,
      organizationId: sm.organization_id,
      productId: sm.product_id,
      warehouseId: sm.warehouse_id,
      movementType: sm.movement_type,
      referenceId: sm.reference_id || undefined,
      referenceNumber: sm.reference_number || "",
      date: sm.date,
      quantity: Number(sm.quantity) || 0,
      unitCost: Number(sm.unit_cost) || 0,
      totalCost: Number(sm.total_cost) || 0,
      balanceQuantity: Number(sm.balance_quantity) || 0,
      notes: sm.notes || "",
    }));

    // Map Audit Logs
    const auditLogs = (auditLogsRes.data || []).map((log: any) => ({
      id: log.id,
      organizationId: log.organization_id,
      userId: log.user_id,
      userName: log.user_name,
      action: log.action,
      entityType: log.entity_type,
      entityId: log.entity_id,
      details: log.details,
      createdAt: log.created_at,
    }));

    return NextResponse.json({
      success: true,
      data: {
        products,
        customers,
        suppliers,
        salesInvoices,
        purchaseInvoices,
        warehouses,
        costCenters,
        accounts,
        treasuryAccounts,
        checks,
        journalEntries,
        stockMovements,
        auditLogs,
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/erp/data:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Real-time DB Mutations
export async function POST(request: Request) {
  if (!isSupabaseConfigured || !supabaseAdmin) {
    return NextResponse.json({ success: false, message: "Supabase not configured" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { action, payload } = body;

    switch (action) {
      // 1. Create Product
      case "create_product": {
        const { id, organizationId, sku, barcode, nameAr, nameEn, description, categoryId, unitId, costPrice, sellingPrice, taxRate, minStockLevel, status, warehouseStock } = payload;
        
        const validId = cleanUUID(id, null);
        const validOrgId = cleanUUID(organizationId, DEFAULT_ORG_ID);
        const validCategoryId = cleanUUID(categoryId, null);
        const validUnitId = cleanUUID(unitId, null);

        const insertRow: any = {
          organization_id: validOrgId,
          sku,
          barcode: barcode || null,
          name_ar: nameAr,
          name_en: nameEn || nameAr,
          description: description || null,
          category_id: validCategoryId,
          unit_id: validUnitId,
          cost_price: Number(costPrice) || 0,
          selling_price: Number(sellingPrice) || 0,
          tax_rate: Number(taxRate) || 14,
          min_stock_level: Number(minStockLevel) || 5,
          status: status || "active",
        };

        if (validId) {
          insertRow.id = validId;
        }

        const { data: prod, error: prodErr } = await supabaseAdmin
          .from("products")
          .insert([insertRow])
          .select()
          .single();

        if (prodErr) {
          console.error("Supabase error creating product:", prodErr);
          throw prodErr;
        }

        // Upsert warehouse stock
        if (warehouseStock && Object.keys(warehouseStock).length > 0 && prod?.id) {
          const stockRows: any[] = [];
          for (const [whId, qty] of Object.entries(warehouseStock)) {
            const validWhId = cleanUUID(whId, DEFAULT_WAREHOUSE_ID);
            if (validWhId && Number(qty) > 0) {
              stockRows.push({
                product_id: prod.id,
                warehouse_id: validWhId,
                quantity: Number(qty) || 0,
              });
            }
          }
          if (stockRows.length > 0) {
            await supabaseAdmin.from("product_warehouse_stock").upsert(stockRows);
          }
        }

        return NextResponse.json({ success: true, data: prod });
      }

      // 2. Create Customer
      case "create_customer": {
        const { id, organizationId, code, nameAr, nameEn, mobile, email, address, city, taxNumber, commercialRegister, creditLimit, paymentTermsDays, currentBalance, status } = payload;

        const validId = cleanUUID(id, null);
        const validOrgId = cleanUUID(organizationId, DEFAULT_ORG_ID);

        const insertRow: any = {
          organization_id: validOrgId,
          code,
          name_ar: nameAr,
          name_en: nameEn || nameAr,
          mobile: mobile || null,
          email: email || null,
          address: address || null,
          city: city || null,
          tax_number: taxNumber || null,
          commercial_register: commercialRegister || null,
          credit_limit: Number(creditLimit) || 0,
          payment_terms_days: Number(paymentTermsDays) || 30,
          current_balance: Number(currentBalance) || 0,
          status: status || "active",
        };

        if (validId) {
          insertRow.id = validId;
        }

        const { data: cust, error: custErr } = await supabaseAdmin
          .from("customers")
          .insert([insertRow])
          .select()
          .single();

        if (custErr) throw custErr;
        return NextResponse.json({ success: true, data: cust });
      }

      // 3. Create Supplier
      case "create_supplier": {
        const { id, organizationId, code, nameAr, nameEn, mobile, email, address, taxNumber, bankName, bankIban, currentBalance, status } = payload;

        const validId = cleanUUID(id, null);
        const validOrgId = cleanUUID(organizationId, DEFAULT_ORG_ID);

        const insertRow: any = {
          organization_id: validOrgId,
          code,
          name_ar: nameAr,
          name_en: nameEn || nameAr,
          mobile: mobile || null,
          email: email || null,
          address: address || null,
          tax_number: taxNumber || null,
          bank_name: bankName || null,
          bank_iban: bankIban || null,
          current_balance: Number(currentBalance) || 0,
          status: status || "active",
        };

        if (validId) {
          insertRow.id = validId;
        }

        const { data: supp, error: suppErr } = await supabaseAdmin
          .from("suppliers")
          .insert([insertRow])
          .select()
          .single();

        if (suppErr) throw suppErr;
        return NextResponse.json({ success: true, data: supp });
      }

      // 4. Create Sales Invoice (with line items & stock movements)
      case "create_sales_invoice": {
        const {
          id, organizationId, branchId, invoiceNumber, date, dueDate, customerId,
          customerName, customerTaxNumber, salesRepId, salesRepName, warehouseId,
          status, items, subtotal, discountTotal, taxTotal, grandTotal, paidAmount,
          dueAmount, notes, createdBy
        } = payload;

        const validId = cleanUUID(id, null);
        const validOrgId = cleanUUID(organizationId, DEFAULT_ORG_ID);
        const validBranchId = cleanUUID(branchId, DEFAULT_BRANCH_ID);
        const validWhId = cleanUUID(warehouseId, DEFAULT_WAREHOUSE_ID);
        const validCustId = cleanUUID(customerId, null);
        const validRepId = cleanUUID(salesRepId, null);

        const insertRow: any = {
          organization_id: validOrgId,
          branch_id: validBranchId,
          invoice_number: invoiceNumber,
          date,
          due_date: dueDate || date,
          customer_id: validCustId,
          customer_name: customerName,
          customer_tax_number: customerTaxNumber || null,
          sales_rep_id: validRepId,
          sales_rep_name: salesRepName || null,
          warehouse_id: validWhId,
          status: status || "unpaid",
          subtotal: Number(subtotal) || 0,
          discount_total: Number(discountTotal) || 0,
          tax_total: Number(taxTotal) || 0,
          grand_total: Number(grandTotal) || 0,
          paid_amount: Number(paidAmount) || 0,
          due_amount: Number(dueAmount) || 0,
          notes: notes || null,
          created_by: createdBy || null,
        };

        if (validId) insertRow.id = validId;

        const { data: inv, error: invErr } = await supabaseAdmin
          .from("sales_invoices")
          .insert([insertRow])
          .select()
          .single();

        if (invErr) throw invErr;

        // Line Items
        if (items && items.length > 0 && inv?.id) {
          const itemRows = items.map((it: any) => ({
            sales_invoice_id: inv.id,
            product_id: cleanUUID(it.productId, null),
            product_name: it.productName,
            warehouse_id: cleanUUID(it.warehouseId, validWhId),
            quantity: Number(it.quantity) || 1,
            unit_price: Number(it.unitPrice) || 0,
            cost_price: Number(it.costPrice) || 0,
            discount_percent: Number(it.discountPercent) || 0,
            discount_amount: Number(it.discountAmount) || 0,
            tax_rate: Number(it.taxRate) || 14,
            tax_amount: Number(it.taxAmount) || 0,
            total: Number(it.total) || 0,
          }));

          const { error: itemsErr } = await supabaseAdmin.from("sales_invoice_items").insert(itemRows);
          if (itemsErr) console.error("Error inserting invoice items:", itemsErr);

          // Stock Movements
          for (const it of items) {
            const validProdId = cleanUUID(it.productId, null);
            if (validProdId) {
              await supabaseAdmin.from("stock_movements").insert([{
                organization_id: validOrgId,
                product_id: validProdId,
                warehouse_id: cleanUUID(it.warehouseId, validWhId),
                movement_type: "sales_issue",
                reference_id: inv.id,
                reference_number: invoiceNumber,
                date: date,
                quantity: -Math.abs(Number(it.quantity) || 1),
                unit_cost: Number(it.costPrice) || 0,
                total_cost: -Math.abs((Number(it.costPrice) || 0) * (Number(it.quantity) || 1)),
                balance_quantity: 0,
                notes: `صرف مبيعات فاتورة ${invoiceNumber}`,
              }]);
            }
          }
        }

        return NextResponse.json({ success: true, data: inv });
      }

      // 5. Create Purchase Invoice
      case "create_purchase_invoice": {
        const {
          id, organizationId, branchId, invoiceNumber, supplierInvoiceRef, date,
          dueDate, supplierId, supplierName, supplierTaxNumber, warehouseId,
          status, items, subtotal, discountTotal, taxTotal, grandTotal, paidAmount,
          dueAmount, notes, createdBy
        } = payload;

        const validId = cleanUUID(id, null);
        const validOrgId = cleanUUID(organizationId, DEFAULT_ORG_ID);
        const validBranchId = cleanUUID(branchId, DEFAULT_BRANCH_ID);
        const validWhId = cleanUUID(warehouseId, DEFAULT_WAREHOUSE_ID);
        const validSuppId = cleanUUID(supplierId, null);

        const insertRow: any = {
          organization_id: validOrgId,
          branch_id: validBranchId,
          invoice_number: invoiceNumber,
          supplier_invoice_ref: supplierInvoiceRef || null,
          date,
          due_date: dueDate || date,
          supplier_id: validSuppId,
          supplier_name: supplierName,
          supplier_tax_number: supplierTaxNumber || null,
          warehouse_id: validWhId,
          status: status || "unpaid",
          subtotal: Number(subtotal) || 0,
          discount_total: Number(discountTotal) || 0,
          tax_total: Number(taxTotal) || 0,
          grand_total: Number(grandTotal) || 0,
          paid_amount: Number(paidAmount) || 0,
          due_amount: Number(dueAmount) || 0,
          notes: notes || null,
          created_by: createdBy || null,
        };

        if (validId) insertRow.id = validId;

        const { data: pinv, error: pinvErr } = await supabaseAdmin
          .from("purchase_invoices")
          .insert([insertRow])
          .select()
          .single();

        if (pinvErr) throw pinvErr;

        if (items && items.length > 0 && pinv?.id) {
          const itemRows = items.map((it: any) => ({
            purchase_invoice_id: pinv.id,
            product_id: cleanUUID(it.productId, null),
            product_name: it.productName,
            warehouse_id: cleanUUID(it.warehouseId, validWhId),
            quantity: Number(it.quantity) || 1,
            unit_cost: Number(it.unitCost) || 0,
            discount_amount: Number(it.discountAmount) || 0,
            tax_rate: Number(it.taxRate) || 14,
            tax_amount: Number(it.taxAmount) || 0,
            total: Number(it.total) || 0,
          }));

          await supabaseAdmin.from("purchase_invoice_items").insert(itemRows);

          for (const it of items) {
            const validProdId = cleanUUID(it.productId, null);
            if (validProdId) {
              await supabaseAdmin.from("stock_movements").insert([{
                organization_id: validOrgId,
                product_id: validProdId,
                warehouse_id: cleanUUID(it.warehouseId, validWhId),
                movement_type: "purchase_receipt",
                reference_id: pinv.id,
                reference_number: invoiceNumber,
                date: date,
                quantity: Math.abs(Number(it.quantity) || 1),
                unit_cost: Number(it.unitCost) || 0,
                total_cost: Math.abs((Number(it.unitCost) || 0) * (Number(it.quantity) || 1)),
                balance_quantity: 0,
                notes: `توريد مشتريات فاتورة ${invoiceNumber}`,
              }]);
            }
          }
        }

        return NextResponse.json({ success: true, data: pinv });
      }

      // 6. Create Warehouse
      case "create_warehouse": {
        const { id, organizationId, branchId, code, nameAr, nameEn, location, managerName, managerPhone, isDefault } = payload;
        const validId = cleanUUID(id, null);
        const validOrgId = cleanUUID(organizationId, DEFAULT_ORG_ID);
        const validBranchId = cleanUUID(branchId, DEFAULT_BRANCH_ID);

        const insertRow: any = {
          organization_id: validOrgId,
          branch_id: validBranchId,
          code,
          name_ar: nameAr,
          name_en: nameEn || nameAr,
          location: location || null,
          manager_name: managerName || null,
          manager_phone: managerPhone || null,
          is_default: Boolean(isDefault),
        };
        if (validId) insertRow.id = validId;

        const { data: wh, error: whErr } = await supabaseAdmin
          .from("warehouses")
          .insert([insertRow])
          .select()
          .single();

        if (whErr) throw whErr;
        return NextResponse.json({ success: true, data: wh });
      }

      // 7. Create Cost Center
      case "create_cost_center": {
        const { id, organizationId, code, nameAr, nameEn, parentId, level, isActive } = payload;
        const validId = cleanUUID(id, null);
        const validOrgId = cleanUUID(organizationId, DEFAULT_ORG_ID);

        const insertRow: any = {
          organization_id: validOrgId,
          code,
          name_ar: nameAr,
          name_en: nameEn || nameAr,
          parent_id: cleanUUID(parentId, null),
          level: Number(level) || 1,
          is_active: isActive !== false,
        };
        if (validId) insertRow.id = validId;

        const { data: cc, error: ccErr } = await supabaseAdmin
          .from("cost_centers")
          .insert([insertRow])
          .select()
          .single();

        if (ccErr) throw ccErr;
        return NextResponse.json({ success: true, data: cc });
      }

      // 8. Create Check
      case "create_check": {
        const { id, organizationId, branchId, checkNumber, bankName, type, partyName, customerId, supplierId, amount, issueDate, dueDate, status, notes } = payload;
        const validId = cleanUUID(id, null);
        const validOrgId = cleanUUID(organizationId, DEFAULT_ORG_ID);
        const validBranchId = cleanUUID(branchId, DEFAULT_BRANCH_ID);

        const insertRow: any = {
          organization_id: validOrgId,
          branch_id: validBranchId,
          check_number: checkNumber,
          bank_name: bankName,
          type,
          party_name: partyName,
          customer_id: cleanUUID(customerId, null),
          supplier_id: cleanUUID(supplierId, null),
          amount: Number(amount) || 0,
          issue_date: issueDate,
          due_date: dueDate,
          status: status || "pending",
          notes: notes || null,
        };
        if (validId) insertRow.id = validId;

        const { data: chk, error: chkErr } = await supabaseAdmin
          .from("check_records")
          .insert([insertRow])
          .select()
          .single();

        if (chkErr) throw chkErr;
        return NextResponse.json({ success: true, data: chk });
      }

      // 9. Update Check Status
      case "update_check_status": {
        const { checkId, newStatus, targetTreasuryId } = payload;
        const validCheckId = cleanUUID(checkId, null);
        if (!validCheckId) return NextResponse.json({ success: false, message: "Invalid check ID" }, { status: 400 });

        const { data: chk, error: chkErr } = await supabaseAdmin.from("check_records").update({
          status: newStatus,
          target_treasury_id: cleanUUID(targetTreasuryId, null),
          collection_date: newStatus === "collected" ? new Date().toISOString().split("T")[0] : null,
        }).eq("id", validCheckId).select().single();

        if (chkErr) throw chkErr;
        return NextResponse.json({ success: true, data: chk });
      }

      // 10. Create Journal Entry
      case "create_journal_entry": {
        const { id, organizationId, branchId, entryNumber, date, referenceType, referenceId, description, lines, totalDebit, totalCredit, isBalanced, status, createdBy } = payload;
        const validId = cleanUUID(id, null);
        const validOrgId = cleanUUID(organizationId, DEFAULT_ORG_ID);
        const validBranchId = cleanUUID(branchId, DEFAULT_BRANCH_ID);

        const insertRow: any = {
          organization_id: validOrgId,
          branch_id: validBranchId,
          entry_number: entryNumber,
          date,
          reference_type: referenceType,
          reference_id: cleanUUID(referenceId, null),
          description,
          total_debit: Number(totalDebit) || 0,
          total_credit: Number(totalCredit) || 0,
          is_balanced: Boolean(isBalanced),
          status: status || "posted",
          created_by: createdBy || null,
        };
        if (validId) insertRow.id = validId;

        const { data: je, error: jeErr } = await supabaseAdmin
          .from("journal_entries")
          .insert([insertRow])
          .select()
          .single();

        if (jeErr) throw jeErr;

        if (lines && lines.length > 0 && je?.id) {
          const lineRows = lines.map((l: any) => ({
            journal_entry_id: je.id,
            account_id: cleanUUID(l.accountId, null),
            account_code: l.accountCode,
            account_name: l.accountName,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
            cost_center_id: cleanUUID(l.costCenterId, null),
            description: l.description || null,
          }));

          await supabaseAdmin.from("journal_lines").insert(lineRows);
        }

        return NextResponse.json({ success: true, data: je });
      }

      default:
        return NextResponse.json({ success: false, message: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Error in POST /api/erp/data:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
