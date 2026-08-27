"use client";

import React, { useState } from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import { Supplier } from "@/types/erp";
import {
  Truck, Plus, Search, MapPin, Eye, Edit, Trash2,
  AlertTriangle, Phone, Mail, Building2, CreditCard
} from "lucide-react";

export default function SuppliersPage() {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier, organization, locale } = useERP();
  const isAr = locale === "ar";

  const [searchQuery, setSearchQuery] = useState("");

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [code, setCode] = useState("");
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
  const [editMobile, setEditMobile] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editTaxNumber, setEditTaxNumber] = useState("");
  const [editBankName, setEditBankName] = useState("");
  const [editBankIban, setEditBankIban] = useState("");

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr) return;

    await addSupplier({
      organizationId: organization.id,
      code: code || ("SUPP-" + (suppliers.length + 1).toString().padStart(3, "0")),
      nameAr,
      nameEn: nameEn || nameAr,
      mobile,
      email,
      address,
      taxNumber,
      bankName,
      bankIban,
      currentBalance: 0,
      status: "active",
    });

    setIsAddModalOpen(false);
    setNameAr("");
    setNameEn("");
    setMobile("");
    setEmail("");
    setAddress("");
    setTaxNumber("");
    setBankName("");
    setBankIban("");
  };

  const handleOpenEdit = (s: Supplier) => {
    setEditSupplier(s);
    setEditNameAr(s.nameAr);
    setEditNameEn(s.nameEn);
    setEditCode(s.code);
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

    await updateSupplier(editSupplier.id, {
      nameAr: editNameAr,
      nameEn: editNameEn || editNameAr,
      code: editCode,
      mobile: editMobile,
      email: editEmail,
      address: editAddress,
      taxNumber: editTaxNumber,
      bankName: editBankName,
      bankIban: editBankIban,
    });

    setEditSupplier(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    await deleteSupplier(deleteTargetId);
    setDeleteTargetId(null);
  };

  const filteredSuppliers = suppliers.filter(s => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        s.nameAr.includes(q) ||
        s.nameEn.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.mobile && s.mobile.includes(q))
      );
    }
    return true;
  });

  const totalPayables = suppliers.reduce((sum, s) => sum + s.currentBalance, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Truck className="w-6 h-6 text-sky-400" />
            <span>{isAr ? "دليل الموردين وجهات التوريد" : "Suppliers & Payables Directory"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? ("إجمالي التزامات الموردين المستحقة (دائن): " + formatCurrency(totalPayables, organization.currency, locale))
              : ("Total Outstanding Payables: " + formatCurrency(totalPayables, organization.currency, locale))}
          </p>
        </div>

        <button
          onClick={() => {
            setCode("SUPP-" + (suppliers.length + 1).toString().padStart(3, "0"));
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-sky-600 to-blue-500 hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-950/60 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{isAr ? "إضافة مورد جديد" : "Add Supplier"}</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
          <input
            type="text"
            placeholder={isAr ? "بحث باسم المورد أو الكود أو الهاتف..." : "Search suppliers..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                <th className="p-3.5 rounded-r-lg">#</th>
                <th className="p-3.5">{isAr ? "كود المورد" : "Code"}</th>
                <th className="p-3.5">{isAr ? "اسم المورد / الشركة" : "Supplier Name"}</th>
                <th className="p-3.5">{isAr ? "الهاتف والتواصل" : "Contact"}</th>
                <th className="p-3.5">{isAr ? "الرقم الضريبي" : "Tax No"}</th>
                <th className="p-3.5">{isAr ? "الحساب البنكي / IBAN" : "Bank IBAN"}</th>
                <th className="p-3.5 text-center font-mono">{isAr ? "الرصيد المستحق (دائن)" : "Balance Due"}</th>
                <th className="p-3.5 text-center">{isAr ? "الحالة" : "Status"}</th>
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
                      <span>{s.address || (isAr ? "غير محدد" : "Not set")}</span>
                    </div>
                  </td>
                  <td className="p-3.5 text-slate-400 font-mono">
                    <div>{s.mobile || "---"}</div>
                    <div className="text-[10px] text-slate-500">{s.email || "---"}</div>
                  </td>
                  <td className="p-3.5 font-mono text-slate-300">{s.taxNumber || "---"}</td>
                  <td className="p-3.5">
                    <div className="text-slate-300">{s.bankName || "---"}</div>
                    <div className="font-mono text-[10px] text-slate-500">{s.bankIban || "---"}</div>
                  </td>
                  <td className="p-3.5 text-center font-mono font-black text-amber-400">
                    {formatCurrency(s.currentBalance, organization.currency, locale)}
                  </td>
                  <td className="p-3.5 text-center">
                    <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-xl font-bold border border-emerald-500/20 text-[10px]">
                      {isAr ? "معتمد" : "Active"}
                    </span>
                  </td>
                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setViewSupplier(s)}
                        title={isAr ? "عرض التفاصيل" : "View"}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(s)}
                        title={isAr ? "تعديل البيانات" : "Edit"}
                        className="p-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 transition-all"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTargetId(s.id)}
                        title={isAr ? "حذف المورد" : "Delete"}
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

      {/* Add Supplier Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={isAr ? "إضافة مورد / جهة توريد جديدة" : "Add Supplier"}
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateSupplier} className="space-y-4 text-xs">
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
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "كود المورد" : "Code"}</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "البريد الإلكتروني" : "Email"}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "الرقم الضريبي" : "Tax ID"}</label>
              <input
                type="text"
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "العنوان" : "Address"}</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "اسم البنك" : "Bank Name"}</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "رقم الآيبان (IBAN)" : "Bank IBAN"}</label>
              <input
                type="text"
                value={bankIban}
                onChange={(e) => setBankIban(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
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
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl"
            >
              {isAr ? "حفظ المورد" : "Save Supplier"}
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
                <div>
                  <span className="text-slate-500 block">{isAr ? "البنك" : "Bank"}</span>
                  <span className="text-white">{viewSupplier.bankName || "---"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{isAr ? "رقم الحساب (IBAN)" : "IBAN"}</span>
                  <span className="text-white font-mono">{viewSupplier.bankIban || "---"}</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
              <span className="text-slate-500 block text-[11px]">{isAr ? "الرصيد المستحق (التزام دائن)" : "Outstanding Balance"}</span>
              <span className="text-base font-mono font-black text-amber-400">
                {formatCurrency(viewSupplier.currentBalance, organization.currency, locale)}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setViewSupplier(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
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
          onClose={() => setEditSupplier(null)}
          title={isAr ? `تعديل بيانات المورد (${editSupplier.nameAr})` : `Edit Supplier (${editSupplier.nameEn})`}
          maxWidth="2xl"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "رقم الهاتف" : "Phone"}</label>
                <input
                  type="text"
                  value={editMobile}
                  onChange={(e) => setEditMobile(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "الرقم الضريبي" : "Tax ID"}</label>
                <input
                  type="text"
                  value={editTaxNumber}
                  onChange={(e) => setEditTaxNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "اسم البنك" : "Bank Name"}</label>
                <input
                  type="text"
                  value={editBankName}
                  onChange={(e) => setEditBankName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "رقم الآيبان (IBAN)" : "Bank IBAN"}</label>
                <input
                  type="text"
                  value={editBankIban}
                  onChange={(e) => setEditBankIban(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditSupplier(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl"
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
