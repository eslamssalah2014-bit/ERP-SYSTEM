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

// 10. Standard Chart of Accounts (COA) with 0.00 Balances (Report #6 Standardized 57 Accounts)
export const initialAccounts: Account[] = [
  // ==========================================
  // 1. ASSETS (1)
  // ==========================================
  { id: "00000000-0000-0000-0001-000000000001", organizationId: "00000000-0000-0000-0000-000000000001", code: "1", nameAr: "الأصول (Assets)", nameEn: "Assets", type: "assets", level: 1, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  
  // Current Assets (11)
  { id: "00000000-0000-0000-0001-000000000011", organizationId: "00000000-0000-0000-0000-000000000001", code: "11", nameAr: "الأصول المتداولة", nameEn: "Current Assets", type: "assets", parentId: "00000000-0000-0000-0001-000000000001", level: 2, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000000001101", organizationId: "00000000-0000-0000-0000-000000000001", code: "1101", nameAr: "النقدية وشبه النقدية", nameEn: "Cash & Treasury", type: "assets", parentId: "00000000-0000-0000-0001-000000000011", level: 3, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000001101001", organizationId: "00000000-0000-0000-0000-000000000001", code: "1101001", nameAr: "صندوق رئيسي", nameEn: "Main Cash", type: "assets", parentId: "00000000-0000-0000-0001-000000001101", level: 4, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000001101002", organizationId: "00000000-0000-0000-0000-000000000001", code: "1101002", nameAr: "النقدية بالبنوك", nameEn: "Bank Cash", type: "assets", parentId: "00000000-0000-0000-0001-000000001101", level: 4, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },

  { id: "00000000-0000-0000-0001-000000001102", organizationId: "00000000-0000-0000-0000-000000000001", code: "1102", nameAr: "العملاء والمدينون", nameEn: "Accounts Receivable", type: "assets", parentId: "00000000-0000-0000-0001-000000000011", level: 3, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000001102001", organizationId: "00000000-0000-0000-0000-000000000001", code: "1102001", nameAr: "العملاء", nameEn: "Customers", type: "assets", parentId: "00000000-0000-0000-0001-000000001102", level: 4, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000001102002", organizationId: "00000000-0000-0000-0000-000000000001", code: "1102002", nameAr: "أوراق القبض", nameEn: "Notes Receivable", type: "assets", parentId: "00000000-0000-0000-0001-000000001102", level: 4, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000001102003", organizationId: "00000000-0000-0000-0000-000000000001", code: "1102003", nameAr: "شيكات تحت التحصيل", nameEn: "Checks Under Collection", type: "assets", parentId: "00000000-0000-0000-0001-000000001102", level: 4, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },

  { id: "00000000-0000-0000-0001-000000001103", organizationId: "00000000-0000-0000-0000-000000000001", code: "1103", nameAr: "المخزون", nameEn: "Inventory", type: "assets", parentId: "00000000-0000-0000-0001-000000000011", level: 3, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000001103001", organizationId: "00000000-0000-0000-0000-000000000001", code: "1103001", nameAr: "مخزون بضاعة تامة", nameEn: "Finished Goods Inventory", type: "assets", parentId: "00000000-0000-0000-0001-000000001103", level: 4, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000001103002", organizationId: "00000000-0000-0000-0000-000000000001", code: "1103002", nameAr: "بضاعة بالطريق", nameEn: "Goods In Transit", type: "assets", parentId: "00000000-0000-0000-0001-000000001103", level: 4, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },

  { id: "00000000-0000-0000-0001-000000001104", organizationId: "00000000-0000-0000-0000-000000000001", code: "1104", nameAr: "مدينون وأرصدة مدينة أخرى", nameEn: "Other Receivables", type: "assets", parentId: "00000000-0000-0000-0001-000000000011", level: 3, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000001104001", organizationId: "00000000-0000-0000-0000-000000000001", code: "1104001", nameAr: "مصروفات مدفوعة مقدماً", nameEn: "Prepaid Expenses", type: "assets", parentId: "00000000-0000-0000-0001-000000001104", level: 4, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000001104002", organizationId: "00000000-0000-0000-0000-000000000001", code: "1104002", nameAr: "سلف وعُهد العاملين", nameEn: "Employee Advances", type: "assets", parentId: "00000000-0000-0000-0001-000000001104", level: 4, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },

  { id: "00000000-0000-0000-0001-000000001105", organizationId: "00000000-0000-0000-0000-000000000001", code: "1105", nameAr: "الأرصدة الضريبية المدينة", nameEn: "Taxes", type: "assets", parentId: "00000000-0000-0000-0001-000000000011", level: 3, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000001105002", organizationId: "00000000-0000-0000-0000-000000000001", code: "1105002", nameAr: "ضريبة القيمة المضافة مدخلات", nameEn: "VAT Input Tax", type: "assets", parentId: "00000000-0000-0000-0001-000000001105", level: 4, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },

  // Non Current Assets (12)
  { id: "00000000-0000-0000-0001-000000000012", organizationId: "00000000-0000-0000-0000-000000000001", code: "12", nameAr: "الأصول غير المتداولة", nameEn: "Non Current Assets", type: "assets", parentId: "00000000-0000-0000-0001-000000000001", level: 2, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000000001201", organizationId: "00000000-0000-0000-0000-000000000001", code: "1201", nameAr: "الأصول الثابتة", nameEn: "Fixed Assets", type: "assets", parentId: "00000000-0000-0000-0001-000000000012", level: 3, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000001201001", organizationId: "00000000-0000-0000-0000-000000000001", code: "1201001", nameAr: "أراضي", nameEn: "Lands", type: "assets", parentId: "00000000-0000-0000-0001-000000001201", level: 4, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000001201002", organizationId: "00000000-0000-0000-0000-000000000001", code: "1201002", nameAr: "مباني وإنشاءات", nameEn: "Buildings", type: "assets", parentId: "00000000-0000-0000-0001-000000001201", level: 4, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000001201003", organizationId: "00000000-0000-0000-0000-000000000001", code: "1201003", nameAr: "سيارات ووسائل نقل", nameEn: "Vehicles", type: "assets", parentId: "00000000-0000-0000-0001-000000001201", level: 4, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000001201004", organizationId: "00000000-0000-0000-0000-000000000001", code: "1201004", nameAr: "آلات ومعدات", nameEn: "Equipment", type: "assets", parentId: "00000000-0000-0000-0001-000000001201", level: 4, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000001201005", organizationId: "00000000-0000-0000-0000-000000000001", code: "1201005", nameAr: "أجهزة حاسب وبرمجيات", nameEn: "Computers", type: "assets", parentId: "00000000-0000-0000-0001-000000001201", level: 4, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000001201006", organizationId: "00000000-0000-0000-0000-000000000001", code: "1201006", nameAr: "أثاث وتجهيزات مكتبية", nameEn: "Furniture", type: "assets", parentId: "00000000-0000-0000-0001-000000001201", level: 4, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },

  { id: "00000000-0000-0000-0001-000000001202", organizationId: "00000000-0000-0000-0000-000000000001", code: "1202", nameAr: "مجمع الإهلاك للأصول الثابتة", nameEn: "Accumulated Depreciation", type: "assets", parentId: "00000000-0000-0000-0001-000000000012", level: 3, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000001202001", organizationId: "00000000-0000-0000-0000-000000000001", code: "1202001", nameAr: "مجمع إهلاك مباني", nameEn: "Building Depreciation", type: "assets", parentId: "00000000-0000-0000-0001-000000001202", level: 4, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000001202002", organizationId: "00000000-0000-0000-0000-000000000001", code: "1202002", nameAr: "مجمع إهلاك سيارات", nameEn: "Vehicle Depreciation", type: "assets", parentId: "00000000-0000-0000-0001-000000001202", level: 4, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000001202003", organizationId: "00000000-0000-0000-0000-000000000001", code: "1202003", nameAr: "مجمع إهلاك حاسبات", nameEn: "Computer Depreciation", type: "assets", parentId: "00000000-0000-0000-0001-000000001202", level: 4, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000001202004", organizationId: "00000000-0000-0000-0000-000000000001", code: "1202004", nameAr: "مجمع إهلاك أثاث", nameEn: "Furniture Depreciation", type: "assets", parentId: "00000000-0000-0000-0001-000000001202", level: 4, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },

  // ==========================================
  // 2. LIABILITIES (2)
  // ==========================================
  { id: "00000000-0000-0000-0001-000000000002", organizationId: "00000000-0000-0000-0000-000000000001", code: "2", nameAr: "الخصوم والالتزامات (Liabilities)", nameEn: "Liabilities", type: "liabilities", level: 1, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  
  // Current Liabilities (21)
  { id: "00000000-0000-0000-0001-000000000021", organizationId: "00000000-0000-0000-0000-000000000001", code: "21", nameAr: "الخصوم المتداولة", nameEn: "Current Liabilities", type: "liabilities", parentId: "00000000-0000-0000-0001-000000000002", level: 2, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000000002101", organizationId: "00000000-0000-0000-0000-000000000001", code: "2101", nameAr: "الموردون والدائنون", nameEn: "Accounts Payable", type: "liabilities", parentId: "00000000-0000-0000-0001-000000000021", level: 3, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000002101001", organizationId: "00000000-0000-0000-0000-000000000001", code: "2101001", nameAr: "الموردون", nameEn: "Suppliers", type: "liabilities", parentId: "00000000-0000-0000-0001-000000002101", level: 4, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000002101002", organizationId: "00000000-0000-0000-0000-000000000001", code: "2101002", nameAr: "أوراق الدفع", nameEn: "Notes Payable", type: "liabilities", parentId: "00000000-0000-0000-0001-000000002101", level: 4, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },

  { id: "00000000-0000-0000-0001-000000002102", organizationId: "00000000-0000-0000-0000-000000000001", code: "2102", nameAr: "الالتزامات الضريبية", nameEn: "Taxes Payable", type: "liabilities", parentId: "00000000-0000-0000-0001-000000000021", level: 3, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000002102001", organizationId: "00000000-0000-0000-0000-000000000001", code: "2102001", nameAr: "ضريبة الدخل المستحقة", nameEn: "Income Tax Payable", type: "liabilities", parentId: "00000000-0000-0000-0001-000000002102", level: 4, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000002102002", organizationId: "00000000-0000-0000-0000-000000000001", code: "2102002", nameAr: "ضريبة القيمة المضافة مخرجات", nameEn: "VAT Output Tax", type: "liabilities", parentId: "00000000-0000-0000-0001-000000002102", level: 4, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000002102003", organizationId: "00000000-0000-0000-0000-000000000001", code: "2102003", nameAr: "ضريبة الخصم والتحصيل", nameEn: "Withholding Tax Payable", type: "liabilities", parentId: "00000000-0000-0000-0001-000000002102", level: 4, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },

  { id: "00000000-0000-0000-0001-000000002103", organizationId: "00000000-0000-0000-0000-000000000001", code: "2103", nameAr: "دائنون وأرصدة دائنة أخرى", nameEn: "Other Payables", type: "liabilities", parentId: "00000000-0000-0000-0001-000000000021", level: 3, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000002103001", organizationId: "00000000-0000-0000-0000-000000000001", code: "2103001", nameAr: "مصروفات مستحقة", nameEn: "Accrued Expenses", type: "liabilities", parentId: "00000000-0000-0000-0001-000000002103", level: 4, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000002103002", organizationId: "00000000-0000-0000-0000-000000000001", code: "2103002", nameAr: "أمانات ضرائب وتأمينات", nameEn: "Insurance & Tax Deposits", type: "liabilities", parentId: "00000000-0000-0000-0001-000000002103", level: 4, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },

  // Non Current Liabilities (22)
  { id: "00000000-0000-0000-0001-000000000022", organizationId: "00000000-0000-0000-0000-000000000001", code: "22", nameAr: "الخصوم غير المتداولة", nameEn: "Non Current Liabilities", type: "liabilities", parentId: "00000000-0000-0000-0001-000000000002", level: 2, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000000002201", organizationId: "00000000-0000-0000-0000-000000000001", code: "2201", nameAr: "قروض طويلة الأجل", nameEn: "Long-term Loans", type: "liabilities", parentId: "00000000-0000-0000-0001-000000000022", level: 3, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000002201001", organizationId: "00000000-0000-0000-0000-000000000001", code: "2201001", nameAr: "قروض بنكية", nameEn: "Bank Loans", type: "liabilities", parentId: "00000000-0000-0000-0001-000000002201", level: 4, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },

  // ==========================================
  // 3. EQUITY (3)
  // ==========================================
  { id: "00000000-0000-0000-0001-000000000003", organizationId: "00000000-0000-0000-0000-000000000001", code: "3", nameAr: "حقوق الملكية (Equity)", nameEn: "Equity", type: "equity", level: 1, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  
  // Capital & Reserves (31)
  { id: "00000000-0000-0000-0001-000000000031", organizationId: "00000000-0000-0000-0000-000000000001", code: "31", nameAr: "رأس المال والاحتياطيات", nameEn: "Capital & Reserves", type: "equity", parentId: "00000000-0000-0000-0001-000000000003", level: 2, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000000003101", organizationId: "00000000-0000-0000-0000-000000000001", code: "3101", nameAr: "رأس المال المدفوع", nameEn: "Paid-in Capital", type: "equity", parentId: "00000000-0000-0000-0001-000000000031", level: 3, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000003101001", organizationId: "00000000-0000-0000-0000-000000000001", code: "3101001", nameAr: "رأس المال", nameEn: "Capital", type: "equity", parentId: "00000000-0000-0000-0001-000000003101", level: 4, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000003101002", organizationId: "00000000-0000-0000-0000-000000000001", code: "3101002", nameAr: "أرباح / خسائر مرحلة", nameEn: "Retained Earnings", type: "equity", parentId: "00000000-0000-0000-0001-000000003101", level: 4, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000003101003", organizationId: "00000000-0000-0000-0000-000000000001", code: "3101003", nameAr: "أرباح العام الحالي", nameEn: "Current Year Profit", type: "equity", parentId: "00000000-0000-0000-0001-000000003101", level: 4, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000003101004", organizationId: "00000000-0000-0000-0000-000000000001", code: "3101004", nameAr: "جاري الشركاء", nameEn: "Partners Current Account", type: "equity", parentId: "00000000-0000-0000-0001-000000003101", level: 4, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },

  // ==========================================
  // 4. REVENUE (4)
  // ==========================================
  { id: "00000000-0000-0000-0001-000000000004", organizationId: "00000000-0000-0000-0000-000000000001", code: "4", nameAr: "الإيرادات (Revenue)", nameEn: "Revenue", type: "revenue", level: 1, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000000000041", organizationId: "00000000-0000-0000-0000-000000000001", code: "41", nameAr: "إيرادات المبيعات والنشاط", nameEn: "Sales & Operating Revenue", type: "revenue", parentId: "00000000-0000-0000-0001-000000000004", level: 2, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  
  // Sales Revenue & Other Revenue
  { id: "00000000-0000-0000-0001-000000004101", organizationId: "00000000-0000-0000-0000-000000000001", code: "4101", nameAr: "إيرادات النشاط الرئيسي", nameEn: "Sales Revenue", type: "revenue", parentId: "00000000-0000-0000-0001-000000000041", level: 3, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000004101001", organizationId: "00000000-0000-0000-0000-000000000001", code: "4101001", nameAr: "إيراد مبيعات بضائع", nameEn: "Goods Sales Revenue", type: "revenue", parentId: "00000000-0000-0000-0001-000000004101", level: 4, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000004101002", organizationId: "00000000-0000-0000-0000-000000000001", code: "4101002", nameAr: "مردودات ومسموحات مبيعات", nameEn: "Sales Returns & Allowances", type: "revenue", parentId: "00000000-0000-0000-0001-000000004101", level: 4, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000004101003", organizationId: "00000000-0000-0000-0000-000000000001", code: "4101003", nameAr: "خصم مسموح به", nameEn: "Sales Discount Allowed", type: "revenue", parentId: "00000000-0000-0000-0001-000000004101", level: 4, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },

  { id: "00000000-0000-0000-0001-000000004102", organizationId: "00000000-0000-0000-0000-000000000001", code: "4102", nameAr: "إيرادات أخرى", nameEn: "Other Revenues", type: "revenue", parentId: "00000000-0000-0000-0001-000000000041", level: 3, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000004102001", organizationId: "00000000-0000-0000-0000-000000000001", code: "4102001", nameAr: "إيرادات متنوعة", nameEn: "Miscellaneous Revenue", type: "revenue", parentId: "00000000-0000-0000-0001-000000004102", level: 4, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },

  // ==========================================
  // 5. EXPENSES (5)
  // ==========================================
  { id: "00000000-0000-0000-0001-000000000005", organizationId: "00000000-0000-0000-0000-000000000001", code: "5", nameAr: "المصروفات والتكاليف (Expenses)", nameEn: "Expenses", type: "expense", level: 1, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  
  // Cost of Operations (51)
  { id: "00000000-0000-0000-0001-000000000051", organizationId: "00000000-0000-0000-0000-000000000001", code: "51", nameAr: "تكلفة النشاط والإنتاج", nameEn: "Cost of Operations", type: "expense", parentId: "00000000-0000-0000-0001-000000000005", level: 2, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000000005101", organizationId: "00000000-0000-0000-0000-000000000001", code: "5101", nameAr: "تكلفة المبيعات", nameEn: "Cost of Goods Sold", type: "expense", parentId: "00000000-0000-0000-0001-000000000051", level: 3, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000005101001", organizationId: "00000000-0000-0000-0000-000000000001", code: "5101001", nameAr: "تكلفة البضاعة المباعة", nameEn: "Cost of Goods Sold", type: "expense", parentId: "00000000-0000-0000-0001-000000005101", level: 4, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000005101002", organizationId: "00000000-0000-0000-0000-000000000001", code: "5101002", nameAr: "مردودات ومسموحات مشتريات", nameEn: "Purchase Returns & Allowances", type: "expense", parentId: "00000000-0000-0000-0001-000000005101", level: 4, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000005101003", organizationId: "00000000-0000-0000-0000-000000000001", code: "5101003", nameAr: "خصم مكتسب", nameEn: "Purchase Discount Received", type: "expense", parentId: "00000000-0000-0000-0001-000000005101", level: 4, nature: "credit", balance: 0, currency: "EGP", isActive: true, isSystem: true },

  // Operating Expenses (52)
  { id: "00000000-0000-0000-0001-000000000052", organizationId: "00000000-0000-0000-0000-000000000001", code: "52", nameAr: "مصروفات تشغيلية وإدارية", nameEn: "Operating Expenses", type: "expense", parentId: "00000000-0000-0000-0001-000000000005", level: 2, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000000005201", organizationId: "00000000-0000-0000-0000-000000000001", code: "5201", nameAr: "مصروفات بيعية وتسويقية", nameEn: "Selling & Marketing Expenses", type: "expense", parentId: "00000000-0000-0000-0001-000000000052", level: 3, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000005201001", organizationId: "00000000-0000-0000-0000-000000000001", code: "5201001", nameAr: "عمولات بيع ونقل", nameEn: "Sales Commissions & Shipping", type: "expense", parentId: "00000000-0000-0000-0001-000000005201", level: 4, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000005201002", organizationId: "00000000-0000-0000-0000-000000000001", code: "5201002", nameAr: "دعاية وإعلان", nameEn: "Advertising & Marketing", type: "expense", parentId: "00000000-0000-0000-0001-000000005201", level: 4, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },

  // General & Admin Expenses (5202)
  { id: "00000000-0000-0000-0001-000000005202", organizationId: "00000000-0000-0000-0000-000000000001", code: "5202", nameAr: "مصروفات عمومية وإدارية", nameEn: "General & Admin Expenses", type: "expense", parentId: "00000000-0000-0000-0001-000000000052", level: 3, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000005202001", organizationId: "00000000-0000-0000-0000-000000000001", code: "5202001", nameAr: "رواتب وأجور إدارية", nameEn: "Salaries & Wages", type: "expense", parentId: "00000000-0000-0000-0001-000000005202", level: 4, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000005202002", organizationId: "00000000-0000-0000-0000-000000000001", code: "5202002", nameAr: "إيجار مقرات وفروع", nameEn: "Rent Expense", type: "expense", parentId: "00000000-0000-0000-0001-000000005202", level: 4, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000005202003", organizationId: "00000000-0000-0000-0000-000000000001", code: "5202003", nameAr: "كهرباء ومياه ومرافق", nameEn: "Utilities Expense", type: "expense", parentId: "00000000-0000-0000-0001-000000005202", level: 4, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000005202004", organizationId: "00000000-0000-0000-0000-000000000001", code: "5202004", nameAr: "صيانة ونظافة", nameEn: "Maintenance & Cleaning", type: "expense", parentId: "00000000-0000-0000-0001-000000005202", level: 4, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
  { id: "00000000-0000-0000-0001-000005202005", organizationId: "00000000-0000-0000-0000-000000000001", code: "5202005", nameAr: "إهلاك الأصول الثابتة", nameEn: "Depreciation Expense", type: "expense", parentId: "00000000-0000-0000-0001-000000005202", level: 4, nature: "debit", balance: 0, currency: "EGP", isActive: true, isSystem: true },
];

// 11. Treasury Accounts with 0.00 Balances (Linked to Report #6 GL Accounts)
export const initialTreasuryAccounts: TreasuryAccount[] = [
  {
    id: "00000000-0000-0000-0000-000000000301",
    organizationId: "00000000-0000-0000-0000-000000000001",
    branchId: "00000000-0000-0000-0000-000000000002",
    glAccountId: "00000000-0000-0000-0001-000001101001", // Main Cash 1101001
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
    glAccountId: "00000000-0000-0000-0001-000001101002", // Bank Cash 1101002
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
