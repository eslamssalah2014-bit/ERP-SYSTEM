"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency, formatDate, generateId } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import TableSkeleton from "@/components/ui/TableSkeleton";
import { JournalEntry, JournalLine, Account, AccountType } from "@/types/erp";
import {
  Scale, CheckCircle2, AlertTriangle, Printer, Download, Save,
  RotateCcw, Lock, Unlock, Search, Layers, FileSpreadsheet,
  Building, Calendar, ShieldCheck, Check, Info, FileText, ChevronDown, ChevronRight
} from "lucide-react";

export default function OpeningBalancePage() {
  const {
    accounts,
    journalEntries,
    postOpeningEntry,
    organization,
    activeBranchId,
    currentUser,
    locale,
    showToast,
    isLoadingData,
  } = useERP();

  const isAr = locale === "ar";
  const currentYear = new Date().getFullYear().toString();

  // State
  const [selectedYear, setSelectedYear] = useState<string>(currentYear);
  const [entryDate, setEntryDate] = useState<string>(`${currentYear}-01-01`);
  const [description, setDescription] = useState<string>(
    isAr ? `القيد الافتتاحي وإثبات أرصدة أول المدة للسنة المالية ${currentYear}` : `Opening Balance Entry for Fiscal Year ${currentYear}`
  );
  const [selectedTypeTab, setSelectedTypeTab] = useState<AccountType | "all">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [isPosting, setIsPosting] = useState<boolean>(false);
  const [isUnlockedForEdit, setIsUnlockedForEdit] = useState<boolean>(false);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState<boolean>(false);

  // Form balance state per account code: { [code: string]: { debit: number; credit: number; note: string } }
  const [balances, setBalances] = useState<{ [code: string]: { debit: number; credit: number; note: string } }>({});

  // 1. Detect existing Opening Entry for selected fiscal year
  const existingOpeningEntry = useMemo(() => {
    return journalEntries.find(
      (e) =>
        (e.referenceType === "opening_entry" ||
          e.entryNumber?.startsWith(`OPENING-${selectedYear}`) ||
          e.entryNumber?.startsWith(`JV-OPENING-${selectedYear}`)) &&
        e.date.startsWith(selectedYear)
    );
  }, [journalEntries, selectedYear]);

  const isPosted = Boolean(existingOpeningEntry) && !isUnlockedForEdit;

  // 2. Initialize balances from existing posted entry or accounts
  useEffect(() => {
    const newBalances: { [code: string]: { debit: number; credit: number; note: string } } = {};

    if (existingOpeningEntry) {
      existingOpeningEntry.lines.forEach((l) => {
        newBalances[l.accountCode] = {
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
          note: l.description || "",
        };
      });
      setEntryDate(existingOpeningEntry.date);
      setDescription(existingOpeningEntry.description);
    } else {
      // Initialize with 0 for all leaf accounts
      accounts.forEach((acc) => {
        if (acc.level === 4 || !accounts.some((sub) => sub.parentId === acc.id)) {
          newBalances[acc.code] = { debit: 0, credit: 0, note: "" };
        }
      });
    }

    setBalances(newBalances);
  }, [existingOpeningEntry, accounts, selectedYear]);

  // Handle balance change
  const handleBalanceChange = (code: string, field: "debit" | "credit", val: string) => {
    if (isPosted) return;
    const num = Math.max(0, parseFloat(val) || 0);

    setBalances((prev) => {
      const current = prev[code] || { debit: 0, credit: 0, note: "" };
      const updated = { ...current };

      if (field === "debit") {
        updated.debit = num;
        if (num > 0) updated.credit = 0; // mutually exclusive on leaf level
      } else {
        updated.credit = num;
        if (num > 0) updated.debit = 0;
      }

      return { ...prev, [code]: updated };
    });
  };

  const handleNoteChange = (code: string, val: string) => {
    if (isPosted) return;
    setBalances((prev) => ({
      ...prev,
      [code]: { ...(prev[code] || { debit: 0, credit: 0, note: "" }), note: val },
    }));
  };

  // Compute live totals across all leaf accounts
  const { totalDebit, totalCredit, difference, isBalanced, nonZeroCount } = useMemo(() => {
    let totDr = 0;
    let totCr = 0;
    let count = 0;

    Object.entries(balances).forEach(([code, b]) => {
      const dr = Number(b.debit) || 0;
      const cr = Number(b.credit) || 0;
      totDr += dr;
      totCr += cr;
      if (dr > 0 || cr > 0) count++;
    });

    const diff = Math.abs(totDr - totCr);
    const balanced = diff < 0.01 && totDr > 0;

    return {
      totalDebit: totDr,
      totalCredit: totCr,
      difference: diff,
      isBalanced: balanced,
      nonZeroCount: count,
    };
  }, [balances]);

  // Post Opening Entry
  const handlePost = async () => {
    if (!isBalanced) {
      showToast(isAr ? "القيد الافتتاحي غير متزن! يجب أن يتساوى المدين مع الدائن." : "Opening entry is not balanced!", "error");
      return;
    }

    setIsPosting(true);
    try {
      const activeLines: JournalLine[] = [];

      // Build journal lines only for accounts with non-zero balances
      accounts.forEach((acc) => {
        const b = balances[acc.code];
        if (b && (b.debit > 0 || b.credit > 0)) {
          activeLines.push({
            id: generateId(),
            accountId: acc.id,
            accountCode: acc.code,
            accountName: isAr ? acc.nameAr : acc.nameEn,
            debit: b.debit,
            credit: b.credit,
            description: b.note || (isAr ? `رصيد افتتاحي أول المدة - ${acc.nameAr}` : `Opening balance - ${acc.nameEn}`),
          });
        }
      });

      const entryNumber = `OPENING-${selectedYear}`;

      await postOpeningEntry({
        organizationId: organization.id,
        branchId: activeBranchId,
        entryNumber,
        date: entryDate,
        referenceType: "opening_entry",
        description: description || `القيد الافتتاحي للسنة المالية ${selectedYear}`,
        lines: activeLines,
        totalDebit,
        totalCredit,
        isBalanced: true,
        status: "posted",
        createdBy: currentUser.name,
      });

      setIsConfirmModalOpen(false);
      setIsUnlockedForEdit(false);
    } catch (err: any) {
      console.error("Failed to post opening entry:", err);
      showToast(err?.message || (isAr ? "فشل ترحيل القيد الافتتاحي" : "Failed to post opening entry"), "error");
    } finally {
      setIsPosting(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      isAr ? "كود الحساب" : "Account Code",
      isAr ? "اسم الحساب" : "Account Name",
      isAr ? "النوع" : "Type",
      isAr ? "مدين" : "Debit",
      isAr ? "دائن" : "Credit",
      isAr ? "ملاحظات" : "Notes",
    ];

    const rows = accounts
      .filter((a) => a.level === 4 || !accounts.some((sub) => sub.parentId === a.id))
      .map((acc) => {
        const b = balances[acc.code] || { debit: 0, credit: 0, note: "" };
        return [
          `"${acc.code}"`,
          `"${isAr ? acc.nameAr : acc.nameEn}"`,
          `"${acc.type}"`,
          b.debit.toFixed(2),
          b.credit.toFixed(2),
          `"${b.note}"`,
        ];
      });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Opening_Balances_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter accounts for UI table
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      if (selectedTypeTab !== "all" && acc.type !== selectedTypeTab) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          acc.code.toLowerCase().includes(q) ||
          acc.nameAr.toLowerCase().includes(q) ||
          acc.nameEn.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [accounts, selectedTypeTab, searchQuery]);

  if (isLoadingData) {
    return <TableSkeleton rows={8} columns={6} summaryCards={3} isAr={isAr} />;
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header Banner */}
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-900/40">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <span>{isAr ? "القيد الافتتاحي (الأرصدة الافتتاحية لأول المدة)" : "Beginning Balances (Opening Entry)"}</span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr
                  ? "المصدر الوحيد والمعتمد لترحيل أرصدة أول المدة لكافة حسابات الأصول، الخصوم، الملكية، الإيرادات والمصروفات"
                  : "The official single source of truth for opening general ledger balances across all account classes"}
              </p>
            </div>
          </div>
        </div>

        {/* Year Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white">
            <Calendar className="w-4 h-4 text-emerald-400 mr-2 ml-1" />
            <span className="text-slate-400 mr-1">{isAr ? "السنة المالية:" : "Fiscal Year:"}</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent text-white font-bold font-mono focus:outline-none cursor-pointer"
            >
              <option value="2026" className="bg-slate-900">2026</option>
              <option value="2025" className="bg-slate-900">2025</option>
              <option value="2024" className="bg-slate-900">2024</option>
            </select>
          </div>

          <button
            onClick={() => setIsPrintPreviewOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>{isAr ? "معاينة وطباعة السند" : "Print Voucher"}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>{isAr ? "تصدير Excel" : "Export CSV"}</span>
          </button>
        </div>
      </div>

      {/* Status & Control Banner */}
      {isPosted ? (
        <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-400 text-sm">
                  {isAr ? "القيد الافتتاحي مرحل ومقفل رسمياً" : "Opening Entry Officially Posted & Locked"}
                </span>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-mono text-[10px] rounded-md font-bold">
                  {existingOpeningEntry?.entryNumber}
                </span>
              </div>
              <p className="text-slate-400 text-[11px] mt-0.5">
                {isAr ? `تاريخ القيد: ${formatDate(existingOpeningEntry?.date || "", locale)} — بواسطة: ${existingOpeningEntry?.createdBy || "المشرف"}` : `Date: ${existingOpeningEntry?.date}`}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsUnlockedForEdit(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl font-bold transition-colors cursor-pointer"
          >
            <Unlock className="w-4 h-4" />
            <span>{isAr ? "فك القفل لتعديل الأرصدة" : "Unlock & Edit"}</span>
          </button>
        </div>
      ) : (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 w-full text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                {isAr ? "تاريخ القيد الافتتاحي *" : "Entry Date *"}
              </label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                {isAr ? "شرح / بيان القيد الافتتاحي *" : "Entry Description *"}
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={isAr ? "بيان القيد الافتتاحي..." : "Description..."}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>
          </div>

          <button
            onClick={() => setIsConfirmModalOpen(true)}
            disabled={!isBalanced || isPosting}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/60 transition-all cursor-pointer shrink-0"
          >
            <Save className="w-4 h-4" />
            <span>{isAr ? "اعتماد وترحيل القيد الافتتاحي" : "Post Opening Entry"}</span>
          </button>
        </div>
      )}

      {/* Live Dual Balancing Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <span className="text-slate-400 text-xs block mb-1">{isAr ? "إجمالي الأرصدة المدينة:" : "Total Opening Debit:"}</span>
          <span className="text-xl font-black font-mono text-emerald-400 block">
            {formatCurrency(totalDebit, organization.currency, locale)}
          </span>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <span className="text-slate-400 text-xs block mb-1">{isAr ? "إجمالي الأرصدة الدائنة:" : "Total Opening Credit:"}</span>
          <span className="text-xl font-black font-mono text-sky-400 block">
            {formatCurrency(totalCredit, organization.currency, locale)}
          </span>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <span className="text-slate-400 text-xs block mb-1">{isAr ? "الفرق (مدين - دائن):" : "Difference (Dr - Cr):"}</span>
          <span className={"text-xl font-black font-mono block " + (difference === 0 ? "text-slate-400" : "text-rose-400")}>
            {formatCurrency(difference, organization.currency, locale)}
          </span>
        </div>

        <div className={"p-4 rounded-2xl border flex flex-col justify-center " + (
          isBalanced
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            : "bg-rose-500/10 border-rose-500/30 text-rose-400"
        )}>
          <div className="flex items-center gap-2">
            {isBalanced ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
            <span className="font-bold text-xs">
              {isBalanced
                ? (isAr ? "✓ القيد متزن محاسبياً تماماً" : "✓ Perfectly Balanced")
                : (isAr ? "⚠️ القيد غير متزن" : "⚠️ Not Balanced")}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1">
            {isAr ? `(${nonZeroCount}) حسابات تحتوي على أرصدة` : `${nonZeroCount} accounts active`}
          </span>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Type Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
          {[
            { id: "all", labelAr: "كافة الحسابات (76)", labelEn: "All" },
            { id: "assets", labelAr: "1. الأصول", labelEn: "Assets" },
            { id: "liabilities", labelAr: "2. الخصوم", labelEn: "Liabilities" },
            { id: "equity", labelAr: "3. الملكية", labelEn: "Equity" },
            { id: "revenue", labelAr: "4. الإيرادات", labelEn: "Revenue" },
            { id: "expense", labelAr: "5. المصروفات", labelEn: "Expenses" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTypeTab(tab.id as any)}
              className={"px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer " + (
                selectedTypeTab === tab.id
                  ? "bg-emerald-600 text-white shadow"
                  : "bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              {isAr ? tab.labelAr : tab.labelEn}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? "بحث بكود أو اسم الحساب..." : "Search accounts..."}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Accounts Input Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-800/90 text-slate-300 font-bold border-b border-slate-700">
                <th className="p-3.5 rounded-r-lg font-mono w-28">{isAr ? "كود الحساب" : "Code"}</th>
                <th className="p-3.5">{isAr ? "اسم الحساب الدفتري" : "Account Name"}</th>
                <th className="p-3.5 text-center w-20">{isAr ? "المستوى" : "Level"}</th>
                <th className="p-3.5 text-center w-24">{isAr ? "طبيعة الحساب" : "Nature"}</th>
                <th className="p-3.5 text-center font-mono w-44 text-emerald-400">{isAr ? "مدين افتتاحي (Debit)" : "Opening Debit"}</th>
                <th className="p-3.5 text-center font-mono w-44 text-sky-400">{isAr ? "دائن افتتاحي (Credit)" : "Opening Credit"}</th>
                <th className="p-3.5 rounded-l-lg w-56">{isAr ? "بيان / ملاحظة" : "Note"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredAccounts.map((acc) => {
                const isLeaf = acc.level === 4 || !accounts.some((sub) => sub.parentId === acc.id);
                const b = balances[acc.code] || { debit: 0, credit: 0, note: "" };

                if (!isLeaf) {
                  // Parent Account Summary Row
                  const descendants = accounts.filter(
                    (a) => a.code.startsWith(acc.code) && (a.level === 4 || !accounts.some((sub) => sub.parentId === a.id))
                  );
                  let subDr = 0;
                  let subCr = 0;
                  descendants.forEach((d) => {
                    const db = balances[d.code];
                    if (db) {
                      subDr += Number(db.debit) || 0;
                      subCr += Number(db.credit) || 0;
                    }
                  });

                  return (
                    <tr
                      key={acc.id}
                      className={
                        acc.level === 1
                          ? "bg-slate-950 font-black text-emerald-400 border-t-2 border-slate-800"
                          : acc.level === 2
                          ? "bg-slate-900/90 font-bold text-slate-200"
                          : "bg-slate-900/50 font-semibold text-slate-300"
                      }
                    >
                      <td className="p-3 font-bold text-slate-300">{acc.code}</td>
                      <td className="p-3 font-sans" style={{ paddingRight: `${acc.level * 14}px` }}>
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>{isAr ? acc.nameAr : acc.nameEn}</span>
                        </span>
                      </td>
                      <td className="p-3 text-center text-slate-500 text-[10px]">مستوى {acc.level}</td>
                      <td className="p-3 text-center text-slate-400 text-[10px]">
                        {acc.nature === "debit" ? (isAr ? "مدين بطبيعته" : "Debit") : (isAr ? "دائن بطبيعته" : "Credit")}
                      </td>
                      <td className="p-3 text-center text-emerald-400/80 font-bold bg-emerald-950/10">
                        {subDr > 0 ? formatCurrency(subDr, organization.currency, locale) : "-"}
                      </td>
                      <td className="p-3 text-center text-sky-400/80 font-bold bg-sky-950/10">
                        {subCr > 0 ? formatCurrency(subCr, organization.currency, locale) : "-"}
                      </td>
                      <td className="p-3 text-slate-500 text-[10px] font-sans">
                        {isAr ? `(تجميعي: ${descendants.length} حسابات)` : `Summary`}
                      </td>
                    </tr>
                  );
                }

                // Leaf / Postable Account Row
                return (
                  <tr key={acc.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-2.5 font-bold text-slate-400">{acc.code}</td>
                    <td className="p-2.5 font-sans font-semibold text-white" style={{ paddingRight: "48px" }}>
                      {isAr ? acc.nameAr : acc.nameEn}
                    </td>
                    <td className="p-2.5 text-center text-slate-500 text-[10px]">مستوى 4</td>
                    <td className="p-2.5 text-center text-slate-400 text-[10px]">
                      {acc.nature === "debit" ? (
                        <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded">مدين</span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-sky-500/10 text-sky-400 rounded">دائن</span>
                      )}
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        disabled={isPosted}
                        value={b.debit === 0 ? "" : b.debit}
                        onChange={(e) => handleBalanceChange(acc.code, "debit", e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-center font-bold text-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        disabled={isPosted}
                        value={b.credit === 0 ? "" : b.credit}
                        onChange={(e) => handleBalanceChange(acc.code, "credit", e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-lg px-2.5 py-1.5 text-center font-bold text-sky-400 disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        disabled={isPosted}
                        value={b.note}
                        onChange={(e) => handleNoteChange(acc.code, e.target.value)}
                        placeholder={isAr ? "ملاحظة اختيارية..." : "Note"}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300 disabled:opacity-60 font-sans"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-950 font-mono font-black text-sm text-white border-t-2 border-slate-700">
                <td colSpan={4} className="p-4 font-sans text-right">
                  {isAr ? "الإجمالي الكلي للأرصدة الافتتاحية (Grand Totals):" : "Grand Totals:"}
                </td>
                <td className="p-4 text-center text-emerald-400 font-bold">
                  {formatCurrency(totalDebit, organization.currency, locale)}
                </td>
                <td className="p-4 text-center text-sky-400 font-bold">
                  {formatCurrency(totalCredit, organization.currency, locale)}
                </td>
                <td className="p-4 text-center">
                  {isBalanced ? (
                    <span className="text-emerald-400 font-bold flex items-center justify-center gap-1">
                      <Check className="w-4 h-4" />
                      <span>{isAr ? "متزن" : "Balanced"}</span>
                    </span>
                  ) : (
                    <span className="text-rose-400 font-bold">
                      {isAr ? `فرق: ${formatCurrency(difference, organization.currency, locale)}` : "Diff"}
                    </span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => !isPosting && setIsConfirmModalOpen(false)}
        title={isAr ? "تأكيد ترحيل القيد الافتتاحي" : "Confirm Opening Entry Posting"}
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <ShieldCheck className="w-5 h-5" />
              <span>{isAr ? "التحقق المحاسبي المسبق: القيد متزن تماماً" : "Pre-posting Accounting Validation"}</span>
            </div>
            <p className="text-slate-300">
              {isAr
                ? `سيتم ترحيل القيد الافتتاحي الرسمي للسنة المالية ${selectedYear} بإجمالي مدين ودائن ${formatCurrency(totalDebit, organization.currency, locale)} لجميع حسابات الأستاذ العام وميزان المراجعة.`
                : `This will post the opening entry for fiscal year ${selectedYear}.`}
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">{isAr ? "رقم القيد:" : "Entry No:"}</span>
              <span className="text-white font-bold">OPENING-{selectedYear}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{isAr ? "التاريخ:" : "Date:"}</span>
              <span className="text-white">{entryDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{isAr ? "عدد الحسابات المفعلة:" : "Active Accounts:"}</span>
              <span className="text-white font-bold">{nonZeroCount}</span>
            </div>
            <div className="flex justify-between border-t border-slate-800 pt-2 font-bold">
              <span className="text-slate-300">{isAr ? "الإجمالي المتزن:" : "Total Balanced:"}</span>
              <span className="text-emerald-400">{formatCurrency(totalDebit, organization.currency, locale)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              disabled={isPosting}
              onClick={() => setIsConfirmModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="button"
              disabled={isPosting}
              onClick={handlePost}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition-colors cursor-pointer"
            >
              {isPosting ? (
                <span>{isAr ? "جاري الترحيل..." : "Posting..."}</span>
              ) : (
                <span>{isAr ? "تأكيد الترحيل النهائي" : "Confirm & Post"}</span>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Print Preview Modal */}
      <Modal
        isOpen={isPrintPreviewOpen}
        onClose={() => setIsPrintPreviewOpen(false)}
        title={isAr ? "سند القيد الافتتاحي الرسمي" : "Official Opening Voucher"}
        maxWidth="4xl"
      >
        <div className="space-y-6 text-xs bg-white text-slate-900 p-6 rounded-2xl print:p-0">
          {/* Voucher Header */}
          <div className="flex justify-between items-start border-b pb-4 border-slate-200">
            <div>
              <h2 className="text-lg font-black text-slate-900">{organization.nameAr}</h2>
              <p className="text-slate-600 text-[11px]">{organization.nameEn}</p>
              <p className="text-slate-600 text-[11px] mt-1">الرقم الضريبي: {organization.taxNumber}</p>
            </div>
            <div className="text-left font-mono">
              <span className="inline-block px-3 py-1 bg-slate-900 text-white rounded-lg font-bold text-sm mb-1">
                سند قيد افتتاحي
              </span>
              <p className="text-slate-700 text-[11px]">رقم القيد: OPENING-{selectedYear}</p>
              <p className="text-slate-700 text-[11px]">التاريخ: {entryDate}</p>
            </div>
          </div>

          <p className="text-slate-700 font-semibold bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            البيان: {description}
          </p>

          {/* Lines Table */}
          <table className="w-full text-right text-xs border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                <th className="p-2 border-l border-slate-300">كود الحساب</th>
                <th className="p-2 border-l border-slate-300">اسم الحساب الدفتري</th>
                <th className="p-2 text-center border-l border-slate-300 w-32">مدين</th>
                <th className="p-2 text-center border-l border-slate-300 w-32">دائن</th>
                <th className="p-2">البيان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {accounts
                .filter((a) => a.level === 4 || !accounts.some((sub) => sub.parentId === a.id))
                .filter((a) => (balances[a.code]?.debit || 0) > 0 || (balances[a.code]?.credit || 0) > 0)
                .map((acc) => {
                  const b = balances[acc.code];
                  return (
                    <tr key={acc.id}>
                      <td className="p-2 font-bold border-l border-slate-300">{acc.code}</td>
                      <td className="p-2 font-sans font-semibold border-l border-slate-300">{acc.nameAr}</td>
                      <td className="p-2 text-center font-bold border-l border-slate-300">
                        {b.debit > 0 ? formatCurrency(b.debit, organization.currency, locale) : "-"}
                      </td>
                      <td className="p-2 text-center font-bold border-l border-slate-300">
                        {b.credit > 0 ? formatCurrency(b.credit, organization.currency, locale) : "-"}
                      </td>
                      <td className="p-2 font-sans text-slate-600">{b.note || "رصيد أول المدة"}</td>
                    </tr>
                  );
                })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-mono font-bold text-slate-900 border-t-2 border-slate-300">
                <td colSpan={2} className="p-2.5 font-sans">الإجمالي الكلي:</td>
                <td className="p-2.5 text-center font-bold">{formatCurrency(totalDebit, organization.currency, locale)}</td>
                <td className="p-2.5 text-center font-bold">{formatCurrency(totalCredit, organization.currency, locale)}</td>
                <td className="p-2.5 text-center text-emerald-700 font-sans">متزن تماماً</td>
              </tr>
            </tfoot>
          </table>

          {/* Signatures */}
          <div className="grid grid-cols-3 gap-6 pt-10 text-center font-bold text-slate-800">
            <div className="border-t border-slate-300 pt-2">
              <p>إعداد / المحاسب المسؤول</p>
              <p className="font-mono text-slate-500 font-normal mt-1">{currentUser.name}</p>
            </div>
            <div className="border-t border-slate-300 pt-2">
              <p>مراجعة / رئيس الحسابات</p>
            </div>
            <div className="border-t border-slate-300 pt-2">
              <p>اعتماد / المدير المالي</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 print:hidden">
            <button
              onClick={() => window.print()}
              className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة السند</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
