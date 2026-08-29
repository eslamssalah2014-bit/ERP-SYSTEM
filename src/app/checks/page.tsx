"use client";

import React, { useState } from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import TableSkeleton from "@/components/ui/TableSkeleton";
import { CheckRecord, CheckStatus } from "@/types/erp";
import {
  CheckSquare, Plus, ArrowDownLeft, ArrowUpRight, CheckCircle2,
  Clock, XCircle, AlertCircle, Building2, Trash2, Loader2
} from "lucide-react";

export default function ChecksPage() {
  const {
    checks, treasuryAccounts, customers, suppliers,
    addCheck, updateCheckStatus, deleteCheck,
    organization, activeBranchId, currentUser, locale, hasPermission, showToast, isLoadingData
  } = useERP();

  const isAr = locale === "ar";
  const [activeTab, setActiveTab] = useState<"incoming" | "outgoing">("incoming");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedCheckToCollect, setSelectedCheckToCollect] = useState<CheckRecord | null>(null);
  const [targetTreasuryId, setTargetTreasuryId] = useState<string>(treasuryAccounts[0]?.id || "");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Add Check Form State
  const [checkNumber, setCheckNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [partyName, setPartyName] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const filteredChecks = checks.filter(c => {
    if (c.type !== activeTab) return false;
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    return true;
  });

  const handleOpenAddModal = () => {
    setFormError(null);
    setCheckNumber("CHK-" + Date.now().toString().slice(-6));
    setBankName(isAr ? "البنك الأهلي المصري" : "National Bank");
    setPartyName(activeTab === "incoming" ? (customers[0]?.nameAr || "") : (suppliers[0]?.nameAr || ""));
    setSelectedCustomerId(customers[0]?.id || "");
    setSelectedSupplierId(suppliers[0]?.id || "");
    setAmount(10000);
    setIssueDate(new Date().toISOString().split("T")[0]);
    setDueDate(new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split("T")[0]);
    setNotes("");
    setIsAddModalOpen(true);
  };

  const handleCreateCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (amount <= 0) {
      setFormError(isAr ? "يرجى تحديد مبلغ صحيح للشيك" : "Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);
    try {
      await addCheck({
        organizationId: organization.id,
        branchId: activeBranchId,
        checkNumber,
        bankName,
        type: activeTab,
        partyName: partyName || (activeTab === "incoming" ? "عميل" : "مورد"),
        customerId: activeTab === "incoming" ? (selectedCustomerId || undefined) : undefined,
        supplierId: activeTab === "outgoing" ? (selectedSupplierId || undefined) : undefined,
        amount: Number(amount) || 0,
        issueDate,
        dueDate,
        status: "pending",
        notes: notes || undefined,
      });

      setIsAddModalOpen(false);
    } catch (err: any) {
      console.error("Failed to add check:", err);
      const errMsg = err?.message || (isAr ? "فشل تسجيل الشيك" : "Failed to add check");
      setFormError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmCollect = async () => {
    if (!selectedCheckToCollect) return;
    setIsSubmitting(true);
    try {
      await updateCheckStatus(selectedCheckToCollect.id, "collected", targetTreasuryId);
      setSelectedCheckToCollect(null);
    } catch (err: any) {
      console.error("Failed to collect check:", err);
      showToast(err?.message || (isAr ? "فشل تحصيل الشيك" : "Failed to collect check"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCheck = async (id: string) => {
    if (confirm(isAr ? "هل أنت متأكد من حذف هذا الشيك من الحافظة؟" : "Are you sure you want to delete this check?")) {
      try {
        await deleteCheck(id);
      } catch (err: any) {
        showToast(err?.message || (isAr ? "فشل حذف الشيك" : "Failed to delete check"), "error");
      }
    }
  };

  const canManage = hasPermission(["super_admin", "tenant_admin", "accountant"]);

  if (isLoadingData) {
    return <TableSkeleton rows={5} columns={8} summaryCards={3} isAr={isAr} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <CheckSquare className="w-6 h-6 text-emerald-400" />
            <span>{isAr ? "حافظة الشيكات وأوراق القبض والدفع" : "Checks Portfolio"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAr ? "دورة حياة الشيكات: تحت التحصيل، تم التحصيل والإيداع، مرتدة، أو ملغاة مع التأثير التلقائي على الحسابات" : "Full check lifecycle: pending, collected, cleared, and bounced"}
          </p>
        </div>

        {canManage && (
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/60 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{activeTab === "incoming" ? (isAr ? "إضافة شيك وارد (قبض)" : "Add Incoming Check") : (isAr ? "إضافة شيك صادر (دفع)" : "Add Outgoing Check")}</span>
          </button>
        )}
      </div>

      {/* Tabs Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("incoming")}
            className={"px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all " + (
              activeTab === "incoming" ? "bg-emerald-600 text-white shadow-md" : "bg-slate-800 text-slate-400 hover:text-white"
            )}
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>{isAr ? "شيكات واردة (أوراق قبض)" : "Incoming Checks"}</span>
          </button>
          <button
            onClick={() => setActiveTab("outgoing")}
            className={"px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all " + (
              activeTab === "outgoing" ? "bg-emerald-600 text-white shadow-md" : "bg-slate-800 text-slate-400 hover:text-white"
            )}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>{isAr ? "شيكات صادرة (أوراق دفع)" : "Outgoing Checks"}</span>
          </button>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">{isAr ? "جميع الحالات" : "All Statuses"}</option>
            <option value="pending">{isAr ? "تحت التحصيل" : "Pending"}</option>
            <option value="collected">{isAr ? "تم التحصيل" : "Collected"}</option>
            <option value="bounced">{isAr ? "مرتد" : "Bounced"}</option>
          </select>
        </div>
      </div>

      {/* Checks Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                <th className="p-3.5 rounded-r-lg">#</th>
                <th className="p-3.5 font-mono">{isAr ? "رقم الشيك" : "Check No"}</th>
                <th className="p-3.5">{isAr ? "البنك المسحوب عليه" : "Bank"}</th>
                <th className="p-3.5">{isAr ? "الطرف المعني" : "Party"}</th>
                <th className="p-3.5 text-center font-mono">{isAr ? "المبلغ" : "Amount"}</th>
                <th className="p-3.5">{isAr ? "تاريخ التحرير" : "Issue Date"}</th>
                <th className="p-3.5">{isAr ? "تاريخ الاستحقاق" : "Due Date"}</th>
                <th className="p-3.5 text-center">{isAr ? "الحالة" : "Status"}</th>
                <th className="p-3.5 rounded-l-lg text-center">{isAr ? "الإجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredChecks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500 font-sans">
                    {isAr ? "لا توجد شيكات مسجلة بهذه الفئة" : "No checks recorded in this category"}
                  </td>
                </tr>
              ) : (
                filteredChecks.map((chk, idx) => (
                  <tr key={chk.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3.5 text-slate-500 font-mono">{idx + 1}</td>
                    <td className="p-3.5 font-mono font-bold text-white">{chk.checkNumber}</td>
                    <td className="p-3.5 text-slate-300 font-semibold">{chk.bankName}</td>
                    <td className="p-3.5 font-bold text-slate-200">{chk.partyName}</td>
                    <td className="p-3.5 text-center font-mono font-black text-emerald-400">
                      {formatCurrency(chk.amount, organization.currency, locale)}
                    </td>
                    <td className="p-3.5 text-slate-400 font-sans">{formatDate(chk.issueDate, locale)}</td>
                    <td className="p-3.5 font-sans font-bold text-amber-400">{formatDate(chk.dueDate, locale)}</td>
                    <td className="p-3.5 text-center">
                      <span className={"px-2.5 py-1 rounded-xl text-[10px] font-bold border " + (
                        chk.status === "collected"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : chk.status === "pending"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      )}>
                        {chk.status === "pending" && (isAr ? "تحت التحصيل" : "Pending")}
                        {chk.status === "collected" && (isAr ? "تم التحصيل والإيداع" : "Collected")}
                        {chk.status === "bounced" && (isAr ? "مرتد ومرفوض" : "Bounced")}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {chk.status === "pending" && (
                          <button
                            onClick={() => setSelectedCheckToCollect(chk)}
                            className="px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white text-xs font-bold rounded-xl border border-emerald-500/30 transition-all"
                          >
                            {isAr ? "تحصيل وإيداع" : "Collect"}
                          </button>
                        )}
                        {canManage && (
                          <button
                            onClick={() => handleDeleteCheck(chk.id)}
                            title={isAr ? "حذف الشيك" : "Delete"}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Collect Check Modal */}
      <Modal
        isOpen={!!selectedCheckToCollect}
        onClose={() => setSelectedCheckToCollect(null)}
        title={isAr ? "تحصيل الشيك وإيداع القيمة" : "Collect Check"}
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">{isAr ? "رقم الشيك:" : "Check Number:"}</span>
              <span className="font-mono font-bold text-white">{selectedCheckToCollect?.checkNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{isAr ? "المبلغ المحصل:" : "Amount:"}</span>
              <span className="font-mono font-bold text-emerald-400">
                {selectedCheckToCollect && formatCurrency(selectedCheckToCollect.amount, organization.currency, locale)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{isAr ? "الساحب / الطرف:" : "Party:"}</span>
              <span className="font-bold text-white">{selectedCheckToCollect?.partyName}</span>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">
              {isAr ? "اختر الخزينة أو الحساب البنكي المراد الإيداع فيه *" : "Target Cash Safe / Bank Account *"}
            </label>
            <select
              value={targetTreasuryId}
              onChange={(e) => setTargetTreasuryId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-bold focus:outline-none focus:border-emerald-500"
            >
              {treasuryAccounts.map(t => (
                <option key={t.id} value={t.id}>
                  {t.nameAr} ({formatCurrency(t.balance, t.currency, locale)})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              disabled={isSubmitting}
              onClick={() => setSelectedCheckToCollect(null)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              disabled={isSubmitting}
              onClick={handleConfirmCollect}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isAr ? "جاري التحصيل..." : "Collecting..."}</span>
                </>
              ) : (
                <span>{isAr ? "تأكيد التحصيل والإيداع" : "Confirm Collection"}</span>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Check Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => !isSubmitting && setIsAddModalOpen(false)}
        title={activeTab === "incoming" ? (isAr ? "تسجيل شيك وارد جديد (ورقة قبض)" : "Register Incoming Check") : (isAr ? "تسجيل شيك صادر جديد (ورقة دفع)" : "Register Outgoing Check")}
        maxWidth="lg"
      >
        <form onSubmit={handleCreateCheck} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "رقم الشيك *" : "Check Number *"}</label>
              <input
                type="text"
                required
                value={checkNumber}
                onChange={(e) => setCheckNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "اسم البنك *" : "Bank Name *"}</label>
              <input
                type="text"
                required
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "اسم الطرف / الساحب *" : "Party Name *"}</label>
              <input
                type="text"
                required
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "المبلغ *" : "Amount *"}</label>
              <input
                type="number"
                min="0.01"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "تاريخ التحرير *" : "Issue Date *"}</label>
              <input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "تاريخ الاستحقاق *" : "Due Date *"}</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "ملاحظات وبيان الشيك" : "Notes"}</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isAr ? "شيك ضمان / دفعة مقدمة..." : "Check notes..."}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
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
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isAr ? "جاري الحفظ..." : "Saving..."}</span>
                </>
              ) : (
                <span>{isAr ? "حفظ الشيك في الحافظة" : "Save Check"}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
