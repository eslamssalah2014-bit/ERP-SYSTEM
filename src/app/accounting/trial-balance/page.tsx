"use client";

import React, { useState, useMemo } from "react";
import { useERP } from "@/context/erp-context";
import { computeTrialBalance } from "@/lib/accounting-engine";
import { formatCurrency } from "@/lib/utils";
import { exportTableToExcel } from "@/lib/excel-export";
import { ReportPrintHeader, ReportPrintFooter } from "@/components/ui/ReportPrintHeader";
import TableSkeleton from "@/components/ui/TableSkeleton";
import {
  Scale, CheckCircle2, AlertTriangle, Printer, Download,
  Filter, Search, Calendar, Layers, ChevronDown, Check
} from "lucide-react";

export default function TrialBalancePage() {
  const { accounts, journalEntries, organization, locale, isLoadingData } = useERP();
  const isAr = locale === "ar";

  // State
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("all");

  // Compute 6-column Trial Balance
  const tbData = useMemo(() => {
    return computeTrialBalance(accounts, journalEntries, {
      dateFrom: fromDate || undefined,
      dateTo: toDate || undefined,
      level: selectedLevel === "all" ? "all" : parseInt(selectedLevel, 10),
    });
  }, [accounts, journalEntries, fromDate, toDate, selectedLevel]);

  // Filter rows
  const filteredRows = useMemo(() => {
    return tbData.rows.filter((r) => {
      if (selectedType !== "all" && r.accountType !== selectedType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.accountCode.toLowerCase().includes(q) ||
          r.accountNameAr.toLowerCase().includes(q) ||
          r.accountNameEn.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [tbData.rows, selectedType, searchQuery]);

  // Export to genuine Excel XLSX
  const handleExportExcel = () => {
    exportTableToExcel("trial-balance-table", {
      filename: `ميزان_المراجعة_${new Date().toISOString().split("T")[0]}`,
      sheetName: isAr ? "ميزان المراجعة" : "Trial Balance"
    });
  };

  if (isLoadingData) {
    return <TableSkeleton rows={8} columns={8} summaryCards={3} isAr={isAr} />;
  }

  return (
    <div className="space-y-6">
      {/* Printable Report Header */}
      <ReportPrintHeader
        organization={organization}
        reportTitleAr="ميزان المراجعة بالأرصدة والمجاميع (المصفوفة السداسية)"
        reportTitleEn="Trial Balance (6-Column Matrix: Opening, Movements, Closing)"
        dateFrom={fromDate}
        dateTo={toDate}
        locale={locale}
        extraMeta={selectedLevel !== "all" ? `المستوى: L${selectedLevel}` : "كافة المستويات الشجرية"}
      />

      {/* Page Header */}
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-900/40">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <span>{isAr ? "ميزان المراجعة بالأرصدة والمجاميع (Trial Balance)" : "Trial Balance (6 Columns)"}</span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr
                  ? "المصفوفة السداسية الرسمية: أرصدة افتتاحية + حركات الفترة = أرصدة ختامية مع التحقق التلقائي من التوازن"
                  : "6-Column Matrix: Opening Balances + Period Movements = Closing Balances with automatic equilibrium"}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{isAr ? "طباعة الميزان" : "Print"}</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>{isAr ? "تصدير Excel (XLSX)" : "Export Excel"}</span>
          </button>
        </div>
      </div>

      {/* Balanced Indicator Banner */}
      <div
        className={
          "p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-bold print:hidden " +
          (tbData.isBalanced
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            : "bg-rose-500/10 border-rose-500/20 text-rose-400")
        }
      >
        <div className="flex items-center gap-2.5">
          {tbData.isBalanced ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
          <span>
            {tbData.isBalanced
              ? isAr
                ? "✓ ميزان المراجعة متزن محاسبياً تماماً عبر كافة المراحل (افتتاحي = حركات = ختامي)"
                : "Trial Balance is perfectly balanced across all columns"
              : isAr
              ? "⚠️ يوجد عدم تطابق بين إجمالي المدين وإجمالي الدائن"
              : "Imbalance detected"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 font-mono text-xs">
          <div>
            <span className="text-slate-400 ml-1 font-sans">{isAr ? "افتتاحي:" : "Opening:"}</span>
            <span className="text-white font-bold">{formatCurrency(tbData.totalOpeningDebit, organization.currency, locale)}</span>
          </div>
          <div>
            <span className="text-slate-400 ml-1 font-sans">{isAr ? "حركات:" : "Movements:"}</span>
            <span className="text-sky-400 font-bold">{formatCurrency(tbData.totalPeriodDebit, organization.currency, locale)}</span>
          </div>
          <div>
            <span className="text-slate-400 ml-1 font-sans">{isAr ? "ختامي:" : "Closing:"}</span>
            <span className="text-emerald-400 font-bold">{formatCurrency(tbData.totalEndingDebit, organization.currency, locale)}</span>
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs print:hidden">
        <div>
          <label className="block text-slate-400 font-bold mb-1">{isAr ? "المستوى الشجري:" : "Hierarchy Level:"}</label>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">{isAr ? "كافة المستويات (شامل)" : "All Levels"}</option>
            <option value="1">{isAr ? "المستوى 1: الحسابات الرئيسية الكبرى" : "Level 1: Main Groups"}</option>
            <option value="2">{isAr ? "المستوى 2: الحسابات العامة" : "Level 2: Control Accounts"}</option>
            <option value="3">{isAr ? "المستوى 3: الحسابات المساعدة" : "Level 3: Sub-Accounts"}</option>
            <option value="4">{isAr ? "المستوى 4: الحسابات الفرعية التفصيلية" : "Level 4: Detailed Postable"}</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-400 font-bold mb-1">{isAr ? "نوع الحساب:" : "Account Class:"}</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">{isAr ? "كافة المجموعات" : "All Classes"}</option>
            <option value="assets">{isAr ? "1. الأصول والموجودات" : "Assets"}</option>
            <option value="liabilities">{isAr ? "2. الخصوم والالتزامات" : "Liabilities"}</option>
            <option value="equity">{isAr ? "3. حقوق الملكية" : "Equity"}</option>
            <option value="revenue">{isAr ? "4. الإيرادات والمبيعات" : "Revenues"}</option>
            <option value="expense">{isAr ? "5. المصروفات والأعباء" : "Expenses"}</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-400 font-bold mb-1">{isAr ? "من تاريخ:" : "From Date:"}</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
          />
        </div>

        <div>
          <label className="block text-slate-400 font-bold mb-1">{isAr ? "إلى تاريخ:" : "To Date:"}</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
          />
        </div>
      </div>

      {/* 6-Column Matrix Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table id="trial-balance-table" className="w-full text-xs text-right border-collapse">
            <thead>
              {/* Group Header */}
              <tr className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 text-center">
                <th colSpan={3} className="p-2 border-l border-slate-800 text-right pr-4">
                  {isAr ? "بيانات الحساب الدفتري" : "Account Info"}
                </th>
                <th colSpan={2} className="p-2 border-l border-slate-800 bg-emerald-950/30 text-emerald-400 font-bold">
                  {isAr ? "الأرصدة الافتتاحية (Opening)" : "Opening Balances"}
                </th>
                <th colSpan={2} className="p-2 border-l border-slate-800 bg-sky-950/30 text-sky-400 font-bold">
                  {isAr ? "حركات الفترة (Movements)" : "Period Movements"}
                </th>
                <th colSpan={2} className="p-2 bg-emerald-900/30 text-emerald-300 font-bold">
                  {isAr ? "الأرصدة الختامية (Closing)" : "Closing Balances"}
                </th>
              </tr>

              {/* Sub-Column Header */}
              <tr className="bg-slate-800/90 text-slate-300 font-bold border-b border-slate-700">
                <th className="p-3.5 rounded-r-lg font-mono w-24">{isAr ? "كود الحساب" : "Code"}</th>
                <th className="p-3.5 min-w-[200px]">{isAr ? "اسم الحساب" : "Account Name"}</th>
                <th className="p-3.5 text-center w-16 border-l border-slate-700">{isAr ? "المستوى" : "Level"}</th>
                <th className="p-3.5 text-center font-mono w-28 text-emerald-400 bg-emerald-950/20">{isAr ? "مدين" : "Debit"}</th>
                <th className="p-3.5 text-center font-mono w-28 text-sky-400 bg-emerald-950/20 border-l border-slate-700">{isAr ? "دائن" : "Credit"}</th>
                <th className="p-3.5 text-center font-mono w-28 text-emerald-300 bg-sky-950/20">{isAr ? "مدين" : "Debit"}</th>
                <th className="p-3.5 text-center font-mono w-28 text-sky-300 bg-sky-950/20 border-l border-slate-700">{isAr ? "دائن" : "Credit"}</th>
                <th className="p-3.5 text-center font-mono w-32 text-emerald-400 bg-slate-950/60">{isAr ? "مدين" : "Debit"}</th>
                <th className="p-3.5 rounded-l-lg text-center font-mono w-32 text-sky-400 bg-slate-950/60">{isAr ? "دائن" : "Credit"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredRows.map((r) => {
                const isParent = r.isParent;
                return (
                  <tr
                    key={r.accountCode}
                    className={
                      isParent
                        ? r.level === 1
                          ? "bg-slate-950 font-black text-emerald-400 border-t-2 border-slate-800"
                          : "bg-slate-800/40 font-bold text-slate-200"
                        : "hover:bg-slate-800/30 transition-colors"
                    }
                  >
                    <td className="p-3 text-slate-400 font-bold">{r.accountCode}</td>
                    <td className="p-3 font-sans" style={{ paddingRight: `${r.level * 14}px` }}>
                      <span className="font-semibold text-white">
                        {isAr ? r.accountNameAr : r.accountNameEn}
                      </span>
                    </td>
                    <td className="p-3 text-center text-slate-500 text-[10px] border-l border-slate-800">
                      مستوى {r.level}
                    </td>

                    {/* Opening Balances */}
                    <td className="p-3 text-center text-emerald-400 bg-emerald-950/10">
                      {r.openingDebit > 0 ? formatCurrency(r.openingDebit, organization.currency, locale) : "-"}
                    </td>
                    <td className="p-3 text-center text-sky-400 bg-emerald-950/10 border-l border-slate-800">
                      {r.openingCredit > 0 ? formatCurrency(r.openingCredit, organization.currency, locale) : "-"}
                    </td>

                    {/* Period Movements */}
                    <td className="p-3 text-center text-slate-300 bg-sky-950/10">
                      {r.periodDebit > 0 ? formatCurrency(r.periodDebit, organization.currency, locale) : "-"}
                    </td>
                    <td className="p-3 text-center text-slate-300 bg-sky-950/10 border-l border-slate-800">
                      {r.periodCredit > 0 ? formatCurrency(r.periodCredit, organization.currency, locale) : "-"}
                    </td>

                    {/* Closing Balances */}
                    <td className="p-3 text-center font-bold text-emerald-400 bg-slate-950/40">
                      {r.endingDebit > 0 ? formatCurrency(r.endingDebit, organization.currency, locale) : "-"}
                    </td>
                    <td className="p-3 text-center font-bold text-sky-400 bg-slate-950/40">
                      {r.endingCredit > 0 ? formatCurrency(r.endingCredit, organization.currency, locale) : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-950 font-mono font-black text-sm text-white border-t-2 border-slate-700">
                <td colSpan={3} className="p-4 font-sans text-right border-l border-slate-800">
                  {isAr ? "الإجمالي الكلي لميزان المراجعة (Grand Totals):" : "Grand Totals:"}
                </td>
                <td className="p-4 text-center text-emerald-400 bg-emerald-950/40">
                  {formatCurrency(tbData.totalOpeningDebit, organization.currency, locale)}
                </td>
                <td className="p-4 text-center text-sky-400 bg-emerald-950/40 border-l border-slate-800">
                  {formatCurrency(tbData.totalOpeningCredit, organization.currency, locale)}
                </td>
                <td className="p-4 text-center text-slate-300 bg-sky-950/40">
                  {formatCurrency(tbData.totalPeriodDebit, organization.currency, locale)}
                </td>
                <td className="p-4 text-center text-slate-300 bg-sky-950/40 border-l border-slate-800">
                  {formatCurrency(tbData.totalPeriodCredit, organization.currency, locale)}
                </td>
                <td className="p-4 text-center text-emerald-400 bg-slate-950">
                  {formatCurrency(tbData.totalEndingDebit, organization.currency, locale)}
                </td>
                <td className="p-4 text-center text-sky-400 bg-slate-950">
                  {formatCurrency(tbData.totalEndingCredit, organization.currency, locale)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Printable Report Footer */}
      <ReportPrintFooter organization={organization} />
    </div>
  );
}
