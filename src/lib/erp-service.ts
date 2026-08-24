import { Product, Customer, Supplier, SalesInvoice, PurchaseInvoice, Warehouse, CostCenter, CheckRecord, JournalEntry, CashReceipt, CashPayment } from "@/types/erp";

export interface HydratedERPData {
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  salesInvoices: SalesInvoice[];
  purchaseInvoices: PurchaseInvoice[];
  warehouses: Warehouse[];
  costCenters: CostCenter[];
  accounts: any[];
  treasuryAccounts: any[];
  checks: CheckRecord[];
  journalEntries: JournalEntry[];
  stockMovements: any[];
  auditLogs: any[];
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
async function mutateERP(action: string, payload: any): Promise<any> {
  try {
    const res = await fetch("/api/erp/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload }),
    });
    const json = await res.json();
    if (!json.success) {
      console.error(`DB Mutation failed for action [${action}]:`, json.error || json.message);
    }
    return json.data;
  } catch (error) {
    console.error(`Network error during DB mutation [${action}]:`, error);
    return null;
  }
}

export async function persistProductDB(p: Product) {
  return mutateERP("create_product", p);
}

export async function persistCustomerDB(c: Customer) {
  return mutateERP("create_customer", c);
}

export async function persistSupplierDB(s: Supplier) {
  return mutateERP("create_supplier", s);
}

export async function persistSalesInvoiceDB(inv: SalesInvoice) {
  return mutateERP("create_sales_invoice", inv);
}

export async function persistPurchaseInvoiceDB(inv: PurchaseInvoice) {
  return mutateERP("create_purchase_invoice", inv);
}

export async function persistWarehouseDB(w: Warehouse) {
  return mutateERP("create_warehouse", w);
}

export async function persistCostCenterDB(cc: CostCenter) {
  return mutateERP("create_cost_center", cc);
}

export async function persistCheckDB(chk: CheckRecord) {
  return mutateERP("create_check", chk);
}

export async function persistCheckStatusDB(checkId: string, newStatus: string, targetTreasuryId?: string) {
  return mutateERP("update_check_status", { checkId, newStatus, targetTreasuryId });
}

export async function persistJournalEntryDB(entry: JournalEntry) {
  return mutateERP("create_journal_entry", entry);
}
