"use client";

import React, { useState } from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency, formatDate, generateId } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import { JournalLine } from "@/types/erp";
import {
  FileText, Plus, Search, CheckCircle2, AlertTriangle,
  Trash2, Scale, Loader2, AlertCircle
} from "lucide-react";

export default function JournalPage() {
  const { journalEntries, accounts, addJournalEntry, organization, activeBranchId, currentUser, locale, showToast } = useERP();
  const isAr = locale === "ar";

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [lines, setLines] = useState<Omit<JournalLine, "id">[]>([
    { accountId: accounts[0]?.id || "", accountCode: accounts[0]?.code || "", accountName: accounts[0]?.nameAr || "", debit: 1000, credit: 0, description: "" },
    { accountId: accounts[1]?.id || "", accountCode: accounts[1]?.code || "", accountName: accounts[1]?.nameAr || "", debit: 0, credit: 1000, description: "" },
  ]);

  const handleAddLine = () => {
    const acc = accounts[0];
    setLines(prev => [
      ...prev,
      { accountId: acc.id, accountCode: acc.code, accountName: acc.nameAr, debit: 0, credit: 0, description: "" }
    ]);
  };

  const handleUpdateLine = (index: number, field: string, value: any) => {
    setLines(prev => {
      const updated = [...prev];
      const current = { ...updated[index] };

      if (field === "accountId") {
        const acc = accounts.find(a => a.id === value);
        if (acc) {
          current.accountId = acc.id;
          current.accountCode = acc.code;
          current.accountName = isAr ? acc.nameAr : acc.nameEn;
        }
      } else if (field === "debit") {
        current.debit = Math.max(0, parseFloat(value) || 0);
        if (current.debit > 0) current.credit = 0;
      } else if (field === "credit") {
        current.credit = Math.max(0, parseFloat(value) || 0);
        if (current.credit > 0) current.debit = 0;
      } else if (field === "description") {
        current.description = value;
      }

      updated[index] = current;
      return updated;
    });
  };

  const handleRemoveLine = (index: number) => {
    setLines(prev => prev.filter((_, i) => i !== index));
  };

  const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const handleCreateJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!isBalanced) {
      setFormError(isAr ? "القيد المحاسبي غير متزن (المدين لا يساوي الدائن)" : "Journal entry is not balanced");
      return;
    }
    if (!description) {
      setFormError(isAr ? "يرجى كتابة شرح القيد المحاسبي" : "Please enter entry description");
      return;
    }

    setIsSubmitting(true);
    try {
      const entryNumber = "JV-" + new Date().getFullYear() + "-" + (journalEntries.length + 1).toString().padStart(4, "0");

      await addJournalEntry({
        organizationId: organization.id,
        branchId: activeBranchId,
        entryNumber,
        date,
        referenceType: "manual_entry",
        description,
        lines: lines.map(l => ({ ...l, id: generateId() })),
        totalDebit,
        totalCredit,
        isBalanced: true,
        status: "posted",
        createdBy: currentUser.name,
      });

      setIsAddModalOpen(false);
      setDescription("");
    } catch (err: any) {
      console.error("Failed to add journal entry:", err);
      const errMsg = err?.message || (isAr ? "فشل حفظ القيد اليومي" : "Failed to post journal entry");
      setFormError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-emerald-400" />
            <span>{isAr ? "دفتر القيود اليومية المحاسبية (Journal Entries)" : "General Journal Entries"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAr ? "سجل القيود التلقائية الصادرة عن المبيعات والمشتريات والرواتب بالإضافة للقيود اليدوية والتسويات" : "Automated & manual double-entry journal logs"}
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/60 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{isAr ? "تسجيل قيد يومية يدوي" : "Add Manual Journal"}</span>
        </button>
      </div>

      {/* Entries List */}
      <div className="space-y-4">
        {journalEntries.map(entry => (
          <div key={entry.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-white text-sm bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
                  {entry.entryNumber}
                </span>
                <span className="text-xs text-slate-400">{formatDate(entry.date, locale)}</span>
                <span className="text-xs font-semibold text-slate-300">{entry.description}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-xl text-[10px] font-bold border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{isAr ? "قيد مرحل ومتزن" : "Posted & Balanced"}</span>
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-slate-950/60 text-slate-400 font-semibold">
                    <th className="p-2 rounded-r-lg font-mono w-28">{isAr ? "كود الحساب" : "Code"}</th>
                    <th className="p-2">{isAr ? "اسم الحساب الدفتري" : "Account Name"}</th>
                    <th className="p-2">{isAr ? "البيان / الشرح" : "Note"}</th>
                    <th className="p-2 text-center font-mono w-32 text-emerald-400">{isAr ? "مدين (Debit)" : "Debit"}</th>
                    <th className="p-2 rounded-l-lg text-center font-mono w-32 text-sky-400">{isAr ? "دائن (Credit)" : "Credit"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 font-mono">
                  {entry.lines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/20">
                      <td className="p-2 text-slate-400 font-bold">{line.accountCode}</td>
                      <td className="p-2 text-white font-sans font-semibold">{line.accountName}</td>
                      <td className="p-2 text-slate-500 font-sans text-[11px]">{line.description || "---"}</td>
                      <td className="p-2 text-center font-bold text-emerald-400">
                        {line.debit > 0 ? formatCurrency(line.debit, organization.currency, locale) : "-"}
                      </td>
                      <td className="p-2 text-center font-bold text-sky-400">
                        {line.credit > 0 ? formatCurrency(line.credit, organization.currency, locale) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Add Entry Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => !isSubmitting && setIsAddModalOpen(false)}
        title={isAr ? "تسجيل قيد يومية محاسبي جديد" : "New Journal Entry"}
        maxWidth="4xl"
      >
        <form onSubmit={handleCreateJournal} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "تاريخ القيد *" : "Date *"}</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "شرح / بيان القيد *" : "Description *"}</label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={isAr ? "إثبات مصروفات نثرية / تسوية جردية..." : "Reason for entry..."}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>
          </div>

          {/* Lines Table */}
          <div className="border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="bg-slate-800 text-slate-400 font-bold">
                  <th className="p-3">{isAr ? "الحساب الدفتري" : "Account"}</th>
                  <th className="p-3">{isAr ? "البيان الفرعي" : "Line Note"}</th>
                  <th className="p-3 text-center w-32 text-emerald-400">{isAr ? "مدين (Debit)" : "Debit"}</th>
                  <th className="p-3 text-center w-32 text-sky-400">{isAr ? "دائن (Credit)" : "Credit"}</th>
                  <th className="p-3 text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/60">
                {lines.map((line, idx) => (
                  <tr key={idx}>
                    <td className="p-2">
                      <select
                        value={line.accountId}
                        onChange={(e) => handleUpdateLine(idx, "accountId", e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-bold"
                      >
                        {accounts.map(a => (
                          <option key={a.id} value={a.id}>{a.code} - {a.nameAr}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) => handleUpdateLine(idx, "description", e.target.value)}
                        placeholder={isAr ? "بيان اختياري..." : "Note"}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-white"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={line.debit}
                        onChange={(e) => handleUpdateLine(idx, "debit", e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-center text-emerald-400 font-mono font-bold"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={line.credit}
                        onChange={(e) => handleUpdateLine(idx, "credit", e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-center text-sky-400 font-mono font-bold"
                      />
                    </td>
                    <td className="p-2 text-center">
                      {lines.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          className="p-1 text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-2 bg-slate-950 flex justify-start">
              <button
                type="button"
                onClick={handleAddLine}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAr ? "إضافة طرف للقيد" : "Add Line"}</span>
              </button>
            </div>
          </div>

          {/* Balance Validator Box */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className={"w-5 h-5 " + (isBalanced ? "text-emerald-400" : "text-rose-400")} />
              <span className={"font-bold text-xs " + (isBalanced ? "text-emerald-400" : "text-rose-400")}>
                {isBalanced
                  ? (isAr ? "✓ القيد متزن محاسبياً تماماً" : "✓ Perfectly Balanced")
                  : (isAr ? "⚠️ القيد غير متزن (الفرق: " + formatCurrency(Math.abs(totalDebit - totalCredit), organization.currency, locale) + ")" : "⚠️ Not Balanced")}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono font-bold">
              <div>
                <span className="text-slate-500 ml-1">{isAr ? "إجمالي المدين:" : "Debit:"}</span>
                <span className="text-emerald-400">{formatCurrency(totalDebit, organization.currency, locale)}</span>
              </div>
              <div>
                <span className="text-slate-500 ml-1">{isAr ? "إجمالي الدائن:" : "Credit:"}</span>
                <span className="text-sky-400">{formatCurrency(totalCredit, organization.currency, locale)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={!isBalanced || isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-lg transition-colors cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isAr ? "جاري الترحيل..." : "Posting..."}</span>
                </>
              ) : (
                <span>{isAr ? "ترحيل القيد لدفتر الأستاذ" : "Post Journal Entry"}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
