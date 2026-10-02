"use client";

import React, { useState, useMemo } from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import { exportTableToExcel } from "@/lib/excel-export";
import { ReportPrintHeader, ReportPrintFooter } from "@/components/ui/ReportPrintHeader";
import TableSkeleton from "@/components/ui/TableSkeleton";
import { CostCenterType, Account, JournalLine } from "@/types/erp";
import Link from "next/link";
import {
  Layers, Filter, Printer, Download, ArrowRight,
  TrendingUp, TrendingDown, DollarSign, Calendar, FileText, CheckCircle2, ChevronRight,
  PieChart, BarChart3, Activity, ArrowUpRight, ArrowDownRight, Percent
} from "lucide-react";

export default function CostCenterReportPage() {
  const { costCenters, journalEntries, accounts, organization, locale, isLoadingData } = useERP();
  const isAr = locale === "ar";

  // Navigation tab: Statement | Analysis | Dashboard
  const [activeTab, setActiveTab] = useState<"statement" | "analysis" | "dashboard">("statement");

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

  // Target Cost Center IDs (including recursive children if requested)
  const targetCostCenterIds = useMemo(() => {
    if (selectedCostCenterId === "all") return null;
    const ids = new Set<string>([selectedCostCenterId]);
    if (includeChildren) {
      const addChildren = (parentId: string) => {
        costCenters.filter(c => c.parentId === parentId).forEach(child => {
          ids.add(child.id);
          addChildren(child.id);
        });
      };
      addChildren(selectedCostCenterId);
    }
    return ids;
  }, [selectedCostCenterId, includeChildren, costCenters]);

  // Helper to identify offsetting balance-sheet cash/bank/clearing accounts
  const isOffsettingLiquidityAccount = (accountId: string, accountCode?: string, accountName?: string) => {
    const acc = accounts.find(a => a.id === accountId);
    const code = accountCode || acc?.code || "";
    const name = ((acc?.nameAr || "") + " " + (acc?.nameEn || "") + " " + (accountName || "")).toLowerCase();
    return (
      code.startsWith("1101") || // Cash and Bank
      code.startsWith("1102002") || // Notes Receivable
      code.startsWith("2101002") || // Notes Payable
      code.startsWith("1209") || // Accumulated depreciation
      name.includes("صندوق") ||
      name.includes("بنك") ||
      name.includes("نقدية") ||
      name.includes("خزينة") ||
      name.includes("cash") ||
      name.includes("bank") ||
      name.includes("treasury")
    );
  };

  // Extract and aggregate movement lines, strictly eliminating offsetting double entries
  const movements = useMemo(() => {
    const list: Array<{
      id: string;
      date: string;
      entryNumber: string;
      costCenterId: string;
      costCenterCode: string;
      costCenterName: string;
      costCenterType: CostCenterType;
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

      // Filter lines tagged with cost centers
      const taggedLines = entry.lines.filter(l => l.costCenterId);
      if (taggedLines.length === 0) return;

      // Group tagged lines by costCenterId to detect double-sided journal entries
      const linesByCc = new Map<string, JournalLine[]>();
      taggedLines.forEach(l => {
        const arr = linesByCc.get(l.costCenterId!) || [];
        arr.push(l);
        linesByCc.set(l.costCenterId!, arr);
      });

      linesByCc.forEach((ccLines, ccId) => {
        if (targetCostCenterIds && !targetCostCenterIds.has(ccId)) return;

        const cc = costCenters.find(c => c.id === ccId);
        const ccType = (cc?.costCenterType || cc?.type || "expense") as CostCenterType;

        // If the journal entry has both sides tagged with the same cost center,
        // filter out the offsetting entry:
        let validLines = ccLines;
        if (ccLines.length > 1) {
          // Check if one of them is an operational line (revenue/expense/asset/customer) and the other is cash/bank
          const nonCashLines = ccLines.filter(l => !isOffsettingLiquidityAccount(l.accountId, l.accountCode, l.accountName));
          if (nonCashLines.length > 0 && nonCashLines.length < ccLines.length) {
            validLines = nonCashLines;
          } else {
            // If both or neither are cash, filter based on CC nature:
            // For revenue CC: prioritize credit lines (sales/revenue); drop debit offset
            // For expense CC: prioritize debit lines (cost/expense); drop credit offset
            if (ccType === "revenue") {
              const crLines = ccLines.filter(l => (Number(l.credit) || 0) > 0);
              if (crLines.length > 0) validLines = crLines;
            } else {
              const drLines = ccLines.filter(l => (Number(l.debit) || 0) > 0);
              if (drLines.length > 0) validLines = drLines;
            }
          }
        }

        validLines.forEach((line, idx) => {
          // Account filter
          if (selectedAccountId !== "all" && line.accountId !== selectedAccountId) return;

          const acc = accounts.find(a => a.id === line.accountId);

          list.push({
            id: `${entry.id}-${ccId}-${idx}`,
            date: entry.date,
            entryNumber: entry.entryNumber,
            costCenterId: ccId,
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
        currentBalance += (item.credit - item.debit);
      } else {
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

  // Analysis Breakdown by Account
  const accountBreakdown = useMemo(() => {
    const map = new Map<string, {
      accountId: string;
      accountCode: string;
      accountName: string;
      debit: number;
      credit: number;
      net: number;
      count: number;
    }>();

    movements.forEach(m => {
      const existing = map.get(m.accountId) || {
        accountId: m.accountId,
        accountCode: m.accountCode,
        accountName: m.accountName,
        debit: 0,
        credit: 0,
        net: 0,
        count: 0
      };
      existing.debit += m.debit;
      existing.credit += m.credit;
      existing.net += (m.debit - m.credit);
      existing.count += 1;
      map.set(m.accountId, existing);
    });

    return Array.from(map.values()).sort((a, b) => (b.debit + b.credit) - (a.debit + a.credit));
  }, [movements]);

  // Dashboard Breakdown by Cost Center
  const costCenterBreakdown = useMemo(() => {
    const map = new Map<string, {
      id: string;
      code: string;
      name: string;
      type: CostCenterType;
      debit: number;
      credit: number;
      net: number;
      count: number;
    }>();

    movements.forEach(m => {
      const existing = map.get(m.costCenterId) || {
        id: m.costCenterId,
        code: m.costCenterCode,
        name: m.costCenterName,
        type: m.costCenterType,
        debit: 0,
        credit: 0,
        net: 0,
        count: 0
      };
      existing.debit += m.debit;
      existing.credit += m.credit;
      existing.net += (m.debit - m.credit);
      existing.count += 1;
      map.set(m.costCenterId, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.debit - a.debit);
  }, [movements]);

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
        reportTitleAr={`تقرير وكشف حساب مراكز التكلفة التحليلي ${selectedCostCenter ? `(${selectedCostCenter.nameAr})` : ""}`}
        reportTitleEn={`Cost Center Statement & Analytical Report ${selectedCostCenter ? `(${selectedCostCenter.nameEn})` : ""}`}
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
            <span className="text-white font-semibold">{isAr ? "التقارير وكشوف الحسابات" : "Reports & Statements"}</span>
          </div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-emerald-400" />
            <span>{isAr ? "تقارير وتحليلات مراكز التكلفة" : "Cost Center Reports & Analytics"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAr ? "استعراض حركات مراكز التكلفة بدقة دون ازدواجية في قيود المقاصة البنكية أو النقدية" : "Clean operational cost center reporting eliminating offsetting liquidity entries"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab Selector */}
          <div className="bg-slate-950 p-1 rounded-2xl border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => setActiveTab("statement")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "statement" ? "bg-emerald-600 text-white shadow-md shadow-emerald-950" : "text-slate-400 hover:text-white"
              }`}
            >
              {isAr ? "كشف الحساب" : "Statement"}
            </button>
            <button
              onClick={() => setActiveTab("analysis")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "analysis" ? "bg-emerald-600 text-white shadow-md shadow-emerald-950" : "text-slate-400 hover:text-white"
              }`}
            >
              {isAr ? "التحليل المالي" : "Analysis"}
            </button>
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "dashboard" ? "bg-emerald-600 text-white shadow-md shadow-emerald-950" : "text-slate-400 hover:text-white"
              }`}
            >
              {isAr ? "لوحة المؤشرات" : "Dashboard"}
            </button>
          </div>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">{isAr ? "تصدير Excel" : "Export"}</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/60 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{isAr ? "طباعة" : "Print"}</span>
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
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">{isAr ? "إجمالي التكاليف والمصروفات (مدين)" : "Total Costs / Expenses"}</span>
            <TrendingUp className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-lg font-bold font-mono text-rose-400 mt-2">
            {formatCurrency(totalDebit, organization.currency, locale)}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">{isAr ? "إجمالي الإيرادات المحققة (دائن)" : "Total Revenues"}</span>
            <TrendingDown className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-bold font-mono text-emerald-400 mt-2">
            {formatCurrency(totalCredit, organization.currency, locale)}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
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

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">{isAr ? "عدد الحركات المقيدة" : "Total Movements"}</span>
            <FileText className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-lg font-bold font-mono text-white mt-2">
            {movements.length} <span className="text-xs text-slate-400 font-normal">{isAr ? "حركة" : "lines"}</span>
          </div>
        </div>
      </div>

      {/* VIEW TAB 1: STATEMENT (كشف حساب مركز التكلفة) */}
      {activeTab === "statement" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>{isAr ? "كشف حركة مركز التكلفة التفصيلي (Cost Center Statement)" : "Cost Center Statement"}</span>
            </h3>
            <span className="text-xs text-slate-400">
              {isAr ? "يعرض فقط الطرف المحمل على مركز التكلفة دون تكرار قيد المقاصة" : "Shows operational line only without offsetting cash entries"}
            </span>
          </div>
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
      )}

      {/* VIEW TAB 2: ANALYSIS (تحليل مركز التكلفة حسب الحسابات) */}
      {activeTab === "analysis" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <span>{isAr ? "تحليل مراكز التكلفة المالي حسب الحسابات المحاسبية (Cost Center Analysis)" : "Cost Center Account Analysis"}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {isAr ? "توزيع المصروفات والإيرادات المحملة ونسبتها المئوية من إجمالي حركة المركز" : "Expense and revenue contribution percentage per GL account"}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                  <th className="p-3.5 font-mono">{isAr ? "كود الحساب" : "Account Code"}</th>
                  <th className="p-3.5">{isAr ? "اسم الحساب المحاسبي" : "Account Name"}</th>
                  <th className="p-3.5 text-center">{isAr ? "عدد الحركات" : "Operations"}</th>
                  <th className="p-3.5 text-left font-mono">{isAr ? "إجمالي المدين (تكاليف)" : "Total Debit"}</th>
                  <th className="p-3.5 text-left font-mono">{isAr ? "إجمالي الدائن (إيرادات)" : "Total Credit"}</th>
                  <th className="p-3.5 text-left font-mono">{isAr ? "الصافي" : "Net"}</th>
                  <th className="p-3.5 text-left">{isAr ? "النسبة من الإجمالي" : "% Share"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {accountBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      {isAr ? "لا توجد بيانات متاحة للتحليل" : "No data available for analysis"}
                    </td>
                  </tr>
                ) : (
                  accountBreakdown.map(acc => {
                    const totalVolume = totalDebit + totalCredit;
                    const accVolume = acc.debit + acc.credit;
                    const percent = totalVolume > 0 ? (accVolume / totalVolume) * 100 : 0;
                    return (
                      <tr key={acc.accountId} className="hover:bg-slate-800/30">
                        <td className="p-3 font-mono font-bold text-slate-300">{acc.accountCode}</td>
                        <td className="p-3 font-bold text-white">{acc.accountName}</td>
                        <td className="p-3 text-center font-mono text-slate-400">{acc.count}</td>
                        <td className="p-3 text-left font-mono font-bold text-rose-400">
                          {acc.debit > 0 ? formatCurrency(acc.debit, organization.currency, locale) : "-"}
                        </td>
                        <td className="p-3 text-left font-mono font-bold text-emerald-400">
                          {acc.credit > 0 ? formatCurrency(acc.credit, organization.currency, locale) : "-"}
                        </td>
                        <td className={`p-3 text-left font-mono font-bold ${acc.net >= 0 ? "text-amber-400" : "text-emerald-400"}`}>
                          {formatCurrency(acc.net, organization.currency, locale)}
                        </td>
                        <td className="p-3 text-left">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, percent)}%` }} />
                            </div>
                            <span className="font-mono text-slate-400">{percent.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW TAB 3: DASHBOARD (لوحة مؤشرات مراكز التكلفة) */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Cost Centers by Activity */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-4">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <PieChart className="w-4 h-4 text-emerald-400" />
                <span>{isAr ? "مراكز التكلفة الأكثر نشاطاً" : "Top Cost Centers by Activity"}</span>
              </h3>
              <div className="space-y-3">
                {costCenterBreakdown.slice(0, 6).map(cc => {
                  const share = totalDebit > 0 ? (cc.debit / totalDebit) * 100 : 0;
                  return (
                    <div key={cc.id} className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white text-xs flex items-center gap-1.5">
                          <span className="font-mono text-emerald-400">{cc.code}</span>
                          <span>{cc.name}</span>
                        </div>
                        <span className="text-[11px] text-slate-500">{cc.count} حركات مسجلة</span>
                      </div>
                      <div className="text-left font-mono">
                        <div className="font-bold text-rose-400 text-xs">{formatCurrency(cc.debit, organization.currency, locale)}</div>
                        <div className="text-[10px] text-slate-400">{share.toFixed(1)}% من التكاليف</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Summary Analysis */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-4">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>{isAr ? "كفاءة التكاليف ومؤشرات الأداء" : "Cost Efficiency & KPIs"}</span>
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <span className="text-slate-400 block mb-1">{isAr ? "المراكز النشطة" : "Active Centers"}</span>
                  <span className="text-xl font-bold font-mono text-white">{costCenterBreakdown.length}</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <span className="text-slate-400 block mb-1">{isAr ? "متوسط تكلفة الحركة" : "Avg per Line"}</span>
                  <span className="text-xl font-bold font-mono text-emerald-400">
                    {movements.length > 0 ? formatCurrency(totalDebit / movements.length, organization.currency, locale) : "0"}
                  </span>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <span className="text-slate-400 block mb-1">{isAr ? "نسبة التكلفة إلى الإيراد" : "Cost/Revenue Ratio"}</span>
                  <span className="text-xl font-bold font-mono text-amber-400">
                    {totalCredit > 0 ? `${((totalDebit / totalCredit) * 100).toFixed(1)}%` : "N/A"}
                  </span>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <span className="text-slate-400 block mb-1">{isAr ? "حسابات المحاسبة المتأثرة" : "Impacted Accounts"}</span>
                  <span className="text-xl font-bold font-mono text-blue-400">{accountBreakdown.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Report Footer */}
      <ReportPrintFooter organization={organization} />
    </div>
  );
}
