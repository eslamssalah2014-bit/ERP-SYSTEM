"use client";

import React, { useState } from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import TableSkeleton from "@/components/ui/TableSkeleton";
import {
  FileSpreadsheet, Search, Filter, Printer, Download,
  CreditCard, Calendar, Building2, User
} from "lucide-react";
import { CheckRecord, CheckStatus } from "@/types/erp";

export default function PayableChecksReportPage() {
  const { checks, suppliers, organization, locale, isLoadingData } = useERP();
  const isAr = locale === "ar";

  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [bankFilter, setBankFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [dueStart, setDueStart] = useState("");
  const [dueEnd, setDueEnd] = useState("");

  const outgoingChecks = checks.filter(c => c.type === "outgoing");

  const filteredChecks = outgoingChecks.filter(c => {
    const matchesSearch =
      c.checkNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.bankName && c.bankName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesBank = bankFilter === "all" || c.bankName === bankFilter;
    const matchesSupp = supplierFilter === "all" || c.supplierId === supplierFilter;
    const matchesStart = !dueStart || c.dueDate >= dueStart;
    const matchesEnd = !dueEnd || c.dueDate <= dueEnd;

    return matchesSearch && matchesStatus && matchesBank && matchesSupp && matchesStart && matchesEnd;
  });

  const totalAmount = filteredChecks.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const pendingTotal = filteredChecks.filter(c => c.status === "pending").reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const paidTotal = filteredChecks.filter(c => c.status === "collected" || c.status === "paid").reduce((s, c) => s + (Number(c.amount) || 0), 0);

  // Unique banks
  const banksList = Array.from(new Set(outgoingChecks.map(c => c.bankName).filter(Boolean)));

  const getStatusBadge = (status: CheckStatus) => {
    switch (status) {
      case "pending":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">{isAr ? "مستحق الصرف (قيد الانتظار)" : "Pending"}</span>;
      case "collected":
      case "paid":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{isAr ? "تم الصرف بنجاح" : "Paid"}</span>;
      case "bounced":
      case "cancelled":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">{isAr ? "ملغي / مرتد" : "Cancelled"}</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400">{status}</span>;
    }
  };

  const exportToExcel = () => {
    const headers = [
      isAr ? "رقم الشيك" : "Check #",
      isAr ? "المستفيد / المورد" : "Payee / Supplier",
      isAr ? "البنك المسحوب عليه" : "Issuing Bank",
      isAr ? "تاريخ التحرير" : "Issue Date",
      isAr ? "تاريخ الاستحقاق" : "Due Date",
      isAr ? "الحالة" : "Status",
      isAr ? "المبلغ" : "Amount",
      isAr ? "البيان" : "Notes"
    ];

    const rows = filteredChecks.map(c => [
      c.checkNumber,
      c.partyName,
      c.bankName,
      c.issueDate,
      c.dueDate,
      c.status,
      c.amount,
      `"${(c.notes || "").replace(/"/g, '""')}"`
    ].join(","));

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `payable_checks_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {isAr ? "تقرير الشيكات الصادرة (أوراق الدفع)" : "Payable / Issued Checks Report"}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAr ? "متابعة الشيكات الصادرة للموردين، التزامات أوراق الدفع ومواعيد الاستحقاق والصرف" : "Track notes payable commitments, issuing banks, due dates, and paid statuses"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>{isAr ? "تصدير إلى Excel" : "Export Excel"}</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-medium shadow-lg shadow-amber-900/30 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>{isAr ? "طباعة التقرير" : "Print Report"}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 block">{isAr ? "إجمالي الشيكات الصادرة" : "Total Issued Value"}</span>
          <div className="text-lg font-bold font-mono text-white mt-1">
            {formatCurrency(totalAmount, organization.currency, locale)}
          </div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 block">{isAr ? "التزامات معلقة (قيد الصرف)" : "Pending Payment"}</span>
          <div className="text-lg font-bold font-mono text-amber-400 mt-1">
            {formatCurrency(pendingTotal, organization.currency, locale)}
          </div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 block">{isAr ? "تم صرفها من البنك" : "Paid from Bank"}</span>
          <div className="text-lg font-bold font-mono text-emerald-400 mt-1">
            {formatCurrency(paidTotal, organization.currency, locale)}
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center gap-3 print:hidden">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute right-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder={isAr ? "بحث برقم الشيك، المورد، أو البنك..." : "Search check #, supplier, bank..."}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
        >
          <option value="all">{isAr ? "جميع الحالات" : "All Statuses"}</option>
          <option value="pending">{isAr ? "قيد الانتظار" : "Pending"}</option>
          <option value="collected">{isAr ? "تم الصرف" : "Paid"}</option>
          <option value="cancelled">{isAr ? "ملغي" : "Cancelled"}</option>
        </select>

        <select
          value={bankFilter}
          onChange={e => setBankFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
        >
          <option value="all">{isAr ? "جميع البنوك المصدرة" : "All Issuing Banks"}</option>
          {banksList.map((b, idx) => (
            <option key={idx} value={b}>{b}</option>
          ))}
        </select>

        <select
          value={supplierFilter}
          onChange={e => setSupplierFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
        >
          <option value="all">{isAr ? "جميع الموردين" : "All Suppliers"}</option>
          {suppliers.map(s => (
            <option key={s.id} value={s.id}>{isAr ? s.nameAr : s.nameEn}</option>
          ))}
        </select>

        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span>{isAr ? "استحقاق من:" : "Due From:"}</span>
          <input
            type="date"
            value={dueStart}
            onChange={e => setDueStart(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300"
          />
          <span>{isAr ? "إلى:" : "To:"}</span>
          <input
            type="date"
            value={dueEnd}
            onChange={e => setDueEnd(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300"
          />
        </div>

        {(searchTerm || statusFilter !== "all" || bankFilter !== "all" || supplierFilter !== "all" || dueStart || dueEnd) && (
          <button
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("all");
              setBankFilter("all");
              setSupplierFilter("all");
              setDueStart("");
              setDueEnd("");
            }}
            className="text-xs text-slate-400 hover:text-white px-2.5 py-1.5 bg-slate-800 rounded-lg"
          >
            {isAr ? "إعادة ضبط" : "Reset"}
          </button>
        )}
      </div>

      {/* Printable Report Header */}
      <div className="hidden print:block space-y-4 text-black pb-4 border-b border-black">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold">{organization.nameAr}</h2>
            <p className="text-xs">{organization.nameEn}</p>
            <p className="text-xs mt-1">{isAr ? "الرقم الضريبي: " : "Tax No: "} {organization.taxNumber}</p>
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold">{isAr ? "تقرير الشيكات الصادرة (أوراق الدفع)" : "Payable Checks Report"}</h3>
            <p className="text-xs text-gray-600 mt-1">
              {isAr ? "تاريخ التقرير: " : "Report Date: "} {new Date().toISOString().split("T")[0]}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden print:border-none print:bg-white print:text-black">
        {isLoadingData ? (
          <div className="p-6">
            <TableSkeleton rows={5} columns={7} />
          </div>
        ) : filteredChecks.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <CreditCard className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm font-medium">
              {isAr ? "لا توجد شيكات دفع مطابقة لمعايير التقرير" : "No payable checks found"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold print:bg-gray-100 print:text-black">
                <tr>
                  <th className="p-3.5">{isAr ? "رقم الشيك" : "Check #"}</th>
                  <th className="p-3.5">{isAr ? "المستفيد / المورد" : "Payee / Supplier"}</th>
                  <th className="p-3.5">{isAr ? "البنك المسحوب عليه" : "Issuing Bank"}</th>
                  <th className="p-3.5">{isAr ? "تاريخ التحرير" : "Issue Date"}</th>
                  <th className="p-3.5">{isAr ? "تاريخ الاستحقاق" : "Due Date"}</th>
                  <th className="p-3.5">{isAr ? "الحالة" : "Status"}</th>
                  <th className="p-3.5 text-left">{isAr ? "المبلغ" : "Amount"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 print:divide-gray-300">
                {filteredChecks.map(chk => (
                  <tr key={chk.id} className="hover:bg-slate-800/40 transition-colors text-slate-200 print:text-black">
                    <td className="p-3.5 font-mono font-bold text-white print:text-black">
                      {chk.checkNumber}
                    </td>
                    <td className="p-3.5 font-medium">
                      {chk.partyName}
                    </td>
                    <td className="p-3.5 text-slate-300 print:text-black">
                      {chk.bankName}
                    </td>
                    <td className="p-3.5 text-slate-400 font-mono print:text-black">
                      {formatDate(chk.issueDate, locale)}
                    </td>
                    <td className="p-3.5 text-slate-300 font-mono font-semibold print:text-black">
                      {formatDate(chk.dueDate, locale)}
                    </td>
                    <td className="p-3.5">
                      {getStatusBadge(chk.status)}
                    </td>
                    <td className="p-3.5 text-left font-mono font-bold text-amber-400 text-sm print:text-black">
                      {formatCurrency(chk.amount, organization.currency, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-950 text-slate-300 font-bold border-t-2 border-slate-700 print:bg-gray-100 print:text-black">
                <tr>
                  <td colSpan={6} className="p-3.5 text-right">
                    {isAr ? "الإجمالي الكلي للشيكات الصادرة المعروضة:" : "Total Issued Portfolio Amount:"}
                  </td>
                  <td className="p-3.5 text-left font-mono text-amber-400 text-sm print:text-black">
                    {formatCurrency(totalAmount, organization.currency, locale)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
