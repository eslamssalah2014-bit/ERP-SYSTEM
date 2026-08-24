"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  Organization, Branch, User, ProductCategory, ProductUnit, Product,
  Customer, Supplier, Account, TreasuryAccount, CostCenter, CheckRecord,
  SalesInvoice, PurchaseInvoice, StockMovement, JournalEntry, Notification,
  AuditLog, Language, Direction, Theme, CheckStatus, Warehouse, CashReceipt, CashPayment
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
  generatePaymentJournal
} from "@/lib/accounting-engine";
import {
  fetchFullERPData,
  persistProductDB,
  persistCustomerDB,
  persistSupplierDB,
  persistSalesInvoiceDB,
  persistPurchaseInvoiceDB,
  persistWarehouseDB,
  persistCostCenterDB,
  persistCheckDB,
  persistCheckStatusDB,
  persistJournalEntryDB
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
  addProduct: (p: Omit<Product, "id">) => Product;
  updateProduct: (id: string, p: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addWarehouse: (w: Omit<Warehouse, "id">) => Warehouse;
  addStockMovement: (m: Omit<StockMovement, "id">) => void;

  // CRM & Partners
  customers: Customer[];
  suppliers: Supplier[];
  addCustomer: (c: Omit<Customer, "id">) => Customer;
  updateCustomer: (id: string, c: Partial<Customer>) => void;
  addSupplier: (s: Omit<Supplier, "id">) => Supplier;
  updateSupplier: (id: string, s: Partial<Supplier>) => void;

  // Sales & Purchases
  salesInvoices: SalesInvoice[];
  purchaseInvoices: PurchaseInvoice[];
  createSalesInvoice: (inv: Omit<SalesInvoice, "id">) => SalesInvoice;
  createPurchaseInvoice: (inv: Omit<PurchaseInvoice, "id">) => PurchaseInvoice;

  // Treasury & Checks
  treasuryAccounts: TreasuryAccount[];
  cashReceipts: CashReceipt[];
  cashPayments: CashPayment[];
  checks: CheckRecord[];
  createCashReceipt: (rcp: Omit<CashReceipt, "id">) => CashReceipt;
  createCashPayment: (pay: Omit<CashPayment, "id">) => CashPayment;
  updateCheckStatus: (checkId: string, newStatus: CheckStatus, targetTreasuryId?: string) => void;

  // Accounting & GL
  accounts: Account[];
  costCenters: CostCenter[];
  journalEntries: JournalEntry[];
  addAccount: (acc: Omit<Account, "id">) => Account;
  addCostCenter: (cc: Omit<CostCenter, "id">) => CostCenter;
  addJournalEntry: (entry: Omit<JournalEntry, "id">) => JournalEntry;

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

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  // Inventory actions
  const addProduct = (p: Omit<Product, "id">): Product => {
    const newProduct: Product = { ...p, id: generateId("prod") };
    setProducts(prev => [newProduct, ...prev]);
    
    // Asynchronously persist to Supabase Database
    persistProductDB(newProduct).catch(err => console.error("Error saving product to DB:", err));

    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "create",
      entityType: "Product",
      entityId: newProduct.id,
      details: `إضافة منتج جديد: ${newProduct.nameAr} (${newProduct.sku})`,
    });
    return newProduct;
  };

  const updateProduct = (id: string, p: Partial<Product>) => {
    setProducts(prev => prev.map(item => item.id === id ? { ...item, ...p } : item));
    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "update",
      entityType: "Product",
      entityId: id,
      details: `تعديل بيانات المنتج: ${id}`,
    });
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(item => item.id !== id));
    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "delete",
      entityType: "Product",
      entityId: id,
      details: `حذف المنتج: ${id}`,
    });
  };

  const addWarehouse = (w: Omit<Warehouse, "id">): Warehouse => {
    const newWh: Warehouse = { ...w, id: generateId("wh") };
    setWarehouses(prev => [...prev, newWh]);
    persistWarehouseDB(newWh).catch(err => console.error("Error saving warehouse to DB:", err));
    return newWh;
  };

  const addStockMovement = (m: Omit<StockMovement, "id">) => {
    const newMovement: StockMovement = { ...m, id: generateId("sm") };
    setStockMovements(prev => [...prev, newMovement]);
  };

  // CRM actions
  const addCustomer = (c: Omit<Customer, "id">): Customer => {
    const newCust: Customer = { ...c, id: generateId("cust") };
    setCustomers(prev => [newCust, ...prev]);

    // Persist to Supabase Database
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
  };

  const addSupplier = (s: Omit<Supplier, "id">): Supplier => {
    const newSupp: Supplier = { ...s, id: generateId("supp") };
    setSuppliers(prev => [newSupp, ...prev]);

    // Persist to Supabase Database
    persistSupplierDB(newSupp).catch(err => console.error("Error saving supplier to DB:", err));

    return newSupp;
  };

  const updateSupplier = (id: string, s: Partial<Supplier>) => {
    setSuppliers(prev => prev.map(item => item.id === id ? { ...item, ...s } : item));
  };

  // Integrated Sales Invoice Creation
  const createSalesInvoice = (inv: Omit<SalesInvoice, "id">): SalesInvoice => {
    const newInvoice: SalesInvoice = {
      ...inv,
      id: generateId("sinv"),
      createdAt: new Date().toISOString(),
    };

    let totalCogs = 0;

    // 1. Deduct Stock & Record Stock Movements
    inv.items.forEach(item => {
      totalCogs += item.costPrice * item.quantity;
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

      addStockMovement({
        organizationId: organization.id,
        productId: item.productId,
        warehouseId: item.warehouseId,
        movementType: "sales_issue",
        referenceId: newInvoice.id,
        referenceNumber: newInvoice.invoiceNumber,
        date: newInvoice.date,
        quantity: -item.quantity,
        unitCost: item.costPrice,
        totalCost: -(item.costPrice * item.quantity),
        balanceQuantity: 0,
        notes: `صرف مبيعات فاتورة ${newInvoice.invoiceNumber}`,
      });
    });

    // 2. Adjust Customer Balance
    if (inv.status === "unpaid" || inv.status === "partially_paid") {
      setCustomers(prev => prev.map(c =>
        c.id === inv.customerId ? { ...c, currentBalance: c.currentBalance + inv.dueAmount } : c
      ));
    }

    // 3. Generate and Post Balanced GL Journal Entry
    const journalDraft = generateSalesInvoiceJournal(newInvoice, accounts, totalCogs);
    const newJournal: JournalEntry = { ...journalDraft, id: generateId("jv") };
    setJournalEntries(prev => [newJournal, ...prev]);

    setSalesInvoices(prev => [newInvoice, ...prev]);

    // Persist Invoice and Journal to Supabase
    persistSalesInvoiceDB(newInvoice).catch(err => console.error("Error saving invoice to DB:", err));
    persistJournalEntryDB(newJournal).catch(err => console.error("Error saving journal to DB:", err));

    addAuditLog({
      organizationId: organization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: "create",
      entityType: "SalesInvoice",
      entityId: newInvoice.id,
      details: `إصدار فاتورة مبيعات ${newInvoice.invoiceNumber} بمبلغ ${newInvoice.grandTotal} وتحديث المخزون والأستاذ العام`,
    });

    return newInvoice;
  };

  // Integrated Purchase Invoice Creation
  const createPurchaseInvoice = (inv: Omit<PurchaseInvoice, "id">): PurchaseInvoice => {
    const newInvoice: PurchaseInvoice = {
      ...inv,
      id: generateId("pinv"),
    };

    // 1. Replenish Stock & Record Movements
    inv.items.forEach(item => {
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

      addStockMovement({
        organizationId: organization.id,
        productId: item.productId,
        warehouseId: item.warehouseId,
        movementType: "purchase_receipt",
        referenceId: newInvoice.id,
        referenceNumber: newInvoice.invoiceNumber,
        date: newInvoice.date,
        quantity: item.quantity,
        unitCost: item.unitCost,
        totalCost: item.unitCost * item.quantity,
        balanceQuantity: 0,
        notes: `توريد مشتريات فاتورة ${newInvoice.invoiceNumber}`,
      });
    });

    // 2. Adjust Supplier Balance
    if (inv.status === "unpaid" || inv.status === "partially_paid") {
      setSuppliers(prev => prev.map(s =>
        s.id === inv.supplierId ? { ...s, currentBalance: s.currentBalance + inv.dueAmount } : s
      ));
    }

    // 3. Generate and Post Balanced GL Journal Entry
    const journalDraft = generatePurchaseInvoiceJournal(newInvoice, accounts);
    const newJournal: JournalEntry = { ...journalDraft, id: generateId("jv") };
    setJournalEntries(prev => [newJournal, ...prev]);

    setPurchaseInvoices(prev => [newInvoice, ...prev]);

    // Persist to Supabase Database
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

  // Treasury & Cash Actions
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

  // Accounting actions
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

  const addJournalEntry = (entry: Omit<JournalEntry, "id">): JournalEntry => {
    const newEntry: JournalEntry = { ...entry, id: generateId("jv") };
    setJournalEntries(prev => [newEntry, ...prev]);
    persistJournalEntryDB(newEntry).catch(err => console.error("Error saving journal entry to DB:", err));
    return newEntry;
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
  };

  return (
    <ERPContext.Provider
      value={{
        locale, setLocale, direction, theme, setTheme,
        isDbConnected, isLoadingData, refreshData: loadDatabaseData,
        currentUser, setCurrentUser, organization, setOrganization,
        branches, activeBranchId, setActiveBranchId, users,
        products, categories, units, warehouses, stockMovements,
        addProduct, updateProduct, deleteProduct, addWarehouse, addStockMovement,
        customers, suppliers, addCustomer, updateCustomer, addSupplier, updateSupplier,
        salesInvoices, purchaseInvoices, createSalesInvoice, createPurchaseInvoice,
        treasuryAccounts, cashReceipts, cashPayments, checks,
        createCashReceipt, createCashPayment, updateCheckStatus,
        accounts, costCenters, journalEntries, addAccount, addCostCenter, addJournalEntry,
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
