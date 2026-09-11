"use client";

import React, { useState } from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import VoucherPrintModal, { VoucherPrintData } from "@/components/ui/VoucherPrintModal";
import TableSkeleton from "@/components/ui/TableSkeleton";
import {
  CreditCard, Plus, ArrowUpRight, Search, Filter,
  Printer, Edit2, Trash2, CheckCircle2, Building2,
  Calendar, FileText, User, Layers, Loader2
} from "lucide-react";
import { CheckRecord, CheckStatus } from "@/types/erp";

export default function PayableChecksPage() {
  const {
    checks, suppliers, accounts, costCenters, treasuryAccounts,
    addCheck, updateCheck, deleteCheck, organization,
    activeBranchId, currentUser, locale, hasPermission, isLoadingData
  } = useERP();

  const isAr = locale === "ar";
  const canManage = hasPermission(["super_admin", "tenant_admin", "accountant"]);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBankFilter, setSelectedBankFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCheck, setEditingCheck] = useState<CheckRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Print Modal
  const [printData, setPrintData] = useState<VoucherPrintData | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Source bank names ONLY from Chart of Accounts & Treasury accounts (no hardcoding, no phantom data)
  const availableBanks = React.useMemo(() => {
    const set = new Set<string>();
    treasuryAccounts.forEach(t => {
      if (t.bankName && t.bankName.trim()) set.add(t.bankName.trim());
    });
    accounts.forEach(a => {
      if (a.code.startsWith("1101002") || a.code.startsWith("1101") || a.nameAr.includes("بنك") || a.nameEn?.toLowerCase().includes("bank")) {
        const cleanName = a.nameAr.replace(/^(حسابات|حساب|أرصدة)\s*/, "").trim();
        if (cleanName && cleanName.length > 2) set.add(cleanName);
      }
    });
    return Array.from(set);
  }, [treasuryAccounts, accounts]);

  // Form State
  const [formData, setFormData] = useState({
    checkNumber: "",
    bankName: "",
    supplierId: "",
    partyName: "",
    accountId: "",
    costCenterId: "",
    amount: 0,
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split("T")[0],
    notes: ""
  });

  const handleOpenCreateModal = () => {
    setEditingCheck(null);
    setFormError(null);
    const defaultAcc = accounts.find(a => a.code === "2101002" || a.code === "2101")?.id || accounts[0]?.id || "";
    setFormData({
      checkNumber: "",
      bankName: "",
      supplierId: "",
      partyName: "",
      accountId: defaultAcc,
      costCenterId: "",
      amount: 0,
      issueDate: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split("T")[0],
      notes: ""
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (chk: CheckRecord) => {
    setEditingCheck(chk);
    setFormError(null);
    setFormData({
      checkNumber: chk.checkNumber,
      bankName: chk.bankName,
      supplierId: chk.supplierId || "",
      partyName: chk.partyName,
      accountId: chk.accountId || "",
      costCenterId: chk.costCenterId || "",
      amount: chk.amount,
      issueDate: chk.issueDate,
      dueDate: chk.dueDate,
      notes: chk.notes || ""
    });
    setIsModalOpen(true);
  };

  const handlePrint = (chk: CheckRecord) => {
    const acc = accounts.find(a => a.id === chk.accountId);
    const cc = costCenters.find(c => c.id === chk.costCenterId);

    setPrintData({
      voucherType: "check_payment",
      voucherNumber: chk.voucherNumber || chk.checkNumber,
      date: chk.issueDate,
      amount: chk.amount,
      currency: organization.currency,
      partyName: chk.partyName,
      checkNumber: chk.checkNumber,
      draweeBank: chk.bankName,
      dueDate: chk.dueDate,
      accountName: isAr ? acc?.nameAr : acc?.nameEn,
      costCenterName: isAr ? cc?.nameAr : cc?.nameEn,
      notes: chk.notes
    });
    setIsPrintModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.checkNumber.trim()) {
      setFormError(isAr ? "يرجى إدخال رقم الشيك" : "Please enter check number");
      return;
    }

    if (!formData.bankName.trim()) {
      setFormError(isAr ? "يرجى تحديد البنك المسحوب عليه" : "Please specify issuing bank");
      return;
    }

    if (!formData.supplierId && !formData.partyName.trim()) {
      setFormError(isAr ? "يرجى اختيار مورد أو كتابة اسم المستفيد" : "Please select supplier or enter payee name");
      return;
    }

    if (formData.amount <= 0) {
      setFormError(isAr ? "يرجى تحديد مبلغ صحيح للشيك" : "Please enter a valid check amount");
      return;
    }

    setIsSubmitting(true);
    try {
      const suppObj = suppliers.find(s => s.id === formData.supplierId);
      const finalPartyName = formData.partyName || suppObj?.nameAr || (isAr ? "مورد" : "Supplier");

      if (editingCheck) {
        await updateCheck(editingCheck.id, {
          checkNumber: formData.checkNumber,
          bankName: formData.bankName,
          supplierId: formData.supplierId || undefined,
          partyName: finalPartyName,
          accountId: formData.accountId || undefined,
          costCenterId: formData.costCenterId || undefined,
          amount: formData.amount,
          issueDate: formData.issueDate,
          dueDate: formData.dueDate,
          notes: formData.notes
        });
      } else {
        const saved = await addCheck({
          organizationId: organization.id,
          branchId: activeBranchId,
          checkNumber: formData.checkNumber,
          bankName: formData.bankName,
          type: "outgoing",
          partyName: finalPartyName,
          supplierId: formData.supplierId || undefined,
          accountId: formData.accountId || undefined,
          costCenterId: formData.costCenterId || undefined,
          voucherNumber: formData.checkNumber,
          amount: formData.amount,
          issueDate: formData.issueDate,
          dueDate: formData.dueDate,
          status: "pending",
          notes: formData.notes,
          createdBy: currentUser.name
        });

        handlePrint(saved);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Failed to save payable check:", err);
      setFormError(err.message || (isAr ? "فشل حفظ شيك الدفع" : "Failed to save payable check"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(isAr ? "هل أنت متأكد من حذف هذا الشيك؟" : "Are you sure you want to delete this check?")) return;
    try {
      await deleteCheck(id);
    } catch (err: any) {
      console.error(err);
    }
  };

  // Filter outgoing checks
  const outgoingChecks = checks.filter(c => c.type === "outgoing");

  const filteredChecks = outgoingChecks.filter(c => {
    const matchesSearch =
      c.checkNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.bankName && c.bankName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesBank = selectedBankFilter === "all" || c.bankName === selectedBankFilter;
    const matchesStatus = selectedStatusFilter === "all" || c.status === selectedStatusFilter;

    return matchesSearch && matchesBank && matchesStatus;
  });

  const totalOutgoingAmount = filteredChecks.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const pendingCount = outgoingChecks.filter(c => c.status === "pending").length;
  const paidCount = outgoingChecks.filter(c => c.status === "collected" || c.status === "paid").length;

  const getStatusBadge = (status: CheckStatus) => {
    switch (status) {
      case "pending":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">{isAr ? "مستحق الصرف (قيد الانتظار)" : "Pending"}</span>;
      case "collected":
      case "paid":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{isAr ? "تم الصرف بنجاح" : "Paid"}</span>;
      case "bounced":
      case "cancelled":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">{isAr ? "ملغي / مرتد" : "Cancelled"}</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {isAr ? "شيكات الدفع (إصدار أوراق الدفع)" : "Payable Checks (Notes Payable)"}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAr ? "إصدار شيكات الدفع للموردين، التوجيه المحاسبي على أوراق الدفع (2101002)، والطباعة" : "Issue notes payable with automatic GL entries (Dr. Supplier / Cr. Notes Payable 2101002)"}
            </p>
          </div>
        </div>

        {canManage && (
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-amber-900/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? "إصدار شيك دفع جديد" : "Issue Payable Check"}</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 block">{isAr ? "إجمالي قيمة الشيكات الصادرة" : "Total Issued Checks Value"}</span>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">
            {formatCurrency(totalOutgoingAmount, organization.currency, locale)}
          </div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 block">{isAr ? "شيكات معلقة (قيد الصرف)" : "Pending Payment"}</span>
          <div className="text-xl font-bold font-mono text-amber-300 mt-1">
            {pendingCount} {isAr ? "شيك" : "checks"}
          </div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 block">{isAr ? "شيكات تم صرفها من البنك" : "Paid from Bank"}</span>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
            {paidCount} {isAr ? "شيك" : "checks"}
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute right-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder={isAr ? "بحث برقم الشيك، المورد، أو البنك..." : "Search check #, supplier, bank..."}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <select
          value={selectedStatusFilter}
          onChange={e => setSelectedStatusFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
        >
          <option value="all">{isAr ? "جميع الحالات" : "All Statuses"}</option>
          <option value="pending">{isAr ? "قيد الانتظار" : "Pending"}</option>
          <option value="collected">{isAr ? "تم الصرف" : "Paid"}</option>
          <option value="cancelled">{isAr ? "ملغي" : "Cancelled"}</option>
        </select>

        {(searchTerm || selectedStatusFilter !== "all") && (
          <button
            onClick={() => {
              setSearchTerm("");
              setSelectedStatusFilter("all");
            }}
            className="text-xs text-slate-400 hover:text-white px-2.5 py-1 bg-slate-800 rounded-lg"
          >
            {isAr ? "إعادة ضبط" : "Reset"}
          </button>
        )}
      </div>

      {/* Checks Table */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden">
        {isLoadingData ? (
          <div className="p-6">
            <TableSkeleton rows={5} columns={8} />
          </div>
        ) : filteredChecks.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <CreditCard className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm font-medium">
              {isAr ? "لا توجد شيكات دفع صادرة مطابقة للبحث" : "No payable checks found"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="p-3.5">{isAr ? "رقم الشيك" : "Check #"}</th>
                  <th className="p-3.5">{isAr ? "المستفيد / المورد" : "Payee / Supplier"}</th>
                  <th className="p-3.5">{isAr ? "البنك المسحوب عليه" : "Issuing Bank"}</th>
                  <th className="p-3.5">{isAr ? "تاريخ التحرير" : "Issue Date"}</th>
                  <th className="p-3.5">{isAr ? "تاريخ الاستحقاق" : "Due Date"}</th>
                  <th className="p-3.5">{isAr ? "الحالة" : "Status"}</th>
                  <th className="p-3.5 text-left">{isAr ? "المبلغ" : "Amount"}</th>
                  <th className="p-3.5 text-center">{isAr ? "الإجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredChecks.map(chk => (
                  <tr key={chk.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-white">
                      {chk.checkNumber}
                    </td>
                    <td className="p-3.5 font-medium text-slate-200">
                      {chk.partyName}
                    </td>
                    <td className="p-3.5 text-slate-300">
                      {chk.bankName}
                    </td>
                    <td className="p-3.5 text-slate-400 font-mono">
                      {formatDate(chk.issueDate, locale)}
                    </td>
                    <td className="p-3.5 text-slate-300 font-mono font-medium">
                      {formatDate(chk.dueDate, locale)}
                    </td>
                    <td className="p-3.5">
                      {getStatusBadge(chk.status)}
                    </td>
                    <td className="p-3.5 text-left font-mono font-bold text-amber-400 text-sm">
                      {formatCurrency(chk.amount, organization.currency, locale)}
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handlePrint(chk)}
                          title={isAr ? "طباعة السند" : "Print Voucher"}
                          className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {canManage && (
                          <>
                            <button
                              onClick={() => handleOpenEditModal(chk)}
                              title={isAr ? "تعديل الشيك" : "Edit Check"}
                              className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(chk.id)}
                              title={isAr ? "حذف الشيك" : "Delete Check"}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCheck ? (isAr ? "تعديل شيك دفع" : "Edit Payable Check") : (isAr ? "إصدار شيك دفع جديد (سند أوراق دفع)" : "Issue Payable Check Voucher")}
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
              <label className="block text-slate-400 mb-1">{isAr ? "رقم الشيك:" : "Check #:"}</label>
              <input
                type="text"
                value={formData.checkNumber}
                placeholder={isAr ? "أدخل رقم الشيك يدوياً..." : "Enter check # manually..."}
                onChange={e => setFormData({ ...formData, checkNumber: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">{isAr ? "البنك المسحوب عليه:" : "Issuing Bank:"}</label>
              <input
                list="payable-banks-list"
                type="text"
                value={formData.bankName}
                placeholder={isAr ? "اختر أو ابحث عن البنك..." : "Select / search bank..."}
                onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                required
              />
              <datalist id="payable-banks-list">
                {availableBanks.map(b => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">{isAr ? "المورد المسدد له:" : "Supplier:"}</label>
              <select
                value={formData.supplierId}
                onChange={e => {
                  const id = e.target.value;
                  const s = suppliers.find(item => item.id === id);
                  setFormData({
                    ...formData,
                    supplierId: id,
                    partyName: s ? (isAr ? s.nameAr : s.nameEn) : formData.partyName
                  });
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">{isAr ? "-- اختيار مورد --" : "-- Select Supplier --"}</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>
                    {isAr ? s.nameAr : s.nameEn} ({formatCurrency(s.currentBalance, organization.currency, locale)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">{isAr ? "اسم المستفيد:" : "Payee Name:"}</label>
              <input
                type="text"
                value={formData.partyName}
                onChange={e => setFormData({ ...formData, partyName: e.target.value })}
                placeholder={isAr ? "اسم المورد أو المستفيد..." : "Payee..."}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">{isAr ? "المبلغ:" : "Amount:"}</label>
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
            <div>
              <label className="block text-slate-400 mb-1">{isAr ? "حساب أوراق الدفع (2101002):" : "Notes Payable Account:"}</label>
              <select
                value={formData.accountId}
                onChange={e => setFormData({ ...formData, accountId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              >
                {accounts.filter(a => a.type === "liabilities").map(a => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {isAr ? a.nameAr : a.nameEn}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">{isAr ? "تاريخ التحرير:" : "Issue Date:"}</label>
              <input
                type="date"
                value={formData.issueDate}
                onChange={e => setFormData({ ...formData, issueDate: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">{isAr ? "تاريخ الاستحقاق:" : "Due Date:"}</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">{isAr ? "مركز التكلفة / المشروع:" : "Cost Center:"}</label>
            <select
              value={formData.costCenterId}
              onChange={e => setFormData({ ...formData, costCenterId: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
            >
              <option value="">{isAr ? "-- بدون مركز تكلفة --" : "-- None --"}</option>
              {costCenters.map(cc => (
                <option key={cc.id} value={cc.id}>
                  {cc.code} - {isAr ? cc.nameAr : cc.nameEn}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">{isAr ? "البيان وملاحظات الشيك:" : "Notes:"}</label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              placeholder={isAr ? "تفاصيل الشيك..." : "Check notes..."}
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
              <span>{editingCheck ? (isAr ? "حفظ التعديلات" : "Save Changes") : (isAr ? "إصدار الشيك وترحيل القيد" : "Issue Check & Post")}</span>
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
