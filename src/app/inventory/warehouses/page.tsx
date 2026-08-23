"use client";

import React, { useState } from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import { Warehouse, Plus, Building2, MapPin, Phone, User, Package } from "lucide-react";

export default function WarehousesPage() {
  const { warehouses, products, branches, addWarehouse, locale, organization } = useERP();
  const isAr = locale === "ar";
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [code, setCode] = useState("");
  const [location, setLocation] = useState("");
  const [managerName, setManagerName] = useState("");
  const [managerPhone, setManagerPhone] = useState("");
  const [branchId, setBranchId] = useState(branches[0]?.id || "");

  const handleCreateWarehouse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr || !code) return;

    addWarehouse({
      organizationId: organization.id,
      branchId,
      code,
      nameAr,
      nameEn: nameEn || nameAr,
      location,
      managerName,
      managerPhone,
      isDefault: warehouses.length === 0,
    });

    setIsAddModalOpen(false);
    setNameAr("");
    setNameEn("");
    setCode("");
    setLocation("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Warehouse className="w-6 h-6 text-emerald-400" />
            <span>{isAr ? "إدارة المستودعات ومراكز التوزيع" : "Warehouses & Logistics Hubs"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAr ? "متابعة أرصدة المخزون موزعة جغرافياً عبر الفروع والمستودعات المركزية" : "Track inventory balances across multi-branch warehouses"}
          </p>
        </div>

        <button
          onClick={() => {
            setCode("WH-" + (warehouses.length + 1).toString().padStart(2, "0"));
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/60 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{isAr ? "إضافة مستودع جديد" : "Add Warehouse"}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {warehouses.map(wh => {
          const whProducts = products.filter(p => (p.warehouseStock?.[wh.id] || 0) > 0);
          const totalUnits = whProducts.reduce((sum, p) => sum + (p.warehouseStock?.[wh.id] || 0), 0);
          const totalValue = whProducts.reduce((sum, p) => sum + ((p.warehouseStock?.[wh.id] || 0) * p.costPrice), 0);

          return (
            <div key={wh.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm hover:border-slate-700 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono font-bold text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                    {wh.code}
                  </span>
                  {wh.isDefault && (
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-bold">
                      {isAr ? "المستودع الرئيسي" : "Default Hub"}
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-white">{isAr ? wh.nameAr : wh.nameEn}</h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>{wh.location || (isAr ? "غير محدد" : "Not specified")}</span>
                </div>

                {wh.managerName && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>{wh.managerName} ({wh.managerPhone})</span>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-3 bg-slate-950/60 p-3 rounded-2xl">
                <div>
                  <span className="text-[11px] text-slate-500 block">{isAr ? "إجمالي القطع المخزنة" : "Total Units"}</span>
                  <span className="text-sm font-black text-white font-mono">{totalUnits}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">{isAr ? "قيمة البضاعة" : "Stock Value"}</span>
                  <span className="text-sm font-black text-emerald-400 font-mono">
                    {formatCurrency(totalValue, organization.currency, locale)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={isAr ? "إنشاء مستودع / مخزن جديد" : "Add Warehouse"}
      >
        <form onSubmit={handleCreateWarehouse} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "اسم المستودع (عربي) *" : "Warehouse Name (AR) *"}</label>
              <input
                type="text"
                required
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "كود المستودع *" : "Code *"}</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">{isAr ? "الفرع التابع له" : "Branch"}</label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            >
              {branches.map(b => <option key={b.id} value={b.id}>{b.nameAr}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">{isAr ? "العنوان والموقع الجغرافي" : "Location"}</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "اسم أمين المستودع" : "Manager Name"}</label>
              <input
                type="text"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "رقم الهاتف" : "Phone"}</label>
              <input
                type="text"
                value={managerPhone}
                onChange={(e) => setManagerPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
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
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition-colors"
            >
              {isAr ? "حفظ المستودع" : "Save Warehouse"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
