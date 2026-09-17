"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  Organization, Branch, User, ProductCategory, ProductUnit, Product,
  Customer, Supplier, Account, TreasuryAccount, CostCenter, CheckRecord,
  SalesInvoice, PurchaseInvoice, StockMovement, JournalEntry, Notification,
  AuditLog, Language, Direction, Theme, CheckStatus, Warehouse, CashReceipt, CashPayment,
  ProductChangeLog, PeriodClosing, UserRole, CustomerCategory, SalesReturn,
  PurchaseReturn, PartnerStatement, StatementTransaction, FixedAsset
} from "@/types/erp";
import {
  initialOrganization, initialBranches, initialUsers, initialCategories,
  initialUnits, initialWarehouses, initialProducts, initialCustomers,
  initialSuppliers, initialAccounts, initialTreasuryAccounts, initialCostCenters,
  initialChecks, initialSalesInvoices, initialPurchaseInvoices,
  initialStockMovements, initialJournalEntries, initialNotifications, initialAuditLogs,
  initialCustomerCategories, initialSalesReturns, initialPurchaseReturns
} from "@/lib/seed-data";
import { generateId } from "@/lib/utils";
import {
  generateSalesInvoiceJournal,
  generatePurchaseInvoiceJournal,
  generateSalesReturnJournal,
  generatePurchaseReturnJournal,
  generateReceiptJournal,
  generatePaymentJournal,
  generateReceivableCheckJournal,
  generateCheckStatusJournal,
  generatePayableCheckJournal,
  generateOpeningStockJournal,
  generateStockAdjustmentJournal,
  generatePeriodClosingJournal,
  generateCheckReceiptVoucherJournal,
  computeAssetDepreciation,
  generateAssetDepreciationJournalEntry
} from "@/lib/accounting-engine";
import {
  fetchFullERPData,
  persistProductDB,
  updateProductDB,
  deleteProductDB,
  persistCategoryDB,
  updateCategoryDB,
  deleteCategoryDB,
  persistUnitDB,
  updateUnitDB,
  deleteUnitDB,
  persistCustomerCategoryDB,
  updateCustomerCategoryDB,
  deleteCustomerCategoryDB,
  persistCustomerDB,
  updateCustomerDB,
  deleteCustomerDB,
  persistSupplierDB,
  updateSupplierDB,
  deleteSupplierDB,
  persistSalesInvoiceDB,
  updateSalesInvoiceDB,
  deleteSalesInvoiceDB,
  persistSalesReturnDB,
  deleteSalesReturnDB,
  persistPurchaseInvoiceDB,
  updatePurchaseInvoiceDB,
  deletePurchaseInvoiceDB,
  persistPurchaseReturnDB,
  deletePurchaseReturnDB,
  persistWarehouseDB,
  updateWarehouseDB,
  deleteWarehouseDB,
  persistCostCenterDB,
  updateCostCenterDB,
  deleteCostCenterDB,
  persistAccountDB,
  updateAccountDB,
  deleteAccountDB,
  persistTreasuryAccountDB,
  updateTreasuryAccountDB,
  deleteTreasuryAccountDB,
  persistCashReceiptDB,
  updateCashReceiptDB,
  deleteCashReceiptDB,
  persistCashPaymentDB,
  updateCashPaymentDB,
  deleteCashPaymentDB,
  persistCheckDB,
  updateCheckDB,
  persistCheckStatusDB,
  deleteCheckDB,
  persistJournalEntryDB,
  updateJournalEntryDB,
  deleteJournalEntryDB,
  persistStockMovementDB,
  updateStockMovementDB,
  deleteStockMovementDB,
  persistProductChangeLogDB,
  persistPeriodClosingDB,
  updateOrganizationDB,
  persistFixedAssetDB,
  updateFixedAssetDB,
  deleteFixedAssetDB
} from "@/lib/erp-service";
import { ToastContainer, ToastMessage } from "@/components/ui/Toast";

interface ERPContextType {
  // Localization & Theme
  locale: Language;
  setLocale: (lang: Language) => void;
  direction: Direction;
  theme: Theme;
  setTheme: (t: Theme) => void;

  // DB Sync Status
  isDbConnected: boolean;
  isLoadingData: boolean;
  refreshData: () => Promise<void>;

  // Toast Notifications
  toasts: ToastMessage[];
  showToast: (toast: Omit<ToastMessage, "id"> | string, type?: "success" | "error" | "info" | "loading") => string;
  dismissToast: (id: string) => void;

  // Active Context
  currentUser: User;
  setCurrentUser: (u: User) => void;
  organization: Organization;
  setOrganization: (org: Organization) => void;
  updateOrganization: (org: Partial<Organization>) => Promise<void>;
  branches: Branch[];
  activeBranchId: string;
  setActiveBranchId: (id: string) => void;
  users: User[];

  // Inventory
  products: Product[];
  categories: ProductCategory[];
  units: ProductUnit[];
  warehouses: Warehouse[];
  stockMovements: StockMovement[];
  productChangeLogs: ProductChangeLog[];
  periodClosings: PeriodClosing[];
  addProduct: (p: Omit<Product, "id">) => Promise<Product>;
  updateProduct: (id: string, p: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addCategory: (c: Omit<ProductCategory, "id">) => Promise<ProductCategory>;
  updateCategory: (id: string, c: Partial<ProductCategory>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addUnit: (u: Omit<ProductUnit, "id">) => Promise<ProductUnit>;
  updateUnit: (id: string, u: Partial<ProductUnit>) => Promise<void>;
  deleteUnit: (id: string) => Promise<void>;
  addWarehouse: (w: Omit<Warehouse, "id">) => Promise<Warehouse>;
  updateWarehouse: (id: string, w: Partial<Warehouse>) => Promise<void>;
  deleteWarehouse: (id: string) => Promise<void>;
  addStockMovement: (m: Omit<StockMovement, "id">) => Promise<void>;
  updateStockMovement: (id: string, sm: Partial<StockMovement>) => Promise<void>;
  deleteStockMovement: (id: string) => Promise<void>;
  addProductChangeLog: (log: Omit<ProductChangeLog, "id" | "createdAt">) => Promise<void>;
  createPeriodClosing: (closing: Omit<PeriodClosing, "id" | "createdAt">) => Promise<PeriodClosing>;
  hasPermission: (requiredRoles: UserRole | UserRole[]) => boolean;

  // CRM & Partners
  customers: Customer[];
  suppliers: Supplier[];
  customerCategories: CustomerCategory[];
  addCustomer: (c: Omit<Customer, "id">) => Promise<Customer>;
  updateCustomer: (id: string, c: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  addCustomerCategory: (cat: Omit<CustomerCategory, "id">) => Promise<CustomerCategory>;
  updateCustomerCategory: (id: string, cat: Partial<CustomerCategory>) => Promise<void>;
  deleteCustomerCategory: (id: string) => Promise<void>;
  addSupplier: (s: Omit<Supplier, "id">) => Promise<Supplier>;
  updateSupplier: (id: string, s: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;

  // Sales & Purchases
  salesInvoices: SalesInvoice[];
  salesReturns: SalesReturn[];
  purchaseInvoices: PurchaseInvoice[];
  purchaseReturns: PurchaseReturn[];
  createSalesInvoice: (inv: Omit<SalesInvoice, "id">) => Promise<SalesInvoice>;
  updateSalesInvoice: (id: string, inv: Partial<SalesInvoice>) => Promise<SalesInvoice>;
  deleteSalesInvoice: (id: string) => Promise<void>;
  addSalesReturn: (ret: Omit<SalesReturn, "id">) => Promise<SalesReturn>;
  deleteSalesReturn: (id: string) => Promise<void>;
  createPurchaseInvoice: (inv: Omit<PurchaseInvoice, "id">) => Promise<PurchaseInvoice>;
  updatePurchaseInvoice: (id: string, pinv: Partial<PurchaseInvoice>) => Promise<PurchaseInvoice>;
  deletePurchaseInvoice: (id: string) => Promise<void>;
  addPurchaseReturn: (ret: Omit<PurchaseReturn, "id">) => Promise<PurchaseReturn>;
  deletePurchaseReturn: (id: string) => Promise<void>;

  // Statements & Reports
  getCustomerStatement: (customerId: string, fromDate?: string, toDate?: string) => PartnerStatement;
  getSupplierStatement: (supplierId: string, fromDate?: string, toDate?: string) => PartnerStatement;
  getCustomerBalancesReport: (fromDate?: string, toDate?: string, categoryId?: string) => Array<{
    customerId: string;
    customerName: string;
    categoryName?: string;
    openingBalance: number;
    debitMovements: number;
    creditMovements: number;
    currentBalance: number;
  }>;
  getSupplierBalancesReport: (fromDate?: string, toDate?: string) => Array<{
    supplierId: string;
    supplierCode: string;
    supplierName: string;
    openingBalance: number;
    debitMovements: number;
    creditMovements: number;
    currentBalance: number;
  }>;

  // Treasury & Checks
  treasuryAccounts: TreasuryAccount[];
  cashReceipts: CashReceipt[];
  cashPayments: CashPayment[];
  checks: CheckRecord[];
  addTreasuryAccount: (t: Omit<TreasuryAccount, "id">) => Promise<TreasuryAccount>;
  updateTreasuryAccount: (id: string, t: Partial<TreasuryAccount>) => Promise<void>;
  deleteTreasuryAccount: (id: string) => Promise<void>;
  createCashReceipt: (rcp: Omit<CashReceipt, "id">) => Promise<CashReceipt>;
  addCashReceipt: (rcp: Omit<CashReceipt, "id">) => Promise<CashReceipt>;
  updateCashReceipt: (id: string, rcp: Partial<CashReceipt>) => Promise<CashReceipt>;
  deleteCashReceipt: (id: string) => Promise<void>;
  createCashPayment: (pay: Omit<CashPayment, "id">) => Promise<CashPayment>;
  addCashPayment: (pay: Omit<CashPayment, "id">) => Promise<CashPayment>;
  updateCashPayment: (id: string, pay: Partial<CashPayment>) => Promise<CashPayment>;
  deleteCashPayment: (id: string) => Promise<void>;
  addCheck: (chk: Omit<CheckRecord, "id">, skipAutoJE?: boolean) => Promise<CheckRecord>;
  addCheckReceiptVoucher: (voucherData: {
    voucherNumber: string;
    voucherDate: string;
    partyName: string;
    customerId?: string;
    accountId?: string;
    costCenterId?: string;
    notes?: string;
    checks: Array<{
      checkNumber: string;
      bankName: string;
      draweeBank?: string;
      dueDate: string;
      amount: number;
    }>;
  }) => Promise<CheckRecord[]>;
  updateCheck: (id: string, chk: Partial<CheckRecord>) => Promise<CheckRecord>;
  updateCheckStatus: (checkId: string, newStatus: CheckStatus, targetTreasuryId?: string) => Promise<void>;
  deleteCheck: (id: string) => Promise<void>;

  // Accounting & GL
  accounts: Account[];
  costCenters: CostCenter[];
  journalEntries: JournalEntry[];
  addAccount: (acc: Omit<Account, "id">) => Promise<Account>;
  updateAccount: (id: string, acc: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  addCostCenter: (cc: Omit<CostCenter, "id">) => Promise<CostCenter>;
  updateCostCenter: (id: string, cc: Partial<CostCenter>) => Promise<void>;
  deleteCostCenter: (id: string) => Promise<void>;
  addJournalEntry: (entry: Omit<JournalEntry, "id">) => Promise<JournalEntry>;
  deleteJournalEntry: (id: string) => Promise<void>;
  postOpeningEntry: (entry: Omit<JournalEntry, "id">) => Promise<JournalEntry>;

  // Fixed Assets & Depreciation (Report 10)
  fixedAssets: FixedAsset[];
  addFixedAsset: (fa: Omit<FixedAsset, "id">) => Promise<FixedAsset>;
  updateFixedAsset: (id: string, fa: Partial<FixedAsset>) => Promise<FixedAsset>;
  deleteFixedAsset: (id: string) => Promise<void>;
  postAssetDepreciation: (assetId: string, periodEndDate?: string) => Promise<JournalEntry | null>;
  postAllActiveAssetsDepreciation: (periodEndDate?: string) => Promise<number>;

  // Audit & Notifications
  auditLogs: AuditLog[];
  notifications: Notification[];
  addAuditLog: (log: Omit<AuditLog, "id" | "createdAt">) => void;
  markNotificationRead: (id: string) => void;
  resetToDemoData: () => void;
}

const ERPContext = createContext<ERPContextType | undefined>(undefined);

export function ERPProvider({ children }: { children: React.ReactNode }) {
  // Localization & Theme
  const [locale, setLocale] = useState<Language>("ar");
  const [theme, setTheme] = useState<Theme>("dark");
  const direction: Direction = locale === "ar" ? "rtl" : "ltr";

  // DB Sync State
  const [isDbConnected, setIsDbConnected] = useState<boolean>(false);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  // Toast Notifications State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<ToastMessage, "id"> | string, type: "success" | "error" | "info" | "loading" = "success"): string => {
    const id = generateId();
    const newToast: ToastMessage = typeof toast === "string"
      ? { id, message: toast, type }
      : { ...toast, id, type: toast.type || type };

    setToasts(prev => [...prev.slice(-4), newToast]); // keep at most 5 toasts

    if (newToast.type !== "loading") {
      const duration = newToast.duration || (newToast.type === "error" ? 6000 : 4000);
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    }
    return id;
  }, [dismissToast]);

  // Core Multi-Tenant State
  const [organization, setOrganization] = useState<Organization>(initialOrganization);
  const [branches, setBranches] = useState<Branch[]>(initialBranches);
  const [activeBranchId, setActiveBranchId] = useState<string>(initialBranches[0].id);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [currentUser, setCurrentUser] = useState<User>(initialUsers[0]);

  // Master Data State (Initialized empty to guarantee 0 stale/ghost records before API hydration)
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [customerCategories, setCustomerCategories] = useState<CustomerCategory[]>([]);
  const [units, setUnits] = useState<ProductUnit[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Transaction State (Initialized empty to guarantee 0 stale/ghost records before API hydration)
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>([]);
  const [salesReturns, setSalesReturns] = useState<SalesReturn[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([]);
  const [purchaseReturns, setPurchaseReturns] = useState<PurchaseReturn[]>([]);
  const [treasuryAccounts, setTreasuryAccounts] = useState<TreasuryAccount[]>([]);
  const [cashReceipts, setCashReceipts] = useState<CashReceipt[]>([]);
  const [cashPayments, setCashPayments] = useState<CashPayment[]>([]);
  const [checks, setChecks] = useState<CheckRecord[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [productChangeLogs, setProductChangeLogs] = useState<ProductChangeLog[]>([]);
  const [periodClosings, setPeriodClosings] = useState<PeriodClosing[]>([]);
  const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>([]);

  // ==========================================
  // HYDRATE FROM SUPABASE
  // ==========================================
  const loadDatabaseData = useCallback(async () => {
    try {
      setIsLoadingData(true);
      const liveData = await fetchFullERPData();

      if (liveData) {
        setIsDbConnected(true);
        if (liveData.organization) setOrganization(liveData.organization);
        if (liveData.branches && liveData.branches.length > 0) {
          setBranches(liveData.branches);
          if (!liveData.branches.some(b => b.id === activeBranchId)) {
            setActiveBranchId(liveData.branches[0].id);
          }
        }
        if (liveData.users && liveData.users.length > 0) {
          setUsers(liveData.users);
          const admin = liveData.users.find(u => u.role === "super_admin") || liveData.users[0];
          setCurrentUser(admin);
        }
        setProducts(liveData.products || []);
        setCategories(liveData.categories || []);
        setCustomerCategories(liveData.customerCategories || []);
        setUnits(liveData.units || []);
        setCustomers(liveData.customers || []);
        setSuppliers(liveData.suppliers || []);
        setSalesInvoices(liveData.salesInvoices || []);
        setSalesReturns(liveData.salesReturns || []);
        setPurchaseInvoices(liveData.purchaseInvoices || []);
        setPurchaseReturns(liveData.purchaseReturns || []);
        setWarehouses(liveData.warehouses || []);
        setCostCenters(liveData.costCenters || []);
        setAccounts(liveData.accounts || []);
        setTreasuryAccounts(liveData.treasuryAccounts || []);
        setCashReceipts(liveData.cashReceipts || []);
        setCashPayments(liveData.cashPayments || []);
        setChecks(liveData.checks || []);
        setJournalEntries(liveData.journalEntries || []);
        setStockMovements(liveData.stockMovements || []);
        setAuditLogs(liveData.auditLogs || []);
        if (liveData.fixedAssets) setFixedAssets(liveData.fixedAssets);
      } else {
        setIsDbConnected(false);
      }
    } catch (err) {
      console.warn("Could not hydrate ERP from database:", err);
      setIsDbConnected(false);
    } finally {
      setIsLoadingData(false);
    }
  }, [activeBranchId]);

  useEffect(() => {
    loadDatabaseData();
  }, [loadDatabaseData]);

  const addAuditLog = (log: Omit<AuditLog, "id" | "createdAt">) => {
    const newLog: AuditLog = {
      ...log,
      id: generateId(),
      createdAt: new Date().toISOString().replace("T", " ").substring(0, 19),
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const addProductChangeLog = async (log: Omit<ProductChangeLog, "id" | "createdAt">) => {
    const newLog: ProductChangeLog = {
      ...log,
      id: generateId(),
      createdAt: new Date().toISOString().replace("T", " ").substring(0, 19),
    };
    setProductChangeLogs(prev => [newLog, ...prev]);
    await persistProductChangeLogDB(newLog);
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const hasPermission = (requiredRoles: UserRole | UserRole[]): boolean => {
    if (currentUser.role === "super_admin" || currentUser.role === "tenant_admin") return true;
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    return roles.includes(currentUser.role);
  };

  // Organization Settings
  const updateOrganization = async (org: Partial<Organization>) => {
    const updated = { ...organization, ...org };
    const res = await updateOrganizationDB(updated);
    if (!res.success) {
      throw new Error(res.error || "فشل تحديث إعدادات المنشأة في قاعدة البيانات");
    }
    if (res.data) setOrganization(res.data);
    else setOrganization(updated);

    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "update",
      entityType: "Organization",
      entityId: organization.id,
      details: `تحديث إعدادات المنشأة: ${updated.nameAr}`,
    });
    showToast(locale === "ar" ? "تم حفظ إعدادات المنشأة بنجاح" : "Organization settings saved successfully", "success");
  };

  // ==========================================
  // INVENTORY & PRODUCT CATEGORIES / UNITS
  // ==========================================
  const addProduct = async (p: Omit<Product, "id">): Promise<Product> => {
    const res = await persistProductDB(p);
    if (!res.success || !res.data) {
      throw new Error(res.error || "فشل حفظ المنتج في قاعدة البيانات");
    }
    const savedProduct = res.data;

    // Opening stock allocations
    const openingMovements: StockMovement[] = [];
    let totalOpeningQty = 0;

    if (savedProduct.warehouseStock) {
      for (const [whId, qty] of Object.entries(savedProduct.warehouseStock)) {
        const numQty = Number(qty) || 0;
        if (numQty > 0) {
          totalOpeningQty += numQty;
          openingMovements.push({
            id: generateId(),
            organizationId: organization.id,
            productId: savedProduct.id,
            warehouseId: whId,
            movementType: "opening_balance",
            referenceNumber: `OB-${savedProduct.sku}`,
            date: new Date().toISOString().split("T")[0],
            quantity: numQty,
            unitCost: savedProduct.costPrice,
            totalCost: numQty * savedProduct.costPrice,
            balanceQuantity: numQty,
            partnerName: "رصيد افتتاحي",
            partnerType: "opening",
            notes: `رصيد أول المدة للصنف ${savedProduct.nameAr}`,
          });
        }
      }
    }

    if (openingMovements.length > 0) {
      setStockMovements(prev => [...openingMovements, ...prev]);
    }

    setProducts(prev => [savedProduct, ...prev.filter(x => x.id !== savedProduct.id)]);

    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "create",
      entityType: "Product",
      entityId: savedProduct.id,
      details: `إضافة منتج جديد: ${savedProduct.nameAr} (${savedProduct.sku})`,
    });

    showToast(locale === "ar" ? `تمت إضافة المنتج "${savedProduct.nameAr}" بنجاح` : `Product "${savedProduct.nameAr}" created`, "success");
    return savedProduct;
  };

  const updateProduct = async (id: string, p: Partial<Product>) => {
    const existing = products.find(prod => prod.id === id);
    if (!existing) return;

    const res = await updateProductDB(id, p);
    if (!res.success || !res.data) {
      throw new Error(res.error || "فشل تحديث بيانات المنتج في قاعدة البيانات");
    }
    const updatedProduct = res.data;

    if (p.warehouseStock) {
      for (const [whId, newQty] of Object.entries(p.warehouseStock)) {
        const oldQty = existing.warehouseStock[whId] || 0;
        const diff = (Number(newQty) || 0) - oldQty;

        if (diff !== 0) {
          const adjMovement: StockMovement = {
            id: generateId(),
            organizationId: organization.id,
            productId: id,
            warehouseId: whId,
            movementType: "adjustment",
            referenceNumber: `ADJ-${existing.sku}-${Date.now().toString().slice(-4)}`,
            date: new Date().toISOString().split("T")[0],
            quantity: diff,
            unitCost: p.costPrice ?? existing.costPrice,
            totalCost: diff * (p.costPrice ?? existing.costPrice),
            balanceQuantity: Number(newQty) || 0,
            partnerName: "تسوية جردية",
            partnerType: "adjustment",
            notes: diff > 0 ? `تسوية جردية بالزيادة (+${diff})` : `تسوية جردية بالعجز (${diff})`,
          };

          setStockMovements(prev => [adjMovement, ...prev]);
          try {
            await persistStockMovementDB(adjMovement);
          } catch (smErr) {
            console.error("Failed to persist stock adjustment movement:", smErr);
          }

          const adjJournalDraft = generateStockAdjustmentJournal(
            organization.id,
            activeBranchId,
            existing,
            diff,
            p.costPrice ?? existing.costPrice,
            accounts,
            currentUser.name,
            adjMovement.notes
          );

          if (adjJournalDraft) {
            const newJournal: JournalEntry = { ...adjJournalDraft, id: generateId() };
            setJournalEntries(prev => [newJournal, ...prev]);
            await persistJournalEntryDB(newJournal);
          }
        }
      }
    }

    setProducts(prev => prev.map(prod => prod.id === id ? { ...prod, ...updatedProduct } : prod));

    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "update",
      entityType: "Product",
      entityId: id,
      details: `تعديل بيانات المنتج: ${existing.nameAr}`,
    });

    showToast(locale === "ar" ? `تم تحديث المنتج "${updatedProduct.nameAr}" بنجاح` : `Product updated successfully`, "success");
  };

  const deleteProduct = async (id: string) => {
    const prod = products.find(p => p.id === id);
    const res = await deleteProductDB(id);
    if (!res.success) {
      throw new Error(res.error || "فشل حذف المنتج من قاعدة البيانات");
    }

    setProducts(prev => prev.filter(p => p.id !== id));
    setStockMovements(prev => prev.filter(sm => sm.productId !== id));

    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "delete",
      entityType: "Product",
      entityId: id,
      details: `حذف المنتج: ${prod?.nameAr || id}`,
    });

    showToast(locale === "ar" ? "تم حذف المنتج بنجاح" : "Product deleted successfully", "success");
  };

  // Categories CRUD
  const addCategory = async (c: Omit<ProductCategory, "id">): Promise<ProductCategory> => {
    const res = await persistCategoryDB(c);
    if (!res.success || !res.data) {
      throw new Error(res.error || "فشل حفظ التصنيف في قاعدة البيانات");
    }
    const savedCat = res.data;
    setCategories(prev => [...prev.filter(x => x.id !== savedCat.id), savedCat]);
    showToast(locale === "ar" ? `تمت إضافة التصنيف "${savedCat.nameAr}"` : `Category created`, "success");
    return savedCat;
  };
  const updateCategory = async (id: string, c: Partial<ProductCategory>) => {
    const res = await updateCategoryDB(id, c);
    if (!res.success || !res.data) {
      throw new Error(res.error || "فشل تعديل التصنيف في قاعدة البيانات");
    }
    const savedCat = res.data;
    setCategories(prev => prev.map(cat => cat.id === id ? { ...cat, ...savedCat } : cat));
    showToast(locale === "ar" ? "تم تحديث التصنيف بنجاح" : "Category updated", "success");
  };
  const deleteCategory = async (id: string) => {
    const res = await deleteCategoryDB(id);
    if (!res.success) {
      throw new Error(res.error || "فشل حذف التصنيف من قاعدة البيانات");
    }
    setCategories(prev => prev.filter(cat => cat.id !== id));
    showToast(locale === "ar" ? "تم حذف التصنيف بنجاح" : "Category deleted", "success");
  };

  // Units CRUD
  const addUnit = async (u: Omit<ProductUnit, "id">): Promise<ProductUnit> => {
    const res = await persistUnitDB(u);
    if (!res.success || !res.data) {
      throw new Error(res.error || "فشل حفظ وحدة القياس في قاعدة البيانات");
    }
    const savedUnit = res.data;
    setUnits(prev => [...prev.filter(x => x.id !== savedUnit.id), savedUnit]);
    showToast(locale === "ar" ? `تمت إضافة وحدة القياس "${savedUnit.nameAr}"` : `Unit created`, "success");
    return savedUnit;
  };
  const updateUnit = async (id: string, u: Partial<ProductUnit>) => {
    const res = await updateUnitDB(id, u);
    if (!res.success || !res.data) {
      throw new Error(res.error || "فشل تعديل وحدة القياس في قاعدة البيانات");
    }
    const savedUnit = res.data;
    setUnits(prev => prev.map(unit => unit.id === id ? { ...unit, ...savedUnit } : unit));
    showToast(locale === "ar" ? "تم تحديث وحدة القياس بنجاح" : "Unit updated", "success");
  };
  const deleteUnit = async (id: string) => {
    const res = await deleteUnitDB(id);
    if (!res.success) {
      throw new Error(res.error || "فشل حذف وحدة القياس من قاعدة البيانات");
    }
    setUnits(prev => prev.filter(unit => unit.id !== id));
    showToast(locale === "ar" ? "تم حذف وحدة القياس بنجاح" : "Unit deleted", "success");
  };

  // Warehouses CRUD
  const addWarehouse = async (w: Omit<Warehouse, "id">): Promise<Warehouse> => {
    const res = await persistWarehouseDB(w);
    if (!res.success || !res.data) {
      throw new Error(res.error || "فشل حفظ المستودع في قاعدة البيانات");
    }
    const savedWarehouse = res.data;
    setWarehouses(prev => [...prev.filter(x => x.id !== savedWarehouse.id), savedWarehouse]);
    showToast(locale === "ar" ? `تم إنشاء المستودع "${savedWarehouse.nameAr}" بنجاح` : `Warehouse created`, "success");
    return savedWarehouse;
  };
  const updateWarehouse = async (id: string, w: Partial<Warehouse>) => {
    const res = await updateWarehouseDB(id, w);
    if (!res.success || !res.data) {
      throw new Error(res.error || "فشل تعديل بيانات المستودع في قاعدة البيانات");
    }
    const savedWarehouse = res.data;
    setWarehouses(prev => prev.map(wh => wh.id === id ? { ...wh, ...savedWarehouse } : wh));
    showToast(locale === "ar" ? "تم تحديث بيانات المستودع بنجاح" : "Warehouse updated", "success");
  };
  const deleteWarehouse = async (id: string) => {
    const res = await deleteWarehouseDB(id);
    if (!res.success) {
      throw new Error(res.error || "فشل حذف المستودع من قاعدة البيانات");
    }
    setWarehouses(prev => prev.filter(wh => wh.id !== id));
    showToast(locale === "ar" ? "تم حذف المستودع بنجاح" : "Warehouse deleted", "success");
  };

  // Stock Movements CRUD
  const addStockMovement = async (m: Omit<StockMovement, "id">) => {
    const newM: StockMovement = { ...m, id: generateId() };
    setStockMovements(prev => [newM, ...prev]);
  };
  const updateStockMovement = async (id: string, sm: Partial<StockMovement>) => {
    const res = await updateStockMovementDB(id, sm);
    if (!res.success || !res.data) {
      throw new Error(res.error || "فشل تعديل حركة المخزون");
    }
    const updatedSm = res.data;
    setStockMovements(prev => prev.map(item => item.id === id ? { ...item, ...updatedSm } : item));
    showToast(locale === "ar" ? "تم تعديل حركة المخزون بنجاح" : "Stock movement updated", "success");
  };
  const deleteStockMovement = async (id: string) => {
    const res = await deleteStockMovementDB(id);
    if (!res.success) {
      throw new Error(res.error || "فشل حذف حركة المخزون");
    }
    setStockMovements(prev => prev.filter(item => item.id !== id));
    showToast(locale === "ar" ? "تم حذف حركة المخزون بنجاح" : "Stock movement deleted", "success");
  };

  // Period Closings CRUD
  const createPeriodClosing = async (closing: Omit<PeriodClosing, "id" | "createdAt">): Promise<PeriodClosing> => {
    const journalDraft = generatePeriodClosingJournal(
      closing.organizationId,
      closing.branchId || activeBranchId,
      closing.periodLabel,
      closing.closingDate,
      closing.cogsValue,
      accounts,
      currentUser.name
    );

    let createdJournalId: string | undefined = undefined;
    if (journalDraft) {
      const newJournal: JournalEntry = { ...journalDraft, id: generateId() };
      setJournalEntries(prev => [newJournal, ...prev]);
      await persistJournalEntryDB(newJournal);
      createdJournalId = newJournal.id;
    }

    const res = await persistPeriodClosingDB({
      ...closing,
      journalEntryId: createdJournalId,
    } as any);

    if (!res.success || !res.data) {
      throw new Error(res.error || "فشل حفظ الإقفال الدوري في قاعدة البيانات");
    }
    const savedClosing = res.data;
    setPeriodClosings(prev => [savedClosing, ...prev]);

    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "create",
      entityType: "PeriodClosing",
      entityId: savedClosing.id,
      details: `إجراء إقفال دوري للمخزون (${savedClosing.periodLabel}) بقيمة تكلفة مباعة ${savedClosing.cogsValue}`,
    });

    showToast(locale === "ar" ? `تم تنفيذ إقفال الفترة "${savedClosing.periodLabel}" بنجاح` : `Period closed successfully`, "success");
    return savedClosing;
  };

  // ==========================================
  // CUSTOMERS & SUPPLIERS CRUD
  // ==========================================
  const addCustomer = async (c: Omit<Customer, "id">): Promise<Customer> => {
    const res = await persistCustomerDB(c);
    if (!res.success || !res.data) {
      throw new Error(res.error || "فشل حفظ العميل في قاعدة البيانات");
    }
    const savedCust = res.data;
    setCustomers(prev => [savedCust, ...prev.filter(x => x.id !== savedCust.id)]);

    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "create",
      entityType: "Customer",
      entityId: savedCust.id,
      details: `إضافة عميل جديد: ${savedCust.nameAr}`,
    });

    showToast(locale === "ar" ? `تمت إضافة العميل "${savedCust.nameAr}" بنجاح` : `Customer created successfully`, "success");
    return savedCust;
  };

  const updateCustomer = async (id: string, c: Partial<Customer>) => {
    const res = await updateCustomerDB(id, c);
    if (!res.success || !res.data) {
      throw new Error(res.error || "فشل تعديل بيانات العميل في قاعدة البيانات");
    }
    const savedCust = res.data;
    setCustomers(prev => prev.map(item => item.id === id ? { ...item, ...savedCust } : item));

    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "update",
      entityType: "Customer",
      entityId: id,
      details: `تحديث بيانات العميل: ${savedCust.nameAr || id}`,
    });

    showToast(locale === "ar" ? "تم تحديث بيانات العميل بنجاح" : "Customer updated successfully", "success");
  };

  const deleteCustomer = async (id: string) => {
    const res = await deleteCustomerDB(id);
    if (!res.success) {
      throw new Error(res.error || "فشل حذف العميل من قاعدة البيانات");
    }
    setCustomers(prev => prev.filter(item => item.id !== id));

    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "delete",
      entityType: "Customer",
      entityId: id,
      details: `حذف العميل: ${id}`,
    });

    showToast(locale === "ar" ? "تم حذف العميل بنجاح" : "Customer deleted successfully", "success");
  };

  const addSupplier = async (s: Omit<Supplier, "id">): Promise<Supplier> => {
    const res = await persistSupplierDB(s);
    if (!res.success || !res.data) {
      throw new Error(res.error || "فشل حفظ المورد في قاعدة البيانات");
    }
    const savedSupp = res.data;
    setSuppliers(prev => [savedSupp, ...prev.filter(x => x.id !== savedSupp.id)]);

    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "create",
      entityType: "Supplier",
      entityId: savedSupp.id,
      details: `إضافة مورد جديد: ${savedSupp.nameAr}`,
    });

    showToast(locale === "ar" ? `تمت إضافة المورد "${savedSupp.nameAr}" بنجاح` : `Supplier created successfully`, "success");
    return savedSupp;
  };

  const updateSupplier = async (id: string, s: Partial<Supplier>) => {
    const res = await updateSupplierDB(id, s);
    if (!res.success || !res.data) {
      throw new Error(res.error || "فشل تعديل بيانات المورد في قاعدة البيانات");
    }
    const savedSupp = res.data;
    setSuppliers(prev => prev.map(item => item.id === id ? { ...item, ...savedSupp } : item));

    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "update",
      entityType: "Supplier",
      entityId: id,
      details: `تحديث بيانات المورد: ${savedSupp.nameAr || id}`,
    });

    showToast(locale === "ar" ? "تم تحديث بيانات المورد بنجاح" : "Supplier updated successfully", "success");
  };

  const deleteSupplier = async (id: string) => {
    const res = await deleteSupplierDB(id);
    if (!res.success) {
      throw new Error(res.error || "فشل حذف المورد من قاعدة البيانات");
    }
    setSuppliers(prev => prev.filter(item => item.id !== id));

    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "delete",
      entityType: "Supplier",
      entityId: id,
      details: `حذف المورد: ${id}`,
    });

    showToast(locale === "ar" ? "تم حذف المورد بنجاح" : "Supplier deleted successfully", "success");
  };

  // ==========================================
  // CUSTOMER CATEGORIES CRUD
  // ==========================================
  const addCustomerCategory = async (cat: Omit<CustomerCategory, "id">): Promise<CustomerCategory> => {
    const res = await persistCustomerCategoryDB(cat);
    if (!res.success || !res.data) {
      throw new Error(res.error || "فشل حفظ تصنيف العميل في قاعدة البيانات");
    }
    const savedCat = res.data;
    setCustomerCategories(prev => [...prev.filter(x => x.id !== savedCat.id), savedCat]);
    showToast(locale === "ar" ? `تمت إضافة التصنيف "${savedCat.nameAr}"` : `Category created`, "success");
    return savedCat;
  };

  const updateCustomerCategory = async (id: string, cat: Partial<CustomerCategory>) => {
    const res = await updateCustomerCategoryDB(id, cat);
    if (!res.success || !res.data) {
      throw new Error(res.error || "فشل تعديل تصنيف العميل في قاعدة البيانات");
    }
    const savedCat = res.data;
    setCustomerCategories(prev => prev.map(c => c.id === id ? { ...c, ...savedCat } : c));
    showToast(locale === "ar" ? "تم تحديث تصنيف العميل بنجاح" : "Category updated", "success");
  };

  const deleteCustomerCategory = async (id: string) => {
    const res = await deleteCustomerCategoryDB(id);
    if (!res.success) {
      throw new Error(res.error || "فشل حذف تصنيف العميل من قاعدة البيانات");
    }
    setCustomerCategories(prev => prev.filter(c => c.id !== id));
    showToast(locale === "ar" ? "تم حذف تصنيف العميل بنجاح" : "Category deleted", "success");
  };

  // Sales & Purchases CRUD
  const createSalesInvoice = async (inv: Omit<SalesInvoice, "id">): Promise<SalesInvoice> => {
    const res = await persistSalesInvoiceDB(inv as any);
    if (!res.success || !res.data) {
      throw new Error(res.error || "فشل حفظ فاتورة المبيعات في قاعدة البيانات");
    }
    const savedInvoice = res.data;
    const invoiceItems = savedInvoice.items || [];

    let totalCogs = 0;
    const movementsToCreate: StockMovement[] = [];

    // Deduct Stock & Create Stock Movements
    invoiceItems.forEach(item => {
      totalCogs += item.costPrice * item.quantity;
      
      movementsToCreate.push({
        id: generateId(),
        organizationId: organization.id,
        productId: item.productId,
        warehouseId: item.warehouseId,
        movementType: "sales_issue",
        referenceId: savedInvoice.id,
        referenceNumber: savedInvoice.invoiceNumber,
        date: savedInvoice.date,
        quantity: -Math.abs(item.quantity),
        unitCost: item.costPrice,
        totalCost: -Math.abs(item.costPrice * item.quantity),
        balanceQuantity: 0,
        partnerId: savedInvoice.customerId,
        partnerName: savedInvoice.customerName,
        partnerType: "customer",
        notes: `صرف مبيعات فاتورة ${savedInvoice.invoiceNumber}`,
      });

      setProducts(prev => prev.map(p => {
        if (p.id === item.productId) {
          const currentWhStock = p.warehouseStock[item.warehouseId] || 0;
          return {
            ...p,
            warehouseStock: {
              ...p.warehouseStock,
              [item.warehouseId]: Math.max(0, currentWhStock - item.quantity),
            }
          };
        }
        return p;
      }));
    });

    if (movementsToCreate.length > 0) {
      setStockMovements(prev => [...movementsToCreate, ...prev]);
    }

    if (savedInvoice.status === "unpaid" || savedInvoice.status === "partially_paid") {
      setCustomers(prev => prev.map(c =>
        c.id === savedInvoice.customerId ? { ...c, currentBalance: c.currentBalance + savedInvoice.dueAmount } : c
      ));
    }

    const journalDraft = generateSalesInvoiceJournal(savedInvoice, accounts, totalCogs);
    if (journalDraft) {
      const newJournal: JournalEntry = {
        ...journalDraft,
        id: generateId(),
        entryNumber: `JV-SALES-${savedInvoice.invoiceNumber}`,
        referenceId: savedInvoice.id,
        referenceType: "sales_invoice",
      };
      setJournalEntries(prev => [newJournal, ...prev.filter(j => j.referenceId !== savedInvoice.id && j.entryNumber !== newJournal.entryNumber)]);
    }

    setSalesInvoices(prev => [savedInvoice, ...prev.filter(x => x.id !== savedInvoice.id)]);

    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "create",
      entityType: "SalesInvoice",
      entityId: savedInvoice.id,
      details: `إصدار فاتورة مبيعات ${savedInvoice.invoiceNumber} بمبلغ ${savedInvoice.grandTotal}`,
    });

    showToast(locale === "ar" ? `تم إصدار فاتورة المبيعات (${savedInvoice.invoiceNumber}) وترحيل القيد والمخزن بنجاح` : `Sales invoice (${savedInvoice.invoiceNumber}) issued & posted successfully`, "success");
    return savedInvoice;
  };

  const formatAuditStamp = (referenceNumber: string) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString("ar-EG", { year: "numeric", month: "2-digit", day: "2-digit" });
    const timeStr = now.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
    return `[تم التعديل بواسطة: ${currentUser?.name || "مدير النظام"} في ${dateStr} ${timeStr} | مستند الأصل: ${referenceNumber}]`;
  };

  const updateSalesInvoice = async (id: string, inv: Partial<SalesInvoice>): Promise<SalesInvoice> => {
    const oldInvoice = salesInvoices.find(item => item.id === id);
    const res = await updateSalesInvoiceDB(id, inv);
    if (!res.success || !res.data) {
      throw new Error(res.error || "فشل تعديل فاتورة المبيعات في قاعدة البيانات");
    }
    const savedInvoice = res.data;

    // 1. Delta on Customer Balance
    const oldDue = (oldInvoice && (oldInvoice.status === "unpaid" || oldInvoice.status === "partially_paid"))
      ? (Number(oldInvoice.dueAmount) || 0) : 0;
    const newDue = (savedInvoice.status === "unpaid" || savedInvoice.status === "partially_paid")
      ? (Number(savedInvoice.dueAmount) || 0) : 0;

    if (savedInvoice.customerId) {
      if (oldInvoice && oldInvoice.customerId !== savedInvoice.customerId) {
        setCustomers(prev => prev.map(c => {
          if (c.id === oldInvoice.customerId) return { ...c, currentBalance: Math.max(0, c.currentBalance - oldDue) };
          if (c.id === savedInvoice.customerId) return { ...c, currentBalance: c.currentBalance + newDue };
          return c;
        }));
      } else {
        const delta = newDue - oldDue;
        if (delta !== 0) {
          setCustomers(prev => prev.map(c =>
            c.id === savedInvoice.customerId ? { ...c, currentBalance: Math.max(0, c.currentBalance + delta) } : c
          ));
        }
      }
    }

    // 2. Rebuild & update linked journal entry
    const existingJE = journalEntries.find(j =>
      j.referenceId === savedInvoice.id ||
      j.entryNumber === `JV-SALES-${savedInvoice.invoiceNumber}` ||
      (oldInvoice && j.entryNumber === `JV-SALES-${oldInvoice.invoiceNumber}`)
    );

    let totalCogs = 0;
    (savedInvoice.items || []).forEach(it => {
      totalCogs += (Number(it.costPrice) || 0) * (Number(it.quantity) || 0);
    });

    const stamp = formatAuditStamp(savedInvoice.invoiceNumber);
    const journalDraft = generateSalesInvoiceJournal(savedInvoice, accounts, totalCogs);

    if (existingJE && journalDraft) {
      const cleanDesc = existingJE.description.replace(/\s*\[تم التعديل[^\]]*\]/g, "").trim();
      const updatedJE: JournalEntry = {
        ...existingJE,
        lines: journalDraft.lines.map(l => ({ ...l, id: generateId() })),
        totalDebit: journalDraft.totalDebit,
        totalCredit: journalDraft.totalCredit,
        isBalanced: journalDraft.isBalanced,
        date: savedInvoice.date || existingJE.date,
        description: `${cleanDesc} ${stamp}`,
      };

      setJournalEntries(prev => prev.map(j => j.id === existingJE.id ? updatedJE : j));
      try {
        await updateJournalEntryDB(existingJE.id, updatedJE);
      } catch (err) {
        console.warn("Failed to persist updated journal entry:", err);
      }
    } else if (journalDraft) {
      const cleanDesc = journalDraft.description.replace(/\s*\[تم التعديل[^\]]*\]/g, "").trim();
      const newJE: JournalEntry = {
        ...journalDraft,
        id: generateId(),
        entryNumber: `JV-SALES-${savedInvoice.invoiceNumber}`,
        referenceId: savedInvoice.id,
        referenceType: "sales_invoice",
        description: `${cleanDesc} ${stamp}`,
      };
      setJournalEntries(prev => [newJE, ...prev]);
      try {
        await persistJournalEntryDB(newJE as any);
      } catch (err) {
        console.warn("Failed to persist new journal entry on invoice update:", err);
      }
    }

    setSalesInvoices(prev => prev.map(item => item.id === id ? { ...item, ...savedInvoice } : item));

    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "update",
      entityType: "SalesInvoice",
      entityId: savedInvoice.id,
      details: `تعديل فاتورة مبيعات ${savedInvoice.invoiceNumber} بمبلغ ${savedInvoice.grandTotal}`,
    });

    showToast(locale === "ar" ? `تم تحديث فاتورة المبيعات (${savedInvoice.invoiceNumber}) والقيود بنجاح` : `Sales invoice updated`, "success");
    return savedInvoice;
  };

  const deleteSalesInvoice = async (id: string) => {
    const res = await deleteSalesInvoiceDB(id);
    if (!res.success) {
      throw new Error(res.error || "فشل حذف فاتورة المبيعات من قاعدة البيانات");
    }
    setSalesInvoices(prev => prev.filter(inv => inv.id !== id));
    setStockMovements(prev => prev.filter(sm => sm.referenceId !== id));
    showToast(locale === "ar" ? "تم حذف فاتورة المبيعات بنجاح" : "Sales invoice deleted successfully", "success");
  };

  const createPurchaseInvoice = async (inv: Omit<PurchaseInvoice, "id">): Promise<PurchaseInvoice> => {
    const res = await persistPurchaseInvoiceDB(inv as any);
    if (!res.success || !res.data) {
      throw new Error(res.error || "فشل حفظ فاتورة المشتريات في قاعدة البيانات");
    }
    const savedInvoice = res.data;
    const invoiceItems = savedInvoice.items || [];

    const movementsToCreate: StockMovement[] = [];

    invoiceItems.forEach(item => {
      movementsToCreate.push({
        id: generateId(),
        organizationId: organization.id,
        productId: item.productId,
        warehouseId: item.warehouseId,
        movementType: "purchase_receipt",
        referenceId: savedInvoice.id,
        referenceNumber: savedInvoice.invoiceNumber,
        date: savedInvoice.date,
        quantity: Math.abs(item.quantity),
        unitCost: item.unitCost,
        totalCost: Math.abs(item.unitCost * item.quantity),
        balanceQuantity: 0,
        partnerId: savedInvoice.supplierId,
        partnerName: savedInvoice.supplierName,
        partnerType: "supplier",
        notes: `توريد مشتريات فاتورة ${savedInvoice.invoiceNumber}`,
      });

      setProducts(prev => prev.map(p => {
        if (p.id === item.productId) {
          const currentWhStock = p.warehouseStock[item.warehouseId] || 0;
          return {
            ...p,
            warehouseStock: {
              ...p.warehouseStock,
              [item.warehouseId]: currentWhStock + item.quantity,
            }
          };
        }
        return p;
      }));
    });

    if (movementsToCreate.length > 0) {
      setStockMovements(prev => [...movementsToCreate, ...prev]);
    }

    if (savedInvoice.status === "unpaid" || savedInvoice.status === "partially_paid") {
      setSuppliers(prev => prev.map(s =>
        s.id === savedInvoice.supplierId ? { ...s, currentBalance: s.currentBalance + savedInvoice.dueAmount } : s
      ));
    }

    const journalDraft = generatePurchaseInvoiceJournal(savedInvoice, accounts);
    if (journalDraft) {
      const newJournal: JournalEntry = {
        ...journalDraft,
        id: generateId(),
        entryNumber: `JV-PURCHASE-${savedInvoice.invoiceNumber}`,
        referenceId: savedInvoice.id,
        referenceType: "purchase_invoice",
      };
      setJournalEntries(prev => [newJournal, ...prev.filter(j => j.referenceId !== savedInvoice.id && j.entryNumber !== newJournal.entryNumber)]);
    }

    setPurchaseInvoices(prev => [savedInvoice, ...prev.filter(x => x.id !== savedInvoice.id)]);

    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "create",
      entityType: "PurchaseInvoice",
      entityId: savedInvoice.id,
      details: `تسجيل فاتورة مشتريات وتوريد مخزن ${savedInvoice.invoiceNumber} بمبلغ ${savedInvoice.grandTotal}`,
    });

    showToast(locale === "ar" ? `تم تسجيل فاتورة المشتريات (${savedInvoice.invoiceNumber}) وتوريد المخزون بنجاح` : `Purchase invoice (${savedInvoice.invoiceNumber}) registered & posted successfully`, "success");
    return savedInvoice;
  };

  const updatePurchaseInvoice = async (id: string, pinv: Partial<PurchaseInvoice>): Promise<PurchaseInvoice> => {
    const oldInvoice = purchaseInvoices.find(item => item.id === id);
    const res = await updatePurchaseInvoiceDB(id, pinv);
    if (!res.success || !res.data) {
      throw new Error(res.error || "فشل تعديل فاتورة المشتريات في قاعدة البيانات");
    }
    const savedInvoice = res.data;

    // 1. Delta on Supplier Balance
    const oldDue = (oldInvoice && (oldInvoice.status === "unpaid" || oldInvoice.status === "partially_paid"))
      ? (Number(oldInvoice.dueAmount) || 0) : 0;
    const newDue = (savedInvoice.status === "unpaid" || savedInvoice.status === "partially_paid")
      ? (Number(savedInvoice.dueAmount) || 0) : 0;

    if (savedInvoice.supplierId) {
      if (oldInvoice && oldInvoice.supplierId !== savedInvoice.supplierId) {
        setSuppliers(prev => prev.map(s => {
          if (s.id === oldInvoice.supplierId) return { ...s, currentBalance: Math.max(0, s.currentBalance - oldDue) };
          if (s.id === savedInvoice.supplierId) return { ...s, currentBalance: s.currentBalance + newDue };
          return s;
        }));
      } else {
        const delta = newDue - oldDue;
        if (delta !== 0) {
          setSuppliers(prev => prev.map(s =>
            s.id === savedInvoice.supplierId ? { ...s, currentBalance: Math.max(0, s.currentBalance + delta) } : s
          ));
        }
      }
    }

    // 2. Rebuild & update linked journal entry
    const existingJE = journalEntries.find(j =>
      j.referenceId === savedInvoice.id ||
      j.entryNumber === `JV-PURCHASE-${savedInvoice.invoiceNumber}` ||
      (oldInvoice && j.entryNumber === `JV-PURCHASE-${oldInvoice.invoiceNumber}`)
    );

    const stamp = formatAuditStamp(savedInvoice.invoiceNumber);
    const journalDraft = generatePurchaseInvoiceJournal(savedInvoice, accounts);

    if (existingJE && journalDraft) {
      const cleanDesc = existingJE.description.replace(/\s*\[تم التعديل[^\]]*\]/g, "").trim();
      const updatedJE: JournalEntry = {
        ...existingJE,
        lines: journalDraft.lines.map(l => ({ ...l, id: generateId() })),
        totalDebit: journalDraft.totalDebit,
        totalCredit: journalDraft.totalCredit,
        isBalanced: journalDraft.isBalanced,
        date: savedInvoice.date || existingJE.date,
        description: `${cleanDesc} ${stamp}`,
      };

      setJournalEntries(prev => prev.map(j => j.id === existingJE.id ? updatedJE : j));
      try {
        await updateJournalEntryDB(existingJE.id, updatedJE);
      } catch (err) {
        console.warn("Failed to persist updated journal entry:", err);
      }
    } else if (journalDraft) {
      const cleanDesc = journalDraft.description.replace(/\s*\[تم التعديل[^\]]*\]/g, "").trim();
      const newJE: JournalEntry = {
        ...journalDraft,
        id: generateId(),
        entryNumber: `JV-PURCHASE-${savedInvoice.invoiceNumber}`,
        referenceId: savedInvoice.id,
        referenceType: "purchase_invoice",
        description: `${cleanDesc} ${stamp}`,
      };
      setJournalEntries(prev => [newJE, ...prev]);
      try {
        await persistJournalEntryDB(newJE as any);
      } catch (err) {
        console.warn("Failed to persist new journal entry on purchase update:", err);
      }
    }

    setPurchaseInvoices(prev => prev.map(item => item.id === id ? { ...item, ...savedInvoice } : item));

    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "update",
      entityType: "PurchaseInvoice",
      entityId: savedInvoice.id,
      details: `تعديل فاتورة مشتريات ${savedInvoice.invoiceNumber} بمبلغ ${savedInvoice.grandTotal}`,
    });

    showToast(locale === "ar" ? `تم تحديث فاتورة المشتريات (${savedInvoice.invoiceNumber}) والقيود بنجاح` : `Purchase invoice updated`, "success");
    return savedInvoice;
  };

  const deletePurchaseInvoice = async (id: string) => {
    const res = await deletePurchaseInvoiceDB(id);
    if (!res.success) {
      throw new Error(res.error || "فشل حذف فاتورة المشتريات من قاعدة البيانات");
    }
    setPurchaseInvoices(prev => prev.filter(inv => inv.id !== id));
    setStockMovements(prev => prev.filter(sm => sm.referenceId !== id));
    showToast(locale === "ar" ? "تم حذف فاتورة المشتريات بنجاح" : "Purchase invoice deleted successfully", "success");
  };

  // Sales Returns CRUD
  const addSalesReturn = async (ret: Omit<SalesReturn, "id">): Promise<SalesReturn> => {
    const res = await persistSalesReturnDB(ret as any);
    if (!res.success || !res.data) {
      throw new Error(res.error || "فشل حفظ مرتجع المبيعات في قاعدة البيانات");
    }
    const savedReturn = res.data;
    const returnItems = savedReturn.items || [];
    const movementsToCreate: StockMovement[] = [];

    returnItems.forEach(item => {
      movementsToCreate.push({
        id: generateId(),
        organizationId: organization.id,
        productId: item.productId,
        warehouseId: item.warehouseId,
        movementType: "sales_return",
        referenceId: savedReturn.id,
        referenceNumber: savedReturn.returnNumber,
        date: savedReturn.date,
        quantity: Math.abs(item.quantity),
        unitCost: item.costPrice || item.unitPrice,
        totalCost: Math.abs((item.costPrice || item.unitPrice) * item.quantity),
        balanceQuantity: 0,
        partnerId: savedReturn.customerId,
        partnerName: savedReturn.customerName,
        partnerType: "customer",
        notes: `مرتجع مبيعات إشعار دائن ${savedReturn.returnNumber}`,
      });

      setProducts(prev => prev.map(p => {
        if (p.id === item.productId) {
          const currentWhStock = p.warehouseStock[item.warehouseId] || 0;
          return {
            ...p,
            warehouseStock: {
              ...p.warehouseStock,
              [item.warehouseId]: currentWhStock + item.quantity,
            }
          };
        }
        return p;
      }));
    });

    if (movementsToCreate.length > 0) {
      setStockMovements(prev => [...movementsToCreate, ...prev]);
    }

    if (savedReturn.refundMethod === "customer_balance" || !savedReturn.refundMethod) {
      setCustomers(prev => prev.map(c =>
        c.id === savedReturn.customerId ? { ...c, currentBalance: Math.max(0, c.currentBalance - savedReturn.grandTotal) } : c
      ));
    } else if (savedReturn.refundMethod === "treasury" && savedReturn.treasuryAccountId) {
      setTreasuryAccounts(prev => prev.map(t =>
        t.id === savedReturn.treasuryAccountId ? { ...t, balance: t.balance - savedReturn.grandTotal } : t
      ));
    }

    let returnCogs = 0;
    returnItems.forEach(it => {
      returnCogs += (Number(it.costPrice || it.unitPrice) || 0) * (Number(it.quantity) || 0);
    });
    const sretJournal = generateSalesReturnJournal(savedReturn, accounts, returnCogs);
    if (sretJournal) {
      setJournalEntries(prev => [{ ...sretJournal, id: generateId() }, ...prev]);
    }

    setSalesReturns(prev => [savedReturn, ...prev.filter(x => x.id !== savedReturn.id)]);

    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "create",
      entityType: "SalesReturn",
      entityId: savedReturn.id,
      details: `تسجيل مرتجع مبيعات ${savedReturn.returnNumber} بمبلغ ${savedReturn.grandTotal}`,
    });

    showToast(locale === "ar" ? `تم تسجيل مرتجع المبيعات (${savedReturn.returnNumber}) وإرجاع المخزون بنجاح` : `Sales return (${savedReturn.returnNumber}) registered`, "success");
    return savedReturn;
  };

  const deleteSalesReturn = async (id: string) => {
    const res = await deleteSalesReturnDB(id);
    if (!res.success) {
      throw new Error(res.error || "فشل حذف مرتجع المبيعات");
    }
    setSalesReturns(prev => prev.filter(r => r.id !== id));
    setStockMovements(prev => prev.filter(sm => sm.referenceId !== id));
    setJournalEntries(prev => prev.filter(je => je.referenceId !== id));
    showToast(locale === "ar" ? "تم حذف مرتجع المبيعات بنجاح" : "Sales return deleted", "success");
  };

  // Purchase Returns CRUD
  const addPurchaseReturn = async (ret: Omit<PurchaseReturn, "id">): Promise<PurchaseReturn> => {
    const res = await persistPurchaseReturnDB(ret as any);
    if (!res.success || !res.data) {
      throw new Error(res.error || "فشل حفظ مرتجع المشتريات في قاعدة البيانات");
    }
    const savedReturn = res.data;
    const returnItems = savedReturn.items || [];
    const movementsToCreate: StockMovement[] = [];

    returnItems.forEach(item => {
      movementsToCreate.push({
        id: generateId(),
        organizationId: organization.id,
        productId: item.productId,
        warehouseId: item.warehouseId,
        movementType: "purchase_return",
        referenceId: savedReturn.id,
        referenceNumber: savedReturn.returnNumber,
        date: savedReturn.date,
        quantity: -Math.abs(item.quantity),
        unitCost: item.unitCost,
        totalCost: -Math.abs(item.unitCost * item.quantity),
        balanceQuantity: 0,
        partnerId: savedReturn.supplierId,
        partnerName: savedReturn.supplierName,
        partnerType: "supplier",
        notes: `مرتجع مشتريات إشعار مدين ${savedReturn.returnNumber}`,
      });

      setProducts(prev => prev.map(p => {
        if (p.id === item.productId) {
          const currentWhStock = p.warehouseStock[item.warehouseId] || 0;
          return {
            ...p,
            warehouseStock: {
              ...p.warehouseStock,
              [item.warehouseId]: Math.max(0, currentWhStock - item.quantity),
            }
          };
        }
        return p;
      }));
    });

    if (movementsToCreate.length > 0) {
      setStockMovements(prev => [...movementsToCreate, ...prev]);
    }

    if (savedReturn.refundMethod === "supplier_balance" || !savedReturn.refundMethod) {
      setSuppliers(prev => prev.map(s =>
        s.id === savedReturn.supplierId ? { ...s, currentBalance: Math.max(0, s.currentBalance - savedReturn.grandTotal) } : s
      ));
    } else if (savedReturn.refundMethod === "treasury" && savedReturn.treasuryAccountId) {
      setTreasuryAccounts(prev => prev.map(t =>
        t.id === savedReturn.treasuryAccountId ? { ...t, balance: t.balance + savedReturn.grandTotal } : t
      ));
    }

    const pretJournal = generatePurchaseReturnJournal(savedReturn, accounts);
    if (pretJournal) {
      setJournalEntries(prev => [{ ...pretJournal, id: generateId() }, ...prev]);
    }

    setPurchaseReturns(prev => [savedReturn, ...prev.filter(x => x.id !== savedReturn.id)]);

    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "create",
      entityType: "PurchaseReturn",
      entityId: savedReturn.id,
      details: `تسجيل مرتجع مشتريات ${savedReturn.returnNumber} بمبلغ ${savedReturn.grandTotal}`,
    });

    showToast(locale === "ar" ? `تم تسجيل مرتجع المشتريات (${savedReturn.returnNumber}) بنجاح` : `Purchase return (${savedReturn.returnNumber}) registered`, "success");
    return savedReturn;
  };

  const deletePurchaseReturn = async (id: string) => {
    const res = await deletePurchaseReturnDB(id);
    if (!res.success) {
      throw new Error(res.error || "فشل حذف مرتجع المشتريات");
    }
    setPurchaseReturns(prev => prev.filter(r => r.id !== id));
    setStockMovements(prev => prev.filter(sm => sm.referenceId !== id));
    setJournalEntries(prev => prev.filter(je => je.referenceId !== id));
    showToast(locale === "ar" ? "تم حذف مرتجع المشتريات بنجاح" : "Purchase return deleted", "success");
  };

  // ==========================================
  // STATEMENTS & BALANCE REPORTS GENERATION
  // ==========================================
  const getCustomerStatement = useCallback((customerId: string, fromDate?: string, toDate?: string): PartnerStatement => {
    const customer = customers.find(c => c.id === customerId);
    const openingBal = Number(customer?.openingBalance) || 0;
    const partnerName = customer?.nameAr || customer?.nameEn || "العميل";

    const allTx: StatementTransaction[] = [];

    // 1. Opening Balance Transaction
    if (openingBal !== 0) {
      allTx.push({
        id: `open-${customerId}`,
        date: "2026-01-01",
        type: "opening_balance",
        referenceNumber: "OPENING",
        description: "رصيد أول المدة",
        debit: openingBal > 0 ? openingBal : 0,
        credit: openingBal < 0 ? Math.abs(openingBal) : 0,
        balance: openingBal,
      });
    }

    // 2. Sales Invoices
    salesInvoices.filter(inv => inv.customerId === customerId && inv.invoiceType !== "quotation").forEach(inv => {
      allTx.push({
        id: inv.id,
        date: inv.date,
        type: "invoice",
        referenceNumber: inv.invoiceNumber,
        description: `فاتورة مبيعات ${inv.invoiceNumber}`,
        debit: Number(inv.grandTotal) || 0,
        credit: 0,
        balance: 0,
      });
    });

    // 3. Cash Receipts
    cashReceipts.filter(rcp => rcp.customerId === customerId).forEach(rcp => {
      allTx.push({
        id: rcp.id,
        date: rcp.date,
        type: "receipt",
        referenceNumber: rcp.receiptNumber,
        description: `سند قبض ${rcp.receiptNumber} (${rcp.notes || ""})`,
        debit: 0,
        credit: Number(rcp.amount) || 0,
        balance: 0,
      });
    });

    // 4. Sales Returns
    salesReturns.filter(ret => ret.customerId === customerId).forEach(ret => {
      allTx.push({
        id: ret.id,
        date: ret.date,
        type: "return",
        referenceNumber: ret.returnNumber,
        description: `مرتجع مبيعات ${ret.returnNumber}`,
        debit: 0,
        credit: Number(ret.grandTotal) || 0,
        balance: 0,
      });
    });

    // 5. Incoming Checks (Receipt Checks)
    checks.filter(chk => chk.type === "incoming" && chk.customerId === customerId).forEach(chk => {
      const chkDate = chk.issueDate || (chk.createdAt ? chk.createdAt.split("T")[0] : "2026-01-01");
      const bank = chk.draweeBank || chk.bankName || "البنك";
      allTx.push({
        id: chk.id,
        date: chkDate,
        type: "check_receipt",
        referenceNumber: chk.voucherNumber || chk.checkNumber,
        description: `سند قبض شيكات ${chk.voucherNumber ? `رقم ${chk.voucherNumber}` : ""} - شيك رقم ${chk.checkNumber} (${bank})${chk.dueDate ? ` - استحقاق ${chk.dueDate}` : ""}`,
        debit: 0,
        credit: Number(chk.amount) || 0,
        balance: 0,
      });
    });

    // Sort by Date ascending
    allTx.sort((a, b) => a.date.localeCompare(b.date));

    // Compute running balance
    let running = 0;
    allTx.forEach(tx => {
      running += (tx.debit - tx.credit);
      tx.balance = running;
    });

    // Filter by Date if requested
    const filteredTx = allTx.filter(tx => {
      if (fromDate && tx.date < fromDate) return false;
      if (toDate && tx.date > toDate) return false;
      return true;
    });

    const totalDebit = filteredTx.reduce((sum, tx) => sum + tx.debit, 0);
    const totalCredit = filteredTx.reduce((sum, tx) => sum + tx.credit, 0);
    const closingBalance = filteredTx.length > 0 ? filteredTx[filteredTx.length - 1].balance : running;

    return {
      partnerId: customerId,
      partnerName,
      openingBalance: openingBal,
      totalDebit,
      totalCredit,
      closingBalance,
      transactions: filteredTx,
    };
  }, [customers, salesInvoices, cashReceipts, salesReturns, checks]);

  const getSupplierStatement = useCallback((supplierId: string, fromDate?: string, toDate?: string): PartnerStatement => {
    const supplier = suppliers.find(s => s.id === supplierId);
    const openingBal = Number(supplier?.openingBalance) || 0;
    const partnerName = supplier?.nameAr || supplier?.nameEn || "المورد";

    const allTx: StatementTransaction[] = [];

    // 1. Opening Balance
    if (openingBal !== 0) {
      allTx.push({
        id: `open-${supplierId}`,
        date: "2026-01-01",
        type: "opening_balance",
        referenceNumber: "OPENING",
        description: "رصيد أول المدة",
        debit: openingBal < 0 ? Math.abs(openingBal) : 0,
        credit: openingBal > 0 ? openingBal : 0,
        balance: openingBal,
      });
    }

    // 2. Purchase Invoices
    purchaseInvoices.filter(inv => inv.supplierId === supplierId && inv.invoiceType !== "purchase_order").forEach(inv => {
      allTx.push({
        id: inv.id,
        date: inv.date,
        type: "invoice",
        referenceNumber: inv.invoiceNumber,
        description: `فاتورة مشتريات ${inv.invoiceNumber}`,
        debit: 0,
        credit: Number(inv.grandTotal) || 0,
        balance: 0,
      });
    });

    // 3. Cash Payments
    cashPayments.filter(pay => pay.supplierId === supplierId).forEach(pay => {
      allTx.push({
        id: pay.id,
        date: pay.date,
        type: "payment",
        referenceNumber: pay.paymentNumber,
        description: `سند صرف ${pay.paymentNumber} (${pay.notes || ""})`,
        debit: Number(pay.amount) || 0,
        credit: 0,
        balance: 0,
      });
    });

    // 4. Purchase Returns
    purchaseReturns.filter(ret => ret.supplierId === supplierId).forEach(ret => {
      allTx.push({
        id: ret.id,
        date: ret.date,
        type: "return",
        referenceNumber: ret.returnNumber,
        description: `مرتجع مشتريات ${ret.returnNumber}`,
        debit: Number(ret.grandTotal) || 0,
        credit: 0,
        balance: 0,
      });
    });

    // 5. Outgoing Checks (Payment Checks)
    checks.filter(chk => chk.type === "outgoing" && chk.supplierId === supplierId).forEach(chk => {
      const chkDate = chk.issueDate || (chk.createdAt ? chk.createdAt.split("T")[0] : "2026-01-01");
      const bank = chk.draweeBank || chk.bankName || "البنك";
      allTx.push({
        id: chk.id,
        date: chkDate,
        type: "check_payment",
        referenceNumber: chk.voucherNumber || chk.checkNumber,
        description: `سند صرف شيكات ${chk.voucherNumber ? `رقم ${chk.voucherNumber}` : ""} - شيك رقم ${chk.checkNumber} (${bank})${chk.dueDate ? ` - استحقاق ${chk.dueDate}` : ""}`,
        debit: Number(chk.amount) || 0,
        credit: 0,
        balance: 0,
      });
    });

    // Sort by Date ascending
    allTx.sort((a, b) => a.date.localeCompare(b.date));

    // Compute running balance for supplier (Credit increases balance owed, Debit decreases)
    let running = 0;
    allTx.forEach(tx => {
      running += (tx.credit - tx.debit);
      tx.balance = running;
    });

    // Filter by Date
    const filteredTx = allTx.filter(tx => {
      if (fromDate && tx.date < fromDate) return false;
      if (toDate && tx.date > toDate) return false;
      return true;
    });

    const totalDebit = filteredTx.reduce((sum, tx) => sum + tx.debit, 0);
    const totalCredit = filteredTx.reduce((sum, tx) => sum + tx.credit, 0);
    const closingBalance = filteredTx.length > 0 ? filteredTx[filteredTx.length - 1].balance : running;

    return {
      partnerId: supplierId,
      partnerName,
      openingBalance: openingBal,
      totalDebit,
      totalCredit,
      closingBalance,
      transactions: filteredTx,
    };
  }, [suppliers, purchaseInvoices, cashPayments, purchaseReturns, checks]);

  const getCustomerBalancesReport = useCallback((fromDate?: string, toDate?: string, categoryId?: string) => {
    let filteredCusts = customers;
    if (categoryId && categoryId !== "all") {
      filteredCusts = filteredCusts.filter(c => c.categoryId === categoryId);
    }

    return filteredCusts.map(c => {
      const stmt = getCustomerStatement(c.id, fromDate, toDate);
      return {
        customerId: c.id,
        customerName: c.nameAr || c.nameEn,
        categoryName: c.categoryName,
        openingBalance: stmt.openingBalance,
        debitMovements: stmt.totalDebit,
        creditMovements: stmt.totalCredit,
        currentBalance: stmt.closingBalance,
      };
    });
  }, [customers, getCustomerStatement]);

  const getSupplierBalancesReport = useCallback((fromDate?: string, toDate?: string) => {
    return suppliers.map(s => {
      const stmt = getSupplierStatement(s.id, fromDate, toDate);
      return {
        supplierId: s.id,
        supplierCode: s.code,
        supplierName: s.nameAr || s.nameEn,
        openingBalance: stmt.openingBalance,
        debitMovements: stmt.totalDebit,
        creditMovements: stmt.totalCredit,
        currentBalance: stmt.closingBalance,
      };
    });
  }, [suppliers, getSupplierStatement]);

  // ==========================================
  // TREASURY, CASH, CHECKS, ACCOUNTING CRUD
  // ==========================================
  const addTreasuryAccount = async (t: Omit<TreasuryAccount, "id">): Promise<TreasuryAccount> => {
    const res = await persistTreasuryAccountDB(t as any);
    if (!res.success || !res.data) throw new Error(res.error || "فشل إضافة الخزينة/الحساب البنكي");
    const saved = res.data;
    setTreasuryAccounts(prev => [...prev, saved]);
    showToast(locale === "ar" ? "تمت إضافة الخزينة بنجاح" : "Treasury added", "success");
    return saved;
  };

  const updateTreasuryAccount = async (id: string, t: Partial<TreasuryAccount>) => {
    const res = await updateTreasuryAccountDB(id, t);
    if (!res.success) throw new Error(res.error || "فشل تعديل الخزينة");
    setTreasuryAccounts(prev => prev.map(item => item.id === id ? { ...item, ...t } : item));
    showToast(locale === "ar" ? "تم تحديث بيانات الخزينة بنجاح" : "Treasury updated", "success");
  };

  const deleteTreasuryAccount = async (id: string) => {
    const res = await deleteTreasuryAccountDB(id);
    if (!res.success) throw new Error(res.error || "فشل حذف الخزينة");
    setTreasuryAccounts(prev => prev.filter(item => item.id !== id));
    showToast(locale === "ar" ? "تم حذف الخزينة بنجاح" : "Treasury deleted", "success");
  };

  const createCashReceipt = async (rcp: Omit<CashReceipt, "id">): Promise<CashReceipt> => {
    const res = await persistCashReceiptDB(rcp as any);
    if (!res.success || !res.data) throw new Error(res.error || "فشل إنشاء سند القبض");
    const saved = res.data;
    setCashReceipts(prev => [saved, ...prev]);
    setTreasuryAccounts(prev => prev.map(t => t.id === saved.treasuryAccountId ? { ...t, balance: (Number(t.balance) || 0) + saved.amount } : t));
    if (saved.customerId) {
      setCustomers(prev => prev.map(c => c.id === saved.customerId ? { ...c, currentBalance: Math.max(0, (Number(c.currentBalance) || 0) - saved.amount) } : c));
    }
    // Auto generate Journal Entry
    try {
      const tr = treasuryAccounts.find(t => t.id === saved.treasuryAccountId);
      const trGlId = tr?.glAccountId || accounts.find(a => a.code === "1101001")?.id || accounts[0]?.id;
      if (trGlId && accounts.length > 0) {
        const je = generateReceiptJournal(saved, trGlId, accounts);
        await persistJournalEntryDB(je as any).then(jr => {
          if (jr.success && jr.data) {
            const savedJE = jr.data;
            setJournalEntries(prev => [savedJE, ...prev]);
          }
        });
      }
    } catch (e) {
      console.error("Auto JE for cash receipt error:", e);
    }
    showToast(locale === "ar" ? `تم تسجيل سند القبض (${saved.receiptNumber}) بنجاح` : "Cash receipt created", "success");
    return saved;
  };

  const updateCashReceipt = async (id: string, rcp: Partial<CashReceipt>): Promise<CashReceipt> => {
    const oldReceipt = cashReceipts.find(r => r.id === id);
    const res = await updateCashReceiptDB(id, rcp);
    if (!res.success || !res.data) throw new Error(res.error || "فشل تعديل سند القبض");
    const saved = res.data;

    const oldAmount = Number(oldReceipt?.amount) || 0;
    const newAmount = Number(saved.amount) || 0;

    // Adjust treasury account balance
    if (oldReceipt && oldReceipt.treasuryAccountId !== saved.treasuryAccountId) {
      setTreasuryAccounts(prev => prev.map(t => {
        if (t.id === oldReceipt.treasuryAccountId) return { ...t, balance: (Number(t.balance) || 0) - oldAmount };
        if (t.id === saved.treasuryAccountId) return { ...t, balance: (Number(t.balance) || 0) + newAmount };
        return t;
      }));
    } else {
      const delta = newAmount - oldAmount;
      if (delta !== 0) {
        setTreasuryAccounts(prev => prev.map(t =>
          t.id === saved.treasuryAccountId ? { ...t, balance: (Number(t.balance) || 0) + delta } : t
        ));
      }
    }

    // Adjust customer balance
    if (oldReceipt && oldReceipt.customerId !== saved.customerId) {
      if (oldReceipt.customerId) {
        setCustomers(prev => prev.map(c => c.id === oldReceipt.customerId ? { ...c, currentBalance: c.currentBalance + oldAmount } : c));
      }
      if (saved.customerId) {
        setCustomers(prev => prev.map(c => c.id === saved.customerId ? { ...c, currentBalance: Math.max(0, c.currentBalance - newAmount) } : c));
      }
    } else if (saved.customerId) {
      const delta = newAmount - oldAmount;
      if (delta !== 0) {
        setCustomers(prev => prev.map(c =>
          c.id === saved.customerId ? { ...c, currentBalance: Math.max(0, c.currentBalance - delta) } : c
        ));
      }
    }

    // Rebuild Journal Entry
    const existingJE = journalEntries.find(j =>
      j.referenceId === saved.id ||
      j.entryNumber === `JV-RCP-${saved.receiptNumber}` ||
      (oldReceipt && j.entryNumber === `JV-RCP-${oldReceipt.receiptNumber}`)
    );

    const stamp = formatAuditStamp(saved.receiptNumber);
    const tr = treasuryAccounts.find(t => t.id === saved.treasuryAccountId);
    const trGlId = tr?.glAccountId || accounts.find(a => a.code === "1101001")?.id || accounts[0]?.id;

    if (trGlId && accounts.length > 0) {
      const journalDraft = generateReceiptJournal(saved, trGlId, accounts);
      if (existingJE && journalDraft) {
        const cleanDesc = existingJE.description.replace(/\s*\[تم التعديل[^\]]*\]/g, "").trim();
        const updatedJE: JournalEntry = {
          ...existingJE,
          lines: journalDraft.lines.map(l => ({ ...l, id: generateId() })),
          totalDebit: journalDraft.totalDebit,
          totalCredit: journalDraft.totalCredit,
          date: saved.date || existingJE.date,
          description: `${cleanDesc} ${stamp}`,
        };
        setJournalEntries(prev => prev.map(j => j.id === existingJE.id ? updatedJE : j));
        try {
          await updateJournalEntryDB(existingJE.id, updatedJE);
        } catch (err) {
          console.warn("Failed to update JE for cash receipt:", err);
        }
      }
    }

    setCashReceipts(prev => prev.map(r => r.id === id ? saved : r));
    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "update",
      entityType: "CashReceipt",
      entityId: saved.id,
      details: `تعديل سند قبض ${saved.receiptNumber} بمبلغ ${saved.amount}`,
    });
    showToast(locale === "ar" ? `تم تعديل سند القبض (${saved.receiptNumber}) وتحديث القيد بنجاح` : "Cash receipt updated", "success");
    return saved;
  };

  const deleteCashReceipt = async (id: string) => {
    const res = await deleteCashReceiptDB(id);
    if (!res.success) throw new Error(res.error || "فشل حذف سند القبض");
    setCashReceipts(prev => prev.filter(r => r.id !== id));
    showToast(locale === "ar" ? "تم حذف سند القبض بنجاح" : "Receipt deleted", "success");
  };

  const createCashPayment = async (pay: Omit<CashPayment, "id">): Promise<CashPayment> => {
    const res = await persistCashPaymentDB(pay as any);
    if (!res.success || !res.data) throw new Error(res.error || "فشل إنشاء سند الصرف");
    const saved = res.data;
    setCashPayments(prev => [saved, ...prev]);
    setTreasuryAccounts(prev => prev.map(t => t.id === saved.treasuryAccountId ? { ...t, balance: (Number(t.balance) || 0) - saved.amount } : t));
    if (saved.supplierId) {
      setSuppliers(prev => prev.map(s => s.id === saved.supplierId ? { ...s, currentBalance: Math.max(0, (Number(s.currentBalance) || 0) - saved.amount) } : s));
    }
    // Auto generate Journal Entry
    try {
      const tr = treasuryAccounts.find(t => t.id === saved.treasuryAccountId);
      const trGlId = tr?.glAccountId || accounts.find(a => a.code === "1101001")?.id || accounts[0]?.id;
      if (trGlId && accounts.length > 0) {
        const je = generatePaymentJournal(saved, trGlId, accounts);
        await persistJournalEntryDB(je as any).then(jr => {
          if (jr.success && jr.data) {
            const savedJE = jr.data;
            setJournalEntries(prev => [savedJE, ...prev]);
          }
        });
      }
    } catch (e) {
      console.error("Auto JE for cash payment error:", e);
    }
    showToast(locale === "ar" ? `تم تسجيل سند الصرف (${saved.paymentNumber}) بنجاح` : "Cash payment created", "success");
    return saved;
  };

  const updateCashPayment = async (id: string, pay: Partial<CashPayment>): Promise<CashPayment> => {
    const oldPayment = cashPayments.find(p => p.id === id);
    const res = await updateCashPaymentDB(id, pay);
    if (!res.success || !res.data) throw new Error(res.error || "فشل تعديل سند الصرف");
    const saved = res.data;

    const oldAmount = Number(oldPayment?.amount) || 0;
    const newAmount = Number(saved.amount) || 0;

    // Adjust treasury account balance (Payment decreases treasury)
    if (oldPayment && oldPayment.treasuryAccountId !== saved.treasuryAccountId) {
      setTreasuryAccounts(prev => prev.map(t => {
        if (t.id === oldPayment.treasuryAccountId) return { ...t, balance: (Number(t.balance) || 0) + oldAmount };
        if (t.id === saved.treasuryAccountId) return { ...t, balance: (Number(t.balance) || 0) - newAmount };
        return t;
      }));
    } else {
      const delta = newAmount - oldAmount;
      if (delta !== 0) {
        setTreasuryAccounts(prev => prev.map(t =>
          t.id === saved.treasuryAccountId ? { ...t, balance: (Number(t.balance) || 0) - delta } : t
        ));
      }
    }

    // Adjust supplier balance (Payment reduces supplier debt)
    if (oldPayment && oldPayment.supplierId !== saved.supplierId) {
      if (oldPayment.supplierId) {
        setSuppliers(prev => prev.map(s => s.id === oldPayment.supplierId ? { ...s, currentBalance: s.currentBalance + oldAmount } : s));
      }
      if (saved.supplierId) {
        setSuppliers(prev => prev.map(s => s.id === saved.supplierId ? { ...s, currentBalance: Math.max(0, s.currentBalance - newAmount) } : s));
      }
    } else if (saved.supplierId) {
      const delta = newAmount - oldAmount;
      if (delta !== 0) {
        setSuppliers(prev => prev.map(s =>
          s.id === saved.supplierId ? { ...s, currentBalance: Math.max(0, s.currentBalance - delta) } : s
        ));
      }
    }

    // Rebuild Journal Entry
    const existingJE = journalEntries.find(j =>
      j.referenceId === saved.id ||
      j.entryNumber === `JV-PAY-${saved.paymentNumber}` ||
      (oldPayment && j.entryNumber === `JV-PAY-${oldPayment.paymentNumber}`)
    );

    const stamp = formatAuditStamp(saved.paymentNumber);
    const tr = treasuryAccounts.find(t => t.id === saved.treasuryAccountId);
    const trGlId = tr?.glAccountId || accounts.find(a => a.code === "1101001")?.id || accounts[0]?.id;

    if (trGlId && accounts.length > 0) {
      const journalDraft = generatePaymentJournal(saved, trGlId, accounts);
      if (existingJE && journalDraft) {
        const cleanDesc = existingJE.description.replace(/\s*\[تم التعديل[^\]]*\]/g, "").trim();
        const updatedJE: JournalEntry = {
          ...existingJE,
          lines: journalDraft.lines.map(l => ({ ...l, id: generateId() })),
          totalDebit: journalDraft.totalDebit,
          totalCredit: journalDraft.totalCredit,
          date: saved.date || existingJE.date,
          description: `${cleanDesc} ${stamp}`,
        };
        setJournalEntries(prev => prev.map(j => j.id === existingJE.id ? updatedJE : j));
        try {
          await updateJournalEntryDB(existingJE.id, updatedJE);
        } catch (err) {
          console.warn("Failed to update JE for cash payment:", err);
        }
      }
    }

    setCashPayments(prev => prev.map(p => p.id === id ? saved : p));
    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "update",
      entityType: "CashPayment",
      entityId: saved.id,
      details: `تعديل سند صرف ${saved.paymentNumber} بمبلغ ${saved.amount}`,
    });
    showToast(locale === "ar" ? `تم تعديل سند الصرف (${saved.paymentNumber}) وتحديث القيد بنجاح` : "Cash payment updated", "success");
    return saved;
  };

  const deleteCashPayment = async (id: string) => {
    const res = await deleteCashPaymentDB(id);
    if (!res.success) throw new Error(res.error || "فشل حذف سند الصرف");
    setCashPayments(prev => prev.filter(p => p.id !== id));
    showToast(locale === "ar" ? "تم حذف سند الصرف بنجاح" : "Payment deleted", "success");
  };

  const addCheck = async (chk: Omit<CheckRecord, "id">, skipAutoJE = false): Promise<CheckRecord> => {
    const res = await persistCheckDB(chk as any);
    if (!res.success || !res.data) throw new Error(res.error || "فشل حفظ الشيك");
    const saved = res.data;
    setChecks(prev => [saved, ...prev]);
    // Auto generate Journal Entry if not skipped
    if (!skipAutoJE) {
      try {
        if (accounts.length > 0) {
          let jeData = null;
          if (saved.type === "incoming") {
            jeData = generateReceivableCheckJournal(saved, accounts);
          } else if (saved.type === "outgoing") {
            jeData = generatePayableCheckJournal(saved, accounts);
          }
          if (jeData) {
            await persistJournalEntryDB(jeData as any).then(jr => {
              if (jr.success && jr.data) {
                const savedJE = jr.data;
                setJournalEntries(prev => [savedJE, ...prev]);
              }
            });
          }
        }
      } catch (e) {
        console.error("Auto JE for check error:", e);
      }
    }
    showToast(locale === "ar" ? `تم تسجيل الشيك (${saved.checkNumber}) بنجاح` : "Check added", "success");
    return saved;
  };

  const addCheckReceiptVoucher = async (voucherData: {
    voucherNumber: string;
    voucherDate: string;
    partyName: string;
    customerId?: string;
    accountId?: string;
    costCenterId?: string;
    notes?: string;
    checks: Array<{
      checkNumber: string;
      bankName: string;
      draweeBank?: string;
      dueDate: string;
      amount: number;
    }>;
  }): Promise<CheckRecord[]> => {
    const createdChecks: CheckRecord[] = [];
    for (const item of voucherData.checks) {
      if (item.amount > 0) {
        const chk = await addCheck({
          organizationId: organization.id,
          branchId: activeBranchId,
          checkNumber: item.checkNumber,
          bankName: item.bankName || item.draweeBank || "البنك",
          draweeBank: item.draweeBank || item.bankName,
          type: "incoming",
          partyName: voucherData.partyName,
          customerId: voucherData.customerId,
          accountId: voucherData.accountId,
          costCenterId: voucherData.costCenterId,
          voucherNumber: voucherData.voucherNumber,
          amount: item.amount,
          issueDate: voucherData.voucherDate,
          dueDate: item.dueDate,
          status: "in_treasury",
          notes: voucherData.notes,
          createdBy: currentUser.name
        }, true); // skip individual journal entries!
        createdChecks.push(chk);
      }
    }

    // Now generate ONE consolidated journal entry for the whole voucher
    try {
      if (accounts.length > 0 && createdChecks.length > 0) {
        const jeData = generateCheckReceiptVoucherJournal(
          voucherData.voucherNumber,
          voucherData.voucherDate,
          voucherData.checks,
          voucherData.partyName,
          voucherData.customerId,
          voucherData.costCenterId,
          organization.id,
          activeBranchId,
          accounts,
          currentUser.name,
          voucherData.notes
        );

        if (jeData) {
          const jr = await persistJournalEntryDB(jeData as any);
          if (jr.success && jr.data) {
            const savedJE = jr.data as JournalEntry;
            setJournalEntries(prev => [savedJE, ...prev]);
          }
        }
      }
    } catch (e) {
      console.error("Consolidated JE error for check voucher:", e);
    }

    showToast(locale === "ar" ? `تم حفظ سند قبض الشيكات رقم ${voucherData.voucherNumber} وقيده المحاسبي بنجاح` : `Check voucher saved`, "success");
    return createdChecks;
  };

  const updateCheck = async (id: string, chk: Partial<CheckRecord>): Promise<CheckRecord> => {
    const oldCheck = checks.find(c => c.id === id);
    const res = await updateCheckDB(id, chk);
    if (!res.success || !res.data) throw new Error(res.error || "فشل تعديل الشيك");
    const saved = res.data;

    const oldAmount = Number(oldCheck?.amount) || 0;
    const newAmount = Number(saved.amount) || 0;
    const delta = newAmount - oldAmount;

    // If check was collected and deposited in treasury, adjust treasury balance
    if (saved.status === "collected" && saved.targetTreasuryId && delta !== 0) {
      const tDelta = saved.type === "incoming" ? delta : -delta;
      setTreasuryAccounts(prev => prev.map(t =>
        t.id === saved.targetTreasuryId ? { ...t, balance: (Number(t.balance) || 0) + tDelta } : t
      ));
    }

    // Rebuild linked journal entry
    const existingJE = journalEntries.find(j =>
      j.referenceId === saved.id ||
      j.entryNumber === (saved.type === "incoming" ? `JV-CHK-IN-${saved.checkNumber}` : `JV-PCHK-${saved.checkNumber}`) ||
      (oldCheck && j.entryNumber === (oldCheck.type === "incoming" ? `JV-CHK-IN-${oldCheck.checkNumber}` : `JV-PCHK-${oldCheck.checkNumber}`))
    );

    const stamp = formatAuditStamp(saved.checkNumber);
    if (accounts.length > 0) {
      let journalDraft = null;
      if (saved.type === "incoming") {
        journalDraft = generateReceivableCheckJournal(saved, accounts);
      } else {
        journalDraft = generatePayableCheckJournal(saved, accounts);
      }

      if (existingJE && journalDraft) {
        const cleanDesc = existingJE.description.replace(/\s*\[تم التعديل[^\]]*\]/g, "").trim();
        const updatedJE: JournalEntry = {
          ...existingJE,
          lines: journalDraft.lines.map(l => ({ ...l, id: generateId() })),
          totalDebit: journalDraft.totalDebit,
          totalCredit: journalDraft.totalCredit,
          date: saved.issueDate || existingJE.date,
          description: `${cleanDesc} ${stamp}`,
        };
        setJournalEntries(prev => prev.map(j => j.id === existingJE.id ? updatedJE : j));
        try {
          await updateJournalEntryDB(existingJE.id, updatedJE);
        } catch (err) {
          console.warn("Failed to update JE for check:", err);
        }
      }
    }

    setChecks(prev => prev.map(c => c.id === id ? saved : c));
    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "update",
      entityType: "CheckRecord",
      entityId: saved.id,
      details: `تعديل ورقة ${saved.type === "incoming" ? "قبض" : "دفع"} شيك ${saved.checkNumber} بمبلغ ${saved.amount}`,
    });
    showToast(locale === "ar" ? `تم تعديل الشيك (${saved.checkNumber}) وتحديث القيد بنجاح` : "Check updated", "success");
    return saved;
  };

  const updateCheckStatus = async (checkId: string, newStatus: CheckStatus, targetTreasuryId?: string) => {
    const res = await persistCheckStatusDB(checkId, newStatus, targetTreasuryId);
    if (!res.success) throw new Error(res.error || "فشل تحديث حالة الشيك");
    const chk = checks.find(c => c.id === checkId);
    if (newStatus === "collected" && targetTreasuryId && chk) {
      const checkAmount = Number(chk.amount) || 0;
      const delta = chk.type === "incoming" ? checkAmount : -checkAmount;
      setTreasuryAccounts(prev => prev.map(t => t.id === targetTreasuryId ? { ...t, balance: (Number(t.balance) || 0) + delta } : t));
    }
    setChecks(prev => prev.map(c => c.id === checkId ? { ...c, status: newStatus, targetTreasuryId } : c));
    // Auto generate Journal Entry for Check Status Lifecycle
    try {
      if (chk && accounts.length > 0) {
        const jeData = generateCheckStatusJournal(chk, newStatus, targetTreasuryId, accounts, treasuryAccounts);
        if (jeData) {
          await persistJournalEntryDB(jeData as any).then(jr => {
            if (jr.success && jr.data) {
              const savedJE = jr.data;
              setJournalEntries(prev => [savedJE, ...prev]);
            }
          });
        }
      }
    } catch (e) {
      console.error("Auto JE for check status update error:", e);
    }
    showToast(locale === "ar" ? "تم تحديث حالة الشيك بنجاح" : "Check status updated", "success");
  };

  const deleteCheck = async (id: string) => {
    const res = await deleteCheckDB(id);
    if (!res.success) throw new Error(res.error || "فشل حذف الشيك");
    setChecks(prev => prev.filter(c => c.id !== id));
    showToast(locale === "ar" ? "تم حذف الشيك بنجاح" : "Check deleted", "success");
  };

  const addAccount = async (acc: Omit<Account, "id">): Promise<Account> => {
    const res = await persistAccountDB(acc as any);
    if (!res.success || !res.data) throw new Error(res.error || "فشل إضافة الحساب");
    const saved = res.data;
    setAccounts(prev => [...prev, saved]);
    showToast(locale === "ar" ? "تمت إضافة الحساب بنجاح" : "Account created", "success");
    return saved;
  };

  const updateAccount = async (id: string, acc: Partial<Account>) => {
    const res = await updateAccountDB(id, acc);
    if (!res.success) throw new Error(res.error || "فشل تعديل الحساب");
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...acc } : a));
    showToast(locale === "ar" ? "تم تحديث الحساب بنجاح" : "Account updated", "success");
  };

  const deleteAccount = async (id: string) => {
    const res = await deleteAccountDB(id);
    if (!res.success) throw new Error(res.error || "فشل حذف الحساب");
    setAccounts(prev => prev.filter(a => a.id !== id));
    showToast(locale === "ar" ? "تم حذف الحساب بنجاح" : "Account deleted", "success");
  };

  const addCostCenter = async (cc: Omit<CostCenter, "id">): Promise<CostCenter> => {
    const res = await persistCostCenterDB(cc as any);
    if (!res.success || !res.data) throw new Error(res.error || "فشل إضافة مركز التكلفة");
    const saved = res.data;
    setCostCenters(prev => [...prev, saved]);
    showToast(locale === "ar" ? "تمت إضافة مركز التكلفة بنجاح" : "Cost center created", "success");
    return saved;
  };

  const updateCostCenter = async (id: string, cc: Partial<CostCenter>) => {
    const res = await updateCostCenterDB(id, cc);
    if (!res.success) throw new Error(res.error || "فشل تعديل مركز التكلفة");
    setCostCenters(prev => prev.map(c => c.id === id ? { ...c, ...cc } : c));
    showToast(locale === "ar" ? "تم تحديث مركز التكلفة بنجاح" : "Cost center updated", "success");
  };

  const deleteCostCenter = async (id: string) => {
    const res = await deleteCostCenterDB(id);
    if (!res.success) throw new Error(res.error || "فشل حذف مركز التكلفة");
    setCostCenters(prev => prev.filter(c => c.id !== id));
    showToast(locale === "ar" ? "تم حذف مركز التكلفة بنجاح" : "Cost center deleted", "success");
  };

  const addJournalEntry = async (entry: Omit<JournalEntry, "id">): Promise<JournalEntry> => {
    const res = await persistJournalEntryDB(entry as any);
    if (!res.success || !res.data) throw new Error(res.error || "فشل إضافة القيد اليومي");
    const saved = res.data;
    setJournalEntries(prev => [saved, ...prev]);
    showToast(locale === "ar" ? `تم حفظ القيد اليومي (${saved.entryNumber}) بنجاح` : "Journal entry saved", "success");
    return saved;
  };

  const deleteJournalEntry = async (id: string) => {
    const res = await deleteJournalEntryDB(id);
    if (!res.success) throw new Error(res.error || "فشل حذف القيد اليومي");
    setJournalEntries(prev => prev.filter(e => e.id !== id));
    showToast(locale === "ar" ? "تم حذف القيد اليومي بنجاح" : "Journal entry deleted", "success");
  };

  const postOpeningEntry = async (entry: Omit<JournalEntry, "id">): Promise<JournalEntry> => {
    // 1. Remove any previous opening entry from state and DB to prevent duplicates
    const existingOpening = journalEntries.filter(e =>
      e.referenceType === "opening_entry" ||
      e.entryNumber?.startsWith("OPENING-") ||
      e.entryNumber?.startsWith("JV-OPENING-")
    );

    for (const oldOpening of existingOpening) {
      try {
        await deleteJournalEntryDB(oldOpening.id);
      } catch (err) {
        console.warn("Cleaned old opening entry:", err);
      }
    }

    // 2. Persist new official opening entry
    const res = await persistJournalEntryDB(entry as any);
    if (!res.success || !res.data) throw new Error(res.error || "فشل ترحيل القيد الافتتاحي");
    const saved = res.data;

    // 3. Update in-memory state
    setJournalEntries(prev => [
      saved,
      ...prev.filter(e => !existingOpening.some(old => old.id === e.id) && e.id !== saved.id)
    ]);

    // 4. Update account balances in accounts state
    setAccounts(prevAccounts =>
      prevAccounts.map(acc => {
        const line = saved.lines.find(l => l.accountId === acc.id || l.accountCode === acc.code);
        if (line) {
          const dr = Number(line.debit) || 0;
          const cr = Number(line.credit) || 0;
          const net = acc.nature === "debit" ? (dr - cr) : (cr - dr);
          return { ...acc, balance: net };
        }
        return acc;
      })
    );

    // 5. Update treasury account balances if linked to GL accounts in opening entry
    setTreasuryAccounts(prevTreasuries =>
      prevTreasuries.map(t => {
        const line = saved.lines.find(l => l.accountId === t.glAccountId || (l.accountCode === "1101001" && t.code === "SAFE-MAIN") || (l.accountCode === "1101002" && t.code === "BANK-MAIN"));
        if (line) {
          const dr = Number(line.debit) || 0;
          const cr = Number(line.credit) || 0;
          const net = dr - cr;
          updateTreasuryAccountDB(t.id, { balance: net }).catch(err => console.warn("Failed to sync treasury opening balance:", err));
          return { ...t, balance: net };
        }
        return t;
      })
    );

    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "create",
      entityType: "OpeningEntry",
      entityId: saved.id,
      details: `ترحيل القيد الافتتاحي الرسمي (${saved.entryNumber}) بمبلغ ${saved.totalDebit} متزن`,
    });

    showToast(locale === "ar" ? `تم ترحيل القيد الافتتاحي (${saved.entryNumber}) بنجاح` : `Opening entry (${saved.entryNumber}) posted successfully`, "success");
    return saved;
  };

  // ==========================================
  // FIXED ASSETS & DEPRECIATION (REPORT 10)
  // ==========================================
  const addFixedAsset = async (fa: Omit<FixedAsset, "id">): Promise<FixedAsset> => {
    const res = await persistFixedAssetDB(fa);
    if (!res.success || !res.data) throw new Error(res.error || "فشل إضافة الأصل الثابت");
    const saved = res.data;
    setFixedAssets(prev => [saved, ...prev]);

    await addAuditLog({
      organizationId: organization.id,
      userName: currentUser.name,
      action: "create",
      entityType: "FixedAsset",
      entityId: saved.id,
      details: `إضافة أصل جديد: ${saved.name} (قيمة الشراء: ${saved.purchaseValue}, نسبة الإهلاك: ${saved.depreciationRate}%)`,
    });

    showToast(locale === "ar" ? `تم حفظ الأصل (${saved.name}) بنجاح` : `Asset (${saved.name}) saved`, "success");
    return saved;
  };

  const updateFixedAsset = async (id: string, fa: Partial<FixedAsset>): Promise<FixedAsset> => {
    const oldAsset = fixedAssets.find(a => a.id === id);
    const res = await updateFixedAssetDB(id, fa);
    if (!res.success || !res.data) throw new Error(res.error || "فشل تحديث الأصل الثابت");
    const saved = res.data;
    setFixedAssets(prev => prev.map(a => a.id === id ? saved : a));

    await addAuditLog({
      organizationId: organization.id,
      userName: currentUser.name,
      action: fa.status !== undefined ? "status_change" : "update",
      entityType: "FixedAsset",
      entityId: saved.id,
      details: `تحديث بيانات الأصل: ${saved.name} (الحالة السابقة: ${oldAsset?.status || "-"} -> الحالية: ${saved.status})`,
    });

    showToast(locale === "ar" ? `تم تحديث الأصل (${saved.name}) بنجاح` : `Asset (${saved.name}) updated`, "success");
    return saved;
  };

  const deleteFixedAsset = async (id: string): Promise<void> => {
    const target = fixedAssets.find(a => a.id === id);
    const res = await deleteFixedAssetDB(id);
    if (!res.success) throw new Error(res.error || "فشل حذف الأصل الثابت");
    setFixedAssets(prev => prev.filter(a => a.id !== id));

    await addAuditLog({
      organizationId: organization.id,
      userName: currentUser.name,
      action: "delete",
      entityType: "FixedAsset",
      entityId: id,
      details: `حذف الأصل الثابت: ${target?.name || id}`,
    });

    showToast(locale === "ar" ? "تم حذف الأصل بنجاح" : "Asset deleted", "success");
  };

  const postAssetDepreciation = async (assetId: string, periodEndDate?: string): Promise<JournalEntry | null> => {
    const asset = fixedAssets.find(a => a.id === assetId);
    if (!asset) throw new Error("الأصل غير موجود");
    if (asset.status === "inactive") {
      showToast(locale === "ar" ? "الأصل غير نشط - لا يمكن احتساب إهلاك" : "Asset is inactive", "error");
      return null;
    }

    const calc = computeAssetDepreciation(asset, periodEndDate);
    if (calc.currentPeriodDepreciation <= 0) {
      showToast(locale === "ar" ? `لا يوجد قسط إهلاك مستحق للأصل (${asset.name})` : "No depreciation due", "info");
      return null;
    }

    const dateStr = periodEndDate || new Date().toISOString().split("T")[0];
    const jeDraft = generateAssetDepreciationJournalEntry(
      asset,
      calc.currentPeriodDepreciation,
      dateStr,
      accounts,
      organization.id,
      activeBranchId,
      currentUser.name
    );

    if (!jeDraft) return null;

    const res = await persistJournalEntryDB(jeDraft as any);
    if (!res.success || !res.data) throw new Error(res.error || "فشل ترحيل قيد الإهلاك");
    const savedJE = res.data as JournalEntry;

    setJournalEntries(prev => [savedJE, ...prev]);

    await addAuditLog({
      organizationId: organization.id,
      userName: currentUser.name,
      action: "create",
      entityType: "AssetDepreciation",
      entityId: asset.id,
      details: `ترحيل قيد إهلاك أصل: ${asset.name} بمبلغ ${calc.currentPeriodDepreciation} (قيد رقم: ${savedJE.entryNumber})`,
    });

    showToast(locale === "ar" ? `تم ترحيل قيد إهلاك (${asset.name}) بمبلغ ${calc.currentPeriodDepreciation} بنجاح` : `Depreciation posted`, "success");
    return savedJE;
  };

  const postAllActiveAssetsDepreciation = async (periodEndDate?: string): Promise<number> => {
    let count = 0;
    const activeAssets = fixedAssets.filter(a => a.status === "active");
    for (const a of activeAssets) {
      try {
        const je = await postAssetDepreciation(a.id, periodEndDate);
        if (je) count++;
      } catch (err) {
        console.warn(`Failed to post depreciation for asset ${a.name}:`, err);
      }
    }
    showToast(locale === "ar" ? `تم ترحيل إهلاك (${count}) أصل بنجاح` : `Depreciation posted for ${count} assets`, "success");
    return count;
  };

  const resetToDemoData = () => {
    setProducts(initialProducts);
    setCategories(initialCategories);
    setCustomerCategories(initialCustomerCategories);
    setUnits(initialUnits);
    setCustomers(initialCustomers);
    setSuppliers(initialSuppliers);
    setSalesInvoices(initialSalesInvoices);
    setSalesReturns(initialSalesReturns);
    setPurchaseInvoices(initialPurchaseInvoices);
    setPurchaseReturns(initialPurchaseReturns);
    setTreasuryAccounts(initialTreasuryAccounts);
    setCashReceipts([]);
    setCashPayments([]);
    setChecks(initialChecks);
    setAccounts(initialAccounts);
    setCostCenters(initialCostCenters);
    setStockMovements(initialStockMovements);
    setJournalEntries(initialJournalEntries);
    setNotifications(initialNotifications);
    setAuditLogs(initialAuditLogs);
    setProductChangeLogs([]);
    setPeriodClosings([]);
    setFixedAssets([]);
  };

  return (
    <ERPContext.Provider
      value={{
        locale, setLocale, direction, theme, setTheme,
        isDbConnected, isLoadingData, refreshData: loadDatabaseData,
        toasts, showToast, dismissToast,
        currentUser, setCurrentUser, organization, setOrganization, updateOrganization,
        branches, activeBranchId, setActiveBranchId, users,
        products, categories, customerCategories, units, warehouses, stockMovements,
        productChangeLogs, periodClosings,
        addProduct, updateProduct, deleteProduct,
        addCategory, updateCategory, deleteCategory,
        addCustomerCategory, updateCustomerCategory, deleteCustomerCategory,
        addUnit, updateUnit, deleteUnit,
        addWarehouse, updateWarehouse, deleteWarehouse, addStockMovement,
        updateStockMovement, deleteStockMovement, addProductChangeLog, createPeriodClosing, hasPermission,
        customers, suppliers, addCustomer, updateCustomer, deleteCustomer,
        addSupplier, updateSupplier, deleteSupplier,
        salesInvoices, salesReturns, purchaseInvoices, purchaseReturns,
        createSalesInvoice, updateSalesInvoice, deleteSalesInvoice, addSalesReturn, deleteSalesReturn,
        createPurchaseInvoice, updatePurchaseInvoice, deletePurchaseInvoice, addPurchaseReturn, deletePurchaseReturn,
        getCustomerStatement, getSupplierStatement, getCustomerBalancesReport, getSupplierBalancesReport,
        treasuryAccounts, cashReceipts, cashPayments, checks,
        addTreasuryAccount, updateTreasuryAccount, deleteTreasuryAccount,
        createCashReceipt, addCashReceipt: createCashReceipt, updateCashReceipt, deleteCashReceipt,
        createCashPayment, addCashPayment: createCashPayment, updateCashPayment, deleteCashPayment,
        addCheck, addCheckReceiptVoucher, updateCheck, updateCheckStatus, deleteCheck,
        accounts, costCenters, journalEntries, addAccount, updateAccount, deleteAccount,
        addCostCenter, updateCostCenter, deleteCostCenter,
        addJournalEntry, deleteJournalEntry, postOpeningEntry,
        fixedAssets, addFixedAsset, updateFixedAsset, deleteFixedAsset, postAssetDepreciation, postAllActiveAssetsDepreciation,
        auditLogs, notifications, addAuditLog, markNotificationRead, resetToDemoData
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} isAr={locale === "ar"} />
    </ERPContext.Provider>
  );
}

export function useERP() {
  const context = useContext(ERPContext);
  if (!context) {
    throw new Error("useERP must be used within an ERPProvider");
  }
  return context;
}
