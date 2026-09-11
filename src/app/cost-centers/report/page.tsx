"use client";

import React, { useState, useMemo } from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import { exportTableToExcel } from "@/lib/excel-export";
import { ReportPrintHeader, ReportPrintFooter } from "@/components/ui/ReportPrintHeader";
import TableSkeleton from "@/components/ui/TableSkeleton";
import Link from "next/link";
import {
  Layers, Filter, Printer, Download, ArrowRight,
  TrendingUp, TrendingDown, DollarSign, Calendar, FileText, CheckCircle2, ChevronRight
} from "lucide-react";

export default function CostCenterReportPage() {
  const { costCenters, journalEntries, accounts, organization, locale, isLoadingData } = useERP();
  const isAr = locale === "ar";

  // Filters State
  const [selectedCostCenterId, setSelectedCostCenterId] = useState<string>("all");
  const [includeChildren, setIncludeChildren] = useState<boolean>(true);
  const [dateFrom, setDateFrom] = useState<string>("2026-01-01");
  const [dateTo, setDateTo] = useState<string>(new Date().toISOString().split("T")[0]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");

  // Selected Cost Center details
  const selectedCostCenter = useMemo(() => {
    if (selectedCostCenterId === "all") return null;
    return costCenters.find(cc => cc.id === selectedCostCenterId) || null;
  }, [costCenters, selectedCostCenterId]);

  // Target Cost Center IDs (including children if requested)
  const targetCostCenterIds = useMemo(() => {
    if (selectedCostCenterId === "all") return null;
    const ids = new Set<string>([selectedCostCenterId]);
    if (includeChildren) {
      costCenters.forEach(cc => {
        if (cc.parentId === selectedCostCenterId) ids.add(cc.id);
      });
    }
    return ids;
  }, [selectedCostCenterId, includeChildren, costCenters]);

  // Extract and aggregate movement lines
  const movements = useMemo(() => {
    const list: Array<{
      id: string;
      date: string;
      entryNumber: string;
      costCenterId: string;
      costCenterCode: string;
      costCenterName: string;
      costCenterType: "revenue" | "expense";
      accountId: string;
      accountCode: string;
      accountName: string;
      description: string;
      debit: number;
      credit: number;
      referenceType: string;
      referenceNumber: string;
      user: string;
    }> = [];

    journalEntries.forEach(entry => {
      // Date filter
      if (dateFrom && entry.date < dateFrom) return;
      if (dateTo && entry.date > dateTo) return;

      entry.lines.forEach((line, idx) => {
        if (!line.costCenterId) return;

        // Cost center filter
        if (targetCostCenterIds && !targetCostCenterIds.has(line.costCenterId)) return;

        // Account filter
        if (selectedAccountId !== "all" && line.accountId !== selectedAccountId) return;

        const cc = costCenters.find(c => c.id === line.costCenterId);
        const acc = accounts.find(a => a.id === line.accountId);

        const ccType = (cc?.costCenterType || cc?.type || "expense") as "revenue" | "expense";

        list.push({
          id: `${entry.id}-${idx}`,
          date: entry.date,
          entryNumber: entry.entryNumber,
          costCenterId: line.costCenterId,
          costCenterCode: cc?.code || "CC",
          costCenterName: isAr ? (cc?.nameAr || "مركز غير محدد") : (cc?.nameEn || "Cost Center"),
          costCenterType: ccType,
          accountId: line.accountId,
          accountCode: line.accountCode || acc?.code || "---",
          accountName: line.accountName || (isAr ? acc?.nameAr : acc?.nameEn) || "---",
          description: line.description || line.notes || entry.description || "قيد محاسبي",
          debit: Number(line.debit) || 0,
          credit: Number(line.credit) || 0,
          referenceType: entry.referenceType || "manual",
          referenceNumber: entry.entryNumber,
          user: entry.createdBy || "النظام"
        });
      });
    });

    // Sort chronologically
    list.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.entryNumber.localeCompare(b.entryNumber);
    });

    // Calculate running balance
    let currentBalance = 0;
    return list.map(item => {
      if (item.costCenterType === "revenue") {
        // For revenue center: credit increases revenue, debit decreases
        currentBalance += (item.credit - item.debit);
      } else {
        // For expense/cost center: debit increases expense, credit decreases
        currentBalance += (item.debit - item.credit);
      }
      return {
        ...item,
        runningBalance: currentBalance
      };
    });
  }, [journalEntries, costCenters, accounts, dateFrom, dateTo, targetCostCenterIds, selectedAccountId, isAr]);

  // KPI Calculations
  const totalDebit = movements.reduce((s, m) => s + m.debit, 0);
  const totalCredit = movements.reduce((s, m) => s + m.credit, 0);
  const netMovement = totalDebit - totalCredit;

  const handleExportExcel = () => {
    exportTableToExcel("cost-center-movement-table", {
      filename: `تقرير_حركة_مراكز_التكلفة_${new Date().toISOString().split("T")[0]}`,
      sheetName: isAr ? "حركة مراكز التكلفة" : "Cost Center Movements"
    });
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoadingData) {
    return <TableSkeleton rows={8} columns={9} summaryCards={3} isAr={isAr} />;
  }

  return (
    <div className="space-y-6">
      {/* Printable Report Header */}
      <ReportPrintHeader
        organization={organization}
        reportTitleAr={`تقرير حركة مراكز التكلفة التحليلي ${selectedCostCenter ? `(${selectedCostCenter.nameAr})` : ""}`}
        reportTitleEn={`Cost Center Analytical Movement Report ${selectedCostCenter ? `(${selectedCostCenter.nameEn})` : ""}`}
        dateFrom={dateFrom}
        dateTo={dateTo}
        locale={locale}
        extraMeta={selectedCostCenter ? `مركز التكلفة: ${selectedCostCenter.code} - ${selectedCostCenter.nameAr}` : "كافة مراكز التكلفة"}
      />

      {/* Breadcrumb & Navigation Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm print:hidden">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/cost-centers" className="hover:text-emerald-400 flex items-center gap-1 transition-colors">
              <Layers className="w-3.5 h-3.5" />
              <span>{isAr ? "دليل مراكز التكلفة" : "Cost Centers"}</span>
            </Link>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <span className="text-white font-semibold">{isAr ? "تقرير الحركة التحليلي" : "Movement Report"}</span>
          </div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-emerald-400" />
            <span>{isAr ? "تقرير حركة مراكز التكلفة التفصيلي" : "Cost Center Movement Report"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAr ? "استعراض قيود اليومية وحركات المصروفات والإيرادات المحملة تحليلياً على مراكز التكلفة" : "Detailed breakdown of debit/credit journal transactions posted to cost centers"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>{isAr ? "تصدير Excel (XLSX)" : "Export Excel"}</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/60 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{isAr ? "طباعة التقرير" : "Print Report"}</span>
          </button>
        </div>
      </div>

      {/* Filter Controls Card */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-4 print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">{isAr ? "مركز التكلفة:" : "Cost Center:"}</label>
            <select
              value={selectedCostCenterId}
              onChange={e => setSelectedCostCenterId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-emerald-500"
            >
              <option value="all">{isAr ? "--- كل مراكز التكلفة ---" : "--- All Cost Centers ---"}</option>
              {costCenters.map(cc => (
                <option key={cc.id} value={cc.id}>
                  {cc.level > 1 ? "  ↳ " : ""}{cc.code} - {isAr ? cc.nameAr : cc.nameEn} ({cc.level === 1 ? (isAr ? "رئيسي" : "Main") : (isAr ? "فرعي" : "Sub")})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">{isAr ? "الحساب المحاسبي (اختياري):" : "GL Account (Optional):"}</label>
            <select
              value={selectedAccountId}
              onChange={e => setSelectedAccountId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">{isAr ? "--- كل الحسابات ---" : "--- All Accounts ---"}</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.code} - {isAr ? acc.nameAr : acc.nameEn}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">{isAr ? "من تاريخ:" : "From Date:"}</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">{isAr ? "إلى تاريخ:" : "To Date:"}</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {selectedCostCenter && (
          <div className="flex items-center gap-3 pt-2 border-t border-slate-800/80 text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={includeChildren}
                onChange={e => setIncludeChildren(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
              <span>{isAr ? "تضمين حركات المراكز الفرعية التابعة لهذا المركز" : "Include Sub-centers movements"}</span>
            </label>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400 font-mono">
              {isAr ? `طبيعة المركز: ${selectedCostCenter.costCenterType === "revenue" ? "إيرادي" : "تكاليف ومصروفات"}` : `Type: ${selectedCostCenter.costCenterType}`}
            </span>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">{isAr ? "إجمالي المدين (حركات التكلفة)" : "Total Debit (Costs)"}</span>
            <TrendingUp className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-lg font-bold font-mono text-rose-400 mt-2">
            {formatCurrency(totalDebit, organization.currency, locale)}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">{isAr ? "إجمالي الدائن (حركات الإيراد)" : "Total Credit (Revenues)"}</span>
            <TrendingDown className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-bold font-mono text-emerald-400 mt-2">
            {formatCurrency(totalCredit, organization.currency, locale)}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">{isAr ? "صافي حركة المركز" : "Net Center Movement"}</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className={`text-lg font-bold font-mono mt-2 ${netMovement >= 0 ? "text-amber-400" : "text-emerald-400"}`}>
            {formatCurrency(Math.abs(netMovement), organization.currency, locale)}
            <span className="text-[10px] font-normal text-slate-400 ml-1">
              ({netMovement >= 0 ? (isAr ? "مدين صافي" : "Net Dr") : (isAr ? "دائن صافي" : "Net Cr")})
            </span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">{isAr ? "إجمالي عدد الحركات" : "Total Movements"}</span>
            <FileText className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-lg font-bold font-mono text-white mt-2">
            {movements.length} <span className="text-xs text-slate-400 font-normal">{isAr ? "حركة مقيدة" : "lines"}</span>
          </div>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table id="cost-center-movement-table" className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                <th className="p-3.5 font-mono">{isAr ? "التاريخ" : "Date"}</th>
                <th className="p-3.5 font-mono">{isAr ? "رقم القيد" : "Entry #"}</th>
                <th className="p-3.5">{isAr ? "مركز التكلفة" : "Cost Center"}</th>
                <th className="p-3.5">{isAr ? "الحساب المحاسبي" : "GL Account"}</th>
                <th className="p-3.5">{isAr ? "البيان / تفاصيل الحركة" : "Description"}</th>
                <th className="p-3.5 text-left font-mono">{isAr ? "مدين (+)" : "Debit (+)"}</th>
                <th className="p-3.5 text-left font-mono">{isAr ? "دائن (-)" : "Credit (-)"}</th>
                <th className="p-3.5 text-left font-mono">{isAr ? "الرصيد التراكمي" : "Balance"}</th>
                <th className="p-3.5 text-center">{isAr ? "المستند" : "Doc"}</th>
                <th className="p-3.5 text-center">{isAr ? "المستخدم" : "User"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-500">
                    <Layers className="w-10 h-10 mx-auto mb-3 opacity-30 text-emerald-400" />
                    <p className="text-sm font-semibold">{isAr ? "لا توجد حركات مسجلة لمراكز التكلفة ضمن معايير الفلترة المحددة" : "No cost center transactions found for selected filters"}</p>
                    <p className="text-xs text-slate-600 mt-1">{isAr ? "تأكد من توجيه قيود اليومية أو فواتير الشراء/البيع إلى مراكز التكلفة" : "Ensure journal entries or vouchers reference cost centers"}</p>
                  </td>
                </tr>
              ) : (
                movements.map(m => (
                  <tr key={m.id} className="hover:bg-slate-800/30">
                    <td className="p-3 font-mono text-slate-300">{formatDate(m.date, locale)}</td>
                    <td className="p-3 font-mono font-bold text-emerald-400">{m.entryNumber}</td>
                    <td className="p-3">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span className="font-mono text-slate-400 text-[11px]">{m.costCenterCode}</span>
                        <span>{m.costCenterName}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="text-slate-300">
                        <span className="font-mono text-slate-400 text-[11px] ml-1">{m.accountCode}</span>
                        <span>{m.accountName}</span>
                      </div>
                    </td>
                    <td className="p-3 text-slate-300 max-w-xs truncate" title={m.description}>
                      {m.description}
                    </td>
                    <td className="p-3 text-left font-mono font-bold text-rose-400">
                      {m.debit > 0 ? formatCurrency(m.debit, organization.currency, locale) : "-"}
                    </td>
                    <td className="p-3 text-left font-mono font-bold text-emerald-400">
                      {m.credit > 0 ? formatCurrency(m.credit, organization.currency, locale) : "-"}
                    </td>
                    <td className="p-3 text-left font-mono font-bold text-white">
                      {formatCurrency(m.runningBalance, organization.currency, locale)}
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                        {m.referenceType}
                      </span>
                    </td>
                    <td className="p-3 text-center text-slate-400 text-[11px]">
                      {m.user}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {movements.length > 0 && (
              <tfoot>
                <tr className="bg-slate-800/90 font-bold border-t-2 border-slate-700 text-white">
                  <td colSpan={5} className="p-3.5 text-right font-black">
                    {isAr ? "الإجمالي الكلي للحركات المحددة:" : "Total Movements Summary:"}
                  </td>
                  <td className="p-3.5 text-left font-mono font-black text-rose-400">
                    {formatCurrency(totalDebit, organization.currency, locale)}
                  </td>
                  <td className="p-3.5 text-left font-mono font-black text-emerald-400">
                    {formatCurrency(totalCredit, organization.currency, locale)}
                  </td>
                  <td className="p-3.5 text-left font-mono font-black text-amber-400">
                    {formatCurrency(netMovement, organization.currency, locale)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Printable Report Footer */}
      <ReportPrintFooter organization={organization} />
    </div>
  );
}
