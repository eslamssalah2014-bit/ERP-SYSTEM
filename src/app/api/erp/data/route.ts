import { NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";
const DEFAULT_BRANCH_ID = "00000000-0000-0000-0000-000000000002";
const DEFAULT_WAREHOUSE_ID = "00000000-0000-0000-0000-000000000004";

// UUID Validator & Sanitizer
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
      changeHistoryRes,
      periodClosingsRes,
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
      supabaseAdmin.from("stock_movements").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100),
      supabaseAdmin.from("product_categories").select("*"),
      supabaseAdmin.from("product_units").select("*"),
      supabaseAdmin.from("product_change_history").select("*").order("created_at", { ascending: false }).limit(200),
      supabaseAdmin.from("period_closings").select("*").order("closing_date", { ascending: false }),
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
      imageUrl: p.image_url || (p.description && (p.description.startsWith("data:image") || p.description.startsWith("http")) ? p.description : ""),
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
      partnerId: sm.partner_id || undefined,
      partnerName: sm.partner_name || undefined,
      partnerType: sm.partner_type || undefined,
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

    // Map Product Change History Logs
    const productChangeLogs = (changeHistoryRes?.data || []).map((ch: any) => ({
      id: ch.id,
      organizationId: ch.organization_id,
      productId: ch.product_id,
      productName: ch.product_name,
      productSku: ch.product_sku,
      userId: ch.user_id,
      userName: ch.user_name,
      changeType: ch.change_type,
      fieldName: ch.field_name,
      oldValue: ch.old_value || "",
      newValue: ch.new_value || "",
      createdAt: ch.created_at,
    }));

    // Map Period Closings
    const periodClosings = (periodClosingsRes?.data || []).map((pc: any) => ({
      id: pc.id,
      organizationId: pc.organization_id,
      branchId: pc.branch_id,
      periodType: pc.period_type,
      periodLabel: pc.period_label,
      closingDate: pc.closing_date,
      openingInventoryValue: Number(pc.opening_inventory_value) || 0,
      purchasesValue: Number(pc.purchases_value) || 0,
      closingInventoryValue: Number(pc.closing_inventory_value) || 0,
      cogsValue: Number(pc.cogs_value) || 0,
      journalEntryId: pc.journal_entry_id,
      notes: pc.notes || "",
      createdBy: pc.created_by,
      createdAt: pc.created_at,
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
        productChangeLogs,
        periodClosings,
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/erp/data:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Real-time Atomic DB Mutations (Full CRUD)
export async function POST(request: Request) {
  if (!isSupabaseConfigured || !supabaseAdmin) {
    return NextResponse.json({ success: false, message: "Supabase not configured" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { action, payload } = body;

    switch (action) {
      // ==========================================
      // PRODUCTS (CREATE, UPDATE, DELETE)
      // ==========================================
      case "create_product": {
        const { id, organizationId, sku, barcode, nameAr, nameEn, description, categoryId, unitId, costPrice, sellingPrice, taxRate, minStockLevel, status, warehouseStock, imageUrl } = payload;
        
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
          image_url: imageUrl || null,
        };

        if (validId) insertRow.id = validId;

        const { data: prod, error: prodErr } = await supabaseAdmin
          .from("products")
          .insert([insertRow])
          .select()
          .single();

        if (prodErr) throw prodErr;

        // Upsert warehouse stock & create opening balance stock movements
        if (warehouseStock && Object.keys(warehouseStock).length > 0 && prod?.id) {
          const stockRows: any[] = [];
          const smRows: any[] = [];

          for (const [whId, qty] of Object.entries(warehouseStock)) {
            const validWhId = cleanUUID(whId, DEFAULT_WAREHOUSE_ID);
            const numQty = Number(qty) || 0;
            if (validWhId && numQty > 0) {
              stockRows.push({
                product_id: prod.id,
                warehouse_id: validWhId,
                quantity: numQty,
              });

              smRows.push({
                organization_id: validOrgId,
                product_id: prod.id,
                warehouse_id: validWhId,
                movement_type: "opening_balance",
                reference_number: `OB-${sku}`,
                date: new Date().toISOString().split("T")[0],
                quantity: numQty,
                unit_cost: Number(costPrice) || 0,
                total_cost: numQty * (Number(costPrice) || 0),
                balance_quantity: numQty,
                partner_name: "رصيد افتتاحي",
                partner_type: "opening",
                notes: "رصيد مخزون أول المدة",
              });
            }
          }
          if (stockRows.length > 0) {
            await supabaseAdmin.from("product_warehouse_stock").upsert(stockRows);
          }
          if (smRows.length > 0) {
            await supabaseAdmin.from("stock_movements").insert(smRows);
          }
        }

        return NextResponse.json({ success: true, data: prod });
      }

      case "update_product": {
        const { id, sku, barcode, nameAr, nameEn, description, categoryId, unitId, costPrice, sellingPrice, taxRate, minStockLevel, status, warehouseStock, imageUrl } = payload;
        const validId = cleanUUID(id, null);
        if (!validId) return NextResponse.json({ success: false, message: "Valid product ID is required" }, { status: 400 });

        const updateRow: any = { updated_at: new Date().toISOString() };
        if (sku !== undefined) updateRow.sku = sku;
        if (barcode !== undefined) updateRow.barcode = barcode || null;
        if (nameAr !== undefined) updateRow.name_ar = nameAr;
        if (nameEn !== undefined) updateRow.name_en = nameEn;
        if (description !== undefined) updateRow.description = description || null;
        if (categoryId !== undefined) updateRow.category_id = cleanUUID(categoryId, null);
        if (unitId !== undefined) updateRow.unit_id = cleanUUID(unitId, null);
        if (costPrice !== undefined) updateRow.cost_price = Number(costPrice);
        if (sellingPrice !== undefined) updateRow.selling_price = Number(sellingPrice);
        if (taxRate !== undefined) updateRow.tax_rate = Number(taxRate);
        if (minStockLevel !== undefined) updateRow.min_stock_level = Number(minStockLevel);
        if (status !== undefined) updateRow.status = status;
        if (imageUrl !== undefined) updateRow.image_url = imageUrl || null;

        const { data: prod, error: prodErr } = await supabaseAdmin
          .from("products")
          .update(updateRow)
          .eq("id", validId)
          .select()
          .single();

        if (prodErr) throw prodErr;

        if (warehouseStock && typeof warehouseStock === "object") {
          for (const [whId, qty] of Object.entries(warehouseStock)) {
            const validWhId = cleanUUID(whId, DEFAULT_WAREHOUSE_ID);
            if (validWhId) {
              await supabaseAdmin.from("product_warehouse_stock").upsert({
                product_id: validId,
                warehouse_id: validWhId,
                quantity: Number(qty) || 0,
              });
            }
          }
        }

        return NextResponse.json({ success: true, data: prod });
      }

      // ==========================================
      // STOCK MOVEMENTS (UPDATE, DELETE)
      // ==========================================
      case "update_stock_movement": {
        const { id, quantity, unitCost, totalCost, date, notes, partnerName, warehouseId } = payload;
        const validId = cleanUUID(id, null);
        if (!validId) return NextResponse.json({ success: false, message: "Valid movement ID required" }, { status: 400 });

        const updateRow: any = {};
        if (quantity !== undefined) updateRow.quantity = Number(quantity);
        if (unitCost !== undefined) updateRow.unit_cost = Number(unitCost);
        if (totalCost !== undefined) updateRow.total_cost = Number(totalCost);
        if (date !== undefined) updateRow.date = date;
        if (notes !== undefined) updateRow.notes = notes;
        if (partnerName !== undefined) updateRow.partner_name = partnerName;
        if (warehouseId !== undefined) updateRow.warehouse_id = cleanUUID(warehouseId, DEFAULT_WAREHOUSE_ID);

        const { data: sm, error: smErr } = await supabaseAdmin
          .from("stock_movements")
          .update(updateRow)
          .eq("id", validId)
          .select()
          .single();

        if (smErr) throw smErr;
        return NextResponse.json({ success: true, data: sm });
      }

      case "delete_stock_movement": {
        const validId = cleanUUID(payload?.id || payload, null);
        if (!validId) return NextResponse.json({ success: false, message: "Valid movement ID required" }, { status: 400 });

        const { error: delErr } = await supabaseAdmin.from("stock_movements").delete().eq("id", validId);
        if (delErr) throw delErr;

        return NextResponse.json({ success: true, id: validId });
      }

      // ==========================================
      // PRODUCT CHANGE LOGS (CREATE)
      // ==========================================
      case "create_product_change_log": {
        const { id, organizationId, productId, productName, productSku, userId, userName, changeType, fieldName, oldValue, newValue } = payload;
        const validOrgId = cleanUUID(organizationId, DEFAULT_ORG_ID);
        const validProdId = cleanUUID(productId, null);
        if (!validProdId) return NextResponse.json({ success: false, message: "Valid product ID required" }, { status: 400 });

        const insertRow: any = {
          organization_id: validOrgId,
          product_id: validProdId,
          product_name: productName || "",
          product_sku: productSku || "",
          user_id: cleanUUID(userId, null),
          user_name: userName || "النظام",
          change_type: changeType || "stock_adjustment",
          field_name: fieldName || "",
          old_value: String(oldValue ?? ""),
          new_value: String(newValue ?? ""),
        };
        const validId = cleanUUID(id, null);
        if (validId) insertRow.id = validId;

        const { data: log, error: logErr } = await supabaseAdmin
          .from("product_change_history")
          .insert([insertRow])
          .select()
          .single();

        if (logErr) console.warn("Could not persist product change log to DB:", logErr);
        return NextResponse.json({ success: true, data: log });
      }

      // ==========================================
      // PERIOD CLOSINGS (CREATE)
      // ==========================================
      case "create_period_closing": {
        const { id, organizationId, branchId, periodType, periodLabel, closingDate, openingInventoryValue, purchasesValue, closingInventoryValue, cogsValue, journalEntryId, notes, createdBy } = payload;
        const validOrgId = cleanUUID(organizationId, DEFAULT_ORG_ID);
        const validBranchId = cleanUUID(branchId, DEFAULT_BRANCH_ID);

        const insertRow: any = {
          organization_id: validOrgId,
          branch_id: validBranchId,
          period_type: periodType || "monthly",
          period_label: periodLabel || "",
          closing_date: closingDate || new Date().toISOString().split("T")[0],
          opening_inventory_value: Number(openingInventoryValue) || 0,
          purchases_value: Number(purchasesValue) || 0,
          closing_inventory_value: Number(closingInventoryValue) || 0,
          cogs_value: Number(cogsValue) || 0,
          journal_entry_id: cleanUUID(journalEntryId, null),
          notes: notes || null,
          created_by: createdBy || "النظام",
        };
        const validId = cleanUUID(id, null);
        if (validId) insertRow.id = validId;

        const { data: pc, error: pcErr } = await supabaseAdmin
          .from("period_closings")
          .insert([insertRow])
          .select()
          .single();

        if (pcErr) console.warn("Could not persist period closing to DB:", pcErr);
        return NextResponse.json({ success: true, data: pc });
      }

      case "delete_product": {
        const validId = cleanUUID(payload?.id || payload, null);
        if (!validId) return NextResponse.json({ success: false, message: "Valid product ID is required" }, { status: 400 });

        // Clean dependent rows first
        await supabaseAdmin.from("product_warehouse_stock").delete().eq("product_id", validId);
        await supabaseAdmin.from("stock_movements").delete().eq("product_id", validId);

        const { error: delErr } = await supabaseAdmin.from("products").delete().eq("id", validId);
        if (delErr) throw delErr;

        return NextResponse.json({ success: true, id: validId });
      }

      // ==========================================
      // CUSTOMERS (CREATE, UPDATE, DELETE)
      // ==========================================
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

        if (validId) insertRow.id = validId;

        const { data: cust, error: custErr } = await supabaseAdmin
          .from("customers")
          .insert([insertRow])
          .select()
          .single();

        if (custErr) throw custErr;
        return NextResponse.json({ success: true, data: cust });
      }

      case "update_customer": {
        const { id, code, nameAr, nameEn, mobile, email, address, city, taxNumber, commercialRegister, creditLimit, paymentTermsDays, currentBalance, status } = payload;
        const validId = cleanUUID(id, null);
        if (!validId) return NextResponse.json({ success: false, message: "Valid customer ID is required" }, { status: 400 });

        const updateRow: any = {};
        if (code !== undefined) updateRow.code = code;
        if (nameAr !== undefined) updateRow.name_ar = nameAr;
        if (nameEn !== undefined) updateRow.name_en = nameEn;
        if (mobile !== undefined) updateRow.mobile = mobile || null;
        if (email !== undefined) updateRow.email = email || null;
        if (address !== undefined) updateRow.address = address || null;
        if (city !== undefined) updateRow.city = city || null;
        if (taxNumber !== undefined) updateRow.tax_number = taxNumber || null;
        if (commercialRegister !== undefined) updateRow.commercial_register = commercialRegister || null;
        if (creditLimit !== undefined) updateRow.credit_limit = Number(creditLimit);
        if (paymentTermsDays !== undefined) updateRow.payment_terms_days = Number(paymentTermsDays);
        if (currentBalance !== undefined) updateRow.current_balance = Number(currentBalance);
        if (status !== undefined) updateRow.status = status;

        const { data: cust, error: custErr } = await supabaseAdmin
          .from("customers")
          .update(updateRow)
          .eq("id", validId)
          .select()
          .single();

        if (custErr) throw custErr;
        return NextResponse.json({ success: true, data: cust });
      }

      case "delete_customer": {
        const validId = cleanUUID(payload?.id || payload, null);
        if (!validId) return NextResponse.json({ success: false, message: "Valid customer ID is required" }, { status: 400 });

        const { error: delErr } = await supabaseAdmin.from("customers").delete().eq("id", validId);
        if (delErr) throw delErr;

        return NextResponse.json({ success: true, id: validId });
      }

      // ==========================================
      // SUPPLIERS (CREATE, UPDATE, DELETE)
      // ==========================================
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

        if (validId) insertRow.id = validId;

        const { data: supp, error: suppErr } = await supabaseAdmin
          .from("suppliers")
          .insert([insertRow])
          .select()
          .single();

        if (suppErr) throw suppErr;
        return NextResponse.json({ success: true, data: supp });
      }

      case "update_supplier": {
        const { id, code, nameAr, nameEn, mobile, email, address, taxNumber, bankName, bankIban, currentBalance, status } = payload;
        const validId = cleanUUID(id, null);
        if (!validId) return NextResponse.json({ success: false, message: "Valid supplier ID is required" }, { status: 400 });

        const updateRow: any = {};
        if (code !== undefined) updateRow.code = code;
        if (nameAr !== undefined) updateRow.name_ar = nameAr;
        if (nameEn !== undefined) updateRow.name_en = nameEn;
        if (mobile !== undefined) updateRow.mobile = mobile || null;
        if (email !== undefined) updateRow.email = email || null;
        if (address !== undefined) updateRow.address = address || null;
        if (taxNumber !== undefined) updateRow.tax_number = taxNumber || null;
        if (bankName !== undefined) updateRow.bank_name = bankName || null;
        if (bankIban !== undefined) updateRow.bank_iban = bankIban || null;
        if (currentBalance !== undefined) updateRow.current_balance = Number(currentBalance);
        if (status !== undefined) updateRow.status = status;

        const { data: supp, error: suppErr } = await supabaseAdmin
          .from("suppliers")
          .update(updateRow)
          .eq("id", validId)
          .select()
          .single();

        if (suppErr) throw suppErr;
        return NextResponse.json({ success: true, data: supp });
      }

      case "delete_supplier": {
        const validId = cleanUUID(payload?.id || payload, null);
        if (!validId) return NextResponse.json({ success: false, message: "Valid supplier ID is required" }, { status: 400 });

        const { error: delErr } = await supabaseAdmin.from("suppliers").delete().eq("id", validId);
        if (delErr) throw delErr;

        return NextResponse.json({ success: true, id: validId });
      }

      // ==========================================
      // WAREHOUSES (CREATE, UPDATE, DELETE)
      // ==========================================
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

      case "update_warehouse": {
        const { id, code, nameAr, nameEn, location, managerName, managerPhone, isDefault } = payload;
        const validId = cleanUUID(id, null);
        if (!validId) return NextResponse.json({ success: false, message: "Valid warehouse ID is required" }, { status: 400 });

        const updateRow: any = {};
        if (code !== undefined) updateRow.code = code;
        if (nameAr !== undefined) updateRow.name_ar = nameAr;
        if (nameEn !== undefined) updateRow.name_en = nameEn;
        if (location !== undefined) updateRow.location = location || null;
        if (managerName !== undefined) updateRow.manager_name = managerName || null;
        if (managerPhone !== undefined) updateRow.manager_phone = managerPhone || null;
        if (isDefault !== undefined) updateRow.is_default = Boolean(isDefault);

        const { data: wh, error: whErr } = await supabaseAdmin
          .from("warehouses")
          .update(updateRow)
          .eq("id", validId)
          .select()
          .single();

        if (whErr) throw whErr;
        return NextResponse.json({ success: true, data: wh });
      }

      case "delete_warehouse": {
        const validId = cleanUUID(payload?.id || payload, null);
        if (!validId) return NextResponse.json({ success: false, message: "Valid warehouse ID is required" }, { status: 400 });

        await supabaseAdmin.from("product_warehouse_stock").delete().eq("warehouse_id", validId);
        const { error: delErr } = await supabaseAdmin.from("warehouses").delete().eq("id", validId);
        if (delErr) throw delErr;

        return NextResponse.json({ success: true, id: validId });
      }

      // ==========================================
      // COST CENTERS (CREATE, UPDATE, DELETE)
      // ==========================================
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

      case "update_cost_center": {
        const { id, code, nameAr, nameEn, parentId, level, isActive } = payload;
        const validId = cleanUUID(id, null);
        if (!validId) return NextResponse.json({ success: false, message: "Valid cost center ID is required" }, { status: 400 });

        const updateRow: any = {};
        if (code !== undefined) updateRow.code = code;
        if (nameAr !== undefined) updateRow.name_ar = nameAr;
        if (nameEn !== undefined) updateRow.name_en = nameEn;
        if (parentId !== undefined) updateRow.parent_id = cleanUUID(parentId, null);
        if (level !== undefined) updateRow.level = Number(level);
        if (isActive !== undefined) updateRow.is_active = Boolean(isActive);

        const { data: cc, error: ccErr } = await supabaseAdmin
          .from("cost_centers")
          .update(updateRow)
          .eq("id", validId)
          .select()
          .single();

        if (ccErr) throw ccErr;
        return NextResponse.json({ success: true, data: cc });
      }

      case "delete_cost_center": {
        const validId = cleanUUID(payload?.id || payload, null);
        if (!validId) return NextResponse.json({ success: false, message: "Valid cost center ID is required" }, { status: 400 });

        const { error: delErr } = await supabaseAdmin.from("cost_centers").delete().eq("id", validId);
        if (delErr) throw delErr;

        return NextResponse.json({ success: true, id: validId });
      }

      // ==========================================
      // SALES INVOICES (CREATE, DELETE)
      // ==========================================
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

        // Insert Line Items
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

          // Insert Stock Movements
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

      case "delete_sales_invoice": {
        const validId = cleanUUID(payload?.id || payload, null);
        if (!validId) return NextResponse.json({ success: false, message: "Valid sales invoice ID is required" }, { status: 400 });

        await supabaseAdmin.from("sales_invoice_items").delete().eq("sales_invoice_id", validId);
        await supabaseAdmin.from("stock_movements").delete().eq("reference_id", validId);
        await supabaseAdmin.from("journal_entries").delete().eq("reference_id", validId);

        const { error: delErr } = await supabaseAdmin.from("sales_invoices").delete().eq("id", validId);
        if (delErr) throw delErr;

        return NextResponse.json({ success: true, id: validId });
      }

      // ==========================================
      // PURCHASE INVOICES (CREATE, DELETE)
      // ==========================================
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

      case "delete_purchase_invoice": {
        const validId = cleanUUID(payload?.id || payload, null);
        if (!validId) return NextResponse.json({ success: false, message: "Valid purchase invoice ID is required" }, { status: 400 });

        await supabaseAdmin.from("purchase_invoice_items").delete().eq("purchase_invoice_id", validId);
        await supabaseAdmin.from("stock_movements").delete().eq("reference_id", validId);
        await supabaseAdmin.from("journal_entries").delete().eq("reference_id", validId);

        const { error: delErr } = await supabaseAdmin.from("purchase_invoices").delete().eq("id", validId);
        if (delErr) throw delErr;

        return NextResponse.json({ success: true, id: validId });
      }

      // ==========================================
      // CHECKS (CREATE, UPDATE STATUS, DELETE)
      // ==========================================
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

      case "delete_check": {
        const validId = cleanUUID(payload?.id || payload, null);
        if (!validId) return NextResponse.json({ success: false, message: "Valid check ID is required" }, { status: 400 });

        const { error: delErr } = await supabaseAdmin.from("check_records").delete().eq("id", validId);
        if (delErr) throw delErr;

        return NextResponse.json({ success: true, id: validId });
      }

      // ==========================================
      // JOURNAL ENTRIES (CREATE, DELETE)
      // ==========================================
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

      case "delete_journal_entry": {
        const validId = cleanUUID(payload?.id || payload, null);
        if (!validId) return NextResponse.json({ success: false, message: "Valid journal entry ID is required" }, { status: 400 });

        await supabaseAdmin.from("journal_lines").delete().eq("journal_entry_id", validId);
        const { error: delErr } = await supabaseAdmin.from("journal_entries").delete().eq("id", validId);
        if (delErr) throw delErr;

        return NextResponse.json({ success: true, id: validId });
      }

      default:
        return NextResponse.json({ success: false, message: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Error in POST /api/erp/data:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
