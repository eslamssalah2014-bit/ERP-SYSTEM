"use client";

import React, { useState } from "react";
import { useERP } from "@/context/erp-context";
import { computeStockBalanceReport, computeIncomeStatement } from "@/lib/accounting-engine";
import { formatCurrency, formatDate } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import {
  BarChart3, FileSpreadsheet, ShieldCheck, Printer, Download,
  Filter, Package, Calendar, Clock, User, ArrowDownRight, ArrowUpRight,
  TrendingDown, CheckCircle2, AlertCircle, Layers, Image as ImageIcon
} from "lucide-react";

export default function ReportsPage() {
  const {
    products, categories, units, warehouses, stockMovements,
    productChangeLogs, periodClosings, createPeriodClosing,
    salesInvoices, purchaseInvoices, accounts, journalEntries,
    organization, currentUser, locale, hasPermission
  } = useERP();

  const isAr = locale === "ar";
  const [selectedReport, setSelectedReport] = useState<"stock_balance" | "change_history" | "period_closing" | "vat" | "inventory">("stock_balance");

  // Stock Balance Report Filter State
  const [sbDateFrom, setSbDateFrom] = useState("");
  const [sbDateTo, setSbDateTo] = useState("");
  const [sbWarehouseId, setSbWarehouseId] = useState("all");
  const [sbCategoryId, setSbCategoryId] = useState("all");
  const [sbProductId, setSbProductId] = useState("all");

  // Product Change History Filter State
  const [chProductId, setChProductId] = useState("all");
  const [chChangeType, setChChangeType] = useState("all");
  const [chDateFrom, setChDateFrom] = useState("");
  const [chDateTo, setChDateTo] = useState("");

  // Period Closing Form State
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [closingPeriodType, setClosingPeriodType] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  const [closingPeriodLabel, setClosingPeriodLabel] = useState(`2026-${String(new Date().getMonth() + 1).padStart(2, "0")}`);
  const [closingDate, setClosingDate] = useState(new Date().toISOString().split("T")[0]);
  const [closingNotes, setClosingNotes] = useState("");

  // Compute Stock Balance Report
  const stockBalanceRows = computeStockBalanceReport(
    products,
    categories,
    units,
    warehouses,
    stockMovements,
    {
      dateFrom: sbDateFrom || undefined,
      dateTo: sbDateTo || undefined,
      warehouseId: sbWarehouseId,
      categoryId: sbCategoryId,
      productId: sbProductId,
    }
  );

  const totalSbOpeningQty = stockBalanceRows.reduce((s, r) => s + r.openingQuantity, 0);
  const totalSbOpeningVal = stockBalanceRows.reduce((s, r) => s + r.openingValue, 0);
  const totalSbInQty = stockBalanceRows.reduce((s, r) => s + r.inQuantity, 0);
  const totalSbInVal = stockBalanceRows.reduce((s, r) => s + r.inValue, 0);
  const totalSbOutQty = stockBalanceRows.reduce((s, r) => s + r.outQuantity, 0);
  const totalSbOutVal = stockBalanceRows.reduce((s, r) => s + r.outValue, 0);
  const totalSbClosingQty = stockBalanceRows.reduce((s, r) => s + r.closingQuantity, 0);
  const totalSbClosingVal = stockBalanceRows.reduce((s, r) => s + r.closingValue, 0);

  // Filter Product Change History
  const filteredChangeLogs = productChangeLogs.filter(log => {
    if (chProductId !== "all" && log.productId !== chProductId) return false;
    if (chChangeType !== "all" && log.changeType !== chChangeType) return false;
    if (chDateFrom && log.createdAt.split(" ")[0] < chDateFrom) return false;
    if (chDateTo && log.createdAt.split(" ")[0] > chDateTo) return false;
    return true;
  });

  // Income Statement & COGS Computation
  const { openingInventoryValue, purchasesValue, closingInventoryValue, periodicCOGS } = computeIncomeStatement(
    accounts,
    journalEntries,
    products,
    purchaseInvoices,
    stockMovements
  );

  // VAT Return Computations
  const totalSalesTaxable = salesInvoices.reduce((sum, inv) => sum + inv.subtotal, 0);
  const totalSalesVat = salesInvoices.reduce((sum, inv) => sum + inv.taxTotal, 0);
  const totalPurchasesTaxable = purchaseInvoices.reduce((sum, inv) => sum + inv.subtotal, 0);
  const totalPurchasesVat = purchaseInvoices.reduce((sum, inv) => sum + inv.taxTotal, 0);
  const netVatPayable = totalSalesVat - totalPurchasesVat;

  // Handle Export Excel for Stock Balance Report
  const handleExportStockBalanceExcel = () => {
    const headers = [
      isAr ? "كود الصنف" : "SKU",
      isAr ? "اسم الصنف بالعربية" : "Name (Ar)",
      isAr ? "اسم الصنف بالإنجليزية" : "Name (En)",
      isAr ? "التصنيف" : "Category",
      isAr ? "الوحدة" : "Unit",
      isAr ? "سعر التكلفة" : "Unit Cost",
      isAr ? "رصيد أول المدة" : "Opening Qty",
      isAr ? "قيمة أول المدة" : "Opening Value",
      isAr ? "الوارد" : "In Qty",
      isAr ? "قيمة الوارد" : "In Value",
      isAr ? "المنصرف" : "Out Qty",
      isAr ? "قيمة المنصرف" : "Out Value",
      isAr ? "رصيد آخر المدة" : "Closing Qty",
      isAr ? "قيمة المخزون الإجمالية" : "Closing Valuation",
    ];

    const rows = stockBalanceRows.map(r => [
      r.sku,
      `"${r.nameAr.replace(/"/g, '""')}"`,
      `"${r.nameEn.replace(/"/g, '""')}"`,
      `"${r.categoryNameAr.replace(/"/g, '""')}"`,
      `"${r.unitSymbol}"`,
      r.costPrice,
      r.openingQuantity,
      r.openingValue,
      r.inQuantity,
      r.inValue,
      r.outQuantity,
      r.outValue,
      r.closingQuantity,
      r.closingValue,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Stock_Balance_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Export Excel for Change History
  const handleExportChangeHistoryExcel = () => {
    const headers = [
      isAr ? "الوقت والتاريخ" : "Timestamp",
      isAr ? "كود الصنف" : "SKU",
      isAr ? "اسم الصنف" : "Product Name",
      isAr ? "المستخدم" : "User",
      isAr ? "نوع التعديل" : "Change Type",
      isAr ? "الحقل المعدل" : "Field",
      isAr ? "القيمة السابقة" : "Old Value",
      isAr ? "القيمة الجديدة" : "New Value",
    ];

    const rows = filteredChangeLogs.map(l => [
      l.createdAt,
      l.productSku,
      `"${l.productName.replace(/"/g, '""')}"`,
      `"${l.userName.replace(/"/g, '""')}"`,
      l.changeType,
      `"${l.fieldName.replace(/"/g, '""')}"`,
      `"${l.oldValue.replace(/"/g, '""')}"`,
      `"${l.newValue.replace(/"/g, '""')}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Product_Change_Audit_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Submit Period Closing
  const handleExecutePeriodClosing = (e: React.FormEvent) => {
    e.preventDefault();

    createPeriodClosing({
      organizationId: organization.id,
      periodType: closingPeriodType,
      periodLabel: closingPeriodLabel,
      closingDate,
      openingInventoryValue,
      purchasesValue,
      closingInventoryValue,
      cogsValue: periodicCOGS,
      notes: closingNotes,
      createdBy: currentUser.name,
    });

    setIsClosingModalOpen(false);
    setClosingNotes("");
  };

  const canManageClosing = hasPermission(["super_admin", "tenant_admin", "accountant"]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm print:hidden">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-emerald-400" />
            <span>{isAr ? "مركز التقارير التحليلية والمخزنية والمالية" : "Reports & Inventory Audit Center"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? "تقرير أرصدة المخزون، سجل تتبع تعديلات المنتجات، إقفال الفترات المحاسبية، والإقرارات الضريبية"
              : "Stock Balance Reports, Product Audit Logs, Period-End Inventory Closings, and VAT Returns"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/60 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>{isAr ? "طباعة التقرير (PDF)" : "Print Report"}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 bg-slate-900/60 p-3 rounded-2xl border border-slate-800 text-xs font-bold print:hidden">
        <button
          onClick={() => setSelectedReport("stock_balance")}
          className={"px-4 py-2 rounded-xl transition-all flex items-center gap-2 " + (
            selectedReport === "stock_balance" ? "bg-emerald-600 text-white shadow-md" : "bg-slate-950 text-slate-400 hover:text-white"
          )}
        >
          <Layers className="w-4 h-4" />
          <span>{isAr ? "تقرير أرصدة المخزون وحركة الأصناف" : "Stock Balance Report"}</span>
        </button>

        <button
          onClick={() => setSelectedReport("change_history")}
          className={"px-4 py-2 rounded-xl transition-all flex items-center gap-2 " + (
            selectedReport === "change_history" ? "bg-emerald-600 text-white shadow-md" : "bg-slate-950 text-slate-400 hover:text-white"
          )}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{isAr ? "سجل تعديلات المنتجات (Audit)" : "Product Change History"}</span>
        </button>

        <button
          onClick={() => setSelectedReport("period_closing")}
          className={"px-4 py-2 rounded-xl transition-all flex items-center gap-2 " + (
            selectedReport === "period_closing" ? "bg-emerald-600 text-white shadow-md" : "bg-slate-950 text-slate-400 hover:text-white"
          )}
        >
          <TrendingDown className="w-4 h-4" />
          <span>{isAr ? "إقفال المخزون وتكلفة المبيعات (COGS)" : "Period-End Closing"}</span>
        </button>

        <button
          onClick={() => setSelectedReport("vat")}
          className={"px-4 py-2 rounded-xl transition-all flex items-center gap-2 " + (
            selectedReport === "vat" ? "bg-emerald-600 text-white shadow-md" : "bg-slate-950 text-slate-400 hover:text-white"
          )}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>{isAr ? "إقرار ضريبة القيمة المضافة (VAT Return)" : "VAT Return"}</span>
        </button>

        <button
          onClick={() => setSelectedReport("inventory")}
          className={"px-4 py-2 rounded-xl transition-all flex items-center gap-2 " + (
            selectedReport === "inventory" ? "bg-emerald-600 text-white shadow-md" : "bg-slate-950 text-slate-400 hover:text-white"
          )}
        >
          <Package className="w-4 h-4" />
          <span>{isAr ? "تقييم المخزون السلعي" : "Inventory Valuation"}</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. STOCK BALANCE REPORT                                                   */}
      {/* ========================================================================= */}
      {selectedReport === "stock_balance" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800 print:hidden">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">{isAr ? "من تاريخ:" : "From Date:"}</label>
              <input
                type="date"
                value={sbDateFrom}
                onChange={(e) => setSbDateFrom(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">{isAr ? "إلى تاريخ:" : "To Date:"}</label>
              <input
                type="date"
                value={sbDateTo}
                onChange={(e) => setSbDateTo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">{isAr ? "المستودع:" : "Warehouse:"}</label>
              <select
                value={sbWarehouseId}
                onChange={(e) => setSbWarehouseId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
              >
                <option value="all">{isAr ? "جميع المستودعات" : "All Warehouses"}</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.nameAr} ({w.code})</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">{isAr ? "التصنيف:" : "Category:"}</label>
              <select
                value={sbCategoryId}
                onChange={(e) => setSbCategoryId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
              >
                <option value="all">{isAr ? "جميع التصنيفات" : "All Categories"}</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.nameAr}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">{isAr ? "الصنف:" : "Product:"}</label>
              <select
                value={sbProductId}
                onChange={(e) => setSbProductId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
              >
                <option value="all">{isAr ? "جميع الأصناف" : "All Products"}</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.nameAr} ({p.sku})</option>)}
              </select>
            </div>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] text-slate-400 font-semibold block">{isAr ? "إجمالي رصيد أول المدة" : "Opening Stock"}</span>
              <span className="text-base font-black font-mono text-white mt-1 block">
                {totalSbOpeningQty} <span className="text-xs font-normal text-slate-400">{isAr ? "قطعة" : "pcs"}</span>
              </span>
              <span className="text-xs text-slate-500 font-mono mt-0.5 block">{formatCurrency(totalSbOpeningVal, organization.currency, locale)}</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] text-slate-400 font-semibold block">{isAr ? "إجمالي الوارد (مشتريات/إضافات)" : "Total Inbound"}</span>
              <span className="text-base font-black font-mono text-emerald-400 mt-1 block">
                +{totalSbInQty} <span className="text-xs font-normal text-slate-400">{isAr ? "قطعة" : "pcs"}</span>
              </span>
              <span className="text-xs text-slate-500 font-mono mt-0.5 block">{formatCurrency(totalSbInVal, organization.currency, locale)}</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] text-slate-400 font-semibold block">{isAr ? "إجمالي المنصرف (مبيعات/صرف)" : "Total Outbound"}</span>
              <span className="text-base font-black font-mono text-rose-400 mt-1 block">
                -{totalSbOutQty} <span className="text-xs font-normal text-slate-400">{isAr ? "قطعة" : "pcs"}</span>
              </span>
              <span className="text-xs text-slate-500 font-mono mt-0.5 block">{formatCurrency(totalSbOutVal, organization.currency, locale)}</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] text-slate-400 font-semibold block">{isAr ? "رصيد وقيمة آخر المدة" : "Closing Stock & Valuation"}</span>
              <span className="text-base font-black font-mono text-sky-400 mt-1 block">
                {totalSbClosingQty} <span className="text-xs font-normal text-slate-400">{isAr ? "قطعة" : "pcs"}</span>
              </span>
              <span className="text-xs text-emerald-400 font-mono font-bold mt-0.5 block">{formatCurrency(totalSbClosingVal, organization.currency, locale)}</span>
            </div>
          </div>

          {/* Export Bar */}
          <div className="flex justify-between items-center bg-slate-900/60 p-3 rounded-2xl border border-slate-800 print:hidden">
            <span className="text-xs text-slate-400 font-semibold">
              {isAr ? `تم العثور على ${stockBalanceRows.length} صنف` : `Showing ${stockBalanceRows.length} products`}
            </span>
            <button
              onClick={handleExportStockBalanceExcel}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl text-xs font-bold transition-colors border border-slate-700 shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>{isAr ? "تصدير إلى Excel (CSV)" : "Export CSV"}</span>
            </button>
          </div>

          {/* Report Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                    <th className="p-3.5 rounded-r-lg w-12 text-center">{isAr ? "الصورة" : "Image"}</th>
                    <th className="p-3.5 font-mono">{isAr ? "كود SKU" : "SKU"}</th>
                    <th className="p-3.5">{isAr ? "اسم الصنف" : "Product Name"}</th>
                    <th className="p-3.5">{isAr ? "التصنيف" : "Category"}</th>
                    <th className="p-3.5 text-center font-mono text-slate-300">{isAr ? "رصيد أول المدة" : "Opening Qty"}</th>
                    <th className="p-3.5 text-center font-mono text-emerald-400">{isAr ? "الوارد (+)" : "In Qty"}</th>
                    <th className="p-3.5 text-center font-mono text-rose-400">{isAr ? "المنصرف (-)" : "Out Qty"}</th>
                    <th className="p-3.5 text-center font-mono text-white">{isAr ? "رصيد آخر المدة" : "Closing Qty"}</th>
                    <th className="p-3.5 text-center font-mono text-slate-400">{isAr ? "سعر التكلفة" : "Unit Cost"}</th>
                    <th className="p-3.5 rounded-l-lg text-center font-mono text-emerald-400">{isAr ? "قيمة المخزون" : "Inventory Valuation"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {stockBalanceRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-10 text-center text-slate-500 font-sans">
                        {isAr ? "لا توجد أصناف تطابق شروط التقرير" : "No products found matching filters"}
                      </td>
                    </tr>
                  ) : (
                    stockBalanceRows.map(r => (
                      <tr key={r.productId} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 text-center">
                          <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0 mx-auto">
                            {r.imageUrl ? (
                              <img src={r.imageUrl} alt={r.nameAr} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-4 h-4 text-slate-600" />
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 font-bold text-slate-200">{r.sku}</td>
                        <td className="p-3.5 font-sans font-bold text-white">
                          <div>{r.nameAr}</div>
                          <div className="text-[10px] text-slate-500 font-normal">{r.nameEn}</div>
                        </td>
                        <td className="p-3.5 font-sans text-slate-400">{r.categoryNameAr}</td>
                        <td className="p-3.5 text-center font-bold text-slate-300">{r.openingQuantity}</td>
                        <td className="p-3.5 text-center font-bold text-emerald-400">{r.inQuantity > 0 ? `+${r.inQuantity}` : "-"}</td>
                        <td className="p-3.5 text-center font-bold text-rose-400">{r.outQuantity > 0 ? `-${r.outQuantity}` : "-"}</td>
                        <td className="p-3.5 text-center font-black text-white bg-slate-950/40">{r.closingQuantity}</td>
                        <td className="p-3.5 text-center text-slate-400">{formatCurrency(r.costPrice, organization.currency, locale)}</td>
                        <td className="p-3.5 text-center font-bold text-emerald-400">{formatCurrency(r.closingValue, organization.currency, locale)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {stockBalanceRows.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-950 font-mono font-bold text-xs text-white border-t border-slate-700">
                      <td colSpan={4} className="p-3.5 font-sans">{isAr ? "الإجمالي العام:" : "Totals:"}</td>
                      <td className="p-3.5 text-center text-slate-300">{totalSbOpeningQty}</td>
                      <td className="p-3.5 text-center text-emerald-400">+{totalSbInQty}</td>
                      <td className="p-3.5 text-center text-rose-400">-{totalSbOutQty}</td>
                      <td className="p-3.5 text-center text-white">{totalSbClosingQty}</td>
                      <td className="p-3.5 text-center text-slate-400">---</td>
                      <td className="p-3.5 text-center text-emerald-400 font-black">{formatCurrency(totalSbClosingVal, organization.currency, locale)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PRODUCT CHANGE HISTORY AUDIT REPORT                                     */}
      {/* ========================================================================= */}
      {selectedReport === "change_history" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800 print:hidden">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">{isAr ? "الصنف:" : "Product:"}</label>
              <select
                value={chProductId}
                onChange={(e) => setChProductId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
              >
                <option value="all">{isAr ? "جميع الأصناف" : "All Products"}</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.nameAr} ({p.sku})</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">{isAr ? "نوع التعديل:" : "Change Type:"}</label>
              <select
                value={chChangeType}
                onChange={(e) => setChChangeType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
              >
                <option value="all">{isAr ? "جميع العمليات" : "All Changes"}</option>
                <option value="name">{isAr ? "تعديل الاسم" : "Name Change"}</option>
                <option value="price">{isAr ? "تعديل الأسعار" : "Price Change"}</option>
                <option value="category">{isAr ? "تعديل التصنيف" : "Category Change"}</option>
                <option value="stock_adjustment">{isAr ? "تسوية المخزون" : "Stock Adjustment"}</option>
                <option value="image">{isAr ? "تعديل الصورة" : "Image Change"}</option>
                <option value="created">{isAr ? "إنشاء منتج جديد" : "Created"}</option>
                <option value="deleted">{isAr ? "حذف منتج" : "Deleted"}</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">{isAr ? "من تاريخ:" : "From Date:"}</label>
              <input
                type="date"
                value={chDateFrom}
                onChange={(e) => setChDateFrom(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">{isAr ? "إلى تاريخ:" : "To Date:"}</label>
              <input
                type="date"
                value={chDateTo}
                onChange={(e) => setChDateTo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Export Bar */}
          <div className="flex justify-between items-center bg-slate-900/60 p-3 rounded-2xl border border-slate-800 print:hidden">
            <span className="text-xs text-slate-400 font-semibold">
              {isAr ? `إجمالي ${filteredChangeLogs.length} سجل تعديل مسجل` : `Total ${filteredChangeLogs.length} audit logs`}
            </span>
            <button
              onClick={handleExportChangeHistoryExcel}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl text-xs font-bold transition-colors border border-slate-700 shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>{isAr ? "تصدير إلى Excel (CSV)" : "Export CSV"}</span>
            </button>
          </div>

          {/* History Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                    <th className="p-3.5 rounded-r-lg font-mono">{isAr ? "الوقت والتاريخ" : "Timestamp"}</th>
                    <th className="p-3.5">{isAr ? "المستخدم" : "User"}</th>
                    <th className="p-3.5">{isAr ? "الصنف" : "Product"}</th>
                    <th className="p-3.5">{isAr ? "نوع التعديل" : "Change Type"}</th>
                    <th className="p-3.5">{isAr ? "الحقل / البيان" : "Field Name"}</th>
                    <th className="p-3.5 text-rose-400">{isAr ? "القيمة السابقة" : "Old Value"}</th>
                    <th className="p-3.5 rounded-l-lg text-emerald-400">{isAr ? "القيمة الجديدة" : "New Value"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredChangeLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-500 font-sans">
                        {isAr ? "لا توجد تعديلات مسجلة تطابق الشروط" : "No product change logs found"}
                      </td>
                    </tr>
                  ) : (
                    filteredChangeLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3.5 font-mono text-slate-400 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{log.createdAt}</span>
                        </td>
                        <td className="p-3.5 font-bold text-white">{log.userName}</td>
                        <td className="p-3.5">
                          <div className="font-bold text-white">{log.productName}</div>
                          <div className="font-mono text-[10px] text-slate-500">{log.productSku}</div>
                        </td>
                        <td className="p-3.5 font-mono">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-emerald-400 border border-slate-700 text-[11px] font-bold">
                            {log.changeType}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-300 font-semibold">{log.fieldName}</td>
                        <td className="p-3.5 font-mono text-rose-400/90 bg-rose-500/5">{log.oldValue || "---"}</td>
                        <td className="p-3.5 font-mono text-emerald-400 bg-emerald-500/5 font-bold">{log.newValue || "---"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PERIOD-END INVENTORY CLOSING & COGS VALUATION                          */}
      {/* ========================================================================= */}
      {selectedReport === "period_closing" && (
        <div className="space-y-6">
          {/* COGS Formula Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 p-6 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-emerald-400" />
                  <span>{isAr ? "معادلة احتساب تكلفة البضاعة المباعة (COGS Formula)" : "Cost of Goods Sold (COGS)"}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  COGS = {isAr ? "مخزون أول المدة + صافي المشتريات - مخزون آخر المدة" : "Opening Stock + Net Purchases - Closing Stock"}
                </p>
              </div>

              {canManageClosing && (
                <button
                  onClick={() => setIsClosingModalOpen(true)}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-all text-xs flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isAr ? "إجراء إقفال مخزون جديد" : "Execute Period Closing"}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-400 block font-medium">{isAr ? "1. مخزون أول المدة:" : "1. Opening Inventory:"}</span>
                <span className="text-lg font-black font-mono text-white mt-1 block">
                  {formatCurrency(openingInventoryValue, organization.currency, locale)}
                </span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-400 block font-medium">{isAr ? "2. (+) صافي المشتريات:" : "2. (+) Purchases:"}</span>
                <span className="text-lg font-black font-mono text-sky-400 mt-1 block">
                  +{formatCurrency(purchasesValue, organization.currency, locale)}
                </span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-400 block font-medium">{isAr ? "3. (-) مخزون آخر المدة:" : "3. (-) Closing Inventory:"}</span>
                <span className="text-lg font-black font-mono text-amber-400 mt-1 block">
                  -{formatCurrency(closingInventoryValue, organization.currency, locale)}
                </span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-xs text-emerald-400 block font-bold">{isAr ? "(=) تكلفة المبيعات المحتسبة:" : "(=) Resulting COGS:"}</span>
                <span className="text-lg font-black font-mono text-emerald-400 mt-1 block">
                  {formatCurrency(periodicCOGS, organization.currency, locale)}
                </span>
              </div>
            </div>
          </div>

          {/* Period Closings Log Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3">
              {isAr ? "سجل الفترات المقفلة محاسبياً:" : "Executed Period Closings History:"}
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                    <th className="p-3.5 rounded-r-lg">{isAr ? "الفترة" : "Period Label"}</th>
                    <th className="p-3.5">{isAr ? "النوع" : "Type"}</th>
                    <th className="p-3.5 font-mono">{isAr ? "تاريخ الإقفال" : "Closing Date"}</th>
                    <th className="p-3.5 text-center font-mono">{isAr ? "مخزون أول المدة" : "Opening Value"}</th>
                    <th className="p-3.5 text-center font-mono">{isAr ? "المشتريات" : "Purchases"}</th>
                    <th className="p-3.5 text-center font-mono text-amber-400">{isAr ? "مخزون آخر المدة" : "Closing Value"}</th>
                    <th className="p-3.5 text-center font-mono text-emerald-400">{isAr ? "تكلفة المبيعات (COGS)" : "COGS Value"}</th>
                    <th className="p-3.5 rounded-l-lg">{isAr ? "المسؤول" : "Closed By"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {periodClosings.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500 font-sans">
                        {isAr ? "لم يتم إجراء إقفالات فترية حتى الآن. انقر على زر إجراء إقفال مخزون جديد بالأعلى." : "No period closings recorded yet"}
                      </td>
                    </tr>
                  ) : (
                    periodClosings.map(pc => (
                      <tr key={pc.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3.5 font-sans font-bold text-white">{pc.periodLabel}</td>
                        <td className="p-3.5 font-sans">
                          <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-bold border border-slate-700">
                            {pc.periodType === "monthly" && (isAr ? "شهري" : "Monthly")}
                            {pc.periodType === "quarterly" && (isAr ? "ربع سنوي" : "Quarterly")}
                            {pc.periodType === "yearly" && (isAr ? "سنوي" : "Yearly")}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-300">{formatDate(pc.closingDate, locale)}</td>
                        <td className="p-3.5 text-center text-slate-300">{formatCurrency(pc.openingInventoryValue, organization.currency, locale)}</td>
                        <td className="p-3.5 text-center text-slate-300">{formatCurrency(pc.purchasesValue, organization.currency, locale)}</td>
                        <td className="p-3.5 text-center font-bold text-amber-400">{formatCurrency(pc.closingInventoryValue, organization.currency, locale)}</td>
                        <td className="p-3.5 text-center font-black text-emerald-400">{formatCurrency(pc.cogsValue, organization.currency, locale)}</td>
                        <td className="p-3.5 font-sans text-slate-400">{pc.createdBy}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Period Closing Modal */}
          <Modal
            isOpen={isClosingModalOpen}
            onClose={() => setIsClosingModalOpen(false)}
            title={isAr ? "إجراء إقفال المخزون والفترة المالية وتوليد القيد" : "Period-End Inventory Closing"}
            maxWidth="lg"
          >
            <form onSubmit={handleExecutePeriodClosing} className="space-y-4 text-xs">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400">
                {isAr
                  ? "سيقوم النظام باحتساب قيمة مخزون آخر المدة تلقائياً وتوليد قيد إقفال تكلفة البضاعة المباعة لدفتر الأستاذ."
                  : "This will generate the period-end closing journal entry for COGS and inventory valuation."}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">{isAr ? "دورية الإقفال *" : "Period Type *"}</label>
                  <select
                    value={closingPeriodType}
                    onChange={(e: any) => setClosingPeriodType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-semibold"
                  >
                    <option value="monthly">{isAr ? "إقفال شهري (Monthly)" : "Monthly"}</option>
                    <option value="quarterly">{isAr ? "إقفال ربع سنوي (Quarterly)" : "Quarterly"}</option>
                    <option value="yearly">{isAr ? "إقفال سنوي نهائي (Yearly)" : "Yearly"}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">{isAr ? "تسمية الفترة *" : "Period Label *"}</label>
                  <input
                    type="text"
                    required
                    value={closingPeriodLabel}
                    onChange={(e) => setClosingPeriodLabel(e.target.value)}
                    placeholder="2026-08 / Q3 2026 / Year 2026"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-slate-400 font-semibold mb-1">{isAr ? "تاريخ الإقفال *" : "Closing Date *"}</label>
                  <input
                    type="date"
                    required
                    value={closingDate}
                    onChange={(e) => setClosingDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-slate-400 font-semibold mb-1">{isAr ? "ملاحظات الإقفال:" : "Notes:"}</label>
                  <input
                    type="text"
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    placeholder={isAr ? "إقفال المخزون وتكلفة المبيعات..." : "Closing notes..."}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              {/* Calculated Values Preview */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <span className="font-bold text-white text-xs block">{isAr ? "ملخص القيم المحتسبة للإقفال:" : "Closing Values Preview:"}</span>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="flex justify-between border-b border-slate-800 pb-1">
                    <span className="text-slate-400 font-sans">{isAr ? "مخزون آخر المدة:" : "Closing Inventory:"}</span>
                    <span className="text-white font-bold">{formatCurrency(closingInventoryValue, organization.currency, locale)}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-1">
                    <span className="text-slate-400 font-sans">{isAr ? "تكلفة المبيعات (COGS):" : "COGS:"}</span>
                    <span className="text-emerald-400 font-bold">{formatCurrency(periodicCOGS, organization.currency, locale)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsClosingModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg"
                >
                  {isAr ? "تأكيد الإقفال وترحيل القيد" : "Confirm Closing & Post Entry"}
                </button>
              </div>
            </form>
          </Modal>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. VAT RETURN REPORT                                                      */}
      {/* ========================================================================= */}
      {selectedReport === "vat" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white">{isAr ? "نموذج إقرار ضريبة القيمة المضافة الدوري" : "Periodic VAT Return"}</h2>
              <div className="text-xs text-slate-400 mt-0.5">
                {isAr ? "الرقم الضريبي للمنشأة: " : "Tax ID: "} <span className="font-mono text-emerald-400 font-bold">{organization.taxNumber}</span>
              </div>
            </div>
            <div className="text-left">
              <span className="text-xs text-slate-500 block">{isAr ? "صافي الضريبة الواجبة السداد:" : "Net VAT Payable:"}</span>
              <span className="text-2xl font-black font-mono text-emerald-400">
                {formatCurrency(netVatPayable, organization.currency, locale)}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              {isAr ? "1. المخرجات (المبيعات الخاضعة للضريبة)" : "1. Output VAT (Sales)"}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-slate-400 font-bold">
                    <th className="p-3 rounded-r-lg">{isAr ? "البند" : "Item"}</th>
                    <th className="p-3 text-center font-mono">{isAr ? "المبلغ الخاضع للضريبة" : "Taxable Amount"}</th>
                    <th className="p-3 text-center font-mono">{isAr ? "نسبة الضريبة" : "Rate"}</th>
                    <th className="p-3 rounded-l-lg text-center font-mono text-emerald-400">{isAr ? "مبلغ الضريبة" : "VAT Amount"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  <tr>
                    <td className="p-3 font-sans font-semibold text-white">{isAr ? "المبيعات المحلية القياسية" : "Standard Rated Sales"}</td>
                    <td className="p-3 text-center text-slate-200">{formatCurrency(totalSalesTaxable, organization.currency, locale)}</td>
                    <td className="p-3 text-center text-emerald-400">%{organization.defaultVatRate}</td>
                    <td className="p-3 text-center font-bold text-emerald-400">{formatCurrency(totalSalesVat, organization.currency, locale)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider pt-4">
              {isAr ? "2. المدخلات (المشتريات القابلة للخصم)" : "2. Input VAT (Purchases)"}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-slate-400 font-bold">
                    <th className="p-3 rounded-r-lg">{isAr ? "البند" : "Item"}</th>
                    <th className="p-3 text-center font-mono">{isAr ? "المبلغ الخاضع للضريبة" : "Taxable Amount"}</th>
                    <th className="p-3 text-center font-mono">{isAr ? "نسبة الضريبة" : "Rate"}</th>
                    <th className="p-3 rounded-l-lg text-center font-mono text-sky-400">{isAr ? "مبلغ الضريبة المخصوم" : "Recoverable VAT"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  <tr>
                    <td className="p-3 font-sans font-semibold text-white">{isAr ? "المشتريات المحلية القياسية" : "Standard Rated Purchases"}</td>
                    <td className="p-3 text-center text-slate-200">{formatCurrency(totalPurchasesTaxable, organization.currency, locale)}</td>
                    <td className="p-3 text-center text-sky-400">%{organization.defaultVatRate}</td>
                    <td className="p-3 text-center font-bold text-sky-400">{formatCurrency(totalPurchasesVat, organization.currency, locale)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. INVENTORY VALUATION SUMMARY REPORT                                     */}
      {/* ========================================================================= */}
      {selectedReport === "inventory" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                  <th className="p-3.5 rounded-r-lg">{isAr ? "كود SKU" : "SKU"}</th>
                  <th className="p-3.5">{isAr ? "اسم الصنف" : "Item Name"}</th>
                  <th className="p-3.5 text-center font-mono">{isAr ? "الكمية المتاحة" : "Qty on Hand"}</th>
                  <th className="p-3.5 text-center font-mono">{isAr ? "تكلفة الوحدة" : "Unit Cost"}</th>
                  <th className="p-3.5 text-center font-mono">{isAr ? "سعر البيع" : "Selling Price"}</th>
                  <th className="p-3.5 text-center font-mono text-emerald-400">{isAr ? "قيمة المخزون بالتكلفة" : "Total Cost Value"}</th>
                  <th className="p-3.5 rounded-l-lg text-center font-mono text-sky-400">{isAr ? "القيمة البيعية المتوقعة" : "Retail Value"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {products.map(p => {
                  const qty = Object.values(p.warehouseStock || {}).reduce((a, b) => a + b, 0);
                  const costVal = qty * p.costPrice;
                  const sellVal = qty * p.sellingPrice;

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/30">
                      <td className="p-3.5 text-slate-400 font-bold">{p.sku}</td>
                      <td className="p-3.5 font-sans font-bold text-white">{isAr ? p.nameAr : p.nameEn}</td>
                      <td className="p-3.5 text-center text-white">{qty}</td>
                      <td className="p-3.5 text-center text-slate-300">{formatCurrency(p.costPrice, organization.currency, locale)}</td>
                      <td className="p-3.5 text-center text-slate-300">{formatCurrency(p.sellingPrice, organization.currency, locale)}</td>
                      <td className="p-3.5 text-center font-bold text-emerald-400">{formatCurrency(costVal, organization.currency, locale)}</td>
                      <td className="p-3.5 text-center font-bold text-sky-400">{formatCurrency(sellVal, organization.currency, locale)}</td>
                    </tr>
                  );
                })}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-500 font-sans">
                      {isAr ? "لا توجد أصناف مسجلة بالمخازن لتقييمها حالياً" : "No inventory products registered yet"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
