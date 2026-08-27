"use client";

import React, { useState } from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import {
  Wallet, Plus, ArrowDownLeft, ArrowUpRight, Building2,
  CreditCard, CheckCircle2, History, Banknote, Trash2
} from "lucide-react";

export default function TreasuryPage() {
  const {
    treasuryAccounts, cashReceipts, cashPayments,
    customers, suppliers, accounts, createCashReceipt, deleteCashReceipt,
    createCashPayment, deleteCashPayment, organization, activeBranchId,
    currentUser, locale, hasPermission
  } = useERP();

  const isAr = locale === "ar";
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const canManage = hasPermission(["super_admin", "tenant_admin", "accountant"]);

  // Receipt Form State
  const [rcpTreasuryId, setRcpTreasuryId] = useState("");
  const [rcpAmount, setRcpAmount] = useState<number>(0);
  const [rcpReceivedFrom, setRcpReceivedFrom] = useState("");
  const [rcpCustomerId, setRcpCustomerId] = useState<string>("");
  const [rcpCreditAccId, setRcpCreditAccId] = useState("");
  const [rcpNotes, setRcpNotes] = useState("");

  // Payment Form State
  const [payTreasuryId, setPayTreasuryId] = useState("");
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payPaidTo, setPayPaidTo] = useState("");
  const [paySupplierId, setPaySupplierId] = useState<string>("");
  const [payDebitAccId, setPayDebitAccId] = useState("");
  const [payNotes, setPayNotes] = useState("");

  const handleOpenReceiptModal = () => {
    setRcpTreasuryId(treasuryAccounts[0]?.id || "");
    setRcpCreditAccId(accounts.find(a => a.code === "1120")?.id || accounts[0]?.id || "");
    setRcpAmount(0);
    setRcpReceivedFrom("");
    setRcpCustomerId("");
    setRcpNotes("");
    setIsReceiptModalOpen(true);
  };

  const handleOpenPaymentModal = () => {
    setPayTreasuryId(treasuryAccounts[0]?.id || "");
    setPayDebitAccId(accounts.find(a => a.code === "2110")?.id || accounts[0]?.id || "");
    setPayAmount(0);
    setPayPaidTo("");
    setPaySupplierId("");
    setPayNotes("");
    setIsPaymentModalOpen(true);
  };

  const handleCreateReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rcpAmount <= 0) return;

    const receiptNumber = "RCP-" + Date.now().toString().slice(-6);
    const targetTreasury = rcpTreasuryId || treasuryAccounts[0]?.id || "";
    const targetCreditAcc = rcpCreditAccId || accounts.find(a => a.code === "1120")?.id || accounts[0]?.id || "";

    await createCashReceipt({
      organizationId: organization.id,
      branchId: activeBranchId,
      receiptNumber,
      date: new Date().toISOString().split("T")[0],
      treasuryAccountId: targetTreasury,
      amount: rcpAmount,
      currency: organization.currency,
      receivedFrom: rcpReceivedFrom || (customers.find(c => c.id === rcpCustomerId)?.nameAr || "عميل"),
      customerId: rcpCustomerId || undefined,
      creditAccountId: targetCreditAcc,
      notes: rcpNotes,
      createdBy: currentUser.name,
    });

    setIsReceiptModalOpen(false);
    setRcpAmount(0);
    setRcpNotes("");
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (payAmount <= 0) return;

    const paymentNumber = "PAY-" + Date.now().toString().slice(-6);
    const targetTreasury = payTreasuryId || treasuryAccounts[0]?.id || "";
    const targetDebitAcc = payDebitAccId || accounts.find(a => a.code === "2110")?.id || accounts[0]?.id || "";

    await createCashPayment({
      organizationId: organization.id,
      branchId: activeBranchId,
      paymentNumber,
      date: new Date().toISOString().split("T")[0],
      treasuryAccountId: targetTreasury,
      amount: payAmount,
      currency: organization.currency,
      paidTo: payPaidTo || (suppliers.find(s => s.id === paySupplierId)?.nameAr || "مورد / مصروف"),
      supplierId: paySupplierId || undefined,
      debitAccountId: targetDebitAcc,
      notes: payNotes,
      createdBy: currentUser.name,
    });

    setIsPaymentModalOpen(false);
    setPayAmount(0);
    setPayNotes("");
  };

  const totalLiquidCash = treasuryAccounts.reduce((sum, t) => sum + t.balance, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Wallet className="w-6 h-6 text-amber-400" />
            <span>{isAr ? "الخزينة النقدية والحسابات البنكية" : "Treasury & Bank Accounts"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? ("إجمالي السيولة النقدية المتاحة: " + formatCurrency(totalLiquidCash, organization.currency, locale))
              : ("Total Liquid Assets: " + formatCurrency(totalLiquidCash, organization.currency, locale))}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleOpenReceiptModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/60 transition-all"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>{isAr ? "تحرير سند قبض (إيداع)" : "New Cash Receipt"}</span>
          </button>
          <button
            onClick={handleOpenPaymentModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-rose-400 text-xs font-bold rounded-xl border border-slate-700 transition-all"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>{isAr ? "تحرير سند صرف (مدفوعات)" : "New Cash Payment"}</span>
          </button>
        </div>
      </div>

      {/* Treasury Accounts Live Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {treasuryAccounts.map(t => (
          <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm hover:border-slate-700 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono font-bold text-xs bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-lg border border-amber-500/20">
                  {t.code}
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-bold">
                  {t.type === "cash_box" ? (isAr ? "خزينة نقدية" : "Cash Safe") : (isAr ? "حساب بنكي" : "Bank Account")}
                </span>
              </div>

              <h3 className="text-base font-bold text-white">{isAr ? t.nameAr : t.nameEn}</h3>
              {t.accountNumber && (
                <div className="font-mono text-xs text-slate-400 mt-1">
                  {isAr ? "رقم الحساب: " : "Acc: "} {t.accountNumber}
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 bg-slate-950/60 p-4 rounded-2xl">
              <span className="text-[11px] text-slate-500 block">{isAr ? "الرصيد الدفتري الحالي" : "Current Book Balance"}</span>
              <span className="text-xl font-black text-emerald-400 font-mono mt-0.5 block">
                {formatCurrency(t.balance, t.currency, locale)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Transactions History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Receipts History */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
              <h2 className="text-sm font-bold text-white">
                {isAr ? "أحدث سندات القبض (المقبوضات)" : "Recent Cash Receipts"}
              </h2>
            </div>
          </div>

          <div className="space-y-3">
            {cashReceipts.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 font-sans">
                {isAr ? "لا توجد سندات قبض مسجلة" : "No cash receipts recorded"}
              </div>
            ) : (
              cashReceipts.map(rcp => (
                <div key={rcp.id} className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition-colors">
                  <div>
                    <div className="font-mono font-bold text-white">{rcp.receiptNumber}</div>
                    <div className="text-slate-400 text-[11px] mt-0.5">{rcp.receivedFrom}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-left">
                      <div className="font-mono font-black text-emerald-400">
                        +{formatCurrency(rcp.amount, rcp.currency, locale)}
                      </div>
                      <div className="text-[10px] text-slate-500">{formatDate(rcp.date, locale)}</div>
                    </div>
                    {canManage && (
                      <button
                        onClick={async () => {
                          if (confirm(isAr ? "هل أنت متأكد من حذف سند القبض هذا؟" : "Delete this cash receipt?")) {
                            await deleteCashReceipt(rcp.id);
                          }
                        }}
                        title={isAr ? "حذف سند القبض" : "Delete"}
                        className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Payments History */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-rose-400" />
              <h2 className="text-sm font-bold text-white">
                {isAr ? "أحدث سندات الصرف (المدفوعات)" : "Recent Cash Payments"}
              </h2>
            </div>
          </div>

          <div className="space-y-3">
            {cashPayments.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 font-sans">
                {isAr ? "لا توجد سندات صرف مسجلة" : "No cash payments recorded"}
              </div>
            ) : (
              cashPayments.map(pay => (
                <div key={pay.id} className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition-colors">
                  <div>
                    <div className="font-mono font-bold text-white">{pay.paymentNumber}</div>
                    <div className="text-slate-400 text-[11px] mt-0.5">{pay.paidTo}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-left">
                      <div className="font-mono font-black text-rose-400">
                        -{formatCurrency(pay.amount, pay.currency, locale)}
                      </div>
                      <div className="text-[10px] text-slate-500">{formatDate(pay.date, locale)}</div>
                    </div>
                    {canManage && (
                      <button
                        onClick={async () => {
                          if (confirm(isAr ? "هل أنت متأكد من حذف سند الصرف هذا؟" : "Delete this cash payment?")) {
                            await deleteCashPayment(pay.id);
                          }
                        }}
                        title={isAr ? "حذف سند الصرف" : "Delete"}
                        className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Cash Receipt Modal */}
      <Modal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        title={isAr ? "تحرير سند قبض نقدية / بنكي" : "Issue Cash Receipt"}
      >
        <form onSubmit={handleCreateReceipt} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">{isAr ? "الخزينة / الحساب البنكي المودع به *" : "Target Account *"}</label>
            <select
              value={rcpTreasuryId}
              onChange={(e) => setRcpTreasuryId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-emerald-500"
            >
              {treasuryAccounts.map(t => <option key={t.id} value={t.id}>{t.nameAr} ({formatCurrency(t.balance, t.currency, locale)})</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "المبلغ المقبوض *" : "Amount *"}</label>
              <input
                type="number"
                min="1"
                step="any"
                required
                value={rcpAmount}
                onChange={(e) => setRcpAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "العميل المسدد (اختياري)" : "Customer (Optional)"}</label>
              <select
                value={rcpCustomerId}
                onChange={(e) => {
                  setRcpCustomerId(e.target.value);
                  const c = customers.find(item => item.id === e.target.value);
                  if (c) setRcpReceivedFrom(c.nameAr);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              >
                <option value="">{isAr ? "--- بدون ربط بعميل ---" : "None"}</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.nameAr}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">{isAr ? "استلمنا من السيد / الجهة" : "Received From"}</label>
            <input
              type="text"
              value={rcpReceivedFrom}
              onChange={(e) => setRcpReceivedFrom(e.target.value)}
              placeholder={isAr ? "اسم الدافع أو العميل..." : "Payer Name"}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">{isAr ? "وذلك مقابل / البيان" : "Notes / Purpose"}</label>
            <textarea
              rows={2}
              value={rcpNotes}
              onChange={(e) => setRcpNotes(e.target.value)}
              placeholder={isAr ? "دفعة من حساب فاتورة مبيعات..." : "Payment for invoice..."}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsReceiptModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition-colors"
            >
              {isAr ? "اعتماد سند القبض والقيد" : "Confirm Receipt & Post"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Cash Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={isAr ? "تحرير سند صرف نقدية / بنكي" : "Issue Cash Payment"}
      >
        <form onSubmit={handleCreatePayment} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">{isAr ? "الخزينة / الحساب البنكي المصروف منه *" : "Source Account *"}</label>
            <select
              value={payTreasuryId}
              onChange={(e) => setPayTreasuryId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-rose-500"
            >
              {treasuryAccounts.map(t => <option key={t.id} value={t.id}>{t.nameAr} ({formatCurrency(t.balance, t.currency, locale)})</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "المبلغ المصروف *" : "Amount *"}</label>
              <input
                type="number"
                min="1"
                step="any"
                required
                value={payAmount}
                onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "المورد المستفيد (اختياري)" : "Supplier (Optional)"}</label>
              <select
                value={paySupplierId}
                onChange={(e) => {
                  setPaySupplierId(e.target.value);
                  const s = suppliers.find(item => item.id === e.target.value);
                  if (s) setPayPaidTo(s.nameAr);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              >
                <option value="">{isAr ? "--- بدون ربط بمورد ---" : "None"}</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.nameAr}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">{isAr ? "يصرف إلى السيد / الجهة" : "Paid To"}</label>
            <input
              type="text"
              value={payPaidTo}
              onChange={(e) => setPayPaidTo(e.target.value)}
              placeholder={isAr ? "اسم المستفيد أو المورد..." : "Payee Name"}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">{isAr ? "وذلك مقابل / البيان" : "Notes / Purpose"}</label>
            <textarea
              rows={2}
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              placeholder={isAr ? "سداد مستحقات توريد بضاعة..." : "Payment for..."}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg transition-colors"
            >
              {isAr ? "اعتماد سند الصرف والقيد" : "Confirm Payment & Post"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
