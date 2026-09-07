import {
  Account, AccountType, JournalEntry, JournalLine, SalesInvoice,
  PurchaseInvoice, SalesReturn, PurchaseReturn, CashReceipt, CashPayment, StockMovement,
  StockCardRecord, TrialBalanceRow, AgingBucket, Customer, Supplier,
  Product, ProductCategory, ProductUnit, Warehouse, StockBalanceReportRow,
  CheckRecord, TreasuryAccount, TreasuryStatementRow
} from "@/types/erp";

// Helper: Resolve account by primary codes with backward compatibility
function findAccount(accounts: Account[], candidateCodes: string[], fallbackType?: string): Account {
  for (const c of candidateCodes) {
    const found = accounts.find(a => a.code === c);
    if (found) return found;
  }
  if (fallbackType) {
    const byType = accounts.find(a => a.type === fallbackType && a.level >= 3);
    if (byType) return byType;
    const byTypeAny = accounts.find(a => a.type === fallbackType);
    if (byTypeAny) return byTypeAny;
  }
  return accounts[0] || {
    id: "00000000-0000-0000-0001-000001101001",
    organizationId: "00000000-0000-0000-0000-000000000001",
    code: "1101001",
    nameAr: "صندوق رئيسي",
    nameEn: "Main Cash",
    type: "assets",
    level: 4,
    nature: "debit",
    balance: 0,
    currency: "EGP",
    isActive: true,
    isSystem: true
  };
}

export function generateSalesInvoiceJournal(
  invoice: SalesInvoice,
  accounts: Account[],
  cogsAmount: number = 0
): Omit<JournalEntry, "id"> {
  const arAccount = findAccount(accounts, ["1102001", "1102", "1120"], "assets");
  const salesAccount = findAccount(accounts, ["4101001", "4101", "4100"], "revenue");
  const vatOutAccount = findAccount(accounts, ["2102002", "2102", "2130", "2100"], "liabilities");
  const cogsAccount = findAccount(accounts, ["5101001", "5101", "5100"], "expense");
  const invAccount = findAccount(accounts, ["1103001", "1103", "1130"], "assets");

  // Net Amount = Amount Before Discount - Discount
  // Tax Base = Net Amount
  // Final Total = Net Amount + Tax
  const discount = Number(invoice.discountTotal) || 0;
  const netSalesAmount = Math.max(0, invoice.subtotal - discount);

  const lines: JournalLine[] = [
    {
      id: "jl_ar",
      accountId: arAccount.id,
      accountCode: arAccount.code,
      accountName: arAccount.nameAr,
      debit: invoice.grandTotal,
      credit: 0,
      description: `استحقاق فاتورة مبيعات ${invoice.invoiceNumber} - ${invoice.customerName}`,
    },
    {
      id: "jl_rev",
      accountId: salesAccount.id,
      accountCode: salesAccount.code,
      accountName: salesAccount.nameAr,
      debit: 0,
      credit: netSalesAmount,
      description: `إيراد مبيعات بضاعة صافي فاتورة ${invoice.invoiceNumber}`,
    },
    {
      id: "jl_vat",
      accountId: vatOutAccount.id,
      accountCode: vatOutAccount.code,
      accountName: vatOutAccount.nameAr,
      debit: 0,
      credit: invoice.taxTotal,
      description: `ضريبة القيمة المضافة المستحقة (مخرجات) فاتورة ${invoice.invoiceNumber}`,
    },
  ];

  if (cogsAmount > 0) {
    lines.push(
      {
        id: "jl_cogs",
        accountId: cogsAccount.id,
        accountCode: cogsAccount.code,
        accountName: cogsAccount.nameAr,
        debit: cogsAmount,
        credit: 0,
        description: `إثبات تكلفة البضاعة المباعة (COGS) فاتورة ${invoice.invoiceNumber}`,
      },
      {
        id: "jl_inv",
        accountId: invAccount.id,
        accountCode: invAccount.code,
        accountName: invAccount.nameAr,
        debit: 0,
        credit: cogsAmount,
        description: `صرف بضاعة من المخزن فاتورة ${invoice.invoiceNumber}`,
      }
    );
  }

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

  return {
    organizationId: invoice.organizationId,
    branchId: invoice.branchId,
    entryNumber: "JV-SALES-" + invoice.invoiceNumber,
    date: invoice.date,
    referenceType: "sales_invoice",
    referenceId: invoice.id,
    description: `إثبات مبيعات ومخزون فاتورة ${invoice.invoiceNumber} للعميل ${invoice.customerName}`,
    lines,
    totalDebit,
    totalCredit,
    isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
    status: "posted",
    createdBy: invoice.createdBy || "النظام",
  };
}

export function generatePurchaseInvoiceJournal(
  invoice: PurchaseInvoice,
  accounts: Account[]
): Omit<JournalEntry, "id"> {
  const invAccount = findAccount(accounts, ["1103001", "1103", "1130"], "assets");
  const vatInAccount = findAccount(accounts, ["1105002", "1105", "1140"], "assets");
  const apAccount = findAccount(accounts, ["2101001", "2101", "2110"], "liabilities");

  // Net Stock Cost = Amount Before Discount - Discount
  // Tax Base = Net Stock Cost
  // Final Total = Net Stock Cost + Tax
  const discount = Number(invoice.discountTotal) || 0;
  const netStockCost = Math.max(0, invoice.subtotal - discount);

  const lines: JournalLine[] = [
    {
      id: "jl_pinv_stock",
      accountId: invAccount.id,
      accountCode: invAccount.code,
      accountName: invAccount.nameAr,
      debit: netStockCost,
      credit: 0,
      description: `إضافة بضاعة للمخزن بالصافي فاتورة مشتريات ${invoice.invoiceNumber}`,
    },
    {
      id: "jl_pinv_vat",
      accountId: vatInAccount.id,
      accountCode: vatInAccount.code,
      accountName: vatInAccount.nameAr,
      debit: invoice.taxTotal,
      credit: 0,
      description: `ضريبة مدخلات قابلة للخصم فاتورة ${invoice.invoiceNumber}`,
    },
    {
      id: "jl_pinv_ap",
      accountId: apAccount.id,
      accountCode: apAccount.code,
      accountName: apAccount.nameAr,
      debit: 0,
      credit: invoice.grandTotal,
      description: `استحقاق مورد فاتورة مشتريات ${invoice.invoiceNumber} - ${invoice.supplierName}`,
    },
  ];

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

  return {
    organizationId: invoice.organizationId,
    branchId: invoice.branchId,
    entryNumber: "JV-PURCHASE-" + invoice.invoiceNumber,
    date: invoice.date,
    referenceType: "purchase_invoice",
    referenceId: invoice.id,
    description: `إثبات توريد ومخزون فاتورة مشتريات ${invoice.invoiceNumber}`,
    lines,
    totalDebit,
    totalCredit,
    isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
    status: "posted",
    createdBy: invoice.createdBy || "النظام",
  };
}

export function generateSalesReturnJournal(
  salesReturn: SalesReturn,
  accounts: Account[],
  cogsAmount: number = 0
): Omit<JournalEntry, "id"> {
  const salesAccount = findAccount(accounts, ["4102001", "4102", "4100"], "revenue");
  const vatOutAccount = findAccount(accounts, ["2102002", "2102", "2130", "2100"], "liabilities");
  const arAccount = findAccount(accounts, ["1102001", "1102", "1120"], "assets");
  const treasuryAccount = findAccount(accounts, ["1101001", "1101002", "1101", "1110", "1115"], "assets");
  const cogsAccount = findAccount(accounts, ["5101001", "5101", "5100"], "expense");
  const invAccount = findAccount(accounts, ["1103001", "1103", "1130"], "assets");

  const creditAcc = salesReturn.refundMethod === "treasury" || salesReturn.refundMethod === "cash"
    ? treasuryAccount
    : arAccount;

  const lines: JournalLine[] = [
    {
      id: "jl_sret_rev",
      accountId: salesAccount.id,
      accountCode: salesAccount.code,
      accountName: salesAccount.nameAr,
      debit: salesReturn.subtotal,
      credit: 0,
      description: `مردودات مبيعات إشعار دائن ${salesReturn.returnNumber}`,
    },
    {
      id: "jl_sret_vat",
      accountId: vatOutAccount.id,
      accountCode: vatOutAccount.code,
      accountName: vatOutAccount.nameAr,
      debit: salesReturn.taxTotal,
      credit: 0,
      description: `تخفيض ضريبة القيمة المضافة لمرتجع مبيعات ${salesReturn.returnNumber}`,
    },
    {
      id: "jl_sret_cr",
      accountId: creditAcc.id,
      accountCode: creditAcc.code,
      accountName: creditAcc.nameAr,
      debit: 0,
      credit: salesReturn.grandTotal,
      description: `تسوية مستحقات مرتجع مبيعات ${salesReturn.returnNumber} - ${salesReturn.customerName}`,
    },
  ];

  if (cogsAmount > 0) {
    lines.push(
      {
        id: "jl_sret_inv",
        accountId: invAccount.id,
        accountCode: invAccount.code,
        accountName: invAccount.nameAr,
        debit: cogsAmount,
        credit: 0,
        description: `إعادة إدخال بضاعة مرتجعة للمخزن ${salesReturn.returnNumber}`,
      },
      {
        id: "jl_sret_cogs",
        accountId: cogsAccount.id,
        accountCode: cogsAccount.code,
        accountName: cogsAccount.nameAr,
        debit: 0,
        credit: cogsAmount,
        description: `تخفيض تكلفة البضاعة المباعة لمرتجع ${salesReturn.returnNumber}`,
      }
    );
  }

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

  return {
    organizationId: salesReturn.organizationId,
    branchId: salesReturn.branchId,
    entryNumber: "JV-SRET-" + salesReturn.returnNumber,
    date: salesReturn.date,
    referenceType: "sales_return",
    referenceId: salesReturn.id,
    description: `إثبات قيد مرتجع مبيعات إشعار دائن ${salesReturn.returnNumber}`,
    lines,
    totalDebit,
    totalCredit,
    isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
    status: "posted",
    createdBy: salesReturn.createdBy || "النظام",
  };
}

export function generatePurchaseReturnJournal(
  purchaseReturn: PurchaseReturn,
  accounts: Account[]
): Omit<JournalEntry, "id"> {
  const apAccount = findAccount(accounts, ["2101001", "2101", "2110"], "liabilities");
  const treasuryAccount = findAccount(accounts, ["1101001", "1101002", "1101", "1110", "1115"], "assets");
  const invAccount = findAccount(accounts, ["1103001", "1103", "1130"], "assets");
  const vatInAccount = findAccount(accounts, ["1105002", "1105", "1140"], "assets");

  const debitAcc = purchaseReturn.refundMethod === "treasury" || purchaseReturn.refundMethod === "cash"
    ? treasuryAccount
    : apAccount;

  const lines: JournalLine[] = [
    {
      id: "jl_pret_dr",
      accountId: debitAcc.id,
      accountCode: debitAcc.code,
      accountName: debitAcc.nameAr,
      debit: purchaseReturn.grandTotal,
      credit: 0,
      description: `تسوية مستحقات مرتجع مشتريات إشعار مدين ${purchaseReturn.returnNumber} - ${purchaseReturn.supplierName}`,
    },
    {
      id: "jl_pret_inv",
      accountId: invAccount.id,
      accountCode: invAccount.code,
      accountName: invAccount.nameAr,
      debit: 0,
      credit: purchaseReturn.subtotal,
      description: `إخراج بضاعة مرتجعة من المخزن ${purchaseReturn.returnNumber}`,
    },
    {
      id: "jl_pret_vat",
      accountId: vatInAccount.id,
      accountCode: vatInAccount.code,
      accountName: vatInAccount.nameAr,
      debit: 0,
      credit: purchaseReturn.taxTotal,
      description: `تخفيض ضريبة المدخلات لمرتجع مشتريات ${purchaseReturn.returnNumber}`,
    },
  ];

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

  return {
    organizationId: purchaseReturn.organizationId,
    branchId: purchaseReturn.branchId,
    entryNumber: "JV-PRET-" + purchaseReturn.returnNumber,
    date: purchaseReturn.date,
    referenceType: "purchase_return",
    referenceId: purchaseReturn.id,
    description: `إثبات قيد مرتجع مشتريات إشعار مدين ${purchaseReturn.returnNumber}`,
    lines,
    totalDebit,
    totalCredit,
    isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
    status: "posted",
    createdBy: purchaseReturn.createdBy || "النظام",
  };
}

export function generateOpeningStockJournal(
  organizationId: string,
  branchId: string,
  product: Product,
  totalOpeningQty: number,
  costPrice: number,
  accounts: Account[],
  createdBy: string
): Omit<JournalEntry, "id"> | null {
  const totalValue = totalOpeningQty * costPrice;
  if (totalValue <= 0) return null;

  const invAccount = findAccount(accounts, ["1103001", "1103", "1130"], "assets");
  const equityAccount = findAccount(accounts, ["3101", "3100", "3000"], "equity");

  const lines: JournalLine[] = [
    {
      id: "jl_ob_inv",
      accountId: invAccount.id,
      accountCode: invAccount.code,
      accountName: invAccount.nameAr,
      debit: totalValue,
      credit: 0,
      description: `إثبات أصل مخزون أول المدة - الصنف: ${product.nameAr} (${product.sku}) - كمية ${totalOpeningQty}`,
    },
    {
      id: "jl_ob_eq",
      accountId: equityAccount.id,
      accountCode: equityAccount.code,
      accountName: equityAccount.nameAr,
      debit: 0,
      credit: totalValue,
      description: `رأس المال / الأرصدة الافتتاحية مقابل مخزون أول المدة (${product.sku})`,
    },
  ];

  return {
    organizationId,
    branchId,
    entryNumber: `JV-OB-${product.sku}-${Date.now().toString().slice(-4)}`,
    date: new Date().toISOString().split("T")[0],
    referenceType: "opening_balance",
    referenceId: product.id,
    description: `قيد إثبات رصيد مخزون أول المدة للصنف ${product.nameAr} (${product.sku})`,
    lines,
    totalDebit: totalValue,
    totalCredit: totalValue,
    isBalanced: true,
    status: "posted",
    createdBy: createdBy || "النظام",
  };
}

export function generateStockAdjustmentJournal(
  organizationId: string,
  branchId: string,
  product: Product,
  quantityDiff: number,
  unitCost: number,
  accounts: Account[],
  createdBy: string,
  notes?: string
): Omit<JournalEntry, "id"> {
  const invAccount = findAccount(accounts, ["1103001", "1103", "1130"], "assets");
  const cogsAccount = findAccount(accounts, ["5101001", "5101", "5100"], "expense");
  const totalAmount = Math.abs(quantityDiff) * unitCost;

  const isAddition = quantityDiff > 0;

  const lines: JournalLine[] = [
    {
      id: "jl_adj_1",
      accountId: isAddition ? invAccount.id : cogsAccount.id,
      accountCode: isAddition ? invAccount.code : cogsAccount.code,
      accountName: isAddition ? invAccount.nameAr : cogsAccount.nameAr,
      debit: totalAmount,
      credit: 0,
      description: isAddition
        ? `تسوية زيادة مخزنية - الصنف ${product.nameAr} (${product.sku})`
        : `تسوية عجز/صرف مخزني - الصنف ${product.nameAr} (${product.sku})`,
    },
    {
      id: "jl_adj_2",
      accountId: isAddition ? cogsAccount.id : invAccount.id,
      accountCode: isAddition ? cogsAccount.code : invAccount.code,
      accountName: isAddition ? cogsAccount.nameAr : invAccount.nameAr,
      debit: 0,
      credit: totalAmount,
      description: isAddition
        ? `تخفيض تكلفة بضاعة / تسوية مخزون (${product.sku})`
        : `تخفيض أصل المخزون بالتسوية (${product.sku})`,
    },
  ];

  return {
    organizationId,
    branchId,
    entryNumber: `JV-ADJ-${product.sku}-${Date.now().toString().slice(-4)}`,
    date: new Date().toISOString().split("T")[0],
    referenceType: "adjustment",
    referenceId: product.id,
    description: `تسوية جردية وتعديل رصيد الصنف ${product.nameAr}: ${notes || ""}`,
    lines,
    totalDebit: totalAmount,
    totalCredit: totalAmount,
    isBalanced: true,
    status: "posted",
    createdBy: createdBy || "النظام",
  };
}

export function generatePeriodClosingJournal(
  organizationId: string,
  branchId: string,
  periodLabel: string,
  closingDate: string,
  cogsAdjustmentAmount: number,
  accounts: Account[],
  createdBy: string
): Omit<JournalEntry, "id"> {
  const invAccount = findAccount(accounts, ["1103001", "1103", "1130"], "assets");
  const cogsAccount = findAccount(accounts, ["5101001", "5101", "5100"], "expense");
  const amount = Math.abs(cogsAdjustmentAmount);

  const lines: JournalLine[] = [
    {
      id: "jl_close_cogs",
      accountId: cogsAccount.id,
      accountCode: cogsAccount.code,
      accountName: cogsAccount.nameAr,
      debit: amount,
      credit: 0,
      description: `إثبات تكلفة البضاعة المباعة لإقفال فترة ${periodLabel}`,
    },
    {
      id: "jl_close_inv",
      accountId: invAccount.id,
      accountCode: invAccount.code,
      accountName: invAccount.nameAr,
      debit: 0,
      credit: amount,
      description: `تسوية رصيد مخزون آخر المدة لإقفال فترة ${periodLabel}`,
    },
  ];

  return {
    organizationId,
    branchId,
    entryNumber: `JV-CLOSE-${periodLabel.replace(/\s+/g, "_")}`,
    date: closingDate,
    referenceType: "period_closing",
    description: `قيد إقفال المخزون وتكلفة المبيعات للفترة ${periodLabel}`,
    lines,
    totalDebit: amount,
    totalCredit: amount,
    isBalanced: true,
    status: "posted",
    createdBy: createdBy || "النظام",
  };
}

export function generateReceiptJournal(
  receipt: CashReceipt,
  treasuryGlAccountId: string,
  accounts: Account[]
): Omit<JournalEntry, "id"> {
  const treasuryAccount = accounts.find(a => a.id === treasuryGlAccountId) || accounts[0];
  const creditAccount = accounts.find(a => a.id === receipt.creditAccountId) || accounts[0];

  const lines: JournalLine[] = [
    {
      id: "jl_rcp_dr",
      accountId: treasuryAccount.id,
      accountCode: treasuryAccount.code,
      accountName: treasuryAccount.nameAr,
      debit: receipt.amount,
      credit: 0,
      costCenterId: receipt.costCenterId,
      description: `سند قبض ${receipt.receiptNumber} - مقبوضات من ${receipt.receivedFrom}`,
    },
    {
      id: "jl_rcp_cr",
      accountId: creditAccount.id,
      accountCode: creditAccount.code,
      accountName: creditAccount.nameAr,
      debit: 0,
      credit: receipt.amount,
      costCenterId: receipt.costCenterId,
      description: `سداد وسند قبض ${receipt.receiptNumber} - ${receipt.receivedFrom}`,
    },
  ];

  return {
    organizationId: receipt.organizationId,
    branchId: receipt.branchId,
    entryNumber: "JV-RCP-" + receipt.receiptNumber,
    date: receipt.date,
    referenceType: "cash_receipt",
    referenceId: receipt.id,
    description: `قيد سند قبض ${receipt.receiptNumber} من ${receipt.receivedFrom}`,
    lines,
    totalDebit: receipt.amount,
    totalCredit: receipt.amount,
    isBalanced: true,
    status: "posted",
    createdBy: receipt.createdBy,
  };
}

export function generatePaymentJournal(
  payment: CashPayment,
  treasuryGlAccountId: string,
  accounts: Account[]
): Omit<JournalEntry, "id"> {
  const debitAccount = accounts.find(a => a.id === payment.debitAccountId) || accounts[0];
  const treasuryAccount = accounts.find(a => a.id === treasuryGlAccountId) || accounts[0];

  const lines: JournalLine[] = [
    {
      id: "jl_pay_dr",
      accountId: debitAccount.id,
      accountCode: debitAccount.code,
      accountName: debitAccount.nameAr,
      debit: payment.amount,
      credit: 0,
      costCenterId: payment.costCenterId,
      description: `سند صرف ${payment.paymentNumber} لصالح ${payment.paidTo}`,
    },
    {
      id: "jl_pay_cr",
      accountId: treasuryAccount.id,
      accountCode: treasuryAccount.code,
      accountName: treasuryAccount.nameAr,
      debit: 0,
      credit: payment.amount,
      costCenterId: payment.costCenterId,
      description: `صرف نقدي سند رقم ${payment.paymentNumber}`,
    },
  ];

  return {
    organizationId: payment.organizationId,
    branchId: payment.branchId,
    entryNumber: "JV-PAY-" + payment.paymentNumber,
    date: payment.date,
    referenceType: "cash_payment",
    referenceId: payment.id,
    description: `قيد سند صرف ${payment.paymentNumber} إلى ${payment.paidTo}`,
    lines,
    totalDebit: payment.amount,
    totalCredit: payment.amount,
    isBalanced: true,
    status: "posted",
    createdBy: payment.createdBy,
  };
}

export function generateReceivableCheckJournal(
  check: CheckRecord,
  accounts: Account[]
): Omit<JournalEntry, "id"> {
  const notesRecAccount = check.accountId 
    ? (accounts.find(a => a.id === check.accountId) || findAccount(accounts, ["1102002", "1102", "1120"], "assets"))
    : findAccount(accounts, ["1102002", "1102", "1120"], "assets");
  const arAccount = findAccount(accounts, ["1102001", "1102", "1120"], "assets");
  const amount = Number(check.amount) || 0;

  const lines: JournalLine[] = [
    {
      id: "jl_chk_dr",
      accountId: notesRecAccount.id,
      accountCode: notesRecAccount.code,
      accountName: notesRecAccount.nameAr,
      debit: amount,
      credit: 0,
      costCenterId: check.costCenterId,
      description: `استلام ورقة قبض شيك رقم ${check.checkNumber} - ${check.bankName || check.draweeBank || "مسحوب"}`,
    },
    {
      id: "jl_chk_cr",
      accountId: arAccount.id,
      accountCode: arAccount.code,
      accountName: arAccount.nameAr,
      debit: 0,
      credit: amount,
      costCenterId: check.costCenterId,
      description: `سداد عميل بورقة قبض ${check.checkNumber} - ${check.partyName}`,
    },
  ];

  return {
    organizationId: check.organizationId,
    branchId: check.branchId,
    entryNumber: "JV-CHK-IN-" + check.checkNumber,
    date: check.issueDate || new Date().toISOString().split("T")[0],
    referenceType: "receivable_check",
    referenceId: check.id,
    description: `إثبات استلام ورقة قبض شيك ${check.checkNumber} من ${check.partyName}`,
    lines,
    totalDebit: amount,
    totalCredit: amount,
    isBalanced: true,
    status: "posted",
    createdBy: check.createdBy || "النظام",
  };
}

export function generateCheckStatusJournal(
  check: CheckRecord,
  newStatus: string,
  targetTreasuryOrBankId: string | undefined,
  accounts: Account[],
  treasuries: TreasuryAccount[] = []
): Omit<JournalEntry, "id"> | null {
  const amount = Number(check.amount) || 0;
  if (amount <= 0) return null;

  const notesRecAcc = findAccount(accounts, ["1102002", "1102"], "assets");
  const underCollAcc = findAccount(accounts, ["1102003", "1102"], "assets");
  const bankCashAcc = targetTreasuryOrBankId
    ? (accounts.find(a => a.id === treasuries.find(t => t.id === targetTreasuryOrBankId)?.glAccountId) || findAccount(accounts, ["1101002", "1101"], "assets"))
    : findAccount(accounts, ["1101002", "1101"], "assets");
  const arAccount = findAccount(accounts, ["1102001", "1102"], "assets");

  const today = new Date().toISOString().split("T")[0];

  if (newStatus === "under_collection") {
    const lines: JournalLine[] = [
      {
        id: "jl_stat_dr",
        accountId: underCollAcc.id,
        accountCode: underCollAcc.code,
        accountName: underCollAcc.nameAr,
        debit: amount,
        credit: 0,
        costCenterId: check.costCenterId,
        description: `إرسال شيك رقم ${check.checkNumber} للتحصيل بالبنك (برسم التحصيل)`,
      },
      {
        id: "jl_stat_cr",
        accountId: notesRecAcc.id,
        accountCode: notesRecAcc.code,
        accountName: notesRecAcc.nameAr,
        debit: 0,
        credit: amount,
        costCenterId: check.costCenterId,
        description: `إخراج ورقة قبض ${check.checkNumber} من الخزينة للتحصيل`,
      },
    ];

    return {
      organizationId: check.organizationId,
      branchId: check.branchId,
      entryNumber: "JV-CHK-COLL-" + check.checkNumber,
      date: today,
      referenceType: "check_under_collection",
      referenceId: check.id,
      description: `إثبات إرسال شيك ${check.checkNumber} برسم التحصيل`,
      lines,
      totalDebit: amount,
      totalCredit: amount,
      isBalanced: true,
      status: "posted",
      createdBy: "النظام",
    };
  }

  if (newStatus === "collected") {
    const lines: JournalLine[] = [
      {
        id: "jl_stat_dr",
        accountId: bankCashAcc.id,
        accountCode: bankCashAcc.code,
        accountName: bankCashAcc.nameAr,
        debit: amount,
        credit: 0,
        costCenterId: check.costCenterId,
        description: `إيداع قيمة شيك محصل رقم ${check.checkNumber} في الحساب البنكي`,
      },
      {
        id: "jl_stat_cr",
        accountId: underCollAcc.id,
        accountCode: underCollAcc.code,
        accountName: underCollAcc.nameAr,
        debit: 0,
        credit: amount,
        costCenterId: check.costCenterId,
        description: `إقفال شيك برسم التحصيل رقم ${check.checkNumber} بعد نجاح التحصيل`,
      },
    ];

    return {
      organizationId: check.organizationId,
      branchId: check.branchId,
      entryNumber: "JV-CHK-PAID-" + check.checkNumber,
      date: today,
      referenceType: "check_collected",
      referenceId: check.id,
      description: `إثبات تحصيل وإيداع الشيك رقم ${check.checkNumber} بالبنك`,
      lines,
      totalDebit: amount,
      totalCredit: amount,
      isBalanced: true,
      status: "posted",
      createdBy: "النظام",
    };
  }

  if (newStatus === "bounced" || newStatus === "returned") {
    const lines: JournalLine[] = [
      {
        id: "jl_stat_dr",
        accountId: arAccount.id,
        accountCode: arAccount.code,
        accountName: arAccount.nameAr,
        debit: amount,
        credit: 0,
        costCenterId: check.costCenterId,
        description: `إعادة إثبات مديونية العميل لارتداد الشيك رقم ${check.checkNumber}`,
      },
      {
        id: "jl_stat_cr",
        accountId: underCollAcc.id,
        accountCode: underCollAcc.code,
        accountName: underCollAcc.nameAr,
        debit: 0,
        credit: amount,
        costCenterId: check.costCenterId,
        description: `إلغاء شيك برسم التحصيل لارتداده رقم ${check.checkNumber}`,
      },
    ];

    return {
      organizationId: check.organizationId,
      branchId: check.branchId,
      entryNumber: "JV-CHK-RET-" + check.checkNumber,
      date: today,
      referenceType: "check_bounced",
      referenceId: check.id,
      description: `إثبات ارتداد ورفض الشيك رقم ${check.checkNumber} وإعادة قيده على العميل`,
      lines,
      totalDebit: amount,
      totalCredit: amount,
      isBalanced: true,
      status: "posted",
      createdBy: "النظام",
    };
  }

  return null;
}

export function generatePayableCheckJournal(
  check: CheckRecord,
  accounts: Account[]
): Omit<JournalEntry, "id"> {
  const amount = Number(check.amount) || 0;
  const apAccount = findAccount(accounts, ["2101001", "2101", "2110"], "liabilities");
  const notesPayableAccount = check.accountId
    ? (accounts.find(a => a.id === check.accountId) || findAccount(accounts, ["2101002", "2101"], "liabilities"))
    : findAccount(accounts, ["2101002", "2101"], "liabilities");

  const lines: JournalLine[] = [
    {
      id: "jl_pchk_dr",
      accountId: apAccount.id,
      accountCode: apAccount.code,
      accountName: apAccount.nameAr,
      debit: amount,
      credit: 0,
      costCenterId: check.costCenterId,
      description: `سداد مستحقات مورد بشيك ورقة دفع ${check.checkNumber} - ${check.partyName}`,
    },
    {
      id: "jl_pchk_cr",
      accountId: notesPayableAccount.id,
      accountCode: notesPayableAccount.code,
      accountName: notesPayableAccount.nameAr,
      debit: 0,
      credit: amount,
      costCenterId: check.costCenterId,
      description: `إثبات ورقة دفع شيك آجل رقم ${check.checkNumber} مسحوب على ${check.bankName}`,
    },
  ];

  return {
    organizationId: check.organizationId,
    branchId: check.branchId,
    entryNumber: "JV-PCHK-" + check.checkNumber,
    date: check.issueDate || new Date().toISOString().split("T")[0],
    referenceType: "payable_check",
    referenceId: check.id,
    description: `إثبات إصدار ورقة دفع شيك ${check.checkNumber} للمورد ${check.partyName}`,
    lines,
    totalDebit: amount,
    totalCredit: amount,
    isBalanced: true,
    status: "posted",
    createdBy: check.createdBy || "النظام",
  };
}

export function computeTreasuryStatement(
  treasuryAccountId: string,
  fromDate: string | undefined,
  toDate: string | undefined,
  treasuryAccounts: TreasuryAccount[] = [],
  cashReceipts: CashReceipt[] = [],
  cashPayments: CashPayment[] = [],
  salesInvoices: SalesInvoice[] = [],
  purchaseInvoices: PurchaseInvoice[] = [],
  checks: CheckRecord[] = [],
  journalEntries: JournalEntry[] = [],
  accounts: Account[] = []
): {
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  rows: TreasuryStatementRow[];
} {
  const isAll = !treasuryAccountId || treasuryAccountId === "all";
  const targetTreasury = treasuryAccounts.find(t => t.id === treasuryAccountId);
  const targetGlAccountId = targetTreasury?.glAccountId;

  // 1. Calculate opening balance from official Opening Entry for Main Cash / Treasury
  let openingBal = 0;
  const openingEntry = journalEntries.find(e =>
    e.referenceType === "opening_entry" ||
    e.entryNumber?.startsWith("OPENING-") ||
    e.entryNumber?.startsWith("JV-OPENING-")
  );

  if (openingEntry) {
    openingEntry.lines.forEach(line => {
      const match = isAll
        ? (line.accountCode === "1101001" || line.accountCode === "1101002" || line.accountCode?.startsWith("1101"))
        : (line.accountId === targetGlAccountId || (targetTreasury?.code === "SAFE-MAIN" && line.accountCode === "1101001") || (targetTreasury?.code === "BANK-MAIN" && line.accountCode === "1101002"));
      if (match) {
        openingBal += (Number(line.debit) || 0) - (Number(line.credit) || 0);
      }
    });
  }

  const allTx: TreasuryStatementRow[] = [];

  // 2. Cash Receipts (Debit / Inflow)
  cashReceipts.forEach(rcp => {
    if (!isAll && rcp.treasuryAccountId !== treasuryAccountId) return;
    const creditAcc = accounts.find(a => a.id === rcp.creditAccountId);
    const debit = Number(rcp.amount) || 0;
    allTx.push({
      id: rcp.id,
      date: rcp.date,
      referenceNumber: rcp.receiptNumber,
      accountName: creditAcc?.nameAr || rcp.receivedFrom || "سند قبض",
      description: `سند قبض نقدي (${rcp.receivedFrom}) ${rcp.notes ? "- " + rcp.notes : ""}`,
      debit,
      credit: 0,
      inflow: debit,
      outflow: 0,
      runningBalance: 0,
      balance: 0,
      type: "receipt",
    });
  });

  // 3. Cash Payments (Credit / Outflow)
  cashPayments.forEach(pay => {
    if (!isAll && pay.treasuryAccountId !== treasuryAccountId) return;
    const debitAcc = accounts.find(a => a.id === pay.debitAccountId);
    const credit = Number(pay.amount) || 0;
    allTx.push({
      id: pay.id,
      date: pay.date,
      referenceNumber: pay.paymentNumber,
      accountName: debitAcc?.nameAr || pay.paidTo || "سند صرف",
      description: `سند صرف نقدي (${pay.paidTo}) ${pay.notes ? "- " + pay.notes : ""}`,
      debit: 0,
      credit,
      inflow: 0,
      outflow: credit,
      runningBalance: 0,
      balance: 0,
      type: "payment",
    });
  });

  // 4. Check Collections (Debit / Inflow)
  checks.filter(c => c.status === "collected").forEach(chk => {
    if (!isAll && chk.targetTreasuryId !== treasuryAccountId) return;
    const debit = Number(chk.amount) || 0;
    allTx.push({
      id: chk.id,
      date: chk.collectionDate || chk.dueDate || chk.issueDate,
      referenceNumber: chk.checkNumber,
      accountName: chk.partyName || "شيك محصل",
      description: `تحصيل شيك ورقة قبض رقم ${chk.checkNumber} مسحوب على ${chk.bankName}`,
      debit,
      credit: 0,
      inflow: debit,
      outflow: 0,
      runningBalance: 0,
      balance: 0,
      type: "check_collection",
    });
  });

  // Sort chronologically
  allTx.sort((a, b) => a.date.localeCompare(b.date));

  // Compute Running Balance before filtering dates
  let running = openingBal;
  const processedTx: TreasuryStatementRow[] = [];

  // Add Opening Balance as first row
  processedTx.push({
    id: "opening-row",
    date: fromDate || "2026-01-01",
    referenceNumber: "OPENING",
    accountName: isAll ? "كافة الخزائن والبنوك" : (targetTreasury?.nameAr || "الخزينة الرئيسية"),
    description: "رصيد أول المدة الافتتاحي الدفتري",
    debit: openingBal > 0 ? openingBal : 0,
    credit: openingBal < 0 ? Math.abs(openingBal) : 0,
    inflow: openingBal > 0 ? openingBal : 0,
    outflow: openingBal < 0 ? Math.abs(openingBal) : 0,
    runningBalance: openingBal,
    balance: openingBal,
    type: "opening",
  });

  allTx.forEach(tx => {
    running += (tx.debit - tx.credit);
    tx.runningBalance = running;
    tx.balance = running;
  });

  // Filter by Date Range
  const filteredTx = allTx.filter(tx => {
    if (fromDate && tx.date < fromDate) return false;
    if (toDate && tx.date > toDate) return false;
    return true;
  });

  const finalRows = [processedTx[0], ...filteredTx];
  const totalDebit = filteredTx.reduce((sum, r) => sum + r.debit, 0);
  const totalCredit = filteredTx.reduce((sum, r) => sum + r.credit, 0);
  const closingBalance = running;

  return {
    openingBalance: openingBal,
    totalDebit,
    totalCredit,
    closingBalance,
    rows: finalRows,
  };
}

/**
 * Enhanced computeStockKardex
 * - Opening balance is strictly sorted as the primary record
 * - Running balance starts with opening balance and accumulates accurately
 * - Partner name (Customer / Supplier / Opening Balance) is attached
 */
export function computeStockKardex(
  productId: string,
  warehouseId: string,
  allMovements: StockMovement[],
  warehouses: Warehouse[] = [],
  customers: Customer[] = [],
  suppliers: Supplier[] = []
): StockCardRecord[] {
  const filtered = allMovements
    .filter(m => m.productId === productId && (warehouseId === "all" || m.warehouseId === warehouseId))
    .sort((a, b) => {
      // Prioritize opening_balance on same date or as initial transaction
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      if (timeA !== timeB) return timeA - timeB;
      if (a.movementType === "opening_balance") return -1;
      if (b.movementType === "opening_balance") return 1;
      return 0;
    });

  let runningQty = 0;
  let runningCost = 0;

  return filtered.map(m => {
    const isIncoming = m.quantity > 0;
    const inQty = isIncoming ? m.quantity : 0;
    const outQty = !isIncoming ? Math.abs(m.quantity) : 0;

    runningQty += m.quantity;
    runningCost = runningQty * m.unitCost;

    // Resolve Partner Name & Type
    let partnerName = m.partnerName;
    let partnerType = m.partnerType;

    if (!partnerName) {
      if (m.movementType === "opening_balance") {
        partnerName = "رصيد افتتاحي";
        partnerType = "opening";
      } else if (m.movementType === "sales_issue" || m.movementType === "sales_return") {
        const cust = customers.find(c => c.id === m.partnerId || c.id === m.referenceId);
        partnerName = cust?.nameAr || "عميل مبيعات";
        partnerType = "customer";
      } else if (m.movementType === "purchase_receipt" || m.movementType === "purchase_return") {
        const supp = suppliers.find(s => s.id === m.partnerId || s.id === m.referenceId);
        partnerName = supp?.nameAr || "مورد مشتريات";
        partnerType = "supplier";
      } else if (m.movementType.startsWith("transfer")) {
        const wh = warehouses.find(w => w.id === m.warehouseId);
        partnerName = wh ? `مستودع: ${wh.nameAr}` : "تحويل مستودعي";
        partnerType = "warehouse";
      } else {
        partnerName = m.notes || "حركة مخزنية";
        partnerType = "adjustment";
      }
    }

    const wh = warehouses.find(w => w.id === m.warehouseId);

    return {
      movementId: m.id,
      date: m.date,
      movementType: m.movementType,
      referenceNumber: m.referenceNumber,
      warehouseId: m.warehouseId,
      warehouseName: wh?.nameAr || "",
      partnerName,
      partnerType,
      inQuantity: inQty,
      outQuantity: outQty,
      unitCost: m.unitCost,
      totalCost: Math.abs(m.totalCost || (m.quantity * m.unitCost)),
      balanceQuantity: runningQty,
      balanceCost: runningCost,
      runningBalance: runningQty,
      notes: m.notes,
    };
  });
}

/**
 * Computes multi-criteria Stock Balance Report
 */
export function computeStockBalanceReport(
  products: Product[],
  categories: ProductCategory[],
  units: ProductUnit[],
  warehouses: Warehouse[],
  stockMovements: StockMovement[],
  filters: {
    dateFrom?: string;
    dateTo?: string;
    warehouseId?: string;
    categoryId?: string;
    productId?: string;
  }
): StockBalanceReportRow[] {
  const { dateFrom, dateTo, warehouseId, categoryId, productId } = filters;

  const filteredProducts = products.filter(p => {
    if (productId && productId !== "all" && p.id !== productId) return false;
    if (categoryId && categoryId !== "all" && p.categoryId !== categoryId) return false;
    return true;
  });

  return filteredProducts.map(prod => {
    const cat = categories.find(c => c.id === prod.categoryId);
    const unit = units.find(u => u.id === prod.unitId);

    // Get relevant movements for this product
    const prodMovements = stockMovements.filter(m =>
      m.productId === prod.id &&
      (!warehouseId || warehouseId === "all" || m.warehouseId === warehouseId)
    );

    let openingQty = 0;
    let inQty = 0;
    let outQty = 0;

    prodMovements.forEach(m => {
      const mDate = m.date;
      const isBeforeFrom = dateFrom ? mDate < dateFrom : false;
      const isInRange = (!dateFrom || mDate >= dateFrom) && (!dateTo || mDate <= dateTo);

      if (isBeforeFrom) {
        openingQty += m.quantity;
      } else if (isInRange) {
        if (m.quantity > 0) inQty += m.quantity;
        else outQty += Math.abs(m.quantity);
      }
    });

    // If no dateFrom filter, opening is strictly the opening_balance movements
    if (!dateFrom) {
      openingQty = prodMovements
        .filter(m => m.movementType === "opening_balance")
        .reduce((sum, m) => sum + m.quantity, 0);
      inQty = prodMovements
        .filter(m => m.movementType !== "opening_balance" && m.quantity > 0 && (!dateTo || m.date <= dateTo))
        .reduce((sum, m) => sum + m.quantity, 0);
      outQty = prodMovements
        .filter(m => m.quantity < 0 && (!dateTo || m.date <= dateTo))
        .reduce((sum, m) => sum + Math.abs(m.quantity), 0);
    }

    const closingQty = openingQty + inQty - outQty;
    const costPrice = prod.costPrice || 0;
    const sellingPrice = prod.sellingPrice || 0;

    return {
      productId: prod.id,
      sku: prod.sku,
      barcode: prod.barcode,
      nameAr: prod.nameAr,
      nameEn: prod.nameEn,
      categoryId: prod.categoryId,
      categoryNameAr: cat?.nameAr || "غير مصنف",
      categoryNameEn: cat?.nameEn || "Uncategorized",
      unitSymbol: unit?.symbol || "قطعة",
      imageUrl: prod.imageUrl,
      costPrice,
      sellingPrice,
      openingQuantity: openingQty,
      openingValue: openingQty * costPrice,
      inQuantity: inQty,
      inValue: inQty * costPrice,
      outQuantity: outQty,
      outValue: outQty * costPrice,
      closingQuantity: closingQty,
      closingValue: closingQty * costPrice,
    };
  });
}

export interface GeneralLedgerSummaryRow {
  accountCode: string;
  accountNameAr: string;
  accountNameEn: string;
  accountType: AccountType;
  level: number;
  nature: "debit" | "credit";
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  endingDebit: number;
  endingCredit: number;
}

export function computeGeneralLedgerSummary(
  accounts: Account[],
  entries: JournalEntry[],
  dateFrom?: string,
  dateTo?: string
): {
  rows: GeneralLedgerSummaryRow[];
  totalOpeningDebit: number;
  totalOpeningCredit: number;
  totalPeriodDebit: number;
  totalPeriodCredit: number;
  totalEndingDebit: number;
  totalEndingCredit: number;
} {
  let totOpenDr = 0;
  let totOpenCr = 0;
  let totPerDr = 0;
  let totPerCr = 0;
  let totEndDr = 0;
  let totEndCr = 0;

  const orderedAccounts = buildHierarchicalAccountTree(accounts);

  const rows: GeneralLedgerSummaryRow[] = orderedAccounts.map(acc => {
    let openDr = 0;
    let openCr = 0;
    let periodDr = 0;
    let periodCr = 0;

    (entries || []).forEach(entry => {
      const isOpening = entry.referenceType === "opening_entry" || entry.entryNumber?.startsWith("OPENING-") || entry.entryNumber?.startsWith("JV-OPENING-");
      const isBeforePeriod = dateFrom ? entry.date < dateFrom : false;
      const isInPeriod = (!dateFrom || entry.date >= dateFrom) && (!dateTo || entry.date <= dateTo);

      entry.lines?.forEach(line => {
        if (line.accountId === acc.id || line.accountCode === acc.code) {
          const dr = Number(line.debit) || 0;
          const cr = Number(line.credit) || 0;

          if (isOpening || isBeforePeriod) {
            openDr += dr;
            openCr += cr;
          } else if (isInPeriod) {
            periodDr += dr;
            periodCr += cr;
          }
        }
      });
    });

    // Compute net opening
    const netOpen = openDr - openCr;
    const openingDebit = netOpen > 0 ? netOpen : 0;
    const openingCredit = netOpen < 0 ? Math.abs(netOpen) : 0;

    // Ending balance = Opening Net + Period (Dr - Cr)
    const totalNet = netOpen + (periodDr - periodCr);
    let endingDebit = 0;
    let endingCredit = 0;

    if (acc.nature === "debit") {
      endingDebit = totalNet >= 0 ? totalNet : 0;
      endingCredit = totalNet < 0 ? Math.abs(totalNet) : 0;
    } else {
      endingCredit = totalNet <= 0 ? Math.abs(totalNet) : 0;
      endingDebit = totalNet > 0 ? totalNet : 0;
    }

    const isLeaf = acc.level === 4 || !orderedAccounts.some(sub => sub.parentId === acc.id);
    if (isLeaf) {
      totOpenDr += openingDebit;
      totOpenCr += openingCredit;
      totPerDr += periodDr;
      totPerCr += periodCr;
      totEndDr += endingDebit;
      totEndCr += endingCredit;
    }

    return {
      accountCode: acc.code,
      accountNameAr: acc.nameAr,
      accountNameEn: acc.nameEn,
      accountType: acc.type,
      level: acc.level,
      nature: acc.nature,
      openingDebit,
      openingCredit,
      periodDebit: periodDr,
      periodCredit: periodCr,
      endingDebit,
      endingCredit,
    };
  });

  return {
    rows,
    totalOpeningDebit: totOpenDr,
    totalOpeningCredit: totOpenCr,
    totalPeriodDebit: totPerDr,
    totalPeriodCredit: totPerCr,
    totalEndingDebit: totEndDr,
    totalEndingCredit: totEndCr,
  };
}

export function computeTrialBalance(
  accounts: Account[],
  entries: JournalEntry[],
  filters?: { dateFrom?: string; dateTo?: string; level?: number | "all" }
): {
  rows: TrialBalanceRow[];
  totalOpeningDebit: number;
  totalOpeningCredit: number;
  totalPeriodDebit: number;
  totalPeriodCredit: number;
  totalEndingDebit: number;
  totalEndingCredit: number;
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
} {
  const { dateFrom, dateTo, level } = filters || {};

  // 1. Compute leaf / Level 4 data first
  const summary = computeGeneralLedgerSummary(accounts, entries, dateFrom, dateTo);

  let grandOpenDr = 0;
  let grandOpenCr = 0;
  let grandPerDr = 0;
  let grandPerCr = 0;
  let grandEndDr = 0;
  let grandEndCr = 0;

  const orderedAccounts = buildHierarchicalAccountTree(accounts);

  // Level 4 leaf accounts determine the system balanced totals
  const leafAccounts = orderedAccounts.filter(a => a.level === 4 || !orderedAccounts.some(sub => sub.parentId === a.id));
  leafAccounts.forEach(leaf => {
    const r = summary.rows.find(row => row.accountCode === leaf.code);
    if (r) {
      grandOpenDr += r.openingDebit;
      grandOpenCr += r.openingCredit;
      grandPerDr += r.periodDebit;
      grandPerCr += r.periodCredit;
      grandEndDr += r.endingDebit;
      grandEndCr += r.endingCredit;
    }
  });

  // 2. Build rows with parent rollups if requested
  const rows: TrialBalanceRow[] = orderedAccounts
    .filter(acc => {
      if (level && level !== "all") {
        return acc.level === Number(level);
      }
      return true;
    })
    .map(acc => {
      // Find all descendant codes of this account (including itself)
      const isLeaf = acc.level === 4 || !accounts.some(sub => sub.parentId === acc.id);
      let openDr = 0;
      let openCr = 0;
      let perDr = 0;
      let perCr = 0;
      let endDr = 0;
      let endCr = 0;

      if (isLeaf) {
        const r = summary.rows.find(row => row.accountCode === acc.code);
        if (r) {
          openDr = r.openingDebit;
          openCr = r.openingCredit;
          perDr = r.periodDebit;
          perCr = r.periodCredit;
          endDr = r.endingDebit;
          endCr = r.endingCredit;
        }
      } else {
        // Rollup from descendants
        const descendants = accounts.filter(a => a.code.startsWith(acc.code) && (a.level === 4 || !accounts.some(sub => sub.parentId === a.id)));
        descendants.forEach(d => {
          const r = summary.rows.find(row => row.accountCode === d.code);
          if (r) {
            openDr += r.openingDebit;
            openCr += r.openingCredit;
            perDr += r.periodDebit;
            perCr += r.periodCredit;
            endDr += r.endingDebit;
            endCr += r.endingCredit;
          }
        });
      }

      return {
        accountCode: acc.code,
        accountNameAr: acc.nameAr,
        accountNameEn: acc.nameEn,
        accountType: acc.type,
        level: acc.level,
        isParent: acc.level < 4 && accounts.some(sub => sub.parentId === acc.id),
        openingDebit: openDr,
        openingCredit: openCr,
        periodDebit: perDr,
        periodCredit: perCr,
        endingDebit: endDr,
        endingCredit: endCr,
      };
    });

  const isBalanced =
    Math.abs(grandOpenDr - grandOpenCr) < 0.01 &&
    Math.abs(grandPerDr - grandPerCr) < 0.01 &&
    Math.abs(grandEndDr - grandEndCr) < 0.01;

  return {
    rows,
    totalOpeningDebit: grandOpenDr,
    totalOpeningCredit: grandOpenCr,
    totalPeriodDebit: grandPerDr,
    totalPeriodCredit: grandPerCr,
    totalEndingDebit: grandEndDr,
    totalEndingCredit: grandEndCr,
    totalDebit: grandEndDr,
    totalCredit: grandEndCr,
    isBalanced,
  };
}

/**
 * Builds a strict recursive depth-first tree traversal ordered by standard accounting classification:
 * 1. Assets (1)
 * 2. Liabilities (2)
 * 3. Equity (3)
 * 4. Revenue (4)
 * 5. Expenses (5)
 */
export function buildHierarchicalAccountTree(accounts: Account[]): Account[] {
  const typeOrder: Record<AccountType, number> = {
    assets: 1,
    liabilities: 2,
    equity: 3,
    revenue: 4,
    expense: 5,
  };

  // Find root accounts (level 1 or accounts without parentId)
  const roots = accounts
    .filter(a => a.level === 1 || !a.parentId)
    .sort((a, b) => {
      const orderA = typeOrder[a.type] || 99;
      const orderB = typeOrder[b.type] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.code.localeCompare(b.code, undefined, { numeric: true });
    });

  const result: Account[] = [];
  const visited = new Set<string>();

  function traverse(parent: Account) {
    if (visited.has(parent.id)) return;
    visited.add(parent.id);
    result.push(parent);

    const children = accounts
      .filter(a => a.parentId === parent.id || (!a.parentId && a.code.startsWith(parent.code) && a.level === parent.level + 1))
      .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

    children.forEach(child => traverse(child));
  }

  roots.forEach(root => traverse(root));

  // If there are any unvisited accounts, append in standard order
  const remaining = accounts
    .filter(a => !visited.has(a.id))
    .sort((a, b) => {
      const orderA = typeOrder[a.type] || 99;
      const orderB = typeOrder[b.type] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.code.localeCompare(b.code, undefined, { numeric: true });
    });

  return [...result, ...remaining];
}

export function computeIncomeStatement(
  accounts: Account[],
  entries: JournalEntry[],
  products: Product[] = [],
  purchaseInvoices: PurchaseInvoice[] = [],
  stockMovements: StockMovement[] = []
) {
  const getAccountPeriodBalance = (acc: Account): number => {
    let dr = 0;
    let cr = 0;
    (entries || []).forEach(e => {
      // Income statement accounts only reflect period activity (exclude opening balances)
      const isOpening = e.referenceType === "opening_entry" || e.entryNumber?.startsWith("OPENING-") || e.entryNumber?.startsWith("JV-OPENING-");
      if (isOpening) return;

      (e.lines || []).forEach(l => {
        if (l.accountId === acc.id || l.accountCode === acc.code) {
          dr += Number(l.debit) || 0;
          cr += Number(l.credit) || 0;
        }
      });
    });
    const entryBalance = acc.nature === "credit" ? (cr - dr) : (dr - cr);
    return Math.max(0, entryBalance);
  };

  const leafAccounts = accounts.filter(a => a.level === 4 || !accounts.some(sub => sub.parentId === a.id));
  const revenues = leafAccounts.filter(a => a.type === "revenue").map(a => ({
    ...a,
    balance: getAccountPeriodBalance(a),
  }));
  const cogs = leafAccounts.filter(a => a.type === "expense" && a.code.startsWith("51")).map(a => ({
    ...a,
    balance: getAccountPeriodBalance(a),
  }));
  const expenses = leafAccounts.filter(a => a.type === "expense" && !a.code.startsWith("51")).map(a => ({
    ...a,
    balance: getAccountPeriodBalance(a),
  }));

  const totalRevenue = revenues.reduce((s, a) => s + a.balance, 0);
  const totalCOGS = cogs.reduce((s, a) => s + a.balance, 0);
  const grossProfit = totalRevenue - totalCOGS;
  const totalExpenses = expenses.reduce((s, a) => s + a.balance, 0);
  const netIncome = grossProfit - totalExpenses;

  // Single Source of Truth: Opening Inventory strictly from Opening Journal Entry (1103xxx accounts)
  let openingInventoryValue = 0;
  (entries || []).forEach(e => {
    const isOpening = e.referenceType === "opening_entry" || e.entryNumber?.startsWith("OPENING-") || e.entryNumber?.startsWith("JV-OPENING-");
    if (isOpening) {
      (e.lines || []).forEach(l => {
        if (l.accountCode?.startsWith("1103")) {
          openingInventoryValue += (Number(l.debit) || 0) - (Number(l.credit) || 0);
        }
      });
    }
  });
  openingInventoryValue = Math.max(0, openingInventoryValue);

  // Period Purchases
  const purchasesValue = (purchaseInvoices || []).reduce((sum, pinv) => sum + (Number(pinv.subtotal) || 0), 0);

  // Closing Inventory Value = Opening Inventory + Purchases - COGS
  const closingInventoryValue = Math.max(0, openingInventoryValue + purchasesValue - totalCOGS);
  const periodicCOGS = Math.max(0, openingInventoryValue + purchasesValue - closingInventoryValue);

  return {
    revenues,
    cogs,
    expenses,
    totalRevenue,
    totalCOGS,
    grossProfit,
    totalExpenses,
    netIncome,
    openingInventoryValue,
    purchasesValue,
    closingInventoryValue,
    periodicCOGS,
  };
}

export interface FixedAssetCategoryRow {
  key: string;
  nameAr: string;
  nameEn: string;
  costCode: string;
  costNameAr: string;
  costBalance: number;
  depreciationCode?: string;
  depreciationNameAr?: string;
  depreciationBalance: number;
  netBookValue: number;
}

export function computeBalanceSheet(
  accounts: Account[],
  entries: JournalEntry[]
) {
  const getAccountCumulativeBalance = (acc: Account): number => {
    let dr = 0;
    let cr = 0;
    (entries || []).forEach(e => {
      (e.lines || []).forEach(l => {
        if (l.accountId === acc.id || l.accountCode === acc.code) {
          dr += Number(l.debit) || 0;
          cr += Number(l.credit) || 0;
        }
      });
    });
    // For debit accounts: net balance = dr - cr
    // For credit accounts (including contra assets): net balance = cr - dr
    const net = acc.nature === "credit" ? (cr - dr) : (dr - cr);
    if (dr > 0 || cr > 0) return Math.max(0, net);
    return Number(acc.balance) || 0;
  };

  const leafAccounts = accounts.filter(a => a.level === 4 || !accounts.some(sub => sub.parentId === a.id));

  // 1. Current Assets (11...)
  const currentAssets = leafAccounts
    .filter(a => a.type === "assets" && a.code.startsWith("11"))
    .map(a => ({
      ...a,
      balance: getAccountCumulativeBalance(a),
    }));
  const totalCurrentAssets = currentAssets.reduce((s, a) => s + a.balance, 0);

  // 2. Fixed Assets Cost (1201...) & Contra Accumulated Depreciation (1202...)
  const fixedCostAccounts = leafAccounts.filter(a => a.type === "assets" && a.code.startsWith("1201"));
  const deprAccounts = leafAccounts.filter(a => a.type === "assets" && a.code.startsWith("1202"));

  // Depreciation mapping dictionary by fixed asset code suffix
  const fixedAssetGroups: FixedAssetCategoryRow[] = [
    { key: "lands", nameAr: "الأراضي", nameEn: "Lands", costCode: "1201001", costNameAr: "أراضي", costBalance: 0, depreciationBalance: 0, netBookValue: 0 },
    { key: "buildings", nameAr: "المباني والإنشاءات", nameEn: "Buildings", costCode: "1201002", costNameAr: "مباني وإنشاءات", costBalance: 0, depreciationCode: "1202001", depreciationNameAr: "مجمع إهلاك مباني", depreciationBalance: 0, netBookValue: 0 },
    { key: "vehicles", nameAr: "السيارات ووسائل النقل", nameEn: "Vehicles", costCode: "1201003", costNameAr: "سيارات ووسائل نقل", costBalance: 0, depreciationCode: "1202002", depreciationNameAr: "مجمع إهلاك سيارات", depreciationBalance: 0, netBookValue: 0 },
    { key: "equipment", nameAr: "الآلات والمعدات", nameEn: "Equipment", costCode: "1201004", costNameAr: "آلات ومعدات", costBalance: 0, depreciationBalance: 0, netBookValue: 0 },
    { key: "computers", nameAr: "أجهزة الحاسب والبرمجيات", nameEn: "Computers", costCode: "1201005", costNameAr: "أجهزة حاسب وبرمجيات", costBalance: 0, depreciationCode: "1202003", depreciationNameAr: "مجمع إهلاك حاسبات", depreciationBalance: 0, netBookValue: 0 },
    { key: "furniture", nameAr: "الأثاث والتجهيزات المكتبية", nameEn: "Furniture", costCode: "1201006", costNameAr: "أثاث وتجهيزات مكتبية", costBalance: 0, depreciationCode: "1202004", depreciationNameAr: "مجمع إهلاك أثاث", depreciationBalance: 0, netBookValue: 0 },
  ];

  // Populate known groups
  fixedAssetGroups.forEach(g => {
    const costAcc = fixedCostAccounts.find(a => a.code === g.costCode);
    if (costAcc) {
      g.costBalance = getAccountCumulativeBalance(costAcc);
      g.costNameAr = costAcc.nameAr;
    }
    if (g.depreciationCode) {
      const deprAcc = deprAccounts.find(a => a.code === g.depreciationCode);
      if (deprAcc) {
        g.depreciationBalance = getAccountCumulativeBalance(deprAcc);
        g.depreciationNameAr = deprAcc.nameAr;
      }
    }
    g.netBookValue = g.costBalance - g.depreciationBalance;
  });

  // Handle any other fixed asset accounts outside the standard 6
  fixedCostAccounts.forEach(fa => {
    if (!fixedAssetGroups.some(g => g.costCode === fa.code)) {
      const costBal = getAccountCumulativeBalance(fa);
      fixedAssetGroups.push({
        key: `fa_${fa.code}`,
        nameAr: fa.nameAr,
        nameEn: fa.nameEn,
        costCode: fa.code,
        costNameAr: fa.nameAr,
        costBalance: costBal,
        depreciationBalance: 0,
        netBookValue: costBal,
      });
    }
  });

  // Calculate Fixed Asset Totals
  const totalFixedAssetsCost = fixedCostAccounts.reduce((s, a) => s + getAccountCumulativeBalance(a), 0);
  const totalAccumulatedDepreciation = deprAccounts.reduce((s, a) => s + getAccountCumulativeBalance(a), 0);
  const totalNetFixedAssets = totalFixedAssetsCost - totalAccumulatedDepreciation;

  // Other non-current assets (if any)
  const otherNonCurrentAssets = leafAccounts
    .filter(a => a.type === "assets" && a.code.startsWith("12") && !a.code.startsWith("1201") && !a.code.startsWith("1202"))
    .map(a => ({
      ...a,
      balance: getAccountCumulativeBalance(a),
    }));
  const totalOtherNonCurrentAssets = otherNonCurrentAssets.reduce((s, a) => s + a.balance, 0);

  // Total Net Assets = Current Assets + Net Fixed Assets + Other Non Current
  const totalAssets = totalCurrentAssets + totalNetFixedAssets + totalOtherNonCurrentAssets;

  // 3. Liabilities (Current 21... and Non-Current 22...)
  const currentLiabilities = leafAccounts
    .filter(a => a.type === "liabilities" && a.code.startsWith("21"))
    .map(a => ({
      ...a,
      balance: getAccountCumulativeBalance(a),
    }));
  const totalCurrentLiabilities = currentLiabilities.reduce((s, a) => s + a.balance, 0);

  const nonCurrentLiabilities = leafAccounts
    .filter(a => a.type === "liabilities" && a.code.startsWith("22"))
    .map(a => ({
      ...a,
      balance: getAccountCumulativeBalance(a),
    }));
  const totalNonCurrentLiabilities = nonCurrentLiabilities.reduce((s, a) => s + a.balance, 0);

  const totalLiabilities = totalCurrentLiabilities + totalNonCurrentLiabilities;

  // 4. Equity & Net Income
  const equityAccounts = leafAccounts
    .filter(a => a.type === "equity")
    .map(a => ({
      ...a,
      balance: getAccountCumulativeBalance(a),
    }));
  const totalEquityBeforeProfit = equityAccounts.reduce((s, a) => s + a.balance, 0);

  const { netIncome } = computeIncomeStatement(accounts, entries);
  const totalEquity = totalEquityBeforeProfit + netIncome;
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01;

  return {
    currentAssets,
    totalCurrentAssets,
    fixedAssetGroups,
    fixedCostAccounts: fixedCostAccounts.map(a => ({ ...a, balance: getAccountCumulativeBalance(a) })),
    deprAccounts: deprAccounts.map(a => ({ ...a, balance: getAccountCumulativeBalance(a) })),
    totalFixedAssetsCost,
    totalAccumulatedDepreciation,
    totalNetFixedAssets,
    otherNonCurrentAssets,
    totalOtherNonCurrentAssets,
    totalAssets,
    currentLiabilities,
    totalCurrentLiabilities,
    nonCurrentLiabilities,
    totalNonCurrentLiabilities,
    totalLiabilities,
    equity: equityAccounts,
    totalEquityBeforeProfit,
    netIncome,
    totalEquity,
    totalLiabilitiesAndEquity,
    isBalanced,
    // Backward compatibility aliases
    assets: accounts.filter(a => a.type === "assets"),
    liabilities: accounts.filter(a => a.type === "liabilities"),
  };
}

export function computeAging(
  customers: Customer[],
  invoices: SalesInvoice[]
): AgingBucket[] {
  const today = new Date();

  return customers.map(c => {
    const custInvoices = invoices.filter(inv => inv.customerId === c.id && inv.dueAmount > 0);

    let cur = 0;
    let d30 = 0;
    let d60 = 0;
    let d90 = 0;
    let d90p = 0;

    custInvoices.forEach(inv => {
      const invDate = new Date(inv.date);
      const diffDays = Math.floor((today.getTime() - invDate.getTime()) / (1000 * 3600 * 24));

      if (diffDays <= 0) cur += inv.dueAmount;
      else if (diffDays <= 30) d30 += inv.dueAmount;
      else if (diffDays <= 60) d60 += inv.dueAmount;
      else if (diffDays <= 90) d90 += inv.dueAmount;
      else d90p += inv.dueAmount;
    });

    const total = cur + d30 + d60 + d90 + d90p || c.currentBalance;

    return {
      entityId: c.id,
      entityName: c.nameAr,
      partyId: c.id,
      partyName: c.nameAr,
      current: cur,
      days30: d30,
      days60: d60,
      days90: d90,
      days90Plus: d90p,
      total,
      totalDue: total,
      bucket0to30: d30,
      bucket31to60: d60,
      bucket61to90: d90,
      bucket90Plus: d90p,
    };
  });
}
