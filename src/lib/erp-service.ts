import {
  Product, Customer, Supplier, SalesInvoice, PurchaseInvoice,
  Warehouse, CostCenter, CheckRecord, JournalEntry, Account, TreasuryAccount,
  StockMovement, AuditLog, ProductChangeLog, PeriodClosing, ProductCategory,
  ProductUnit, Organization, Branch, User, CashReceipt, CashPayment
} from "@/types/erp";

export interface HydratedERPData {
  products: Product[];
  categories?: ProductCategory[];
  units?: ProductUnit[];
  customers: Customer[];
  suppliers: Supplier[];
  salesInvoices: SalesInvoice[];
  purchaseInvoices: PurchaseInvoice[];
  warehouses: Warehouse[];
  costCenters: CostCenter[];
  accounts: Account[];
  treasuryAccounts: TreasuryAccount[];
  cashReceipts?: CashReceipt[];
  cashPayments?: CashPayment[];
  checks: CheckRecord[];
  journalEntries: JournalEntry[];
  stockMovements: StockMovement[];
  auditLogs: AuditLog[];
  productChangeLogs?: ProductChangeLog[];
  periodClosings?: PeriodClosing[];
  organization?: Organization;
  branches?: Branch[];
  users?: User[];
}

/**
 * Hydrates all ERP records from Supabase via server API
 */
export async function fetchFullERPData(): Promise<HydratedERPData | null> {
  try {
    const res = await fetch("/api/erp/data", { cache: "no-store" });
    if (!res.ok) {
      console.warn("Could not fetch live ERP data:", res.statusText);
      return null;
    }
    const json = await res.json();
    if (json.success && json.data) {
      return json.data;
    }
    return null;
  } catch (error) {
    console.error("Failed to load live ERP data from Supabase:", error);
    return null;
  }
}

/**
 * Execute DB mutation on Supabase via server API
 */
async function mutateERP(action: string, payload: unknown): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const res = await fetch("/api/erp/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload }),
    });
    const json = await res.json();
    if (!json.success) {
      console.error(`DB Mutation failed for action [${action}]:`, json.error || json.message);
      return { success: false, error: json.error || json.message };
    }
    return { success: true, data: json.data };
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Network error";
    console.error(`Network error during DB mutation [${action}]:`, error);
    return { success: false, error: errMessage };
  }
}

// Organization Settings
export async function updateOrganizationDB(org: Partial<Organization>) {
  return mutateERP("update_organization", org);
}

// Products CRUD
export async function persistProductDB(p: Product) {
  return mutateERP("create_product", p);
}
export async function updateProductDB(id: string, p: Partial<Product>) {
  return mutateERP("update_product", { id, ...p });
}
export async function deleteProductDB(id: string) {
  return mutateERP("delete_product", { id });
}

// Product Categories CRUD
export async function persistCategoryDB(cat: ProductCategory) {
  return mutateERP("create_category", cat);
}
export async function updateCategoryDB(id: string, cat: Partial<ProductCategory>) {
  return mutateERP("update_category", { id, ...cat });
}
export async function deleteCategoryDB(id: string) {
  return mutateERP("delete_category", { id });
}

// Product Units CRUD
export async function persistUnitDB(u: ProductUnit) {
  return mutateERP("create_unit", u);
}
export async function updateUnitDB(id: string, u: Partial<ProductUnit>) {
  return mutateERP("update_unit", { id, ...u });
}
export async function deleteUnitDB(id: string) {
  return mutateERP("delete_unit", { id });
}

// Customers CRUD
export async function persistCustomerDB(c: Customer) {
  return mutateERP("create_customer", c);
}
export async function updateCustomerDB(id: string, c: Partial<Customer>) {
  return mutateERP("update_customer", { id, ...c });
}
export async function deleteCustomerDB(id: string) {
  return mutateERP("delete_customer", { id });
}

// Suppliers CRUD
export async function persistSupplierDB(s: Supplier) {
  return mutateERP("create_supplier", s);
}
export async function updateSupplierDB(id: string, s: Partial<Supplier>) {
  return mutateERP("update_supplier", { id, ...s });
}
export async function deleteSupplierDB(id: string) {
  return mutateERP("delete_supplier", { id });
}

// Warehouses CRUD
export async function persistWarehouseDB(w: Warehouse) {
  return mutateERP("create_warehouse", w);
}
export async function updateWarehouseDB(id: string, w: Partial<Warehouse>) {
  return mutateERP("update_warehouse", { id, ...w });
}
export async function deleteWarehouseDB(id: string) {
  return mutateERP("delete_warehouse", { id });
}

// Cost Centers CRUD
export async function persistCostCenterDB(cc: CostCenter) {
  return mutateERP("create_cost_center", cc);
}
export async function updateCostCenterDB(id: string, cc: Partial<CostCenter>) {
  return mutateERP("update_cost_center", { id, ...cc });
}
export async function deleteCostCenterDB(id: string) {
  return mutateERP("delete_cost_center", { id });
}

// Accounts CRUD
export async function persistAccountDB(acc: Account) {
  return mutateERP("create_account", acc);
}
export async function updateAccountDB(id: string, acc: Partial<Account>) {
  return mutateERP("update_account", { id, ...acc });
}
export async function deleteAccountDB(id: string) {
  return mutateERP("delete_account", { id });
}

// Treasury Accounts CRUD
export async function persistTreasuryAccountDB(t: TreasuryAccount) {
  return mutateERP("create_treasury_account", t);
}
export async function updateTreasuryAccountDB(id: string, t: Partial<TreasuryAccount>) {
  return mutateERP("update_treasury_account", { id, ...t });
}
export async function deleteTreasuryAccountDB(id: string) {
  return mutateERP("delete_treasury_account", { id });
}

// Cash Receipts CRUD (NEW!)
export async function persistCashReceiptDB(rcp: CashReceipt) {
  return mutateERP("create_cash_receipt", rcp);
}
export async function deleteCashReceiptDB(id: string) {
  return mutateERP("delete_cash_receipt", { id });
}

// Cash Payments CRUD (NEW!)
export async function persistCashPaymentDB(pay: CashPayment) {
  return mutateERP("create_cash_payment", pay);
}
export async function deleteCashPaymentDB(id: string) {
  return mutateERP("delete_cash_payment", { id });
}

// Sales Invoices CRUD
export async function persistSalesInvoiceDB(inv: SalesInvoice) {
  return mutateERP("create_sales_invoice", inv);
}
export async function deleteSalesInvoiceDB(id: string) {
  return mutateERP("delete_sales_invoice", { id });
}

// Purchase Invoices CRUD
export async function persistPurchaseInvoiceDB(inv: PurchaseInvoice) {
  return mutateERP("create_purchase_invoice", inv);
}
export async function deletePurchaseInvoiceDB(id: string) {
  return mutateERP("delete_purchase_invoice", { id });
}

// Stock Movements CRUD
export async function updateStockMovementDB(id: string, sm: Partial<StockMovement>) {
  return mutateERP("update_stock_movement", { id, ...sm });
}
export async function deleteStockMovementDB(id: string) {
  return mutateERP("delete_stock_movement", { id });
}

// Product Change Logs
export async function persistProductChangeLogDB(log: ProductChangeLog) {
  return mutateERP("create_product_change_log", log);
}

// Period Closings
export async function persistPeriodClosingDB(closing: PeriodClosing) {
  return mutateERP("create_period_closing", closing);
}

// Checks CRUD
export async function persistCheckDB(chk: CheckRecord) {
  return mutateERP("create_check", chk);
}
export async function persistCheckStatusDB(checkId: string, newStatus: string, targetTreasuryId?: string) {
  return mutateERP("update_check_status", { checkId, newStatus, targetTreasuryId });
}
export async function deleteCheckDB(id: string) {
  return mutateERP("delete_check", { id });
}

// Journal Entries CRUD
export async function persistJournalEntryDB(entry: JournalEntry) {
  return mutateERP("create_journal_entry", entry);
}
export async function deleteJournalEntryDB(id: string) {
  return mutateERP("delete_journal_entry", { id });
}
