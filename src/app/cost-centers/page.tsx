"use client";

import React, { useState } from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import { Layers, Plus, Search, Building2, CheckCircle2 } from "lucide-react";

export default function CostCentersPage() {
  const { costCenters, addCostCenter, organization, locale } = useERP();
  const isAr = locale === "ar";

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [code, setCode] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [parentId, setParentId] = useState("");

  const handleCreateCostCenter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !nameAr) return;

    addCostCenter({
      organizationId: organization.id,
      code,
      nameAr,
      nameEn: nameEn || nameAr,
      parentId: parentId || undefined,
      level: parentId ? 2 : 1,
      isActive: true,
    });

    setIsAddModalOpen(false);
    setCode("");
    setNameAr("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-emerald-400" />
            <span>{isAr ? "دليل مراكز التكلفة والمشاريع" : "Cost Centers & Projects"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAr ? "توزيع الإيرادات والمصروفات على المشاريع والفروع والأقسام لقياس ربحية كل مركز مستقل" : "Multi-level cost centers for profitability and project accounting"}
          </p>
        </div>

        <button
          onClick={() => {
            setCode("CC-" + (costCenters.length + 1).toString().padStart(2, "0"));
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/60 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{isAr ? "إضافة مركز تكلفة جديد" : "Add Cost Center"}</span>
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                <th className="p-3.5 rounded-r-lg font-mono">{isAr ? "كود المركز" : "Code"}</th>
                <th className="p-3.5">{isAr ? "اسم مركز التكلفة" : "Cost Center Name"}</th>
                <th className="p-3.5 text-center font-mono">{isAr ? "المستوى" : "Level"}</th>
                <th className="p-3.5 rounded-l-lg text-center">{isAr ? "الحالة" : "Status"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {costCenters.map(cc => (
                <tr key={cc.id} className="hover:bg-slate-800/30">
                  <td className="p-3.5 font-mono font-bold text-emerald-400">{cc.code}</td>
                  <td className="p-3.5">
                    <div
                      className="font-bold text-white"
                      style={{ paddingRight: isAr ? ((cc.level - 1) * 20) + "px" : undefined, paddingLeft: !isAr ? ((cc.level - 1) * 20) + "px" : undefined }}
                    >
                      {cc.level > 1 && <span className="text-slate-500 font-normal ml-1">↳</span>}
                      <span>{isAr ? cc.nameAr : cc.nameEn}</span>
                    </div>
                  </td>
                  <td className="p-3.5 text-center font-mono text-slate-400">L{cc.level}</td>
                  <td className="p-3.5 text-center">
                    <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-xl font-bold border border-emerald-500/20 text-[10px]">
                      {isAr ? "نشط" : "Active"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={isAr ? "إنشاء مركز تكلفة جديد" : "Add Cost Center"}
      >
        <form onSubmit={handleCreateCostCenter} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "كود المركز *" : "Code *"}</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "المركز الرئيسي (الأب)" : "Parent Center"}</label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              >
                <option value="">{isAr ? "--- مركز رئيسي مستقل ---" : "Top Level"}</option>
                {costCenters.filter(c => c.level === 1).map(c => (
                  <option key={c.id} value={c.id}>{c.code} - {c.nameAr}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">{isAr ? "اسم مركز التكلفة (عربي) *" : "Name (AR) *"}</label>
            <input
              type="text"
              required
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            />
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
              {isAr ? "حفظ المركز" : "Save Center"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
