"use client";

import React, { useState } from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency } from "@/lib/utils";
import { computeAging } from "@/lib/accounting-engine";
import Modal from "@/components/ui/Modal";
import TableSkeleton from "@/components/ui/TableSkeleton";
import { Customer } from "@/types/erp";
import {
  Users, Plus, Search, MapPin, Eye, Edit, Trash2,
  AlertTriangle, Phone, Mail, Building2, CreditCard, Loader2, AlertCircle,
  FileSpreadsheet, FileText, Tag, Filter, ArrowRight
} from "lucide-react";

export default function CustomersPage() {
  const {
    customers, customerCategories, salesInvoices,
    addCustomer, updateCustomer, deleteCustomer,
    organization, locale, showToast, isLoadingData
  } = useERP();

  const isAr = locale === "ar";
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"directory" | "aging">("directory");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [code, setCode] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("الرياض");
  const [taxNumber, setTaxNumber] = useState("");
  const [creditLimit, setCreditLimit] = useState<number>(50000);
  const [paymentTermsDays, setPaymentTermsDays] = useState<number>(30);

  // View / Edit / Delete Modal State
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Edit Form State
  const [editNameAr, setEditNameAr] = useState("");
  const [editNameEn, setEditNameEn] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editOpeningBalance, setEditOpeningBalance] = useState<number>(0);
  const [editMobile, setEditMobile] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editTaxNumber, setEditTaxNumber] = useState("");
  const [editCreditLimit, setEditCreditLimit] = useState<number>(0);
  const [editPaymentTermsDays, setEditPaymentTermsDays] = useState<number>(30);

  const handleOpenAddModal = () => {
    setFormError(null);
    setCode("CUST-" + (customers.length + 1).toString().padStart(4, "0"));
    setNameAr("");
    setNameEn("");
    setCategoryId(customerCategories[0]?.id || "");
    setOpeningBalance(0);
    setMobile("");
    setEmail("");
    setAddress("");
    setCity("الرياض");
    setTaxNumber("");
    setCreditLimit(50000);
    setPaymentTermsDays(30);
    setIsAddModalOpen(true);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedNameAr = nameAr.trim();
    if (!trimmedNameAr) {
      setFormError(isAr ? "يرجى كتابة اسم العميل بالعربي" : "Please enter customer name");
      return;
    }

    // Client-side Duplicate Check
    const dupName = customers.find(c => c.nameAr.trim().toLowerCase() === trimmedNameAr.toLowerCase());
    if (dupName) {
      const err = isAr ? `يوجد عميل مسجل مسبقاً بنفس الاسم (${trimmedNameAr})` : `Customer name already exists`;
      setFormError(err);
      showToast(err, "error");
      return;
    }

    if (mobile.trim()) {
      const dupMobile = customers.find(c => c.mobile && c.mobile.trim() === mobile.trim());
      if (dupMobile) {
        const err = isAr ? `رقم الهاتف (${mobile.trim()}) مسجل بالفعل لعميل آخر (${dupMobile.nameAr})` : `Phone number already registered`;
        setFormError(err);
        showToast(err, "error");
        return;
      }
    }

    if (taxNumber.trim()) {
      const dupTax = customers.find(c => c.taxNumber && c.taxNumber.trim() === taxNumber.trim());
      if (dupTax) {
        const err = isAr ? `الرقم الضريبي (${taxNumber.trim()}) مسجل بالفعل لعميل آخر (${dupTax.nameAr})` : `Tax number already registered`;
        setFormError(err);
        showToast(err, "error");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const selectedCat = customerCategories.find(c => c.id === categoryId);

      await addCustomer({
        organizationId: organization.id,
        code: code || ("CUST-" + (customers.length + 1).toString().padStart(4, "0")),
        nameAr: trimmedNameAr,
        nameEn: nameEn.trim() || trimmedNameAr,
        categoryId: categoryId || undefined,
        categoryName: selectedCat?.nameAr || undefined,
        openingBalance: Number(openingBalance) || 0,
        mobile: mobile.trim(),
        email: email.trim(),
        address: address.trim(),
        city: city.trim(),
        taxNumber: taxNumber.trim(),
        creditLimit: Number(creditLimit) || 0,
        paymentTermsDays: Number(paymentTermsDays) || 30,
        currentBalance: Number(openingBalance) || 0,
        status: "active",
      });

      setIsAddModalOpen(false);
      showToast(isAr ? `تمت إضافة العميل (${trimmedNameAr}) بنجاح` : "Customer added successfully", "success");
    } catch (err: any) {
      console.error("Failed to add customer:", err);
      const errMsg = err?.message || (isAr ? "فشل حفظ العميل" : "Failed to add customer");
      setFormError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (c: Customer) => {
    setFormError(null);
    setEditCustomer(c);
    setEditNameAr(c.nameAr);
    setEditNameEn(c.nameEn);
    setEditCode(c.code);
    setEditCategoryId(c.categoryId || customerCategories[0]?.id || "");
    setEditOpeningBalance(c.openingBalance || 0);
    setEditMobile(c.mobile || "");
    setEditEmail(c.email || "");
    setEditAddress(c.address || "");
    setEditCity(c.city || "");
    setEditTaxNumber(c.taxNumber || "");
    setEditCreditLimit(c.creditLimit);
    setEditPaymentTermsDays(c.paymentTermsDays);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCustomer) return;
    setFormError(null);

    const trimmedNameAr = editNameAr.trim();
    if (!trimmedNameAr) {
      setFormError(isAr ? "يرجى كتابة اسم العميل بالعربي" : "Please enter customer name");
      return;
    }

    // Check duplicate name excluding self
    const dupName = customers.find(c => c.id !== editCustomer.id && c.nameAr.trim().toLowerCase() === trimmedNameAr.toLowerCase());
    if (dupName) {
      const err = isAr ? `يوجد عميل آخر مسجل بنفس الاسم (${trimmedNameAr})` : `Customer name already exists`;
      setFormError(err);
      showToast(err, "error");
      return;
    }

    if (editMobile.trim()) {
      const dupMobile = customers.find(c => c.id !== editCustomer.id && c.mobile && c.mobile.trim() === editMobile.trim());
      if (dupMobile) {
        const err = isAr ? `رقم الهاتف مسجل بالفعل لعميل آخر` : `Phone number already registered`;
        setFormError(err);
        showToast(err, "error");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const selectedCat = customerCategories.find(c => c.id === editCategoryId);

      await updateCustomer(editCustomer.id, {
        nameAr: trimmedNameAr,
        nameEn: editNameEn.trim() || trimmedNameAr,
        code: editCode,
        categoryId: editCategoryId || undefined,
        categoryName: selectedCat?.nameAr || undefined,
        openingBalance: Number(editOpeningBalance) || 0,
        mobile: editMobile.trim(),
        email: editEmail.trim(),
        address: editAddress.trim(),
        city: editCity.trim(),
        taxNumber: editTaxNumber.trim(),
        creditLimit: Number(editCreditLimit) || 0,
        paymentTermsDays: Number(editPaymentTermsDays) || 30,
      });

      setEditCustomer(null);
      showToast(isAr ? "تم تحديث بيانات العميل بنجاح" : "Customer updated", "success");
    } catch (err: any) {
      console.error("Failed to update customer:", err);
      const errMsg = err?.message || (isAr ? "فشل تعديل بيانات العميل" : "Failed to update customer");
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
      await deleteCustomer(deleteTargetId);
      setDeleteTargetId(null);
      showToast(isAr ? "تم حذف العميل بنجاح" : "Customer deleted", "success");
    } catch (err: any) {
      console.error("Failed to delete customer:", err);
      showToast(err?.message || (isAr ? "فشل حذف العميل" : "Failed to delete customer"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const agingBuckets = computeAging(customers, salesInvoices);

  const filteredCustomers = customers.filter(c => {
    if (categoryFilter !== "all" && c.categoryId !== categoryFilter) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.nameAr.toLowerCase().includes(q) ||
        c.nameEn.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.mobile && c.mobile.includes(q)) ||
        (c.taxNumber && c.taxNumber.includes(q))
      );
    }
    return true;
  });

  const totalReceivables = customers.reduce((sum, c) => sum + (c.currentBalance || 0), 0);

  if (isLoadingData) {
    return <TableSkeleton rows={6} columns={8} summaryCards={4} isAr={isAr} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-emerald-400" />
            <span>{isAr ? "دليل العملاء ومطالبات المدينين" : "Customers & Receivables Ledger"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? ("إجمالي المستحقات والمديونيات القائمة: " + formatCurrency(totalReceivables, organization.currency, locale))
              : ("Total Outstanding Receivables: " + formatCurrency(totalReceivables, organization.currency, locale))}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/customers/statement"
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>{isAr ? "كشف حساب عميل" : "Statement"}</span>
          </a>

          <a
            href="/customers/report"
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-sky-400" />
            <span>{isAr ? "تقرير أرصدة العملاء" : "Balances Report"}</span>
          </a>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/60 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? "إضافة عميل جديد" : "Add Customer"}</span>
          </button>
        </div>
      </div>

      {/* Tabs & Search & Category Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab("directory")}
            className={"px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer " + (
              activeTab === "directory" ? "bg-emerald-600 text-white shadow-md" : "bg-slate-800 text-slate-400 hover:text-white"
            )}
          >
            {isAr ? "دليل العملاء والبيانات" : "Customer Directory"}
          </button>
          <button
            onClick={() => setActiveTab("aging")}
            className={"px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer " + (
              activeTab === "aging" ? "bg-emerald-600 text-white shadow-md" : "bg-slate-800 text-slate-400 hover:text-white"
            )}
          >
            {isAr ? "تقرير أعمار الديون (Aging 0-90+ Days)" : "Aging Report"}
          </button>

          {customerCategories.length > 0 && activeTab === "directory" && (
            <div className="flex items-center gap-1 mr-3">
              <Tag className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white rounded-xl px-2.5 py-1.5 text-xs font-bold focus:outline-none"
              >
                <option value="all">{isAr ? "جميع التصنيفات" : "All Categories"}</option>
                {customerCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.nameAr}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
          <input
            type="text"
            placeholder={isAr ? "بحث باسم العميل أو الكود أو الهاتف أو الضريبي..." : "Search customer..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Directory Table */}
      {activeTab === "directory" ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                  <th className="p-3.5 rounded-r-lg">#</th>
                  <th className="p-3.5">{isAr ? "كود العميل" : "Code"}</th>
                  <th className="p-3.5">{isAr ? "اسم العميل" : "Customer Name"}</th>
                  <th className="p-3.5">{isAr ? "التصنيف" : "Category"}</th>
                  <th className="p-3.5">{isAr ? "الهاتف والتواصل" : "Contact"}</th>
                  <th className="p-3.5">{isAr ? "الرقم الضريبي" : "Tax No"}</th>
                  <th className="p-3.5 text-center font-mono">{isAr ? "رصيد أول المدة" : "Opening Bal"}</th>
                  <th className="p-3.5 text-center font-mono">{isAr ? "الرصيد القائم (مدين)" : "Current Balance"}</th>
                  <th className="p-3.5 rounded-l-lg text-center">{isAr ? "الإجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredCustomers.map((c, idx) => {
                  const cat = customerCategories.find(cc => cc.id === c.categoryId);
                  return (
                    <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3.5 text-slate-500 font-mono">{idx + 1}</td>
                      <td className="p-3.5 font-bold text-slate-300 font-mono">{c.code}</td>
                      <td className="p-3.5">
                        <div className="font-bold text-white">{isAr ? c.nameAr : c.nameEn}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          <span>{c.city || "الرياض"} {c.address ? `- ${c.address}` : ""}</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {cat?.nameAr || c.categoryName || (isAr ? "عملاء عام" : "General")}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-400 font-mono">
                        <div>{c.mobile || "---"}</div>
                        <div className="text-[10px] text-slate-500">{c.email || "---"}</div>
                      </td>
                      <td className="p-3.5 font-mono text-slate-300">{c.taxNumber || "---"}</td>
                      <td className="p-3.5 text-center font-mono text-slate-400">
                        {formatCurrency(c.openingBalance || 0, organization.currency, locale)}
                      </td>
                      <td className="p-3.5 text-center font-mono font-black text-rose-400">
                        {formatCurrency(c.currentBalance, organization.currency, locale)}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <a
                            href={`/customers/statement?id=${c.id}`}
                            title={isAr ? "كشف الحساب" : "Statement"}
                            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-all cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => setViewCustomer(c)}
                            title={isAr ? "عرض التفاصيل" : "View"}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(c)}
                            title={isAr ? "تعديل البيانات" : "Edit"}
                            className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-all cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTargetId(c.id)}
                            title={isAr ? "حذف العميل" : "Delete"}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* View: Aging Matrix Table */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                  <th className="p-3.5 rounded-r-lg">{isAr ? "العميل" : "Customer"}</th>
                  <th className="p-3.5 text-center text-emerald-400 font-mono">{isAr ? "حالي (غير متأخر)" : "Current"}</th>
                  <th className="p-3.5 text-center text-sky-400 font-mono">{isAr ? "1 - 30 يوم" : "1 - 30 Days"}</th>
                  <th className="p-3.5 text-center text-amber-400 font-mono">{isAr ? "31 - 60 يوم" : "31 - 60 Days"}</th>
                  <th className="p-3.5 text-center text-orange-400 font-mono">{isAr ? "61 - 90 يوم" : "61 - 90 Days"}</th>
                  <th className="p-3.5 text-center text-rose-400 font-mono">{isAr ? "+90 يوم (متعثر)" : "90+ Days"}</th>
                  <th className="p-3.5 rounded-l-lg text-center font-mono font-bold text-white">{isAr ? "إجمالي المديونية" : "Total Due"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {agingBuckets.map((bucket, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30">
                    <td className="p-3.5 font-sans font-bold text-white">{bucket.entityName}</td>
                    <td className="p-3.5 text-center text-slate-300">
                      {bucket.current > 0 ? formatCurrency(bucket.current, organization.currency, locale) : "-"}
                    </td>
                    <td className="p-3.5 text-center text-sky-400">
                      {bucket.days30 > 0 ? formatCurrency(bucket.days30, organization.currency, locale) : "-"}
                    </td>
                    <td className="p-3.5 text-center text-amber-400">
                      {bucket.days60 > 0 ? formatCurrency(bucket.days60, organization.currency, locale) : "-"}
                    </td>
                    <td className="p-3.5 text-center text-orange-400">
                      {bucket.days90 > 0 ? formatCurrency(bucket.days90, organization.currency, locale) : "-"}
                    </td>
                    <td className="p-3.5 text-center font-black text-rose-400">
                      {bucket.days90Plus > 0 ? formatCurrency(bucket.days90Plus, organization.currency, locale) : "-"}
                    </td>
                    <td className="p-3.5 text-center font-black text-white bg-slate-950/40">
                      {formatCurrency(bucket.total, organization.currency, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => !isSubmitting && setIsAddModalOpen(false)}
        title={isAr ? "إضافة عميل جديد" : "Add New Customer"}
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "اسم العميل (عربي) *" : "Customer Name (AR) *"}</label>
              <input
                type="text"
                required
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "اسم العميل (إنجليزي)" : "Customer Name (EN)"}</label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "كود العميل" : "Code"}</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "تصنيف العميل" : "Category"}</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-emerald-500"
              >
                {customerCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.nameAr}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "رصيد أول المدة (مدين)" : "Opening Balance"}</label>
              <input
                type="number"
                step="any"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "الرقم الضريبي" : "Tax ID"}</label>
              <input
                type="text"
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "المدينة" : "City"}</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">{isAr ? "العنوان بالتفصيل" : "Address"}</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "الحد الائتماني" : "Credit Limit"}</label>
              <input
                type="number"
                value={creditLimit}
                onChange={(e) => setCreditLimit(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "فترة السداد (أيام)" : "Payment Terms (Days)"}</label>
              <input
                type="number"
                value={paymentTermsDays}
                onChange={(e) => setPaymentTermsDays(parseInt(e.target.value) || 30)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
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
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl disabled:opacity-50 cursor-pointer shadow-lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isAr ? "جاري الحفظ..." : "Saving..."}</span>
                </>
              ) : (
                <span>{isAr ? "حفظ العميل" : "Save Customer"}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Customer Modal */}
      {viewCustomer && (
        <Modal
          isOpen={true}
          onClose={() => setViewCustomer(null)}
          title={isAr ? `بيانات العميل: ${viewCustomer.nameAr}` : `Customer Details: ${viewCustomer.nameEn}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-sm">{viewCustomer.nameAr}</div>
                  <div className="text-slate-400 text-[11px]">{viewCustomer.nameEn}</div>
                </div>
                <span className="font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                  {viewCustomer.code}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/60">
                <div>
                  <span className="text-slate-500 block">{isAr ? "الهاتف" : "Phone"}</span>
                  <span className="text-white font-mono">{viewCustomer.mobile || "---"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{isAr ? "البريد" : "Email"}</span>
                  <span className="text-white">{viewCustomer.email || "---"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{isAr ? "العنوان" : "Address"}</span>
                  <span className="text-white">{viewCustomer.city} - {viewCustomer.address}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{isAr ? "الرقم الضريبي" : "Tax No"}</span>
                  <span className="text-white font-mono">{viewCustomer.taxNumber || "---"}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-slate-500 block text-[11px]">{isAr ? "رصيد أول المدة" : "Opening Bal"}</span>
                <span className="text-xs font-mono font-bold text-slate-300">
                  {formatCurrency(viewCustomer.openingBalance || 0, organization.currency, locale)}
                </span>
              </div>
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-slate-500 block text-[11px]">{isAr ? "الحد الائتماني" : "Credit Limit"}</span>
                <span className="text-xs font-mono font-bold text-white">
                  {formatCurrency(viewCustomer.creditLimit, organization.currency, locale)}
                </span>
              </div>
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-slate-500 block text-[11px]">{isAr ? "الرصيد المستحق" : "Current Balance"}</span>
                <span className="text-xs font-mono font-black text-rose-400">
                  {formatCurrency(viewCustomer.currentBalance, organization.currency, locale)}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-800">
              <a
                href={`/customers/statement?id=${viewCustomer.id}`}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{isAr ? "عرض كشف الحساب الكامل" : "View Statement"}</span>
              </a>

              <button
                onClick={() => setViewCustomer(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl cursor-pointer"
              >
                {isAr ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Customer Modal */}
      {editCustomer && (
        <Modal
          isOpen={true}
          onClose={() => !isSubmitting && setEditCustomer(null)}
          title={isAr ? `تعديل بيانات العميل (${editCustomer.nameAr})` : `Edit Customer (${editCustomer.nameEn})`}
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
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "اسم العميل (عربي) *" : "Customer Name (AR) *"}</label>
                <input
                  type="text"
                  required
                  value={editNameAr}
                  onChange={(e) => setEditNameAr(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "اسم العميل (إنجليزي)" : "Customer Name (EN)"}</label>
                <input
                  type="text"
                  value={editNameEn}
                  onChange={(e) => setEditNameEn(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "كود العميل" : "Code"}</label>
                <input
                  type="text"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "تصنيف العميل" : "Category"}</label>
                <select
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-emerald-500"
                >
                  {customerCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nameAr}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "رصيد أول المدة" : "Opening Balance"}</label>
                <input
                  type="number"
                  step="any"
                  value={editOpeningBalance}
                  onChange={(e) => setEditOpeningBalance(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "الرقم الضريبي" : "Tax ID"}</label>
                <input
                  type="text"
                  value={editTaxNumber}
                  onChange={(e) => setEditTaxNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "المدينة" : "City"}</label>
                <input
                  type="text"
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "العنوان" : "Address"}</label>
              <input
                type="text"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "الحد الائتماني" : "Credit Limit"}</label>
                <input
                  type="number"
                  value={editCreditLimit}
                  onChange={(e) => setEditCreditLimit(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "فترة السداد (أيام)" : "Payment Terms (Days)"}</label>
                <input
                  type="number"
                  value={editPaymentTermsDays}
                  onChange={(e) => setEditPaymentTermsDays(parseInt(e.target.value) || 30)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setEditCustomer(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl disabled:opacity-50 cursor-pointer"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl disabled:opacity-50 cursor-pointer shadow-lg"
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
          title={isAr ? "تأكيد حذف العميل" : "Confirm Customer Deletion"}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-rose-300 text-sm">{isAr ? "هل أنت متأكد من حذف هذا العميل؟" : "Are you sure you want to delete this customer?"}</div>
                <div className="text-slate-400 text-[11px] mt-1">{isAr ? "سيتم حذف سجل العميل نهائياً من قاعدة البيانات." : "This will permanently remove the customer record from the database."}</div>
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
