"use client";

import React, { useState } from "react";
import { useERP } from "@/context/erp-context";
import { computeStockKardex } from "@/lib/accounting-engine";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FileSpreadsheet, Package, Warehouse, Calendar, ArrowDownRight, ArrowUpRight } from "lucide-react";

export default function KardexPage() {
  const { products, warehouses, stockMovements, locale, organization } = useERP();
  const isAr = locale === "ar";

  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || "");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("all");

  const selectedProduct = products.find(p => p.id === selectedProductId) || products[0];
  const kardexRecords = selectedProduct ? computeStockKardex(selectedProduct.id, selectedWarehouseId, stockMovements) : [];

  const currentTotalStock = selectedProduct
    ? (selectedWarehouseId === "all"
        ? Object.values(selectedProduct.warehouseStock).reduce((a, b) => a + b, 0)
        : (selectedProduct.warehouseStock[selectedWarehouseId] || 0))
    : 0;

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm">
        <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
          <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
          <span>{isAr ? "كارت الصنف وحركة المخزون (Kardex)" : "Stock Card & Kardex Ledger"}</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          {isAr ? "سجل تتبعي شامل للوارد والمنصرف والرصيد المتراكم لكل صنف مع تكلفة الوحدة" : "Detailed audit trail of stock receipts, issues, unit costs, and running balances"}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-900/70 p-4 rounded-2xl border border-slate-800">
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5">
            {isAr ? "اختر المنتج المراد عرضه:" : "Select Product:"}
          </label>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
          >
            {products.map(p => (
              <option key={p.id} value={p.id}>
                {p.nameAr} ({p.sku})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5">
            {isAr ? "المستودع المستهدف:" : "Warehouse Filter:"}
          </label>
          <select
            value={selectedWarehouseId}
            onChange={(e) => setSelectedWarehouseId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">{isAr ? "جميع المستودعات (إجمالي عام)" : "All Warehouses (Consolidated)"}</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.nameAr} ({w.code})</option>
            ))}
          </select>
        </div>
      </div>

      {selectedProduct && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <span className="text-xs text-slate-400 font-semibold block">{isAr ? "كود الصنف / SKU" : "SKU"}</span>
            <span className="text-base font-black font-mono text-white mt-1 block">{selectedProduct.sku}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <span className="text-xs text-slate-400 font-semibold block">{isAr ? "سعر التكلفة" : "Unit Cost"}</span>
            <span className="text-base font-black font-mono text-emerald-400 mt-1 block">
              {formatCurrency(selectedProduct.costPrice, organization.currency, locale)}
            </span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <span className="text-xs text-slate-400 font-semibold block">{isAr ? "سعر البيع" : "Selling Price"}</span>
            <span className="text-base font-black font-mono text-white mt-1 block">
              {formatCurrency(selectedProduct.sellingPrice, organization.currency, locale)}
            </span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <span className="text-xs text-slate-400 font-semibold block">{isAr ? "الرصيد الفعلي الحالي" : "Current Running Stock"}</span>
            <span className="text-base font-black font-mono text-emerald-400 mt-1 block">
              {currentTotalStock} {isAr ? "قطعة" : "pcs"}
            </span>
          </div>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                <th className="p-3.5 rounded-r-lg">{isAr ? "التاريخ" : "Date"}</th>
                <th className="p-3.5">{isAr ? "نوع الحركة" : "Movement Type"}</th>
                <th className="p-3.5 font-mono">{isAr ? "رقم المرجع" : "Ref Number"}</th>
                <th className="p-3.5 text-center text-emerald-400">{isAr ? "الوارد (In)" : "In Qty"}</th>
                <th className="p-3.5 text-center text-rose-400">{isAr ? "المنصرف (Out)" : "Out Qty"}</th>
                <th className="p-3.5 text-center font-mono">{isAr ? "تكلفة الوحدة" : "Unit Cost"}</th>
                <th className="p-3.5 text-center font-mono">{isAr ? "إجمالي الحركة" : "Total Cost"}</th>
                <th className="p-3.5 rounded-l-lg text-center font-mono text-emerald-400">{isAr ? "الرصيد التراكمي" : "Balance Qty"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {kardexRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 font-sans">
                    {isAr ? "لا توجد حركات مخزنية مسجلة لهذا الصنف" : "No stock movements recorded"}
                  </td>
                </tr>
              ) : (
                kardexRecords.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3.5 text-slate-300 font-sans">{formatDate(r.date, locale)}</td>
                    <td className="p-3.5 font-sans font-bold text-white">
                      {r.movementType === "opening_balance" && (isAr ? "رصيد افتتاحي" : "Opening Balance")}
                      {r.movementType === "sales_issue" && (isAr ? "صرف مبيعات" : "Sales Issue")}
                      {r.movementType === "purchase_receipt" && (isAr ? "إضافة مشتريات" : "Purchase Receipt")}
                      {(r.movementType === "transfer_in" || r.movementType === "transfer_out") && (isAr ? "تحويل مستودعي" : "Transfer")}
                    </td>
                    <td className="p-3.5 text-slate-400">{r.referenceNumber}</td>
                    <td className="p-3.5 text-center font-bold text-emerald-400">
                      {r.inQuantity > 0 ? ("+" + r.inQuantity) : "-"}
                    </td>
                    <td className="p-3.5 text-center font-bold text-rose-400">
                      {r.outQuantity > 0 ? ("-" + r.outQuantity) : "-"}
                    </td>
                    <td className="p-3.5 text-center text-slate-300">
                      {formatCurrency(r.unitCost, organization.currency, locale)}
                    </td>
                    <td className="p-3.5 text-center text-slate-300">
                      {formatCurrency(r.totalCost, organization.currency, locale)}
                    </td>
                    <td className="p-3.5 text-center font-bold text-white bg-slate-950/40">
                      {r.balanceQuantity}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
