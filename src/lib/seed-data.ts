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
  Warehouse
} from "@/types/erp";

// 1. Production Organization Base Settings
export const initialOrganization: Organization = {
  id: "org_01",
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

// 2. Default Headquarter Branch
export const initialBranches: Branch[] = [
  {
    id: "br_cairo_hq",
    organizationId: "org_01",
    code: "HQ-01",
    nameAr: "الفرع الرئيسي - القاهرة",
    nameEn: "Cairo Headquarters",
    city: "القاهرة",
    address: "القرية الذكية، الجيزة",
    phone: "+20 2 35350000",
    isHeadquarters: true,
  },
];

// 3. Default System Administrator User
export const initialUsers: User[] = [
  {
    id: "usr_admin_01",
    organizationId: "org_01",
    email: "admin@sanaderp.com",
    name: "م. إسلام صلاح حسني",
    role: "super_admin",
    branchId: "br_cairo_hq",
    isActive: true,
  },
];

// 4. Standard System Product Categories
export const initialCategories: ProductCategory[] = [
  { id: "cat_general", organizationId: "org_01", code: "CAT-GEN", nameAr: "عام / منتجات رئيسية", nameEn: "General Products" },
  { id: "cat_pos", organizationId: "org_01", code: "CAT-POS", nameAr: "أنظمة نقاط البيع والكاشير", nameEn: "POS Systems" },
  { id: "cat_hardware", organizationId: "org_01", code: "CAT-HW", nameAr: "أجهزة كمبيوتر وخوادم", nameEn: "Hardware & Servers" },
  { id: "cat_services", organizationId: "org_01", code: "CAT-SRV", nameAr: "خدمات ودعم فني", nameEn: "Services & Support" },
];

// 5. Standard Units of Measure
export const initialUnits: ProductUnit[] = [
  { id: "unit_piece", organizationId: "org_01", code: "PCS", nameAr: "قطعة", nameEn: "Piece", symbol: "قطعة" },
  { id: "unit_box", organizationId: "org_01", code: "BOX", nameAr: "صندوق / كرتونة", nameEn: "Box", symbol: "كرتونة" },
  { id: "unit_set", organizationId: "org_01", code: "SET", nameAr: "طقم متكامل", nameEn: "Set", symbol: "طقم" },
  { id: "unit_kg", organizationId: "org_01", code: "KG", nameAr: "كيلوجرام", nameEn: "Kilogram", symbol: "كجم" },
  { id: "unit_meter", organizationId: "org_01", code: "MTR", nameAr: "متر", nameEn: "Meter", symbol: "متر" },
];

// 6. Default Central Warehouse
export const initialWarehouses: Warehouse[] = [
  {
    id: "wh_cairo_01",
    organizationId: "org_01",
    branchId: "br_cairo_hq",
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

// 8. Customers (Clean Production Baseline: 0 items)
export const initialCustomers: Customer[] = [];

// 9. Suppliers (Clean Production Baseline: 0 items)
export const initialSuppliers: Supplier[] = [];

// 10. Standard Chart of Accounts (COA) with 0.00 Balances
export const initialAccounts: Account[] = [
  // Assets (1000)
  { id: "acc_1000", organizationId: "org_01", code: "1000", nameAr: "الأصول (Assets)", nameEn: "Assets", type: "assets", level: 1, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "acc_1100", organizationId: "org_01", code: "1100", nameAr: "الأصول المتداولة", nameEn: "Current Assets", type: "assets", parentId: "acc_1000", level: 2, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "acc_1110", organizationId: "org_01", code: "1110", nameAr: "النقدية بالخزينة", nameEn: "Cash on Hand", type: "assets", parentId: "acc_1100", level: 3, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "acc_1115", organizationId: "org_01", code: "1115", nameAr: "النقدية بالبنوك", nameEn: "Cash at Banks", type: "assets", parentId: "acc_1100", level: 3, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "acc_1120", organizationId: "org_01", code: "1120", nameAr: "العملاء والمدينون (A/R)", nameEn: "Accounts Receivable", type: "assets", parentId: "acc_1100", level: 3, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "acc_1125", organizationId: "org_01", code: "1125", nameAr: "أوراق القبض (الشيكات الواردة)", nameEn: "Notes Receivable (Checks)", type: "assets", parentId: "acc_1100", level: 3, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "acc_1130", organizationId: "org_01", code: "1130", nameAr: "مخزون البضائع للبيع", nameEn: "Merchandise Inventory", type: "assets", parentId: "acc_1100", level: 3, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "acc_1140", organizationId: "org_01", code: "1140", nameAr: "ضريبة القيمة المضافة - مدخلات (VAT In)", nameEn: "VAT Input Tax", type: "assets", parentId: "acc_1100", level: 3, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },

  // Liabilities (2000)
  { id: "acc_2000", organizationId: "org_01", code: "2000", nameAr: "الخصوم والالتزامات (Liabilities)", nameEn: "Liabilities", type: "liabilities", level: 1, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "acc_2100", organizationId: "org_01", code: "2100", nameAr: "الخصوم المتداولة", nameEn: "Current Liabilities", type: "liabilities", parentId: "acc_2000", level: 2, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "acc_2110", organizationId: "org_01", code: "2110", nameAr: "الموردون والدائنون (A/P)", nameEn: "Accounts Payable", type: "liabilities", parentId: "acc_2100", level: 3, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "acc_2120", organizationId: "org_01", code: "2120", nameAr: "أوراق الدفع (الشيكات الصادرة)", nameEn: "Notes Payable (Checks)", type: "liabilities", parentId: "acc_2100", level: 3, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "acc_2130", organizationId: "org_01", code: "2130", nameAr: "ضريبة القيمة المضافة - مخرجات (VAT Out)", nameEn: "VAT Output Tax", type: "liabilities", parentId: "acc_2100", level: 3, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },

  // Equity (3000)
  { id: "acc_3000", organizationId: "org_01", code: "3000", nameAr: "حقوق الملكية (Equity)", nameEn: "Equity", type: "equity", level: 1, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "acc_3100", organizationId: "org_01", code: "3100", nameAr: "رأس المال المدفوع", nameEn: "Paid-in Capital", type: "equity", parentId: "acc_3000", level: 2, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },

  // Revenues (4000)
  { id: "acc_4000", organizationId: "org_01", code: "4000", nameAr: "الإيرادات (Revenues)", nameEn: "Revenues", type: "revenue", level: 1, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "acc_4100", organizationId: "org_01", code: "4100", nameAr: "إيرادات مبيعات البضائع والخدمات", nameEn: "Sales & Services Revenue", type: "revenue", parentId: "acc_4000", level: 2, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },

  // Expenses (5000)
  { id: "acc_5000", organizationId: "org_01", code: "5000", nameAr: "المصروفات (Expenses)", nameEn: "Expenses", type: "expense", level: 1, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "acc_5100", organizationId: "org_01", code: "5100", nameAr: "تكلفة البضاعة المباعة (COGS)", nameEn: "Cost of Goods Sold", type: "expense", parentId: "acc_5000", level: 2, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "acc_5200", organizationId: "org_01", code: "5200", nameAr: "مصروفات إدارية وعمومية", nameEn: "General & Administrative Expenses", type: "expense", parentId: "acc_5000", level: 2, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
];

// 11. Treasury Accounts with 0.00 Balances
export const initialTreasuryAccounts: TreasuryAccount[] = [
  {
    id: "treas_01",
    organizationId: "org_01",
    branchId: "br_cairo_hq",
    glAccountId: "acc_1110",
    code: "SAFE-MAIN",
    nameAr: "الخزينة الرئيسية للمنشأة",
    nameEn: "Main Company Safe",
    type: "cash_box",
    currency: "EGP",
    balance: 0,
    isDefault: true
  },
  {
    id: "treas_02",
    organizationId: "org_01",
    branchId: "br_cairo_hq",
    glAccountId: "acc_1115",
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
