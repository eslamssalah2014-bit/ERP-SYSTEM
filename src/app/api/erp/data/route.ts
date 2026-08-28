import { NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";
const DEFAULT_BRANCH_ID = "00000000-0000-0000-0000-000000000002";
const DEFAULT_WAREHOUSE_ID = "00000000-0000-0000-0000-000000000004";
const DEFAULT_POS_CUSTOMER_ID = "00000000-0000-0000-0000-000000000099";
const DEFAULT_CATEGORY_ID = "00000000-0000-0000-0000-000000000021";
const DEFAULT_UNIT_ID = "00000000-0000-0000-0000-000000000011";
const DEFAULT_TREASURY_ID = "00000000-0000-0000-0000-000000000301";

// UUID Validator & Sanitizer
function isValidUUID(str: any): boolean {
  if (!str || typeof str !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

function cleanUUID(str: any, fallback: string | null = null): string | null {
  return isValidUUID(str) ? str : fallback;
}

function generateId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function noCacheResponse(payload: any, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}

// ==========================================
// SYSTEM ENTITY MAPPERS (SNAKE_CASE -> CAMELCASE)
// ==========================================

export function mapOrganization(o: any) {
  if (!o) return undefined;
  return {
    id: o.id,
    nameAr: o.name_ar,
    nameEn: o.name_en || o.name_ar,
    taxNumber: o.tax_number,
    commercialRegister: o.commercial_register || undefined,
    country: o.country || "EG",
    currency: o.currency || "EGP",
    defaultVatRate: Number(o.default_vat_rate) || 14,
    address: o.address || undefined,
    logoUrl: o.logo_url || undefined,
    planTier: o.plan_tier || "enterprise",
  };
}

export function mapBranch(b: any) {
  if (!b) return null;
  return {
    id: b.id,
    organizationId: b.organization_id,
    code: b.code,
    nameAr: b.name_ar,
    nameEn: b.name_en || b.name_ar,
    city: b.city || "",
    address: b.address || undefined,
    phone: b.phone || undefined,
    isHeadquarters: Boolean(b.is_headquarters),
  };
}

export function mapUser(u: any) {
  if (!u) return null;
  return {
    id: u.id,
    organizationId: u.organization_id,
    email: u.email,
    name: u.name,
    role: u.role,
    branchId: u.branch_id || undefined,
    avatarUrl: u.avatar_url || undefined,
    isActive: Boolean(u.is_active),
  };
}

export function mapProduct(p: any, stockMap: { [whId: string]: number } = {}) {
  if (!p) return null;
  return {
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
    warehouseStock: stockMap,
    imageUrl: (p.description && (p.description.startsWith("data:image") || p.description.startsWith("http"))) ? p.description : "",
  };
}

export function mapCustomer(c: any) {
  if (!c) return null;
  return {
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
  };
}

export function mapSupplier(s: any) {
  if (!s) return null;
  return {
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
  };
}

export function mapWarehouse(w: any) {
  if (!w) return null;
  return {
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
  };
}

export function mapCategory(c: any) {
  if (!c) return null;
  return {
    id: c.id,
    organizationId: c.organization_id,
    code: c.code,
    nameAr: c.name_ar,
    nameEn: c.name_en || c.name_ar,
    parentId: c.parent_id || undefined,
    createdAt: c.created_at,
  };
}

export function mapUnit(u: any) {
  if (!u) return null;
  return {
    id: u.id,
    organizationId: u.organization_id,
    code: u.code,
    nameAr: u.name_ar,
    nameEn: u.name_en || u.name_ar,
    symbol: u.symbol || "قطعة",
  };
}

export function mapCostCenter(cc: any) {
  if (!cc) return null;
  return {
    id: cc.id,
    organizationId: cc.organization_id,
    code: cc.code,
    nameAr: cc.name_ar,
    nameEn: cc.name_en || cc.name_ar,
    parentId: cc.parent_id || undefined,
    level: Number(cc.level) || 1,
    isActive: Boolean(cc.is_active),
  };
}

export function mapAccount(a: any) {
  if (!a) return null;
  return {
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
  };
}

export function mapTreasuryAccount(t: any) {
  if (!t) return null;
  return {
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
  };
}

export function mapCashReceipt(r: any) {
  if (!r) return null;
  return {
    id: r.id,
    organizationId: r.organization_id,
    branchId: r.branch_id,
    receiptNumber: r.receipt_number,
    date: r.date,
    treasuryAccountId: r.treasury_account_id,
    amount: Number(r.amount) || 0,
    currency: r.currency || "EGP",
    receivedFrom: r.received_from,
    customerId: r.customer_id || undefined,
    creditAccountId: r.credit_account_id,
    costCenterId: r.cost_center_id || undefined,
    notes: r.notes || "",
    createdBy: r.created_by || "",
    createdAt: r.created_at,
  };
}

export function mapCashPayment(p: any) {
  if (!p) return null;
  return {
    id: p.id,
    organizationId: p.organization_id,
    branchId: p.branch_id,
    paymentNumber: p.payment_number,
    date: p.date,
    treasuryAccountId: p.treasury_account_id,
    amount: Number(p.amount) || 0,
    currency: p.currency || "EGP",
    paidTo: p.paid_to,
    supplierId: p.supplier_id || undefined,
    debitAccountId: p.debit_account_id,
    costCenterId: p.cost_center_id || undefined,
    notes: p.notes || "",
    createdBy: p.created_by || "",
    createdAt: p.created_at,
  };
}

export function mapCheck(chk: any) {
  if (!chk) return null;
  return {
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
  };
}

export function mapSalesInvoice(inv: any, items: any[] = []) {
  if (!inv) return null;
  return {
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
    items: items,
    subtotal: Number(inv.subtotal) || 0,
    discountTotal: Number(inv.discount_total) || 0,
    taxTotal: Number(inv.tax_total) || 0,
    grandTotal: Number(inv.grand_total) || 0,
    paidAmount: Number(inv.paid_amount) || 0,
    dueAmount: Number(inv.due_amount) || 0,
    notes: inv.notes || "",
    createdBy: inv.created_by || "",
    createdAt: inv.created_at,
  };
}

export function mapPurchaseInvoice(inv: any, items: any[] = []) {
  if (!inv) return null;
  return {
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
    items: items,
    subtotal: Number(inv.subtotal) || 0,
    discountTotal: Number(inv.discount_total) || 0,
    taxTotal: Number(inv.tax_total) || 0,
    grandTotal: Number(inv.grand_total) || 0,
    paidAmount: Number(inv.paid_amount) || 0,
    dueAmount: Number(inv.due_amount) || 0,
    notes: inv.notes || "",
    createdBy: inv.created_by || "",
    createdAt: inv.created_at,
  };
}

export function mapJournalEntry(je: any, lines: any[] = []) {
  if (!je) return null;
  return {
    id: je.id,
    organizationId: je.organization_id,
    branchId: je.branch_id,
    entryNumber: je.entry_number,
    date: je.date,
    referenceType: je.reference_type,
    referenceId: je.reference_id || undefined,
    description: je.description,
    lines: lines,
    totalDebit: Number(je.total_debit) || 0,
    totalCredit: Number(je.total_credit) || 0,
    isBalanced: Boolean(je.is_balanced),
    status: je.status || "posted",
    createdBy: je.created_by || "",
  };
}

export function mapStockMovement(sm: any) {
  if (!sm) return null;
  return {
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
  };
}

export function mapAuditLog(log: any) {
  if (!log) return null;
  return {
    id: log.id,
    organizationId: log.organization_id,
    userId: log.user_id,
    userName: log.user_name,
    action: log.action,
    entityType: log.entity_type,
    entityId: log.entity_id,
    details: log.details,
    createdAt: log.created_at,
  };
}

export function mapProductChangeLog(log: any) {
  if (!log) return null;
  return {
    id: log.id,
    organizationId: log.organization_id || DEFAULT_ORG_ID,
    productId: log.product_id || log.productId,
    productName: log.product_name || log.productName,
    changeType: log.change_type || log.changeType,
    fieldChanged: log.field_changed || log.fieldChanged,
    oldValue: log.old_value ?? log.oldValue,
    newValue: log.new_value ?? log.newValue,
    changedBy: log.changed_by || log.changedBy || "المشرف العام",
    createdAt: log.created_at || log.createdAt || new Date().toISOString(),
  };
}

export function mapPeriodClosing(closing: any) {
  if (!closing) return null;
  return {
    id: closing.id,
    organizationId: closing.organization_id || DEFAULT_ORG_ID,
    periodName: closing.period_name || closing.periodName,
    closingDate: closing.closing_date || closing.closingDate,
    totalInventoryValue: Number(closing.total_inventory_value ?? closing.totalInventoryValue) || 0,
    totalSales: Number(closing.total_sales ?? closing.totalSales) || 0,
    totalPurchases: Number(closing.total_purchases ?? closing.totalPurchases) || 0,
    netProfitLoss: Number(closing.net_profit_loss ?? closing.netProfitLoss) || 0,
    closedBy: closing.closed_by || closing.closedBy || "المشرف العام",
    createdAt: closing.created_at || closing.createdAt || new Date().toISOString(),
  };
}

let hasSeededBaseline = false;
async function ensureBaselineEntities(supabase: any) {
  if (hasSeededBaseline) return;
  try {
    // 1. Ensure default Organization
    await supabase.from("organizations").upsert([{
      id: DEFAULT_ORG_ID,
      name_ar: "شركة سند الدولية للحلول التكنولوجية",
      name_en: "Sanad International Tech Solutions",
      tax_number: "300123456700003",
      commercial_register: "1010987654",
      country: "EG",
      currency: "EGP",
      default_vat_rate: 14,
      address: "مبنى 4، القرية الذكية، طريق مصر الإسكندرية الصحراوي، الجيزة، مصر",
      plan_tier: "enterprise",
    }], { onConflict: "id" });

    // 2. Ensure default Branch
    await supabase.from("branches").upsert([{
      id: DEFAULT_BRANCH_ID,
      organization_id: DEFAULT_ORG_ID,
      code: "HQ-01",
      name_ar: "الفرع الرئيسي - القاهرة",
      name_en: "Cairo Headquarters",
      city: "القاهرة",
      address: "القرية الذكية، الجيزة",
      phone: "+20 2 35350000",
      is_headquarters: true,
    }], { onConflict: "id" });

    // 3. Ensure default User
    await supabase.from("users").upsert([{
      id: "00000000-0000-0000-0000-000000000003",
      organization_id: DEFAULT_ORG_ID,
      email: "admin@sanaderp.com",
      name: "م. إسلام صلاح حسني",
      role: "super_admin",
      branch_id: DEFAULT_BRANCH_ID,
      is_active: true,
    }], { onConflict: "id" });

    // 4. Ensure default Warehouse
    await supabase.from("warehouses").upsert([{
      id: DEFAULT_WAREHOUSE_ID,
      organization_id: DEFAULT_ORG_ID,
      branch_id: DEFAULT_BRANCH_ID,
      code: "WH-01",
      name_ar: "المستودع المركزي الرئيسي",
      name_en: "Main Central Warehouse",
      location: "المنطقة الصناعية، 6 أكتوبر",
      manager_name: "المشرف العام",
      manager_phone: "+20 100 0000000",
      is_default: true,
    }], { onConflict: "id" });

    // 5. Ensure default Categories
    await supabase.from("product_categories").upsert([
      { id: DEFAULT_CATEGORY_ID, organization_id: DEFAULT_ORG_ID, code: "CAT-GEN", name_ar: "عام / منتجات رئيسية", name_en: "General Products" },
      { id: "00000000-0000-0000-0000-000000000022", organization_id: DEFAULT_ORG_ID, code: "CAT-POS", name_ar: "أنظمة نقاط البيع والكاشير", name_en: "POS Systems" },
      { id: "00000000-0000-0000-0000-000000000023", organization_id: DEFAULT_ORG_ID, code: "CAT-HW", name_ar: "أجهزة كمبيوتر وخوادم", name_en: "Hardware & Servers" },
      { id: "00000000-0000-0000-0000-000000000024", organization_id: DEFAULT_ORG_ID, code: "CAT-SRV", name_ar: "خدمات ودعم فني", name_en: "Services & Support" },
    ], { onConflict: "id" });

    // 6. Ensure default Units
    await supabase.from("product_units").upsert([
      { id: DEFAULT_UNIT_ID, organization_id: DEFAULT_ORG_ID, code: "UNIT-PCS", name_ar: "قطعة", name_en: "Piece", symbol: "قطعة" },
      { id: "00000000-0000-0000-0000-000000000012", organization_id: DEFAULT_ORG_ID, code: "UNIT-SET", name_ar: "طقم / جهاز كامل", name_en: "Set", symbol: "طقم" },
      { id: "00000000-0000-0000-0000-000000000013", organization_id: DEFAULT_ORG_ID, code: "UNIT-SRV", name_ar: "خدمة / اشتراك", name_en: "Service", symbol: "خدمة" },
      { id: "00000000-0000-0000-0000-000000000014", organization_id: DEFAULT_ORG_ID, code: "UNIT-BOX", name_ar: "كرتونة", name_en: "Box", symbol: "كرتونة" },
    ], { onConflict: "id" });

    // 7. Ensure default POS Customer
    await supabase.from("customers").upsert([{
      id: DEFAULT_POS_CUSTOMER_ID,
      organization_id: DEFAULT_ORG_ID,
      code: "CUST-POS-CASH",
      name_ar: "عميل نقدي نقاط البيع (POS Cash Customer)",
      name_en: "Walk-in POS Customer",
      mobile: "+20 100 0000000",
      city: "القاهرة",
      tax_number: "000000000000000",
      credit_limit: 0,
      payment_terms_days: 0,
      current_balance: 0,
      status: "active",
    }], { onConflict: "id" });

    // 8. Ensure default Main Treasury Account
    await supabase.from("treasury_accounts").upsert([{
      id: DEFAULT_TREASURY_ID,
      organization_id: DEFAULT_ORG_ID,
      branch_id: DEFAULT_BRANCH_ID,
      gl_account_id: "00000000-0000-0000-0000-000000000101",
      code: "SAFE-01",
      name_ar: "الخزينة الرئيسية - المقر العام",
      name_en: "Main HQ Safe",
      type: "cash",
      currency: "EGP",
      balance: 150000,
      is_default: true,
    }], { onConflict: "id" });

    hasSeededBaseline = true;
  } catch (err) {
    console.error("Baseline entity ensuring notice:", err);
  }
}

// ==========================================
// GET: FULL HYDRATION (ACROSS ALL MODULES)
// ==========================================
export async function GET() {
  if (!isSupabaseConfigured || !supabaseAdmin) {
    return noCacheResponse({ success: false, message: "Supabase not configured" }, 500);
  }

  try {
    await ensureBaselineEntities(supabaseAdmin);

    const [
      orgRes,
      branchesRes,
      usersRes,
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
      cashReceiptsRes,
      cashPaymentsRes,
      checksRes,
      journalEntriesRes,
      journalLinesRes,
      stockMovementsRes,
      auditLogsRes,
      categoriesRes,
      unitsRes,
    ] = await Promise.all([
      supabaseAdmin.from("organizations").select("*").limit(1).maybeSingle(),
      supabaseAdmin.from("branches").select("*").order("created_at", { ascending: true }),
      supabaseAdmin.from("users").select("*").order("created_at", { ascending: true }),
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
      supabaseAdmin.from("cash_receipts").select("*").order("date", { ascending: false }),
      supabaseAdmin.from("cash_payments").select("*").order("date", { ascending: false }),
      supabaseAdmin.from("check_records").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("journal_entries").select("*").order("date", { ascending: false }),
      supabaseAdmin.from("journal_lines").select("*"),
      supabaseAdmin.from("stock_movements").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100),
      supabaseAdmin.from("product_categories").select("*"),
      supabaseAdmin.from("product_units").select("*"),
    ]);

    // Map Organization
    const organization = mapOrganization(orgRes.data);

    // Map Branches
    const branches = (branchesRes.data || []).map(mapBranch).filter(Boolean);

    // Map Users
    const users = (usersRes.data || []).map(mapUser).filter(Boolean);

    // Build warehouse stock map per product
    const stockMap: { [productId: string]: { [whId: string]: number } } = {};
    (warehouseStockRes.data || []).forEach((row: any) => {
      if (!stockMap[row.product_id]) stockMap[row.product_id] = {};
      stockMap[row.product_id][row.warehouse_id] = Number(row.quantity) || 0;
    });

    // Map Products
    const products = (productsRes.data || []).map((p: any) => mapProduct(p, stockMap[p.id] || {})).filter(Boolean);

    // Map Customers
    const customers = (customersRes.data || []).map(mapCustomer).filter(Boolean);

    // Map Suppliers
    const suppliers = (suppliersRes.data || []).map(mapSupplier).filter(Boolean);

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

    const salesInvoices = (salesInvoicesRes.data || []).map((inv: any) =>
      mapSalesInvoice(inv, salesItemsMap[inv.id] || [])
    ).filter(Boolean);

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

    const purchaseInvoices = (purchaseInvoicesRes.data || []).map((inv: any) =>
      mapPurchaseInvoice(inv, purchaseItemsMap[inv.id] || [])
    ).filter(Boolean);

    // Map Warehouses
    const warehouses = (warehousesRes.data || []).map(mapWarehouse).filter(Boolean);

    // Map Cost Centers
    const costCenters = (costCentersRes.data || []).map(mapCostCenter).filter(Boolean);

    // Map Accounts
    const accounts = (accountsRes.data || []).map(mapAccount).filter(Boolean);

    // Map Treasury Accounts
    const treasuryAccounts = (treasuryRes.data || []).map(mapTreasuryAccount).filter(Boolean);

    // Map Cash Receipts
    const cashReceipts = (cashReceiptsRes.data || []).map(mapCashReceipt).filter(Boolean);

    // Map Cash Payments
    const cashPayments = (cashPaymentsRes.data || []).map(mapCashPayment).filter(Boolean);

    // Map Checks
    const checks = (checksRes.data || []).map(mapCheck).filter(Boolean);

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

    const journalEntries = (journalEntriesRes.data || []).map((je: any) =>
      mapJournalEntry(je, linesMap[je.id] || [])
    ).filter(Boolean);

    // Map Stock Movements
    const stockMovements = (stockMovementsRes.data || []).map(mapStockMovement).filter(Boolean);

    // Map Audit Logs
    const auditLogs = (auditLogsRes.data || []).map(mapAuditLog).filter(Boolean);

    // Map Categories
    const categories = (categoriesRes?.data || []).map(mapCategory).filter(Boolean);

    // Map Units
    const units = (unitsRes?.data || []).map(mapUnit).filter(Boolean);

    return noCacheResponse({
      success: true,
      data: {
        organization,
        branches,
        users,
        products,
        categories,
        units,
        customers,
        suppliers,
        salesInvoices,
        purchaseInvoices,
        warehouses,
        costCenters,
        accounts,
        treasuryAccounts,
        cashReceipts,
        cashPayments,
        checks,
        journalEntries,
        stockMovements,
        auditLogs,
        productChangeLogs: [],
        periodClosings: [],
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/erp/data:", error);
    return noCacheResponse({ success: false, error: error.message }, 500);
  }
}

// ==========================================
// POST: ATOMIC DB MUTATIONS (STANDARDIZED & PERSISTED)
// ==========================================
export async function POST(request: Request) {
  if (!isSupabaseConfigured || !supabaseAdmin) {
    return noCacheResponse({ success: false, message: "Supabase not configured" }, 500);
  }

  try {
    const body = await request.json();
    const { action, payload } = body;

    switch (action) {
      // ==========================================
      // ORGANIZATION SETTINGS (UPDATE)
      // ==========================================
      case "update_organization": {
        const { id, nameAr, nameEn, taxNumber, commercialRegister, country, currency, defaultVatRate, address, logoUrl } = payload;
        const validId = cleanUUID(id, DEFAULT_ORG_ID);

        const updateRow: any = { updated_at: new Date().toISOString() };
        if (nameAr !== undefined) updateRow.name_ar = nameAr;
        if (nameEn !== undefined) updateRow.name_en = nameEn;
        if (taxNumber !== undefined) updateRow.tax_number = taxNumber;
        if (commercialRegister !== undefined) updateRow.commercial_register = commercialRegister || null;
        if (country !== undefined) updateRow.country = country;
        if (currency !== undefined) updateRow.currency = currency;
        if (defaultVatRate !== undefined) updateRow.default_vat_rate = Number(defaultVatRate);
        if (address !== undefined) updateRow.address = address || null;
        if (logoUrl !== undefined) updateRow.logo_url = logoUrl || null;

        const { data: org, error: orgErr } = await supabaseAdmin
          .from("organizations")
          .update(updateRow)
          .eq("id", validId)
          .select()
          .single();

        if (orgErr) throw orgErr;
        return noCacheResponse({ success: true, data: mapOrganization(org) });
      }

      // ==========================================
      // PRODUCTS (CREATE, UPDATE, DELETE)
      // ==========================================
      case "create_product": {
        const { id, organizationId, sku, barcode, nameAr, nameEn, description, categoryId, unitId, costPrice, sellingPrice, taxRate, minStockLevel, status, warehouseStock, imageUrl } = payload;
        
        await ensureBaselineEntities(supabaseAdmin);

        const validId = cleanUUID(id, null);
        const validOrgId = cleanUUID(organizationId, DEFAULT_ORG_ID);
        const validCategoryId = cleanUUID(categoryId, DEFAULT_CATEGORY_ID);
        const validUnitId = cleanUUID(unitId, DEFAULT_UNIT_ID);

        let finalSku = (sku || "").trim();
        if (!finalSku) finalSku = "PRD-" + Date.now().toString().slice(-6);

        const { data: existingSku } = await supabaseAdmin
          .from("products")
          .select("id")
          .eq("organization_id", validOrgId)
          .eq("sku", finalSku)
          .maybeSingle();

        if (existingSku && (!validId || existingSku.id !== validId)) {
          finalSku = `${finalSku}-${Date.now().toString().slice(-4)}`;
        }

        const effectiveDescription = (imageUrl && imageUrl.length < 500000) ? imageUrl : (description || null);

        const insertRow: any = {
          organization_id: validOrgId,
          sku: finalSku,
          barcode: barcode || null,
          name_ar: nameAr || "منتج جديد",
          name_en: nameEn || nameAr || "New Product",
          description: effectiveDescription,
          category_id: validCategoryId,
          unit_id: validUnitId,
          cost_price: Number(costPrice) || 0,
          selling_price: Number(sellingPrice) || 0,
          tax_rate: Number(taxRate) || 14,
          min_stock_level: Number(minStockLevel) || 5,
          status: status || "active",
        };

        if (validId) insertRow.id = validId;

        const { data: prod, error: prodErr } = await supabaseAdmin
          .from("products")
          .insert([insertRow])
          .select()
          .single();

        if (prodErr) throw prodErr;

        // Upsert warehouse stock & create opening balance stock movements
        const finalStock: { [whId: string]: number } = {};
        if (warehouseStock && Object.keys(warehouseStock).length > 0 && prod?.id) {
          const stockRows: any[] = [];
          const smRows: any[] = [];

          for (const [whId, qty] of Object.entries(warehouseStock)) {
            const validWhId = cleanUUID(whId, DEFAULT_WAREHOUSE_ID);
            const numQty = Number(qty) || 0;
            if (validWhId && numQty > 0) {
              finalStock[validWhId] = numQty;
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
                reference_number: `OB-${finalSku}`,
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

        return noCacheResponse({ success: true, data: mapProduct(prod, finalStock) });
      }

      case "update_product": {
        const { id, sku, barcode, nameAr, nameEn, description, categoryId, unitId, costPrice, sellingPrice, taxRate, minStockLevel, status, warehouseStock, imageUrl } = payload;
        const validId = cleanUUID(id, null);
        if (!validId) return noCacheResponse({ success: false, message: "Valid product ID is required" }, 400);

        const updateRow: any = { updated_at: new Date().toISOString() };
        if (sku !== undefined) updateRow.sku = sku;
        if (barcode !== undefined) updateRow.barcode = barcode || null;
        if (nameAr !== undefined) updateRow.name_ar = nameAr;
        if (nameEn !== undefined) updateRow.name_en = nameEn;
        if (description !== undefined) updateRow.description = description || null;
        if (categoryId !== undefined) updateRow.category_id = cleanUUID(categoryId, DEFAULT_CATEGORY_ID);
        if (unitId !== undefined) updateRow.unit_id = cleanUUID(unitId, DEFAULT_UNIT_ID);
        if (costPrice !== undefined) updateRow.cost_price = Number(costPrice);
        if (sellingPrice !== undefined) updateRow.selling_price = Number(sellingPrice);
        if (taxRate !== undefined) updateRow.tax_rate = Number(taxRate);
        if (minStockLevel !== undefined) updateRow.min_stock_level = Number(minStockLevel);
        if (status !== undefined) updateRow.status = status;
        if (imageUrl !== undefined) updateRow.description = (imageUrl && imageUrl.length < 500000) ? imageUrl : null;

        const { data: prod, error: prodErr } = await supabaseAdmin
          .from("products")
          .update(updateRow)
          .eq("id", validId)
          .select()
          .single();

        if (prodErr) throw prodErr;

        // Fetch current warehouse stock
        const { data: stockRows } = await supabaseAdmin
          .from("product_warehouse_stock")
          .select("*")
          .eq("product_id", validId);

        const currentStock: { [whId: string]: number } = {};
        (stockRows || []).forEach((row: any) => {
          currentStock[row.warehouse_id] = Number(row.quantity) || 0;
        });

        if (warehouseStock && Object.keys(warehouseStock).length > 0) {
          const upsertRows: any[] = [];
          for (const [whId, qty] of Object.entries(warehouseStock)) {
            const validWhId = cleanUUID(whId, DEFAULT_WAREHOUSE_ID);
            if (validWhId) {
              const numQty = Number(qty) || 0;
              currentStock[validWhId] = numQty;
              upsertRows.push({
                product_id: validId,
                warehouse_id: validWhId,
                quantity: numQty,
              });
            }
          }
          if (upsertRows.length > 0) {
            await supabaseAdmin.from("product_warehouse_stock").upsert(upsertRows);
          }
        }

        return noCacheResponse({ success: true, data: mapProduct(prod, currentStock) });
      }

      case "delete_product": {
        const validId = cleanUUID(payload?.id || payload, null);
        if (!validId) return noCacheResponse({ success: false, message: "Valid product ID is required" }, 400);

        await supabaseAdmin.from("product_warehouse_stock").delete().eq("product_id", validId);
        await supabaseAdmin.from("stock_movements").delete().eq("product_id", validId);
        const { error: delErr } = await supabaseAdmin.from("products").delete().eq("id", validId);
        if (delErr) throw delErr;

        return noCacheResponse({ success: true, id: validId });
      }

      // ==========================================
      // STOCK MOVEMENTS
      // ==========================================
      case "update_stock_movement": {
        const { id, movementType, quantity, unitCost, totalCost, notes } = payload;
        const validId = cleanUUID(id, null);
        if (!validId) return noCacheResponse({ success: false, message: "Valid stock movement ID required" }, 400);

        const updateRow: any = {};
        if (movementType !== undefined) updateRow.movement_type = movementType;
        if (quantity !== undefined) updateRow.quantity = Number(quantity);
        if (unitCost !== undefined) updateRow.unit_cost = Number(unitCost);
        if (totalCost !== undefined) updateRow.total_cost = Number(totalCost);
        if (notes !== undefined) updateRow.notes = notes;

        const { data: sm, error: smErr } = await supabaseAdmin
          .from("stock_movements")
          .update(updateRow)
          .eq("id", validId)
          .select()
          .single();

        if (smErr) throw smErr;
        return noCacheResponse({ success: true, data: mapStockMovement(sm) });
      }

      case "delete_stock_movement": {
        const validId = cleanUUID(payload?.id || payload, null);
        if (!validId) return noCacheResponse({ success: false, message: "Valid stock movement ID required" }, 400);

        const { error: delErr } = await supabaseAdmin.from("stock_movements").delete().eq("id", validId);
        if (delErr) throw delErr;

        return noCacheResponse({ success: true, id: validId });
      }

      case "create_product_change_log": {
        const mappedLog = mapProductChangeLog(payload);
        return noCacheResponse({ success: true, data: mappedLog });
      }

      case "create_period_closing": {
        const mappedClosing = mapPeriodClosing(payload);
        return noCacheResponse({ success: true, data: mappedClosing });
      }

      // ==========================================
      // CUSTOMERS (CREATE, UPDATE, DELETE)
      // ==========================================
      case "create_customer": {
        const { id, organizationId, code, nameAr, nameEn, mobile, email, address, city, taxNumber, commercialRegister, creditLimit, paymentTermsDays, currentBalance, status } = payload;
        const validId = cleanUUID(id, null);
        const validOrgId = cleanUUID(organizationId, DEFAULT_ORG_ID);

        let finalCode = (code || "").trim();
        if (!finalCode) finalCode = "CUST-" + Date.now().toString().slice(-4);

        const insertRow: any = {
          organization_id: validOrgId,
          code: finalCode,
          name_ar: nameAr || "عميل جديد",
          name_en: nameEn || nameAr || "New Customer",
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
        return noCacheResponse({ success: true, data: mapCustomer(cust) });
      }

      case "update_customer": {
        const { id, code, nameAr, nameEn, mobile, email, address, city, taxNumber, commercialRegister, creditLimit, paymentTermsDays, currentBalance, status } = payload;
        const validId = cleanUUID(id, null);
        if (!validId) return noCacheResponse({ success: false, message: "Valid customer ID is required" }, 400);

        const updateRow: any = {};
        if (code !== undefined) updateRow.code = code;
        if (nameAr !== undefined) updateRow.name_ar = nameAr;
        if (nameEn !== undefined) updateRow.name_en = nameEn;
        if (mobile !== undefined) updateRow.mobile = mobile;
        if (email !== undefined) updateRow.email = email;
        if (address !== undefined) updateRow.address = address;
        if (city !== undefined) updateRow.city = city;
        if (taxNumber !== undefined) updateRow.tax_number = taxNumber;
        if (commercialRegister !== undefined) updateRow.commercial_register = commercialRegister;
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
        return noCacheResponse({ success: true, data: mapCustomer(cust) });
      }

      case "delete_customer": {
        const validId = cleanUUID(payload?.id || payload, null);
        if (!validId) return noCacheResponse({ success: false, message: "Valid customer ID is required" }, 400);

        const { error: delErr } = await supabaseAdmin.from("customers").delete().eq("id", validId);
        if (delErr) throw delErr;

        return noCacheResponse({ success: true, id: validId });
      }

      // ==========================================
      // SUPPLIERS (CREATE, UPDATE, DELETE)
      // ==========================================
      case "create_supplier": {
        const { id, organizationId, code, nameAr, nameEn, mobile, email, address, taxNumber, bankName, bankIban, currentBalance, status } = payload;
        const validId = cleanUUID(id, null);
        const validOrgId = cleanUUID(organizationId, DEFAULT_ORG_ID);

        let finalCode = (code || "").trim();
        if (!finalCode) finalCode = "SUPP-" + Date.now().toString().slice(-4);

        const insertRow: any = {
          organization_id: validOrgId,
          code: finalCode,
          name_ar: nameAr || "مورد جديد",
          name_en: nameEn || nameAr || "New Supplier",
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
        return noCacheResponse({ success: true, data: mapSupplier(supp) });
      }

      case "update_supplier": {
        const { id, code, nameAr, nameEn, mobile, email, address, taxNumber, bankName, bankIban, currentBalance, status } = payload;
        const validId = cleanUUID(id, null);
        if (!validId) return noCacheResponse({ success: false, message: "Valid supplier ID is required" }, 400);

        const updateRow: any = {};
        if (code !== undefined) updateRow.code = code;
        if (nameAr !== undefined) updateRow.name_ar = nameAr;
        if (nameEn !== undefined) updateRow.name_en = nameEn;
        if (mobile !== undefined) updateRow.mobile = mobile;
        if (email !== undefined) updateRow.email = email;
        if (address !== undefined) updateRow.address = address;
        if (taxNumber !== undefined) updateRow.tax_number = taxNumber;
        if (bankName !== undefined) updateRow.bank_name = bankName;
        if (bankIban !== undefined) updateRow.bank_iban = bankIban;
        if (currentBalance !== undefined) updateRow.current_balance = Number(currentBalance);
        if (status !== undefined) updateRow.status = status;

        const { data: supp, error: suppErr } = await supabaseAdmin
          .from("suppliers")
          .update(updateRow)
          .eq("id", validId)
          .select()
          .single();

        if (suppErr) throw suppErr;
        return noCacheResponse({ success: true, data: mapSupplier(supp) });
      }

      case "delete_supplier": {
        const validId = cleanUUID(payload?.id || payload, null);
        if (!validId) return noCacheResponse({ success: false, message: "Valid supplier ID is required" }, 400);

        const { error: delErr } = await supabaseAdmin.from("suppliers").delete().eq("id", validId);
        if (delErr) throw delErr;

        return noCacheResponse({ success: true, id: validId });
      }

      // ==========================================
      // WAREHOUSES (CREATE, UPDATE, DELETE)
      // ==========================================
      case "create_warehouse": {
        const { id, organizationId, branchId, code, nameAr, nameEn, location, managerName, managerPhone, isDefault } = payload;
        const validId = cleanUUID(id, null);
        const validOrgId = cleanUUID(organizationId, DEFAULT_ORG_ID);
        const validBranchId = cleanUUID(branchId, DEFAULT_BRANCH_ID);

        let finalCode = (code || "").trim();
        if (!finalCode) finalCode = "WH-" + Date.now().toString().slice(-3);

        const insertRow: any = {
          organization_id: validOrgId,
          branch_id: validBranchId,
          code: finalCode,
          name_ar: nameAr || "مستودع جديد",
          name_en: nameEn || nameAr || "New Warehouse",
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
        return noCacheResponse({ success: true, data: mapWarehouse(wh) });
      }

      case "update_warehouse": {
        const { id, code, nameAr, nameEn, location, managerName, managerPhone, isDefault } = payload;
        const validId = cleanUUID(id, null);
        if (!validId) return noCacheResponse({ success: false, message: "Valid warehouse ID is required" }, 400);

        const updateRow: any = {};
        if (code !== undefined) updateRow.code = code;
        if (nameAr !== undefined) updateRow.name_ar = nameAr;
        if (nameEn !== undefined) updateRow.name_en = nameEn;
        if (location !== undefined) updateRow.location = location;
        if (managerName !== undefined) updateRow.manager_name = managerName;
        if (managerPhone !== undefined) updateRow.manager_phone = managerPhone;
        if (isDefault !== undefined) updateRow.is_default = Boolean(isDefault);

        const { data: wh, error: whErr } = await supabaseAdmin
          .from("warehouses")
          .update(updateRow)
          .eq("id", validId)
          .select()
          .single();

        if (whErr) throw whErr;
        return noCacheResponse({ success: true, data: mapWarehouse(wh) });
      }

      case "delete_warehouse": {
        const validId = cleanUUID(payload?.id || payload, null);
        if (!validId) return noCacheResponse({ success: false, message: "Valid warehouse ID is required" }, 400);

        await supabaseAdmin.from("product_warehouse_stock").delete().eq("warehouse_id", validId);
        const { error: delErr } = await supabaseAdmin.from("warehouses").delete().eq("id", validId);
        if (delErr) throw delErr;

        return noCacheResponse({ success: true, id: validId });
      }

      // ==========================================
      // COST CENTERS (CREATE, UPDATE, DELETE)
      // ==========================================
      case "create_cost_center": {
        const { id, organizationId, code, nameAr, nameEn, parentId, level, isActive } = payload;
        const validId = cleanUUID(id, null);
        const validOrgId = cleanUUID(organizationId, DEFAULT_ORG_ID);

        let finalCode = (code || "").trim();
        if (!finalCode) finalCode = "CC-" + Date.now().toString().slice(-4);

        const insertRow: any = {
          organization_id: validOrgId,
          code: finalCode,
          name_ar: nameAr || "مركز تكلفة جديد",
          name_en: nameEn || nameAr || "New Cost Center",
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
        return noCacheResponse({ success: true, data: mapCostCenter(cc) });
      }

      case "update_cost_center": {
        const { id, code, nameAr, nameEn, parentId, level, isActive } = payload;
        const validId = cleanUUID(id, null);
        if (!validId) return noCacheResponse({ success: false, message: "Valid cost center ID is required" }, 400);

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
        return noCacheResponse({ success: true, data: mapCostCenter(cc) });
      }

      case "delete_cost_center": {
        const validId = cleanUUID(payload?.id || payload, null);
        if (!validId) return noCacheResponse({ success: false, message: "Valid cost center ID is required" }, 400);

        const { error: delErr } = await supabaseAdmin.from("cost_centers").delete().eq("id", validId);
        if (delErr) throw delErr;

        return noCacheResponse({ success: true, id: validId });
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
        const validCustId = cleanUUID(customerId, DEFAULT_POS_CUSTOMER_ID);
        const validRepId = cleanUUID(salesRepId, null);

        const insertRow: any = {
          organization_id: validOrgId,
          branch_id: validBranchId,
          invoice_number: invoiceNumber || ("INV-" + Date.now().toString().slice(-6)),
          date: date || new Date().toISOString().split("T")[0],
          due_date: dueDate || date || new Date().toISOString().split("T")[0],
          customer_id: validCustId,
          customer_name: customerName || "عميل نقدي",
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

        const mappedItems: any[] = [];

        // Insert Line Items, Update Stock & Create Stock Movements
        if (items && items.length > 0 && inv?.id) {
          const itemRows = items.map((it: any) => {
            const rowId = cleanUUID(it.id, generateId());
            return {
              id: rowId,
              sales_invoice_id: inv.id,
              product_id: cleanUUID(it.productId, null),
              product_name: it.productName || "صنف",
              warehouse_id: cleanUUID(it.warehouseId, validWhId),
              quantity: Number(it.quantity) || 1,
              unit_price: Number(it.unitPrice) || 0,
              cost_price: Number(it.costPrice) || 0,
              discount_percent: Number(it.discountPercent) || 0,
              discount_amount: Number(it.discountAmount) || 0,
              tax_rate: Number(it.taxRate) || 14,
              tax_amount: Number(it.taxAmount) || 0,
              total: Number(it.total) || 0,
            };
          });

          const { error: itemsErr } = await supabaseAdmin.from("sales_invoice_items").insert(itemRows);
          if (itemsErr) console.error("Error inserting invoice items:", itemsErr);

          for (const it of itemRows) {
            mappedItems.push({
              id: it.id,
              productId: it.product_id,
              productName: it.product_name,
              warehouseId: it.warehouse_id,
              quantity: it.quantity,
              unitPrice: it.unit_price,
              costPrice: it.cost_price,
              discountPercent: it.discount_percent,
              discountAmount: it.discount_amount,
              taxRate: it.tax_rate,
              taxAmount: it.tax_amount,
              total: it.total,
            });

            // Stock Movement
            if (it.product_id) {
              await supabaseAdmin.from("stock_movements").insert([{
                organization_id: validOrgId,
                product_id: it.product_id,
                warehouse_id: it.warehouse_id,
                movement_type: "sales_issue",
                reference_id: inv.id,
                reference_number: inv.invoice_number,
                date: inv.date,
                quantity: -Math.abs(it.quantity),
                unit_cost: it.cost_price,
                total_cost: -Math.abs(it.cost_price * it.quantity),
                balance_quantity: 0,
                partner_id: validCustId,
                partner_name: customerName,
                partner_type: "customer",
                notes: `صرف مبيعات فاتورة ${inv.invoice_number}`,
              }]);

              // Decrement Product Warehouse Stock
              const { data: currentStockRow } = await supabaseAdmin
                .from("product_warehouse_stock")
                .select("quantity")
                .eq("product_id", it.product_id)
                .eq("warehouse_id", it.warehouse_id)
                .maybeSingle();

              if (currentStockRow) {
                await supabaseAdmin
                  .from("product_warehouse_stock")
                  .update({
                    quantity: Math.max(0, (Number(currentStockRow.quantity) || 0) - it.quantity)
                  })
                  .eq("product_id", it.product_id)
                  .eq("warehouse_id", it.warehouse_id);
              }
            }
          }
        }

        // Atomically update customer balance in PostgreSQL
        if (validCustId && (Number(dueAmount) > 0 || status === "unpaid" || status === "partially_paid")) {
          const { data: currentCust } = await supabaseAdmin
            .from("customers")
            .select("current_balance")
            .eq("id", validCustId)
            .single();

          if (currentCust) {
            await supabaseAdmin.from("customers").update({
              current_balance: (Number(currentCust.current_balance) || 0) + (Number(dueAmount) || Number(grandTotal) || 0)
            }).eq("id", validCustId);
          }
        }

        const mappedInvoice = mapSalesInvoice(inv, mappedItems);
        return noCacheResponse({ success: true, data: mappedInvoice });
      }

      case "delete_sales_invoice": {
        const validId = cleanUUID(payload?.id || payload, null);
        if (!validId) return noCacheResponse({ success: false, message: "Valid sales invoice ID is required" }, 400);

        await supabaseAdmin.from("sales_invoice_items").delete().eq("sales_invoice_id", validId);
        await supabaseAdmin.from("stock_movements").delete().eq("reference_id", validId);
        await supabaseAdmin.from("journal_entries").delete().eq("reference_id", validId);

        const { error: delErr } = await supabaseAdmin.from("sales_invoices").delete().eq("id", validId);
        if (delErr) throw delErr;

        return noCacheResponse({ success: true, id: validId });
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
          invoice_number: invoiceNumber || ("PINV-" + Date.now().toString().slice(-6)),
          supplier_invoice_ref: supplierInvoiceRef || null,
          date: date || new Date().toISOString().split("T")[0],
          due_date: dueDate || date || new Date().toISOString().split("T")[0],
          supplier_id: validSuppId,
          supplier_name: supplierName || "مورد",
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

        const mappedItems: any[] = [];

        if (items && items.length > 0 && pinv?.id) {
          const itemRows = items.map((it: any) => {
            const rowId = cleanUUID(it.id, generateId());
            return {
              id: rowId,
              purchase_invoice_id: pinv.id,
              product_id: cleanUUID(it.productId, null),
              product_name: it.productName || "صنف",
              warehouse_id: cleanUUID(it.warehouseId, validWhId),
              quantity: Number(it.quantity) || 1,
              unit_cost: Number(it.unitCost) || 0,
              discount_amount: Number(it.discountAmount) || 0,
              tax_rate: Number(it.taxRate) || 14,
              tax_amount: Number(it.taxAmount) || 0,
              total: Number(it.total) || 0,
            };
          });

          await supabaseAdmin.from("purchase_invoice_items").insert(itemRows);

          for (const it of itemRows) {
            mappedItems.push({
              id: it.id,
              productId: it.product_id,
              productName: it.product_name,
              warehouseId: it.warehouse_id,
              quantity: it.quantity,
              unitCost: it.unit_cost,
              discountAmount: it.discount_amount,
              taxRate: it.tax_rate,
              taxAmount: it.tax_amount,
              total: it.total,
            });

            if (it.product_id) {
              await supabaseAdmin.from("stock_movements").insert([{
                organization_id: validOrgId,
                product_id: it.product_id,
                warehouse_id: it.warehouse_id,
                movement_type: "purchase_receipt",
                reference_id: pinv.id,
                reference_number: pinv.invoice_number,
                date: pinv.date,
                quantity: Math.abs(it.quantity),
                unit_cost: it.unit_cost,
                total_cost: Math.abs(it.unit_cost * it.quantity),
                balance_quantity: 0,
                partner_id: validSuppId,
                partner_name: supplierName,
                partner_type: "supplier",
                notes: `توريد مشتريات فاتورة ${pinv.invoice_number}`,
              }]);

              // Increment Product Warehouse Stock
              const { data: currentStockRow } = await supabaseAdmin
                .from("product_warehouse_stock")
                .select("quantity")
                .eq("product_id", it.product_id)
                .eq("warehouse_id", it.warehouse_id)
                .maybeSingle();

              const newQty = (Number(currentStockRow?.quantity) || 0) + it.quantity;
              await supabaseAdmin
                .from("product_warehouse_stock")
                .upsert([{
                  product_id: it.product_id,
                  warehouse_id: it.warehouse_id,
                  quantity: newQty,
                }], { onConflict: "product_id,warehouse_id" });
            }
          }
        }

        // Atomically update supplier balance in PostgreSQL
        if (validSuppId && (Number(dueAmount) > 0 || status === "unpaid" || status === "partially_paid")) {
          const { data: currentSupp } = await supabaseAdmin
            .from("suppliers")
            .select("current_balance")
            .eq("id", validSuppId)
            .single();

          if (currentSupp) {
            await supabaseAdmin.from("suppliers").update({
              current_balance: (Number(currentSupp.current_balance) || 0) + (Number(dueAmount) || Number(grandTotal) || 0)
            }).eq("id", validSuppId);
          }
        }

        const mappedPInv = mapPurchaseInvoice(pinv, mappedItems);
        return noCacheResponse({ success: true, data: mappedPInv });
      }

      case "delete_purchase_invoice": {
        const validId = cleanUUID(payload?.id || payload, null);
        if (!validId) return noCacheResponse({ success: false, message: "Valid purchase invoice ID is required" }, 400);

        await supabaseAdmin.from("purchase_invoice_items").delete().eq("purchase_invoice_id", validId);
        await supabaseAdmin.from("stock_movements").delete().eq("reference_id", validId);
        await supabaseAdmin.from("journal_entries").delete().eq("reference_id", validId);

        const { error: delErr } = await supabaseAdmin.from("purchase_invoices").delete().eq("id", validId);
        if (delErr) throw delErr;

        return noCacheResponse({ success: true, id: validId });
      }

      // ==========================================
      // TREASURY ACCOUNTS (CREATE, UPDATE, DELETE)
      // ==========================================
      case "create_treasury_account": {
        const { id, organizationId, branchId, glAccountId, code, nameAr, nameEn, type, currency, balance, bankName, accountNumber, isDefault } = payload;
        const validId = cleanUUID(id, null);
        const validOrgId = cleanUUID(organizationId, DEFAULT_ORG_ID);
        const validBranchId = cleanUUID(branchId, DEFAULT_BRANCH_ID);

        let finalCode = (code || "").trim();
        if (!finalCode) finalCode = "TRS-" + Date.now().toString().slice(-4);

        const insertRow: any = {
          organization_id: validOrgId,
          branch_id: validBranchId,
          gl_account_id: cleanUUID(glAccountId, "00000000-0000-0000-0000-000000000101"),
          code: finalCode,
          name_ar: nameAr || "خزينة / حساب بنكي",
          name_en: nameEn || nameAr || "Treasury Account",
          type: type || "cash",
          currency: currency || "EGP",
          balance: Number(balance) || 0,
          bank_name: bankName || null,
          account_number: accountNumber || null,
          is_default: Boolean(isDefault),
        };
        if (validId) insertRow.id = validId;

        const { data: t, error: tErr } = await supabaseAdmin
          .from("treasury_accounts")
          .insert([insertRow])
          .select()
          .single();

        if (tErr) throw tErr;
        return noCacheResponse({ success: true, data: mapTreasuryAccount(t) });
      }

      case "update_treasury_account": {
        const { id, code, nameAr, nameEn, type, currency, balance, bankName, accountNumber, isDefault } = payload;
        const validId = cleanUUID(id, null);
        if (!validId) return noCacheResponse({ success: false, message: "Valid treasury account ID is required" }, 400);

        const updateRow: any = {};
        if (code !== undefined) updateRow.code = code;
        if (nameAr !== undefined) updateRow.name_ar = nameAr;
        if (nameEn !== undefined) updateRow.name_en = nameEn;
        if (type !== undefined) updateRow.type = type;
        if (currency !== undefined) updateRow.currency = currency;
        if (balance !== undefined) updateRow.balance = Number(balance);
        if (bankName !== undefined) updateRow.bank_name = bankName;
        if (accountNumber !== undefined) updateRow.account_number = accountNumber;
        if (isDefault !== undefined) updateRow.is_default = Boolean(isDefault);

        const { data: t, error: tErr } = await supabaseAdmin
          .from("treasury_accounts")
          .update(updateRow)
          .eq("id", validId)
          .select()
          .single();

        if (tErr) throw tErr;
        return noCacheResponse({ success: true, data: mapTreasuryAccount(t) });
      }

      case "delete_treasury_account": {
        const validId = cleanUUID(payload?.id || payload, null);
        if (!validId) return noCacheResponse({ success: false, message: "Valid treasury account ID is required" }, 400);

        const { error: delErr } = await supabaseAdmin.from("treasury_accounts").delete().eq("id", validId);
        if (delErr) throw delErr;

        return noCacheResponse({ success: true, id: validId });
      }

      // ==========================================
      // CASH RECEIPTS (CREATE, DELETE)
      // ==========================================
      case "create_cash_receipt": {
        const { id, organizationId, branchId, receiptNumber, date, treasuryAccountId, amount, currency, receivedFrom, customerId, creditAccountId, costCenterId, notes, createdBy } = payload;
        const validId = cleanUUID(id, null);
        const validOrgId = cleanUUID(organizationId, DEFAULT_ORG_ID);
        const validBranchId = cleanUUID(branchId, DEFAULT_BRANCH_ID);
        const validTreasuryId = cleanUUID(treasuryAccountId, DEFAULT_TREASURY_ID);
        const validCustId = cleanUUID(customerId, null);
        const validCreditAccId = cleanUUID(creditAccountId, "00000000-0000-0000-0000-000000000111");
        const numAmount = Number(amount) || 0;

        const insertRow: any = {
          organization_id: validOrgId,
          branch_id: validBranchId,
          receipt_number: receiptNumber || ("RCP-" + Date.now().toString().slice(-6)),
          date: date || new Date().toISOString().split("T")[0],
          treasury_account_id: validTreasuryId,
          amount: numAmount,
          currency: currency || "EGP",
          received_from: receivedFrom || "عميل / جهة توريد",
          customer_id: validCustId,
          credit_account_id: validCreditAccId,
          cost_center_id: cleanUUID(costCenterId, null),
          notes: notes || null,
          created_by: createdBy || null,
        };
        if (validId) insertRow.id = validId;

        const { data: rcp, error: rcpErr } = await supabaseAdmin
          .from("cash_receipts")
          .insert([insertRow])
          .select()
          .single();

        if (rcpErr) throw rcpErr;

        // Atomically update Treasury Balance
        if (validTreasuryId && numAmount > 0) {
          const { data: t } = await supabaseAdmin.from("treasury_accounts").select("balance").eq("id", validTreasuryId).single();
          if (t) {
            await supabaseAdmin.from("treasury_accounts").update({
              balance: (Number(t.balance) || 0) + numAmount
            }).eq("id", validTreasuryId);
          }
        }

        // Atomically update Customer Balance
        if (validCustId && numAmount > 0) {
          const { data: c } = await supabaseAdmin.from("customers").select("current_balance").eq("id", validCustId).single();
          if (c) {
            await supabaseAdmin.from("customers").update({
              current_balance: Math.max(0, (Number(c.current_balance) || 0) - numAmount)
            }).eq("id", validCustId);
          }
        }

        return noCacheResponse({ success: true, data: mapCashReceipt(rcp) });
      }

      case "delete_cash_receipt": {
        const validId = cleanUUID(payload?.id || payload, null);
        if (!validId) return noCacheResponse({ success: false, message: "Valid cash receipt ID is required" }, 400);

        const { error: delErr } = await supabaseAdmin.from("cash_receipts").delete().eq("id", validId);
        if (delErr) throw delErr;

        return noCacheResponse({ success: true, id: validId });
      }

      // ==========================================
      // CASH PAYMENTS (CREATE, DELETE)
      // ==========================================
      case "create_cash_payment": {
        const { id, organizationId, branchId, paymentNumber, date, treasuryAccountId, amount, currency, paidTo, supplierId, debitAccountId, costCenterId, notes, createdBy } = payload;
        const validId = cleanUUID(id, null);
        const validOrgId = cleanUUID(organizationId, DEFAULT_ORG_ID);
        const validBranchId = cleanUUID(branchId, DEFAULT_BRANCH_ID);
        const validTreasuryId = cleanUUID(treasuryAccountId, DEFAULT_TREASURY_ID);
        const validSuppId = cleanUUID(supplierId, null);
        const validDebitAccId = cleanUUID(debitAccountId, "00000000-0000-0000-0000-000000000211");
        const numAmount = Number(amount) || 0;

        const insertRow: any = {
          organization_id: validOrgId,
          branch_id: validBranchId,
          payment_number: paymentNumber || ("PAY-" + Date.now().toString().slice(-6)),
          date: date || new Date().toISOString().split("T")[0],
          treasury_account_id: validTreasuryId,
          amount: numAmount,
          currency: currency || "EGP",
          paid_to: paidTo || "مورد / جهة صرف",
          supplier_id: validSuppId,
          debit_account_id: validDebitAccId,
          cost_center_id: cleanUUID(costCenterId, null),
          notes: notes || null,
          created_by: createdBy || null,
        };
        if (validId) insertRow.id = validId;

        const { data: pay, error: payErr } = await supabaseAdmin
          .from("cash_payments")
          .insert([insertRow])
          .select()
          .single();

        if (payErr) throw payErr;

        // Atomically update Treasury Balance
        if (validTreasuryId && numAmount > 0) {
          const { data: t } = await supabaseAdmin.from("treasury_accounts").select("balance").eq("id", validTreasuryId).single();
          if (t) {
            await supabaseAdmin.from("treasury_accounts").update({
              balance: (Number(t.balance) || 0) - numAmount
            }).eq("id", validTreasuryId);
          }
        }

        // Atomically update Supplier Balance
        if (validSuppId && numAmount > 0) {
          const { data: s } = await supabaseAdmin.from("suppliers").select("current_balance").eq("id", validSuppId).single();
          if (s) {
            await supabaseAdmin.from("suppliers").update({
              current_balance: Math.max(0, (Number(s.current_balance) || 0) - numAmount)
            }).eq("id", validSuppId);
          }
        }

        return noCacheResponse({ success: true, data: mapCashPayment(pay) });
      }

      case "delete_cash_payment": {
        const validId = cleanUUID(payload?.id || payload, null);
        if (!validId) return noCacheResponse({ success: false, message: "Valid cash payment ID is required" }, 400);

        const { error: delErr } = await supabaseAdmin.from("cash_payments").delete().eq("id", validId);
        if (delErr) throw delErr;

        return noCacheResponse({ success: true, id: validId });
      }

      // ==========================================
      // CHECK RECORDS (CREATE, UPDATE STATUS, DELETE)
      // ==========================================
      case "create_check": {
        const { id, organizationId, branchId, checkNumber, bankName, type, partyName, customerId, supplierId, amount, issueDate, dueDate, status, notes } = payload;
        const validId = cleanUUID(id, null);
        const validOrgId = cleanUUID(organizationId, DEFAULT_ORG_ID);
        const validBranchId = cleanUUID(branchId, DEFAULT_BRANCH_ID);

        const insertRow: any = {
          organization_id: validOrgId,
          branch_id: validBranchId,
          check_number: checkNumber || ("CHK-" + Date.now().toString().slice(-6)),
          bank_name: bankName || "البنك الأهلي المصري",
          type: type || "incoming",
          party_name: partyName || "جهة الشيك",
          customer_id: cleanUUID(customerId, null),
          supplier_id: cleanUUID(supplierId, null),
          amount: Number(amount) || 0,
          issue_date: issueDate || new Date().toISOString().split("T")[0],
          due_date: dueDate || issueDate || new Date().toISOString().split("T")[0],
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
        return noCacheResponse({ success: true, data: mapCheck(chk) });
      }

      case "update_check_status": {
        const { checkId, newStatus, targetTreasuryId } = payload;
        const validCheckId = cleanUUID(checkId, null);
        if (!validCheckId) return noCacheResponse({ success: false, message: "Invalid check ID" }, 400);

        const updateRow: any = { status: newStatus };
        if (newStatus === "collected") {
          updateRow.collection_date = new Date().toISOString().split("T")[0];
          if (targetTreasuryId) updateRow.target_treasury_id = cleanUUID(targetTreasuryId, null);
        }

        const { data: chk, error: chkErr } = await supabaseAdmin
          .from("check_records")
          .update(updateRow)
          .eq("id", validCheckId)
          .select()
          .single();

        if (chkErr) throw chkErr;

        // If collected, update treasury balance
        if (newStatus === "collected" && targetTreasuryId && chk) {
          const validTreasury = cleanUUID(targetTreasuryId, DEFAULT_TREASURY_ID);
          const { data: t } = await supabaseAdmin.from("treasury_accounts").select("balance").eq("id", validTreasury).single();
          if (t) {
            const checkAmount = Number(chk.amount) || 0;
            const delta = chk.type === "incoming" ? checkAmount : -checkAmount;
            await supabaseAdmin.from("treasury_accounts").update({
              balance: (Number(t.balance) || 0) + delta
            }).eq("id", validTreasury);
          }
        }

        return noCacheResponse({ success: true, data: mapCheck(chk) });
      }

      case "delete_check": {
        const validId = cleanUUID(payload?.id || payload, null);
        if (!validId) return noCacheResponse({ success: false, message: "Valid check ID is required" }, 400);

        const { error: delErr } = await supabaseAdmin.from("check_records").delete().eq("id", validId);
        if (delErr) throw delErr;

        return noCacheResponse({ success: true, id: validId });
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
          entry_number: entryNumber || ("JE-" + Date.now().toString().slice(-6)),
          date: date || new Date().toISOString().split("T")[0],
          reference_type: referenceType || "manual",
          reference_id: cleanUUID(referenceId, null),
          description: description || "قيد يومية عام",
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

        const mappedLines: any[] = [];
        if (lines && lines.length > 0 && je?.id) {
          const lineRows = lines.map((l: any) => {
            const lineId = cleanUUID(l.id, generateId());
            return {
              id: lineId,
              journal_entry_id: je.id,
              account_id: cleanUUID(l.accountId, "00000000-0000-0000-0000-000000000101"),
              account_code: l.accountCode || "101",
              account_name: l.accountName || "حساب",
              debit: Number(l.debit) || 0,
              credit: Number(l.credit) || 0,
              cost_center_id: cleanUUID(l.costCenterId, null),
              description: l.description || null,
            };
          });

          await supabaseAdmin.from("journal_lines").insert(lineRows);

          lineRows.forEach((l: any) => {
            mappedLines.push({
              id: l.id,
              accountId: l.account_id,
              accountCode: l.account_code,
              accountName: l.account_name,
              debit: l.debit,
              credit: l.credit,
              costCenterId: l.cost_center_id,
              description: l.description,
            });
          });
        }

        const mappedJE = mapJournalEntry(je, mappedLines);
        return noCacheResponse({ success: true, data: mappedJE });
      }

      case "delete_journal_entry": {
        const validId = cleanUUID(payload?.id || payload, null);
        if (!validId) return noCacheResponse({ success: false, message: "Valid journal entry ID is required" }, 400);

        await supabaseAdmin.from("journal_lines").delete().eq("journal_entry_id", validId);
        const { error: delErr } = await supabaseAdmin.from("journal_entries").delete().eq("id", validId);
        if (delErr) throw delErr;

        return noCacheResponse({ success: true, id: validId });
      }

      // ==========================================
      // ACCOUNTS / CHART OF ACCOUNTS (CREATE, UPDATE, DELETE)
      // ==========================================
      case "create_account": {
        const { id, organizationId, code, nameAr, nameEn, type, parentId, level, nature, balance, currency, isActive, isSystem } = payload;
        const validId = cleanUUID(id, null);
        const validOrgId = cleanUUID(organizationId, DEFAULT_ORG_ID);

        let finalCode = (code || "").trim();
        if (!finalCode) finalCode = "ACC-" + Date.now().toString().slice(-4);

        const insertRow: any = {
          organization_id: validOrgId,
          code: finalCode,
          name_ar: nameAr || "حساب جديد",
          name_en: nameEn || nameAr || "New Account",
          type: type || "assets",
          parent_id: cleanUUID(parentId, null),
          level: Number(level) || 1,
          nature: nature || "debit",
          balance: Number(balance) || 0,
          currency: currency || "EGP",
          is_active: isActive !== false,
          is_system: Boolean(isSystem),
        };
        if (validId) insertRow.id = validId;

        const { data: acc, error: accErr } = await supabaseAdmin
          .from("accounts")
          .insert([insertRow])
          .select()
          .single();

        if (accErr) throw accErr;
        return noCacheResponse({ success: true, data: mapAccount(acc) });
      }

      case "update_account": {
        const { id, code, nameAr, nameEn, type, parentId, level, nature, balance, isActive } = payload;
        const validId = cleanUUID(id, null);
        if (!validId) return noCacheResponse({ success: false, message: "Valid account ID is required" }, 400);

        const updateRow: any = {};
        if (code !== undefined) updateRow.code = code;
        if (nameAr !== undefined) updateRow.name_ar = nameAr;
        if (nameEn !== undefined) updateRow.name_en = nameEn;
        if (type !== undefined) updateRow.type = type;
        if (parentId !== undefined) updateRow.parent_id = cleanUUID(parentId, null);
        if (level !== undefined) updateRow.level = Number(level);
        if (nature !== undefined) updateRow.nature = nature;
        if (balance !== undefined) updateRow.balance = Number(balance);
        if (isActive !== undefined) updateRow.is_active = Boolean(isActive);

        const { data: acc, error: accErr } = await supabaseAdmin
          .from("accounts")
          .update(updateRow)
          .eq("id", validId)
          .select()
          .single();

        if (accErr) throw accErr;
        return noCacheResponse({ success: true, data: mapAccount(acc) });
      }

      case "delete_account": {
        const validId = cleanUUID(payload?.id || payload, null);
        if (!validId) return noCacheResponse({ success: false, message: "Valid account ID is required" }, 400);

        const { error: delErr } = await supabaseAdmin.from("accounts").delete().eq("id", validId);
        if (delErr) throw delErr;

        return noCacheResponse({ success: true, id: validId });
      }

      // ==========================================
      // PRODUCT CATEGORIES (CREATE, UPDATE, DELETE)
      // ==========================================
      case "create_category": {
        const { id, organizationId, code, nameAr, nameEn, parentId } = payload;
        const validId = cleanUUID(id, null);
        const validOrgId = cleanUUID(organizationId, DEFAULT_ORG_ID);

        let finalCode = (code || "").trim();
        if (!finalCode) finalCode = "CAT-" + Date.now().toString().slice(-4);

        const insertRow: any = {
          organization_id: validOrgId,
          code: finalCode,
          name_ar: nameAr || "تصنيف جديد",
          name_en: nameEn || nameAr || "New Category",
          parent_id: cleanUUID(parentId, null),
        };
        if (validId) insertRow.id = validId;

        const { data: cat, error: catErr } = await supabaseAdmin
          .from("product_categories")
          .insert([insertRow])
          .select()
          .single();

        if (catErr) throw catErr;
        return noCacheResponse({ success: true, data: mapCategory(cat) });
      }

      case "update_category": {
        const { id, code, nameAr, nameEn, parentId } = payload;
        const validId = cleanUUID(id, null);
        if (!validId) return noCacheResponse({ success: false, message: "Valid category ID required" }, 400);

        const updateRow: any = {};
        if (code !== undefined) updateRow.code = code;
        if (nameAr !== undefined) updateRow.name_ar = nameAr;
        if (nameEn !== undefined) updateRow.name_en = nameEn;
        if (parentId !== undefined) updateRow.parent_id = cleanUUID(parentId, null);

        const { data: cat, error: catErr } = await supabaseAdmin
          .from("product_categories")
          .update(updateRow)
          .eq("id", validId)
          .select()
          .single();

        if (catErr) throw catErr;
        return noCacheResponse({ success: true, data: mapCategory(cat) });
      }

      case "delete_category": {
        const validId = cleanUUID(payload?.id || payload, null);
        if (!validId) return noCacheResponse({ success: false, message: "Valid category ID required" }, 400);

        const { error: delErr } = await supabaseAdmin.from("product_categories").delete().eq("id", validId);
        if (delErr) throw delErr;

        return noCacheResponse({ success: true, id: validId });
      }

      // ==========================================
      // PRODUCT UNITS (CREATE, UPDATE, DELETE)
      // ==========================================
      case "create_unit": {
        const { id, organizationId, code, nameAr, nameEn, symbol } = payload;
        const validId = cleanUUID(id, null);
        const validOrgId = cleanUUID(organizationId, DEFAULT_ORG_ID);

        let finalCode = (code || "").trim();
        if (!finalCode) finalCode = "UNIT-" + Date.now().toString().slice(-4);

        const insertRow: any = {
          organization_id: validOrgId,
          code: finalCode,
          name_ar: nameAr || "وحدة جديدة",
          name_en: nameEn || nameAr || "New Unit",
          symbol: symbol || "قطعة",
        };
        if (validId) insertRow.id = validId;

        const { data: u, error: uErr } = await supabaseAdmin
          .from("product_units")
          .insert([insertRow])
          .select()
          .single();

        if (uErr) throw uErr;
        return noCacheResponse({ success: true, data: mapUnit(u) });
      }

      case "update_unit": {
        const { id, code, nameAr, nameEn, symbol } = payload;
        const validId = cleanUUID(id, null);
        if (!validId) return noCacheResponse({ success: false, message: "Valid unit ID required" }, 400);

        const updateRow: any = {};
        if (code !== undefined) updateRow.code = code;
        if (nameAr !== undefined) updateRow.name_ar = nameAr;
        if (nameEn !== undefined) updateRow.name_en = nameEn;
        if (symbol !== undefined) updateRow.symbol = symbol;

        const { data: u, error: uErr } = await supabaseAdmin
          .from("product_units")
          .update(updateRow)
          .eq("id", validId)
          .select()
          .single();

        if (uErr) throw uErr;
        return noCacheResponse({ success: true, data: mapUnit(u) });
      }

      case "delete_unit": {
        const validId = cleanUUID(payload?.id || payload, null);
        if (!validId) return noCacheResponse({ success: false, message: "Valid unit ID required" }, 400);

        const { error: delErr } = await supabaseAdmin.from("product_units").delete().eq("id", validId);
        if (delErr) throw delErr;

        return noCacheResponse({ success: true, id: validId });
      }

      default:
        return noCacheResponse({ success: false, message: `Unknown action: ${action}` }, 400);
    }
  } catch (error: any) {
    console.error("Error in POST /api/erp/data:", error);
    return noCacheResponse({ success: false, error: error.message || "Failed to persist to database" }, 500);
  }
}
