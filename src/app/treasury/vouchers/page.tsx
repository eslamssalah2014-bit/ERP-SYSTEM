"use client";

import React, { useState } from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import VoucherPrintModal, { VoucherPrintData } from "@/components/ui/VoucherPrintModal";
import TableSkeleton from "@/components/ui/TableSkeleton";
import {
  FileSpreadsheet, Search, Filter, Printer, Edit2, Trash2,
  ArrowDownLeft, ArrowUpRight, Wallet, Download, Eye, Layers
} from "lucide-react";
import Link from "next/link";
import { CashReceipt, CashPayment } from "@/types/erp";

export default function VouchersRegisterPage() {
  const {
    treasuryAccounts, cashReceipts, cashPayments, accounts, costCenters,
    deleteCashReceipt, deleteCashPayment, organization, locale, hasPermission, isLoadingData
  } = useERP();

  const isAr = locale === "ar";
  const canManage = hasPermission(["super_admin", "tenant_admin", "accountant"]);

  // Tabs: 'all' | 'receipt' | 'payment'
  const [activeTab, setActiveTab] = useState<"all" | "receipt" | "payment">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTreasury, setSelectedTreasury] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Print Modal
  const [printData, setPrintData] = useState<VoucherPrintData | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Combine vouchers
  type UnifiedVoucher = {
    id: string;
    type: "receipt" | "payment";
    voucherNumber: string;
    date: string;
    amount: number;
    currency: string;
    partyName: string;
    treasuryAccountId: string;
    accountId?: string;
    costCenterId?: string;
    notes?: string;
    raw: CashReceipt | CashPayment;
  };

  const receiptsList: UnifiedVoucher[] = cashReceipts.map(r => ({
    id: r.id,
    type: "receipt",
    voucherNumber: r.receiptNumber,
    date: r.date,
    amount: r.amount,
    currency: r.currency || organization.currency,
    partyName: r.receivedFrom,
    treasuryAccountId: r.treasuryAccountId,
    accountId: r.creditAccountId,
    costCenterId: r.costCenterId,
    notes: r.notes,
    raw: r
  }));

  const paymentsList: UnifiedVoucher[] = cashPayments.map(p => ({
    id: p.id,
    type: "payment",
    voucherNumber: p.paymentNumber,
    date: p.date,
    amount: p.amount,
    currency: p.currency || organization.currency,
    partyName: p.paidTo,
    treasuryAccountId: p.treasuryAccountId,
    accountId: p.debitAccountId,
    costCenterId: p.costCenterId,
    notes: p.notes,
    raw: p
  }));

  const allVouchers = [...receiptsList, ...paymentsList].sort((a, b) => b.date.localeCompare(a.date));

  const filteredVouchers = allVouchers.filter(v => {
    if (activeTab === "receipt" && v.type !== "receipt") return false;
    if (activeTab === "payment" && v.type !== "payment") return false;

    const matchesSearch =
      v.voucherNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.notes && v.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesTreasury = selectedTreasury === "all" || v.treasuryAccountId === selectedTreasury;
    const matchesStart = !startDate || v.date >= startDate;
    const matchesEnd = !endDate || v.date <= endDate;

    return matchesSearch && matchesTreasury && matchesStart && matchesEnd;
  });

  const totalReceipts = filteredVouchers.filter(v => v.type === "receipt").reduce((s, v) => s + (Number(v.amount) || 0), 0);
  const totalPayments = filteredVouchers.filter(v => v.type === "payment").reduce((s, v) => s + (Number(v.amount) || 0), 0);
  const netMovement = totalReceipts - totalPayments;

  const handlePrint = (v: UnifiedVoucher) => {
    const tr = treasuryAccounts.find(t => t.id === v.treasuryAccountId);
    const acc = accounts.find(a => a.id === v.accountId);
    const cc = costCenters.find(c => c.id === v.costCenterId);

    setPrintData({
      voucherType: v.type === "receipt" ? "cash_receipt" : "cash_payment",
      voucherNumber: v.voucherNumber,
      date: v.date,
      amount: v.amount,
      currency: v.currency,
      partyName: v.partyName,
      treasuryOrBankName: isAr ? tr?.nameAr : tr?.nameEn,
      accountName: isAr ? acc?.nameAr : acc?.nameEn,
      costCenterName: isAr ? cc?.nameAr : cc?.nameEn,
      notes: v.notes
    });
    setIsPrintModalOpen(true);
  };

  const handleDelete = async (v: UnifiedVoucher) => {
    if (!window.confirm(isAr ? `هل أنت متأكد من حذف السند (${v.voucherNumber})؟` : `Are you sure you want to delete voucher ${v.voucherNumber}?`)) return;
    try {
      if (v.type === "receipt") {
        await deleteCashReceipt(v.id);
      } else {
        await deleteCashPayment(v.id);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const exportToExcel = () => {
    const headers = [
      isAr ? "نوع السند" : "Type",
      isAr ? "رقم السند" : "Voucher #",
      isAr ? "التاريخ" : "Date",
      isAr ? "الجهة المستفيدة / المسلمة" : "Party",
      isAr ? "الخزينة" : "Treasury",
      isAr ? "الحساب المقابل" : "GL Account",
      isAr ? "مركز التكلفة" : "Cost Center",
      isAr ? "المبلغ" : "Amount",
      isAr ? "البيان" : "Notes"
    ];

    const rows = filteredVouchers.map(v => {
      const tr = treasuryAccounts.find(t => t.id === v.treasuryAccountId);
      const acc = accounts.find(a => a.id === v.accountId);
      const cc = costCenters.find(c => c.id === v.costCenterId);

      return [
        v.type === "receipt" ? (isAr ? "سند قبض" : "Receipt") : (isAr ? "سند صرف" : "Payment"),
        v.voucherNumber,
        v.date,
        v.partyName,
        isAr ? tr?.nameAr || "" : tr?.nameEn || "",
        isAr ? acc?.nameAr || "" : acc?.nameEn || "",
        isAr ? cc?.nameAr || "" : cc?.nameEn || "",
        v.amount,
        `"${(v.notes || "").replace(/"/g, '""')}"`
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `vouchers_register_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {isAr ? "سجل سندات القبض والصرف" : "Receipt & Payment Vouchers Register"}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAr ? "استعراض والبحث في جميع حركات المقبوضات والمدفوعات النقدية والطباعة والتصدير" : "Comprehensive registry of all cash receipt and payment vouchers with filtering and export"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>{isAr ? "تصدير إلى Excel" : "Export Excel"}</span>
          </button>
          <Link
            href="/treasury/receipts"
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium transition-colors"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>{isAr ? "سند قبض" : "Receipt"}</span>
          </Link>
          <Link
            href="/treasury/payments"
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-medium transition-colors"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{isAr ? "سند صرف" : "Payment"}</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 block">{isAr ? "إجمالي المقبوضات (وارد)" : "Total Receipts (In)"}</span>
          <div className="text-lg font-bold font-mono text-emerald-400 mt-1">
            {formatCurrency(totalReceipts, organization.currency, locale)}
          </div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 block">{isAr ? "إجمالي المدفوعات (صادر)" : "Total Payments (Out)"}</span>
          <div className="text-lg font-bold font-mono text-amber-400 mt-1">
            {formatCurrency(totalPayments, organization.currency, locale)}
          </div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 block">{isAr ? "صافي الحركة النقدية" : "Net Cash Movement"}</span>
          <div className={`text-lg font-bold font-mono mt-1 ${netMovement >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {formatCurrency(netMovement, organization.currency, locale)}
          </div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 block">{isAr ? "إجمالي عدد السندات" : "Total Vouchers"}</span>
          <div className="text-lg font-bold font-mono text-white mt-1">
            {filteredVouchers.length}
          </div>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-4">
        {/* Tabs */}
        <div className="flex border-b border-slate-800 pb-3 gap-2">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "all" ? "bg-slate-800 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            {isAr ? "جميع السندات" : "All Vouchers"} ({allVouchers.length})
          </button>
          <button
            onClick={() => setActiveTab("receipt")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "receipt" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "text-slate-400 hover:text-white"
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>{isAr ? "سندات القبض" : "Receipts"}</span> ({receiptsList.length})
          </button>
          <button
            onClick={() => setActiveTab("payment")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "payment" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "text-slate-400 hover:text-white"
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{isAr ? "سندات الصرف" : "Payments"}</span> ({paymentsList.length})
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute right-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder={isAr ? "بحث برقم السند، الطرف المستفيد، أو البيان..." : "Search by voucher #, party, notes..."}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={selectedTreasury}
            onChange={e => setSelectedTreasury(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
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
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          />
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          />

          {(searchTerm || selectedTreasury !== "all" || startDate || endDate) && (
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedTreasury("all");
                setStartDate("");
                setEndDate("");
              }}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded-lg"
            >
              {isAr ? "إعادة ضبط" : "Reset"}
            </button>
          )}
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden">
        {isLoadingData ? (
          <div className="p-6">
            <TableSkeleton rows={5} columns={8} />
          </div>
        ) : filteredVouchers.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm font-medium">
              {isAr ? "لا توجد سندات مطابقة لمعايير البحث" : "No vouchers found"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="p-3.5">{isAr ? "النوع" : "Type"}</th>
                  <th className="p-3.5">{isAr ? "رقم السند" : "Voucher #"}</th>
                  <th className="p-3.5">{isAr ? "التاريخ" : "Date"}</th>
                  <th className="p-3.5">{isAr ? "الجهة / المستفيد" : "Party"}</th>
                  <th className="p-3.5">{isAr ? "الخزينة" : "Treasury"}</th>
                  <th className="p-3.5">{isAr ? "الحساب المقابل" : "GL Account"}</th>
                  <th className="p-3.5">{isAr ? "مركز التكلفة" : "Cost Center"}</th>
                  <th className="p-3.5 text-left">{isAr ? "المبلغ" : "Amount"}</th>
                  <th className="p-3.5 text-center">{isAr ? "الإجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredVouchers.map(v => {
                  const tr = treasuryAccounts.find(t => t.id === v.treasuryAccountId);
                  const acc = accounts.find(a => a.id === v.accountId);
                  const cc = costCenters.find(c => c.id === v.costCenterId);

                  return (
                    <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5">
                        {v.type === "receipt" ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
                            <ArrowDownLeft className="w-3 h-3" />
                            {isAr ? "قبض" : "Receipt"}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 inline-flex items-center gap-1">
                            <ArrowUpRight className="w-3 h-3" />
                            {isAr ? "صرف" : "Payment"}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-white">
                        {v.voucherNumber}
                      </td>
                      <td className="p-3.5 text-slate-300">
                        {formatDate(v.date, locale)}
                      </td>
                      <td className="p-3.5 font-medium text-slate-200">
                        {v.partyName}
                      </td>
                      <td className="p-3.5 text-slate-300">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/50">
                          {isAr ? tr?.nameAr : tr?.nameEn || "---"}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-300">
                        {isAr ? acc?.nameAr : acc?.nameEn || "---"}
                      </td>
                      <td className="p-3.5">
                        {cc ? (
                          <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px]">
                            {isAr ? cc.nameAr : cc.nameEn}
                          </span>
                        ) : (
                          <span className="text-slate-600">---</span>
                        )}
                      </td>
                      <td className={`p-3.5 text-left font-mono font-bold text-sm ${v.type === "receipt" ? "text-emerald-400" : "text-amber-400"}`}>
                        {formatCurrency(v.amount, v.currency as any, locale)}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handlePrint(v)}
                            title={isAr ? "طباعة السند" : "Print Voucher"}
                            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {canManage && (
                            <button
                              onClick={() => handleDelete(v)}
                              title={isAr ? "حذف السند" : "Delete Voucher"}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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

      {/* Print Modal */}
      <VoucherPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        voucher={printData}
      />
    </div>
  );
}
