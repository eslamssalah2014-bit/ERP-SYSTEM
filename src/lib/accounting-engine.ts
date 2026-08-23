import {
  Account, JournalEntry, JournalLine, SalesInvoice,
  PurchaseInvoice, CashReceipt, CashPayment, StockMovement,
  StockCardRecord, TrialBalanceRow, AgingBucket, Customer, Supplier
} from "@/types/erp";

export function generateSalesInvoiceJournal(
  invoice: SalesInvoice,
  accounts: Account[],
  cogsAmount: number
): Omit<JournalEntry, "id"> {
  const arAccount = accounts.find(a => a.code === "1120") || accounts[0];
  const salesAccount = accounts.find(a => a.code === "4100") || accounts[0];
  const vatOutAccount = accounts.find(a => a.code === "2130") || accounts[0];
  const cogsAccount = accounts.find(a => a.code === "5100") || accounts[0];
  const invAccount = accounts.find(a => a.code === "1130") || accounts[0];

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
      credit: invoice.subtotal,
      description: `إيراد مبيعات بضاعة فاتورة ${invoice.invoiceNumber}`,
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
    createdBy: invoice.createdBy,
  };
}

export function generatePurchaseInvoiceJournal(
  invoice: PurchaseInvoice,
  accounts: Account[]
): Omit<JournalEntry, "id"> {
  const invAccount = accounts.find(a => a.code === "1130") || accounts[0];
  const vatInAccount = accounts.find(a => a.code === "1140") || accounts[0];
  const apAccount = accounts.find(a => a.code === "2110") || accounts[0];

  const lines: JournalLine[] = [
    {
      id: "jl_pinv_stock",
      accountId: invAccount.id,
      accountCode: invAccount.code,
      accountName: invAccount.nameAr,
      debit: invoice.subtotal,
      credit: 0,
      description: `إضافة بضاعة للمخزن فاتورة مشتريات ${invoice.invoiceNumber}`,
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
    createdBy: invoice.createdBy,
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

export function computeStockKardex(
  productId: string,
  warehouseId: string,
  allMovements: StockMovement[]
): StockCardRecord[] {
  const filtered = allMovements
    .filter(m => m.productId === productId && (warehouseId === "all" || m.warehouseId === warehouseId))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let runningQty = 0;
  let runningCost = 0;

  return filtered.map(m => {
    const isIncoming = m.quantity > 0;
    const inQty = isIncoming ? m.quantity : 0;
    const outQty = !isIncoming ? Math.abs(m.quantity) : 0;

    runningQty += m.quantity;
    runningCost = runningQty * m.unitCost;

    return {
      date: m.date,
      movementType: m.movementType,
      referenceNumber: m.referenceNumber,
      inQuantity: inQty,
      outQuantity: outQty,
      unitCost: m.unitCost,
      totalCost: Math.abs(m.totalCost),
      balanceQuantity: runningQty,
      balanceCost: runningCost,
      runningBalance: runningQty,
      notes: m.notes,
    };
  });
}

export function computeTrialBalance(
  accounts: Account[],
  entries: JournalEntry[]
): { rows: TrialBalanceRow[]; totalDebit: number; totalCredit: number; isBalanced: boolean } {
  const debitMap: { [accId: string]: number } = {};
  const creditMap: { [accId: string]: number } = {};

  entries.forEach(entry => {
    entry.lines.forEach(line => {
      debitMap[line.accountId] = (debitMap[line.accountId] || 0) + line.debit;
      creditMap[line.accountId] = (creditMap[line.accountId] || 0) + line.credit;
    });
  });

  let grandDebit = 0;
  let grandCredit = 0;

  const rows: TrialBalanceRow[] = accounts.map(acc => {
    const periodDr = debitMap[acc.id] || 0;
    const periodCr = creditMap[acc.id] || 0;
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
  entries: JournalEntry[]
) {
  const revenues = accounts.filter(a => a.type === "revenue");
  const cogs = accounts.filter(a => a.code.startsWith("51"));
  const expenses = accounts.filter(a => a.type === "expense" && !a.code.startsWith("51"));

  const totalRevenue = revenues.reduce((s, a) => s + a.balance, 0);
  const totalCOGS = cogs.reduce((s, a) => s + a.balance, 0);
  const grossProfit = totalRevenue - totalCOGS;
  const totalExpenses = expenses.reduce((s, a) => s + a.balance, 0);
  const netIncome = grossProfit - totalExpenses;

  return {
    revenues,
    cogs,
    expenses,
    totalRevenue,
    totalCOGS,
    grossProfit,
    totalExpenses,
    netIncome,
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
