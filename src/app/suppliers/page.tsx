"use client";

import React, { useState } from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import {
  Truck, Plus, Search, Phone, Mail, Building2,
  CreditCard, ShieldCheck
} from "lucide-react";

export default function SuppliersPage() {
  const { suppliers, addSupplier, organization, locale } = useERP();
  const isAr = locale === "ar";

  const [searchQuery, setSearchQuery] = useState("");
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

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr) return;

    addSupplier({
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
  };

  const filteredSuppliers = suppliers.filter(s => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return s.nameAr.includes(q) || s.nameEn.toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
    }
    return true;
  });

  const totalPayables = suppliers.reduce((sum, s) => sum + s.currentBalance, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Truck className="w-6 h-6 text-sky-400" />
            <span>{isAr ? "دليل الموردين والدائنين" : "Suppliers & Accounts Payable (A/P)"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? ("إجمالي المستحقات الواجبة السداد للموردين: " + formatCurrency(totalPayables, organization.currency, locale))
              : ("Total Accounts Payable: " + formatCurrency(totalPayables, organization.currency, locale))}
          </p>
        </div>

        <button
          onClick={() => {
            setCode("SUPP-" + (suppliers.length + 1001));
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-sky-600 to-blue-500 hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-950/60 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{isAr ? "إضافة مورد جديد" : "Add Supplier"}</span>
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                <th className="p-3.5 rounded-r-lg">#</th>
                <th className="p-3.5">{isAr ? "كود المورد" : "Code"}</th>
                <th className="p-3.5">{isAr ? "اسم الشركة / المورد" : "Supplier Name"}</th>
                <th className="p-3.5">{isAr ? "التواصل" : "Contact"}</th>
                <th className="p-3.5">{isAr ? "البيانات البنكية" : "Banking (IBAN)"}</th>
                <th className="p-3.5 text-center font-mono">{isAr ? "الرصيد المستحق (دائن)" : "Payable Balance"}</th>
                <th className="p-3.5 rounded-l-lg text-center">{isAr ? "الحالة" : "Status"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredSuppliers.map((s, idx) => (
                <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3.5 text-slate-500 font-mono">{idx + 1}</td>
                  <td className="p-3.5 font-bold text-slate-300 font-mono">{s.code}</td>
                  <td className="p-3.5">
                    <div className="font-bold text-white">{isAr ? s.nameAr : s.nameEn}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{s.address}</div>
                  </td>
                  <td className="p-3.5 font-mono text-slate-400">
                    <div>{s.mobile}</div>
                    <div className="text-[10px] text-slate-500">{s.email}</div>
                  </td>
                  <td className="p-3.5 text-slate-300">
                    <div className="font-semibold">{s.bankName || "---"}</div>
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
                placeholder="بنك CIB / الراجحي..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "رقم الحساب الدولي (IBAN)" : "IBAN"}</label>
              <input
                type="text"
                value={bankIban}
                onChange={(e) => setBankIban(e.target.value)}
                placeholder="EG..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-lg transition-colors"
            >
              {isAr ? "حفظ المورد" : "Save Supplier"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
