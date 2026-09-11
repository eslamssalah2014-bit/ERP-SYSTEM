"use client";

import React from "react";
import { useERP } from "@/context/erp-context";
import { computeIncomeStatement } from "@/lib/accounting-engine";
import { formatCurrency } from "@/lib/utils";
import { exportTableToExcel } from "@/lib/excel-export";
import { ReportPrintHeader, ReportPrintFooter } from "@/components/ui/ReportPrintHeader";
import TableSkeleton from "@/components/ui/TableSkeleton";
import { TrendingUp, Printer, Package, ArrowDownRight, Layers, FileText, Download } from "lucide-react";

export default function IncomeStatementPage() {
  const { accounts, journalEntries, products, purchaseInvoices, stockMovements, organization, locale, isLoadingData } = useERP();
  const isAr = locale === "ar";

  if (isLoadingData) {
    return <TableSkeleton rows={6} columns={4} summaryCards={3} isAr={isAr} />;
  }

  const {
    revenues, cogs, expenses, totalRevenue, totalCOGS, grossProfit,
    totalExpenses, netIncome, openingInventoryValue, purchasesValue,
    closingInventoryValue, periodicCOGS
  } = computeIncomeStatement(accounts, journalEntries, products, purchaseInvoices, stockMovements);

  const handleExportExcel = () => {
    exportTableToExcel("income-statement-table", {
      filename: `قائمة_الدخل_والأرباح_والخسائر_${new Date().toISOString().split("T")[0]}`,
      sheetName: isAr ? "قائمة الدخل" : "Income Statement"
    });
  };

  return (
    <div className="space-y-6">
      {/* Printable Report Header */}
      <ReportPrintHeader
        organization={organization}
        reportTitleAr="قائمة الدخل والأرباح والخسائر الرسمية (P&L)"
        reportTitleEn="Official Income Statement (Profit & Loss)"
        locale={locale}
        extraMeta="تقرير الأداء المالي النهائي"
      />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm print:hidden">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <TrendingUp className="w-6 h-6 text-emerald-400" />
            <span>{isAr ? "قائمة الدخل والأرباح والخسائر (Income Statement / P&L)" : "Income Statement (P&L)"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? "تقرير الأداء المالي وصافي الربح التشغيلي للفترة مع معادلة احتساب تكلفة المبيعات الدورية"
              : "Financial performance, gross margin, operating profit, and periodic COGS breakdown"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>{isAr ? "تصدير Excel (XLSX)" : "Export Excel"}</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/60 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{isAr ? "طباعة التقرير" : "Print P&L"}</span>
          </button>
        </div>
      </div>

      {/* Net Profit / Loss Highlight Card */}
      <div className={`p-6 rounded-3xl border flex items-center justify-between transition-all ${
        netIncome > 0
          ? "bg-gradient-to-r from-slate-900 to-emerald-950/40 border-emerald-500/30"
          : netIncome < 0
          ? "bg-gradient-to-r from-slate-900 to-rose-950/40 border-rose-500/30"
          : "bg-slate-900 border-slate-800"
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 block">
              {isAr ? "صافي الربح / الخسارة (Net Profit / Loss):" : "Net Profit / Loss:"}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              netIncome > 0
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : netIncome < 0
                ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                : "bg-slate-800 text-slate-400 border-slate-700"
            }`}>
              {netIncome > 0
                ? (isAr ? "ربح / Profit" : "Profit")
                : netIncome < 0
                ? (isAr ? "خسارة / Loss" : "Loss")
                : (isAr ? "متعادل / Neutral" : "Neutral")}
            </span>
          </div>
          <span className={`text-3xl font-black font-mono mt-1.5 block ${
            netIncome > 0
              ? "text-emerald-400"
              : netIncome < 0
              ? "text-rose-400"
              : "text-slate-300"
          }`}>
            {formatCurrency(netIncome, organization.currency, locale)}
          </span>
        </div>
        <div className="text-left">
          <span className="text-xs font-bold text-slate-400 block">{isAr ? "مجمل الربح (Gross Profit):" : "Gross Profit:"}</span>
          <span className="text-xl font-black text-white font-mono mt-1 block">
            {formatCurrency(grossProfit, organization.currency, locale)}
          </span>
        </div>
      </div>

      {/* Periodic Inventory COGS Analysis Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Package className="w-4 h-4 text-emerald-400" />
          <span>{isAr ? "تحليل تكلفة البضاعة المباعة الدوري (Periodic Inventory COGS Model)" : "Periodic Inventory Valuation Breakdown"}</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-slate-400 block text-[11px] font-medium">
              {isAr ? "مخزون أول المدة (من القيد الافتتاحي):" : "Opening Stock (from Opening Entry):"}
            </span>
            <span className="text-sm font-black font-mono text-emerald-400 mt-1 block">
              {formatCurrency(openingInventoryValue, organization.currency, locale)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {isAr ? "حساب 1103 (قيد أول المدة)" : "GL 1103 Opening Entry"}
            </span>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-slate-400 block text-[11px] font-medium">{isAr ? "(+) صافي المشتريات:" : "(+) Purchases:"}</span>
            <span className="text-sm font-black font-mono text-sky-400 mt-1 block">
              +{formatCurrency(purchasesValue, organization.currency, locale)}
            </span>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-slate-400 block text-[11px] font-medium">{isAr ? "(-) مخزون آخر المدة:" : "(-) Closing Stock Value:"}</span>
            <span className="text-sm font-black font-mono text-amber-400 mt-1 block">
              -{formatCurrency(closingInventoryValue, organization.currency, locale)}
            </span>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-emerald-400 block text-[11px] font-bold">{isAr ? "(=) تكلفة المبيعات المحتسبة:" : "(=) Resulting Periodic COGS:"}</span>
            <span className="text-sm font-black font-mono text-emerald-400 mt-1 block">
              {formatCurrency(periodicCOGS, organization.currency, locale)}
            </span>
          </div>
        </div>
      </div>

      {/* P&L Statement Comprehensive Table (Exportable & Printable) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table id="income-statement-table" className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-800/90 text-slate-300 font-bold border-b border-slate-700">
                <th className="p-3.5 w-32 font-mono">{isAr ? "كود الحساب" : "Code"}</th>
                <th className="p-3.5">{isAr ? "البند المحاسبي / بيان قائمة الدخل" : "P&L Line Item"}</th>
                <th className="p-3.5 text-left font-mono w-40">{isAr ? "المبلغ الجزئي" : "Amount"}</th>
                <th className="p-3.5 text-left font-mono w-44">{isAr ? "المبلغ الإجمالي" : "Total"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {/* 1. Revenues */}
              <tr className="bg-emerald-950/30 font-bold text-emerald-400">
                <td colSpan={4} className="p-3">
                  {isAr ? "1. الإيرادات والمبيعات (Revenues)" : "1. Revenues"}
                </td>
              </tr>
              {revenues.map(acc => (
                <tr key={acc.id} className="hover:bg-slate-800/30 font-mono">
                  <td className="p-3 text-slate-400">{acc.code}</td>
                  <td className="p-3 font-sans text-white">{isAr ? acc.nameAr : acc.nameEn}</td>
                  <td className="p-3 text-left text-slate-200">{formatCurrency(acc.balance, organization.currency, locale)}</td>
                  <td className="p-3 text-left text-slate-500">-</td>
                </tr>
              ))}
              <tr className="bg-slate-850 font-bold border-t border-slate-700 text-emerald-400 font-mono">
                <td colSpan={3} className="p-3 font-sans text-right">{isAr ? "إجمالي الإيرادات والمبيعات:" : "Total Revenues:"}</td>
                <td className="p-3 text-left">{formatCurrency(totalRevenue, organization.currency, locale)}</td>
              </tr>

              {/* 2. COGS */}
              <tr className="bg-sky-950/30 font-bold text-sky-400">
                <td colSpan={4} className="p-3">
                  {isAr ? "2. تكلفة البضاعة المباعة (Cost of Goods Sold - COGS)" : "2. Cost of Goods Sold"}
                </td>
              </tr>
              {cogs.map(acc => (
                <tr key={acc.id} className="hover:bg-slate-800/30 font-mono">
                  <td className="p-3 text-slate-400">{acc.code}</td>
                  <td className="p-3 font-sans text-white">{isAr ? acc.nameAr : acc.nameEn}</td>
                  <td className="p-3 text-left text-slate-200">{formatCurrency(acc.balance, organization.currency, locale)}</td>
                  <td className="p-3 text-left text-slate-500">-</td>
                </tr>
              ))}
              <tr className="bg-slate-850 font-bold border-t border-slate-700 text-sky-400 font-mono">
                <td colSpan={3} className="p-3 font-sans text-right">{isAr ? "إجمالي تكلفة البضاعة المباعة:" : "Total COGS:"}</td>
                <td className="p-3 text-left">({formatCurrency(totalCOGS, organization.currency, locale)})</td>
              </tr>

              {/* Gross Margin */}
              <tr className="bg-slate-800 font-black text-white border-t-2 border-b-2 border-slate-700 font-mono text-sm">
                <td colSpan={3} className="p-3.5 font-sans text-right">{isAr ? "مجمل الربح / هامش الربح الإجمالي (Gross Profit):" : "Gross Profit:"}</td>
                <td className="p-3.5 text-left text-emerald-400">{formatCurrency(grossProfit, organization.currency, locale)}</td>
              </tr>

              {/* 3. Operating Expenses */}
              <tr className="bg-amber-950/30 font-bold text-amber-400">
                <td colSpan={4} className="p-3">
                  {isAr ? "3. المصروفات التشغيلية والإدارية والعمومية (Operating Expenses)" : "3. Operating Expenses"}
                </td>
              </tr>
              {expenses.map(acc => (
                <tr key={acc.id} className="hover:bg-slate-800/30 font-mono">
                  <td className="p-3 text-slate-400">{acc.code}</td>
                  <td className="p-3 font-sans text-white">{isAr ? acc.nameAr : acc.nameEn}</td>
                  <td className="p-3 text-left text-slate-200">{formatCurrency(acc.balance, organization.currency, locale)}</td>
                  <td className="p-3 text-left text-slate-500">-</td>
                </tr>
              ))}
              <tr className="bg-slate-850 font-bold border-t border-slate-700 text-amber-400 font-mono">
                <td colSpan={3} className="p-3 font-sans text-right">{isAr ? "إجمالي المصروفات التشغيلية:" : "Total Operating Expenses:"}</td>
                <td className="p-3 text-left">({formatCurrency(totalExpenses, organization.currency, locale)})</td>
              </tr>

              {/* Net Profit / Loss */}
              <tr className={`font-black font-mono text-base border-t-2 border-slate-600 ${
                netIncome >= 0 ? "bg-emerald-950/40 text-emerald-400" : "bg-rose-950/40 text-rose-400"
              }`}>
                <td colSpan={3} className="p-4 font-sans text-right">
                  {isAr ? "صافي الدخل / الأرباح (الخسائر) الصافية للفترة:" : "Net Income (Profit / Loss):"}
                </td>
                <td className="p-4 text-left">
                  {formatCurrency(netIncome, organization.currency, locale)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Report Footer */}
      <ReportPrintFooter organization={organization} />
    </div>
  );
}
