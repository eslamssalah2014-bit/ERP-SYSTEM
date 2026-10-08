"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useERP } from "@/context/erp-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import VoucherPrintModal, { VoucherPrintData } from "@/components/ui/VoucherPrintModal";
import TableSkeleton from "@/components/ui/TableSkeleton";
import {
  CheckSquare, Plus, ArrowDownLeft, Search, Filter,
  Printer, Edit2, Trash2, CheckCircle2, Building2,
  Calendar, FileText, User, Layers, Trash, Loader2, Eye, DollarSign,
  AlertCircle
} from "lucide-react";
import { CheckRecord, CheckStatus } from "@/types/erp";

interface CheckRowItem {
  id: string;
  checkNumber: string;
  draweeBank: string;
  dueDate: string;
  amount: number;
  status?: CheckStatus;
}

interface VoucherSummary {
  voucherNumber: string;
  date: string;
  partyName: string;
  customerId?: string;
  accountId?: string;
  costCenterId?: string;
  notes?: string;
  totalAmount: number;
  checks: CheckRecord[];
  statuses: CheckStatus[];
}

export default function ReceivableNotesVoucherPage() {
  const {
    checks, customers, accounts, costCenters, treasuryAccounts,
    addCheck, addCheckReceiptVoucher, updateCheck, deleteCheck, organization,
    activeBranchId, currentUser, locale, hasPermission, isLoadingData, showToast
  } = useERP();

  const isAr = locale === "ar";
  const canManage = hasPermission(["super_admin", "tenant_admin", "accountant"]);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBankFilter, setSelectedBankFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minAmount, setMinAmount] = useState<string>("");
  const [maxAmount, setMaxAmount] = useState<string>("");

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // View Voucher Modal State (Requirement 8)
  const [isViewVoucherModalOpen, setIsViewVoucherModalOpen] = useState(false);
  const [viewingVoucher, setViewingVoucher] = useState<VoucherSummary | null>(null);

  // Edit Voucher Modal State (Requirement 8)
  const [isEditVoucherModalOpen, setIsEditVoucherModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<VoucherSummary | null>(null);
  const [editVoucherDate, setEditVoucherDate] = useState("");
  const [editCustomerId, setEditCustomerId] = useState("");
  const [editPartyName, setEditPartyName] = useState("");
  const [editVoucherNotes, setEditVoucherNotes] = useState("");
  const [editCheckItems, setEditCheckItems] = useState<Array<{
    existingId?: string;
    checkNumber: string;
    draweeBank: string;
    dueDate: string;
    amount: number;
    status: CheckStatus;
  }>>([]);

  // Print Modal
  const [printData, setPrintData] = useState<VoucherPrintData | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Form State for Multi-check Receipt Voucher
  const [voucherNumber, setVoucherNumber] = useState("");
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split("T")[0]);
  const [customerId, setCustomerId] = useState("");
  const [partyName, setPartyName] = useState("");
  const [accountId, setAccountId] = useState("");
  const [costCenterId, setCostCenterId] = useState("");
  const [voucherNotes, setVoucherNotes] = useState("");

  // Source bank names ONLY from Chart of Accounts & Treasury accounts
  const availableBanks = useMemo(() => {
    const set = new Set<string>();
    treasuryAccounts.forEach(t => {
      if (t.bankName && t.bankName.trim()) set.add(t.bankName.trim());
    });
    accounts.forEach(a => {
      if (a.code.startsWith("1101002") || a.nameAr.includes("بنك") || a.nameEn?.toLowerCase().includes("bank")) {
        const cleanName = a.nameAr.replace(/^(حسابات|حساب|أرصدة)\s*/, "").trim();
        if (cleanName && cleanName.length > 2) set.add(cleanName);
      }
    });
    return Array.from(set);
  }, [treasuryAccounts, accounts]);

  const [checkItems, setCheckItems] = useState<CheckRowItem[]>([
    {
      id: "chk_1",
      checkNumber: "",
      draweeBank: "",
      dueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split("T")[0],
      amount: 0
    }
  ]);

  // Group incoming checks into Vouchers (Requirement 8: Voucher Registry)
  const incomingChecks = useMemo(() => checks.filter(c => c.type === "incoming"), [checks]);

  const voucherRegistry = useMemo(() => {
    const map = new Map<string, VoucherSummary>();

    incomingChecks.forEach(chk => {
      // Determine voucher number
      let vNum = chk.voucherNumber || "";
      if (!vNum && chk.notes && chk.notes.includes("[VOUCHER:")) {
        const match = chk.notes.match(/\[VOUCHER:([^\]]+)\]/);
        if (match) vNum = match[1];
      }
      if (!vNum) {
        vNum = `RCV-${chk.checkNumber}`;
      }

      const existing = map.get(vNum) || {
        voucherNumber: vNum,
        date: chk.issueDate || (chk.createdAt ? chk.createdAt.split("T")[0] : ""),
        partyName: chk.partyName,
        customerId: chk.customerId,
        accountId: chk.accountId,
        costCenterId: chk.costCenterId,
        notes: chk.notes || "",
        totalAmount: 0,
        checks: [],
        statuses: []
      };

      existing.totalAmount += Number(chk.amount) || 0;
      existing.checks.push(chk);
      if (!existing.statuses.includes(chk.status)) {
        existing.statuses.push(chk.status);
      }
      // If header fields missing, take from check
      if (!existing.partyName && chk.partyName) existing.partyName = chk.partyName;
      if (!existing.customerId && chk.customerId) existing.customerId = chk.customerId;

      map.set(vNum, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [incomingChecks]);

  // Filter Vouchers
  const filteredVouchers = useMemo(() => {
    return voucherRegistry.filter(v => {
      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchVNum = v.voucherNumber.toLowerCase().includes(q);
        const matchParty = v.partyName.toLowerCase().includes(q);
        const matchCheckNum = v.checks.some(c => c.checkNumber.toLowerCase().includes(q));
        const matchBank = v.checks.some(c => (c.draweeBank || c.bankName).toLowerCase().includes(q));
        if (!matchVNum && !matchParty && !matchCheckNum && !matchBank) return false;
      }

      // Customer Filter
      if (selectedCustomerFilter !== "all" && v.customerId !== selectedCustomerFilter) {
        return false;
      }

      // Date Filters
      if (dateFrom && v.date < dateFrom) return false;
      if (dateTo && v.date > dateTo) return false;

      // Status Filter
      if (selectedStatusFilter !== "all") {
        const hasStatus = v.checks.some(c => c.status === selectedStatusFilter);
        if (!hasStatus) return false;
      }

      // Bank Filter
      if (selectedBankFilter !== "all") {
        const hasBank = v.checks.some(c => (c.draweeBank || c.bankName) === selectedBankFilter);
        if (!hasBank) return false;
      }

      // Amount Filters
      if (minAmount && v.totalAmount < parseFloat(minAmount)) return false;
      if (maxAmount && v.totalAmount > parseFloat(maxAmount)) return false;

      return true;
    });
  }, [voucherRegistry, searchTerm, selectedCustomerFilter, selectedStatusFilter, selectedBankFilter, dateFrom, dateTo, minAmount, maxAmount]);

  // Totals
  const totalRegistryAmount = useMemo(() => filteredVouchers.reduce((s, v) => s + v.totalAmount, 0), [filteredVouchers]);
  const totalChequesCount = useMemo(() => filteredVouchers.reduce((s, v) => s + v.checks.length, 0), [filteredVouchers]);

  // Status Badge Helper
  const getStatusBadge = (status: CheckStatus) => {
    switch (status) {
      case "in_treasury":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">{isAr ? "في الخزينة" : "In Treasury"}</span>;
      case "under_collection":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">{isAr ? "برسم التحصيل" : "Under Collection"}</span>;
      case "collected":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{isAr ? "تم التحصيل" : "Collected"}</span>;
      case "bounced":
      case "returned":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">{isAr ? "مرتد / مرفوض" : "Bounced"}</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">{status}</span>;
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setFormError(null);
    setVoucherNumber("RCV-CHK-" + Date.now().toString().slice(-6));
    setVoucherDate(new Date().toISOString().split("T")[0]);
    setCustomerId("");
    setPartyName("");
    const defaultAcc = accounts.find(a => a.code === "1102002" || a.code === "1102")?.id || accounts[0]?.id || "";
    setAccountId(defaultAcc);
    setCostCenterId("");
    setVoucherNotes("");
    setCheckItems([
      {
        id: "chk_" + Date.now(),
        checkNumber: "",
        draweeBank: "",
        dueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split("T")[0],
        amount: 0
      }
    ]);
    setIsCreateModalOpen(true);
  };

  const handleAddCheckRow = () => {
    setCheckItems(prev => [
      ...prev,
      {
        id: "chk_" + Date.now() + Math.random(),
        checkNumber: "",
        draweeBank: "",
        dueDate: new Date(Date.now() + 45 * 24 * 3600 * 1000).toISOString().split("T")[0],
        amount: 0
      }
    ]);
  };

  const handleRemoveCheckRow = (id: string) => {
    if (checkItems.length <= 1) return;
    setCheckItems(prev => prev.filter(c => c.id !== id));
  };

  const handleUpdateCheckRow = (id: string, field: keyof CheckRowItem, value: any) => {
    setCheckItems(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const totalCreateVoucherAmount = checkItems.reduce((s, c) => s + (Number(c.amount) || 0), 0);

  const handleSubmitVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId && !partyName.trim()) {
      setFormError(isAr ? "يرجى اختيار العميل المسدد أو تحديد اسم الجهة" : "Please select customer or enter party name");
      return;
    }

    if (totalCreateVoucherAmount <= 0) {
      setFormError(isAr ? "يرجى تحديد مبالغ صحيحة للشيكات" : "Please enter valid check amounts");
      return;
    }

    for (const item of checkItems) {
      if (item.amount > 0) {
        if (!item.checkNumber.trim()) {
          setFormError(isAr ? "يرجى إدخال رقم الشيك يدوياً لكافة البنود" : "Please enter check number manually for all checks");
          return;
        }
        if (!item.draweeBank.trim()) {
          setFormError(isAr ? "يرجى تحديد البنك المسحوب عليه للشيكات" : "Please select or enter drawee bank");
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      const custObj = customers.find(c => c.id === customerId);
      const finalPartyName = partyName || custObj?.nameAr || (isAr ? "عميل" : "Customer");

      await addCheckReceiptVoucher({
        voucherNumber,
        voucherDate,
        partyName: finalPartyName,
        customerId: customerId || undefined,
        accountId: accountId || undefined,
        costCenterId: costCenterId || undefined,
        notes: voucherNotes,
        checks: checkItems.filter(item => item.amount > 0).map(item => ({
          checkNumber: item.checkNumber,
          bankName: item.draweeBank,
          draweeBank: item.draweeBank,
          dueDate: item.dueDate,
          amount: item.amount,
        }))
      });

      setIsCreateModalOpen(false);

      // Trigger Print Modal
      setPrintData({
        voucherType: "check_receipt",
        voucherNumber: voucherNumber,
        date: voucherDate,
        amount: totalCreateVoucherAmount,
        currency: organization.currency,
        partyName: finalPartyName,
        accountName: accounts.find(a => a.id === accountId)?.nameAr,
        costCenterName: costCenters.find(c => c.id === costCenterId)?.nameAr,
        notes: voucherNotes,
        checksList: checkItems.map(c => ({
          checkNumber: c.checkNumber,
          draweeBank: c.draweeBank,
          dueDate: c.dueDate,
          amount: c.amount,
          partyName: finalPartyName
        }))
      });
      setIsPrintModalOpen(true);

    } catch (err: any) {
      console.error("Failed to save check receipt voucher:", err);
      setFormError(err.message || (isAr ? "فشل حفظ سند الشيكات" : "Failed to save check voucher"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // Requirement 8: View Voucher Action
  // -------------------------------------------------------------
  const handleOpenViewVoucher = (v: VoucherSummary) => {
    setViewingVoucher(v);
    setIsViewVoucherModalOpen(true);
  };

  // -------------------------------------------------------------
  // Requirement 8: Edit Voucher Action
  // -------------------------------------------------------------
  const handleOpenEditVoucher = (v: VoucherSummary) => {
    setEditingVoucher(v);
    setEditVoucherDate(v.date);
    setEditCustomerId(v.customerId || "");
    setEditPartyName(v.partyName);
    setEditVoucherNotes(v.notes || "");
    setEditCheckItems(v.checks.map(c => ({
      existingId: c.id,
      checkNumber: c.checkNumber,
      draweeBank: c.draweeBank || c.bankName || "",
      dueDate: c.dueDate,
      amount: c.amount,
      status: c.status,
    })));
    setIsEditVoucherModalOpen(true);
  };

  const handleAddEditCheckRow = () => {
    setEditCheckItems(prev => [
      ...prev,
      {
        checkNumber: "",
        draweeBank: availableBanks[0] || "البنك الأهلي المصري",
        dueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split("T")[0],
        amount: 0,
        status: "in_treasury"
      }
    ]);
  };

  const handleRemoveEditCheckRow = (idx: number) => {
    if (editCheckItems.length <= 1) return;
    setEditCheckItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveEditVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVoucher) return;

    for (const item of editCheckItems) {
      if (!item.checkNumber.trim()) {
        alert(isAr ? "يرجى إدخال رقم الشيك لجميع البنود" : "Please enter check number for all checks");
        return;
      }
      if (item.amount <= 0) {
        alert(isAr ? "يرجى إدخال مبالغ صحيحة للشيكات" : "Please enter valid amounts for all checks");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const custObj = customers.find(c => c.id === editCustomerId);
      const finalPartyName = editPartyName || custObj?.nameAr || editingVoucher.partyName;

      // 1. Update existing checks
      for (const item of editCheckItems) {
        if (item.existingId) {
          await updateCheck(item.existingId, {
            checkNumber: item.checkNumber,
            bankName: item.draweeBank,
            draweeBank: item.draweeBank,
            dueDate: item.dueDate,
            amount: item.amount,
            status: item.status,
            partyName: finalPartyName,
            customerId: editCustomerId || undefined,
            issueDate: editVoucherDate,
            notes: editVoucherNotes
          });
        } else {
          // New row added in edit mode
          await addCheck({
            organizationId: organization.id,
            branchId: activeBranchId,
            checkNumber: item.checkNumber,
            bankName: item.draweeBank,
            draweeBank: item.draweeBank,
            type: "incoming",
            partyName: finalPartyName,
            customerId: editCustomerId || undefined,
            amount: item.amount,
            issueDate: editVoucherDate,
            dueDate: item.dueDate,
            status: item.status,
            voucherNumber: editingVoucher.voucherNumber,
            notes: editVoucherNotes,
            createdBy: currentUser.name
          }, true);
        }
      }

      // 2. Remove checks that were deleted from the voucher in edit mode
      const remainingIds = new Set(editCheckItems.filter(i => i.existingId).map(i => i.existingId));
      for (const origChk of editingVoucher.checks) {
        if (!remainingIds.has(origChk.id)) {
          await deleteCheck(origChk.id);
        }
      }

      setIsEditVoucherModalOpen(false);
      showToast(isAr ? `تم تعديل بيانات السند ${editingVoucher.voucherNumber} بنجاح` : `Voucher updated`, "success");
    } catch (err: any) {
      console.error(err);
      alert(err?.message || (isAr ? "فشل تعديل السند" : "Failed to update voucher"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // Requirement 8: Print Voucher Action
  // -------------------------------------------------------------
  const handlePrintVoucher = (v: VoucherSummary) => {
    const acc = accounts.find(a => a.id === v.accountId);
    const cc = costCenters.find(c => c.id === v.costCenterId);

    setPrintData({
      voucherType: "check_receipt",
      voucherNumber: v.voucherNumber,
      date: v.date,
      amount: v.totalAmount,
      currency: organization.currency,
      partyName: v.partyName,
      accountName: isAr ? acc?.nameAr : acc?.nameEn,
      costCenterName: isAr ? cc?.nameAr : cc?.nameEn,
      notes: v.notes,
      checksList: v.checks.map(c => ({
        checkNumber: c.checkNumber,
        draweeBank: c.draweeBank || c.bankName,
        dueDate: c.dueDate,
        amount: c.amount,
        partyName: v.partyName
      }))
    });
    setIsPrintModalOpen(true);
  };

  // -------------------------------------------------------------
  // Requirement 8: Delete Voucher Action
  // -------------------------------------------------------------
  const handleDeleteVoucher = async (v: VoucherSummary) => {
    const confirmMsg = isAr
      ? `هل أنت متأكد من حذف سند استلام أ.ق رقم (${v.voucherNumber}) بالكامل؟\nسيتم حذف جميع الشيكات المرتبطة به (${v.checks.length} شيك) بمبلغ إجمالي (${formatCurrency(v.totalAmount, organization.currency, locale)}).`
      : `Are you sure you want to delete voucher (${v.voucherNumber}) and all its ${v.checks.length} checks?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      for (const chk of v.checks) {
        await deleteCheck(chk.id);
      }
      showToast(isAr ? `تم حذف السند رقم ${v.voucherNumber} بنجاح` : `Voucher deleted`, "success");
    } catch (err: any) {
      console.error("Failed to delete voucher:", err);
      alert(err?.message || (isAr ? "فشل حذف السند" : "Failed to delete voucher"));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header - Renamed to سند استلام أ.ق (Requirement 1 & Requirement 8) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <Link href="/checks" className="hover:text-emerald-400 transition-colors">
                {isAr ? "الشيكات والبنوك" : "Banks & Checks"}
              </Link>
              <span>/</span>
              <span className="text-emerald-400 font-bold">{isAr ? "سند استلام أ.ق" : "Receivable Notes Voucher"}</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {isAr ? "سند استلام أ.ق (سجل سندات أوراق القبض)" : "Receivable Notes Vouchers Register (أ.ق)"}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAr
                ? "سجل معتمد لسندات استلام أوراق القبض بكامل تفاصيل الشيكات، الإدخال، التعديل، والطباعة"
                : "Receivable Notes Vouchers registry with full check line details, view, edit, print and audit"}
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
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? "إضافة سند استلام أ.ق جديد" : "New Receivable Notes Voucher"}</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 block">{isAr ? "إجمالي قيمة السندات:" : "Total Vouchers Value:"}</span>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
            {formatCurrency(totalRegistryAmount, organization.currency, locale)}
          </div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 block">{isAr ? "إجمالي عدد السندات المسجلة:" : "Total Vouchers:"}</span>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {filteredVouchers.length} {isAr ? "سند استلام" : "vouchers"}
          </div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 block">{isAr ? "إجمالي عدد الشيكات:" : "Total Checks Lines:"}</span>
          <div className="text-xl font-bold font-mono text-sky-400 mt-1">
            {totalChequesCount} {isAr ? "شيك" : "checks"}
          </div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 block">{isAr ? "متوسط قيمة السند:" : "Avg Voucher Amount:"}</span>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">
            {formatCurrency(filteredVouchers.length ? totalRegistryAmount / filteredVouchers.length : 0, organization.currency, locale)}
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute right-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder={isAr ? "بحث برقم السند، رقم الشيك، العميل، أو البنك..." : "Search by voucher #, check #, customer..."}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Customer Filter */}
        <select
          value={selectedCustomerFilter}
          onChange={e => setSelectedCustomerFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
        >
          <option value="all">{isAr ? "جميع العملاء" : "All Customers"}</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>{isAr ? c.nameAr : c.nameEn}</option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatusFilter}
          onChange={e => setSelectedStatusFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
        >
          <option value="all">{isAr ? "جميع حالات الشيكات" : "All Statuses"}</option>
          <option value="in_treasury">{isAr ? "في الخزينة" : "In Treasury"}</option>
          <option value="under_collection">{isAr ? "برسم التحصيل" : "Under Collection"}</option>
          <option value="collected">{isAr ? "تم التحصيل" : "Collected"}</option>
          <option value="bounced">{isAr ? "مرتد / مرفوض" : "Bounced"}</option>
        </select>

        {/* Bank Filter */}
        <select
          value={selectedBankFilter}
          onChange={e => setSelectedBankFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
        >
          <option value="all">{isAr ? "جميع البنوك المسحوب عليها" : "All Drawee Banks"}</option>
          {availableBanks.map(b => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>

        {/* Date From */}
        <input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
        />

        {/* Date To */}
        <input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Requirement 8: COMPLETE VOUCHER REGISTRY TABLE                */}
      {/* Display: Voucher Number | Date | Customer Name | Total Amount */}
      {/* Actions: View | Edit | Print | Delete                         */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white">
              {isAr ? "سجل سندات استلام أوراق القبض (أ.ق)" : "Receivable Notes Voucher Registry"}
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {filteredVouchers.length} {isAr ? "سند" : "vouchers"}
            </span>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400">
            {formatCurrency(totalRegistryAmount, organization.currency, locale)}
          </span>
        </div>

        {isLoadingData ? (
          <div className="p-8 text-center text-slate-400">
            <TableSkeleton rows={5} />
          </div>
        ) : filteredVouchers.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <AlertCircle className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-semibold">{isAr ? "لا توجد سندات استلام أ.ق مسجلة مطابقة لمعايير البحث" : "No receivable vouchers found"}</p>
            <p className="text-xs text-slate-600 mt-1">{isAr ? "انقر على زر «إضافة سند استلام أ.ق جديد» لإدخال سند شيكات جديد" : "Click New Voucher to create one"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                  <th className="p-3.5 rounded-r-lg font-mono">1. {isAr ? "رقم السند" : "Voucher #"}</th>
                  <th className="p-3.5 font-mono">2. {isAr ? "التاريخ" : "Date"}</th>
                  <th className="p-3.5">3. {isAr ? "اسم العميل / الجهة" : "Customer / Party"}</th>
                  <th className="p-3.5 text-center font-mono">4. {isAr ? "عدد الشيكات" : "Checks Count"}</th>
                  <th className="p-3.5 text-center font-mono text-emerald-400">5. {isAr ? "إجمالي السند" : "Total Amount"}</th>
                  <th className="p-3.5 text-center">6. {isAr ? "حالة الشيكات" : "Checks Status"}</th>
                  <th className="p-3.5 rounded-l-lg text-center">7. {isAr ? "الإجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredVouchers.map(v => (
                  <tr key={v.voucherNumber} className="hover:bg-slate-800/30 transition-colors">
                    {/* 1. Voucher Number */}
                    <td className="p-3.5 font-bold text-white">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {v.voucherNumber}
                      </span>
                    </td>

                    {/* 2. Date */}
                    <td className="p-3.5 text-slate-300">
                      {formatDate(v.date, locale)}
                    </td>

                    {/* 3. Customer Name */}
                    <td className="p-3.5 font-sans font-bold text-slate-200">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span>{v.partyName}</span>
                      </div>
                      {v.notes && (
                        <div className="text-[10px] text-slate-500 font-normal mt-0.5 truncate max-w-xs">
                          {v.notes}
                        </div>
                      )}
                    </td>

                    {/* 4. Number of Cheques */}
                    <td className="p-3.5 text-center text-slate-300 font-bold">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700">
                        {v.checks.length} {isAr ? "شيك" : "checks"}
                      </span>
                    </td>

                    {/* 5. Total Amount */}
                    <td className="p-3.5 text-center text-emerald-400 font-black text-sm">
                      {formatCurrency(v.totalAmount, organization.currency, locale)}
                    </td>

                    {/* 6. Checks Status Summary */}
                    <td className="p-3.5 text-center">
                      <div className="flex flex-wrap items-center justify-center gap-1">
                        {v.statuses.map(st => (
                          <span key={st}>{getStatusBadge(st)}</span>
                        ))}
                      </div>
                    </td>

                    {/* 7. Actions (View | Edit | Print | Delete) - Requirement 8 */}
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* VIEW ACTION */}
                        <button
                          onClick={() => handleOpenViewVoucher(v)}
                          title={isAr ? "عرض السند بكامل التفاصيل" : "View Voucher"}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* EDIT ACTION */}
                        {canManage && (
                          <button
                            onClick={() => handleOpenEditVoucher(v)}
                            title={isAr ? "تعديل السند والشيكات" : "Edit Voucher"}
                            className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-all cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* PRINT ACTION */}
                        <button
                          onClick={() => handlePrintVoucher(v)}
                          title={isAr ? "طباعة السند" : "Print Voucher"}
                          className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-all cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {/* DELETE ACTION */}
                        {canManage && (
                          <button
                            onClick={() => handleDeleteVoucher(v)}
                            title={isAr ? "حذف السند" : "Delete Voucher"}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
      {/* Requirement 8: VIEW VOUCHER MODAL                             */}
      {/* Display the entire voucher exactly as originally entered.     */}
      {/* Display all cheque lines in full detail without truncation:   */}
      {/* - Cheque Number | Bank Name | Due Date | Amount | Status      */}
      {/* ------------------------------------------------------------- */}
      {viewingVoucher && (
        <Modal
          isOpen={isViewVoucherModalOpen}
          onClose={() => setIsViewVoucherModalOpen(false)}
          title={isAr ? `عرض سند استلام أ.ق رقم: ${viewingVoucher.voucherNumber}` : `Voucher Details: ${viewingVoucher.voucherNumber}`}
          size="xl"
        >
          <div className="space-y-6 text-xs">
            {/* Header Voucher Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div>
                <span className="text-[11px] text-slate-400 block">{isAr ? "رقم السند:" : "Voucher #:"}</span>
                <span className="text-sm font-mono font-bold text-emerald-400 mt-0.5 block">{viewingVoucher.voucherNumber}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">{isAr ? "تاريخ السند:" : "Voucher Date:"}</span>
                <span className="text-sm font-mono text-slate-200 mt-0.5 block">{formatDate(viewingVoucher.date, locale)}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">{isAr ? "العميل / المسدد:" : "Customer / Party:"}</span>
                <span className="text-sm font-bold text-white mt-0.5 block">{viewingVoucher.partyName}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">{isAr ? "إجمالي السند:" : "Total Amount:"}</span>
                <span className="text-base font-mono font-black text-emerald-400 mt-0.5 block">
                  {formatCurrency(viewingVoucher.totalAmount, organization.currency, locale)}
                </span>
              </div>
              {viewingVoucher.notes && (
                <div className="col-span-2 sm:col-span-4 pt-2 border-t border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block">{isAr ? "ملاحظات السند:" : "Voucher Notes:"}</span>
                  <p className="text-slate-300 mt-0.5 font-sans leading-relaxed">{viewingVoucher.notes}</p>
                </div>
              )}
            </div>

            {/* Complete Cheque Lines Table without truncation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>{isAr ? "بيانات أوراق القبض والشيكات التابعة للسند (بالتفصيل الكامل):" : "Full Cheque Lines Details:"}</span>
                </h3>
                <span className="text-[11px] font-mono text-slate-400">
                  {viewingVoucher.checks.length} {isAr ? "شيك" : "checks"}
                </span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
                      <th className="p-3 rounded-r-lg font-mono">#</th>
                      <th className="p-3 font-mono">1. {isAr ? "رقم الشيك" : "Cheque Number"}</th>
                      <th className="p-3">2. {isAr ? "البنك المسحوب عليه" : "Bank Name / Drawee"}</th>
                      <th className="p-3 font-mono text-center">3. {isAr ? "تاريخ الاستحقاق" : "Due Date"}</th>
                      <th className="p-3 font-mono text-center text-emerald-400">4. {isAr ? "المبلغ" : "Amount"}</th>
                      <th className="p-3 text-center rounded-l-lg">5. {isAr ? "الحالة" : "Status"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {viewingVoucher.checks.map((chk, idx) => (
                      <tr key={chk.id} className="hover:bg-slate-900/40">
                        <td className="p-3 text-slate-500">{idx + 1}</td>
                        <td className="p-3 font-bold text-white text-xs">
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-emerald-400 font-mono font-bold">
                            {chk.checkNumber}
                          </span>
                        </td>
                        <td className="p-3 font-sans font-medium text-slate-200">
                          {chk.draweeBank || chk.bankName}
                        </td>
                        <td className="p-3 text-center text-slate-300">
                          {formatDate(chk.dueDate, locale)}
                        </td>
                        <td className="p-3 text-center font-bold text-emerald-400 text-sm">
                          {formatCurrency(chk.amount, organization.currency, locale)}
                        </td>
                        <td className="p-3 text-center">
                          {getStatusBadge(chk.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-900/80 font-bold border-t border-slate-800 text-white font-mono">
                      <td colSpan={4} className="p-3 font-sans">{isAr ? "إجمالي السند:" : "Grand Total:"}</td>
                      <td className="p-3 text-center text-emerald-400 text-sm font-black">
                        {formatCurrency(viewingVoucher.totalAmount, organization.currency, locale)}
                      </td>
                      <td className="p-3 text-center">-</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <div className="flex gap-2">
                {canManage && (
                  <button
                    onClick={() => {
                      setIsViewVoucherModalOpen(false);
                      handleOpenEditVoucher(viewingVoucher);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold cursor-pointer transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{isAr ? "تعديل هذا السند" : "Edit This Voucher"}</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    handlePrintVoucher(viewingVoucher);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold cursor-pointer transition-all border border-slate-700"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isAr ? "طباعة السند" : "Print"}</span>
                </button>
              </div>

              <button
                onClick={() => setIsViewVoucherModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
              >
                {isAr ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Requirement 8: EDIT VOUCHER MODAL                             */}
      {/* Opens in editable mode for correcting:                         */}
      {/* - Cheque Number | Amount | Due Date | Bank | Any info          */}
      {/* ------------------------------------------------------------- */}
      {editingVoucher && (
        <Modal
          isOpen={isEditVoucherModalOpen}
          onClose={() => setIsEditVoucherModalOpen(false)}
          title={isAr ? `تعديل سند استلام أ.ق رقم: ${editingVoucher.voucherNumber}` : `Edit Voucher: ${editingVoucher.voucherNumber}`}
          size="xl"
        >
          <form onSubmit={handleSaveEditVoucher} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">{isAr ? "تاريخ السند:" : "Voucher Date:"}</label>
                <input
                  type="date"
                  required
                  value={editVoucherDate}
                  onChange={e => setEditVoucherDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">{isAr ? "العميل المسدد:" : "Customer:"}</label>
                <select
                  value={editCustomerId}
                  onChange={e => {
                    setEditCustomerId(e.target.value);
                    const c = customers.find(item => item.id === e.target.value);
                    if (c) setEditPartyName(c.nameAr);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-emerald-500"
                >
                  <option value="">{isAr ? "-- اختر العميل --" : "-- Select Customer --"}</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.nameAr}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">{isAr ? "اسم الجهة / المسدد:" : "Party Name:"}</label>
                <input
                  type="text"
                  required
                  value={editPartyName}
                  onChange={e => setEditPartyName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-slate-400 mb-1 font-semibold">{isAr ? "البيان / ملاحظات السند:" : "Voucher Notes:"}</label>
                <input
                  type="text"
                  value={editVoucherNotes}
                  onChange={e => setEditVoucherNotes(e.target.value)}
                  placeholder={isAr ? "بيان السند والغرض من الاستلام..." : "Notes..."}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Editable Cheque Rows */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                  <span>{isAr ? "بنود الشيكات (قابلة للتعديل والإضافة والحذف):" : "Editable Cheque Rows:"}</span>
                </h3>
                <button
                  type="button"
                  onClick={handleAddEditCheckRow}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAr ? "إضافة سطر شيك" : "Add Check Line"}</span>
                </button>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden p-2 space-y-2">
                {editCheckItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 bg-slate-900 p-2.5 rounded-xl border border-slate-800 items-center">
                    <div className="col-span-1 text-center font-mono text-slate-500 text-xs">
                      {idx + 1}
                    </div>

                    <div className="col-span-3">
                      <label className="block text-[10px] text-slate-400 mb-0.5">{isAr ? "رقم الشيك:" : "Check #:"}</label>
                      <input
                        type="text"
                        required
                        value={item.checkNumber}
                        onChange={e => {
                          const val = e.target.value;
                          setEditCheckItems(prev => prev.map((c, i) => i === idx ? { ...c, checkNumber: val } : c));
                        }}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold text-xs"
                      />
                    </div>

                    <div className="col-span-3">
                      <label className="block text-[10px] text-slate-400 mb-0.5">{isAr ? "البنك المسحوب عليه:" : "Bank:"}</label>
                      <input
                        type="text"
                        required
                        list={`banks-list-edit-${idx}`}
                        value={item.draweeBank}
                        onChange={e => {
                          const val = e.target.value;
                          setEditCheckItems(prev => prev.map((c, i) => i === idx ? { ...c, draweeBank: val } : c));
                        }}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-semibold"
                      />
                      <datalist id={`banks-list-edit-${idx}`}>
                        {availableBanks.map(b => <option key={b} value={b} />)}
                      </datalist>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[10px] text-slate-400 mb-0.5">{isAr ? "تاريخ الاستحقاق:" : "Due Date:"}</label>
                      <input
                        type="date"
                        required
                        value={item.dueDate}
                        onChange={e => {
                          const val = e.target.value;
                          setEditCheckItems(prev => prev.map((c, i) => i === idx ? { ...c, dueDate: val } : c));
                        }}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono text-xs"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[10px] text-slate-400 mb-0.5">{isAr ? "المبلغ:" : "Amount:"}</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={item.amount || ""}
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 0;
                          setEditCheckItems(prev => prev.map((c, i) => i === idx ? { ...c, amount: val } : c));
                        }}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-emerald-400 font-mono font-bold text-xs"
                      />
                    </div>

                    <div className="col-span-1 flex items-center justify-center pt-3">
                      <button
                        type="button"
                        onClick={() => handleRemoveEditCheckRow(idx)}
                        disabled={editCheckItems.length <= 1}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="font-bold text-slate-300">{isAr ? "إجمالي مبالغ الشيكات بعد التعديل:" : "Total Amount:"}</span>
              <span className="text-base font-black font-mono text-emerald-400">
                {formatCurrency(editCheckItems.reduce((s, c) => s + (Number(c.amount) || 0), 0), organization.currency, locale)}
              </span>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditVoucherModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isAr ? "جاري الحفظ..." : "Saving..."}</span>
                  </>
                ) : (
                  <span>{isAr ? "حفظ التعديلات على السند" : "Save Changes"}</span>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CREATE MULTI-CHECK RECEIPT VOUCHER MODAL                      */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={isAr ? "إنشاء سند استلام أ.ق (شيكات قبض متعددة)" : "New Receivable Notes Voucher (أ.ق)"}
        size="xl"
      >
        <form onSubmit={handleSubmitVoucher} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">{isAr ? "رقم السند *" : "Voucher # *"}</label>
              <input
                type="text"
                required
                value={voucherNumber}
                onChange={e => setVoucherNumber(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">{isAr ? "تاريخ السند *" : "Date *"}</label>
              <input
                type="date"
                required
                value={voucherDate}
                onChange={e => setVoucherDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">{isAr ? "اختيار العميل المسدد:" : "Customer:"}</label>
              <select
                value={customerId}
                onChange={e => {
                  setCustomerId(e.target.value);
                  const c = customers.find(item => item.id === e.target.value);
                  if (c) setPartyName(c.nameAr);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-emerald-500"
              >
                <option value="">{isAr ? "-- اختيار عميل --" : "-- Select Customer --"}</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.nameAr} ({formatCurrency(c.currentBalance, organization.currency, locale)})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">{isAr ? "اسم المستلم منه (الجهة):" : "Received From (Party):"}</label>
              <input
                type="text"
                value={partyName}
                onChange={e => setPartyName(e.target.value)}
                placeholder={isAr ? "اسم العميل أو الجهة..." : "Party Name..."}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-semibold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-400 mb-1 font-semibold">{isAr ? "البيان / ملاحظات السند:" : "Voucher Notes:"}</label>
              <input
                type="text"
                value={voucherNotes}
                onChange={e => setVoucherNotes(e.target.value)}
                placeholder={isAr ? "سداد فواتير، دفعة تحت الحساب..." : "Notes..."}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Cheque Rows */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-white text-xs flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                <span>{isAr ? "شيكات أوراق القبض التابعة لهذا السند:" : "Cheque Items for this Voucher:"}</span>
              </label>
              <button
                type="button"
                onClick={handleAddCheckRow}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAr ? "إضافة شيك آخر" : "Add Check"}</span>
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden p-2 space-y-2">
              {checkItems.map((chk, idx) => (
                <div key={chk.id} className="grid grid-cols-12 gap-2 bg-slate-900 p-2.5 rounded-xl border border-slate-800 items-center">
                  <div className="col-span-1 text-center font-mono text-slate-500 text-xs">
                    {idx + 1}
                  </div>
                  <div className="col-span-3">
                    <label className="block text-[10px] text-slate-400 mb-0.5">{isAr ? "رقم الشيك *" : "Check # *"}</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 849301"
                      value={chk.checkNumber}
                      onChange={e => handleUpdateCheckRow(chk.id, "checkNumber", e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold text-xs"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-[10px] text-slate-400 mb-0.5">{isAr ? "البنك المسحوب عليه *" : "Drawee Bank *"}</label>
                    <input
                      type="text"
                      required
                      list={`create-banks-list-${idx}`}
                      placeholder={isAr ? "اختر أو اكتب اسم البنك..." : "Select or type bank..."}
                      value={chk.draweeBank}
                      onChange={e => handleUpdateCheckRow(chk.id, "draweeBank", e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-semibold"
                    />
                    <datalist id={`create-banks-list-${idx}`}>
                      {availableBanks.map(b => <option key={b} value={b} />)}
                    </datalist>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] text-slate-400 mb-0.5">{isAr ? "تاريخ الاستحقاق *" : "Due Date *"}</label>
                    <input
                      type="date"
                      required
                      value={chk.dueDate}
                      onChange={e => handleUpdateCheckRow(chk.id, "dueDate", e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono text-xs"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] text-slate-400 mb-0.5">{isAr ? "المبلغ *" : "Amount *"}</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={chk.amount || ""}
                      onChange={e => handleUpdateCheckRow(chk.id, "amount", parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-emerald-400 font-mono font-bold text-xs"
                    />
                  </div>
                  <div className="col-span-1 flex items-center justify-center pt-3">
                    <button
                      type="button"
                      onClick={() => handleRemoveCheckRow(chk.id)}
                      disabled={checkItems.length <= 1}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <span className="font-bold text-slate-300">{isAr ? "إجمالي قيمة سند استلام أ.ق:" : "Total Voucher Amount:"}</span>
            <span className="text-lg font-black font-mono text-emerald-400">
              {formatCurrency(totalCreateVoucherAmount, organization.currency, locale)}
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isAr ? "جاري الحفظ..." : "Saving..."}</span>
                </>
              ) : (
                <span>{isAr ? "حفظ سند استلام أ.ق والترحيل" : "Save Voucher & Post JE"}</span>
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
