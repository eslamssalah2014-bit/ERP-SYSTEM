"use client";

import React, { useState, useMemo } from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import TableSkeleton from "@/components/ui/TableSkeleton";
import { Supplier } from "@/types/erp";
import {
  Truck, Plus, Search, MapPin, Eye, Edit, Trash2,
  AlertTriangle, Phone, Mail, Building2, CreditCard, Loader2, AlertCircle,
  FileSpreadsheet, FileText, ArrowRight, Landmark
} from "lucide-react";

export default function SuppliersPage() {
  const { suppliers, accounts, treasuryAccounts, addSupplier, updateSupplier, deleteSupplier, organization, locale, showToast, isLoadingData } = useERP();
  const isAr = locale === "ar";

  // Dynamic Bank Accounts derived 100% exclusively from Chart of Accounts (COA)
  const coaBankAccounts = useMemo(() => {
    return (accounts || []).filter(a =>
      (a.code.startsWith("1115") || a.code.startsWith("1112") || a.parentId === "00000000-0000-0000-0000-000000000115" ||
       (a.type === "assets" && (a.nameAr.includes("بنك") || a.nameEn?.toLowerCase().includes("bank")))) &&
      a.code !== "1000" && a.code !== "1100"
    );
  }, [accounts]);

  // Dynamic Bank Accounts derived 100% exclusively from Treasury Module
  const treasuryBankAccounts = useMemo(() => {
    return (treasuryAccounts || []).filter(t => t.type === "bank_account" || Boolean(t.bankName));
  }, [treasuryAccounts]);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [code, setCode] = useState("");
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankIban, setBankIban] = useState("");

  // View / Edit / Delete Modal State
  const [viewSupplier, setViewSupplier] = useState<Supplier | null>(null);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Edit Form State
  const [editNameAr, setEditNameAr] = useState("");
  const [editNameEn, setEditNameEn] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editOpeningBalance, setEditOpeningBalance] = useState<number>(0);
  const [editMobile, setEditMobile] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editTaxNumber, setEditTaxNumber] = useState("");
  const [editBankName, setEditBankName] = useState("");
  const [editBankIban, setEditBankIban] = useState("");

  const handleOpenAddModal = () => {
    setFormError(null);
    setCode("SUPP-" + (suppliers.length + 1).toString().padStart(4, "0"));
    setNameAr("");
    setNameEn("");
    setOpeningBalance(0);
    setMobile("");
    setEmail("");
    setAddress("");
    setTaxNumber("");
    setBankName("");
    setBankIban("");
    setIsAddModalOpen(true);
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedNameAr = nameAr.trim();
    if (!trimmedNameAr) {
      setFormError(isAr ? "يرجى كتابة اسم المورد بالعربي" : "Please enter supplier name");
      return;
    }

    // Client-side Duplicate Checks
    const dupName = suppliers.find(s => s.nameAr.trim().toLowerCase() === trimmedNameAr.toLowerCase());
    if (dupName) {
      const err = isAr ? `يوجد مورد مسجل مسبقاً بنفس الاسم (${trimmedNameAr})` : `Supplier name already exists`;
      setFormError(err);
      showToast(err, "error");
      return;
    }

    if (mobile.trim()) {
      const dupMobile = suppliers.find(s => s.mobile && s.mobile.trim() === mobile.trim());
      if (dupMobile) {
        const err = isAr ? `رقم الهاتف مسجل بالفعل لمورد آخر (${dupMobile.nameAr})` : `Phone number already registered`;
        setFormError(err);
        showToast(err, "error");
        return;
      }
    }

    if (taxNumber.trim()) {
      const dupTax = suppliers.find(s => s.taxNumber && s.taxNumber.trim() === taxNumber.trim());
      if (dupTax) {
        const err = isAr ? `الرقم الضريبي مسجل بالفعل لمورد آخر (${dupTax.nameAr})` : `Tax number already registered`;
        setFormError(err);
        showToast(err, "error");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await addSupplier({
        organizationId: organization.id,
        code: code || ("SUPP-" + (suppliers.length + 1).toString().padStart(4, "0")),
        nameAr: trimmedNameAr,
        nameEn: nameEn.trim() || trimmedNameAr,
        openingBalance: Number(openingBalance) || 0,
        mobile: mobile.trim(),
        email: email.trim(),
        address: address.trim(),
        taxNumber: taxNumber.trim(),
        bankName: bankName.trim(),
        bankIban: bankIban.trim(),
        currentBalance: Number(openingBalance) || 0,
        status: "active",
      });

      setIsAddModalOpen(false);
      showToast(isAr ? `تمت إضافة المورد (${trimmedNameAr}) بنجاح` : "Supplier added successfully", "success");
    } catch (err: any) {
      console.error("Failed to add supplier:", err);
      const errMsg = err?.message || (isAr ? "فشل حفظ المورد" : "Failed to add supplier");
      setFormError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (s: Supplier) => {
    setFormError(null);
    setEditSupplier(s);
    setEditNameAr(s.nameAr);
    setEditNameEn(s.nameEn);
    setEditCode(s.code);
    setEditOpeningBalance(s.openingBalance || 0);
    setEditMobile(s.mobile || "");
    setEditEmail(s.email || "");
    setEditAddress(s.address || "");
    setEditTaxNumber(s.taxNumber || "");
    setEditBankName(s.bankName || "");
    setEditBankIban(s.bankIban || "");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSupplier) return;
    setFormError(null);

    const trimmedNameAr = editNameAr.trim();
    if (!trimmedNameAr) {
      setFormError(isAr ? "يرجى كتابة اسم المورد بالعربي" : "Please enter supplier name");
      return;
    }

    const dupName = suppliers.find(s => s.id !== editSupplier.id && s.nameAr.trim().toLowerCase() === trimmedNameAr.toLowerCase());
    if (dupName) {
      const err = isAr ? `يوجد مورد آخر مسجل بنفس الاسم (${trimmedNameAr})` : `Supplier name already exists`;
      setFormError(err);
      showToast(err, "error");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateSupplier(editSupplier.id, {
        nameAr: trimmedNameAr,
        nameEn: editNameEn.trim() || trimmedNameAr,
        code: editCode,
        openingBalance: Number(editOpeningBalance) || 0,
        mobile: editMobile.trim(),
        email: editEmail.trim(),
        address: editAddress.trim(),
        taxNumber: editTaxNumber.trim(),
        bankName: editBankName.trim(),
        bankIban: editBankIban.trim(),
      });

      setEditSupplier(null);
      showToast(isAr ? "تم تحديث بيانات المورد بنجاح" : "Supplier updated", "success");
    } catch (err: any) {
      console.error("Failed to update supplier:", err);
      const errMsg = err?.message || (isAr ? "فشل تعديل بيانات المورد" : "Failed to update supplier");
      setFormError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    setIsSubmitting(true);
    try {
      await deleteSupplier(deleteTargetId);
      setDeleteTargetId(null);
      showToast(isAr ? "تم حذف المورد بنجاح" : "Supplier deleted", "success");
    } catch (err: any) {
      console.error("Failed to delete supplier:", err);
      showToast(err?.message || (isAr ? "فشل حذف المورد" : "Failed to delete supplier"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSuppliers = suppliers.filter(s => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        s.nameAr.toLowerCase().includes(q) ||
        s.nameEn.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.mobile && s.mobile.includes(q)) ||
        (s.taxNumber && s.taxNumber.includes(q))
      );
    }
    return true;
  });

  const totalPayables = suppliers.reduce((sum, s) => sum + (s.currentBalance || 0), 0);

  if (isLoadingData) {
    return <TableSkeleton rows={6} columns={7} summaryCards={3} isAr={isAr} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Truck className="w-6 h-6 text-sky-400" />
            <span>{isAr ? "دليل الموردين ومستحقات الدائنين" : "Suppliers & Accounts Payable Ledger"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? ("إجمالي المستحقات والديون للموردين: " + formatCurrency(totalPayables, organization.currency, locale))
              : ("Total Outstanding Payables: " + formatCurrency(totalPayables, organization.currency, locale))}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/suppliers/statement"
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4 text-sky-400" />
            <span>{isAr ? "كشف حساب مورد" : "Statement"}</span>
          </a>

          <a
            href="/suppliers/report"
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>{isAr ? "تقرير أرصدة الموردين" : "Balances Report"}</span>
          </a>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-sky-600 to-blue-500 hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-950/60 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? "إضافة مورد جديد" : "Add Supplier"}</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
          <input
            type="text"
            placeholder={isAr ? "بحث باسم المورد أو الكود أو الهاتف أو الضريبي..." : "Search supplier..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>
        <span className="text-xs text-slate-400 font-semibold">
          {isAr ? `إجمالي الموردين: ${filteredSuppliers.length}` : `Total Suppliers: ${filteredSuppliers.length}`}
        </span>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                <th className="p-3.5 rounded-r-lg">#</th>
                <th className="p-3.5">{isAr ? "كود المورد" : "Code"}</th>
                <th className="p-3.5">{isAr ? "اسم المورد" : "Supplier Name"}</th>
                <th className="p-3.5">{isAr ? "الهاتف والتواصل" : "Contact"}</th>
                <th className="p-3.5">{isAr ? "الرقم الضريبي" : "Tax No"}</th>
                <th className="p-3.5 text-center font-mono">{isAr ? "رصيد أول المدة" : "Opening Bal"}</th>
                <th className="p-3.5 text-center font-mono">{isAr ? "الرصيد المستحق (دائن)" : "Current Balance"}</th>
                <th className="p-3.5 rounded-l-lg text-center">{isAr ? "الإجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredSuppliers.map((s, idx) => (
                <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3.5 text-slate-500 font-mono">{idx + 1}</td>
                  <td className="p-3.5 font-bold text-slate-300 font-mono">{s.code}</td>
                  <td className="p-3.5">
                    <div className="font-bold text-white">{isAr ? s.nameAr : s.nameEn}</div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      <span>{s.address || "---"}</span>
                    </div>
                  </td>
                  <td className="p-3.5 text-slate-400 font-mono">
                    <div>{s.mobile || "---"}</div>
                    <div className="text-[10px] text-slate-500">{s.email || "---"}</div>
                  </td>
                  <td className="p-3.5 font-mono text-slate-300">{s.taxNumber || "---"}</td>
                  <td className="p-3.5 text-center font-mono text-slate-400">
                    {formatCurrency(s.openingBalance || 0, organization.currency, locale)}
                  </td>
                  <td className="p-3.5 text-center font-mono font-black text-rose-400">
                    {formatCurrency(s.currentBalance, organization.currency, locale)}
                  </td>
                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <a
                        href={`/suppliers/statement?id=${s.id}`}
                        title={isAr ? "كشف الحساب" : "Statement"}
                        className="p-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 transition-all cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => setViewSupplier(s)}
                        title={isAr ? "عرض التفاصيل" : "View"}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(s)}
                        title={isAr ? "تعديل البيانات" : "Edit"}
                        className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-all cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTargetId(s.id)}
                        title={isAr ? "حذف المورد" : "Delete"}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSuppliers.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    <Truck className="w-8 h-8 mx-auto mb-2 stroke-[1.5] text-slate-700" />
                    <p className="text-sm font-semibold text-slate-400">
                      {isAr ? "لا يوجد موردين مسجلين" : "No suppliers found"}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Supplier Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => !isSubmitting && setIsAddModalOpen(false)}
        title={isAr ? "إضافة مورد جديد" : "Add New Supplier"}
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateSupplier} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "اسم المورد (عربي) *" : "Supplier Name (AR) *"}</label>
              <input
                type="text"
                required
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "اسم المورد (إنجليزي)" : "Supplier Name (EN)"}</label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "كود المورد" : "Code"}</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "رصيد أول المدة (دائن)" : "Opening Balance"}</label>
              <input
                type="number"
                step="any"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "رقم الهاتف" : "Phone"}</label>
              <input
                type="text"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "الرقم الضريبي" : "Tax ID"}</label>
              <input
                type="text"
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "البريد الإلكتروني" : "Email"}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "العنوان" : "Address"}</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-400 font-semibold">{isAr ? "البنك المعتمد" : "Bank Name"}</label>
                <span className="text-[10px] text-sky-400 flex items-center gap-1 font-medium">
                  <Landmark className="w-3 h-3" />
                  {isAr ? "شجرة الحسابات والخزينة" : "CoA & Treasury"}
                </span>
              </div>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500 text-xs font-medium"
              >
                <option value="">{isAr ? "-- اختر الحساب البنكي --" : "-- Select Bank Account --"}</option>
                
                {/* 1. Dynamic Chart of Accounts Bank Accounts */}
                {coaBankAccounts.length > 0 && (
                  <optgroup label={isAr ? "🏛️ دليل الحسابات (Chart of Accounts)" : "🏛️ Chart of Accounts"}>
                    {coaBankAccounts.map(a => (
                      <option key={a.id} value={isAr ? a.nameAr : (a.nameEn || a.nameAr)}>
                        {isAr ? `${a.nameAr} (${a.code})` : `${a.nameEn || a.nameAr} (${a.code})`}
                      </option>
                    ))}
                  </optgroup>
                )}

                {/* 2. Dynamic Treasury Bank Accounts */}
                {treasuryBankAccounts.length > 0 && (
                  <optgroup label={isAr ? "🏦 حسابات البنوك بالخزينة (Treasury Accounts)" : "🏦 Treasury Bank Accounts"}>
                    {treasuryBankAccounts.map(t => (
                      <option key={t.id} value={t.bankName || t.nameAr}>
                        {isAr ? `${t.nameAr} (${t.bankName || t.code})` : `${t.nameEn || t.nameAr} (${t.bankName || t.code})`}
                      </option>
                    ))}
                  </optgroup>
                )}

                {/* 3. Empty notification if no bank accounts configured yet */}
                {coaBankAccounts.length === 0 && treasuryBankAccounts.length === 0 && (
                  <option value="" disabled>
                    {isAr ? "⚠️ لا توجد حسابات بنكية مسجلة (أضف حساب بنكي من شجرة الحسابات أو الخزينة)" : "⚠️ No bank accounts configured (Add via Chart of Accounts or Treasury)"}
                  </option>
                )}

                {/* 4. Current / Custom Supplier Bank */}
                {bankName && 
                 !treasuryBankAccounts.some(t => t.bankName === bankName || t.nameAr === bankName) && 
                 !coaBankAccounts.some(a => a.nameAr === bankName || a.nameEn === bankName) && (
                  <optgroup label={isAr ? "⭐ بنك المورد المسجل" : "⭐ Custom Supplier Bank"}>
                    <option value={bankName}>{bankName}</option>
                  </optgroup>
                )}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "رقم الآيبان (IBAN)" : "Bank IBAN"}</label>
              <input
                type="text"
                value={bankIban}
                onChange={(e) => setBankIban(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl disabled:opacity-50 cursor-pointer"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl disabled:opacity-50 cursor-pointer shadow-lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isAr ? "جاري الحفظ..." : "Saving..."}</span>
                </>
              ) : (
                <span>{isAr ? "حفظ المورد" : "Save Supplier"}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Supplier Modal */}
      {viewSupplier && (
        <Modal
          isOpen={true}
          onClose={() => setViewSupplier(null)}
          title={isAr ? `بيانات المورد: ${viewSupplier.nameAr}` : `Supplier Details: ${viewSupplier.nameEn}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-sm">{viewSupplier.nameAr}</div>
                  <div className="text-slate-400 text-[11px]">{viewSupplier.nameEn}</div>
                </div>
                <span className="font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20">
                  {viewSupplier.code}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/60">
                <div>
                  <span className="text-slate-500 block">{isAr ? "الهاتف" : "Phone"}</span>
                  <span className="text-white font-mono">{viewSupplier.mobile || "---"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{isAr ? "البريد" : "Email"}</span>
                  <span className="text-white">{viewSupplier.email || "---"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{isAr ? "العنوان" : "Address"}</span>
                  <span className="text-white">{viewSupplier.address || "---"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{isAr ? "الرقم الضريبي" : "Tax No"}</span>
                  <span className="text-white font-mono">{viewSupplier.taxNumber || "---"}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-slate-500 block text-[11px]">{isAr ? "رصيد أول المدة" : "Opening Balance"}</span>
                <span className="text-xs font-mono font-bold text-slate-300">
                  {formatCurrency(viewSupplier.openingBalance || 0, organization.currency, locale)}
                </span>
              </div>
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-slate-500 block text-[11px]">{isAr ? "الرصيد القائم المستحق للمورد" : "Current Payable"}</span>
                <span className="text-xs font-mono font-black text-rose-400">
                  {formatCurrency(viewSupplier.currentBalance, organization.currency, locale)}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-800">
              <a
                href={`/suppliers/statement?id=${viewSupplier.id}`}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{isAr ? "عرض كشف الحساب الكامل" : "View Statement"}</span>
              </a>

              <button
                onClick={() => setViewSupplier(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl cursor-pointer"
              >
                {isAr ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Supplier Modal */}
      {editSupplier && (
        <Modal
          isOpen={true}
          onClose={() => !isSubmitting && setEditSupplier(null)}
          title={isAr ? `تعديل بيانات المورد (${editSupplier.nameAr})` : `Edit Supplier (${editSupplier.nameEn})`}
          maxWidth="2xl"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
            {formError && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "اسم المورد (عربي) *" : "Supplier Name (AR) *"}</label>
                <input
                  type="text"
                  required
                  value={editNameAr}
                  onChange={(e) => setEditNameAr(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "اسم المورد (إنجليزي)" : "Supplier Name (EN)"}</label>
                <input
                  type="text"
                  value={editNameEn}
                  onChange={(e) => setEditNameEn(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "كود المورد" : "Code"}</label>
                <input
                  type="text"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "رصيد أول المدة (دائن)" : "Opening Balance"}</label>
                <input
                  type="number"
                  step="any"
                  value={editOpeningBalance}
                  onChange={(e) => setEditOpeningBalance(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "رقم الهاتف" : "Phone"}</label>
                <input
                  type="text"
                  value={editMobile}
                  onChange={(e) => setEditMobile(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "الرقم الضريبي" : "Tax ID"}</label>
                <input
                  type="text"
                  value={editTaxNumber}
                  onChange={(e) => setEditTaxNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "البريد الإلكتروني" : "Email"}</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "العنوان" : "Address"}</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-400 font-semibold">{isAr ? "البنك المعتمد" : "Bank Name"}</label>
                  <span className="text-[10px] text-sky-400 flex items-center gap-1 font-medium">
                    <Landmark className="w-3 h-3" />
                    {isAr ? "شجرة الحسابات والخزينة" : "CoA & Treasury"}
                  </span>
                </div>
                <select
                  value={editBankName}
                  onChange={(e) => setEditBankName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500 text-xs font-medium"
                >
                  <option value="">{isAr ? "-- اختر الحساب البنكي --" : "-- Select Bank Account --"}</option>
                  
                  {/* 1. Dynamic Chart of Accounts Bank Accounts */}
                  {coaBankAccounts.length > 0 && (
                    <optgroup label={isAr ? "🏛️ دليل الحسابات (Chart of Accounts)" : "🏛️ Chart of Accounts"}>
                      {coaBankAccounts.map(a => (
                        <option key={a.id} value={isAr ? a.nameAr : (a.nameEn || a.nameAr)}>
                          {isAr ? `${a.nameAr} (${a.code})` : `${a.nameEn || a.nameAr} (${a.code})`}
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {/* 2. Dynamic Treasury Bank Accounts */}
                  {treasuryBankAccounts.length > 0 && (
                    <optgroup label={isAr ? "🏦 حسابات البنوك بالخزينة (Treasury Accounts)" : "🏦 Treasury Bank Accounts"}>
                      {treasuryBankAccounts.map(t => (
                        <option key={t.id} value={t.bankName || t.nameAr}>
                          {isAr ? `${t.nameAr} (${t.bankName || t.code})` : `${t.nameEn || t.nameAr} (${t.bankName || t.code})`}
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {/* 3. Empty notification if no bank accounts configured yet */}
                  {coaBankAccounts.length === 0 && treasuryBankAccounts.length === 0 && (
                    <option value="" disabled>
                      {isAr ? "⚠️ لا توجد حسابات بنكية مسجلة (أضف حساب بنكي من شجرة الحسابات أو الخزينة)" : "⚠️ No bank accounts configured (Add via Chart of Accounts or Treasury)"}
                    </option>
                  )}

                  {/* 4. Current / Custom Supplier Bank */}
                  {editBankName && 
                   !treasuryBankAccounts.some(t => t.bankName === editBankName || t.nameAr === editBankName) && 
                   !coaBankAccounts.some(a => a.nameAr === editBankName || a.nameEn === editBankName) && (
                    <optgroup label={isAr ? "⭐ بنك المورد المسجل" : "⭐ Custom Supplier Bank"}>
                      <option value={editBankName}>{editBankName}</option>
                    </optgroup>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "رقم الآيبان (IBAN)" : "Bank IBAN"}</label>
                <input
                  type="text"
                  value={editBankIban}
                  onChange={(e) => setEditBankIban(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setEditSupplier(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl disabled:opacity-50 cursor-pointer"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl disabled:opacity-50 cursor-pointer shadow-lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isAr ? "جاري الحفظ..." : "Saving..."}</span>
                  </>
                ) : (
                  <span>{isAr ? "حفظ التعديلات" : "Save Changes"}</span>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <Modal
          isOpen={true}
          onClose={() => !isSubmitting && setDeleteTargetId(null)}
          title={isAr ? "تأكيد حذف المورد" : "Confirm Supplier Deletion"}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-rose-300 text-sm">{isAr ? "هل أنت متأكد من حذف هذا المورد؟" : "Are you sure you want to delete this supplier?"}</div>
                <div className="text-slate-400 text-[11px] mt-1">{isAr ? "سيتم حذف سجل المورد نهائياً من قاعدة البيانات." : "This will permanently remove the supplier record from the database."}</div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                disabled={isSubmitting}
                onClick={() => setDeleteTargetId(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl disabled:opacity-50 cursor-pointer"
              >
                {isAr ? "تراجع" : "Cancel"}
              </button>
              <button
                disabled={isSubmitting}
                onClick={handleConfirmDelete}
                className="flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl disabled:opacity-50 cursor-pointer shadow-lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isAr ? "جاري الحذف..." : "Deleting..."}</span>
                  </>
                ) : (
                  <span>{isAr ? "تأكيد الحذف النهائي" : "Confirm Delete"}</span>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
