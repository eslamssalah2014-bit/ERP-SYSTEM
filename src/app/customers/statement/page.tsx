"use client";

import React, { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useERP } from "@/context/erp-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  FileText, Search, Printer, Download, Calendar,
  ArrowRight, User, TrendingUp, CreditCard, DollarSign,
  ArrowUpRight, ArrowDownLeft, ShieldCheck
} from "lucide-react";

function CustomerStatementContent() {
  const { customers, getCustomerStatement, organization, locale } = useERP();
  const isAr = locale === "ar";
  const searchParams = useSearchParams();

  const initialCustomerId = searchParams.get("id") || customers[0]?.id || "";
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomerId);
  const [fromDate, setFromDate] = useState("2026-01-01");
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || customers[0];
  }, [customers, selectedCustomerId]);

  const statement = useMemo(() => {
    if (!selectedCustomer) return null;
    return getCustomerStatement(selectedCustomer.id, fromDate, toDate);
  }, [selectedCustomer, fromDate, toDate, getCustomerStatement]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!statement || !selectedCustomer) return;
    let csv = "\uFEFF"; // UTF-8 BOM
    csv += `${isAr ? "كشف حساب عميل" : "Customer Account Statement"}: ${selectedCustomer.nameAr} (${selectedCustomer.code})\n`;
    csv += `${isAr ? "الفترة من" : "Period From"}: ${fromDate} ${isAr ? "إلى" : "To"}: ${toDate}\n\n`;
    csv += `${isAr ? "التاريخ,النوع,رقم المرجع,البيان,مدين (+),دائن (-),الرصيد التراكمي\n" : "Date,Type,Ref No,Description,Debit,Credit,Running Balance\n"}`;

    statement.transactions.forEach(t => {
      csv += `"${t.date}","${t.type}","${t.referenceNumber}","${t.description}","${t.debit}","${t.credit}","${t.balance}"\n`;
    });

    csv += `\n"${isAr ? "رصيد أول المدة" : "Opening Balance"}","","","","","","${statement.openingBalance}"\n`;
    csv += `"${isAr ? "إجمالي الحركات المدينة" : "Total Debit"}","","","","${statement.totalDebit}","",""\n`;
    csv += `"${isAr ? "إجمالي الحركات الدائنة" : "Total Credit"}","","","","","${statement.totalCredit}",""\n`;
    csv += `"${isAr ? "الرصيد الختامي المستحق" : "Closing Balance"}","","","","","","${statement.closingBalance}"\n`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `customer_statement_${selectedCustomer.code}_${fromDate}_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls - Hidden during Print */}
      <div className="print:hidden space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <a href="/customers" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-xs">
                <User className="w-3.5 h-3.5" />
                <span>{isAr ? "دليل العملاء" : "Customers"}</span>
              </a>
              <span className="text-slate-600">/</span>
              <span className="text-emerald-400 font-bold text-xs">{isAr ? "كشف حساب تفصيلي" : "Statement"}</span>
            </div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
              <FileText className="w-6 h-6 text-emerald-400" />
              <span>{isAr ? "كشف حساب العميل والعمليات المالية" : "Customer Account Statement"}</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {isAr ? "سجل الحركات المالية المعتمد شاملاً الفواتير، سندات القبض، ومرتجعات المبيعات مع الرصيد التراكمي" : "Detailed customer ledger with invoices, cash receipts, and sales returns"}
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
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/60 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{isAr ? "طباعة كشف الحساب" : "Print Statement"}</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-1">{isAr ? "اختيار العميل *" : "Select Customer *"}</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
            >
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nameAr} ({c.code}) - {c.categoryName ? `[${c.categoryName}]` : ""}
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
        </div>
      </div>

      {/* Statement Printable Document */}
      {selectedCustomer && statement && (
        <div className="bg-slate-900 print:bg-white border border-slate-800 print:border-none rounded-3xl p-6 print:p-0 shadow-sm text-xs print:text-black space-y-6">
          {/* Official Letterhead Header */}
          <div className="flex justify-between items-start border-b border-slate-800 print:border-slate-300 pb-6">
            <div>
              <h2 className="text-xl font-bold text-white print:text-black mb-1">{organization.nameAr}</h2>
              <p className="text-slate-400 print:text-slate-600">{organization.nameEn}</p>
              <div className="text-[11px] text-slate-500 print:text-slate-700 mt-2 space-y-0.5 font-mono">
                <p>{isAr ? "الرقم الضريبي للمنشأة:" : "VAT ID:"} {organization.taxNumber}</p>
                <p>{isAr ? "السجل التجاري:" : "CR:"} {organization.commercialRegister}</p>
              </div>
            </div>

            <div className="text-left print:text-left bg-slate-950/60 print:bg-slate-50 p-4 rounded-2xl border border-slate-800/80 print:border-slate-200">
              <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 print:text-emerald-700 font-bold rounded-lg text-[11px]">
                {isAr ? "كشف حساب عميل تفصيلي" : "Customer Ledger"}
              </span>
              <p className="text-slate-400 print:text-slate-600 mt-2 font-mono">{isAr ? "الفترة:" : "Period:"} {fromDate} ➔ {toDate}</p>
              <p className="text-slate-500 print:text-slate-500 font-mono text-[10px]">{isAr ? "تاريخ الطباعة:" : "Printed:"} {new Date().toLocaleDateString("ar-SA")}</p>
            </div>
          </div>

          {/* Customer Profile Card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950/80 print:bg-slate-100 p-4 rounded-2xl border border-slate-800 print:border-slate-200">
            <div>
              <span className="text-slate-500 print:text-slate-600 block text-[10px]">{isAr ? "اسم العميل" : "Customer"}</span>
              <span className="text-sm font-bold text-white print:text-black">{selectedCustomer.nameAr}</span>
              <span className="text-slate-400 print:text-slate-600 block text-[10px] font-mono">{selectedCustomer.code}</span>
            </div>
            <div>
              <span className="text-slate-500 print:text-slate-600 block text-[10px]">{isAr ? "الرقم الضريبي للعميل" : "Tax No"}</span>
              <span className="font-mono text-white print:text-black font-bold">{selectedCustomer.taxNumber || "---"}</span>
              <span className="text-slate-400 print:text-slate-600 block text-[10px]">{selectedCustomer.mobile || "---"}</span>
            </div>
            <div>
              <span className="text-slate-500 print:text-slate-600 block text-[10px]">{isAr ? "العنوان والمدينة" : "Address"}</span>
              <span className="text-white print:text-black">{selectedCustomer.city} - {selectedCustomer.address || "---"}</span>
            </div>
          </div>

          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-slate-950 print:bg-slate-50 rounded-2xl border border-slate-800 print:border-slate-200">
              <span className="text-slate-500 print:text-slate-600 block text-[11px] mb-1">{isAr ? "رصيد أول المدة" : "Opening Balance"}</span>
              <span className="text-base font-black font-mono text-slate-200 print:text-black">
                {formatCurrency(statement.openingBalance, organization.currency, locale)}
              </span>
            </div>
            <div className="p-4 bg-slate-950 print:bg-slate-50 rounded-2xl border border-slate-800 print:border-slate-200">
              <span className="text-slate-500 print:text-slate-600 block text-[11px] mb-1">{isAr ? "إجمالي المسحوبات (مدين +)" : "Total Debit (Sales)"}</span>
              <span className="text-base font-black font-mono text-rose-400 print:text-rose-700">
                +{formatCurrency(statement.totalDebit, organization.currency, locale)}
              </span>
            </div>
            <div className="p-4 bg-slate-950 print:bg-slate-50 rounded-2xl border border-slate-800 print:border-slate-200">
              <span className="text-slate-500 print:text-slate-600 block text-[11px] mb-1">{isAr ? "إجمالي السدادات (دائن -)" : "Total Credit (Receipts)"}</span>
              <span className="text-base font-black font-mono text-emerald-400 print:text-emerald-700">
                -{formatCurrency(statement.totalCredit, organization.currency, locale)}
              </span>
            </div>
            <div className="p-4 bg-slate-950 print:bg-slate-50 rounded-2xl border border-slate-800 print:border-slate-200">
              <span className="text-slate-500 print:text-slate-600 block text-[11px] mb-1">{isAr ? "الرصيد الختامي المستحق" : "Closing Due"}</span>
              <span className="text-base font-black font-mono text-amber-400 print:text-amber-700">
                {formatCurrency(statement.closingBalance, organization.currency, locale)}
              </span>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="border border-slate-800 print:border-slate-300 rounded-2xl overflow-hidden">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-800/80 print:bg-slate-200 text-slate-300 print:text-slate-800 font-bold border-b border-slate-700 print:border-slate-300">
                  <th className="p-3">#</th>
                  <th className="p-3">{isAr ? "التاريخ" : "Date"}</th>
                  <th className="p-3">{isAr ? "النوع" : "Type"}</th>
                  <th className="p-3">{isAr ? "رقم المستند" : "Doc No"}</th>
                  <th className="p-3">{isAr ? "البيان والشرح" : "Description"}</th>
                  <th className="p-3 text-center font-mono">{isAr ? "مدين (مبيعات +)" : "Debit (+)"}</th>
                  <th className="p-3 text-center font-mono">{isAr ? "دائن (سداد/مرتجع -)" : "Credit (-)"}</th>
                  <th className="p-3 text-left font-mono font-bold">{isAr ? "الرصيد التراكمي" : "Running Balance"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 print:divide-slate-200">
                {statement.transactions.map((tx, idx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/20 print:hover:bg-transparent">
                    <td className="p-3 text-slate-500 font-mono">{idx + 1}</td>
                    <td className="p-3 font-sans text-slate-300 print:text-black">{formatDate(tx.date, locale)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        tx.type === "invoice" ? "bg-rose-500/10 text-rose-400 print:text-rose-700" :
                        tx.type === "payment" ? "bg-emerald-500/10 text-emerald-400 print:text-emerald-700" :
                        tx.type === "return" ? "bg-amber-500/10 text-amber-400 print:text-amber-700" :
                        "bg-slate-700 text-slate-300 print:text-black"
                      }`}>
                        {tx.type === "invoice" ? (isAr ? "فاتورة مبيعات" : "Invoice") :
                         tx.type === "payment" ? (isAr ? "سند قبض" : "Receipt") :
                         tx.type === "return" ? (isAr ? "مرتجع مبيعات" : "Return") :
                         (isAr ? "رصيد افتتاح" : "Opening")}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold text-white print:text-black">{tx.referenceNumber}</td>
                    <td className="p-3 text-slate-400 print:text-slate-700">{tx.description}</td>
                    <td className="p-3 text-center font-mono font-bold text-rose-400 print:text-rose-700">
                      {tx.debit > 0 ? formatCurrency(tx.debit, organization.currency, locale) : "-"}
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-emerald-400 print:text-emerald-700">
                      {tx.credit > 0 ? formatCurrency(tx.credit, organization.currency, locale) : "-"}
                    </td>
                    <td className="p-3 text-left font-mono font-black text-white print:text-black">
                      {formatCurrency(tx.balance, organization.currency, locale)}
                    </td>
                  </tr>
                ))}
                {statement.transactions.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-500 print:text-slate-600">
                      {isAr ? "لا توجد حركات مسجلة لهذا العميل خلال الفترة المحددة" : "No transactions found in this date range"}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-950 font-black text-white print:bg-slate-200 print:text-black border-t-2 border-slate-700 print:border-slate-400">
                  <td colSpan={5} className="p-3 text-right">{isAr ? "إجمالي الحركات والرصيد الختامي المستحق:" : "Totals & Closing Balance:"}</td>
                  <td className="p-3 text-center font-mono text-rose-400 print:text-rose-700">{formatCurrency(statement.totalDebit, organization.currency, locale)}</td>
                  <td className="p-3 text-center font-mono text-emerald-400 print:text-emerald-700">{formatCurrency(statement.totalCredit, organization.currency, locale)}</td>
                  <td className="p-3 text-left font-mono text-amber-400 print:text-amber-700">{formatCurrency(statement.closingBalance, organization.currency, locale)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Signatures & Accreditation */}
          <div className="hidden print:grid grid-cols-3 gap-8 pt-8 border-t border-slate-300 text-center font-bold text-slate-700 text-xs">
            <div>
              <p>{isAr ? "المحاسب المسؤول" : "Accountant"}</p>
              <div className="mt-8 border-b border-dashed border-slate-400 w-32 mx-auto"></div>
            </div>
            <div>
              <p>{isAr ? "المدير المالي" : "Finance Manager"}</p>
              <div className="mt-8 border-b border-dashed border-slate-400 w-32 mx-auto"></div>
            </div>
            <div>
              <p>{isAr ? "ختم المنشأة والاعتماد" : "Stamp & Approval"}</p>
              <div className="mt-8 border-b border-dashed border-slate-400 w-32 mx-auto"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomerStatementPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400">جاري تحميل كشف الحساب...</div>}>
      <CustomerStatementContent />
    </Suspense>
  );
}
