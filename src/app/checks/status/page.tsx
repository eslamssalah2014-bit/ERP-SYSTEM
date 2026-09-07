"use client";

import React, { useState } from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import TableSkeleton from "@/components/ui/TableSkeleton";
import {
  CheckSquare, Search, ArrowRightLeft, Send, CheckCircle2,
  XCircle, Clock, AlertTriangle, Building2, Wallet, ArrowDownLeft,
  Calendar, FileText, User, Layers, Loader2, RefreshCw
} from "lucide-react";
import { CheckRecord, CheckStatus } from "@/types/erp";

export default function CheckStatusManagerPage() {
  const {
    checks, treasuryAccounts, accounts, updateCheckStatus,
    organization, locale, hasPermission, isLoadingData
  } = useERP();

  const isAr = locale === "ar";
  const canManage = hasPermission(["super_admin", "tenant_admin", "accountant"]);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCheck, setSelectedCheck] = useState<CheckRecord | null>(null);

  // Status Action Modal State
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<"under_collection" | "collected" | "bounced">("under_collection");
  const [targetBankOrTreasuryId, setTargetBankOrTreasuryId] = useState("");
  const [actionNotes, setActionNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filter incoming checks for status lifecycle
  const incomingChecks = checks.filter(c => c.type === "incoming");

  const filteredChecks = incomingChecks.filter(c => {
    return (
      c.checkNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.draweeBank && c.draweeBank.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const handleSelectCheck = (chk: CheckRecord) => {
    setSelectedCheck(chk);
  };

  const handleOpenActionModal = (chk: CheckRecord, type: "under_collection" | "collected" | "bounced") => {
    setSelectedCheck(chk);
    setActionType(type);
    setActionError(null);
    setActionNotes("");
    setTargetBankOrTreasuryId(treasuryAccounts[0]?.id || "");
    setIsActionModalOpen(true);
  };

  const handleExecuteStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCheck) return;
    setActionError(null);

    setIsSubmitting(true);
    try {
      await updateCheckStatus(
        selectedCheck.id,
        actionType as CheckStatus,
        actionType === "collected" ? targetBankOrTreasuryId : undefined
      );

      // Update local selection
      setSelectedCheck(prev => prev ? { ...prev, status: actionType as CheckStatus } : null);
      setIsActionModalOpen(false);
    } catch (err: any) {
      console.error("Failed to update check status:", err);
      setActionError(err.message || (isAr ? "فشل تحديث حالة الشيك" : "Failed to update check status"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: CheckStatus) => {
    switch (status) {
      case "in_treasury":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">{isAr ? "في الخزينة (ورقة قبض)" : "In Treasury"}</span>;
      case "under_collection":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">{isAr ? "برسم التحصيل بالبنك" : "Under Collection"}</span>;
      case "collected":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{isAr ? "تم التحصيل بنجاح" : "Collected"}</span>;
      case "bounced":
      case "returned":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">{isAr ? "مرتد / مرفوض" : "Bounced"}</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {isAr ? "إدارة ومتابعة دورة حياة الشيكات" : "Check Status & Lifecycle Manager"}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAr ? "إرسال الشيكات للتحصيل، إثبات التحصيل، الارتداد، وتوليد القيود المحاسبية التلقائية" : "Manage check transitions: Under Collection, Collected, Bounced with auto GL posting"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Checks List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder={isAr ? "بحث برقم الشيك أو العميل..." : "Search check # or customer..."}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="divide-y divide-slate-800/80 max-h-[600px] overflow-y-auto custom-scrollbar">
              {filteredChecks.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  {isAr ? "لا توجد شيكات مطابقة" : "No checks found"}
                </div>
              ) : (
                filteredChecks.map(chk => {
                  const isSelected = selectedCheck?.id === chk.id;

                  return (
                    <button
                      key={chk.id}
                      onClick={() => handleSelectCheck(chk)}
                      className={`w-full text-right p-3 transition-colors flex flex-col gap-1.5 rounded-lg my-1 ${
                        isSelected
                          ? "bg-blue-600/10 border border-blue-500/30"
                          : "hover:bg-slate-800/50 border border-transparent"
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="font-mono font-bold text-amber-300 text-xs">{chk.checkNumber}</span>
                        <span className="font-mono font-bold text-emerald-400 text-xs">
                          {formatCurrency(chk.amount, organization.currency, locale)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-200 font-medium truncate">{chk.partyName}</div>
                      <div className="flex justify-between items-center text-[11px] text-slate-400">
                        <span>{chk.draweeBank || chk.bankName}</span>
                        <span>{getStatusBadge(chk.status)}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Selected Check Details & Lifecycle Actions */}
        <div className="lg:col-span-2 space-y-6">
          {selectedCheck ? (
            <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-6">
              {/* Check Header Box */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
                <div>
                  <span className="text-xs text-slate-400 block">{isAr ? "رقم الشيك المحدد:" : "Selected Check:"}</span>
                  <div className="text-2xl font-bold font-mono text-amber-300 mt-0.5">
                    {selectedCheck.checkNumber}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">{isAr ? "الحالة الحالية:" : "Current Status:"}</span>
                    <div className="mt-1">{getStatusBadge(selectedCheck.status)}</div>
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 block">{isAr ? "الساحب / العميل:" : "Drawer / Customer:"}</span>
                  <div className="font-bold text-white text-sm mt-1">{selectedCheck.partyName}</div>
                </div>

                <div>
                  <span className="text-slate-500 block">{isAr ? "مبلغ الشيك:" : "Amount:"}</span>
                  <div className="font-mono font-bold text-emerald-400 text-base mt-1">
                    {formatCurrency(selectedCheck.amount, organization.currency, locale)}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block">{isAr ? "البنك المسحوب عليه:" : "Drawee Bank:"}</span>
                  <div className="font-semibold text-slate-200 mt-1">{selectedCheck.draweeBank || selectedCheck.bankName}</div>
                </div>

                <div>
                  <span className="text-slate-500 block">{isAr ? "تاريخ الاستحقاق:" : "Due Date:"}</span>
                  <div className="font-mono font-bold text-amber-200 mt-1">{formatDate(selectedCheck.dueDate, locale)}</div>
                </div>

                <div>
                  <span className="text-slate-500 block">{isAr ? "تاريخ التحرير:" : "Issue Date:"}</span>
                  <div className="font-mono text-slate-300 mt-1">{formatDate(selectedCheck.issueDate, locale)}</div>
                </div>

                <div>
                  <span className="text-slate-500 block">{isAr ? "رقم السند المرجعي:" : "Voucher Ref:"}</span>
                  <div className="font-mono text-slate-300 mt-1">{selectedCheck.voucherNumber || "---"}</div>
                </div>
              </div>

              {/* Lifecycle Actions */}
              {canManage && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    {isAr ? "إجراءات وتغيير حالة الشيك (توليد قيود محاسبية):" : "Lifecycle Actions (Auto GL Journaling):"}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Action 1: Under Collection */}
                    <button
                      onClick={() => handleOpenActionModal(selectedCheck, "under_collection")}
                      disabled={selectedCheck.status === "collected" || selectedCheck.status === "under_collection"}
                      className="flex flex-col items-center gap-2 p-4 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-xl font-semibold text-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Send className="w-5 h-5" />
                      <span>{isAr ? "إرسال برسم التحصيل" : "Send for Collection"}</span>
                      <span className="text-[10px] text-amber-400/80 font-normal">{isAr ? "قيد: من شيكات برسم التحصيل إلى أوراق قبض" : "Dr. Under Collection / Cr. Notes Rec"}</span>
                    </button>

                    {/* Action 2: Collected */}
                    <button
                      onClick={() => handleOpenActionModal(selectedCheck, "collected")}
                      disabled={selectedCheck.status === "collected"}
                      className="flex flex-col items-center gap-2 p-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl font-semibold text-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <span>{isAr ? "تم التحصيل بنجاح" : "Mark Collected"}</span>
                      <span className="text-[10px] text-emerald-400/80 font-normal">{isAr ? "قيد: من البنك إلى شيكات برسم التحصيل وتحديث الرصيد" : "Dr. Bank Cash / Cr. Under Collection"}</span>
                    </button>

                    {/* Action 3: Bounced */}
                    <button
                      onClick={() => handleOpenActionModal(selectedCheck, "bounced")}
                      disabled={selectedCheck.status === "collected" || selectedCheck.status === "bounced"}
                      className="flex flex-col items-center gap-2 p-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl font-semibold text-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <XCircle className="w-5 h-5" />
                      <span>{isAr ? "ارتداد / رفض الشيك" : "Mark Bounced"}</span>
                      <span className="text-[10px] text-rose-400/80 font-normal">{isAr ? "قيد: من حساب العميل إلى شيكات برسم التحصيل" : "Dr. Customer / Cr. Under Collection"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Explanation Note */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-2">
                <div className="flex items-center gap-2 text-slate-300 font-bold">
                  <RefreshCw className="w-4 h-4 text-blue-400" />
                  <span>{isAr ? "الدورة المحاسبية الآلية المطبقة:" : "Automated Accounting Workflow:"}</span>
                </div>
                <p>
                  {isAr
                    ? "1. استلام الشيك: مدين أوراق قبض (1102002) / دائن العميل (1102001)."
                    : "1. Check Receipt: Dr. Notes Rec (1102002) / Cr. Customer (1102001)."}
                </p>
                <p>
                  {isAr
                    ? "2. برسم التحصيل: مدين شيكات برسم التحصيل (1102003) / دائن أوراق قبض (1102002)."
                    : "2. Under Collection: Dr. Checks Under Coll (1102003) / Cr. Notes Rec (1102002)."}
                </p>
                <p>
                  {isAr
                    ? "3. نجاح التحصيل: مدين نقدية البنك (1101002) / دائن شيكات برسم التحصيل (1102003) مع زيادة رصيد البنك تلقائياً."
                    : "3. Collected: Dr. Bank Cash (1101002) / Cr. Checks Under Coll (1102003) + Auto Bank Balance increment."}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/80 p-12 rounded-2xl border border-slate-800 text-center text-slate-500 space-y-3">
              <CheckSquare className="w-12 h-12 mx-auto text-slate-600" />
              <p className="text-sm font-medium">
                {isAr ? "يرجى تحديد شيك من القائمة الجانبية لإدارة حالته وإجراء التوجيه المحاسبي" : "Select a check from the list to manage its status"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action Execution Modal */}
      <Modal
        isOpen={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        title={
          actionType === "under_collection"
            ? (isAr ? "إرسال الشيك برسم التحصيل" : "Send Check for Collection")
            : actionType === "collected"
            ? (isAr ? "إثبات تحصيل الشيك وإيداعه" : "Collect & Deposit Check")
            : (isAr ? "إثبات ارتداد ورفض الشيك" : "Bounced Check Registration")
        }
        maxWidth="md"
      >
        <form onSubmit={handleExecuteStatusChange} className="space-y-4 text-xs">
          {actionError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg">
              {actionError}
            </div>
          )}

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <span className="text-slate-400 block">{isAr ? "الشيك المحدد:" : "Selected Check:"}</span>
            <div className="font-mono font-bold text-white text-sm">
              {selectedCheck?.checkNumber} - {formatCurrency(selectedCheck?.amount || 0, organization.currency, locale)}
            </div>
          </div>

          {actionType === "collected" && (
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">{isAr ? "حساب البنك / الخزينة المودع به:" : "Target Bank Account:"}</label>
              <select
                value={targetBankOrTreasuryId}
                onChange={e => setTargetBankOrTreasuryId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                required
              >
                {treasuryAccounts.map(t => (
                  <option key={t.id} value={t.id}>
                    {isAr ? t.nameAr : t.nameEn} ({formatCurrency(t.balance, organization.currency, locale)})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-slate-400 mb-1">{isAr ? "ملاحظات وتفاصيل الإجراء:" : "Action Notes:"}</label>
            <textarea
              value={actionNotes}
              onChange={e => setActionNotes(e.target.value)}
              rows={2}
              placeholder={isAr ? "أدخل بيان أو رقم إشعار البنك..." : "Enter bank slip or reason..."}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsActionModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg shadow-lg shadow-blue-900/30 transition-all disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{isAr ? "تأكيد الإجراء وترحيل القيد" : "Confirm & Post Journal"}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
