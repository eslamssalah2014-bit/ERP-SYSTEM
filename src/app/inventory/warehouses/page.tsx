"use client";

import React, { useState } from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import { Warehouse } from "@/types/erp";
import {
  Warehouse as WarehouseIcon, Plus, MapPin, User, Phone,
  Boxes, DollarSign, Edit, Trash2, AlertTriangle
} from "lucide-react";

export default function WarehousesPage() {
  const {
    warehouses, products, branches, addWarehouse, updateWarehouse,
    deleteWarehouse, organization, locale
  } = useERP();
  const isAr = locale === "ar";

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [code, setCode] = useState("");
  const [location, setLocation] = useState("");
  const [managerName, setManagerName] = useState("");
  const [managerPhone, setManagerPhone] = useState("");
  const [branchId, setBranchId] = useState(branches[0]?.id || "");
  const [isDefault, setIsDefault] = useState(false);

  // Edit / Delete Modal State
  const [editWarehouse, setEditWarehouse] = useState<Warehouse | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Edit Form State
  const [editNameAr, setEditNameAr] = useState("");
  const [editNameEn, setEditNameEn] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editManagerName, setEditManagerName] = useState("");
  const [editManagerPhone, setEditManagerPhone] = useState("");
  const [editIsDefault, setEditIsDefault] = useState(false);

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr || !code) return;

    await addWarehouse({
      organizationId: organization.id,
      branchId: branchId || branches[0]?.id || "00000000-0000-0000-0000-000000000002",
      code,
      nameAr,
      nameEn: nameEn || nameAr,
      location,
      managerName,
      managerPhone,
      isDefault,
    });

    setIsAddModalOpen(false);
    setNameAr("");
    setNameEn("");
    setCode("");
    setLocation("");
    setManagerName("");
    setManagerPhone("");
    setIsDefault(false);
  };

  const handleOpenEdit = (wh: Warehouse) => {
    setEditWarehouse(wh);
    setEditNameAr(wh.nameAr);
    setEditNameEn(wh.nameEn);
    setEditCode(wh.code);
    setEditLocation(wh.location || "");
    setEditManagerName(wh.managerName || "");
    setEditManagerPhone(wh.managerPhone || "");
    setEditIsDefault(Boolean(wh.isDefault));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editWarehouse) return;

    await updateWarehouse(editWarehouse.id, {
      nameAr: editNameAr,
      nameEn: editNameEn || editNameAr,
      code: editCode,
      location: editLocation,
      managerName: editManagerName,
      managerPhone: editManagerPhone,
      isDefault: editIsDefault,
    });

    setEditWarehouse(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    await deleteWarehouse(deleteTargetId);
    setDeleteTargetId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <WarehouseIcon className="w-6 h-6 text-emerald-400" />
            <span>{isAr ? "دليل المستودعات والمخازن اللوجستية" : "Warehouses & Stock Locations"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAr ? "إدارة مواقع التخزين، مسؤولي المستودعات، ومتابعة الأرصدة التراكمية لكل مخزن" : "Multi-location warehouse setup and physical inventory management"}
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

      {/* Warehouses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {warehouses.map(wh => {
          const whProducts = products.filter(p => (p.warehouseStock?.[wh.id] || 0) > 0);
          const totalUnits = whProducts.reduce((sum, p) => sum + (p.warehouseStock?.[wh.id] || 0), 0);
          const totalValue = whProducts.reduce((sum, p) => sum + ((p.warehouseStock?.[wh.id] || 0) * p.costPrice), 0);

          return (
            <div key={wh.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm hover:border-slate-700 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                      {wh.code}
                    </span>
                    {wh.isDefault && (
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-bold">
                        {isAr ? "المستودع الرئيسي" : "Default Hub"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(wh)}
                      title={isAr ? "تعديل المستودع" : "Edit"}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTargetId(wh.id)}
                      title={isAr ? "حذف المستودع" : "Delete"}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-white">{isAr ? wh.nameAr : wh.nameEn}</h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>{wh.location || (isAr ? "غير محدد" : "Not specified")}</span>
                </div>

                {wh.managerName && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>{wh.managerName} {wh.managerPhone ? `(${wh.managerPhone})` : ""}</span>
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

      {/* Add Warehouse Modal */}
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
            <label className="block text-slate-400 font-semibold mb-1">{isAr ? "الموقع / العنوان الجغرافي" : "Location"}</label>
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "هاتف أمين المستودع" : "Manager Phone"}</label>
              <input
                type="text"
                value={managerPhone}
                onChange={(e) => setManagerPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded bg-slate-950 border-slate-800 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="isDefault" className="text-slate-300 font-semibold cursor-pointer">
              {isAr ? "تعيين كمستودع افتراضي للعمليات" : "Set as Default Warehouse"}
            </label>
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
              {isAr ? "حفظ المستودع" : "Save Warehouse"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Warehouse Modal */}
      {editWarehouse && (
        <Modal
          isOpen={true}
          onClose={() => setEditWarehouse(null)}
          title={isAr ? `تعديل مستودع (${editWarehouse.nameAr})` : `Edit Warehouse (${editWarehouse.nameEn})`}
        >
          <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "اسم المستودع (عربي) *" : "Warehouse Name (AR) *"}</label>
                <input
                  type="text"
                  required
                  value={editNameAr}
                  onChange={(e) => setEditNameAr(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "كود المستودع *" : "Code *"}</label>
                <input
                  type="text"
                  required
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "الموقع / العنوان الجغرافي" : "Location"}</label>
              <input
                type="text"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "اسم أمين المستودع" : "Manager Name"}</label>
                <input
                  type="text"
                  value={editManagerName}
                  onChange={(e) => setEditManagerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "هاتف أمين المستودع" : "Manager Phone"}</label>
                <input
                  type="text"
                  value={editManagerPhone}
                  onChange={(e) => setEditManagerPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="editIsDefault"
                checked={editIsDefault}
                onChange={(e) => setEditIsDefault(e.target.checked)}
                className="rounded bg-slate-950 border-slate-800 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="editIsDefault" className="text-slate-300 font-semibold cursor-pointer">
                {isAr ? "تعيين كمستودع افتراضي للعمليات" : "Set as Default Warehouse"}
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditWarehouse(null)}
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
          title={isAr ? "تأكيد حذف المستودع" : "Confirm Warehouse Deletion"}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-rose-300 text-sm">{isAr ? "هل أنت متأكد من حذف هذا المستودع؟" : "Are you sure you want to delete this warehouse?"}</div>
                <div className="text-slate-400 text-[11px] mt-1">{isAr ? "سيتم حذف سجل المستودع وأرصدته من قاعدة البيانات." : "This will remove the warehouse record from the database."}</div>
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
