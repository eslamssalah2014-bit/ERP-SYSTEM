"use client";

import React, { useState } from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency } from "@/lib/utils";
import { computeAging } from "@/lib/accounting-engine";
import Modal from "@/components/ui/Modal";
import { Customer } from "@/types/erp";
import {
  Users, Plus, Search, MapPin, Eye, Edit, Trash2,
  AlertTriangle, Phone, Mail, Building2, CreditCard
} from "lucide-react";

export default function CustomersPage() {
  const { customers, salesInvoices, addCustomer, updateCustomer, deleteCustomer, organization, locale } = useERP();
  const isAr = locale === "ar";

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"directory" | "aging">("directory");

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [code, setCode] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("القاهرة");
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
  const [editMobile, setEditMobile] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editTaxNumber, setEditTaxNumber] = useState("");
  const [editCreditLimit, setEditCreditLimit] = useState<number>(0);
  const [editPaymentTermsDays, setEditPaymentTermsDays] = useState<number>(30);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr) return;

    await addCustomer({
      organizationId: organization.id,
      code: code || ("CUST-" + (customers.length + 1).toString().padStart(3, "0")),
      nameAr,
      nameEn: nameEn || nameAr,
      mobile,
      email,
      address,
      city,
      taxNumber,
      creditLimit,
      paymentTermsDays,
      currentBalance: 0,
      status: "active",
    });

    setIsAddModalOpen(false);
    setNameAr("");
    setNameEn("");
    setMobile("");
    setEmail("");
  };

  const handleOpenEdit = (c: Customer) => {
    setEditCustomer(c);
    setEditNameAr(c.nameAr);
    setEditNameEn(c.nameEn);
    setEditCode(c.code);
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

    await updateCustomer(editCustomer.id, {
      nameAr: editNameAr,
      nameEn: editNameEn || editNameAr,
      code: editCode,
      mobile: editMobile,
      email: editEmail,
      address: editAddress,
      city: editCity,
      taxNumber: editTaxNumber,
      creditLimit: editCreditLimit,
      paymentTermsDays: editPaymentTermsDays,
    });

    setEditCustomer(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    await deleteCustomer(deleteTargetId);
    setDeleteTargetId(null);
  };

  const agingBuckets = computeAging(customers, salesInvoices);

  const filteredCustomers = customers.filter(c => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.nameAr.includes(q) ||
        c.nameEn.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.mobile && c.mobile.includes(q))
      );
    }
    return true;
  });

  const totalReceivables = customers.reduce((sum, c) => sum + c.currentBalance, 0);

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

        <button
          onClick={() => {
            setCode("CUST-" + (customers.length + 1).toString().padStart(3, "0"));
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/60 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{isAr ? "إضافة عميل جديد" : "Add Customer"}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("directory")}
            className={"px-4 py-2 rounded-xl text-xs font-bold transition-all " + (
              activeTab === "directory" ? "bg-emerald-600 text-white shadow-md" : "bg-slate-800 text-slate-400 hover:text-white"
            )}
          >
            {isAr ? "دليل العملاء والبيانات" : "Customer Directory"}
          </button>
          <button
            onClick={() => setActiveTab("aging")}
            className={"px-4 py-2 rounded-xl text-xs font-bold transition-all " + (
              activeTab === "aging" ? "bg-emerald-600 text-white shadow-md" : "bg-slate-800 text-slate-400 hover:text-white"
            )}
          >
            {isAr ? "تقرير أعمار الديون (Aging 0-90+ Days)" : "Aging Report"}
          </button>
        </div>

        <div className="relative w-72">
          <Search className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
          <input
            type="text"
            placeholder={isAr ? "بحث باسم العميل أو الكود أو الهاتف..." : "Search customer..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Content */}
      {activeTab === "directory" ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                  <th className="p-3.5 rounded-r-lg">#</th>
                  <th className="p-3.5">{isAr ? "كود العميل" : "Code"}</th>
                  <th className="p-3.5">{isAr ? "اسم العميل" : "Customer Name"}</th>
                  <th className="p-3.5">{isAr ? "الهاتف والتواصل" : "Contact"}</th>
                  <th className="p-3.5">{isAr ? "الرقم الضريبي" : "Tax No"}</th>
                  <th className="p-3.5 text-center font-mono">{isAr ? "الحد الائتماني" : "Credit Limit"}</th>
                  <th className="p-3.5 text-center font-mono">{isAr ? "الرصيد المستحق (مدين)" : "Current Balance"}</th>
                  <th className="p-3.5 text-center">{isAr ? "الحالة" : "Status"}</th>
                  <th className="p-3.5 rounded-l-lg text-center">{isAr ? "الإجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredCustomers.map((c, idx) => (
                  <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3.5 text-slate-500 font-mono">{idx + 1}</td>
                    <td className="p-3.5 font-bold text-slate-300 font-mono">{c.code}</td>
                    <td className="p-3.5">
                      <div className="font-bold text-white">{isAr ? c.nameAr : c.nameEn}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        <span>{c.city} - {c.address}</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-400 font-mono">
                      <div>{c.mobile || "---"}</div>
                      <div className="text-[10px] text-slate-500">{c.email || "---"}</div>
                    </td>
                    <td className="p-3.5 font-mono text-slate-300">{c.taxNumber || "---"}</td>
                    <td className="p-3.5 text-center font-mono text-slate-400">
                      {formatCurrency(c.creditLimit, organization.currency, locale)}
                    </td>
                    <td className="p-3.5 text-center font-mono font-black text-rose-400">
                      {formatCurrency(c.currentBalance, organization.currency, locale)}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-xl font-bold border border-emerald-500/20 text-[10px]">
                        {isAr ? "نشط" : "Active"}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setViewCustomer(c)}
                          title={isAr ? "عرض التفاصيل" : "View"}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(c)}
                          title={isAr ? "تعديل البيانات" : "Edit"}
                          className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-all"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTargetId(c.id)}
                          title={isAr ? "حذف العميل" : "Delete"}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
        onClose={() => setIsAddModalOpen(false)}
        title={isAr ? "إضافة عميل جديد" : "Add Customer"}
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4 text-xs">
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

          <div className="grid grid-cols-2 gap-4">
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
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "رقم الهاتف" : "Phone"}</label>
              <input
                type="text"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
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
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "المدينة" : "City"}</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
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
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
            >
              {isAr ? "حفظ العميل" : "Save Customer"}
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

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-slate-500 block text-[11px]">{isAr ? "الحد الائتماني" : "Credit Limit"}</span>
                <span className="text-sm font-mono font-bold text-white">
                  {formatCurrency(viewCustomer.creditLimit, organization.currency, locale)}
                </span>
              </div>
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-slate-500 block text-[11px]">{isAr ? "الرصيد المستحق (المديونية)" : "Current Balance"}</span>
                <span className="text-sm font-mono font-black text-rose-400">
                  {formatCurrency(viewCustomer.currentBalance, organization.currency, locale)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setViewCustomer(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
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
          onClose={() => setEditCustomer(null)}
          title={isAr ? `تعديل بيانات العميل (${editCustomer.nameAr})` : `Edit Customer (${editCustomer.nameEn})`}
          maxWidth="2xl"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
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

            <div className="grid grid-cols-2 gap-4">
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
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "رقم الهاتف" : "Phone"}</label>
                <input
                  type="text"
                  value={editMobile}
                  onChange={(e) => setEditMobile(e.target.value)}
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
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "المدينة" : "City"}</label>
                <input
                  type="text"
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
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
                onClick={() => setEditCustomer(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
              >
                {isAr ? "حفظ التعديلات" : "Save Changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteTargetId(null)}
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
                onClick={() => setDeleteTargetId(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
              >
                {isAr ? "تراجع" : "Cancel"}
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl"
              >
                {isAr ? "تأكيد الحذف النهائي" : "Confirm Delete"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
