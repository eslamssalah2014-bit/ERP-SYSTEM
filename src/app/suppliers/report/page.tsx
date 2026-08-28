"use client";

import React, { useState, useMemo } from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  FileSpreadsheet, Search, Printer, Download, ArrowRight,
  Filter, DollarSign, ArrowUpRight, ArrowDownLeft, Building2, Truck, FileText
} from "lucide-react";

export default function SupplierBalancesReportPage() {
  const { suppliers, getSupplierBalancesReport, organization, locale } = useERP();
  const isAr = locale === "ar";

  const [fromDate, setFromDate] = useState<string>(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0]
  );
  const [toDate, setToDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [searchQuery, setSearchQuery] = useState("");

  const reportData = useMemo(() => {
    return getSupplierBalancesReport(fromDate, toDate);
  }, [fromDate, toDate, getSupplierBalancesReport]);

  const filteredRows = useMemo(() => {
    if (!searchQuery) return reportData;
    const q = searchQuery.toLowerCase();
    return reportData.filter(r =>
      (r.supplierName || "").toLowerCase().includes(q) ||
      (r.supplierCode || "").toLowerCase().includes(q)
    );
  }, [reportData, searchQuery]);

  const totalOpening = useMemo(() => filteredRows.reduce((s, r) => s + (r.openingBalance || 0), 0), [filteredRows]);
  const totalCredits = useMemo(() => filteredRows.reduce((s, r) => s + (r.creditMovements || 0), 0), [filteredRows]);
  const totalDebits = useMemo(() => filteredRows.reduce((s, r) => s + (r.debitMovements || 0), 0), [filteredRows]);
  const totalClosing = useMemo(() => filteredRows.reduce((s, r) => s + (r.currentBalance || 0), 0), [filteredRows]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = isAr
      ? ["كود المورد", "اسم المورد", "رصيد أول المدة", "حركات دائنة (مشتريات)", "حركات مدينة (سدادات/مرتجع)", "الرصيد المستحق (دائن)"]
      : ["Supplier Code", "Supplier Name", "Opening Balance", "Credit Movements", "Debit Movements", "Closing Balance"];

    const rows = filteredRows.map(r => [
      r.supplierCode,
      `"${r.supplierName.replace(/"/g, '""')}"`,
      r.openingBalance,
      r.creditMovements,
      r.debitMovements,
      r.currentBalance
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `تقرير_ارصدة_الموردين_${fromDate}_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header - Screen only */}
      <div className="print:hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <a href="/suppliers" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-xs">
              <Truck className="w-3.5 h-3.5" />
              <span>{isAr ? "دليل الموردين" : "Suppliers Directory"}</span>
            </a>
            <span className="text-slate-600">/</span>
            <span className="text-emerald-400 font-bold text-xs">{isAr ? "تقرير أرصدة الموردين" : "Balances Report"}</span>
          </div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            <span>{isAr ? "تقرير أرصدة الموردين وحسابات الدائنين" : "Supplier Balances & Payables Report"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAr ? "ميزان مراجعة تفصيلي ومجمع لجميع الموردين يوضح الأرصدة الافتتاحية والحركات الجارية وصافي المستحقات" : "Comprehensive accounts payable balance sheet and vendor movement summary"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>{isAr ? "تصدير كملف Excel / CSV" : "Export CSV"}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{isAr ? "طباعة التقرير" : "Print Report"}</span>
          </button>
        </div>
      </div>

      {/* Filters Toolbar - Screen only */}
      <div className="print:hidden bg-slate-900/80 p-4 rounded-2xl border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
        <div>
          <label className="block text-slate-400 text-xs font-semibold mb-1">{isAr ? "من تاريخ" : "From Date"}</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-slate-400 text-xs font-semibold mb-1">{isAr ? "إلى تاريخ" : "To Date"}</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-slate-400 text-xs font-semibold mb-1">{isAr ? "بحث بالمورد أو الكود" : "Search Supplier"}</label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder={isAr ? "بحث..." : "Search..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Report Document Content */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm print:bg-white print:text-black print:p-0 print:border-0 print:rounded-none space-y-6">
        {/* Letterhead */}
        <div className="flex justify-between items-start border-b border-slate-800 pb-6 print:border-slate-300">
          <div>
            <h2 className="text-xl font-bold text-white print:text-black">{organization.nameAr}</h2>
            <p className="text-xs text-slate-400 print:text-slate-600 mt-1">{organization.nameEn}</p>
            <p className="text-xs text-slate-400 print:text-slate-600">
              {isAr ? "الرقم الضريبي للمنشأة: " : "Tax ID: "}
              <span className="font-mono">{organization.taxNumber}</span>
            </p>
          </div>

          <div className="text-left rtl:text-left space-y-1">
            <span className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-400 print:text-black print:border print:border-slate-400 rounded-lg text-xs font-bold">
              {isAr ? "تقرير أرصدة الموردين الشامل" : "SUPPLIER BALANCES REPORT"}
            </span>
            <p className="text-xs text-slate-400 print:text-slate-600">
              {isAr ? "تاريخ التقرير: " : "Report Date: "}
              <span className="font-mono">{formatDate(new Date().toISOString(), locale)}</span>
            </p>
            <p className="text-xs text-slate-400 print:text-slate-600">
              {isAr ? "الفترة من: " : "Period: "}
              <span className="font-mono">{fromDate}</span> {isAr ? "إلى: " : "to "} <span className="font-mono">{toDate}</span>
            </p>
          </div>
        </div>

        {/* KPI Aggregate Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-950 print:bg-slate-100 rounded-2xl border border-slate-800 print:border-slate-300">
            <span className="text-slate-400 print:text-slate-700 text-xs block mb-1">{isAr ? "إجمالي الأرصدة الافتتاحية" : "Total Opening Balances"}</span>
            <span className="text-base font-black font-mono text-slate-200 print:text-black">
              {formatCurrency(totalOpening, organization.currency, locale)}
            </span>
          </div>

          <div className="p-4 bg-slate-950 print:bg-slate-100 rounded-2xl border border-slate-800 print:border-slate-300">
            <span className="text-slate-400 print:text-slate-700 text-xs block mb-1">{isAr ? "إجمالي الحركات الدائنة (+ مشتريات)" : "Total Credits (Purchases)"}</span>
            <span className="text-base font-black font-mono text-sky-400 print:text-black">
              {formatCurrency(totalCredits, organization.currency, locale)}
            </span>
          </div>

          <div className="p-4 bg-slate-950 print:bg-slate-100 rounded-2xl border border-slate-800 print:border-slate-300">
            <span className="text-slate-400 print:text-slate-700 text-xs block mb-1">{isAr ? "إجمالي الحركات المدينة (- سداد/مرتجع)" : "Total Debits (Payments)"}</span>
            <span className="text-base font-black font-mono text-emerald-400 print:text-black">
              {formatCurrency(totalDebits, organization.currency, locale)}
            </span>
          </div>

          <div className="p-4 bg-emerald-950/40 print:bg-slate-200 rounded-2xl border border-emerald-800/60 print:border-slate-400">
            <span className="text-emerald-300 print:text-slate-900 text-xs font-bold block mb-1">{isAr ? "صافي الديون المستحقة للموردين" : "Net Outstanding Payables"}</span>
            <span className="text-lg font-black font-mono text-emerald-400 print:text-black">
              {formatCurrency(totalClosing, organization.currency, locale)}
            </span>
          </div>
        </div>

        {/* Report Table */}
        <div className="overflow-x-auto border border-slate-800 print:border-slate-300 rounded-2xl">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-800 text-slate-300 print:bg-slate-200 print:text-black font-bold border-b border-slate-700 print:border-slate-300">
                <th className="p-3">#</th>
                <th className="p-3">{isAr ? "كود المورد" : "Supplier Code"}</th>
                <th className="p-3">{isAr ? "اسم المورد" : "Supplier Name"}</th>
                <th className="p-3 text-center font-mono">{isAr ? "رصيد أول المدة" : "Opening Balance"}</th>
                <th className="p-3 text-center font-mono">{isAr ? "حركات دائنة (+)" : "Credits"}</th>
                <th className="p-3 text-center font-mono">{isAr ? "حركات مدينة (-)" : "Debits"}</th>
                <th className="p-3 text-left font-mono">{isAr ? "الرصيد القائم (دائن)" : "Current Due"}</th>
                <th className="p-3 text-center print:hidden">{isAr ? "كشف الحساب" : "Statement"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 print:divide-slate-300">
              {filteredRows.map((row, idx) => (
                <tr key={row.supplierId} className="hover:bg-slate-800/30 print:hover:bg-transparent">
                  <td className="p-3 text-slate-500 font-mono">{idx + 1}</td>
                  <td className="p-3 font-mono font-bold text-sky-400 print:text-black">{row.supplierCode}</td>
                  <td className="p-3 font-bold text-white print:text-black">{row.supplierName}</td>
                  <td className="p-3 text-center font-mono text-slate-300 print:text-black">
                    {formatCurrency(row.openingBalance, organization.currency, locale)}
                  </td>
                  <td className="p-3 text-center font-mono text-sky-400 print:text-black">
                    {formatCurrency(row.creditMovements, organization.currency, locale)}
                  </td>
                  <td className="p-3 text-center font-mono text-emerald-400 print:text-black">
                    {formatCurrency(row.debitMovements, organization.currency, locale)}
                  </td>
                  <td className="p-3 text-left font-mono font-black text-rose-400 print:text-black">
                    {formatCurrency(row.currentBalance, organization.currency, locale)}
                  </td>
                  <td className="p-3 text-center print:hidden">
                    <a
                      href={`/suppliers/statement?id=${row.supplierId}`}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-sky-600 hover:text-white text-sky-400 font-bold rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      <FileText className="w-3 h-3" />
                      <span>{isAr ? "كشف" : "Statement"}</span>
                    </a>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-500 print:text-slate-600 font-bold">
                    {isAr ? "لا توجد سجلات موردين مطابقة" : "No suppliers match the filter"}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-800/90 print:bg-slate-200 font-black border-t-2 border-slate-700 print:border-slate-400 text-white print:text-black">
                <td colSpan={3} className="p-3 text-left">{isAr ? "المجموع الكلي:" : "Total Summary:"}</td>
                <td className="p-3 text-center font-mono">{formatCurrency(totalOpening, organization.currency, locale)}</td>
                <td className="p-3 text-center font-mono text-sky-400 print:text-black">{formatCurrency(totalCredits, organization.currency, locale)}</td>
                <td className="p-3 text-center font-mono text-emerald-400 print:text-black">{formatCurrency(totalDebits, organization.currency, locale)}</td>
                <td className="p-3 text-left font-mono text-rose-400 print:text-black">{formatCurrency(totalClosing, organization.currency, locale)}</td>
                <td className="print:hidden"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Signature block for print */}
        <div className="pt-8 border-t border-slate-800 print:border-slate-300 flex justify-between items-center text-xs text-slate-400 print:text-slate-700">
          <div>
            <p className="font-bold text-white print:text-black">{isAr ? "إعداد المحاسب المسؤول:" : "Prepared By:"}</p>
            <p className="mt-6">_______________________</p>
          </div>
          <div>
            <p className="font-bold text-white print:text-black">{isAr ? "مراجعة رئيس الحسابات:" : "Reviewed By:"}</p>
            <p className="mt-6">_______________________</p>
          </div>
          <div>
            <p className="font-bold text-white print:text-black">{isAr ? "اعتماد المدير المالي:" : "Approved By CFO:"}</p>
            <p className="mt-6">_______________________</p>
          </div>
        </div>
      </div>
    </div>
  );
}
