"use client";

import React, { useState, useMemo } from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import { computeTreasuryStatement } from "@/lib/accounting-engine";
import TableSkeleton from "@/components/ui/TableSkeleton";
import {
  FileSpreadsheet, Search, Filter, Printer, Download,
  Wallet, ArrowDownLeft, ArrowUpRight, Calendar, Building2, CheckCircle2
} from "lucide-react";

export default function TreasuryStatementPage() {
  const {
    treasuryAccounts, cashReceipts, cashPayments, accounts,
    journalEntries, organization, locale, isLoadingData
  } = useERP();

  const isAr = locale === "ar";

  // Filter state
  const [selectedTreasuryId, setSelectedTreasuryId] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const { statementResult, rows } = useMemo(() => {
    const res = computeTreasuryStatement(
      selectedTreasuryId,
      startDate,
      endDate,
      treasuryAccounts,
      cashReceipts,
      cashPayments,
      [],
      [],
      [],
      journalEntries,
      accounts
    );
    return { statementResult: res, rows: res.rows };
  }, [selectedTreasuryId, startDate, endDate, treasuryAccounts, cashReceipts, cashPayments, journalEntries, accounts]);

  const openingRow = rows.find(r => r.type === "opening");
  const transactionRows = rows.filter(r => r.type !== "opening");

  const totalInflow = transactionRows.reduce((sum, r) => sum + (r.inflow || r.debit || 0), 0);
  const totalOutflow = transactionRows.reduce((sum, r) => sum + (r.outflow || r.credit || 0), 0);
  const finalBalance = statementResult.closingBalance;
  const initialBalance = statementResult.openingBalance;

  const currentTreasuryObj = treasuryAccounts.find(t => t.id === selectedTreasuryId);

  const exportToExcel = () => {
    const headers = [
      isAr ? "التاريخ" : "Date",
      isAr ? "رقم السند / المرجع" : "Ref #",
      isAr ? "نوع الحركة" : "Type",
      isAr ? "البيان / الجهة" : "Description",
      isAr ? "وارد (قبض)" : "Inflow",
      isAr ? "صادر (صرف)" : "Outflow",
      isAr ? "الرصيد التراكمي" : "Running Balance"
    ];

    const csvRows = rows.map(r => {
      let typeLabel = isAr ? "حركة" : "Tx";
      if (r.type === "opening") typeLabel = isAr ? "رصيد افتتاحي" : "Opening Balance";
      else if (r.type === "receipt") typeLabel = isAr ? "سند قبض" : "Receipt";
      else if (r.type === "payment") typeLabel = isAr ? "سند صرف" : "Payment";

      return [
        r.date,
        r.referenceNumber,
        typeLabel,
        `"${(r.description || "").replace(/"/g, '""')}"`,
        r.inflow || 0,
        r.outflow || 0,
        r.balance
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `treasury_statement_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {isAr ? "كشف حساب الخزينة النقدية" : "Treasury Account Statement"}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAr ? "كشف حساب تفصيلي بحركات الوارد والصادر والرصيد الافتتاحي والتراكمي" : "Detailed ledger statement of inflows, outflows, opening balance, and running balance"}
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
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium shadow-lg shadow-emerald-900/30 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>{isAr ? "طباعة الكشف" : "Print Statement"}</span>
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">{isAr ? "الخزينة:" : "Treasury:"}</span>
          <select
            value={selectedTreasuryId}
            onChange={e => setSelectedTreasuryId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">{isAr ? "جميع الخزائن" : "All Treasuries"}</option>
            {treasuryAccounts.map(t => (
              <option key={t.id} value={t.id}>
                {isAr ? t.nameAr : t.nameEn} ({formatCurrency(t.balance, organization.currency, locale)})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">{isAr ? "من تاريخ:" : "From:"}</span>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">{isAr ? "إلى تاريخ:" : "To:"}</span>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {(selectedTreasuryId !== "all" || startDate || endDate) && (
          <button
            onClick={() => {
              setSelectedTreasuryId("all");
              setStartDate("");
              setEndDate("");
            }}
            className="text-xs text-slate-400 hover:text-white px-2.5 py-1.5 bg-slate-800 rounded-lg"
          >
            {isAr ? "إعادة ضبط" : "Reset"}
          </button>
        )}
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 print:hidden">
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 block">{isAr ? "الرصيد الافتتاحي" : "Opening Balance"}</span>
          <div className="text-lg font-bold font-mono text-slate-200 mt-1">
            {formatCurrency(initialBalance, organization.currency, locale)}
          </div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 block">{isAr ? "إجمالي المقبوضات (وارد)" : "Total Inflow"}</span>
          <div className="text-lg font-bold font-mono text-emerald-400 mt-1">
            {formatCurrency(totalInflow, organization.currency, locale)}
          </div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 block">{isAr ? "إجمالي المدفوعات (صادر)" : "Total Outflow"}</span>
          <div className="text-lg font-bold font-mono text-amber-400 mt-1">
            {formatCurrency(totalOutflow, organization.currency, locale)}
          </div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 block">{isAr ? "الرصيد الختامي الحالي" : "Closing Balance"}</span>
          <div className={`text-lg font-bold font-mono mt-1 ${finalBalance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {formatCurrency(finalBalance, organization.currency, locale)}
          </div>
        </div>
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
            <h3 className="text-lg font-bold">{isAr ? "كشف حساب الخزينة" : "Treasury Statement"}</h3>
            <p className="text-xs font-semibold">
              {selectedTreasuryId === "all" ? (isAr ? "جميع الخزائن" : "All Treasuries") : (isAr ? currentTreasuryObj?.nameAr : currentTreasuryObj?.nameEn)}
            </p>
            <p className="text-[11px] text-gray-600 mt-1">
              {startDate ? `${isAr ? "من" : "From"}: ${startDate}` : ""} {endDate ? `${isAr ? "إلى" : "To"}: ${endDate}` : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Statement Table */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden print:border-none print:bg-white print:text-black">
        {isLoadingData ? (
          <div className="p-6">
            <TableSkeleton rows={6} columns={7} />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <Wallet className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm font-medium">
              {isAr ? "لا توجد حركات مسجلة للخزينة في هذه الفترة" : "No transactions found"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold print:bg-gray-100 print:text-black">
                <tr>
                  <th className="p-3.5">{isAr ? "التاريخ" : "Date"}</th>
                  <th className="p-3.5">{isAr ? "رقم السند / المرجع" : "Ref #"}</th>
                  <th className="p-3.5">{isAr ? "نوع الحركة" : "Type"}</th>
                  <th className="p-3.5">{isAr ? "البيان / تفاصيل الحركة" : "Description / Details"}</th>
                  <th className="p-3.5 text-left">{isAr ? "وارد (قبض)" : "Inflow (Dr)"}</th>
                  <th className="p-3.5 text-left">{isAr ? "صادر (صرف)" : "Outflow (Cr)"}</th>
                  <th className="p-3.5 text-left">{isAr ? "الرصيد التراكمي" : "Running Balance"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 print:divide-gray-300">
                {rows.map((r, idx) => {
                  const isOpening = r.type === "opening";
                  const inflowVal = Number(r.inflow ?? r.debit ?? 0);
                  const outflowVal = Number(r.outflow ?? r.credit ?? 0);
                  const balanceVal = Number(r.balance ?? r.runningBalance ?? 0);

                  return (
                    <tr
                      key={idx}
                      className={
                        isOpening
                          ? "bg-slate-950/90 font-semibold text-emerald-400 border-b border-slate-700/60"
                          : "hover:bg-slate-800/40 transition-colors text-slate-200"
                      }
                    >
                      <td className="p-3.5 font-mono text-slate-300 print:text-black">
                        {r.date}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-white print:text-black">
                        {r.referenceNumber}
                      </td>
                      <td className="p-3.5">
                        {isOpening ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {isAr ? "رصيد افتتاحي" : "Opening"}
                          </span>
                        ) : r.type === "receipt" ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
                            <ArrowDownLeft className="w-3 h-3" />
                            {isAr ? "قبض نقدي" : "Receipt"}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 inline-flex items-center gap-1">
                            <ArrowUpRight className="w-3 h-3" />
                            {isAr ? "صرف نقدي" : "Payment"}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-medium max-w-xs truncate print:text-black">
                        {r.description}
                      </td>
                      <td className="p-3.5 text-left font-mono font-bold text-emerald-400">
                        {inflowVal > 0 ? formatCurrency(inflowVal, organization.currency, locale) : "-"}
                      </td>
                      <td className="p-3.5 text-left font-mono font-bold text-amber-400">
                        {outflowVal > 0 ? formatCurrency(outflowVal, organization.currency, locale) : "-"}
                      </td>
                      <td className="p-3.5 text-left font-mono font-bold text-white text-sm print:text-black">
                        {formatCurrency(balanceVal, organization.currency, locale)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-950 text-slate-300 font-bold border-t-2 border-slate-700 print:bg-gray-100 print:text-black">
                <tr>
                  <td colSpan={4} className="p-3.5 text-right">
                    {isAr ? "الإجماليات والحركة الصافية:" : "Totals & Net Movement:"}
                  </td>
                  <td className="p-3.5 text-left font-mono text-emerald-400">
                    {formatCurrency(totalInflow, organization.currency, locale)}
                  </td>
                  <td className="p-3.5 text-left font-mono text-amber-400">
                    {formatCurrency(totalOutflow, organization.currency, locale)}
                  </td>
                  <td className="p-3.5 text-left font-mono text-white text-sm print:text-black">
                    {formatCurrency(finalBalance, organization.currency, locale)}
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
