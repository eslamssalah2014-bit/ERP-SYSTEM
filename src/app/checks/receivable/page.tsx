"use client";

import React, { useState } from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import VoucherPrintModal, { VoucherPrintData } from "@/components/ui/VoucherPrintModal";
import TableSkeleton from "@/components/ui/TableSkeleton";
import {
  CheckSquare, Plus, ArrowDownLeft, Search, Filter,
  Printer, Edit2, Trash2, CheckCircle2, Building2,
  Calendar, FileText, User, Layers, Trash, Loader2, Eye, DollarSign
} from "lucide-react";
import { CheckRecord, CheckStatus } from "@/types/erp";

interface CheckRowItem {
  id: string;
  checkNumber: string;
  draweeBank: string;
  dueDate: string;
  amount: number;
}

export default function ReceivableChecksPage() {
  const {
    checks, customers, accounts, costCenters, treasuryAccounts,
    addCheck, addCheckReceiptVoucher, updateCheck, deleteCheck, organization,
    activeBranchId, currentUser, locale, hasPermission, isLoadingData
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

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // View Check Modal State
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingCheck, setViewingCheck] = useState<CheckRecord | null>(null);

  // Edit Check Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCheck, setEditingCheck] = useState<CheckRecord | null>(null);
  const [editForm, setEditForm] = useState({
    checkNumber: "",
    partyName: "",
    customerId: "",
    draweeBank: "",
    collectionBank: "",
    issueDate: "",
    dueDate: "",
    amount: 0,
    status: "in_treasury" as CheckStatus,
    notes: ""
  });

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

  // Source bank names ONLY from Chart of Accounts & Treasury accounts (no hardcoding, no phantom data)
  const availableBanks = React.useMemo(() => {
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
    setIsModalOpen(true);
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

  const totalVoucherAmount = checkItems.reduce((s, c) => s + (Number(c.amount) || 0), 0);

  const handleSubmitVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId && !partyName.trim()) {
      setFormError(isAr ? "يرجى اختيار العميل المسدد أو تحديد اسم الجهة" : "Please select customer or enter party name");
      return;
    }

    if (totalVoucherAmount <= 0) {
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

      setIsModalOpen(false);

      // Trigger Print Modal
      setPrintData({
        voucherType: "check_receipt",
        voucherNumber: voucherNumber,
        date: voucherDate,
        amount: totalVoucherAmount,
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

  const handlePrintSingle = (chk: CheckRecord) => {
    const acc = accounts.find(a => a.id === chk.accountId);
    const cc = costCenters.find(c => c.id === chk.costCenterId);

    setPrintData({
      voucherType: "check_receipt",
      voucherNumber: chk.voucherNumber || chk.checkNumber,
      date: chk.issueDate,
      amount: chk.amount,
      currency: organization.currency,
      partyName: chk.partyName,
      checkNumber: chk.checkNumber,
      draweeBank: chk.draweeBank || chk.bankName,
      dueDate: chk.dueDate,
      accountName: isAr ? acc?.nameAr : acc?.nameEn,
      costCenterName: isAr ? cc?.nameAr : cc?.nameEn,
      notes: chk.notes
    });
    setIsPrintModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(isAr ? "هل أنت متأكد من حذف هذا الشيك؟" : "Are you sure you want to delete this check?")) return;
    try {
      await deleteCheck(id);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleOpenView = (chk: CheckRecord) => {
    setViewingCheck(chk);
    setIsViewModalOpen(true);
  };

  const handleOpenEdit = (chk: CheckRecord) => {
    setEditingCheck(chk);
    setEditForm({
      checkNumber: chk.checkNumber,
      partyName: chk.partyName,
      customerId: chk.customerId || "",
      draweeBank: chk.draweeBank || chk.bankName || "",
      collectionBank: chk.collectionBank || "",
      issueDate: chk.issueDate,
      dueDate: chk.dueDate,
      amount: chk.amount,
      status: chk.status,
      notes: chk.notes || ""
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCheck) return;
    setIsSubmitting(true);
    try {
      await updateCheck(editingCheck.id, {
        checkNumber: editForm.checkNumber,
        partyName: editForm.partyName,
        customerId: editForm.customerId || undefined,
        draweeBank: editForm.draweeBank,
        bankName: editForm.draweeBank,
        collectionBank: editForm.collectionBank,
        issueDate: editForm.issueDate,
        dueDate: editForm.dueDate,
        amount: Number(editForm.amount) || 0,
        status: editForm.status,
        notes: editForm.notes
      });
      setIsEditModalOpen(false);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || (isAr ? "فشل تعديل بيانات الشيك" : "Failed to update check"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter incoming checks
  const incomingChecks = checks.filter(c => c.type === "incoming");

  const filteredChecks = incomingChecks.filter(c => {
    const matchesSearch =
      c.checkNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.bankName && c.bankName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.draweeBank && c.draweeBank.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.collectionBank && c.collectionBank.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesBank = selectedBankFilter === "all" || (c.draweeBank || c.bankName) === selectedBankFilter;
    const matchesStatus = selectedStatusFilter === "all" || c.status === selectedStatusFilter;
    const matchesCustomer = selectedCustomerFilter === "all" || c.customerId === selectedCustomerFilter;
    const matchesDateFrom = !dateFrom || c.dueDate >= dateFrom;
    const matchesDateTo = !dateTo || c.dueDate <= dateTo;
    const matchesMinAmount = !minAmount || c.amount >= parseFloat(minAmount);
    const matchesMaxAmount = !maxAmount || c.amount <= parseFloat(maxAmount);

    return matchesSearch && matchesBank && matchesStatus && matchesCustomer && matchesDateFrom && matchesDateTo && matchesMinAmount && matchesMaxAmount;
  });

  const totalIncomingAmount = filteredChecks.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const inTreasuryCount = incomingChecks.filter(c => c.status === "in_treasury").length;
  const underCollectionCount = incomingChecks.filter(c => c.status === "under_collection").length;
  const collectedCount = incomingChecks.filter(c => c.status === "collected").length;
  const bouncedCount = incomingChecks.filter(c => c.status === "bounced" || c.status === "returned").length;

  const getStatusBadge = (status: CheckStatus) => {
    switch (status) {
      case "in_treasury":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">{isAr ? "في الخزينة" : "In Treasury"}</span>;
      case "under_collection":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">{isAr ? "برسم التحصيل" : "Under Collection"}</span>;
      case "collected":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{isAr ? "تم التحصيل" : "Collected"}</span>;
      case "bounced":
      case "returned":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">{isAr ? "مرتد / مرفوض" : "Bounced"}</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {isAr ? "شيكات القبض (استلام أوراق القبض)" : "Receivable Checks (Notes Receivable)"}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAr ? "تسجيل سندات استلام الشيكات المتعددة، التوجيه المحاسبي التلقائي، ومتابعة المحفظة" : "Record multi-check receipt vouchers with automatic journal entries and portfolio tracking"}
            </p>
          </div>
        </div>

        {canManage && (
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-emerald-900/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? "سند استلام شيكات جديد" : "New Check Receipt Voucher"}</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 block">{isAr ? "إجمالي قيمة الشيكات" : "Total Checks Value"}</span>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
            {formatCurrency(totalIncomingAmount, organization.currency, locale)}
          </div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 block">{isAr ? "في الخزينة (أوراق قبض)" : "In Treasury"}</span>
          <div className="text-xl font-bold font-mono text-blue-400 mt-1">
            {inTreasuryCount} {isAr ? "شيك" : "checks"}
          </div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 block">{isAr ? "برسم التحصيل بالبنك" : "Under Collection"}</span>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">
            {underCollectionCount} {isAr ? "شيك" : "checks"}
          </div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 block">{isAr ? "تم تحصيلها وإيداعها" : "Collected & Deposited"}</span>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
            {collectedCount} {isAr ? "شيك" : "checks"}
          </div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 block">{isAr ? "مرتدة / مرفوضة" : "Bounced"}</span>
          <div className="text-xl font-bold font-mono text-rose-400 mt-1">
            {bouncedCount} {isAr ? "شيك" : "checks"}
          </div>
        </div>
      </div>

      {/* Filters Bar - Date, Customer, Status, Amount, Bank */}
      <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute right-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder={isAr ? "بحث برقم الشيك، العميل، أو البنك..." : "Search by check #, customer, bank..."}
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
          <option value="all">{isAr ? "جميع الحالات" : "All Statuses"}</option>
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
          <option value="all">{isAr ? "جميع البنوك" : "All Banks"}</option>
          {availableBanks.map((b, i) => (
            <option key={i} value={b}>{b}</option>
          ))}
        </select>

        {/* Date Range Filters */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span>{isAr ? "من:" : "From:"}</span>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          />
          <span>{isAr ? "إلى:" : "To:"}</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Amount Range Filters */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <input
            type="number"
            placeholder={isAr ? "مبلغ من..." : "Min amt..."}
            value={minAmount}
            onChange={e => setMinAmount(e.target.value)}
            className="w-20 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          />
          <span>-</span>
          <input
            type="number"
            placeholder={isAr ? "إلى..." : "Max amt..."}
            value={maxAmount}
            onChange={e => setMaxAmount(e.target.value)}
            className="w-20 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {(searchTerm || selectedStatusFilter !== "all" || selectedBankFilter !== "all" || selectedCustomerFilter !== "all" || dateFrom || dateTo || minAmount || maxAmount) && (
          <button
            onClick={() => {
              setSearchTerm("");
              setSelectedStatusFilter("all");
              setSelectedBankFilter("all");
              setSelectedCustomerFilter("all");
              setDateFrom("");
              setDateTo("");
              setMinAmount("");
              setMaxAmount("");
            }}
            className="text-xs text-slate-400 hover:text-white px-2.5 py-1.5 bg-slate-800 rounded-lg"
          >
            {isAr ? "إعادة ضبط" : "Reset"}
          </button>
        )}
      </div>

      {/* Checks Table */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden">
        {isLoadingData ? (
          <div className="p-6">
            <TableSkeleton rows={5} columns={9} />
          </div>
        ) : filteredChecks.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <CheckSquare className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm font-medium">
              {isAr ? "لا توجد شيكات قبض مسجلة مطابقة للبحث" : "No receivable checks found"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="p-3.5">{isAr ? "رقم الشيك" : "Check #"}</th>
                  <th className="p-3.5">{isAr ? "العميل / الساحب" : "Customer / Drawer"}</th>
                  <th className="p-3.5">{isAr ? "البنك المسحوب عليه" : "Drawee Bank"}</th>
                  <th className="p-3.5">{isAr ? "تاريخ التحرير" : "Issue Date"}</th>
                  <th className="p-3.5">{isAr ? "تاريخ الاستحقاق" : "Due Date"}</th>
                  <th className="p-3.5">{isAr ? "الحالة" : "Status"}</th>
                  <th className="p-3.5">{isAr ? "بنك التحصيل" : "Collection Bank"}</th>
                  <th className="p-3.5 text-left">{isAr ? "المبلغ" : "Amount"}</th>
                  <th className="p-3.5 text-center">{isAr ? "الإجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredChecks.map(chk => (
                  <tr key={chk.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-amber-300">
                      {chk.checkNumber}
                    </td>
                    <td className="p-3.5 font-medium text-slate-200">
                      {chk.partyName}
                    </td>
                    <td className="p-3.5 text-slate-300">
                      {chk.draweeBank || chk.bankName}
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
                    <td className="p-3.5 text-slate-300 font-medium">
                      {chk.collectionBank || (chk.targetTreasuryId ? treasuryAccounts.find(t => t.id === chk.targetTreasuryId)?.nameAr : "") || "---"}
                    </td>
                    <td className="p-3.5 text-left font-mono font-bold text-emerald-400 text-sm">
                      {formatCurrency(chk.amount, organization.currency, locale)}
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenView(chk)}
                          title={isAr ? "عرض تفاصيل الشيك" : "View Check"}
                          className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canManage && (
                          <button
                            onClick={() => handleOpenEdit(chk)}
                            title={isAr ? "تعديل الشيك" : "Edit Check"}
                            className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handlePrintSingle(chk)}
                          title={isAr ? "طباعة السند" : "Print Voucher"}
                          className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {canManage && (
                          <button
                            onClick={() => handleDelete(chk.id)}
                            title={isAr ? "حذف الشيك" : "Delete Check"}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Multi-Check Receipt Voucher Creation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isAr ? "سند استلام شيكات قبض متعددة" : "Multi-Check Receipt Voucher"}
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmitVoucher} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg">
              {formError}
            </div>
          )}

          {/* Header Controls */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div>
              <label className="block text-slate-400 mb-1">{isAr ? "رقم السند:" : "Voucher #:"}</label>
              <input
                type="text"
                value={voucherNumber}
                onChange={e => setVoucherNumber(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">{isAr ? "تاريخ السند:" : "Date:"}</label>
              <input
                type="date"
                value={voucherDate}
                onChange={e => setVoucherDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">{isAr ? "العميل المسدد:" : "Customer:"}</label>
              <select
                value={customerId}
                onChange={e => {
                  const id = e.target.value;
                  const c = customers.find(item => item.id === id);
                  setCustomerId(id);
                  if (c) setPartyName(isAr ? c.nameAr : c.nameEn);
                }}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">{isAr ? "-- اختيار عميل --" : "-- Select Customer --"}</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {isAr ? c.nameAr : c.nameEn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">{isAr ? "اسم الساحب / الجهة:" : "Drawer Name:"}</label>
              <input
                type="text"
                value={partyName}
                onChange={e => setPartyName(e.target.value)}
                placeholder={isAr ? "اسم العميل أو الساحب..." : "Drawer name..."}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">{isAr ? "حساب أوراق القبض:" : "Notes Rec Account:"}</label>
              <select
                value={accountId}
                onChange={e => setAccountId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-emerald-500"
              >
                {accounts.filter(a => a.type === "assets").map(a => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {isAr ? a.nameAr : a.nameEn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">{isAr ? "مركز التكلفة / المشروع:" : "Cost Center:"}</label>
              <select
                value={costCenterId}
                onChange={e => setCostCenterId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">{isAr ? "-- بدون مركز تكلفة --" : "-- None --"}</option>
                {costCenters.map(cc => (
                  <option key={cc.id} value={cc.id}>
                    {cc.code} - {isAr ? cc.nameAr : cc.nameEn}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Checks Multi-Row Table */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-300">{isAr ? "بيانات الشيكات المدرجة بالسند:" : "Check Entries:"}</span>
              <button
                type="button"
                onClick={handleAddCheckRow}
                className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAr ? "إضافة شيك آخر" : "Add Another Check"}</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">{isAr ? "رقم الشيك" : "Check #"}</th>
                    <th className="p-2.5">{isAr ? "البنك المسحوب عليه" : "Drawee Bank"}</th>
                    <th className="p-2.5">{isAr ? "تاريخ الاستحقاق" : "Due Date"}</th>
                    <th className="p-2.5">{isAr ? "المبلغ" : "Amount"}</th>
                    <th className="p-2.5 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {checkItems.map((chk, idx) => (
                    <tr key={chk.id} className="bg-slate-900/40">
                      <td className="p-2">
                        <input
                          type="text"
                          value={chk.checkNumber}
                          placeholder={isAr ? "أدخل رقم الشيك يدوياً..." : "Enter check # manually..."}
                          onChange={e => handleUpdateCheckRow(chk.id, "checkNumber", e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                          required
                        />
                      </td>
                      <td className="p-2">
                        <input
                          list="receivable-banks-list"
                          type="text"
                          value={chk.draweeBank}
                          placeholder={isAr ? "اختر أو ابحث عن البنك..." : "Select / search bank..."}
                          onChange={e => handleUpdateCheckRow(chk.id, "draweeBank", e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                          required
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="date"
                          value={chk.dueDate}
                          onChange={e => handleUpdateCheckRow(chk.id, "dueDate", e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white focus:outline-none focus:border-emerald-500"
                          required
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={chk.amount || ""}
                          onChange={e => handleUpdateCheckRow(chk.id, "amount", parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-mono font-bold text-emerald-400"
                          placeholder="0.00"
                          required
                        />
                      </td>
                      <td className="p-2 text-center">
                        {checkItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCheckRow(chk.id)}
                            className="text-slate-500 hover:text-rose-400 p-1"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Dynamic banks datalist sourced strictly from COA and Treasury accounts */}
            <datalist id="receivable-banks-list">
              {availableBanks.map((b, idx) => (
                <option key={idx} value={b} />
              ))}
            </datalist>
          </div>

          {/* Total Box */}
          <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 font-semibold">{isAr ? "إجمالي قيمة سند القبض:" : "Total Voucher Amount:"}</span>
            <span className="text-lg font-bold font-mono text-emerald-400">
              {formatCurrency(totalVoucherAmount, organization.currency, locale)}
            </span>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">{isAr ? "ملاحظات وبيان السند:" : "Notes:"}</label>
            <textarea
              value={voucherNotes}
              onChange={e => setVoucherNotes(e.target.value)}
              rows={2}
              placeholder={isAr ? "بيان السند..." : "Voucher notes..."}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
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
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{isAr ? "حفظ وترحيل السند" : "Save & Post Voucher"}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* View Check Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={isAr ? `تفاصيل ورقة القبض (${viewingCheck?.checkNumber || ""})` : "Check Details"}
        maxWidth="md"
      >
        {viewingCheck && (
          <div className="space-y-4 text-xs">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-slate-400 block">{isAr ? "رقم الشيك:" : "Check #:"}</span>
                <span className="font-mono font-bold text-base text-amber-300">{viewingCheck.checkNumber}</span>
              </div>
              <div className="text-left">
                <span className="text-slate-400 block">{isAr ? "المبلغ:" : "Amount:"}</span>
                <span className="font-mono font-bold text-base text-emerald-400">
                  {formatCurrency(viewingCheck.amount, organization.currency, locale)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-900/50 p-3 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-500 block">{isAr ? "الساحب / العميل:" : "Drawer / Customer:"}</span>
                <span className="font-semibold text-slate-200">{viewingCheck.partyName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">{isAr ? "الحالة:" : "Status:"}</span>
                <div className="mt-0.5">{getStatusBadge(viewingCheck.status)}</div>
              </div>
              <div>
                <span className="text-slate-500 block">{isAr ? "البنك المسحوب عليه:" : "Drawee Bank:"}</span>
                <span className="text-slate-300">{viewingCheck.draweeBank || viewingCheck.bankName || "---"}</span>
              </div>
              <div>
                <span className="text-slate-500 block">{isAr ? "بنك التحصيل / المقاصة:" : "Collection Bank:"}</span>
                <span className="text-emerald-400 font-medium">
                  {viewingCheck.collectionBank || (viewingCheck.targetTreasuryId ? treasuryAccounts.find(t => t.id === viewingCheck.targetTreasuryId)?.nameAr : "") || (isAr ? "لم يحدد بعد" : "Not specified")}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">{isAr ? "تاريخ التحرير:" : "Issue Date:"}</span>
                <span className="font-mono text-slate-300">{formatDate(viewingCheck.issueDate, locale)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">{isAr ? "تاريخ الاستحقاق:" : "Due Date:"}</span>
                <span className="font-mono font-bold text-amber-300">{formatDate(viewingCheck.dueDate, locale)}</span>
              </div>
              {viewingCheck.collectionDate && (
                <div>
                  <span className="text-slate-500 block">{isAr ? "تاريخ التحصيل:" : "Collection Date:"}</span>
                  <span className="font-mono text-emerald-400">{formatDate(viewingCheck.collectionDate, locale)}</span>
                </div>
              )}
              <div>
                <span className="text-slate-500 block">{isAr ? "رقم السند المرجعي:" : "Voucher Ref:"}</span>
                <span className="font-mono text-slate-300">{viewingCheck.voucherNumber || "---"}</span>
              </div>
            </div>

            {viewingCheck.notes && (
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-1">{isAr ? "ملاحظات:" : "Notes:"}</span>
                <p className="text-slate-300 text-xs">{viewingCheck.notes}</p>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsViewModalOpen(false);
                  handlePrintSingle(viewingCheck);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors border border-emerald-500/30"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{isAr ? "طباعة إشعار الشيك" : "Print Check Voucher"}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
              >
                {isAr ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Check Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={isAr ? `تعديل ورقة القبض (${editingCheck?.checkNumber || ""})` : "Edit Check"}
        maxWidth="md"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">{isAr ? "رقم الشيك:" : "Check #:"}</label>
              <input
                type="text"
                value={editForm.checkNumber}
                onChange={e => setEditForm({ ...editForm, checkNumber: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">{isAr ? "المبلغ:" : "Amount:"}</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={editForm.amount}
                onChange={e => setEditForm({ ...editForm, amount: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">{isAr ? "الساحب / العميل:" : "Drawer / Customer:"}</label>
              <input
                type="text"
                value={editForm.partyName}
                onChange={e => setEditForm({ ...editForm, partyName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">{isAr ? "ربط بعميل (اختياري):" : "Linked Customer:"}</label>
              <select
                value={editForm.customerId}
                onChange={e => {
                  const custId = e.target.value;
                  const c = customers.find(item => item.id === custId);
                  setEditForm({
                    ...editForm,
                    customerId: custId,
                    partyName: c ? (isAr ? c.nameAr : c.nameEn) : editForm.partyName
                  });
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">{isAr ? "-- بدون ربط بعميل --" : "-- None --"}</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{isAr ? c.nameAr : c.nameEn}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">{isAr ? "البنك المسحوب عليه:" : "Drawee Bank:"}</label>
              <input
                type="text"
                list="receivable-banks-list"
                value={editForm.draweeBank}
                onChange={e => setEditForm({ ...editForm, draweeBank: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">{isAr ? "بنك التحصيل / المقاصة:" : "Collection Bank:"}</label>
              <input
                type="text"
                list="receivable-banks-list"
                value={editForm.collectionBank}
                onChange={e => setEditForm({ ...editForm, collectionBank: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">{isAr ? "تاريخ التحرير:" : "Issue Date:"}</label>
              <input
                type="date"
                value={editForm.issueDate}
                onChange={e => setEditForm({ ...editForm, issueDate: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">{isAr ? "تاريخ الاستحقاق:" : "Due Date:"}</label>
              <input
                type="date"
                value={editForm.dueDate}
                onChange={e => setEditForm({ ...editForm, dueDate: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">{isAr ? "الحالة:" : "Status:"}</label>
              <select
                value={editForm.status}
                onChange={e => setEditForm({ ...editForm, status: e.target.value as CheckStatus })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="in_treasury">{isAr ? "في الخزينة" : "In Treasury"}</option>
                <option value="under_collection">{isAr ? "برسم التحصيل" : "Under Collection"}</option>
                <option value="collected">{isAr ? "تم التحصيل" : "Collected"}</option>
                <option value="bounced">{isAr ? "مرتد / مرفوض" : "Bounced"}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">{isAr ? "ملاحظات:" : "Notes:"}</label>
            <textarea
              value={editForm.notes}
              onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{isAr ? "تحديث بيانات الشيك" : "Update Check"}</span>
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
