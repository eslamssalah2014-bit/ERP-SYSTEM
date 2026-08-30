import {
  Account, JournalEntry, JournalLine, SalesInvoice,
  PurchaseInvoice, SalesReturn, PurchaseReturn, CashReceipt, CashPayment, StockMovement,
  StockCardRecord, TrialBalanceRow, AgingBucket, Customer, Supplier,
  Product, ProductCategory, ProductUnit, Warehouse, StockBalanceReportRow
} from "@/types/erp";

export function generateSalesInvoiceJournal(
  invoice: SalesInvoice,
  accounts: Account[],
  cogsAmount: number = 0
): Omit<JournalEntry, "id"> {
  const arAccount = accounts.find(a => a.code === "1120") || accounts.find(a => a.type === "assets") || accounts[0];
  const salesAccount = accounts.find(a => a.code === "4100") || accounts.find(a => a.type === "revenue") || accounts[0];
  const vatOutAccount = accounts.find(a => a.code === "2130") || accounts.find(a => a.code === "2100") || accounts[0];
  const cogsAccount = accounts.find(a => a.code === "5100") || accounts.find(a => a.type === "expense") || accounts[0];
  const invAccount = accounts.find(a => a.code === "1130") || accounts.find(a => a.type === "assets") || accounts[0];

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
  const invAccount = accounts.find(a => a.code === "1130") || accounts.find(a => a.type === "assets") || accounts[0];
  const vatInAccount = accounts.find(a => a.code === "1140") || accounts.find(a => a.type === "assets") || accounts[0];
  const apAccount = accounts.find(a => a.code === "2110") || accounts.find(a => a.type === "liabilities") || accounts[0];

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
  const salesAccount = accounts.find(a => a.code === "4100") || accounts.find(a => a.type === "revenue") || accounts[0];
  const vatOutAccount = accounts.find(a => a.code === "2130") || accounts.find(a => a.code === "2100") || accounts[0];
  const arAccount = accounts.find(a => a.code === "1120") || accounts.find(a => a.type === "assets") || accounts[0];
  const treasuryAccount = accounts.find(a => a.code === "1110" || a.code === "1115") || accounts[0];
  const cogsAccount = accounts.find(a => a.code === "5100") || accounts.find(a => a.type === "expense") || accounts[0];
  const invAccount = accounts.find(a => a.code === "1130") || accounts.find(a => a.type === "assets") || accounts[0];

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
  const apAccount = accounts.find(a => a.code === "2110") || accounts.find(a => a.type === "liabilities") || accounts[0];
  const treasuryAccount = accounts.find(a => a.code === "1110" || a.code === "1115") || accounts[0];
  const invAccount = accounts.find(a => a.code === "1130") || accounts.find(a => a.type === "assets") || accounts[0];
  const vatInAccount = accounts.find(a => a.code === "1140") || accounts.find(a => a.type === "assets") || accounts[0];

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

  const invAccount = accounts.find(a => a.code === "1130") || accounts[0];
  const equityAccount = accounts.find(a => a.code === "3100" || a.code === "3200") || accounts.find(a => a.type === "equity") || accounts[0];

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
  const invAccount = accounts.find(a => a.code === "1130") || accounts[0];
  const cogsAccount = accounts.find(a => a.code === "5100") || accounts[0];
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
  const invAccount = accounts.find(a => a.code === "1130") || accounts[0];
  const cogsAccount = accounts.find(a => a.code === "5100") || accounts[0];
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

export function computeTrialBalance(
  accounts: Account[],
  entries: JournalEntry[]
): { rows: TrialBalanceRow[]; totalDebit: number; totalCredit: number; isBalanced: boolean } {
  let grandDebit = 0;
  let grandCredit = 0;

  const rows: TrialBalanceRow[] = accounts.map(acc => {
    let periodDr = 0;
    let periodCr = 0;

    entries.forEach(entry => {
      entry.lines.forEach(line => {
        if (line.accountId === acc.id || line.accountCode === acc.code) {
          periodDr += Number(line.debit) || 0;
          periodCr += Number(line.credit) || 0;
        }
      });
    });

    const net = periodDr - periodCr;
    const endingDr = acc.nature === "debit" ? Math.max(0, net) : 0;
    const endingCr = acc.nature === "credit" ? Math.max(0, -net) : 0;

    grandDebit += endingDr;
    grandCredit += endingCr;

    return {
      accountCode: acc.code,
      accountNameAr: acc.nameAr,
      accountNameEn: acc.nameEn,
      accountType: acc.type,
      level: acc.level,
      isParent: acc.level === 1,
      openingDebit: 0,
      openingCredit: 0,
      periodDebit: periodDr,
      periodCredit: periodCr,
      endingDebit: endingDr,
      endingCredit: endingCr,
    };
  });

  return {
    rows,
    totalDebit: grandDebit,
    totalCredit: grandCredit,
    isBalanced: Math.abs(grandDebit - grandCredit) < 0.01,
  };
}

export function computeIncomeStatement(
  accounts: Account[],
  entries: JournalEntry[],
  products: Product[] = [],
  purchaseInvoices: PurchaseInvoice[] = [],
  stockMovements: StockMovement[] = []
) {
  const revenues = accounts.filter(a => a.type === "revenue");
  const cogs = accounts.filter(a => a.code.startsWith("51"));
  const expenses = accounts.filter(a => a.type === "expense" && !a.code.startsWith("51"));

  const totalRevenue = revenues.reduce((s, a) => s + a.balance, 0);
  const totalCOGS = cogs.reduce((s, a) => s + a.balance, 0);
  const grossProfit = totalRevenue - totalCOGS;
  const totalExpenses = expenses.reduce((s, a) => s + a.balance, 0);
  const netIncome = grossProfit - totalExpenses;

  // Periodic Inventory COGS Formulation: COGS = Opening Inventory + Purchases - Closing Inventory
  const openingInventoryValue = stockMovements
    .filter(m => m.movementType === "opening_balance")
    .reduce((sum, m) => sum + (m.quantity * m.unitCost), 0);

  const purchasesValue = purchaseInvoices.reduce((sum, pinv) => sum + pinv.subtotal, 0);

  const closingInventoryValue = products.reduce((sum, p) => {
    const qty = Object.values(p.warehouseStock || {}).reduce((a, b) => a + b, 0);
    return sum + (qty * p.costPrice);
  }, 0);

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

export function computeBalanceSheet(
  accounts: Account[],
  entries: JournalEntry[]
) {
  const assets = accounts.filter(a => a.type === "assets");
  const liabilities = accounts.filter(a => a.type === "liabilities");
  const equity = accounts.filter(a => a.type === "equity");

  const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = liabilities.reduce((s, a) => s + a.balance, 0);

  const { netIncome } = computeIncomeStatement(accounts, entries);
  const totalEquity = equity.reduce((s, a) => s + a.balance, 0) + netIncome;

  return {
    assets,
    liabilities,
    equity,
    totalAssets,
    totalLiabilities,
    totalEquity,
    netIncome,
    isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1.0,
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
