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
  persistCheckDB,
  persistCheckStatusDB,
  deleteCheckDB,
  persistJournalEntryDB,
  deleteJournalEntryDB,
  updateStockMovementDB,
  deleteStockMovementDB,
  persistProductChangeLogDB,
  persistPeriodClosingDB
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
  addProduct: (p: Omit<Product, "id">) => Product;
  updateProduct: (id: string, p: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addWarehouse: (w: Omit<Warehouse, "id">) => Warehouse;
  updateWarehouse: (id: string, w: Partial<Warehouse>) => void;
  deleteWarehouse: (id: string) => void;
  addStockMovement: (m: Omit<StockMovement, "id">) => void;
  updateStockMovement: (id: string, sm: Partial<StockMovement>) => void;
  deleteStockMovement: (id: string) => void;
  addProductChangeLog: (log: Omit<ProductChangeLog, "id" | "createdAt">) => void;
  createPeriodClosing: (closing: Omit<PeriodClosing, "id" | "createdAt">) => PeriodClosing;
  hasPermission: (requiredRoles: UserRole | UserRole[]) => boolean;

  // CRM & Partners
  customers: Customer[];
  suppliers: Supplier[];
  addCustomer: (c: Omit<Customer, "id">) => Customer;
  updateCustomer: (id: string, c: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  addSupplier: (s: Omit<Supplier, "id">) => Supplier;
  updateSupplier: (id: string, s: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;

  // Sales & Purchases
  salesInvoices: SalesInvoice[];
  purchaseInvoices: PurchaseInvoice[];
  createSalesInvoice: (inv: Omit<SalesInvoice, "id">) => SalesInvoice;
  deleteSalesInvoice: (id: string) => void;
  createPurchaseInvoice: (inv: Omit<PurchaseInvoice, "id">) => PurchaseInvoice;
  deletePurchaseInvoice: (id: string) => void;

  // Treasury & Checks
  treasuryAccounts: TreasuryAccount[];
  cashReceipts: CashReceipt[];
  cashPayments: CashPayment[];
  checks: CheckRecord[];
  createCashReceipt: (rcp: Omit<CashReceipt, "id">) => CashReceipt;
  createCashPayment: (pay: Omit<CashPayment, "id">) => CashPayment;
  updateCheckStatus: (checkId: string, newStatus: CheckStatus, targetTreasuryId?: string) => void;
  deleteCheck: (id: string) => void;

  // Accounting & GL
  accounts: Account[];
  costCenters: CostCenter[];
  journalEntries: JournalEntry[];
  addAccount: (acc: Omit<Account, "id">) => Account;
  addCostCenter: (cc: Omit<CostCenter, "id">) => CostCenter;
  updateCostCenter: (id: string, cc: Partial<CostCenter>) => void;
  deleteCostCenter: (id: string) => void;
  addJournalEntry: (entry: Omit<JournalEntry, "id">) => JournalEntry;
  deleteJournalEntry: (id: string) => void;

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
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [categories, setCategories] = useState<ProductCategory[]>(initialCategories);
  const [units, setUnits] = useState<ProductUnit[]>(initialUnits);
  const [warehouses, setWarehouses] = useState<Warehouse[]>(initialWarehouses);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(initialStockMovements);
  const [productChangeLogs, setProductChangeLogs] = useState<ProductChangeLog[]>([]);
  const [periodClosings, setPeriodClosings] = useState<PeriodClosing[]>([]);

  // CRM State
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);

  // Invoices State
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>(initialSalesInvoices);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>(initialPurchaseInvoices);

  // Treasury State
  const [treasuryAccounts, setTreasuryAccounts] = useState<TreasuryAccount[]>(initialTreasuryAccounts);
  const [cashReceipts, setCashReceipts] = useState<CashReceipt[]>([]);
  const [cashPayments, setCashPayments] = useState<CashPayment[]>([]);
  const [checks, setChecks] = useState<CheckRecord[]>(initialChecks);

  // Accounting State
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [costCenters, setCostCenters] = useState<CostCenter[]>(initialCostCenters);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(initialJournalEntries);

  // Audit & Notifications
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(initialAuditLogs);
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

  // Hydrate Data from Supabase Database on Mount
  const loadDatabaseData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const liveData = await fetchFullERPData();
      if (liveData) {
        setIsDbConnected(true);
        if (liveData.products) setProducts(liveData.products);
        if (liveData.customers) setCustomers(liveData.customers);
        if (liveData.suppliers) setSuppliers(liveData.suppliers);
        if (liveData.salesInvoices) setSalesInvoices(liveData.salesInvoices);
        if (liveData.purchaseInvoices) setPurchaseInvoices(liveData.purchaseInvoices);
        if (liveData.warehouses && liveData.warehouses.length > 0) setWarehouses(liveData.warehouses);
        if (liveData.costCenters) setCostCenters(liveData.costCenters);
        if (liveData.accounts && liveData.accounts.length > 0) setAccounts(liveData.accounts);
        if (liveData.treasuryAccounts && liveData.treasuryAccounts.length > 0) setTreasuryAccounts(liveData.treasuryAccounts);
        if (liveData.checks) setChecks(liveData.checks);
        if (liveData.journalEntries) setJournalEntries(liveData.journalEntries);
        if (liveData.stockMovements) setStockMovements(liveData.stockMovements);
        if (liveData.auditLogs) setAuditLogs(liveData.auditLogs);
        if (liveData.productChangeLogs) setProductChangeLogs(liveData.productChangeLogs);
        if (liveData.periodClosings) setPeriodClosings(liveData.periodClosings);
      }
    } catch (e) {
      console.error("Failed to load initial data from DB:", e);
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
      id: generateId("audit"),
      createdAt: new Date().toISOString().replace("T", " ").substring(0, 19),
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const addProductChangeLog = (log: Omit<ProductChangeLog, "id" | "createdAt">) => {
    const newLog: ProductChangeLog = {
      ...log,
      id: generateId("pch"),
      createdAt: new Date().toISOString().replace("T", " ").substring(0, 19),
    };
    setProductChangeLogs(prev => [newLog, ...prev]);
    persistProductChangeLogDB(newLog).catch(err => console.error("Error saving change log to DB:", err));
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const hasPermission = (requiredRoles: UserRole | UserRole[]): boolean => {
    if (currentUser.role === "super_admin" || currentUser.role === "tenant_admin") return true;
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    return roles.includes(currentUser.role);
  };

  // ==========================================
  // INVENTORY CRUD WITH OPENING STOCK & AUDIT
  // ==========================================
  const addProduct = (p: Omit<Product, "id">): Product => {
    const newProduct: Product = { ...p, id: generateId("prod") };
    
    // 1. Check opening stock allocations
    const openingMovements: StockMovement[] = [];
    let totalOpeningQty = 0;

    if (p.warehouseStock) {
      for (const [whId, qty] of Object.entries(p.warehouseStock)) {
        const numQty = Number(qty) || 0;
        if (numQty > 0) {
          totalOpeningQty += numQty;
          const newSm: StockMovement = {
            id: generateId("sm"),
            organizationId: organization.id,
            productId: newProduct.id,
            warehouseId: whId,
            movementType: "opening_balance",
            referenceNumber: `OB-${newProduct.sku}`,
            date: new Date().toISOString().split("T")[0],
            quantity: numQty,
            unitCost: newProduct.costPrice,
            totalCost: numQty * newProduct.costPrice,
            balanceQuantity: numQty,
            partnerName: "رصيد افتتاحي",
            partnerType: "opening",
            notes: "رصيد مخزون أول المدة",
          };
          openingMovements.push(newSm);
        }
      }
    }

    // 2. Add product & movements to state
    setProducts(prev => [newProduct, ...prev]);
    if (openingMovements.length > 0) {
      setStockMovements(prev => [...openingMovements, ...prev]);
    }

    // 3. Generate opening stock journal entry if opening quantity > 0
    if (totalOpeningQty > 0) {
      const obJournalDraft = generateOpeningStockJournal(
        organization.id,
        activeBranchId,
        newProduct,
        totalOpeningQty,
        newProduct.costPrice,
        accounts,
        currentUser.name
      );
      if (obJournalDraft) {
        const newJournal: JournalEntry = { ...obJournalDraft, id: generateId("jv") };
        setJournalEntries(prev => [newJournal, ...prev]);
        persistJournalEntryDB(newJournal).catch(err => console.error("Error saving opening journal to DB:", err));
      }
    }

    // 4. Log in product change history
    const changeLog: ProductChangeLog = {
      id: generateId("pch"),
      organizationId: organization.id,
      productId: newProduct.id,
      productName: newProduct.nameAr,
      productSku: newProduct.sku,
      userId: currentUser.id,
      userName: currentUser.name,
      changeType: "created",
      fieldName: "product",
      oldValue: "---",
      newValue: `تم إنشاء المنتج برصيد افتتاحي ${totalOpeningQty} قطعة بقيمة ${totalOpeningQty * newProduct.costPrice}`,
      createdAt: new Date().toISOString().replace("T", " ").substring(0, 19),
    };
    setProductChangeLogs(prev => [changeLog, ...prev]);
    persistProductChangeLogDB(changeLog).catch(err => console.error("Error saving change log to DB:", err));

    // 5. Audit Log
    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "create",
      entityType: "Product",
      entityId: newProduct.id,
      details: `إضافة منتج جديد: ${newProduct.nameAr} (${newProduct.sku}) برصيد افتتاحي ${totalOpeningQty}`,
    });

    // 6. Persist to DB
    persistProductDB(newProduct).catch(err => console.error("Error saving product to DB:", err));
    return newProduct;
  };

  const updateProduct = (id: string, p: Partial<Product>) => {
    const currentProd = products.find(prod => prod.id === id);
    if (!currentProd) return;

    const logsToCreate: ProductChangeLog[] = [];
    const nowStr = new Date().toISOString().replace("T", " ").substring(0, 19);

    if (p.nameAr !== undefined && p.nameAr !== currentProd.nameAr) {
      logsToCreate.push({
        id: generateId("pch"),
        organizationId: organization.id,
        productId: id,
        productName: p.nameAr,
        productSku: currentProd.sku,
        userId: currentUser.id,
        userName: currentUser.name,
        changeType: "name",
        fieldName: "اسم المنتج بالعربية",
        oldValue: currentProd.nameAr,
        newValue: p.nameAr,
        createdAt: nowStr,
      });
    }

    if (p.costPrice !== undefined && p.costPrice !== currentProd.costPrice) {
      logsToCreate.push({
        id: generateId("pch"),
        organizationId: organization.id,
        productId: id,
        productName: currentProd.nameAr,
        productSku: currentProd.sku,
        userId: currentUser.id,
        userName: currentUser.name,
        changeType: "price",
        fieldName: "سعر التكلفة",
        oldValue: String(currentProd.costPrice),
        newValue: String(p.costPrice),
        createdAt: nowStr,
      });
    }

    if (p.sellingPrice !== undefined && p.sellingPrice !== currentProd.sellingPrice) {
      logsToCreate.push({
        id: generateId("pch"),
        organizationId: organization.id,
        productId: id,
        productName: currentProd.nameAr,
        productSku: currentProd.sku,
        userId: currentUser.id,
        userName: currentUser.name,
        changeType: "price",
        fieldName: "سعر البيع",
        oldValue: String(currentProd.sellingPrice),
        newValue: String(p.sellingPrice),
        createdAt: nowStr,
      });
    }

    if (p.categoryId !== undefined && p.categoryId !== currentProd.categoryId) {
      const oldCat = categories.find(c => c.id === currentProd.categoryId)?.nameAr || currentProd.categoryId;
      const newCat = categories.find(c => c.id === p.categoryId)?.nameAr || p.categoryId;
      logsToCreate.push({
        id: generateId("pch"),
        organizationId: organization.id,
        productId: id,
        productName: currentProd.nameAr,
        productSku: currentProd.sku,
        userId: currentUser.id,
        userName: currentUser.name,
        changeType: "category",
        fieldName: "التصنيف",
        oldValue: oldCat,
        newValue: newCat,
        createdAt: nowStr,
      });
    }

    if (p.imageUrl !== undefined && p.imageUrl !== currentProd.imageUrl) {
      logsToCreate.push({
        id: generateId("pch"),
        organizationId: organization.id,
        productId: id,
        productName: currentProd.nameAr,
        productSku: currentProd.sku,
        userId: currentUser.id,
        userName: currentUser.name,
        changeType: "image",
        fieldName: "صورة المنتج",
        oldValue: currentProd.imageUrl ? "صورة سابقة" : "بدون صورة",
        newValue: p.imageUrl ? "تم تحديث الصورة" : "تم حذف الصورة",
        createdAt: nowStr,
      });
    }

    // Stock adjustments if warehouseStock changed
    if (p.warehouseStock) {
      for (const [whId, newQty] of Object.entries(p.warehouseStock)) {
        const oldQty = currentProd.warehouseStock[whId] || 0;
        const diff = Number(newQty) - oldQty;
        if (diff !== 0) {
          const whName = warehouses.find(w => w.id === whId)?.nameAr || whId;
          logsToCreate.push({
            id: generateId("pch"),
            organizationId: organization.id,
            productId: id,
            productName: currentProd.nameAr,
            productSku: currentProd.sku,
            userId: currentUser.id,
            userName: currentUser.name,
            changeType: "stock_adjustment",
            fieldName: `رصيد المستودع (${whName})`,
            oldValue: `${oldQty}`,
            newValue: `${newQty}`,
            createdAt: nowStr,
          });

          // Add adjustment stock movement
          const newSm: StockMovement = {
            id: generateId("sm"),
            organizationId: organization.id,
            productId: id,
            warehouseId: whId,
            movementType: "adjustment",
            referenceNumber: `ADJ-${currentProd.sku}`,
            date: new Date().toISOString().split("T")[0],
            quantity: diff,
            unitCost: p.costPrice ?? currentProd.costPrice,
            totalCost: diff * (p.costPrice ?? currentProd.costPrice),
            balanceQuantity: (currentProd.warehouseStock[whId] || 0) + diff,
            partnerName: "تسوية جردية",
            partnerType: "adjustment",
            notes: `تعديل رصيد المخزن (${diff > 0 ? "+" : ""}${diff})`,
          };
          setStockMovements(prev => [newSm, ...prev]);

          // Generate adjustment journal entry
          const adjJournal = generateStockAdjustmentJournal(
            organization.id,
            activeBranchId,
            currentProd,
            diff,
            p.costPrice ?? currentProd.costPrice,
            accounts,
            currentUser.name,
            `تسوية رصيد الصنف ${currentProd.nameAr}`
          );
          const newJv: JournalEntry = { ...adjJournal, id: generateId("jv") };
          setJournalEntries(prev => [newJv, ...prev]);
          persistJournalEntryDB(newJv).catch(e => console.error(e));
        }
      }
    }

    // Update product state & DB
    setProducts(prev => prev.map(item => item.id === id ? { ...item, ...p } : item));
    updateProductDB(id, p).catch(err => console.error("Error updating product in DB:", err));

    if (logsToCreate.length > 0) {
      setProductChangeLogs(prev => [...logsToCreate, ...prev]);
      logsToCreate.forEach(log => persistProductChangeLogDB(log).catch(e => console.error(e)));
    }

    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "update",
      entityType: "Product",
      entityId: id,
      details: `تعديل بيانات المنتج: ${currentProd.nameAr} (${currentProd.sku})`,
    });
  };

  const deleteProduct = (id: string) => {
    const prod = products.find(p => p.id === id);
    setProducts(prev => prev.filter(item => item.id !== id));
    deleteProductDB(id).catch(err => console.error("Error deleting product from DB:", err));

    if (prod) {
      const changeLog: ProductChangeLog = {
        id: generateId("pch"),
        organizationId: organization.id,
        productId: id,
        productName: prod.nameAr,
        productSku: prod.sku,
        userId: currentUser.id,
        userName: currentUser.name,
        changeType: "deleted",
        fieldName: "product",
        oldValue: `المنتج: ${prod.nameAr} (${prod.sku})`,
        newValue: "محذوف",
        createdAt: new Date().toISOString().replace("T", " ").substring(0, 19),
      };
      setProductChangeLogs(prev => [changeLog, ...prev]);
      persistProductChangeLogDB(changeLog).catch(e => console.error(e));
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

  const addWarehouse = (w: Omit<Warehouse, "id">): Warehouse => {
    const newWh: Warehouse = { ...w, id: generateId("wh") };
    setWarehouses(prev => [...prev, newWh]);
    persistWarehouseDB(newWh).catch(err => console.error("Error saving warehouse to DB:", err));
    return newWh;
  };

  const updateWarehouse = (id: string, w: Partial<Warehouse>) => {
    setWarehouses(prev => prev.map(item => item.id === id ? { ...item, ...w } : item));
    updateWarehouseDB(id, w).catch(err => console.error("Error updating warehouse in DB:", err));
  };

  const deleteWarehouse = (id: string) => {
    setWarehouses(prev => prev.filter(item => item.id !== id));
    deleteWarehouseDB(id).catch(err => console.error("Error deleting warehouse from DB:", err));
  };

  const addStockMovement = (m: Omit<StockMovement, "id">) => {
    const newMovement: StockMovement = { ...m, id: generateId("sm") };
    setStockMovements(prev => [newMovement, ...prev]);
  };

  const updateStockMovement = (id: string, updatedMovement: Partial<StockMovement>) => {
    const oldMovement = stockMovements.find(sm => sm.id === id);
    if (!oldMovement) return;

    const targetProd = products.find(p => p.id === oldMovement.productId);
    const oldQty = oldMovement.quantity;
    const newQty = updatedMovement.quantity !== undefined ? updatedMovement.quantity : oldQty;
    const qtyDiff = newQty - oldQty;

    // 1. Adjust product warehouse stock
    if (targetProd && qtyDiff !== 0) {
      const whId = updatedMovement.warehouseId || oldMovement.warehouseId;
      const currentWhQty = targetProd.warehouseStock[whId] || 0;
      const updatedWhStock = {
        ...targetProd.warehouseStock,
        [whId]: Math.max(0, currentWhQty + qtyDiff),
      };

      setProducts(prev => prev.map(p => p.id === targetProd.id ? { ...p, warehouseStock: updatedWhStock } : p));
      updateProductDB(targetProd.id, { warehouseStock: updatedWhStock }).catch(e => console.error(e));
    }

    // 2. Update stock movement state & DB
    setStockMovements(prev => prev.map(sm => sm.id === id ? { ...sm, ...updatedMovement } : sm));
    updateStockMovementDB(id, updatedMovement).catch(e => console.error(e));

    // 3. Log change & audit
    if (targetProd) {
      const changeLog: ProductChangeLog = {
        id: generateId("pch"),
        organizationId: organization.id,
        productId: targetProd.id,
        productName: targetProd.nameAr,
        productSku: targetProd.sku,
        userId: currentUser.id,
        userName: currentUser.name,
        changeType: "stock_adjustment",
        fieldName: "تعديل حركة كاردكس",
        oldValue: `كمية سابقة: ${oldQty}، تكلفة: ${oldMovement.unitCost}`,
        newValue: `كمية جديدة: ${newQty}، تكلفة: ${updatedMovement.unitCost ?? oldMovement.unitCost}`,
        createdAt: new Date().toISOString().replace("T", " ").substring(0, 19),
      };
      setProductChangeLogs(prev => [changeLog, ...prev]);
      persistProductChangeLogDB(changeLog).catch(e => console.error(e));
    }

    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "update",
      entityType: "StockMovement",
      entityId: id,
      details: `تعديل حركة كاردكس المخزن رقم ${oldMovement.referenceNumber} للصنف ${targetProd?.nameAr || id}`,
    });
  };

  const deleteStockMovement = (id: string) => {
    const movement = stockMovements.find(sm => sm.id === id);
    if (!movement) return;

    const targetProd = products.find(p => p.id === movement.productId);

    // 1. Reverse stock
    if (targetProd) {
      const whId = movement.warehouseId;
      const currentWhQty = targetProd.warehouseStock[whId] || 0;
      const updatedWhStock = {
        ...targetProd.warehouseStock,
        [whId]: Math.max(0, currentWhQty - movement.quantity),
      };

      setProducts(prev => prev.map(p => p.id === targetProd.id ? { ...p, warehouseStock: updatedWhStock } : p));
      updateProductDB(targetProd.id, { warehouseStock: updatedWhStock }).catch(e => console.error(e));
    }

    // 2. Remove movement
    setStockMovements(prev => prev.filter(sm => sm.id !== id));
    deleteStockMovementDB(id).catch(e => console.error(e));

    // 3. Log audit
    if (targetProd) {
      const changeLog: ProductChangeLog = {
        id: generateId("pch"),
        organizationId: organization.id,
        productId: targetProd.id,
        productName: targetProd.nameAr,
        productSku: targetProd.sku,
        userId: currentUser.id,
        userName: currentUser.name,
        changeType: "deleted",
        fieldName: "حذف حركة كاردكس",
        oldValue: `حركة: ${movement.movementType} (${movement.quantity})`,
        newValue: "محذوفة",
        createdAt: new Date().toISOString().replace("T", " ").substring(0, 19),
      };
      setProductChangeLogs(prev => [changeLog, ...prev]);
      persistProductChangeLogDB(changeLog).catch(e => console.error(e));
    }

    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "delete",
      entityType: "StockMovement",
      entityId: id,
      details: `حذف حركة كاردكس ${movement.movementType} رقم ${movement.referenceNumber}`,
    });
  };

  const createPeriodClosing = (closing: Omit<PeriodClosing, "id" | "createdAt">): PeriodClosing => {
    const newClosing: PeriodClosing = {
      ...closing,
      id: generateId("close"),
      createdAt: new Date().toISOString().replace("T", " ").substring(0, 19),
    };

    // 1. Generate closing journal entry if cogsValue is calculated
    if (newClosing.cogsValue > 0) {
      const closingJvDraft = generatePeriodClosingJournal(
        organization.id,
        activeBranchId,
        newClosing.periodLabel,
        newClosing.closingDate,
        newClosing.cogsValue,
        accounts,
        currentUser.name
      );
      const newJv: JournalEntry = { ...closingJvDraft, id: generateId("jv") };
      setJournalEntries(prev => [newJv, ...prev]);
      persistJournalEntryDB(newJv).catch(e => console.error(e));
      newClosing.journalEntryId = newJv.id;
    }

    setPeriodClosings(prev => [newClosing, ...prev]);
    persistPeriodClosingDB(newClosing).catch(e => console.error(e));

    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "status_change",
      entityType: "PeriodClosing",
      entityId: newClosing.id,
      details: `إقفال الفترة المحاسبية (${newClosing.periodLabel}) بقيمة مخزون آخر مدة ${newClosing.closingInventoryValue}`,
    });

    return newClosing;
  };

  // ==========================================
  // CRM / PARTNERS CRUD
  // ==========================================
  const addCustomer = (c: Omit<Customer, "id">): Customer => {
    const newCust: Customer = { ...c, id: generateId("cust") };
    setCustomers(prev => [newCust, ...prev]);
    persistCustomerDB(newCust).catch(err => console.error("Error saving customer to DB:", err));

    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "create",
      entityType: "Customer",
      entityId: newCust.id,
      details: `إضافة عميل جديد: ${newCust.nameAr} (${newCust.code})`,
    });
    return newCust;
  };

  const updateCustomer = (id: string, c: Partial<Customer>) => {
    setCustomers(prev => prev.map(item => item.id === id ? { ...item, ...c } : item));
    updateCustomerDB(id, c).catch(err => console.error("Error updating customer in DB:", err));
  };

  const deleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(item => item.id !== id));
    deleteCustomerDB(id).catch(err => console.error("Error deleting customer from DB:", err));
  };

  const addSupplier = (s: Omit<Supplier, "id">): Supplier => {
    const newSupp: Supplier = { ...s, id: generateId("supp") };
    setSuppliers(prev => [newSupp, ...prev]);
    persistSupplierDB(newSupp).catch(err => console.error("Error saving supplier to DB:", err));
    return newSupp;
  };

  const updateSupplier = (id: string, s: Partial<Supplier>) => {
    setSuppliers(prev => prev.map(item => item.id === id ? { ...item, ...s } : item));
    updateSupplierDB(id, s).catch(err => console.error("Error updating supplier in DB:", err));
  };

  const deleteSupplier = (id: string) => {
    setSuppliers(prev => prev.filter(item => item.id !== id));
    deleteSupplierDB(id).catch(err => console.error("Error deleting supplier from DB:", err));
  };

  // ==========================================
  // SALES & PURCHASES CRUD
  // ==========================================
  const createSalesInvoice = (inv: Omit<SalesInvoice, "id">): SalesInvoice => {
    const newInvoice: SalesInvoice = {
      ...inv,
      id: generateId("sinv"),
      createdAt: new Date().toISOString(),
    };

    let totalCogs = 0;
    const movementsToCreate: StockMovement[] = [];

    // Deduct Stock & Create Stock Movements
    inv.items.forEach(item => {
      totalCogs += item.costPrice * item.quantity;
      
      // Stock Movement with customer partner name
      movementsToCreate.push({
        id: generateId("sm"),
        organizationId: organization.id,
        productId: item.productId,
        warehouseId: item.warehouseId,
        movementType: "sales_issue",
        referenceId: newInvoice.id,
        referenceNumber: newInvoice.invoiceNumber,
        date: newInvoice.date,
        quantity: -Math.abs(item.quantity),
        unitCost: item.costPrice,
        totalCost: -Math.abs(item.costPrice * item.quantity),
        balanceQuantity: 0,
        partnerId: newInvoice.customerId,
        partnerName: newInvoice.customerName,
        partnerType: "customer",
        notes: `صرف مبيعات فاتورة ${newInvoice.invoiceNumber}`,
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

    // Customer Balance
    if (inv.status === "unpaid" || inv.status === "partially_paid") {
      setCustomers(prev => prev.map(c =>
        c.id === inv.customerId ? { ...c, currentBalance: c.currentBalance + inv.dueAmount } : c
      ));
    }

    // Balanced GL Entry
    const journalDraft = generateSalesInvoiceJournal(newInvoice, accounts, totalCogs);
    const newJournal: JournalEntry = { ...journalDraft, id: generateId("jv") };
    setJournalEntries(prev => [newJournal, ...prev]);

    setSalesInvoices(prev => [newInvoice, ...prev]);

    persistSalesInvoiceDB(newInvoice).catch(err => console.error("Error saving invoice to DB:", err));
    persistJournalEntryDB(newJournal).catch(err => console.error("Error saving journal to DB:", err));

    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "create",
      entityType: "SalesInvoice",
      entityId: newInvoice.id,
      details: `إصدار فاتورة مبيعات ${newInvoice.invoiceNumber} بمبلغ ${newInvoice.grandTotal}`,
    });

    return newInvoice;
  };

  const deleteSalesInvoice = (id: string) => {
    setSalesInvoices(prev => prev.filter(inv => inv.id !== id));
    setStockMovements(prev => prev.filter(sm => sm.referenceId !== id));
    deleteSalesInvoiceDB(id).catch(err => console.error("Error deleting sales invoice from DB:", err));
  };

  const createPurchaseInvoice = (inv: Omit<PurchaseInvoice, "id">): PurchaseInvoice => {
    const newInvoice: PurchaseInvoice = {
      ...inv,
      id: generateId("pinv"),
    };

    const movementsToCreate: StockMovement[] = [];

    // Add Stock & Create Stock Movements
    inv.items.forEach(item => {
      movementsToCreate.push({
        id: generateId("sm"),
        organizationId: organization.id,
        productId: item.productId,
        warehouseId: item.warehouseId,
        movementType: "purchase_receipt",
        referenceId: newInvoice.id,
        referenceNumber: newInvoice.invoiceNumber,
        date: newInvoice.date,
        quantity: Math.abs(item.quantity),
        unitCost: item.unitCost,
        totalCost: Math.abs(item.unitCost * item.quantity),
        balanceQuantity: 0,
        partnerId: newInvoice.supplierId,
        partnerName: newInvoice.supplierName,
        partnerType: "supplier",
        notes: `توريد مشتريات فاتورة ${newInvoice.invoiceNumber}`,
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

    // Supplier Balance
    if (inv.status === "unpaid" || inv.status === "partially_paid") {
      setSuppliers(prev => prev.map(s =>
        s.id === inv.supplierId ? { ...s, currentBalance: s.currentBalance + inv.dueAmount } : s
      ));
    }

    const journalDraft = generatePurchaseInvoiceJournal(newInvoice, accounts);
    const newJournal: JournalEntry = { ...journalDraft, id: generateId("jv") };
    setJournalEntries(prev => [newJournal, ...prev]);

    setPurchaseInvoices(prev => [newInvoice, ...prev]);

    persistPurchaseInvoiceDB(newInvoice).catch(err => console.error("Error saving purchase to DB:", err));
    persistJournalEntryDB(newJournal).catch(err => console.error("Error saving journal to DB:", err));

    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "create",
      entityType: "PurchaseInvoice",
      entityId: newInvoice.id,
      details: `تسجيل فاتورة مشتريات وتوريد مخزن ${newInvoice.invoiceNumber} بمبلغ ${newInvoice.grandTotal}`,
    });

    return newInvoice;
  };

  const deletePurchaseInvoice = (id: string) => {
    setPurchaseInvoices(prev => prev.filter(inv => inv.id !== id));
    setStockMovements(prev => prev.filter(sm => sm.referenceId !== id));
    deletePurchaseInvoiceDB(id).catch(err => console.error("Error deleting purchase invoice from DB:", err));
  };

  // ==========================================
  // TREASURY & CHECKS CRUD
  // ==========================================
  const createCashReceipt = (rcp: Omit<CashReceipt, "id">): CashReceipt => {
    const newReceipt: CashReceipt = { ...rcp, id: generateId("rcp") };
    setCashReceipts(prev => [newReceipt, ...prev]);

    setTreasuryAccounts(prev => prev.map(t =>
      t.id === rcp.treasuryAccountId ? { ...t, balance: t.balance + rcp.amount } : t
    ));

    if (rcp.customerId) {
      setCustomers(prev => prev.map(c =>
        c.id === rcp.customerId ? { ...c, currentBalance: Math.max(0, c.currentBalance - rcp.amount) } : c
      ));
    }

    const targetTreasury = treasuryAccounts.find(t => t.id === rcp.treasuryAccountId);
    const treasuryGlId = targetTreasury?.glAccountId || accounts[0]?.id || "";
    const journalDraft = generateReceiptJournal(newReceipt, treasuryGlId, accounts);
    const newJournal: JournalEntry = { ...journalDraft, id: generateId("jv") };
    setJournalEntries(prev => [newJournal, ...prev]);
    persistJournalEntryDB(newJournal).catch(err => console.error("Error saving receipt journal to DB:", err));

    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "create",
      entityType: "CashReceipt",
      entityId: newReceipt.id,
      details: `سند قبض نقدية ${newReceipt.receiptNumber} بمبلغ ${newReceipt.amount} ${newReceipt.currency}`,
    });

    return newReceipt;
  };

  const createCashPayment = (pay: Omit<CashPayment, "id">): CashPayment => {
    const newPayment: CashPayment = { ...pay, id: generateId("pay") };
    setCashPayments(prev => [newPayment, ...prev]);

    setTreasuryAccounts(prev => prev.map(t =>
      t.id === pay.treasuryAccountId ? { ...t, balance: t.balance - pay.amount } : t
    ));

    if (pay.supplierId) {
      setSuppliers(prev => prev.map(s =>
        s.id === pay.supplierId ? { ...s, currentBalance: Math.max(0, s.currentBalance - pay.amount) } : s
      ));
    }

    const targetTreasury = treasuryAccounts.find(t => t.id === pay.treasuryAccountId);
    const treasuryGlId = targetTreasury?.glAccountId || accounts[0]?.id || "";
    const journalDraft = generatePaymentJournal(newPayment, treasuryGlId, accounts);
    const newJournal: JournalEntry = { ...journalDraft, id: generateId("jv") };
    setJournalEntries(prev => [newJournal, ...prev]);
    persistJournalEntryDB(newJournal).catch(err => console.error("Error saving payment journal to DB:", err));

    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "create",
      entityType: "CashPayment",
      entityId: newPayment.id,
      details: `سند صرف نقدية ${newPayment.paymentNumber} بمبلغ ${newPayment.amount} ${newPayment.currency}`,
    });

    return newPayment;
  };

  const updateCheckStatus = (checkId: string, newStatus: CheckStatus, targetTreasuryId?: string) => {
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

    persistCheckStatusDB(checkId, newStatus, targetTreasuryId).catch(err => console.error("Error updating check in DB:", err));

    const check = checks.find(c => c.id === checkId);
    if (check && newStatus === "collected" && targetTreasuryId) {
      setTreasuryAccounts(prev => prev.map(t =>
        t.id === targetTreasuryId ? { ...t, balance: t.balance + check.amount } : t
      ));
    }
  };

  const deleteCheck = (id: string) => {
    setChecks(prev => prev.filter(chk => chk.id !== id));
    deleteCheckDB(id).catch(err => console.error("Error deleting check from DB:", err));
  };

  // ==========================================
  // ACCOUNTING & COST CENTERS CRUD
  // ==========================================
  const addAccount = (acc: Omit<Account, "id">): Account => {
    const newAcc: Account = { ...acc, id: generateId("acc") };
    setAccounts(prev => [...prev, newAcc]);
    return newAcc;
  };

  const addCostCenter = (cc: Omit<CostCenter, "id">): CostCenter => {
    const newCc: CostCenter = { ...cc, id: generateId("cc") };
    setCostCenters(prev => [...prev, newCc]);
    persistCostCenterDB(newCc).catch(err => console.error("Error saving cost center to DB:", err));
    return newCc;
  };

  const updateCostCenter = (id: string, cc: Partial<CostCenter>) => {
    setCostCenters(prev => prev.map(item => item.id === id ? { ...item, ...cc } : item));
    updateCostCenterDB(id, cc).catch(err => console.error("Error updating cost center in DB:", err));
  };

  const deleteCostCenter = (id: string) => {
    setCostCenters(prev => prev.filter(item => item.id !== id));
    deleteCostCenterDB(id).catch(err => console.error("Error deleting cost center from DB:", err));
  };

  const addJournalEntry = (entry: Omit<JournalEntry, "id">): JournalEntry => {
    const newEntry: JournalEntry = { ...entry, id: generateId("jv") };
    setJournalEntries(prev => [newEntry, ...prev]);
    persistJournalEntryDB(newEntry).catch(err => console.error("Error saving journal entry to DB:", err));
    return newEntry;
  };

  const deleteJournalEntry = (id: string) => {
    setJournalEntries(prev => prev.filter(je => je.id !== id));
    deleteJournalEntryDB(id).catch(err => console.error("Error deleting journal entry from DB:", err));
  };

  const resetToDemoData = () => {
    setProducts(initialProducts);
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
        currentUser, setCurrentUser, organization, setOrganization,
        branches, activeBranchId, setActiveBranchId, users,
        products, categories, units, warehouses, stockMovements,
        productChangeLogs, periodClosings,
        addProduct, updateProduct, deleteProduct,
        addWarehouse, updateWarehouse, deleteWarehouse, addStockMovement,
        updateStockMovement, deleteStockMovement, addProductChangeLog, createPeriodClosing, hasPermission,
        customers, suppliers, addCustomer, updateCustomer, deleteCustomer,
        addSupplier, updateSupplier, deleteSupplier,
        salesInvoices, purchaseInvoices, createSalesInvoice, deleteSalesInvoice,
        createPurchaseInvoice, deletePurchaseInvoice,
        treasuryAccounts, cashReceipts, cashPayments, checks,
        createCashReceipt, createCashPayment, updateCheckStatus, deleteCheck,
        accounts, costCenters, journalEntries, addAccount,
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
