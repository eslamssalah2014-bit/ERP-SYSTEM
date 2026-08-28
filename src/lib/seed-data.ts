import {
  Organization,
  Branch,
  User,
  ProductCategory,
  ProductUnit,
  Product,
  Customer,
  Supplier,
  Account,
  TreasuryAccount,
  CostCenter,
  CheckRecord,
  SalesInvoice,
  PurchaseInvoice,
  StockMovement,
  JournalEntry,
  Notification,
  AuditLog,
  Warehouse,
  CustomerCategory,
  SalesReturn,
  PurchaseReturn
} from "@/types/erp";

// 1. Production Organization Base Settings (UUID)
export const initialOrganization: Organization = {
  id: "00000000-0000-0000-0000-000000000001",
  nameAr: "شركة سند الدولية للحلول التكنولوجية",
  nameEn: "Sanad International Tech Solutions",
  taxNumber: "300123456700003",
  commercialRegister: "1010987654",
  country: "EG",
  currency: "EGP",
  defaultVatRate: 14,
  address: "مبنى 4، القرية الذكية، طريق مصر الإسكندرية الصحراوي، الجيزة، مصر",
  planTier: "enterprise",
};

// 2. Default Headquarter Branch (UUID)
export const initialBranches: Branch[] = [
  {
    id: "00000000-0000-0000-0000-000000000002",
    organizationId: "00000000-0000-0000-0000-000000000001",
    code: "HQ-01",
    nameAr: "الفرع الرئيسي - القاهرة",
    nameEn: "Cairo Headquarters",
    city: "القاهرة",
    address: "القرية الذكية، الجيزة",
    phone: "+20 2 35350000",
    isHeadquarters: true,
  },
];

// 3. Default System Administrator User (UUID)
export const initialUsers: User[] = [
  {
    id: "00000000-0000-0000-0000-000000000003",
    organizationId: "00000000-0000-0000-0000-000000000001",
    email: "admin@sanaderp.com",
    name: "م. إسلام صلاح حسني",
    role: "super_admin",
    branchId: "00000000-0000-0000-0000-000000000002",
    isActive: true,
  },
];

// 4. Standard System Product Categories (UUIDs)
export const initialCategories: ProductCategory[] = [
  { id: "00000000-0000-0000-0000-000000000021", organizationId: "00000000-0000-0000-0000-000000000001", code: "CAT-GEN", nameAr: "عام / منتجات رئيسية", nameEn: "General Products" },
  { id: "00000000-0000-0000-0000-000000000022", organizationId: "00000000-0000-0000-0000-000000000001", code: "CAT-POS", nameAr: "أنظمة نقاط البيع والكاشير", nameEn: "POS Systems" },
  { id: "00000000-0000-0000-0000-000000000023", organizationId: "00000000-0000-0000-0000-000000000001", code: "CAT-HW", nameAr: "أجهزة كمبيوتر وخوادم", nameEn: "Hardware & Servers" },
  { id: "00000000-0000-0000-0000-000000000024", organizationId: "00000000-0000-0000-0000-000000000001", code: "CAT-SRV", nameAr: "خدمات ودعم فني", nameEn: "Services & Support" },
];

// 5. Standard Units of Measure (UUIDs)
export const initialUnits: ProductUnit[] = [
  { id: "00000000-0000-0000-0000-000000000011", organizationId: "00000000-0000-0000-0000-000000000001", code: "PCS", nameAr: "قطعة", nameEn: "Piece", symbol: "قطعة" },
  { id: "00000000-0000-0000-0000-000000000012", organizationId: "00000000-0000-0000-0000-000000000001", code: "BOX", nameAr: "صندوق / كرتونة", nameEn: "Box", symbol: "كرتونة" },
  { id: "00000000-0000-0000-0000-000000000013", organizationId: "00000000-0000-0000-0000-000000000001", code: "SET", nameAr: "طقم متكامل", nameEn: "Set", symbol: "طقم" },
  { id: "00000000-0000-0000-0000-000000000014", organizationId: "00000000-0000-0000-0000-000000000001", code: "KG", nameAr: "كيلوجرام", nameEn: "Kilogram", symbol: "كجم" },
  { id: "00000000-0000-0000-0000-000000000015", organizationId: "00000000-0000-0000-0000-000000000001", code: "MTR", nameAr: "متر", nameEn: "Meter", symbol: "متر" },
];

// 6. Default Central Warehouse (UUID)
export const initialWarehouses: Warehouse[] = [
  {
    id: "00000000-0000-0000-0000-000000000004",
    organizationId: "00000000-0000-0000-0000-000000000001",
    branchId: "00000000-0000-0000-0000-000000000002",
    code: "WH-01",
    nameAr: "المستودع المركزي الرئيسي",
    nameEn: "Main Central Warehouse",
    location: "المنطقة الصناعية، 6 أكتوبر",
    managerName: "المشرف العام",
    managerPhone: "+20 100 0000000",
    isDefault: true
  },
];

// 7. Products (Clean Production Baseline: 0 items)
export const initialProducts: Product[] = [];

// 8. Customers (Clean Production Baseline with POS Walk-in Customer)
export const initialCustomers: Customer[] = [
  {
    id: "00000000-0000-0000-0000-000000000099",
    organizationId: "00000000-0000-0000-0000-000000000001",
    code: "CUST-POS",
    nameAr: "عميل نقدي عام (نقاط البيع)",
    nameEn: "Walk-in Cash Customer",
    mobile: "+20 100 0000000",
    city: "القاهرة",
    address: "مبيعات نقدية مباشرة",
    creditLimit: 0,
    paymentTermsDays: 0,
    currentBalance: 0,
    status: "active",
  },
];

// 9. Suppliers (Clean Production Baseline: 0 items)
export const initialSuppliers: Supplier[] = [];

// 10. Standard Chart of Accounts (COA) with 0.00 Balances (UUIDs)
export const initialAccounts: Account[] = [
  // Assets (1000)
  { id: "00000000-0000-0000-0000-000000000100", organizationId: "00000000-0000-0000-0000-000000000001", code: "1000", nameAr: "الأصول (Assets)", nameEn: "Assets", type: "assets", level: 1, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0000-000000000110", organizationId: "00000000-0000-0000-0000-000000000001", code: "1100", nameAr: "الأصول المتداولة", nameEn: "Current Assets", type: "assets", parentId: "00000000-0000-0000-0000-000000000100", level: 2, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0000-000000000111", organizationId: "00000000-0000-0000-0000-000000000001", code: "1110", nameAr: "النقدية بالخزينة", nameEn: "Cash on Hand", type: "assets", parentId: "00000000-0000-0000-0000-000000000110", level: 3, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0000-000000000115", organizationId: "00000000-0000-0000-0000-000000000001", code: "1115", nameAr: "النقدية بالبنوك", nameEn: "Cash at Banks", type: "assets", parentId: "00000000-0000-0000-0000-000000000110", level: 3, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0000-000000000120", organizationId: "00000000-0000-0000-0000-000000000001", code: "1120", nameAr: "العملاء والمدينون (A/R)", nameEn: "Accounts Receivable", type: "assets", parentId: "00000000-0000-0000-0000-000000000110", level: 3, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0000-000000000125", organizationId: "00000000-0000-0000-0000-000000000001", code: "1125", nameAr: "أوراق القبض (الشيكات الواردة)", nameEn: "Notes Receivable (Checks)", type: "assets", parentId: "00000000-0000-0000-0000-000000000110", level: 3, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0000-000000000130", organizationId: "00000000-0000-0000-0000-000000000001", code: "1130", nameAr: "مخزون البضائع للبيع", nameEn: "Merchandise Inventory", type: "assets", parentId: "00000000-0000-0000-0000-000000000110", level: 3, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0000-000000000140", organizationId: "00000000-0000-0000-0000-000000000001", code: "1140", nameAr: "ضريبة القيمة المضافة - مدخلات (VAT In)", nameEn: "VAT Input Tax", type: "assets", parentId: "00000000-0000-0000-0000-000000000110", level: 3, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },

  // Liabilities (2000)
  { id: "00000000-0000-0000-0000-000000000200", organizationId: "00000000-0000-0000-0000-000000000001", code: "2000", nameAr: "الخصوم والالتزامات (Liabilities)", nameEn: "Liabilities", type: "liabilities", level: 1, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0000-000000000210", organizationId: "00000000-0000-0000-0000-000000000001", code: "2100", nameAr: "الخصوم المتداولة", nameEn: "Current Liabilities", type: "liabilities", parentId: "00000000-0000-0000-0000-000000000200", level: 2, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0000-000000000211", organizationId: "00000000-0000-0000-0000-000000000001", code: "2110", nameAr: "الموردون والدائنون (A/P)", nameEn: "Accounts Payable", type: "liabilities", parentId: "00000000-0000-0000-0000-000000000210", level: 3, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0000-000000000212", organizationId: "00000000-0000-0000-0000-000000000001", code: "2120", nameAr: "أوراق الدفع (الشيكات الصادرة)", nameEn: "Notes Payable (Checks)", type: "liabilities", parentId: "00000000-0000-0000-0000-000000000210", level: 3, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0000-000000000213", organizationId: "00000000-0000-0000-0000-000000000001", code: "2130", nameAr: "ضريبة القيمة المضافة - مخرجات (VAT Out)", nameEn: "VAT Output Tax", type: "liabilities", parentId: "00000000-0000-0000-0000-000000000210", level: 3, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },

  // Equity (3000)
  { id: "00000000-0000-0000-0000-000000000300", organizationId: "00000000-0000-0000-0000-000000000001", code: "3000", nameAr: "حقوق الملكية (Equity)", nameEn: "Equity", type: "equity", level: 1, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0000-000000000310", organizationId: "00000000-0000-0000-0000-000000000001", code: "3100", nameAr: "رأس المال المدفوع", nameEn: "Paid-in Capital", type: "equity", parentId: "00000000-0000-0000-0000-000000000300", level: 2, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },

  // Revenues (4000)
  { id: "00000000-0000-0000-0000-000000000400", organizationId: "00000000-0000-0000-0000-000000000001", code: "4000", nameAr: "الإيرادات (Revenues)", nameEn: "Revenues", type: "revenue", level: 1, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0000-000000000410", organizationId: "00000000-0000-0000-0000-000000000001", code: "4100", nameAr: "إيرادات مبيعات البضائع والخدمات", nameEn: "Sales & Services Revenue", type: "revenue", parentId: "00000000-0000-0000-0000-000000000400", level: 2, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },

  // Expenses (5000)
  { id: "00000000-0000-0000-0000-000000000500", organizationId: "00000000-0000-0000-0000-000000000001", code: "5000", nameAr: "المصروفات (Expenses)", nameEn: "Expenses", type: "expense", level: 1, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0000-000000000510", organizationId: "00000000-0000-0000-0000-000000000001", code: "5100", nameAr: "تكلفة البضاعة المباعة (COGS)", nameEn: "Cost of Goods Sold", type: "expense", parentId: "00000000-0000-0000-0000-000000000500", level: 2, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0000-000000000520", organizationId: "00000000-0000-0000-0000-000000000001", code: "5200", nameAr: "مصروفات إدارية وعمومية", nameEn: "General & Administrative Expenses", type: "expense", parentId: "00000000-0000-0000-0000-000000000500", level: 2, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
];

// 11. Treasury Accounts with 0.00 Balances (UUIDs)
export const initialTreasuryAccounts: TreasuryAccount[] = [
  {
    id: "00000000-0000-0000-0000-000000000301",
    organizationId: "00000000-0000-0000-0000-000000000001",
    branchId: "00000000-0000-0000-0000-000000000002",
    glAccountId: "00000000-0000-0000-0000-000000000111",
    code: "SAFE-MAIN",
    nameAr: "الخزينة الرئيسية للمنشأة",
    nameEn: "Main Company Safe",
    type: "cash_box",
    currency: "EGP",
    balance: 0,
    isDefault: true
  },
  {
    id: "00000000-0000-0000-0000-000000000302",
    organizationId: "00000000-0000-0000-0000-000000000001",
    branchId: "00000000-0000-0000-0000-000000000002",
    glAccountId: "00000000-0000-0000-0000-000000000115",
    code: "BANK-MAIN",
    nameAr: "الحساب البنكي الرئيسي",
    nameEn: "Primary Bank Account",
    type: "bank_account",
    currency: "EGP",
    balance: 0,
    bankName: "البنك الرئيسي",
    accountNumber: "0000-0000-0000",
    isDefault: false
  }
];

// 12. Cost Centers (Clean: 0 items)
export const initialCostCenters: CostCenter[] = [];

// 13. Checks Portfolio (Clean: 0 items)
export const initialChecks: CheckRecord[] = [];

// 14. Sales Invoices (Clean: 0 items)
export const initialSalesInvoices: SalesInvoice[] = [];

// 15. Purchase Invoices (Clean: 0 items)
export const initialPurchaseInvoices: PurchaseInvoice[] = [];

// 16. Stock Movements (Clean: 0 items)
export const initialStockMovements: StockMovement[] = [];

// 17. Journal Entries (Clean: 0 items)
export const initialJournalEntries: JournalEntry[] = [];

// 18. Notifications (Clean: 0 items)
export const initialNotifications: Notification[] = [];

// 19. Audit Logs (Clean: 0 items)
export const initialAuditLogs: AuditLog[] = [];

// 20. Customer Categories
export const initialCustomerCategories: CustomerCategory[] = [
  { id: "00000000-0000-0000-0000-000000000031", organizationId: "00000000-0000-0000-0000-000000000001", code: "CUST-RETAIL", nameAr: "تجزئة / أفراد", nameEn: "Retail", description: "العملاء الأفراد والمبيعات المباشرة" },
  { id: "00000000-0000-0000-0000-000000000032", organizationId: "00000000-0000-0000-0000-000000000001", code: "CUST-WHOLESALE", nameAr: "جملة وتوزيع", nameEn: "Wholesale", description: "تجار الجملة والموزعون المعتمدون" },
  { id: "00000000-0000-0000-0000-000000000033", organizationId: "00000000-0000-0000-0000-000000000001", code: "CUST-VIP", nameAr: "عملاء VIP كبار", nameEn: "VIP", description: "كبار العملاء والصفوة" },
  { id: "00000000-0000-0000-0000-000000000034", organizationId: "00000000-0000-0000-0000-000000000001", code: "CUST-CORP", nameAr: "شركات ومؤسسات", nameEn: "Corporate", description: "الشركات والمؤسسات والجهات الحكومية" },
];

// 21. Sales Returns
export const initialSalesReturns: SalesReturn[] = [];

// 22. Purchase Returns
export const initialPurchaseReturns: PurchaseReturn[] = [];
