"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  Organization, Branch, User, ProductCategory, ProductUnit, Product,
  Customer, Supplier, Account, TreasuryAccount, CostCenter, CheckRecord,
  SalesInvoice, PurchaseInvoice, StockMovement, JournalEntry, Notification,
  AuditLog, Language, Direction, Theme, CheckStatus, Warehouse, CashReceipt, CashPayment,
  ProductChangeLog, PeriodClosing, UserRole
} from "@/types/erp";
import {
  initialOrganization, initialBranches, initialUsers, initialCategories,
  initialUnits, initialWarehouses, initialProducts, initialCustomers,
  initialSuppliers, initialAccounts, initialTreasuryAccounts, initialCostCenters,
  initialChecks, initialSalesInvoices, initialPurchaseInvoices,
  initialStockMovements, initialJournalEntries, initialNotifications, initialAuditLogs
} from "@/lib/seed-data";
import { generateId } from "@/lib/utils";
import {
  generateSalesInvoiceJournal,
  generatePurchaseInvoiceJournal,
  generateReceiptJournal,
  generatePaymentJournal,
  generateOpeningStockJournal,
  generateStockAdjustmentJournal,
  generatePeriodClosingJournal
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
  persistCustomerDB,
  updateCustomerDB,
  deleteCustomerDB,
  persistSupplierDB,
  updateSupplierDB,
  deleteSupplierDB,
  persistSalesInvoiceDB,
  deleteSalesInvoiceDB,
  persistPurchaseInvoiceDB,
  deletePurchaseInvoiceDB,
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
  deleteCashReceiptDB,
  persistCashPaymentDB,
  deleteCashPaymentDB,
  persistCheckDB,
  persistCheckStatusDB,
  deleteCheckDB,
  persistJournalEntryDB,
  deleteJournalEntryDB,
  updateStockMovementDB,
  deleteStockMovementDB,
  persistProductChangeLogDB,
  persistPeriodClosingDB,
  updateOrganizationDB
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
  addCustomer: (c: Omit<Customer, "id">) => Promise<Customer>;
  updateCustomer: (id: string, c: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  addSupplier: (s: Omit<Supplier, "id">) => Promise<Supplier>;
  updateSupplier: (id: string, s: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;

  // Sales & Purchases
  salesInvoices: SalesInvoice[];
  purchaseInvoices: PurchaseInvoice[];
  createSalesInvoice: (inv: Omit<SalesInvoice, "id">) => Promise<SalesInvoice>;
  deleteSalesInvoice: (id: string) => Promise<void>;
  createPurchaseInvoice: (inv: Omit<PurchaseInvoice, "id">) => Promise<PurchaseInvoice>;
  deletePurchaseInvoice: (id: string) => Promise<void>;

  // Treasury & Checks
  treasuryAccounts: TreasuryAccount[];
  cashReceipts: CashReceipt[];
  cashPayments: CashPayment[];
  checks: CheckRecord[];
  addTreasuryAccount: (t: Omit<TreasuryAccount, "id">) => Promise<TreasuryAccount>;
  updateTreasuryAccount: (id: string, t: Partial<TreasuryAccount>) => Promise<void>;
  deleteTreasuryAccount: (id: string) => Promise<void>;
  createCashReceipt: (rcp: Omit<CashReceipt, "id">) => Promise<CashReceipt>;
  deleteCashReceipt: (id: string) => Promise<void>;
  createCashPayment: (pay: Omit<CashPayment, "id">) => Promise<CashPayment>;
  deleteCashPayment: (id: string) => Promise<void>;
  addCheck: (chk: Omit<CheckRecord, "id">) => Promise<CheckRecord>;
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

  // Master Data State
  const [categories, setCategories] = useState<ProductCategory[]>(initialCategories);
  const [units, setUnits] = useState<ProductUnit[]>(initialUnits);
  const [warehouses, setWarehouses] = useState<Warehouse[]>(initialWarehouses);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);

  // Transaction State
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>(initialSalesInvoices);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>(initialPurchaseInvoices);
  const [treasuryAccounts, setTreasuryAccounts] = useState<TreasuryAccount[]>(initialTreasuryAccounts);
  const [cashReceipts, setCashReceipts] = useState<CashReceipt[]>([]);
  const [cashPayments, setCashPayments] = useState<CashPayment[]>([]);
  const [checks, setChecks] = useState<CheckRecord[]>(initialChecks);
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [costCenters, setCostCenters] = useState<CostCenter[]>(initialCostCenters);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(initialStockMovements);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(initialJournalEntries);
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(initialAuditLogs);
  const [productChangeLogs, setProductChangeLogs] = useState<ProductChangeLog[]>([]);
  const [periodClosings, setPeriodClosings] = useState<PeriodClosing[]>([]);

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
        if (liveData.products) setProducts(liveData.products);
        if (liveData.categories) setCategories(liveData.categories);
        if (liveData.units) setUnits(liveData.units);
        if (liveData.customers) setCustomers(liveData.customers);
        if (liveData.suppliers) setSuppliers(liveData.suppliers);
        if (liveData.salesInvoices) setSalesInvoices(liveData.salesInvoices);
        if (liveData.purchaseInvoices) setPurchaseInvoices(liveData.purchaseInvoices);
        if (liveData.warehouses) setWarehouses(liveData.warehouses);
        if (liveData.costCenters) setCostCenters(liveData.costCenters);
        if (liveData.accounts) setAccounts(liveData.accounts);
        if (liveData.treasuryAccounts) setTreasuryAccounts(liveData.treasuryAccounts);
        if (liveData.cashReceipts) setCashReceipts(liveData.cashReceipts);
        if (liveData.cashPayments) setCashPayments(liveData.cashPayments);
        if (liveData.checks) setChecks(liveData.checks);
        if (liveData.journalEntries) setJournalEntries(liveData.journalEntries);
        if (liveData.stockMovements) setStockMovements(liveData.stockMovements);
        if (liveData.auditLogs) setAuditLogs(liveData.auditLogs);
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

    if (totalOpeningQty > 0 && savedProduct.costPrice > 0) {
      const journalDraft = generateOpeningStockJournal(
        organization.id,
        activeBranchId,
        savedProduct,
        totalOpeningQty,
        savedProduct.costPrice,
        accounts,
        currentUser.name
      );

      if (journalDraft) {
        const newJournal: JournalEntry = { ...journalDraft, id: generateId() };
        setJournalEntries(prev => [newJournal, ...prev]);
        await persistJournalEntryDB(newJournal);
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
  // SALES & PURCHASES CRUD
  // ==========================================
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
      const newJournal: JournalEntry = { ...journalDraft, id: generateId() };
      setJournalEntries(prev => [newJournal, ...prev]);
      await persistJournalEntryDB(newJournal);
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
      const newJournal: JournalEntry = { ...journalDraft, id: generateId() };
      setJournalEntries(prev => [newJournal, ...prev]);
      await persistJournalEntryDB(newJournal);
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

  const deletePurchaseInvoice = async (id: string) => {
    const res = await deletePurchaseInvoiceDB(id);
    if (!res.success) {
      throw new Error(res.error || "فشل حذف فاتورة المشتريات من قاعدة البيانات");
    }
    setPurchaseInvoices(prev => prev.filter(inv => inv.id !== id));
    setStockMovements(prev => prev.filter(sm => sm.referenceId !== id));
    showToast(locale === "ar" ? "تم حذف فاتورة المشتريات بنجاح" : "Purchase invoice deleted successfully", "success");
  };

  // ==========================================
  // TREASURY & CHECKS CRUD
  // ==========================================
  const addTreasuryAccount = async (t: Omit<TreasuryAccount, "id">): Promise<TreasuryAccount> => {
    const res = await persistTreasuryAccountDB(t);
    if (!res.success || !res.data) {
      throw new Error(res.error || "فشل حفظ الحساب المالي / الخزينة في قاعدة البيانات");
    }
    const savedTreasury = res.data;
    setTreasuryAccounts(prev => [...prev.filter(x => x.id !== savedTreasury.id), savedTreasury]);
    showToast(locale === "ar" ? `تمت إضافة الخزينة/الحساب "${savedTreasury.nameAr}"` : `Treasury account created`, "success");
    return savedTreasury;
  };
  const updateTreasuryAccount = async (id: string, t: Partial<TreasuryAccount>) => {
    const res = await updateTreasuryAccountDB(id, t);
    if (!res.success || !res.data) {
      throw new Error(res.error || "فشل تعديل بيانات الخزينة في قاعدة البيانات");
    }
    const savedTreasury = res.data;
    setTreasuryAccounts(prev => prev.map(acc => acc.id === id ? { ...acc, ...savedTreasury } : acc));
    showToast(locale === "ar" ? "تم تحديث بيانات الخزينة بنجاح" : "Treasury account updated", "success");
  };
  const deleteTreasuryAccount = async (id: string) => {
    const res = await deleteTreasuryAccountDB(id);
    if (!res.success) {
      throw new Error(res.error || "فشل حذف الخزينة من قاعدة البيانات");
    }
    setTreasuryAccounts(prev => prev.filter(acc => acc.id !== id));
    showToast(locale === "ar" ? "تم حذف الخزينة بنجاح" : "Treasury account deleted", "success");
  };

  const createCashReceipt = async (rcp: Omit<CashReceipt, "id">): Promise<CashReceipt> => {
    const res = await persistCashReceiptDB(rcp as any);
    if (!res.success || !res.data) {
      throw new Error(res.error || "فشل حفظ سند القبض في قاعدة البيانات");
    }
    const savedReceipt = res.data;
    setCashReceipts(prev => [savedReceipt, ...prev.filter(x => x.id !== savedReceipt.id)]);

    setTreasuryAccounts(prev => prev.map(t =>
      t.id === savedReceipt.treasuryAccountId ? { ...t, balance: t.balance + savedReceipt.amount } : t
    ));

    if (savedReceipt.customerId) {
      setCustomers(prev => prev.map(c =>
        c.id === savedReceipt.customerId ? { ...c, currentBalance: Math.max(0, c.currentBalance - savedReceipt.amount) } : c
      ));
    }

    const targetTreasury = treasuryAccounts.find(t => t.id === savedReceipt.treasuryAccountId);
    const treasuryGlId = targetTreasury?.glAccountId || accounts[0]?.id || "";
    const journalDraft = generateReceiptJournal(savedReceipt, treasuryGlId, accounts);
    if (journalDraft) {
      const newJournal: JournalEntry = { ...journalDraft, id: generateId() };
      setJournalEntries(prev => [newJournal, ...prev]);
      await persistJournalEntryDB(newJournal);
    }

    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "create",
      entityType: "CashReceipt",
      entityId: savedReceipt.id,
      details: `سند قبض نقدية ${savedReceipt.receiptNumber} بمبلغ ${savedReceipt.amount} ${savedReceipt.currency}`,
    });

    showToast(locale === "ar" ? `تم تحرير سند القبض (${savedReceipt.receiptNumber}) وتحديث الخزينة بنجاح` : `Cash receipt created successfully`, "success");
    return savedReceipt;
  };

  const deleteCashReceipt = async (id: string) => {
    const res = await deleteCashReceiptDB(id);
    if (!res.success) {
      throw new Error(res.error || "فشل حذف سند القبض من قاعدة البيانات");
    }
    setCashReceipts(prev => prev.filter(r => r.id !== id));
    showToast(locale === "ar" ? "تم حذف سند القبض بنجاح" : "Cash receipt deleted", "success");
  };

  const createCashPayment = async (pay: Omit<CashPayment, "id">): Promise<CashPayment> => {
    const res = await persistCashPaymentDB(pay as any);
    if (!res.success || !res.data) {
      throw new Error(res.error || "فشل حفظ سند الصرف في قاعدة البيانات");
    }
    const savedPayment = res.data;
    setCashPayments(prev => [savedPayment, ...prev.filter(x => x.id !== savedPayment.id)]);

    setTreasuryAccounts(prev => prev.map(t =>
      t.id === savedPayment.treasuryAccountId ? { ...t, balance: t.balance - savedPayment.amount } : t
    ));

    if (savedPayment.supplierId) {
      setSuppliers(prev => prev.map(s =>
        s.id === savedPayment.supplierId ? { ...s, currentBalance: Math.max(0, s.currentBalance - savedPayment.amount) } : s
      ));
    }

    const targetTreasury = treasuryAccounts.find(t => t.id === savedPayment.treasuryAccountId);
    const treasuryGlId = targetTreasury?.glAccountId || accounts[0]?.id || "";
    const journalDraft = generatePaymentJournal(savedPayment, treasuryGlId, accounts);
    if (journalDraft) {
      const newJournal: JournalEntry = { ...journalDraft, id: generateId() };
      setJournalEntries(prev => [newJournal, ...prev]);
      await persistJournalEntryDB(newJournal);
    }

    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "create",
      entityType: "CashPayment",
      entityId: savedPayment.id,
      details: `سند صرف نقدية ${savedPayment.paymentNumber} بمبلغ ${savedPayment.amount} ${savedPayment.currency}`,
    });

    showToast(locale === "ar" ? `تم تحرير سند الصرف (${savedPayment.paymentNumber}) وتحديث الخزينة بنجاح` : `Cash payment created successfully`, "success");
    return savedPayment;
  };

  const deleteCashPayment = async (id: string) => {
    const res = await deleteCashPaymentDB(id);
    if (!res.success) {
      throw new Error(res.error || "فشل حذف سند الصرف من قاعدة البيانات");
    }
    setCashPayments(prev => prev.filter(p => p.id !== id));
    showToast(locale === "ar" ? "تم حذف سند الصرف بنجاح" : "Cash payment deleted", "success");
  };

  const addCheck = async (chk: Omit<CheckRecord, "id">): Promise<CheckRecord> => {
    const res = await persistCheckDB(chk);
    if (!res.success || !res.data) {
      throw new Error(res.error || "فشل حفظ الشيك في قاعدة البيانات");
    }
    const savedCheck = res.data;
    setChecks(prev => [savedCheck, ...prev.filter(x => x.id !== savedCheck.id)]);

    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "create",
      entityType: "CheckRecord",
      entityId: savedCheck.id,
      details: `إضافة شيك ${savedCheck.checkNumber} بمبلغ ${savedCheck.amount} (${savedCheck.type === "incoming" ? "شيك وارد/قبض" : "شيك صادر/دفع"})`,
    });

    showToast(locale === "ar" ? `تم تسجيل الشيك (${savedCheck.checkNumber}) بنجاح` : `Check registered successfully`, "success");
    return savedCheck;
  };

  const updateCheckStatus = async (checkId: string, newStatus: CheckStatus, targetTreasuryId?: string) => {
    const check = checks.find(c => c.id === checkId);
    const res = await persistCheckStatusDB(checkId, newStatus, targetTreasuryId);
    if (!res.success || !res.data) {
      throw new Error(res.error || "فشل تحديث حالة الشيك في قاعدة البيانات");
    }
    const updatedCheck = res.data;

    setChecks(prev => prev.map(chk => chk.id === checkId ? { ...chk, ...updatedCheck } : chk));

    if (check && newStatus === "collected" && targetTreasuryId) {
      const delta = check.type === "incoming" ? check.amount : -check.amount;
      setTreasuryAccounts(prev => prev.map(t =>
        t.id === targetTreasuryId ? { ...t, balance: t.balance + delta } : t
      ));
    }

    showToast(locale === "ar" ? `تم تحديث حالة الشيك إلى "${newStatus === "collected" ? "مُحصل ومودع بالخزينة" : newStatus}"` : `Check status updated`, "success");
  };

  const deleteCheck = async (id: string) => {
    const res = await deleteCheckDB(id);
    if (!res.success) {
      throw new Error(res.error || "فشل حذف الشيك من قاعدة البيانات");
    }
    setChecks(prev => prev.filter(chk => chk.id !== id));
    showToast(locale === "ar" ? "تم حذف الشيك بنجاح" : "Check deleted", "success");
  };

  // ==========================================
  // ACCOUNTING & COST CENTERS CRUD
  // ==========================================
  const addAccount = async (acc: Omit<Account, "id">): Promise<Account> => {
    const res = await persistAccountDB(acc);
    if (!res.success || !res.data) {
      throw new Error(res.error || "فشل حفظ الحساب في شجرة الحسابات");
    }
    const savedAccount = res.data;
    setAccounts(prev => [...prev.filter(x => x.id !== savedAccount.id), savedAccount]);
    showToast(locale === "ar" ? `تمت إضافة الحساب "${savedAccount.nameAr}" بنجاح` : `Account added successfully`, "success");
    return savedAccount;
  };

  const updateAccount = async (id: string, acc: Partial<Account>) => {
    const res = await updateAccountDB(id, acc);
    if (!res.success || !res.data) {
      throw new Error(res.error || "فشل تعديل الحساب في قاعدة البيانات");
    }
    const savedAccount = res.data;
    setAccounts(prev => prev.map(item => item.id === id ? { ...item, ...savedAccount } : item));
    showToast(locale === "ar" ? "تم تعديل الحساب بنجاح" : "Account updated successfully", "success");
  };

  const deleteAccount = async (id: string) => {
    const res = await deleteAccountDB(id);
    if (!res.success) {
      throw new Error(res.error || "فشل حذف الحساب من شجرة الحسابات");
    }
    setAccounts(prev => prev.filter(item => item.id !== id));
    showToast(locale === "ar" ? "تم حذف الحساب بنجاح" : "Account deleted", "success");
  };

  const addCostCenter = async (cc: Omit<CostCenter, "id">): Promise<CostCenter> => {
    const res = await persistCostCenterDB(cc);
    if (!res.success || !res.data) {
      throw new Error(res.error || "فشل حفظ مركز التكلفة في قاعدة البيانات");
    }
    const savedCc = res.data;
    setCostCenters(prev => [...prev.filter(x => x.id !== savedCc.id), savedCc]);
    showToast(locale === "ar" ? `تمت إضافة مركز التكلفة "${savedCc.nameAr}"` : `Cost center created`, "success");
    return savedCc;
  };

  const updateCostCenter = async (id: string, cc: Partial<CostCenter>) => {
    const res = await updateCostCenterDB(id, cc);
    if (!res.success || !res.data) {
      throw new Error(res.error || "فشل تعديل مركز التكلفة في قاعدة البيانات");
    }
    const savedCc = res.data;
    setCostCenters(prev => prev.map(item => item.id === id ? { ...item, ...savedCc } : item));
    showToast(locale === "ar" ? "تم تعديل مركز التكلفة بنجاح" : "Cost center updated", "success");
  };

  const deleteCostCenter = async (id: string) => {
    const res = await deleteCostCenterDB(id);
    if (!res.success) {
      throw new Error(res.error || "فشل حذف مركز التكلفة من قاعدة البيانات");
    }
    setCostCenters(prev => prev.filter(item => item.id !== id));
    showToast(locale === "ar" ? "تم حذف مركز التكلفة بنجاح" : "Cost center deleted", "success");
  };

  const addJournalEntry = async (entry: Omit<JournalEntry, "id">): Promise<JournalEntry> => {
    const res = await persistJournalEntryDB(entry);
    if (!res.success || !res.data) {
      throw new Error(res.error || "فشل حفظ القيد المحاسبي في دفتر اليومية");
    }
    const savedEntry = res.data;
    setJournalEntries(prev => [savedEntry, ...prev.filter(x => x.id !== savedEntry.id)]);
    showToast(locale === "ar" ? `تم ترحيل القيد المحاسبي (${savedEntry.entryNumber}) بنجاح` : `Journal entry posted`, "success");
    return savedEntry;
  };

  const deleteJournalEntry = async (id: string) => {
    const res = await deleteJournalEntryDB(id);
    if (!res.success) {
      throw new Error(res.error || "فشل حذف القيد المحاسبي من قاعدة البيانات");
    }
    setJournalEntries(prev => prev.filter(je => je.id !== id));
    showToast(locale === "ar" ? "تم حذف القيد المحاسبي بنجاح" : "Journal entry deleted", "success");
  };

  const resetToDemoData = () => {
    setProducts(initialProducts);
    setCategories(initialCategories);
    setUnits(initialUnits);
    setCustomers(initialCustomers);
    setSuppliers(initialSuppliers);
    setSalesInvoices(initialSalesInvoices);
    setPurchaseInvoices(initialPurchaseInvoices);
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
  };

  return (
    <ERPContext.Provider
      value={{
        locale, setLocale, direction, theme, setTheme,
        isDbConnected, isLoadingData, refreshData: loadDatabaseData,
        toasts, showToast, dismissToast,
        currentUser, setCurrentUser, organization, setOrganization, updateOrganization,
        branches, activeBranchId, setActiveBranchId, users,
        products, categories, units, warehouses, stockMovements,
        productChangeLogs, periodClosings,
        addProduct, updateProduct, deleteProduct,
        addCategory, updateCategory, deleteCategory,
        addUnit, updateUnit, deleteUnit,
        addWarehouse, updateWarehouse, deleteWarehouse, addStockMovement,
        updateStockMovement, deleteStockMovement, addProductChangeLog, createPeriodClosing, hasPermission,
        customers, suppliers, addCustomer, updateCustomer, deleteCustomer,
        addSupplier, updateSupplier, deleteSupplier,
        salesInvoices, purchaseInvoices, createSalesInvoice, deleteSalesInvoice,
        createPurchaseInvoice, deletePurchaseInvoice,
        treasuryAccounts, cashReceipts, cashPayments, checks,
        addTreasuryAccount, updateTreasuryAccount, deleteTreasuryAccount,
        createCashReceipt, deleteCashReceipt, createCashPayment, deleteCashPayment,
        addCheck, updateCheckStatus, deleteCheck,
        accounts, costCenters, journalEntries, addAccount, updateAccount, deleteAccount,
        addCostCenter, updateCostCenter, deleteCostCenter,
        addJournalEntry, deleteJournalEntry,
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
