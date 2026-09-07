"use client";

import React, { useState } from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import VoucherPrintModal, { VoucherPrintData } from "@/components/ui/VoucherPrintModal";
import TableSkeleton from "@/components/ui/TableSkeleton";
import {
  Wallet, Plus, ArrowUpRight, Search, Filter,
  Printer, Edit2, Trash2, CheckCircle2, Building2,
  Calendar, FileText, User, Layers, Loader2
} from "lucide-react";
import { CashPayment } from "@/types/erp";

export default function CashPaymentsPage() {
  const {
    treasuryAccounts, cashPayments, suppliers, accounts, costCenters,
    createCashPayment, updateCashPayment, deleteCashPayment,
    organization, activeBranchId, currentUser, locale, hasPermission, isLoadingData
  } = useERP();

  const isAr = locale === "ar";
  const canManage = hasPermission(["super_admin", "tenant_admin", "accountant"]);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTreasuryFilter, setSelectedTreasuryFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<CashPayment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Print Modal
  const [printData, setPrintData] = useState<VoucherPrintData | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    paymentNumber: "",
    date: new Date().toISOString().split("T")[0],
    treasuryAccountId: "",
    amount: 0,
    currency: organization.currency || "EGP",
    paidTo: "",
    supplierId: "",
    debitAccountId: "",
    costCenterId: "",
    notes: ""
  });

  const handleOpenCreateModal = () => {
    setEditingPayment(null);
    setFormError(null);
    const defaultTreasury = treasuryAccounts[0]?.id || "";
    const defaultDebitAcc = accounts.find(a => a.code === "2101001" || a.code === "2110")?.id || accounts[0]?.id || "";
    setFormData({
      paymentNumber: "PAY-" + Date.now().toString().slice(-6),
      date: new Date().toISOString().split("T")[0],
      treasuryAccountId: defaultTreasury,
      amount: 0,
      currency: organization.currency || "EGP",
      paidTo: "",
      supplierId: "",
      debitAccountId: defaultDebitAcc,
      costCenterId: "",
      notes: ""
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (pay: CashPayment) => {
    setEditingPayment(pay);
    setFormError(null);
    setFormData({
      paymentNumber: pay.paymentNumber,
      date: pay.date,
      treasuryAccountId: pay.treasuryAccountId,
      amount: pay.amount,
      currency: pay.currency || organization.currency || "EGP",
      paidTo: pay.paidTo,
      supplierId: pay.supplierId || "",
      debitAccountId: pay.debitAccountId || "",
      costCenterId: pay.costCenterId || "",
      notes: pay.notes || ""
    });
    setIsModalOpen(true);
  };

  const handlePrint = (pay: CashPayment) => {
    const tr = treasuryAccounts.find(t => t.id === pay.treasuryAccountId);
    const acc = accounts.find(a => a.id === pay.debitAccountId);
    const cc = costCenters.find(c => c.id === pay.costCenterId);

    setPrintData({
      voucherType: "cash_payment",
      voucherNumber: pay.paymentNumber,
      date: pay.date,
      amount: pay.amount,
      currency: pay.currency || organization.currency,
      partyName: pay.paidTo,
      treasuryOrBankName: isAr ? tr?.nameAr : tr?.nameEn,
      accountName: isAr ? acc?.nameAr : acc?.nameEn,
      costCenterName: isAr ? cc?.nameAr : cc?.nameEn,
      notes: pay.notes
    });
    setIsPrintModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (formData.amount <= 0) {
      setFormError(isAr ? "يرجى إدخال مبلغ صحيح أكبر من الصفر" : "Please enter a valid amount greater than 0");
      return;
    }
    if (!formData.treasuryAccountId) {
      setFormError(isAr ? "يرجى اختيار الخزينة المنصرف منها" : "Please select a treasury account");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingPayment) {
        await updateCashPayment(editingPayment.id, {
          paymentNumber: formData.paymentNumber,
          date: formData.date,
          treasuryAccountId: formData.treasuryAccountId,
          amount: formData.amount,
          currency: formData.currency,
          paidTo: formData.paidTo || (suppliers.find(s => s.id === formData.supplierId)?.nameAr || (isAr ? "مورد" : "Supplier")),
          supplierId: formData.supplierId || undefined,
          debitAccountId: formData.debitAccountId || undefined,
          costCenterId: formData.costCenterId || undefined,
          notes: formData.notes
        });
      } else {
        const saved = await createCashPayment({
          organizationId: organization.id,
          branchId: activeBranchId,
          paymentNumber: formData.paymentNumber,
          date: formData.date,
          treasuryAccountId: formData.treasuryAccountId,
          amount: formData.amount,
          currency: formData.currency,
          paidTo: formData.paidTo || (suppliers.find(s => s.id === formData.supplierId)?.nameAr || (isAr ? "مورد" : "Supplier")),
          supplierId: formData.supplierId || undefined,
          debitAccountId: formData.debitAccountId,
          costCenterId: formData.costCenterId || undefined,
          notes: formData.notes,
          createdBy: currentUser.name
        });

        // Prompt print
        handlePrint(saved);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Failed to save cash payment:", err);
      setFormError(err.message || (isAr ? "فشل حفظ سند الصرف" : "Failed to save cash payment"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(isAr ? "هل أنت متأكد من حذف سند الصرف؟" : "Are you sure you want to delete this payment?")) return;
    try {
      await deleteCashPayment(id);
    } catch (err: any) {
      console.error(err);
    }
  };

  // Filtered List
  const filteredPayments = cashPayments.filter(p => {
    const matchesSearch =
      p.paymentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.paidTo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.notes && p.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesTreasury = selectedTreasuryFilter === "all" || p.treasuryAccountId === selectedTreasuryFilter;
    const matchesStart = !startDate || p.date >= startDate;
    const matchesEnd = !endDate || p.date <= endDate;

    return matchesSearch && matchesTreasury && matchesStart && matchesEnd;
  });

  const totalPaymentsAmount = filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {isAr ? "سندات الصرف النقدي" : "Cash Payment Vouchers"}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAr ? "تسجيل وقيد المدفوعات والمصروفات مع التوجيه المحاسبي ومراكز التكلفة والطباعة" : "Record cash outflows with automatic GL journaling, cost center tracking, and voucher printing"}
            </p>
          </div>
        </div>

        {canManage && (
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-amber-900/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? "إنشاء سند صرف جديد" : "New Cash Payment"}</span>
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">{isAr ? "إجمالي المدفوعات المعروضة" : "Total Payments Amount"}</span>
            <div className="text-xl font-bold font-mono text-amber-400 mt-1">
              {formatCurrency(totalPaymentsAmount, organization.currency, locale)}
            </div>
          </div>
          <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-lg">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">{isAr ? "عدد سندات الصرف" : "Payments Count"}</span>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {filteredPayments.length}
            </div>
          </div>
          <div className="p-2.5 bg-slate-800 text-slate-400 rounded-lg">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">{isAr ? "الخزائن النشطة" : "Active Treasuries"}</span>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {treasuryAccounts.length}
            </div>
          </div>
          <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute right-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder={isAr ? "بحث برقم السند، جهة الصرف، أو البيان..." : "Search by payment #, payee, notes..."}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <select
          value={selectedTreasuryFilter}
          onChange={e => setSelectedTreasuryFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
        >
          <option value="all">{isAr ? "جميع الخزائن" : "All Treasuries"}</option>
          {treasuryAccounts.map(t => (
            <option key={t.id} value={t.id}>
              {isAr ? t.nameAr : t.nameEn}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
        />
        <input
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
        />

        {(searchTerm || selectedTreasuryFilter !== "all" || startDate || endDate) && (
          <button
            onClick={() => {
              setSearchTerm("");
              setSelectedTreasuryFilter("all");
              setStartDate("");
              setEndDate("");
            }}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded-lg"
          >
            {isAr ? "إعادة ضبط" : "Reset"}
          </button>
        )}
      </div>

      {/* Payments Table */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden">
        {isLoadingData ? (
          <div className="p-6">
            <TableSkeleton rows={5} columns={7} />
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <ArrowUpRight className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm font-medium">
              {isAr ? "لا توجد سندات صرف مسجلة مطابقة للبحث" : "No cash payment vouchers found"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="p-3.5">{isAr ? "رقم السند" : "Payment #"}</th>
                  <th className="p-3.5">{isAr ? "التاريخ" : "Date"}</th>
                  <th className="p-3.5">{isAr ? "جهة الصرف / المدفوع له" : "Paid To"}</th>
                  <th className="p-3.5">{isAr ? "الخزينة المنصرف منها" : "Treasury"}</th>
                  <th className="p-3.5">{isAr ? "الحساب المدين" : "Debit Account"}</th>
                  <th className="p-3.5">{isAr ? "مركز التكلفة" : "Cost Center"}</th>
                  <th className="p-3.5 text-left">{isAr ? "المبلغ" : "Amount"}</th>
                  <th className="p-3.5 text-center">{isAr ? "الإجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPayments.map(pay => {
                  const tr = treasuryAccounts.find(t => t.id === pay.treasuryAccountId);
                  const acc = accounts.find(a => a.id === pay.debitAccountId);
                  const cc = costCenters.find(c => c.id === pay.costCenterId);

                  return (
                    <tr key={pay.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-white">
                        {pay.paymentNumber}
                      </td>
                      <td className="p-3.5 text-slate-300">
                        {formatDate(pay.date, locale)}
                      </td>
                      <td className="p-3.5 font-medium text-slate-200">
                        {pay.paidTo}
                      </td>
                      <td className="p-3.5 text-slate-300">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/50">
                          {isAr ? tr?.nameAr : tr?.nameEn || "---"}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-300">
                        {isAr ? acc?.nameAr : acc?.nameEn || (isAr ? "حساب الموردين (2101001)" : "AP Account")}
                      </td>
                      <td className="p-3.5">
                        {cc ? (
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px]">
                            {isAr ? cc.nameAr : cc.nameEn}
                          </span>
                        ) : (
                          <span className="text-slate-600">---</span>
                        )}
                      </td>
                      <td className="p-3.5 text-left font-mono font-bold text-amber-400 text-sm">
                        {formatCurrency(pay.amount, pay.currency || organization.currency, locale)}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handlePrint(pay)}
                            title={isAr ? "طباعة السند" : "Print Voucher"}
                            className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {canManage && (
                            <>
                              <button
                                onClick={() => handleOpenEditModal(pay)}
                                title={isAr ? "تعديل السند" : "Edit Voucher"}
                                className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(pay.id)}
                                title={isAr ? "حذف السند" : "Delete Voucher"}
                                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPayment ? (isAr ? "تعديل سند صرف" : "Edit Cash Payment") : (isAr ? "إنشاء سند صرف نقدي جديد" : "New Cash Payment Voucher")}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">{isAr ? "رقم السند:" : "Payment #:"}</label>
              <input
                type="text"
                value={formData.paymentNumber}
                onChange={e => setFormData({ ...formData, paymentNumber: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">{isAr ? "التاريخ:" : "Date:"}</label>
              <input
                type="date"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">{isAr ? "الخزينة المنصرف منها:" : "Source Treasury:"}</label>
              <select
                value={formData.treasuryAccountId}
                onChange={e => setFormData({ ...formData, treasuryAccountId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                required
              >
                {treasuryAccounts.map(t => (
                  <option key={t.id} value={t.id}>
                    {isAr ? t.nameAr : t.nameEn} ({formatCurrency(t.balance, organization.currency, locale)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">{isAr ? "المبلغ المصروف:" : "Amount:"}</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.amount || ""}
                onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-amber-500"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">{isAr ? "المورد (اختياري لتسوية رصيد المورد):" : "Supplier (Optional):"}</label>
              <select
                value={formData.supplierId}
                onChange={e => {
                  const suppId = e.target.value;
                  const s = suppliers.find(item => item.id === suppId);
                  setFormData({
                    ...formData,
                    supplierId: suppId,
                    paidTo: s ? (isAr ? s.nameAr : s.nameEn) : formData.paidTo
                  });
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">{isAr ? "-- اختيار مورد من الدليل --" : "-- Select Supplier --"}</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>
                    {isAr ? s.nameAr : s.nameEn} ({isAr ? "رصيد مستحق:" : "Bal:"} {formatCurrency(s.currentBalance, organization.currency, locale)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">{isAr ? "المدفوع له (الاسم / الجهة المستفيدة):" : "Paid To:"}</label>
              <input
                type="text"
                value={formData.paidTo}
                onChange={e => setFormData({ ...formData, paidTo: e.target.value })}
                placeholder={isAr ? "اسم المورد أو المستفيد..." : "Payee name..."}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">{isAr ? "الحساب المدين (المصروف أو الالتزام):" : "Debit Account (COA):"}</label>
              <select
                value={formData.debitAccountId}
                onChange={e => setFormData({ ...formData, debitAccountId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                required
              >
                {accounts.filter(a => a.type === "expense" || a.type === "liabilities" || a.type === "assets").map(a => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {isAr ? a.nameAr : a.nameEn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">{isAr ? "مركز التكلفة / المشروع (اختياري):" : "Cost Center (Optional):"}</label>
              <select
                value={formData.costCenterId}
                onChange={e => setFormData({ ...formData, costCenterId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">{isAr ? "-- بدون مركز تكلفة --" : "-- None --"}</option>
                {costCenters.map(cc => (
                  <option key={cc.id} value={cc.id}>
                    {cc.code} - {isAr ? cc.nameAr : cc.nameEn} ({cc.costCenterType === "revenue" ? (isAr ? "إيرادي" : "Revenue") : (isAr ? "تكاليف" : "Expense")})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">{isAr ? "البيان / ملاحظات الصرف:" : "Notes / Statement:"}</label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              placeholder={isAr ? "أدخل تفاصيل وبيان الصرف..." : "Enter payment notes..."}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg shadow-lg shadow-amber-900/30 transition-all disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{editingPayment ? (isAr ? "حفظ التعديلات" : "Save Changes") : (isAr ? "حفظ وترحيل السند" : "Save & Post")}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Print Modal */}
      <VoucherPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        voucher={printData}
      />
    </div>
  );
}
