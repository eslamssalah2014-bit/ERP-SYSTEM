"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useERP } from "@/context/erp-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import VoucherPrintModal, { VoucherPrintData } from "@/components/ui/VoucherPrintModal";
import TableSkeleton from "@/components/ui/TableSkeleton";
import {
  CreditCard, Plus, ArrowUpRight, Search, Filter,
  Printer, Edit2, Trash2, CheckCircle2, Building2,
  Calendar, FileText, User, Layers, Loader2, Users, Truck
} from "lucide-react";
import { CheckRecord, CheckStatus } from "@/types/erp";

export default function PayableNotesPage() {
  const {
    checks, suppliers, customers, accounts, costCenters, treasuryAccounts,
    addCheck, updateCheck, deleteCheck, organization,
    activeBranchId, currentUser, locale, hasPermission, isLoadingData, showToast
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

  // Requirement 9: Beneficiary 3-Options State matching سند الصرف النقدي
  // Option 1: Customer | Option 2: Supplier | Option 3: Chart of Accounts
  const [partyType, setPartyType] = useState<"supplier" | "customer" | "account">("supplier");
  const [accTypeFilter, setAccTypeFilter] = useState<string>("all");
  const [accSearchQuery, setAccSearchQuery] = useState("");

  // Filtered Accounts from entire Chart of Accounts
  const filteredDebitAccounts = useMemo(() => {
    return accounts.filter(acc => {
      const matchesType = accTypeFilter === "all" || acc.type === accTypeFilter;
      const q = accSearchQuery.toLowerCase().trim();
      const matchesQuery = !q ||
        (acc.code && acc.code.toLowerCase().includes(q)) ||
        (acc.nameAr && acc.nameAr.toLowerCase().includes(q)) ||
        (acc.nameEn && acc.nameEn.toLowerCase().includes(q));
      return matchesType && matchesQuery;
    });
  }, [accounts, accTypeFilter, accSearchQuery]);

  // Print Modal
  const [printData, setPrintData] = useState<VoucherPrintData | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Source bank names ONLY from Chart of Accounts & Treasury accounts
  const availableBanks = useMemo(() => {
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
    customerId: "",
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
    setPartyType("supplier");
    setAccTypeFilter("all");
    setAccSearchQuery("");
    const defaultAcc = accounts.find(a => a.code === "2101002" || a.code === "2101")?.id || accounts[0]?.id || "";
    const defaultBank = availableBanks[0] || (isAr ? "البنك الأهلي المصري" : "National Bank");
    setFormData({
      checkNumber: "CHK-PAY-" + Date.now().toString().slice(-5),
      bankName: defaultBank,
      supplierId: "",
      customerId: "",
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
    setAccTypeFilter("all");
    setAccSearchQuery("");
    
    // Determine partyType
    if (chk.customerId) {
      setPartyType("customer");
    } else if (chk.supplierId) {
      setPartyType("supplier");
    } else {
      setPartyType("account");
    }

    setFormData({
      checkNumber: chk.checkNumber,
      bankName: chk.bankName,
      supplierId: chk.supplierId || "",
      customerId: chk.customerId || "",
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

    if (!formData.supplierId && !formData.customerId && !formData.partyName.trim()) {
      setFormError(isAr ? "يرجى اختيار جهة الصرف أو كتابة اسم المستفيد" : "Please select beneficiary or enter payee name");
      return;
    }

    if (formData.amount <= 0) {
      setFormError(isAr ? "يرجى تحديد مبلغ صحيح للشيك" : "Please enter a valid check amount");
      return;
    }

    setIsSubmitting(true);
    try {
      let finalPartyName = formData.partyName;
      if (!finalPartyName) {
        if (partyType === "supplier" && formData.supplierId) {
          finalPartyName = suppliers.find(s => s.id === formData.supplierId)?.nameAr || (isAr ? "مورد" : "Supplier");
        } else if (partyType === "customer" && formData.customerId) {
          finalPartyName = customers.find(c => c.id === formData.customerId)?.nameAr || (isAr ? "عميل" : "Customer");
        } else {
          finalPartyName = isAr ? "مستفيد" : "Payee";
        }
      }

      if (editingCheck) {
        await updateCheck(editingCheck.id, {
          checkNumber: formData.checkNumber,
          bankName: formData.bankName,
          supplierId: partyType === "supplier" ? formData.supplierId || undefined : undefined,
          customerId: partyType === "customer" ? formData.customerId || undefined : undefined,
          partyName: finalPartyName,
          accountId: formData.accountId || undefined,
          costCenterId: formData.costCenterId || undefined,
          amount: formData.amount,
          issueDate: formData.issueDate,
          dueDate: formData.dueDate,
          notes: formData.notes
        });
        showToast(isAr ? "تم تعديل سند صرف أ.د بنجاح" : "Payable note updated", "success");
      } else {
        const saved = await addCheck({
          organizationId: organization.id,
          branchId: activeBranchId,
          checkNumber: formData.checkNumber,
          bankName: formData.bankName,
          type: "outgoing",
          partyName: finalPartyName,
          supplierId: partyType === "supplier" ? formData.supplierId || undefined : undefined,
          customerId: partyType === "customer" ? formData.customerId || undefined : undefined,
          accountId: formData.accountId || undefined,
          costCenterId: formData.costCenterId || undefined,
          amount: formData.amount,
          issueDate: formData.issueDate,
          dueDate: formData.dueDate,
          status: "pending",
          voucherNumber: "PV-" + formData.checkNumber,
          notes: formData.notes,
          createdBy: currentUser.name
        });

        // Prompt print
        setPrintData({
          voucherType: "check_payment",
          voucherNumber: saved.voucherNumber || saved.checkNumber,
          date: saved.issueDate,
          amount: saved.amount,
          currency: organization.currency,
          partyName: saved.partyName,
          checkNumber: saved.checkNumber,
          draweeBank: saved.bankName,
          dueDate: saved.dueDate,
          accountName: accounts.find(a => a.id === formData.accountId)?.nameAr,
          costCenterName: costCenters.find(c => c.id === formData.costCenterId)?.nameAr,
          notes: saved.notes
        });
        setIsPrintModalOpen(true);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || (isAr ? "فشل حفظ سند الصرف" : "Failed to save check"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(isAr ? "هل أنت متأكد من حذف هذا السند والشيك المصدر؟" : "Are you sure you want to delete this payable note?")) return;
    try {
      await deleteCheck(id);
      showToast(isAr ? "تم حذف سند الصرف بنجاح" : "Payable note deleted", "success");
    } catch (err: any) {
      console.error(err);
      alert(err?.message || (isAr ? "فشل حذف السند" : "Failed to delete"));
    }
  };

  // Filter outgoing checks
  const outgoingChecks = checks.filter(c => c.type === "outgoing");

  const filteredChecks = outgoingChecks.filter(c => {
    const matchesSearch =
      c.checkNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.bankName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBank = selectedBankFilter === "all" || c.bankName === selectedBankFilter;
    const matchesStatus = selectedStatusFilter === "all" || c.status === selectedStatusFilter;

    return matchesSearch && matchesBank && matchesStatus;
  });

  const totalOutgoingAmount = filteredChecks.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const pendingCount = outgoingChecks.filter(c => c.status === "pending" || c.status === "in_treasury").length;
  const paidCount = outgoingChecks.filter(c => c.status === "paid" || c.status === "cleared").length;

  const getStatusBadge = (status: CheckStatus) => {
    switch (status) {
      case "pending":
      case "in_treasury":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">{isAr ? "محرر / قيد الصرف" : "Pending"}</span>;
      case "paid":
      case "cleared":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{isAr ? "تم الخصم والصرف" : "Paid"}</span>;
      case "bounced":
      case "returned":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">{isAr ? "مرتجع / ملغي" : "Cancelled"}</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header - Renamed to سند صرف أ.د (Requirement 2 & Requirement 9) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <Link href="/checks" className="hover:text-emerald-400 transition-colors">
                {isAr ? "الشيكات والبنوك" : "Banks & Checks"}
              </Link>
              <span>/</span>
              <span className="text-amber-400 font-bold">{isAr ? "سند صرف أ.د" : "Payable Notes Voucher"}</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {isAr ? "سند صرف أ.د (شيكات الدفع وأوراق الدفع)" : "Payable Notes Vouchers (سند صرف أ.د)"}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAr
                ? "إصدار سندات صرف أوراق الدفع للموردين والعملاء ومختلف الحسابات مع التوجيه المحاسبي المباشر"
                : "Issue payable notes to suppliers, customers, and general ledger accounts"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/checks/reports"
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>{isAr ? "تقارير الشيكات والبنوك" : "Cheques Reports"}</span>
          </Link>

          {canManage && (
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-900/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? "إضافة سند صرف أ.د جديد" : "New Payable Note Voucher"}</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800">
          <span className="text-xs text-slate-400 block">{isAr ? "إجمالي قيمة أوراق الدفع المصدرة" : "Total Issued Payable Notes"}</span>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
            {formatCurrency(totalOutgoingAmount, organization.currency, locale)}
          </div>
        </div>

        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800">
          <span className="text-xs text-slate-400 block">{isAr ? "قيد الصرف والانتظار" : "Pending Clearance"}</span>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            {pendingCount} {isAr ? "سند" : "vouchers"}
          </div>
        </div>

        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800">
          <span className="text-xs text-slate-400 block">{isAr ? "تم خصمها وصرفها بنكياً" : "Cleared from Bank"}</span>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {paidCount} {isAr ? "سند" : "vouchers"}
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute right-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder={isAr ? "بحث برقم الشيك، المستفيد، أو البنك..." : "Search by check #, payee, bank..."}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <select
          value={selectedBankFilter}
          onChange={e => setSelectedBankFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
        >
          <option value="all">{isAr ? "جميع البنوك المسحوب منها" : "All Issuing Banks"}</option>
          {availableBanks.map(b => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>

        <select
          value={selectedStatusFilter}
          onChange={e => setSelectedStatusFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
        >
          <option value="all">{isAr ? "جميع الحالات" : "All Statuses"}</option>
          <option value="pending">{isAr ? "قيد الصرف" : "Pending"}</option>
          <option value="paid">{isAr ? "تم الصرف" : "Paid"}</option>
          <option value="bounced">{isAr ? "مرتجع / ملغي" : "Cancelled"}</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {isLoadingData ? (
          <div className="p-8 text-center text-slate-400">
            <TableSkeleton rows={5} />
          </div>
        ) : filteredChecks.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <CreditCard className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-semibold">{isAr ? "لا توجد سندات صرف أ.د مسجلة مطابقة للبحث" : "No payable notes found"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                  <th className="p-3.5 rounded-r-lg font-mono">1. {isAr ? "رقم الشيك" : "Check #"}</th>
                  <th className="p-3.5">2. {isAr ? "البنك المسحوب عليه" : "Issuing Bank"}</th>
                  <th className="p-3.5">3. {isAr ? "الجهة المستفيدة" : "Beneficiary / Payee"}</th>
                  <th className="p-3.5 font-mono">4. {isAr ? "تاريخ التحرير" : "Issue Date"}</th>
                  <th className="p-3.5 font-mono">5. {isAr ? "تاريخ الاستحقاق" : "Due Date"}</th>
                  <th className="p-3.5 text-center font-mono text-amber-400">6. {isAr ? "المبلغ" : "Amount"}</th>
                  <th className="p-3.5 text-center">7. {isAr ? "الحالة" : "Status"}</th>
                  <th className="p-3.5 rounded-l-lg text-center">8. {isAr ? "الإجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredChecks.map(chk => (
                  <tr key={chk.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3.5 font-bold text-white">
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {chk.checkNumber}
                      </span>
                    </td>
                    <td className="p-3.5 font-sans font-medium text-slate-200">{chk.bankName}</td>
                    <td className="p-3.5 font-sans">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        {chk.customerId ? (
                          <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-mono">عميل</span>
                        ) : chk.supplierId ? (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-mono">مورد</span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px] font-mono">حساب</span>
                        )}
                        <span>{chk.partyName}</span>
                      </div>
                      {chk.notes && <div className="text-[10px] text-slate-500 mt-0.5 font-normal truncate max-w-xs">{chk.notes}</div>}
                    </td>
                    <td className="p-3.5 text-slate-300">{formatDate(chk.issueDate, locale)}</td>
                    <td className="p-3.5 text-slate-300">{formatDate(chk.dueDate, locale)}</td>
                    <td className="p-3.5 text-center text-amber-400 font-bold text-sm">
                      {formatCurrency(chk.amount, organization.currency, locale)}
                    </td>
                    <td className="p-3.5 text-center">{getStatusBadge(chk.status)}</td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handlePrint(chk)}
                          title={isAr ? "طباعة السند" : "Print Voucher"}
                          className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-all cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        {canManage && (
                          <>
                            <button
                              onClick={() => handleOpenEditModal(chk)}
                              title={isAr ? "تعديل السند" : "Edit Voucher"}
                              className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-all cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(chk.id)}
                              title={isAr ? "حذف السند" : "Delete Voucher"}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

      {/* ------------------------------------------------------------- */}
      {/* Requirement 9: CREATE / EDIT MODAL WITH 3 BENEFICIARY OPTIONS */}
      {/* Option 1: Customer | Option 2: Supplier | Option 3: COA       */}
      {/* Behavior matches exactly: سند الصرف النقدي                    */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCheck ? (isAr ? "تعديل سند صرف أ.د" : "Edit Payable Note") : (isAr ? "إنشاء سند صرف أ.د جديد (شيك دفع)" : "New Payable Note Voucher")}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">{isAr ? "رقم الشيك / السند:" : "Check #:"}</label>
              <input
                type="text"
                value={formData.checkNumber}
                onChange={e => setFormData({ ...formData, checkNumber: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">{isAr ? "البنك المسحوب عليه:" : "Drawee Bank:"}</label>
              <input
                type="text"
                list="payable-banks-list"
                value={formData.bankName}
                onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
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
              <label className="block text-slate-400 mb-1">{isAr ? "تاريخ التحرير:" : "Issue Date:"}</label>
              <input
                type="date"
                value={formData.issueDate}
                onChange={e => setFormData({ ...formData, issueDate: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">{isAr ? "تاريخ الاستحقاق:" : "Due Date:"}</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">{isAr ? "مبلغ الشيك:" : "Amount:"}</label>
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

          {/* ----------------------------------------------------------- */}
          {/* Requirement 9: Beneficiary 3 Sources Options Selector      */}
          {/* Option 1: Customer | Option 2: Supplier | Option 3: COA     */}
          {/* ----------------------------------------------------------- */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-semibold">{isAr ? "الجهة المستفيدة / نوع الطرف المصروف له:" : "Beneficiary / Payee Type:"}</label>
              <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-800 text-[11px]">
                {/* Option 1: Customer */}
                <button
                  type="button"
                  onClick={() => {
                    setPartyType("customer");
                    const arAcc = accounts.find(a => a.code === "1102001" || a.code === "1120")?.id || accounts[0]?.id || "";
                    setFormData(prev => ({ ...prev, supplierId: "", accountId: arAcc }));
                  }}
                  className={`px-2.5 py-1 rounded-md transition-all font-medium ${partyType === "customer" ? "bg-amber-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
                >
                  {isAr ? "1. عميل" : "1. Customer"}
                </button>

                {/* Option 2: Supplier */}
                <button
                  type="button"
                  onClick={() => {
                    setPartyType("supplier");
                    const apAcc = accounts.find(a => a.code === "2101001" || a.code === "2110")?.id || accounts[0]?.id || "";
                    setFormData(prev => ({ ...prev, customerId: "", accountId: apAcc }));
                  }}
                  className={`px-2.5 py-1 rounded-md transition-all font-medium ${partyType === "supplier" ? "bg-amber-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
                >
                  {isAr ? "2. مورد" : "2. Supplier"}
                </button>

                {/* Option 3: Chart of Accounts */}
                <button
                  type="button"
                  onClick={() => {
                    setPartyType("account");
                    setFormData(prev => ({ ...prev, supplierId: "", customerId: "" }));
                  }}
                  className={`px-2.5 py-1 rounded-md transition-all font-medium ${partyType === "account" ? "bg-amber-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
                >
                  {isAr ? "3. شجرة الحسابات العامة" : "3. Chart of Accounts"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {partyType === "supplier" && (
                <div>
                  <label className="block text-slate-400 mb-1">{isAr ? "اختيار المورد المستفيد:" : "Select Supplier:"}</label>
                  <select
                    value={formData.supplierId}
                    onChange={e => {
                      const suppId = e.target.value;
                      const s = suppliers.find(item => item.id === suppId);
                      setFormData({
                        ...formData,
                        supplierId: suppId,
                        customerId: "",
                        partyName: s ? (isAr ? s.nameAr : s.nameEn) : formData.partyName
                      });
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-semibold"
                  >
                    <option value="">{isAr ? "-- اختيار مورد --" : "-- Select Supplier --"}</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {isAr ? s.nameAr : s.nameEn} ({isAr ? "مستحق:" : "Bal:"} {formatCurrency(s.currentBalance, organization.currency, locale)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {partyType === "customer" && (
                <div>
                  <label className="block text-slate-400 mb-1">{isAr ? "اختيار العميل المستفيد:" : "Select Customer:"}</label>
                  <select
                    value={formData.customerId}
                    onChange={e => {
                      const custId = e.target.value;
                      const c = customers.find(item => item.id === custId);
                      setFormData({
                        ...formData,
                        customerId: custId,
                        supplierId: "",
                        partyName: c ? (isAr ? c.nameAr : c.nameEn) : formData.partyName
                      });
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-semibold"
                  >
                    <option value="">{isAr ? "-- اختيار عميل --" : "-- Select Customer --"}</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {isAr ? c.nameAr : c.nameEn} ({isAr ? "رصيد:" : "Bal:"} {formatCurrency(c.currentBalance, organization.currency, locale)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className={partyType === "account" ? "col-span-2" : ""}>
                <label className="block text-slate-400 mb-1">{isAr ? "اسم المستفيد (يظهر على الشيك):" : "Payee Name:"}</label>
                <input
                  type="text"
                  value={formData.partyName}
                  onChange={e => setFormData({ ...formData, partyName: e.target.value })}
                  placeholder={isAr ? "اسم المستفيد أو الجهة المنصرف لها..." : "Payee name..."}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-semibold"
                  required
                />
              </div>
            </div>
          </div>

          {/* Full Chart of Accounts Selection with Search & Type Filter */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <label className="text-slate-300 font-semibold">{isAr ? "الحساب المدين المقابل (دليل الحسابات):" : "Debit Account (COA):"}</label>

              {/* Account Type Tabs */}
              <div className="flex flex-wrap gap-1 text-[10px]">
                {[
                  { id: "all", name: isAr ? "الكل" : "All" },
                  { id: "liabilities", name: isAr ? "الخصوم" : "Liab" },
                  { id: "expense", name: isAr ? "المصروفات" : "Exp" },
                  { id: "assets", name: isAr ? "الأصول" : "Assets" },
                  { id: "equity", name: isAr ? "الملكية" : "Equity" },
                  { id: "revenue", name: isAr ? "الإيرادات" : "Rev" },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setAccTypeFilter(tab.id)}
                    className={`px-2 py-0.5 rounded transition-all ${accTypeFilter === tab.id ? "bg-amber-600 text-white font-bold" : "bg-slate-900 text-slate-400 hover:text-white"}`}
                  >
                    {tab.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-500" />
              <input
                type="text"
                value={accSearchQuery}
                onChange={e => setAccSearchQuery(e.target.value)}
                placeholder={isAr ? "بحث بالاسم أو الكود في شجرة الحسابات..." : "Search accounts by code or name..."}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pr-8 pl-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <select
              value={formData.accountId}
              onChange={e => setFormData({ ...formData, accountId: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono text-xs"
              required
            >
              <option value="">{isAr ? "-- اختر الحساب المدين المقابل --" : "-- Select Debit Account --"}</option>
              {filteredDebitAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  [{acc.code}] {acc.nameAr} ({acc.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">{isAr ? "البيان / ملاحظات السند:" : "Notes:"}</label>
            <input
              type="text"
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder={isAr ? "سداد مستحقات، دفعة مقدمة..." : "Notes..."}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isAr ? "جاري الحفظ..." : "Saving..."}</span>
                </>
              ) : (
                <span>{editingCheck ? (isAr ? "حفظ التعديل" : "Update Note") : (isAr ? "حفظ سند صرف أ.د وترحيل القيد" : "Save Payable Note & Post JE")}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Print Modal */}
      {printData && (
        <VoucherPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          voucher={printData}
        />
      )}
    </div>
  );
}
