"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useERP } from "@/context/erp-context";
import { computeStockKardex } from "@/lib/accounting-engine";
import { formatCurrency, formatDate } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import { StockCardRecord, StockMovement } from "@/types/erp";
import {
  FileSpreadsheet, Package, Warehouse as WarehouseIcon, Calendar,
  ArrowDownRight, ArrowUpRight, Printer, Download, Eye, Edit, Trash2,
  Image as ImageIcon, Filter, CheckCircle2, AlertCircle, Building2, User, Loader2
} from "lucide-react";

export default function KardexPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">جاري تحميل سجل حركة الصنف (كاردكس)...</div>}>
      <KardexContent />
    </Suspense>
  );
}

function KardexContent() {
  const searchParams = useSearchParams();
  const urlProductId = searchParams ? searchParams.get("productId") : null;

  const {
    products, warehouses, stockMovements, customers, suppliers,
    updateStockMovement, deleteStockMovement, locale, organization,
    currentUser, hasPermission, showToast
  } = useERP();

  const isAr = locale === "ar";

  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (urlProductId && products.some(p => p.id === urlProductId)) {
      setSelectedProductId(urlProductId);
    } else if (products.length > 0 && (!selectedProductId || !products.some(p => p.id === selectedProductId))) {
      setSelectedProductId(products[0].id);
    }
  }, [urlProductId, products, selectedProductId]);

  // Modals state
  const [viewRecord, setViewRecord] = useState<StockCardRecord | null>(null);
  const [editRecord, setEditRecord] = useState<StockCardRecord | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Edit Form State
  const [editDate, setEditDate] = useState<string>("");
  const [editQuantity, setEditQuantity] = useState<number>(0);
  const [editUnitCost, setEditUnitCost] = useState<number>(0);
  const [editWarehouseId, setEditWarehouseId] = useState<string>("");
  const [editPartnerName, setEditPartnerName] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");

  const selectedProduct = products.find(p => p.id === selectedProductId) || products[0];

  // Compute all kardex records with opening balance as baseline
  const allKardexRecords = selectedProduct
    ? computeStockKardex(selectedProduct.id, selectedWarehouseId, stockMovements, warehouses, customers, suppliers)
    : [];

  // Filter by date range if provided
  const kardexRecords = allKardexRecords.filter(r => {
    if (dateFrom && r.date < dateFrom) return false;
    if (dateTo && r.date > dateTo) return false;
    return true;
  });

  // Calculate actual live current stock
  const currentTotalStock = selectedProduct
    ? (selectedWarehouseId === "all"
        ? Object.values(selectedProduct.warehouseStock || {}).reduce((a, b) => a + b, 0)
        : (selectedProduct.warehouseStock[selectedWarehouseId] || 0))
    : 0;

  const currentValuation = currentTotalStock * (selectedProduct?.costPrice || 0);

  // Open Edit Modal with initialized values
  const handleOpenEdit = (rec: StockCardRecord) => {
    setFormError(null);
    setEditRecord(rec);
    setEditDate(rec.date);
    setEditQuantity(rec.inQuantity > 0 ? rec.inQuantity : rec.outQuantity);
    setEditUnitCost(rec.unitCost);
    setEditWarehouseId(rec.warehouseId || warehouses[0]?.id || "");
    setEditPartnerName(rec.partnerName || "");
    setEditNotes(rec.notes || "");
  };

  // Submit Edit Movement
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRecord?.movementId) return;
    setFormError(null);
    setIsSubmitting(true);

    try {
      const isIncoming = editRecord.inQuantity > 0 || editRecord.movementType === "opening_balance" || editRecord.movementType === "purchase_receipt" || editRecord.movementType === "sales_return";
      const signedQty = isIncoming ? Math.abs(editQuantity) : -Math.abs(editQuantity);

      await updateStockMovement(editRecord.movementId, {
        date: editDate,
        quantity: signedQty,
        unitCost: editUnitCost,
        totalCost: Math.abs(signedQty * editUnitCost),
        warehouseId: editWarehouseId,
        partnerName: editPartnerName,
        notes: editNotes,
      });

      setEditRecord(null);
    } catch (err: any) {
      console.error("Failed to update movement:", err);
      const errMsg = err?.message || (isAr ? "فشل تعديل حركة المخزون" : "Failed to update movement");
      setFormError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm Delete Movement
  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    setIsSubmitting(true);
    try {
      await deleteStockMovement(deleteTargetId);
      setDeleteTargetId(null);
    } catch (err: any) {
      console.error("Failed to delete movement:", err);
      showToast(err?.message || (isAr ? "فشل حذف حركة المخزون" : "Failed to delete movement"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export Excel / CSV with UTF-8 BOM for perfect Arabic display
  const handleExportExcel = () => {
    if (!selectedProduct) return;

    const headers = [
      isAr ? "التاريخ" : "Date",
      isAr ? "نوع الحركة" : "Movement Type",
      isAr ? "رقم المرجع" : "Ref Number",
      isAr ? "الطرف / العميل / المورد" : "Party / Partner",
      isAr ? "المستودع" : "Warehouse",
      isAr ? "الوارد" : "In Qty",
      isAr ? "المنصرف" : "Out Qty",
      isAr ? "تكلفة الوحدة" : "Unit Cost",
      isAr ? "إجمالي الحركة" : "Total Cost",
      isAr ? "الرصيد التراكمي" : "Running Balance",
      isAr ? "ملاحظات" : "Notes",
    ];

    const rows = kardexRecords.map(r => [
      r.date,
      r.movementType,
      r.referenceNumber,
      `"${(r.partnerName || "").replace(/"/g, '""')}"`,
      `"${(r.warehouseName || "").replace(/"/g, '""')}"`,
      r.inQuantity > 0 ? r.inQuantity : 0,
      r.outQuantity > 0 ? r.outQuantity : 0,
      r.unitCost,
      r.totalCost,
      r.runningBalance,
      `"${(r.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Kardex_${selectedProduct.sku}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const canManageInventory = hasPermission(["super_admin", "tenant_admin", "inventory_manager"]);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm print:hidden">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            <span>{isAr ? "كارت الصنف وحركة المخزون (Kardex)" : "Stock Card & Kardex Ledger"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? "سجل تتبعي تفصيلي معتمد يبدأ بالرصيد الافتتاحي ويوثق أطراف المعاملات وإجمالي الرصيد التراكمي"
              : "Comprehensive inventory audit trail starting with opening stock, partner tracking, and running balances"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold rounded-xl border border-slate-700 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>{isAr ? "تصدير Excel (CSV)" : "Export CSV"}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/60 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>{isAr ? "طباعة كارت الصنف (PDF)" : "Print Kardex"}</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800 print:hidden">
        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1">
            {isAr ? "اختر المنتج:" : "Select Product:"}
          </label>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
          >
            {products.map(p => (
              <option key={p.id} value={p.id}>
                {p.nameAr} ({p.sku})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1">
            {isAr ? "المستودع:" : "Warehouse:"}
          </label>
          <select
            value={selectedWarehouseId}
            onChange={(e) => setSelectedWarehouseId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
          >
            <option value="all">{isAr ? "جميع المستودعات (إجمالي)" : "All Warehouses (Consolidated)"}</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.nameAr} ({w.code})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1">
            {isAr ? "من تاريخ:" : "Date From:"}
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1">
            {isAr ? "إلى تاريخ:" : "Date To:"}
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Printable Document Header (Visible only when printing) */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-4 text-black font-sans">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-black">{organization.nameAr}</h2>
            <div className="text-xs text-slate-600 mt-0.5">{organization.nameEn}</div>
            <div className="text-xs mt-1">الرقم الضريبي: <b>{organization.taxNumber}</b> | س.ت: <b>{organization.commercialRegister || "---"}</b></div>
            <div className="text-xs text-slate-600">{organization.address}</div>
          </div>
          <div className="text-left text-xs space-y-0.5">
            <div className="text-sm font-bold text-emerald-800">كارت حركة الصنف (Kardex Report)</div>
            <div>المستودع: <b>{selectedWarehouseId === "all" ? "جميع المستودعات" : warehouses.find(w => w.id === selectedWarehouseId)?.nameAr}</b></div>
            <div>تاريخ التقرير: <b>{new Date().toISOString().replace("T", " ").substring(0, 19)}</b></div>
            <div>المطبوع بواسطة: <b>{currentUser.name}</b></div>
          </div>
        </div>
      </div>

      {/* Selected Product Card */}
      {selectedProduct && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Product Image */}
              <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                {selectedProduct.imageUrl ? (
                  <img
                    src={selectedProduct.imageUrl}
                    alt={selectedProduct.nameAr}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Package className="w-8 h-8 text-slate-600" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs bg-slate-950 text-emerald-400 px-2 py-0.5 rounded-lg border border-slate-800">
                    {selectedProduct.sku}
                  </span>
                  <span className="text-slate-400 font-mono text-xs">{selectedProduct.barcode}</span>
                </div>
                <h2 className="text-base font-bold text-white mt-1">
                  {isAr ? selectedProduct.nameAr : selectedProduct.nameEn}
                </h2>
                <div className="text-xs text-slate-400 mt-0.5">
                  {isAr ? "سعر البيع: " : "Selling Price: "}
                  <b className="text-white font-mono">{formatCurrency(selectedProduct.sellingPrice, organization.currency, locale)}</b>
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full md:w-auto">
              <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-2xl min-w-[130px]">
                <span className="text-[11px] text-slate-400 font-medium block">{isAr ? "سعر التكلفة" : "Unit Cost"}</span>
                <span className="text-sm font-black font-mono text-white mt-0.5 block">
                  {formatCurrency(selectedProduct.costPrice, organization.currency, locale)}
                </span>
              </div>

              <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-2xl min-w-[130px]">
                <span className="text-[11px] text-slate-400 font-medium block">{isAr ? "الرصيد الفعلي الحالي" : "Actual Stock"}</span>
                <span className="text-sm font-black font-mono text-emerald-400 mt-0.5 block">
                  {currentTotalStock} {isAr ? "قطعة" : "pcs"}
                </span>
              </div>

              <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-2xl min-w-[130px] col-span-2 sm:col-span-1">
                <span className="text-[11px] text-slate-400 font-medium block">{isAr ? "قيمة المخزون بالتكلفة" : "Valuation Value"}</span>
                <span className="text-sm font-black font-mono text-sky-400 mt-0.5 block">
                  {formatCurrency(currentValuation, organization.currency, locale)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kardex Ledger Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse print:text-black">
            <thead>
              <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700 print:bg-slate-200 print:text-black">
                <th className="p-3.5 rounded-r-lg">{isAr ? "التاريخ" : "Date"}</th>
                <th className="p-3.5">{isAr ? "نوع الحركة" : "Movement Type"}</th>
                <th className="p-3.5 font-mono">{isAr ? "رقم المرجع" : "Ref Number"}</th>
                <th className="p-3.5">{isAr ? "الطرف (العميل / المورد / المصدر)" : "Party / Partner"}</th>
                <th className="p-3.5">{isAr ? "المستودع" : "Warehouse"}</th>
                <th className="p-3.5 text-center text-emerald-400 print:text-black">{isAr ? "الوارد (In)" : "In Qty"}</th>
                <th className="p-3.5 text-center text-rose-400 print:text-black">{isAr ? "المنصرف (Out)" : "Out Qty"}</th>
                <th className="p-3.5 text-center font-mono">{isAr ? "تكلفة الوحدة" : "Unit Cost"}</th>
                <th className="p-3.5 text-center font-mono">{isAr ? "إجمالي الحركة" : "Total Cost"}</th>
                <th className="p-3.5 text-center font-mono text-emerald-400 print:text-black">{isAr ? "الرصيد التراكمي" : "Running Balance"}</th>
                <th className="p-3.5 rounded-l-lg text-center print:hidden">{isAr ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono print:divide-slate-300">
              {kardexRecords.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-10 text-center text-slate-500 font-sans">
                    {isAr ? "لا توجد حركات مسجلة لهذا الصنف بالفترة والمستودع المحددين" : "No movements found for this selection"}
                  </td>
                </tr>
              ) : (
                kardexRecords.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors print:hover:bg-transparent">
                    <td className="p-3.5 text-slate-300 font-sans print:text-black">{formatDate(r.date, locale)}</td>
                    <td className="p-3.5 font-sans font-bold">
                      {r.movementType === "opening_balance" && (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px]">
                          {isAr ? "رصيد افتتاحي" : "Opening Balance"}
                        </span>
                      )}
                      {r.movementType === "purchase_receipt" && (
                        <span className="px-2 py-0.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[11px]">
                          {isAr ? "توريد مشتريات" : "Purchase Receipt"}
                        </span>
                      )}
                      {r.movementType === "sales_issue" && (
                        <span className="px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px]">
                          {isAr ? "صرف مبيعات" : "Sales Issue"}
                        </span>
                      )}
                      {r.movementType === "sales_return" && (
                        <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px]">
                          {isAr ? "مرتجع مبيعات" : "Sales Return"}
                        </span>
                      )}
                      {r.movementType === "purchase_return" && (
                        <span className="px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[11px]">
                          {isAr ? "مرتجع مشتريات" : "Purchase Return"}
                        </span>
                      )}
                      {(r.movementType === "transfer_in" || r.movementType === "transfer_out") && (
                        <span className="px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[11px]">
                          {isAr ? "تحويل مستودعي" : "Transfer"}
                        </span>
                      )}
                      {r.movementType === "adjustment" && (
                        <span className="px-2 py-0.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[11px]">
                          {isAr ? "تسوية جردية" : "Adjustment"}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-300 font-bold print:text-black">{r.referenceNumber}</td>
                    <td className="p-3.5 font-sans font-semibold text-white print:text-black">
                      {r.partnerName || "---"}
                    </td>
                    <td className="p-3.5 font-sans text-slate-400 print:text-black">
                      {r.warehouseName || "---"}
                    </td>
                    <td className="p-3.5 text-center font-bold text-emerald-400 print:text-black">
                      {r.inQuantity > 0 ? ("+" + r.inQuantity) : "-"}
                    </td>
                    <td className="p-3.5 text-center font-bold text-rose-400 print:text-black">
                      {r.outQuantity > 0 ? ("-" + r.outQuantity) : "-"}
                    </td>
                    <td className="p-3.5 text-center text-slate-300 print:text-black">
                      {formatCurrency(r.unitCost, organization.currency, locale)}
                    </td>
                    <td className="p-3.5 text-center text-slate-300 print:text-black">
                      {formatCurrency(r.totalCost, organization.currency, locale)}
                    </td>
                    <td className="p-3.5 text-center font-black text-white bg-slate-950/50 print:bg-transparent print:text-black">
                      {r.runningBalance}
                    </td>
                    <td className="p-3.5 text-center print:hidden">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setViewRecord(r)}
                          title={isAr ? "عرض تفاصيل الحركة" : "View Transaction"}
                          className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {canManageInventory && r.movementId && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(r)}
                              title={isAr ? "تعديل الحركة" : "Edit Transaction"}
                              className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTargetId(r.movementId || null)}
                              title={isAr ? "حذف الحركة" : "Delete Transaction"}
                              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {kardexRecords.length > 0 && (
              <tfoot>
                <tr className="bg-slate-950 text-white font-bold border-t border-slate-700 font-mono print:bg-slate-200 print:text-black">
                  <td colSpan={5} className="p-3.5 font-sans">
                    {isAr ? "الإجمالي الكلي للحركات المعروضة:" : "Totals:"}
                  </td>
                  <td className="p-3.5 text-center text-emerald-400 print:text-black font-bold">
                    +{kardexRecords.reduce((sum, r) => sum + r.inQuantity, 0)}
                  </td>
                  <td className="p-3.5 text-center text-rose-400 print:text-black font-bold">
                    -{kardexRecords.reduce((sum, r) => sum + r.outQuantity, 0)}
                  </td>
                  <td colSpan={2} className="p-3.5 text-center text-slate-400 print:text-black">
                    {formatCurrency(kardexRecords.reduce((sum, r) => sum + r.totalCost, 0), organization.currency, locale)}
                  </td>
                  <td className="p-3.5 text-center text-emerald-400 font-black text-sm print:text-black">
                    {kardexRecords[kardexRecords.length - 1]?.runningBalance || 0}
                  </td>
                  <td className="print:hidden"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* View Transaction Modal */}
      <Modal
        isOpen={!!viewRecord}
        onClose={() => setViewRecord(null)}
        title={isAr ? "تفاصيل حركة المخزون (Kardex Entry)" : "Transaction Details"}
        maxWidth="xl"
      >
        {viewRecord && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div>
                <span className="text-slate-400 block text-[11px]">{isAr ? "نوع الحركة:" : "Movement Type:"}</span>
                <span className="font-bold text-white text-sm mt-0.5 block">{viewRecord.movementType}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">{isAr ? "رقم المرجع / الفاتورة:" : "Reference Number:"}</span>
                <span className="font-mono font-bold text-emerald-400 text-sm mt-0.5 block">{viewRecord.referenceNumber}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">{isAr ? "التاريخ:" : "Date:"}</span>
                <span className="font-mono text-white mt-0.5 block">{formatDate(viewRecord.date, locale)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">{isAr ? "المستودع:" : "Warehouse:"}</span>
                <span className="font-semibold text-white mt-0.5 block">{viewRecord.warehouseName || "---"}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block text-[11px]">{isAr ? "الطرف / العميل / المورد:" : "Party / Partner:"}</span>
                <span className="font-bold text-white text-sm mt-0.5 block">{viewRecord.partnerName || "---"}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div>
                <span className="text-slate-400 block text-[11px]">{isAr ? "الكمية:" : "Quantity:"}</span>
                <span className={"font-mono font-bold text-sm mt-0.5 block " + (viewRecord.inQuantity > 0 ? "text-emerald-400" : "text-rose-400")}>
                  {viewRecord.inQuantity > 0 ? `+${viewRecord.inQuantity}` : `-${viewRecord.outQuantity}`}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">{isAr ? "تكلفة الوحدة:" : "Unit Cost:"}</span>
                <span className="font-mono font-bold text-white text-sm mt-0.5 block">
                  {formatCurrency(viewRecord.unitCost, organization.currency, locale)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">{isAr ? "إجمالي التكلفة:" : "Total Cost:"}</span>
                <span className="font-mono font-bold text-white text-sm mt-0.5 block">
                  {formatCurrency(viewRecord.totalCost, organization.currency, locale)}
                </span>
              </div>
            </div>

            {viewRecord.notes && (
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[11px]">{isAr ? "ملاحظات وبيان الحركة:" : "Notes:"}</span>
                <span className="text-slate-200 mt-1 block font-sans">{viewRecord.notes}</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setViewRecord(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold"
              >
                {isAr ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Transaction Modal */}
      <Modal
        isOpen={!!editRecord}
        onClose={() => !isSubmitting && setEditRecord(null)}
        title={isAr ? "تعديل حركة المخزون وإعادة احتساب الرصيد" : "Edit Stock Movement"}
        maxWidth="lg"
      >
        {editRecord && (
          <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
            {formError && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-2 text-amber-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                {isAr
                  ? "تعديل كمية أو تكلفة الحركة سيعيد احتساب رصيد المستودع والقيود المحاسبية والأرصدة التراكمية تلقائياً."
                  : "Editing this transaction will automatically recalculate warehouse balances and audit logs."}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "التاريخ *" : "Date *"}</label>
                <input
                  type="date"
                  required
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "المستودع *" : "Warehouse *"}</label>
                <select
                  value={editWarehouseId}
                  onChange={(e) => setEditWarehouseId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.nameAr} ({w.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "الكمية *" : "Quantity *"}</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "تكلفة الوحدة *" : "Unit Cost *"}</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  value={editUnitCost}
                  onChange={(e) => setEditUnitCost(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "اسم الطرف / العميل / المورد" : "Party Name"}</label>
                <input
                  type="text"
                  value={editPartnerName}
                  onChange={(e) => setEditPartnerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "ملاحظات وبيان التعديل" : "Notes"}</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setEditRecord(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold disabled:opacity-50 cursor-pointer"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isAr ? "جاري الحفظ..." : "Saving..."}</span>
                  </>
                ) : (
                  <span>{isAr ? "حفظ وتحديث الرصيد" : "Save Changes"}</span>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTargetId}
        onClose={() => !isSubmitting && setDeleteTargetId(null)}
        title={isAr ? "تأكيد حذف حركة المخزون" : "Delete Stock Movement"}
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-300">
            {isAr
              ? "هل أنت متأكد من رغبتك في حذف هذه الحركة؟ سيتم عكس تأثير الكمية على رصيد المستودع الحالي وتحديث سجل كارت الصنف."
              : "Are you sure you want to delete this movement? The stock impact will be reversed."}
          </p>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setDeleteTargetId(null)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold disabled:opacity-50 cursor-pointer"
            >
              {isAr ? "تراجع" : "Cancel"}
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirmDelete}
              className="flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isAr ? "جاري الحذف..." : "Deleting..."}</span>
                </>
              ) : (
                <span>{isAr ? "تأكيد الحذف" : "Confirm Delete"}</span>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
