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

  // Core Multi-Tenant State
  const [organization, setOrganization] = useState<Organization>(initialOrganization);
  const [branches, setBranches] = useState<Branch[]>(initialBranches);
  const [activeBranchId, setActiveBranchId] = useState<string>(initialBranches[0].id);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [currentUser, setCurrentUser] = useState<User>(initialUsers[0]);

  // Inventory State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [units, setUnits] = useState<ProductUnit[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [productChangeLogs, setProductChangeLogs] = useState<ProductChangeLog[]>([]);
  const [periodClosings, setPeriodClosings] = useState<PeriodClosing[]>([]);

  // CRM State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Invoices State
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([]);

  // Treasury State
  const [treasuryAccounts, setTreasuryAccounts] = useState<TreasuryAccount[]>([]);
  const [cashReceipts, setCashReceipts] = useState<CashReceipt[]>([]);
  const [cashPayments, setCashPayments] = useState<CashPayment[]>([]);
  const [checks, setChecks] = useState<CheckRecord[]>([]);

  // Accounting State
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);

  // Audit & Notifications
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);

  // Sync HTML dir and lang
  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = locale;
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [direction, locale, theme]);

  // Hydrate Data from Supabase Database on Mount & Refresh
  const loadDatabaseData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const liveData = await fetchFullERPData();
      if (liveData) {
        setIsDbConnected(true);
        if (liveData.organization) setOrganization(liveData.organization);
        if (Array.isArray(liveData.branches) && liveData.branches.length > 0) setBranches(liveData.branches);
        if (Array.isArray(liveData.users) && liveData.users.length > 0) setUsers(liveData.users);
        if (Array.isArray(liveData.products)) setProducts(liveData.products);
        if (Array.isArray(liveData.categories)) setCategories(liveData.categories);
        if (Array.isArray(liveData.units)) setUnits(liveData.units);
        if (Array.isArray(liveData.customers)) setCustomers(liveData.customers);
        if (Array.isArray(liveData.suppliers)) setSuppliers(liveData.suppliers);
        if (Array.isArray(liveData.salesInvoices)) setSalesInvoices(liveData.salesInvoices);
        if (Array.isArray(liveData.purchaseInvoices)) setPurchaseInvoices(liveData.purchaseInvoices);
        if (Array.isArray(liveData.warehouses)) setWarehouses(liveData.warehouses);
        if (Array.isArray(liveData.costCenters)) setCostCenters(liveData.costCenters);
        if (Array.isArray(liveData.accounts)) setAccounts(liveData.accounts);
        if (Array.isArray(liveData.treasuryAccounts)) setTreasuryAccounts(liveData.treasuryAccounts);
        if (Array.isArray(liveData.cashReceipts)) setCashReceipts(liveData.cashReceipts);
        if (Array.isArray(liveData.cashPayments)) setCashPayments(liveData.cashPayments);
        if (Array.isArray(liveData.checks)) setChecks(liveData.checks);
        if (Array.isArray(liveData.journalEntries)) setJournalEntries(liveData.journalEntries);
        if (Array.isArray(liveData.stockMovements)) setStockMovements(liveData.stockMovements);
        if (Array.isArray(liveData.auditLogs)) setAuditLogs(liveData.auditLogs);
        if (Array.isArray(liveData.productChangeLogs)) setProductChangeLogs(liveData.productChangeLogs);
        if (Array.isArray(liveData.periodClosings)) setPeriodClosings(liveData.periodClosings);
      } else {
        // Fallback to Demo Seed Data if DB is offline
        setIsDbConnected(false);
        setProducts(initialProducts);
        setCategories(initialCategories);
        setUnits(initialUnits);
        setWarehouses(initialWarehouses);
        setCustomers(initialCustomers);
        setSuppliers(initialSuppliers);
        setAccounts(initialAccounts);
        setTreasuryAccounts(initialTreasuryAccounts);
        setCostCenters(initialCostCenters);
        setChecks(initialChecks);
        setSalesInvoices(initialSalesInvoices);
        setPurchaseInvoices(initialPurchaseInvoices);
        setStockMovements(initialStockMovements);
        setJournalEntries(initialJournalEntries);
        setAuditLogs(initialAuditLogs);
      }
    } catch (e) {
      console.error("Failed to load initial data from DB:", e);
      setIsDbConnected(false);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

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
    setOrganization(updated);
    await updateOrganizationDB(updated);
    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "update",
      entityType: "Organization",
      entityId: organization.id,
      details: `تحديث إعدادات المنشأة: ${updated.nameAr}`,
    });
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

    // 1. Check opening stock allocations
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

    // 2. Generate Opening Stock Journal Entry
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

    await addProductChangeLog({
      organizationId: organization.id,
      productId: savedProduct.id,
      productName: savedProduct.nameAr,
      productSku: savedProduct.sku,
      userId: currentUser.id,
      userName: currentUser.name,
      changeType: "created",
      fieldName: "إنشاء صنف جديد",
      oldValue: "---",
      newValue: `${savedProduct.nameAr} (سعر البيع: ${savedProduct.sellingPrice}, التكلفة: ${savedProduct.costPrice})`,
    });

    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "create",
      entityType: "Product",
      entityId: savedProduct.id,
      details: `إضافة منتج جديد: ${savedProduct.nameAr} (${savedProduct.sku})`,
    });

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

    if (p.nameAr && p.nameAr !== existing.nameAr) {
      await addProductChangeLog({
        organizationId: organization.id,
        productId: id,
        productName: p.nameAr,
        productSku: existing.sku,
        userId: currentUser.id,
        userName: currentUser.name,
        changeType: "name",
        fieldName: "اسم الصنف بالعربية",
        oldValue: existing.nameAr,
        newValue: p.nameAr,
      });
    }

    if (p.sellingPrice !== undefined && p.sellingPrice !== existing.sellingPrice) {
      await addProductChangeLog({
        organizationId: organization.id,
        productId: id,
        productName: existing.nameAr,
        productSku: existing.sku,
        userId: currentUser.id,
        userName: currentUser.name,
        changeType: "price",
        fieldName: "سعر البيع",
        oldValue: `${existing.sellingPrice}`,
        newValue: `${p.sellingPrice}`,
      });
    }

    if (p.costPrice !== undefined && p.costPrice !== existing.costPrice) {
      await addProductChangeLog({
        organizationId: organization.id,
        productId: id,
        productName: existing.nameAr,
        productSku: existing.sku,
        userId: currentUser.id,
        userName: currentUser.name,
        changeType: "price",
        fieldName: "سعر التكلفة",
        oldValue: `${existing.costPrice}`,
        newValue: `${p.costPrice}`,
      });
    }

    // Handle Stock Adjustment Difference
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

          await addProductChangeLog({
            organizationId: organization.id,
            productId: id,
            productName: existing.nameAr,
            productSku: existing.sku,
            userId: currentUser.id,
            userName: currentUser.name,
            changeType: "stock_adjustment",
            fieldName: "رصيد المستودع (تسوية جردية)",
            oldValue: `${oldQty}`,
            newValue: `${newQty} (${diff > 0 ? `+${diff}` : diff})`,
          });
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
  };

  const deleteProduct = async (id: string) => {
    const prod = products.find(p => p.id === id);
    const res = await deleteProductDB(id);
    if (!res.success) {
      throw new Error(res.error || "فشل حذف المنتج من قاعدة البيانات");
    }

    setProducts(prev => prev.filter(p => p.id !== id));
    setStockMovements(prev => prev.filter(sm => sm.productId !== id));

    if (prod) {
      await addProductChangeLog({
        organizationId: organization.id,
        productId: id,
        productName: prod.nameAr,
        productSku: prod.sku,
        userId: currentUser.id,
        userName: currentUser.name,
        changeType: "deleted",
        fieldName: "حذف الصنف",
        oldValue: `${prod.nameAr} (${prod.sku})`,
        newValue: "تم الحذف نهائياً",
      });
    }

    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "delete",
      entityType: "Product",
      entityId: id,
      details: `حذف المنتج: ${prod?.nameAr || id}`,
    });
  };

  // Categories CRUD
  const addCategory = async (c: Omit<ProductCategory, "id">): Promise<ProductCategory> => {
    const res = await persistCategoryDB(c);
    if (!res.success || !res.data) {
      throw new Error(res.error || "فشل حفظ التصنيف في قاعدة البيانات");
    }
    const savedCat = res.data;
    setCategories(prev => [...prev.filter(x => x.id !== savedCat.id), savedCat]);
    return savedCat;
  };
  const updateCategory = async (id: string, c: Partial<ProductCategory>) => {
    const res = await updateCategoryDB(id, c);
    if (!res.success) {
      throw new Error(res.error || "فشل تعديل التصنيف في قاعدة البيانات");
    }
    setCategories(prev => prev.map(cat => cat.id === id ? { ...cat, ...c } : cat));
  };
  const deleteCategory = async (id: string) => {
    const res = await deleteCategoryDB(id);
    if (!res.success) {
      throw new Error(res.error || "فشل حذف التصنيف من قاعدة البيانات");
    }
    setCategories(prev => prev.filter(cat => cat.id !== id));
  };

  // Units CRUD
  const addUnit = async (u: Omit<ProductUnit, "id">): Promise<ProductUnit> => {
    const res = await persistUnitDB(u);
    if (!res.success || !res.data) {
      throw new Error(res.error || "فشل حفظ وحدة القياس في قاعدة البيانات");
    }
    const savedUnit = res.data;
    setUnits(prev => [...prev.filter(x => x.id !== savedUnit.id), savedUnit]);
    return savedUnit;
  };
  const updateUnit = async (id: string, u: Partial<ProductUnit>) => {
    const res = await updateUnitDB(id, u);
    if (!res.success) {
      throw new Error(res.error || "فشل تعديل وحدة القياس في قاعدة البيانات");
    }
    setUnits(prev => prev.map(unit => unit.id === id ? { ...unit, ...u } : unit));
  };
  const deleteUnit = async (id: string) => {
    const res = await deleteUnitDB(id);
    if (!res.success) {
      throw new Error(res.error || "فشل حذف وحدة القياس من قاعدة البيانات");
    }
    setUnits(prev => prev.filter(unit => unit.id !== id));
  };

  // Warehouses CRUD
  const addWarehouse = async (w: Omit<Warehouse, "id">): Promise<Warehouse> => {
    const res = await persistWarehouseDB(w);
    if (!res.success || !res.data) {
      throw new Error(res.error || "فشل حفظ المستودع في قاعدة البيانات");
    }
    const savedWarehouse = res.data;
    setWarehouses(prev => [...prev.filter(x => x.id !== savedWarehouse.id), savedWarehouse]);
    return savedWarehouse;
  };
  const updateWarehouse = async (id: string, w: Partial<Warehouse>) => {
    const res = await updateWarehouseDB(id, w);
    if (!res.success) {
      throw new Error(res.error || "فشل تعديل بيانات المستودع في قاعدة البيانات");
    }
    setWarehouses(prev => prev.map(wh => wh.id === id ? { ...wh, ...w } : wh));
  };
  const deleteWarehouse = async (id: string) => {
    const res = await deleteWarehouseDB(id);
    if (!res.success) {
      throw new Error(res.error || "فشل حذف المستودع من قاعدة البيانات");
    }
    setWarehouses(prev => prev.filter(wh => wh.id !== id));
  };

  // Stock Movements CRUD
  const addStockMovement = async (m: Omit<StockMovement, "id">) => {
    const newM: StockMovement = { ...m, id: generateId() };
    setStockMovements(prev => [newM, ...prev]);
  };
  const updateStockMovement = async (id: string, sm: Partial<StockMovement>) => {
    const res = await updateStockMovementDB(id, sm);
    if (!res.success) {
      throw new Error(res.error || "فشل تعديل حركة المخزون");
    }
    setStockMovements(prev => prev.map(item => item.id === id ? { ...item, ...sm } : item));
  };
  const deleteStockMovement = async (id: string) => {
    const res = await deleteStockMovementDB(id);
    if (!res.success) {
      throw new Error(res.error || "فشل حذف حركة المخزون");
    }
    setStockMovements(prev => prev.filter(item => item.id !== id));
  };

  // Period Closings CRUD
  const createPeriodClosing = async (closing: Omit<PeriodClosing, "id" | "createdAt">): Promise<PeriodClosing> => {
    // Generate Accounting Journal Entry for COGS Closing
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
    return savedCust;
  };

  const updateCustomer = async (id: string, c: Partial<Customer>) => {
    const res = await updateCustomerDB(id, c);
    if (!res.success) {
      throw new Error(res.error || "فشل تعديل بيانات العميل في قاعدة البيانات");
    }
    setCustomers(prev => prev.map(item => item.id === id ? { ...item, ...c } : item));
    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "update",
      entityType: "Customer",
      entityId: id,
      details: `تحديث بيانات العميل: ${c.nameAr || id}`,
    });
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
    return savedSupp;
  };

  const updateSupplier = async (id: string, s: Partial<Supplier>) => {
    const res = await updateSupplierDB(id, s);
    if (!res.success) {
      throw new Error(res.error || "فشل تعديل بيانات المورد في قاعدة البيانات");
    }
    setSuppliers(prev => prev.map(item => item.id === id ? { ...item, ...s } : item));
    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "update",
      entityType: "Supplier",
      entityId: id,
      details: `تحديث بيانات المورد: ${s.nameAr || id}`,
    });
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

    let totalCogs = 0;
    const movementsToCreate: StockMovement[] = [];

    // Deduct Stock & Create Stock Movements
    savedInvoice.items.forEach(item => {
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

    return savedInvoice;
  };

  const deleteSalesInvoice = async (id: string) => {
    const res = await deleteSalesInvoiceDB(id);
    if (!res.success) {
      throw new Error(res.error || "فشل حذف فاتورة المبيعات من قاعدة البيانات");
    }
    setSalesInvoices(prev => prev.filter(inv => inv.id !== id));
    setStockMovements(prev => prev.filter(sm => sm.referenceId !== id));
  };

  const createPurchaseInvoice = async (inv: Omit<PurchaseInvoice, "id">): Promise<PurchaseInvoice> => {
    const res = await persistPurchaseInvoiceDB(inv as any);
    if (!res.success || !res.data) {
      throw new Error(res.error || "فشل حفظ فاتورة المشتريات في قاعدة البيانات");
    }
    const savedInvoice = res.data;

    const movementsToCreate: StockMovement[] = [];

    savedInvoice.items.forEach(item => {
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

    return savedInvoice;
  };

  const deletePurchaseInvoice = async (id: string) => {
    const res = await deletePurchaseInvoiceDB(id);
    if (!res.success) {
      throw new Error(res.error || "فشل حذف فاتورة المشتريات من قاعدة البيانات");
    }
    setPurchaseInvoices(prev => prev.filter(inv => inv.id !== id));
    setStockMovements(prev => prev.filter(sm => sm.referenceId !== id));
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
    return savedTreasury;
  };
  const updateTreasuryAccount = async (id: string, t: Partial<TreasuryAccount>) => {
    const res = await updateTreasuryAccountDB(id, t);
    if (!res.success) {
      throw new Error(res.error || "فشل تعديل بيانات الخزينة في قاعدة البيانات");
    }
    setTreasuryAccounts(prev => prev.map(acc => acc.id === id ? { ...acc, ...t } : acc));
  };
  const deleteTreasuryAccount = async (id: string) => {
    const res = await deleteTreasuryAccountDB(id);
    if (!res.success) {
      throw new Error(res.error || "فشل حذف الخزينة من قاعدة البيانات");
    }
    setTreasuryAccounts(prev => prev.filter(acc => acc.id !== id));
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

    return savedReceipt;
  };

  const deleteCashReceipt = async (id: string) => {
    const res = await deleteCashReceiptDB(id);
    if (!res.success) {
      throw new Error(res.error || "فشل حذف سند القبض من قاعدة البيانات");
    }
    setCashReceipts(prev => prev.filter(r => r.id !== id));
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

    return savedPayment;
  };

  const deleteCashPayment = async (id: string) => {
    const res = await deleteCashPaymentDB(id);
    if (!res.success) {
      throw new Error(res.error || "فشل حذف سند الصرف من قاعدة البيانات");
    }
    setCashPayments(prev => prev.filter(p => p.id !== id));
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
    return savedCheck;
  };

  const updateCheckStatus = async (checkId: string, newStatus: CheckStatus, targetTreasuryId?: string) => {
    const check = checks.find(c => c.id === checkId);
    const res = await persistCheckStatusDB(checkId, newStatus, targetTreasuryId);
    if (!res.success) {
      throw new Error(res.error || "فشل تحديث حالة الشيك في قاعدة البيانات");
    }

    setChecks(prev => prev.map(chk => {
      if (chk.id === checkId) {
        return {
          ...chk,
          status: newStatus,
          targetTreasuryId: targetTreasuryId || chk.targetTreasuryId,
          collectionDate: newStatus === "collected" ? new Date().toISOString().split("T")[0] : chk.collectionDate,
        };
      }
      return chk;
    }));

    if (check && newStatus === "collected" && targetTreasuryId) {
      setTreasuryAccounts(prev => prev.map(t =>
        t.id === targetTreasuryId ? { ...t, balance: t.balance + check.amount } : t
      ));
    }
  };

  const deleteCheck = async (id: string) => {
    const res = await deleteCheckDB(id);
    if (!res.success) {
      throw new Error(res.error || "فشل حذف الشيك من قاعدة البيانات");
    }
    setChecks(prev => prev.filter(chk => chk.id !== id));
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
    return savedAccount;
  };

  const updateAccount = async (id: string, acc: Partial<Account>) => {
    const res = await updateAccountDB(id, acc);
    if (!res.success) {
      throw new Error(res.error || "فشل تعديل الحساب في قاعدة البيانات");
    }
    setAccounts(prev => prev.map(item => item.id === id ? { ...item, ...acc } : item));
  };

  const deleteAccount = async (id: string) => {
    const res = await deleteAccountDB(id);
    if (!res.success) {
      throw new Error(res.error || "فشل حذف الحساب من شجرة الحسابات");
    }
    setAccounts(prev => prev.filter(item => item.id !== id));
  };

  const addCostCenter = async (cc: Omit<CostCenter, "id">): Promise<CostCenter> => {
    const res = await persistCostCenterDB(cc);
    if (!res.success || !res.data) {
      throw new Error(res.error || "فشل حفظ مركز التكلفة في قاعدة البيانات");
    }
    const savedCc = res.data;
    setCostCenters(prev => [...prev.filter(x => x.id !== savedCc.id), savedCc]);
    return savedCc;
  };

  const updateCostCenter = async (id: string, cc: Partial<CostCenter>) => {
    const res = await updateCostCenterDB(id, cc);
    if (!res.success) {
      throw new Error(res.error || "فشل تعديل مركز التكلفة في قاعدة البيانات");
    }
    setCostCenters(prev => prev.map(item => item.id === id ? { ...item, ...cc } : item));
  };

  const deleteCostCenter = async (id: string) => {
    const res = await deleteCostCenterDB(id);
    if (!res.success) {
      throw new Error(res.error || "فشل حذف مركز التكلفة من قاعدة البيانات");
    }
    setCostCenters(prev => prev.filter(item => item.id !== id));
  };

  const addJournalEntry = async (entry: Omit<JournalEntry, "id">): Promise<JournalEntry> => {
    const res = await persistJournalEntryDB(entry);
    if (!res.success || !res.data) {
      throw new Error(res.error || "فشل حفظ القيد المحاسبي في دفتر اليومية");
    }
    const savedEntry = res.data;
    setJournalEntries(prev => [savedEntry, ...prev.filter(x => x.id !== savedEntry.id)]);
    return savedEntry;
  };

  const deleteJournalEntry = async (id: string) => {
    const res = await deleteJournalEntryDB(id);
    if (!res.success) {
      throw new Error(res.error || "فشل حذف القيد المحاسبي من قاعدة البيانات");
    }
    setJournalEntries(prev => prev.filter(je => je.id !== id));
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
