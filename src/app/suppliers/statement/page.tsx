"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  FileText, Search, Printer, Download, ArrowRight, Building2,
  Calendar, Filter, User, DollarSign, ArrowUpRight, ArrowDownLeft, Truck
} from "lucide-react";

export default function SupplierStatementPage() {
  const { suppliers, getSupplierStatement, organization, locale } = useERP();
  const isAr = locale === "ar";

  // Selected Supplier & Dates
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0]
  );
  const [toDate, setToDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  // Auto select from URL search params if present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const suppId = params.get("id");
      if (suppId && suppliers.some(s => s.id === suppId)) {
        setSelectedSupplierId(suppId);
      } else if (suppliers.length > 0 && !selectedSupplierId) {
        setSelectedSupplierId(suppliers[0].id);
      }
    }
  }, [suppliers]);

  const selectedSupplier = useMemo(() => {
    return suppliers.find(s => s.id === selectedSupplierId) || suppliers[0];
  }, [suppliers, selectedSupplierId]);

  const statement = useMemo(() => {
    if (!selectedSupplier) {
      return {
        partnerId: "",
        partnerName: "",
        openingBalance: 0,
        transactions: [],
        totalDebit: 0,
        totalCredit: 0,
        closingBalance: 0,
      };
    }
    return getSupplierStatement(selectedSupplier.id, fromDate, toDate);
  }, [selectedSupplier, fromDate, toDate, getSupplierStatement]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!selectedSupplier || statement.transactions.length === 0) return;

    const headers = isAr
      ? ["التاريخ", "رقم المستند", "نوع الحركة", "البيان", "مدين (دفعات/مرتجع)", "دائن (مشتريات)", "الرصيد التراكمي (دائن)"]
      : ["Date", "Doc No", "Type", "Description", "Debit (Payments/Returns)", "Credit (Purchases)", "Running Balance"];

    const rows = statement.transactions.map(tx => [
      tx.date,
      tx.referenceNumber,
      tx.type,
      `"${tx.description.replace(/"/g, '""')}"`,
      tx.debit,
      tx.credit,
      tx.balance
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `كشف_حساب_مورد_${selectedSupplier.nameAr}_${fromDate}_${toDate}.csv`);
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
            <span className="text-sky-400 font-bold text-xs">{isAr ? "كشف الحساب التفصيلي" : "Account Statement"}</span>
          </div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-sky-400" />
            <span>{isAr ? "كشف حساب مورد تفصيلي (أستاذ المساعد)" : "Supplier Detailed Account Statement"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAr ? "عرض الحركات المالية للمورد من فواتير مشتريات وسندات صرف ومرتجعات مشتريات والرصيد التراكمي" : "Comprehensive chronological vendor ledger and balances"}
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
            className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-lg transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{isAr ? "طباعة كشف الحساب" : "Print Statement"}</span>
          </button>
        </div>
      </div>

      {/* Filters Toolbar - Screen only */}
      <div className="print:hidden bg-slate-900/80 p-4 rounded-2xl border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
        <div className="sm:col-span-2">
          <label className="block text-slate-400 text-xs font-semibold mb-1">{isAr ? "المورد المستهدف *" : "Select Supplier *"}</label>
          <select
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-bold"
          >
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>
                {s.nameAr} ({s.code}) - {isAr ? "الرصيد المستحق: " : "Balance: "} {formatCurrency(s.currentBalance, organization.currency, locale)}
              </option>
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
      </div>

      {/* Printable Statement Document */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm print:bg-white print:text-black print:p-0 print:border-0 print:rounded-none space-y-6">
        {/* Document Letterhead */}
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
            <span className="inline-block px-3 py-1 bg-sky-500/10 text-sky-400 print:text-black print:border print:border-slate-400 rounded-lg text-xs font-bold font-mono">
              {isAr ? "كشف حساب مورد معتمد" : "SUPPLIER STATEMENT"}
            </span>
            <p className="text-xs text-slate-400 print:text-slate-600">
              {isAr ? "تاريخ الإصدار: " : "Issued At: "}
              <span className="font-mono">{formatDate(new Date().toISOString(), locale)}</span>
            </p>
            <p className="text-xs text-slate-400 print:text-slate-600">
              {isAr ? "الفترة من: " : "Period: "}
              <span className="font-mono">{fromDate}</span> {isAr ? "إلى: " : "to "} <span className="font-mono">{toDate}</span>
            </p>
          </div>
        </div>

        {/* Supplier Profile Information Card */}
        {selectedSupplier && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-950/60 print:bg-slate-50 rounded-2xl border border-slate-800 print:border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 print:text-slate-600 block">{isAr ? "اسم المورد:" : "Supplier Name:"}</span>
              <span className="font-bold text-white print:text-black text-sm">{selectedSupplier.nameAr}</span>
              <span className="block text-[10px] text-slate-400 print:text-slate-600">{selectedSupplier.nameEn}</span>
            </div>
            <div>
              <span className="text-slate-400 print:text-slate-600 block">{isAr ? "كود المورد:" : "Supplier Code:"}</span>
              <span className="font-mono font-bold text-sky-400 print:text-black">{selectedSupplier.code}</span>
            </div>
            <div>
              <span className="text-slate-400 print:text-slate-600 block">{isAr ? "الرقم الضريبي:" : "Tax ID:"}</span>
              <span className="font-mono text-slate-300 print:text-black">{selectedSupplier.taxNumber || "---"}</span>
            </div>
            <div>
              <span className="text-slate-400 print:text-slate-600 block">{isAr ? "رقم الهاتف / التواصل:" : "Phone:"}</span>
              <span className="font-mono text-slate-300 print:text-black">{selectedSupplier.mobile || "---"}</span>
            </div>
          </div>
        )}

        {/* Summary KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 bg-slate-950 print:bg-slate-100 rounded-2xl border border-slate-800 print:border-slate-300">
            <span className="text-slate-400 print:text-slate-700 text-[11px] block mb-1">{isAr ? "الرصيد الافتتاحي (دائن)" : "Opening Balance"}</span>
            <span className="text-sm font-black font-mono text-slate-200 print:text-black">
              {formatCurrency(statement.openingBalance, organization.currency, locale)}
            </span>
          </div>

          <div className="p-3.5 bg-slate-950 print:bg-slate-100 rounded-2xl border border-slate-800 print:border-slate-300">
            <span className="text-slate-400 print:text-slate-700 text-[11px] block mb-1">{isAr ? "+ إجمالي المشتريات (دائن)" : "+ Purchases (Credit)"}</span>
            <span className="text-sm font-black font-mono text-sky-400 print:text-black">
              {formatCurrency(statement.totalCredit, organization.currency, locale)}
            </span>
          </div>

          <div className="p-3.5 bg-slate-950 print:bg-slate-100 rounded-2xl border border-slate-800 print:border-slate-300">
            <span className="text-slate-400 print:text-slate-700 text-[11px] block mb-1">{isAr ? "- إجمالي السداد والمرتجعات (مدين)" : "- Payments & Returns (Debit)"}</span>
            <span className="text-sm font-black font-mono text-emerald-400 print:text-black">
              {formatCurrency(statement.totalDebit, organization.currency, locale)}
            </span>
          </div>

          <div className="p-3.5 bg-sky-950/40 print:bg-slate-200 rounded-2xl border border-sky-800/60 print:border-slate-400">
            <span className="text-sky-300 print:text-slate-900 text-[11px] font-bold block mb-1">{isAr ? "الرصيد المستحق النهائي للمورد" : "Closing Due Balance"}</span>
            <span className="text-base font-black font-mono text-rose-400 print:text-black">
              {formatCurrency(statement.closingBalance, organization.currency, locale)}
            </span>
          </div>
        </div>

        {/* Chronological Statement Ledger Table */}
        <div className="overflow-x-auto border border-slate-800 print:border-slate-300 rounded-2xl">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-800 text-slate-300 print:bg-slate-200 print:text-black font-bold border-b border-slate-700 print:border-slate-300">
                <th className="p-3">{isAr ? "التاريخ" : "Date"}</th>
                <th className="p-3">{isAr ? "رقم المرجع" : "Ref No"}</th>
                <th className="p-3">{isAr ? "نوع الحركة" : "Doc Type"}</th>
                <th className="p-3">{isAr ? "البيان / الشرح" : "Description"}</th>
                <th className="p-3 text-center font-mono">{isAr ? "مدين (سداد/مرتجع)" : "Debit"}</th>
                <th className="p-3 text-center font-mono">{isAr ? "دائن (شراء/استحقاق)" : "Credit"}</th>
                <th className="p-3 text-left font-mono">{isAr ? "الرصيد التراكمي (دائن)" : "Running Balance"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 print:divide-slate-300">
              {statement.transactions.map((tx, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 print:hover:bg-transparent">
                  <td className="p-3 font-mono text-slate-400 print:text-slate-700">{tx.date}</td>
                  <td className="p-3 font-mono font-bold text-white print:text-black">{tx.referenceNumber}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 print:bg-slate-100 text-slate-300 print:text-black border border-slate-700 print:border-slate-300">
                      {tx.type}
                    </span>
                  </td>
                  <td className="p-3 text-slate-300 print:text-slate-800 font-medium">{tx.description}</td>
                  <td className="p-3 text-center font-mono font-bold text-emerald-400 print:text-black">
                    {tx.debit > 0 ? formatCurrency(tx.debit, organization.currency, locale) : "-"}
                  </td>
                  <td className="p-3 text-center font-mono font-bold text-sky-400 print:text-black">
                    {tx.credit > 0 ? formatCurrency(tx.credit, organization.currency, locale) : "-"}
                  </td>
                  <td className="p-3 text-left font-mono font-black text-rose-400 print:text-black">
                    {formatCurrency(tx.balance, organization.currency, locale)}
                  </td>
                </tr>
              ))}
              {statement.transactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-500 print:text-slate-600 font-bold">
                    {isAr ? "لا توجد حركات مالية مسجلة لهذا المورد في الفترة المحددة" : "No transactions found for this period"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer & Signature Section for Print */}
        <div className="pt-8 border-t border-slate-800 print:border-slate-300 flex justify-between items-center text-xs text-slate-400 print:text-slate-700">
          <div>
            <p className="font-bold text-white print:text-black">{isAr ? "توقيع المحاسب المسؤول:" : "Accountant Signature:"}</p>
            <p className="mt-6">_______________________</p>
          </div>
          <div>
            <p className="font-bold text-white print:text-black">{isAr ? "توقيع المدير المالي / الاعتماد:" : "Financial Controller Signature:"}</p>
            <p className="mt-6">_______________________</p>
          </div>
          <div>
            <p className="font-bold text-white print:text-black">{isAr ? "توقيع واستلام مندوب المورد:" : "Supplier Representative Signature:"}</p>
            <p className="mt-6">_______________________</p>
          </div>
        </div>
      </div>
    </div>
  );
}
