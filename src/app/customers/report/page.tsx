"use client";

import React, { useState, useMemo } from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency } from "@/lib/utils";
import TableSkeleton from "@/components/ui/TableSkeleton";
import {
  FileSpreadsheet, Download, Printer, Search, Tag, Filter,
  Users, TrendingUp, ArrowUpRight, ArrowDownLeft, FileText, ArrowRight
} from "lucide-react";

export default function CustomerBalancesReportPage() {
  const {
    customers, customerCategories, getCustomerBalancesReport,
    organization, locale, isLoadingData
  } = useERP();

  const isAr = locale === "ar";
  const [fromDate, setFromDate] = useState("2026-01-01");
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const reportData = useMemo(() => {
    return getCustomerBalancesReport(fromDate, toDate, selectedCategory);
  }, [getCustomerBalancesReport, fromDate, toDate, selectedCategory]);

  const filteredData = useMemo(() => {
    if (!searchQuery) return reportData;
    const q = searchQuery.toLowerCase();
    return reportData.filter(r =>
      r.customerName.toLowerCase().includes(q) ||
      (r.categoryName || "").toLowerCase().includes(q)
    );
  }, [reportData, searchQuery]);

  const totalOpening = useMemo(() => filteredData.reduce((s, r) => s + r.openingBalance, 0), [filteredData]);
  const totalDebit = useMemo(() => filteredData.reduce((s, r) => s + r.debitMovements, 0), [filteredData]);
  const totalCredit = useMemo(() => filteredData.reduce((s, r) => s + r.creditMovements, 0), [filteredData]);
  const totalCurrent = useMemo(() => filteredData.reduce((s, r) => s + r.currentBalance, 0), [filteredData]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let csv = "\uFEFF";
    csv += `${isAr ? "تقرير أرصدة وحركات العملاء" : "Customer Balances Report"}\n`;
    csv += `${isAr ? "الفترة من" : "Period From"}: ${fromDate} ${isAr ? "إلى" : "To"}: ${toDate}\n\n`;
    csv += `${isAr ? "اسم العميل,التصنيف,رصيد أول المدة,حركات مدينة (+),حركات دائنة (-),الرصيد الحالي\n" : "Customer Name,Category,Opening Balance,Debit (+),Credit (-),Current Balance\n"}`;

    filteredData.forEach(r => {
      csv += `"${r.customerName}","${r.categoryName || "-"}","${r.openingBalance}","${r.debitMovements}","${r.creditMovements}","${r.currentBalance}"\n`;
    });

    csv += `\n"${isAr ? "الإجمالي العام" : "Grand Total"}","","${totalOpening}","${totalDebit}","${totalCredit}","${totalCurrent}"\n`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Customer_Balances_${fromDate}_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoadingData) {
    return <TableSkeleton rows={6} columns={7} summaryCards={4} isAr={isAr} />;
  }

  return (
    <div className="space-y-6">
      {/* Header - Hidden on Print */}
      <div className="print:hidden space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <a href="/customers" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-xs">
                <Users className="w-3.5 h-3.5" />
                <span>{isAr ? "دليل العملاء" : "Customers"}</span>
              </a>
              <span className="text-slate-600">/</span>
              <span className="text-sky-400 font-bold text-xs">{isAr ? "تقرير الأرصدة" : "Balances Report"}</span>
            </div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
              <FileSpreadsheet className="w-6 h-6 text-sky-400" />
              <span>{isAr ? "تقرير أرصدة ومسحوبات وسدادات العملاء" : "Customer Balances & Movements Report"}</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {isAr ? "كشف تجميعي شامل لأرصدة أول المدة، إجمالي المبيعات، سندات القبض، وصافي الرصيد المستحق لكل عميل" : "Aggregated balances report with opening, debit sales, credit receipts and closing balances"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-sky-400" />
              <span>{isAr ? "تصدير Excel / CSV" : "Export CSV"}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-sky-600 to-teal-500 hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-950/60 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{isAr ? "طباعة التقرير" : "Print Report"}</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-1">{isAr ? "تصنيف العميل" : "Category"}</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-sky-500"
            >
              <option value="all">{isAr ? "جميع التصنيفات" : "All Categories"}</option>
              {customerCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.nameAr}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-1">{isAr ? "من تاريخ" : "From Date"}</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-1">{isAr ? "إلى تاريخ" : "To Date"}</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-1">{isAr ? "بحث بالاسم" : "Search Name"}</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder={isAr ? "اسم العميل..." : "Customer name..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Printable Report Document */}
      <div className="bg-slate-900 print:bg-white border border-slate-800 print:border-none rounded-3xl p-6 print:p-0 shadow-sm text-xs print:text-black space-y-6">
        {/* Letterhead */}
        <div className="flex justify-between items-start border-b border-slate-800 print:border-slate-300 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white print:text-black">{organization.nameAr}</h2>
            <p className="text-slate-400 print:text-slate-600 text-xs">{organization.nameEn}</p>
          </div>
          <div className="text-left print:text-left">
            <span className="px-3 py-1 bg-sky-500/10 text-sky-400 print:text-sky-700 font-bold rounded-lg text-xs">
              {isAr ? "تقرير أرصدة ومسحوبات العملاء" : "Customer Balances Summary"}
            </span>
            <p className="text-slate-400 print:text-slate-600 mt-1 font-mono">{fromDate} ➔ {toDate}</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 bg-slate-950 print:bg-slate-50 rounded-2xl border border-slate-800 print:border-slate-200">
            <span className="text-slate-500 print:text-slate-600 block text-[11px] mb-1">{isAr ? "إجمالي أرصدة أول المدة" : "Total Opening"}</span>
            <span className="text-base font-black font-mono text-slate-200 print:text-black">
              {formatCurrency(totalOpening, organization.currency, locale)}
            </span>
          </div>
          <div className="p-4 bg-slate-950 print:bg-slate-50 rounded-2xl border border-slate-800 print:border-slate-200">
            <span className="text-slate-500 print:text-slate-600 block text-[11px] mb-1">{isAr ? "إجمالي المسحوبات (مدين +)" : "Total Debits"}</span>
            <span className="text-base font-black font-mono text-rose-400 print:text-rose-700">
              +{formatCurrency(totalDebit, organization.currency, locale)}
            </span>
          </div>
          <div className="p-4 bg-slate-950 print:bg-slate-50 rounded-2xl border border-slate-800 print:border-slate-200">
            <span className="text-slate-500 print:text-slate-600 block text-[11px] mb-1">{isAr ? "إجمالي السدادات (دائن -)" : "Total Credits"}</span>
            <span className="text-base font-black font-mono text-emerald-400 print:text-emerald-700">
              -{formatCurrency(totalCredit, organization.currency, locale)}
            </span>
          </div>
          <div className="p-4 bg-slate-950 print:bg-slate-50 rounded-2xl border border-slate-800 print:border-slate-200">
            <span className="text-slate-500 print:text-slate-600 block text-[11px] mb-1">{isAr ? "إجمالي صافي المديونيات" : "Net Receivables"}</span>
            <span className="text-base font-black font-mono text-amber-400 print:text-amber-700">
              {formatCurrency(totalCurrent, organization.currency, locale)}
            </span>
          </div>
        </div>

        {/* Report Table */}
        <div className="border border-slate-800 print:border-slate-300 rounded-2xl overflow-hidden">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-800/80 print:bg-slate-200 text-slate-300 print:text-slate-800 font-bold border-b border-slate-700 print:border-slate-300">
                <th className="p-3">#</th>
                <th className="p-3">{isAr ? "اسم العميل" : "Customer"}</th>
                <th className="p-3">{isAr ? "التصنيف" : "Category"}</th>
                <th className="p-3 text-center font-mono">{isAr ? "رصيد أول المدة" : "Opening"}</th>
                <th className="p-3 text-center font-mono">{isAr ? "حركات مدينة (مبيعات +)" : "Debit (+)"}</th>
                <th className="p-3 text-center font-mono">{isAr ? "حركات دائنة (سداد -)" : "Credit (-)"}</th>
                <th className="p-3 text-left font-mono font-bold">{isAr ? "الرصيد القائم (مدين)" : "Current Balance"}</th>
                <th className="p-3 text-center print:hidden">{isAr ? "كشف الحساب" : "Statement"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 print:divide-slate-200">
              {filteredData.map((r, idx) => (
                <tr key={r.customerId} className="hover:bg-slate-800/20 print:hover:bg-transparent">
                  <td className="p-3 text-slate-500 font-mono">{idx + 1}</td>
                  <td className="p-3 font-bold text-white print:text-black">{r.customerName}</td>
                  <td className="p-3 text-slate-400 print:text-slate-600">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 print:text-black">
                      {r.categoryName || (isAr ? "عام" : "General")}
                    </span>
                  </td>
                  <td className="p-3 text-center font-mono text-slate-300 print:text-black">
                    {formatCurrency(r.openingBalance, organization.currency, locale)}
                  </td>
                  <td className="p-3 text-center font-mono font-bold text-rose-400 print:text-rose-700">
                    {r.debitMovements > 0 ? formatCurrency(r.debitMovements, organization.currency, locale) : "-"}
                  </td>
                  <td className="p-3 text-center font-mono font-bold text-emerald-400 print:text-emerald-700">
                    {r.creditMovements > 0 ? formatCurrency(r.creditMovements, organization.currency, locale) : "-"}
                  </td>
                  <td className="p-3 text-left font-mono font-black text-amber-400 print:text-amber-700">
                    {formatCurrency(r.currentBalance, organization.currency, locale)}
                  </td>
                  <td className="p-3 text-center print:hidden">
                    <a
                      href={`/customers/statement?id=${r.customerId}`}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white rounded-lg transition-colors inline-flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                    >
                      <FileText className="w-3 h-3" />
                      <span>{isAr ? "كشف" : "View"}</span>
                    </a>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500 print:text-slate-600">
                    {isAr ? "لا توجد بيانات مطابقة لمعايير البحث" : "No data matching filters"}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-950 font-black text-white print:bg-slate-200 print:text-black border-t-2 border-slate-700 print:border-slate-400">
                <td colSpan={3} className="p-3 text-right">{isAr ? "الإجمالي العام لجميع العملاء:" : "Grand Total:"}</td>
                <td className="p-3 text-center font-mono">{formatCurrency(totalOpening, organization.currency, locale)}</td>
                <td className="p-3 text-center font-mono text-rose-400 print:text-rose-700">{formatCurrency(totalDebit, organization.currency, locale)}</td>
                <td className="p-3 text-center font-mono text-emerald-400 print:text-emerald-700">{formatCurrency(totalCredit, organization.currency, locale)}</td>
                <td className="p-3 text-left font-mono text-amber-400 print:text-amber-700">{formatCurrency(totalCurrent, organization.currency, locale)}</td>
                <td className="print:hidden"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
