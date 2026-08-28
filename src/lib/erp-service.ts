import {
  Product, Customer, Supplier, SalesInvoice, PurchaseInvoice,
  Warehouse, CostCenter, CheckRecord, JournalEntry, Account, TreasuryAccount,
  StockMovement, AuditLog, ProductChangeLog, PeriodClosing, ProductCategory,
  ProductUnit, Organization, Branch, User, CashReceipt, CashPayment,
  CustomerCategory, SalesReturn, PurchaseReturn
} from "@/types/erp";

export interface HydratedERPData {
  products: Product[];
  categories?: ProductCategory[];
  customerCategories?: CustomerCategory[];
  units?: ProductUnit[];
  customers: Customer[];
  suppliers: Supplier[];
  salesInvoices: SalesInvoice[];
  salesReturns?: SalesReturn[];
  purchaseInvoices: PurchaseInvoice[];
  purchaseReturns?: PurchaseReturn[];
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
async function mutateERP<T = any>(action: string, payload: unknown): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch("/api/erp/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload }),
      cache: "no-store",
    });
    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${errText}` };
    }
    const json = await res.json();
    if (!json.success) {
      console.error(`DB Mutation failed for action [${action}]:`, json.error || json.message);
      return { success: false, error: json.error || json.message || "Failed to persist to database" };
    }
    return { success: true, data: json.data as T };
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Network error";
    console.error(`Network error during DB mutation [${action}]:`, error);
    return { success: false, error: errMessage };
  }
}

// Organization Settings
export async function updateOrganizationDB(org: Partial<Organization>) {
  return mutateERP<Organization>("update_organization", org);
}

// Products CRUD
export async function persistProductDB(p: Product | Omit<Product, "id">) {
  return mutateERP<Product>("create_product", p);
}
export async function updateProductDB(id: string, p: Partial<Product>) {
  return mutateERP<Product>("update_product", { id, ...p });
}
export async function deleteProductDB(id: string) {
  return mutateERP("delete_product", { id });
}

// Product Categories CRUD
export async function persistCategoryDB(cat: ProductCategory | Omit<ProductCategory, "id">) {
  return mutateERP<ProductCategory>("create_category", cat);
}
export async function updateCategoryDB(id: string, cat: Partial<ProductCategory>) {
  return mutateERP<ProductCategory>("update_category", { id, ...cat });
}
export async function deleteCategoryDB(id: string) {
  return mutateERP("delete_category", { id });
}

// Product Units CRUD
export async function persistUnitDB(u: ProductUnit | Omit<ProductUnit, "id">) {
  return mutateERP<ProductUnit>("create_unit", u);
}
export async function updateUnitDB(id: string, u: Partial<ProductUnit>) {
  return mutateERP<ProductUnit>("update_unit", { id, ...u });
}
export async function deleteUnitDB(id: string) {
  return mutateERP("delete_unit", { id });
}

// Customers CRUD
export async function persistCustomerDB(c: Customer | Omit<Customer, "id">) {
  return mutateERP<Customer>("create_customer", c);
}
export async function updateCustomerDB(id: string, c: Partial<Customer>) {
  return mutateERP<Customer>("update_customer", { id, ...c });
}
export async function deleteCustomerDB(id: string) {
  return mutateERP("delete_customer", { id });
}

// Suppliers CRUD
export async function persistSupplierDB(s: Supplier | Omit<Supplier, "id">) {
  return mutateERP<Supplier>("create_supplier", s);
}
export async function updateSupplierDB(id: string, s: Partial<Supplier>) {
  return mutateERP<Supplier>("update_supplier", { id, ...s });
}
export async function deleteSupplierDB(id: string) {
  return mutateERP("delete_supplier", { id });
}

// Warehouses CRUD
export async function persistWarehouseDB(w: Warehouse | Omit<Warehouse, "id">) {
  return mutateERP<Warehouse>("create_warehouse", w);
}
export async function updateWarehouseDB(id: string, w: Partial<Warehouse>) {
  return mutateERP<Warehouse>("update_warehouse", { id, ...w });
}
export async function deleteWarehouseDB(id: string) {
  return mutateERP("delete_warehouse", { id });
}

// Cost Centers CRUD
export async function persistCostCenterDB(cc: CostCenter | Omit<CostCenter, "id">) {
  return mutateERP<CostCenter>("create_cost_center", cc);
}
export async function updateCostCenterDB(id: string, cc: Partial<CostCenter>) {
  return mutateERP<CostCenter>("update_cost_center", { id, ...cc });
}
export async function deleteCostCenterDB(id: string) {
  return mutateERP("delete_cost_center", { id });
}

// Accounts CRUD
export async function persistAccountDB(acc: Account | Omit<Account, "id">) {
  return mutateERP<Account>("create_account", acc);
}
export async function updateAccountDB(id: string, acc: Partial<Account>) {
  return mutateERP<Account>("update_account", { id, ...acc });
}
export async function deleteAccountDB(id: string) {
  return mutateERP("delete_account", { id });
}

// Treasury Accounts CRUD
export async function persistTreasuryAccountDB(t: TreasuryAccount | Omit<TreasuryAccount, "id">) {
  return mutateERP<TreasuryAccount>("create_treasury_account", t);
}
export async function updateTreasuryAccountDB(id: string, t: Partial<TreasuryAccount>) {
  return mutateERP<TreasuryAccount>("update_treasury_account", { id, ...t });
}
export async function deleteTreasuryAccountDB(id: string) {
  return mutateERP("delete_treasury_account", { id });
}

// Cash Receipts CRUD
export async function persistCashReceiptDB(rcp: CashReceipt | Omit<CashReceipt, "id">) {
  return mutateERP<CashReceipt>("create_cash_receipt", rcp);
}
export async function deleteCashReceiptDB(id: string) {
  return mutateERP("delete_cash_receipt", { id });
}

// Cash Payments CRUD
export async function persistCashPaymentDB(pay: CashPayment | Omit<CashPayment, "id">) {
  return mutateERP<CashPayment>("create_cash_payment", pay);
}
export async function deleteCashPaymentDB(id: string) {
  return mutateERP("delete_cash_payment", { id });
}

// Sales Invoices CRUD
export async function persistSalesInvoiceDB(inv: SalesInvoice | Omit<SalesInvoice, "id">) {
  return mutateERP<SalesInvoice>("create_sales_invoice", inv);
}
export async function deleteSalesInvoiceDB(id: string) {
  return mutateERP("delete_sales_invoice", { id });
}

// Purchase Invoices CRUD
export async function persistPurchaseInvoiceDB(inv: PurchaseInvoice | Omit<PurchaseInvoice, "id">) {
  return mutateERP<PurchaseInvoice>("create_purchase_invoice", inv);
}
export async function deletePurchaseInvoiceDB(id: string) {
  return mutateERP("delete_purchase_invoice", { id });
}

// Stock Movements CRUD
export async function updateStockMovementDB(id: string, sm: Partial<StockMovement>) {
  return mutateERP<StockMovement>("update_stock_movement", { id, ...sm });
}
export async function deleteStockMovementDB(id: string) {
  return mutateERP("delete_stock_movement", { id });
}

// Product Change Logs
export async function persistProductChangeLogDB(log: ProductChangeLog | Omit<ProductChangeLog, "id">) {
  return mutateERP<ProductChangeLog>("create_product_change_log", log);
}

// Period Closings
export async function persistPeriodClosingDB(closing: PeriodClosing | Omit<PeriodClosing, "id">) {
  return mutateERP<PeriodClosing>("create_period_closing", closing);
}

// Checks CRUD
export async function persistCheckDB(chk: CheckRecord | Omit<CheckRecord, "id">) {
  return mutateERP<CheckRecord>("create_check", chk);
}
export async function persistCheckStatusDB(checkId: string, newStatus: string, targetTreasuryId?: string) {
  return mutateERP<CheckRecord>("update_check_status", { checkId, newStatus, targetTreasuryId });
}
export async function deleteCheckDB(id: string) {
  return mutateERP("delete_check", { id });
}

// Customer Categories CRUD
export async function persistCustomerCategoryDB(cat: CustomerCategory | Omit<CustomerCategory, "id">) {
  return mutateERP<CustomerCategory>("create_customer_category", cat);
}
export async function updateCustomerCategoryDB(id: string, cat: Partial<CustomerCategory>) {
  return mutateERP<CustomerCategory>("update_customer_category", { id, ...cat });
}
export async function deleteCustomerCategoryDB(id: string) {
  return mutateERP("delete_customer_category", { id });
}

// Sales Returns CRUD
export async function persistSalesReturnDB(ret: SalesReturn | Omit<SalesReturn, "id">) {
  return mutateERP<SalesReturn>("create_sales_return", ret);
}
export async function deleteSalesReturnDB(id: string) {
  return mutateERP("delete_sales_return", { id });
}

// Purchase Returns CRUD
export async function persistPurchaseReturnDB(ret: PurchaseReturn | Omit<PurchaseReturn, "id">) {
  return mutateERP<PurchaseReturn>("create_purchase_return", ret);
}
export async function deletePurchaseReturnDB(id: string) {
  return mutateERP("delete_purchase_return", { id });
}

// Journal Entries CRUD
export async function persistJournalEntryDB(entry: JournalEntry | Omit<JournalEntry, "id">) {
  return mutateERP<JournalEntry>("create_journal_entry", entry);
}
export async function deleteJournalEntryDB(id: string) {
  return mutateERP("delete_journal_entry", { id });
}
