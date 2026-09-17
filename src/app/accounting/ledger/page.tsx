"use client";

import React, { useState, useMemo } from "react";
import { useERP } from "@/context/erp-context";
import { computeGeneralLedgerSummary, GeneralLedgerSummaryRow, computeMonthlyJournalNumbers } from "@/lib/accounting-engine";
import { formatCurrency, formatDate } from "@/lib/utils";
import { exportTableToExcel } from "@/lib/excel-export";
import { ReportPrintHeader, ReportPrintFooter } from "@/components/ui/ReportPrintHeader";
import TableSkeleton from "@/components/ui/TableSkeleton";
import {
  BookOpen, Search, Printer, Download, Filter,
  Calendar, Layers, FileText, ArrowUpDown, ChevronDown, CheckCircle2
} from "lucide-react";

export default function LedgerPage() {
  const { accounts, journalEntries, organization, locale, isLoadingData } = useERP();
  const isAr = locale === "ar";

  const monthlyNumbers = useMemo(() => computeMonthlyJournalNumbers(journalEntries), [journalEntries]);

  // State
  const [viewMode, setViewMode] = useState<"summary" | "detailed">("summary");
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || "");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // 1. Compute 8-column summary matrix across all accounts
  const summaryData = useMemo(() => {
    return computeGeneralLedgerSummary(accounts, journalEntries, fromDate || undefined, toDate || undefined);
  }, [accounts, journalEntries, fromDate, toDate]);

  // Filter summary rows
  const filteredSummaryRows = useMemo(() => {
    return summaryData.rows.filter((r) => {
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
  }, [summaryData.rows, selectedType, searchQuery]);

  // 2. Compute detailed lines for the selected account
  const selectedAccount = useMemo(() => {
    return accounts.find((a) => a.id === selectedAccountId) || accounts[0];
  }, [accounts, selectedAccountId]);

  const detailedLedger = useMemo(() => {
    if (!selectedAccount) return { openingBalance: 0, openingDr: 0, openingCr: 0, lines: [], endingBalance: 0 };

    let openDr = 0;
    let openCr = 0;
    const periodLines: Array<{
      journalEntryId?: string;
      date: string;
      entryNumber: string;
      description: string;
      referenceType: string;
      debit: number;
      credit: number;
      runningBalance: number;
      isOpening?: boolean;
    }> = [];

    // Filter opening entries vs period entries
    journalEntries.forEach((entry) => {
      const isOpening =
        entry.referenceType === "opening_entry" ||
        entry.entryNumber?.startsWith("OPENING-") ||
        entry.entryNumber?.startsWith("JV-OPENING-");
      const isBeforeFrom = fromDate ? entry.date < fromDate : false;
      const isInPeriod = (!fromDate || entry.date >= fromDate) && (!toDate || entry.date <= toDate);

      entry.lines?.forEach((line) => {
        if (line.accountId === selectedAccount.id || line.accountCode === selectedAccount.code) {
          const dr = Number(line.debit) || 0;
          const cr = Number(line.credit) || 0;

          if (isOpening || isBeforeFrom) {
            openDr += dr;
            openCr += cr;
          } else if (isInPeriod) {
            periodLines.push({
              journalEntryId: entry.id,
              date: entry.date,
              entryNumber: entry.entryNumber,
              description: line.description || entry.description,
              referenceType: entry.referenceType,
              debit: dr,
              credit: cr,
              runningBalance: 0,
            });
          }
        }
      });
    });

    // Opening net
    const netOpen = selectedAccount.nature === "debit" ? (openDr - openCr) : (openCr - openDr);
    let running = netOpen;

    // Sort period lines by date
    periodLines.sort((a, b) => a.date.localeCompare(b.date));

    // Calculate running balance
    periodLines.forEach((l) => {
      const change = selectedAccount.nature === "debit" ? (l.debit - l.credit) : (l.credit - l.debit);
      running += change;
      l.runningBalance = running;
    });

    return {
      openingBalance: netOpen,
      openingDr: openDr,
      openingCr: openCr,
      lines: periodLines,
      endingBalance: running,
    };
  }, [selectedAccount, journalEntries, fromDate, toDate]);

  // Export to genuine Excel XLSX
  const handleExportExcel = () => {
    if (viewMode === "summary") {
      exportTableToExcel("gl-summary-table", {
        filename: `مصفوفة_الأستاذ_العام_${new Date().toISOString().split("T")[0]}`,
        sheetName: isAr ? "مصفوفة الأستاذ العام" : "GL Summary"
      });
    } else {
      exportTableToExcel("gl-detailed-table", {
        filename: `كشف_حساب_${selectedAccount?.code || "GL"}_${new Date().toISOString().split("T")[0]}`,
        sheetName: isAr ? `حساب ${selectedAccount?.code}` : `Account ${selectedAccount?.code}`
      });
    }
  };

  if (isLoadingData) {
    return <TableSkeleton rows={8} columns={8} summaryCards={3} isAr={isAr} />;
  }

  return (
    <div className="space-y-6">
      {/* Printable Report Header */}
      <ReportPrintHeader
        organization={organization}
        reportTitleAr={viewMode === "summary" ? "مصفوفة ملخص دفتر الأستاذ العام (8 أعمدة)" : `كشف حساب تفصيلي: ${selectedAccount?.nameAr} (${selectedAccount?.code})`}
        reportTitleEn={viewMode === "summary" ? "General Ledger 8-Column Summary Matrix" : `Account Ledger: ${selectedAccount?.nameEn} (${selectedAccount?.code})`}
        dateFrom={fromDate}
        dateTo={toDate}
        locale={locale}
        extraMeta={viewMode === "detailed" ? `طبيعة الحساب: ${selectedAccount?.nature === "debit" ? "مدين" : "دائن"}` : undefined}
      />

      {/* Page Header */}
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-900/40">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <span>{isAr ? "دفتر الأستاذ العام (General Ledger)" : "General Ledger"}</span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr
                  ? "كشف حركة تفصيلي وشامل للأستاذ العام يبدأ برصيد أول المدة المعتمد مع احتساب الأرصدة التراكمية لحظياً"
                  : "General Ledger report with 8-column summary matrix and detailed beginning-balance ledger view"}
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Toggle & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-slate-950 p-1 border border-slate-800 rounded-xl flex items-center text-xs font-bold">
            <button
              onClick={() => setViewMode("summary")}
              className={"px-3 py-1.5 rounded-lg transition-colors cursor-pointer " + (
                viewMode === "summary"
                  ? "bg-emerald-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              )}
            >
              {isAr ? "مصفوفة الأستاذ (8 أعمدة)" : "8-Column Summary"}
            </button>
            <button
              onClick={() => setViewMode("detailed")}
              className={"px-3 py-1.5 rounded-lg transition-colors cursor-pointer " + (
                viewMode === "detailed"
                  ? "bg-emerald-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              )}
            >
              {isAr ? "كشف حساب تفصيلي" : "Account Ledger"}
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{isAr ? "طباعة" : "Print"}</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>{isAr ? "تصدير Excel (XLSX)" : "Export Excel"}</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs print:hidden">
        {viewMode === "detailed" && (
          <div className="md:col-span-2">
            <label className="block text-slate-400 font-bold mb-1">
              {isAr ? "اختر الحساب الدفتري المراد فحصه:" : "Select Account:"}
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-emerald-500"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} - {a.nameAr} ({a.nature === "debit" ? "مدين" : "دائن"})
                </option>
              ))}
            </select>
          </div>
        )}

        {viewMode === "summary" && (
          <div>
            <label className="block text-slate-400 font-bold mb-1">{isAr ? "نوع الحساب:" : "Account Type:"}</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-emerald-500"
            >
              <option value="all">{isAr ? "كافة الأنواع" : "All Types"}</option>
              <option value="assets">{isAr ? "1. أصول" : "Assets"}</option>
              <option value="liabilities">{isAr ? "2. خصوم" : "Liabilities"}</option>
              <option value="equity">{isAr ? "3. حقوق ملكية" : "Equity"}</option>
              <option value="revenue">{isAr ? "4. إيرادات" : "Revenue"}</option>
              <option value="expense">{isAr ? "5. مصروفات" : "Expenses"}</option>
            </select>
          </div>
        )}

        {viewMode === "summary" && (
          <div>
            <label className="block text-slate-400 font-bold mb-1">{isAr ? "بحث بالحساب:" : "Search Account:"}</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? "كود أو اسم الحساب..." : "Search..."}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        )}

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

      {/* VIEW MODE 1: 8-Column Summary Matrix */}
      {viewMode === "summary" && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table id="gl-summary-table" className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-slate-800/90 text-slate-300 font-bold border-b border-slate-700">
                    <th className="p-3.5 rounded-r-lg font-mono w-24">{isAr ? "كود الحساب" : "Code"}</th>
                    <th className="p-3.5 min-w-[180px]">{isAr ? "اسم الحساب الدفتري" : "Account Name"}</th>
                    <th className="p-3.5 text-center font-mono w-28 text-emerald-400 bg-emerald-950/20">{isAr ? "مدين افتتاحي" : "Opening Dr"}</th>
                    <th className="p-3.5 text-center font-mono w-28 text-sky-400 bg-sky-950/20">{isAr ? "دائن افتتاحي" : "Opening Cr"}</th>
                    <th className="p-3.5 text-center font-mono w-28 text-emerald-300">{isAr ? "حركات مدينة" : "Period Dr"}</th>
                    <th className="p-3.5 text-center font-mono w-28 text-sky-300">{isAr ? "حركات دائنة" : "Period Cr"}</th>
                    <th className="p-3.5 text-center font-mono w-32 text-emerald-400 bg-slate-950/60">{isAr ? "رصيد ختامي مدين" : "Ending Dr"}</th>
                    <th className="p-3.5 rounded-l-lg text-center font-mono w-32 text-sky-400 bg-slate-950/60">{isAr ? "رصيد ختامي دائن" : "Ending Cr"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredSummaryRows.map((r) => (
                    <tr
                      key={r.accountCode}
                      onClick={() => {
                        const matched = accounts.find((a) => a.code === r.accountCode);
                        if (matched) {
                          setSelectedAccountId(matched.id);
                          setViewMode("detailed");
                        }
                      }}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="p-3 text-slate-400 font-bold">{r.accountCode}</td>
                      <td className="p-3 font-sans font-semibold text-white">
                        {isAr ? r.accountNameAr : r.accountNameEn}
                      </td>
                      <td className="p-3 text-center text-emerald-400 font-semibold bg-emerald-950/10">
                        {r.openingDebit > 0 ? formatCurrency(r.openingDebit, organization.currency, locale) : "-"}
                      </td>
                      <td className="p-3 text-center text-sky-400 font-semibold bg-sky-950/10">
                        {r.openingCredit > 0 ? formatCurrency(r.openingCredit, organization.currency, locale) : "-"}
                      </td>
                      <td className="p-3 text-center text-slate-300">
                        {r.periodDebit > 0 ? formatCurrency(r.periodDebit, organization.currency, locale) : "-"}
                      </td>
                      <td className="p-3 text-center text-slate-300">
                        {r.periodCredit > 0 ? formatCurrency(r.periodCredit, organization.currency, locale) : "-"}
                      </td>
                      <td className="p-3 text-center font-bold text-emerald-400 bg-slate-950/30">
                        {r.endingDebit > 0 ? formatCurrency(r.endingDebit, organization.currency, locale) : "-"}
                      </td>
                      <td className="p-3 text-center font-bold text-sky-400 bg-slate-950/30">
                        {r.endingCredit > 0 ? formatCurrency(r.endingCredit, organization.currency, locale) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-950 font-mono font-black text-sm text-white border-t-2 border-slate-700">
                    <td colSpan={2} className="p-4 font-sans text-right">
                      {isAr ? "الإجمالي الكلي لدفتر الأستاذ (Totals):" : "Totals:"}
                    </td>
                    <td className="p-4 text-center text-emerald-400 bg-emerald-950/30">
                      {formatCurrency(summaryData.totalOpeningDebit, organization.currency, locale)}
                    </td>
                    <td className="p-4 text-center text-sky-400 bg-sky-950/30">
                      {formatCurrency(summaryData.totalOpeningCredit, organization.currency, locale)}
                    </td>
                    <td className="p-4 text-center text-slate-300">
                      {formatCurrency(summaryData.totalPeriodDebit, organization.currency, locale)}
                    </td>
                    <td className="p-4 text-center text-slate-300">
                      {formatCurrency(summaryData.totalPeriodCredit, organization.currency, locale)}
                    </td>
                    <td className="p-4 text-center text-emerald-400 bg-slate-950">
                      {formatCurrency(summaryData.totalEndingDebit, organization.currency, locale)}
                    </td>
                    <td className="p-4 text-center text-sky-400 bg-slate-950">
                      {formatCurrency(summaryData.totalEndingCredit, organization.currency, locale)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: Detailed Account Ledger (with Opening Balance as Line #1) */}
      {viewMode === "detailed" && (
        <div className="space-y-4">
          {/* Account Header Card */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-950 p-5 rounded-3xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-sm font-black bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-xl border border-emerald-500/30">
                  {selectedAccount.code}
                </span>
                <h2 className="text-base font-bold text-white">
                  {isAr ? selectedAccount.nameAr : selectedAccount.nameEn}
                </h2>
                <span className="text-xs text-slate-400 font-semibold">
                  ({selectedAccount.nature === "debit" ? (isAr ? "طبيعة مدينة" : "Debit Nature") : (isAr ? "طبيعة دائنة" : "Credit Nature")})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs font-mono">
              <div>
                <span className="text-slate-400 block text-[11px] font-sans">{isAr ? "رصيد أول المدة:" : "Opening:"}</span>
                <span className="text-sm font-black text-amber-300">
                  {formatCurrency(detailedLedger.openingBalance, organization.currency, locale)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] font-sans">{isAr ? "الرصيد الختامي الحالي:" : "Ending Balance:"}</span>
                <span className="text-sm font-black text-emerald-400">
                  {formatCurrency(detailedLedger.endingBalance, organization.currency, locale)}
                </span>
              </div>
            </div>
          </div>

          {/* Detailed Movements Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table id="gl-detailed-table" className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                    <th className="p-3.5 rounded-r-lg w-28">{isAr ? "التاريخ" : "Date"}</th>
                    <th className="p-3.5 font-mono w-40">{isAr ? "رقم السند / القيد" : "Entry No"}</th>
                    <th className="p-3.5">{isAr ? "البيان / شرح الحركة" : "Description"}</th>
                    <th className="p-3.5 text-center font-mono w-32 text-emerald-400">{isAr ? "مدين (Debit)" : "Debit"}</th>
                    <th className="p-3.5 text-center font-mono w-32 text-sky-400">{isAr ? "دائن (Credit)" : "Credit"}</th>
                    <th className="p-3.5 rounded-l-lg text-center font-mono w-36 text-white">{isAr ? "الرصيد التراكمي" : "Running Balance"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {/* Movement #1: The Official Opening Balance */}
                  <tr className="bg-amber-500/10 border-b border-amber-500/20 font-bold text-amber-200">
                    <td className="p-3.5 font-sans">{fromDate || "2026-01-01"}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded text-[11px] font-bold">
                        OPENING-ENTRY
                      </span>
                    </td>
                    <td className="p-3.5 font-sans font-bold text-amber-300">
                      {isAr ? "رصيد أول المدة الافتتاحي المعتمد (Beginning Balance)" : "Official Beginning Balance"}
                    </td>
                    <td className="p-3.5 text-center text-emerald-400">
                      {detailedLedger.openingDr > 0 ? formatCurrency(detailedLedger.openingDr, organization.currency, locale) : "-"}
                    </td>
                    <td className="p-3.5 text-center text-sky-400">
                      {detailedLedger.openingCr > 0 ? formatCurrency(detailedLedger.openingCr, organization.currency, locale) : "-"}
                    </td>
                    <td className="p-3.5 text-center font-black text-amber-300 bg-amber-950/20">
                      {formatCurrency(detailedLedger.openingBalance, organization.currency, locale)}
                    </td>
                  </tr>

                  {/* Chronological Period Movements */}
                  {detailedLedger.lines.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500 font-sans">
                        {isAr ? "لا توجد حركات تالية مقيدة خلال الفترة المحددة" : "No period transactions found"}
                      </td>
                    </tr>
                  ) : (
                    detailedLedger.lines.map((l, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3.5 font-sans text-slate-300">{formatDate(l.date, locale)}</td>
                        <td className="p-3.5 text-slate-400 font-bold">
                          <div className="flex items-center gap-1.5 font-mono">
                            {l.journalEntryId && monthlyNumbers[l.journalEntryId] && (
                              <span
                                className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold text-[11px] border border-emerald-500/20"
                                title={isAr ? "رقم القيد الشهري (الشهر/المسلسل)" : "Monthly Journal Number (Month/Seq)"}
                              >
                                {monthlyNumbers[l.journalEntryId]}
                              </span>
                            )}
                            <span>{l.entryNumber}</span>
                          </div>
                        </td>
                        <td className="p-3.5 font-sans text-white font-semibold">{l.description}</td>
                        <td className="p-3.5 text-center font-bold text-emerald-400">
                          {l.debit > 0 ? formatCurrency(l.debit, organization.currency, locale) : "-"}
                        </td>
                        <td className="p-3.5 text-center font-bold text-sky-400">
                          {l.credit > 0 ? formatCurrency(l.credit, organization.currency, locale) : "-"}
                        </td>
                        <td className="p-3.5 text-center font-black text-white bg-slate-950/40">
                          {formatCurrency(l.runningBalance, organization.currency, locale)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-950 font-mono font-black text-sm text-white border-t-2 border-slate-700">
                    <td colSpan={3} className="p-4 font-sans text-right">
                      {isAr ? "الرصيد الختامي للحساب بنهاية الفترة:" : "Account Ending Balance:"}
                    </td>
                    <td className="p-4 text-center text-emerald-400">
                      {formatCurrency(
                        detailedLedger.lines.reduce((s, l) => s + l.debit, 0) + detailedLedger.openingDr,
                        organization.currency,
                        locale
                      )}
                    </td>
                    <td className="p-4 text-center text-sky-400">
                      {formatCurrency(
                        detailedLedger.lines.reduce((s, l) => s + l.credit, 0) + detailedLedger.openingCr,
                        organization.currency,
                        locale
                      )}
                    </td>
                    <td className="p-4 text-center text-emerald-400 bg-slate-950 font-black">
                      {formatCurrency(detailedLedger.endingBalance, organization.currency, locale)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Printable Report Footer */}
      <ReportPrintFooter organization={organization} />
    </div>
  );
}
