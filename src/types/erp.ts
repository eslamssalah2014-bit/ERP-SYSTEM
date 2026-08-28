export type Language = 'ar' | 'en';
export type Direction = 'rtl' | 'ltr';
export type Currency = 'EGP' | 'SAR' | 'AED' | 'USD';
export type Theme = 'light' | 'dark';

export type UserRole =
  | 'super_admin'
  | 'tenant_admin'
  | 'accountant'
  | 'inventory_manager'
  | 'sales_rep'
  | 'cashier';

export interface Organization {
  id: string;
  nameAr: string;
  nameEn: string;
  taxNumber: string;
  commercialRegister?: string;
  country: 'EG' | 'SA' | 'AE';
  currency: Currency;
  defaultVatRate: number;
  address?: string;
  logoUrl?: string;
  planTier: 'starter' | 'professional' | 'enterprise';
}

export interface Branch {
  id: string;
  organizationId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  city: string;
  address?: string;
  phone?: string;
  isHeadquarters: boolean;
}

export interface User {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  role: UserRole;
  branchId?: string;
  avatarUrl?: string;
  isActive: boolean;
}

export interface Warehouse {
  id: string;
  organizationId: string;
  branchId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  location?: string;
  managerName?: string;
  managerPhone?: string;
  isDefault: boolean;
}

export interface ProductCategory {
  id: string;
  organizationId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  parentId?: string;
}

export interface ProductUnit {
  id: string;
  organizationId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  symbol: string;
}

export interface Product {
  id: string;
  organizationId: string;
  sku: string;
  barcode: string;
  nameAr: string;
  nameEn: string;
  description?: string;
  categoryId: string;
  unitId: string;
  brand?: string;
  costPrice: number;
  sellingPrice: number;
  taxRate: number;
  minStockLevel: number;
  maxStockLevel?: number;
  status: 'active' | 'inactive' | 'archived';
  warehouseStock: { [warehouseId: string]: number };
  imageUrl?: string;
}

export type StockMovementType =
  | 'opening_balance'
  | 'sales_issue'
  | 'purchase_receipt'
  | 'sales_return'
  | 'purchase_return'
  | 'transfer_in'
  | 'transfer_out'
  | 'adjustment';

export interface StockMovement {
  id: string;
  organizationId: string;
  productId: string;
  warehouseId: string;
  movementType: StockMovementType;
  referenceId?: string;
  referenceNumber: string;
  date: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  balanceQuantity: number;
  partnerId?: string;
  partnerName?: string;
  partnerType?: 'customer' | 'supplier' | 'opening' | 'warehouse' | 'adjustment';
  notes?: string;
}

export interface StockCardRecord {
  movementId?: string;
  date: string;
  movementType: StockMovementType;
  referenceNumber: string;
  warehouseId?: string;
  warehouseName?: string;
  partnerName?: string;
  partnerType?: string;
  inQuantity: number;
  outQuantity: number;
  unitCost: number;
  totalCost: number;
  balanceQuantity: number;
  balanceCost: number;
  runningBalance?: number;
  notes?: string;
}

export interface CustomerCategory {
  id: string;
  organizationId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  description?: string;
}

export interface Customer {
  id: string;
  organizationId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  mobile: string;
  email?: string;
  address?: string;
  city: string;
  taxNumber?: string;
  commercialRegister?: string;
  creditLimit: number;
  paymentTermsDays: number;
  openingBalance?: number;
  currentBalance: number;
  categoryId?: string;
  categoryName?: string;
  status: 'active' | 'blocked' | 'inactive';
}

export interface Supplier {
  id: string;
  organizationId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  mobile: string;
  email?: string;
  address?: string;
  taxNumber?: string;
  bankName?: string;
  bankIban?: string;
  openingBalance?: number;
  currentBalance: number;
  status: 'active' | 'blocked' | 'inactive';
}

export interface SalesInvoiceItem {
  id: string;
  productId: string;
  productName: string;
  warehouseId: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

export type InvoiceStatus = 'draft' | 'paid' | 'partially_paid' | 'unpaid' | 'cancelled' | 'returned';
export type InvoiceType = 'tax_invoice' | 'quotation';
export type DiscountType = 'percentage' | 'fixed';

export interface SalesInvoice {
  id: string;
  organizationId: string;
  branchId: string;
  invoiceType?: InvoiceType;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  customerId: string;
  customerName: string;
  customerTaxNumber?: string;
  salesRepId?: string;
  salesRepName?: string;
  warehouseId: string;
  status: InvoiceStatus;
  items: SalesInvoiceItem[];
  subtotal: number;
  discountType?: DiscountType;
  discountValue?: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  qrCodePayload?: string;
  notes?: string;
  createdBy: string;
  createdAt?: string;
}

export interface SalesReturnItem {
  id: string;
  productId: string;
  productName: string;
  warehouseId: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

export interface SalesReturn {
  id: string;
  organizationId: string;
  branchId: string;
  returnNumber: string;
  originalInvoiceId?: string;
  originalInvoiceNumber?: string;
  date: string;
  customerId: string;
  customerName: string;
  warehouseId: string;
  items: SalesReturnItem[];
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  refundMethod: 'customer_balance' | 'cash' | 'treasury';
  treasuryAccountId?: string;
  status: 'completed' | 'draft';
  notes?: string;
  createdBy: string;
  createdAt?: string;
}

export interface PurchaseInvoiceItem {
  id: string;
  productId: string;
  productName: string;
  warehouseId: string;
  quantity: number;
  unitCost: number;
  discountPercent?: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

export type PurchaseInvoiceType = 'purchase_invoice' | 'purchase_order';

export interface PurchaseInvoice {
  id: string;
  organizationId: string;
  branchId: string;
  invoiceType?: PurchaseInvoiceType;
  invoiceNumber: string;
  supplierInvoiceRef?: string;
  date: string;
  dueDate: string;
  supplierId: string;
  supplierName: string;
  supplierTaxNumber?: string;
  warehouseId: string;
  status: InvoiceStatus;
  items: PurchaseInvoiceItem[];
  subtotal: number;
  discountType?: DiscountType;
  discountValue?: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  notes?: string;
  createdBy: string;
  createdAt?: string;
}

export interface PurchaseReturnItem {
  id: string;
  productId: string;
  productName: string;
  warehouseId: string;
  quantity: number;
  unitCost: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

export interface PurchaseReturn {
  id: string;
  organizationId: string;
  branchId: string;
  returnNumber: string;
  originalInvoiceId?: string;
  originalInvoiceNumber?: string;
  date: string;
  supplierId: string;
  supplierName: string;
  warehouseId: string;
  items: PurchaseReturnItem[];
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  refundMethod: 'supplier_balance' | 'cash' | 'treasury';
  treasuryAccountId?: string;
  status: 'completed' | 'draft';
  notes?: string;
  createdBy: string;
  createdAt?: string;
}

export interface StatementTransaction {
  id: string;
  date: string;
  type: 'opening_balance' | 'invoice' | 'payment' | 'receipt' | 'return';
  referenceNumber: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface PartnerStatement {
  partnerId: string;
  partnerName: string;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  transactions: StatementTransaction[];
}

export type TreasuryType = 'cash_box' | 'bank_account';

export interface TreasuryAccount {
  id: string;
  organizationId: string;
  branchId: string;
  glAccountId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  type: TreasuryType;
  currency: Currency;
  balance: number;
  bankName?: string;
  accountNumber?: string;
  isDefault: boolean;
}

export interface CashReceipt {
  id: string;
  organizationId: string;
  branchId: string;
  receiptNumber: string;
  date: string;
  treasuryAccountId: string;
  amount: number;
  currency: Currency;
  receivedFrom: string;
  customerId?: string;
  creditAccountId: string;
  costCenterId?: string;
  notes?: string;
  createdBy: string;
  createdAt?: string;
}

export interface CashPayment {
  id: string;
  organizationId: string;
  branchId: string;
  paymentNumber: string;
  date: string;
  treasuryAccountId: string;
  amount: number;
  currency: Currency;
  paidTo: string;
  supplierId?: string;
  debitAccountId: string;
  costCenterId?: string;
  notes?: string;
  createdBy: string;
  createdAt?: string;
}

export type CheckStatus = 'pending' | 'collected' | 'cleared' | 'bounced' | 'cancelled';

export interface CheckRecord {
  id: string;
  organizationId: string;
  branchId: string;
  checkNumber: string;
  bankName: string;
  type: 'incoming' | 'outgoing';
  partyName: string;
  customerId?: string;
  supplierId?: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  collectionDate?: string;
  status: CheckStatus;
  targetTreasuryId?: string;
  notes?: string;
}

export type AccountType = 'assets' | 'liabilities' | 'equity' | 'revenue' | 'expense';

export interface Account {
  id: string;
  organizationId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  type: AccountType;
  parentId?: string;
  level: number;
  nature: 'debit' | 'credit';
  balance: number;
  currency: Currency;
  isActive: boolean;
  isSystem: boolean;
}

export interface CostCenter {
  id: string;
  organizationId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  parentId?: string;
  level: number;
  isActive: boolean;
}

export interface JournalLine {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  costCenterId?: string;
  description?: string;
  notes?: string;
}

export interface JournalEntry {
  id: string;
  organizationId: string;
  branchId: string;
  entryNumber: string;
  date: string;
  referenceType: string;
  referenceId?: string;
  description: string;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  status: 'draft' | 'posted';
  createdBy: string;
}

export interface TrialBalanceRow {
  accountCode: string;
  accountNameAr: string;
  accountNameEn: string;
  accountType: AccountType;
  level: number;
  isParent?: boolean;
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  endingDebit: number;
  endingCredit: number;
}

export interface AgingBucket {
  entityId: string;
  entityName: string;
  partyId?: string;
  partyName?: string;
  current: number;
  days30: number;
  days60: number;
  days90: number;
  days90Plus: number;
  total: number;
  totalDue?: number;
  bucket0to30?: number;
  bucket31to60?: number;
  bucket61to90?: number;
  bucket90Plus?: number;
}

export interface AuditLog {
  id: string;
  organizationId: string;
  userId?: string;
  userName: string;
  action: 'create' | 'update' | 'delete' | 'login' | 'status_change' | 'export' | 'seed_reset';
  entityType: string;
  entityId: string;
  details: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  organizationId: string;
  titleAr: string;
  titleEn: string;
  messageAr: string;
  messageEn: string;
  type: 'info' | 'warning' | 'success' | 'danger';
  read: boolean;
  createdAt: string;
}

export type ProductChangeType =
  | 'name'
  | 'price'
  | 'category'
  | 'opening_balance'
  | 'stock_adjustment'
  | 'image'
  | 'unit'
  | 'status'
  | 'created'
  | 'deleted';

export interface ProductChangeLog {
  id: string;
  organizationId: string;
  productId: string;
  productName: string;
  productSku: string;
  userId?: string;
  userName: string;
  changeType: ProductChangeType;
  fieldName: string;
  oldValue: string;
  newValue: string;
  createdAt: string;
}

export interface PeriodClosing {
  id: string;
  organizationId: string;
  branchId?: string;
  periodType: 'monthly' | 'quarterly' | 'yearly';
  periodLabel: string;
  closingDate: string;
  openingInventoryValue: number;
  purchasesValue: number;
  closingInventoryValue: number;
  cogsValue: number;
  journalEntryId?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface StockBalanceReportRow {
  productId: string;
  sku: string;
  barcode: string;
  nameAr: string;
  nameEn: string;
  categoryId: string;
  categoryNameAr: string;
  categoryNameEn: string;
  unitSymbol: string;
  imageUrl?: string;
  costPrice: number;
  sellingPrice: number;
  openingQuantity: number;
  openingValue: number;
  inQuantity: number;
  inValue: number;
  outQuantity: number;
  outValue: number;
  closingQuantity: number;
  closingValue: number;
}

