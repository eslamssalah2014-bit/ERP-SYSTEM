"use client";

import React from "react";
import Link from "next/link";
import { useERP } from "@/context/erp-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import TableSkeleton from "@/components/ui/TableSkeleton";
import { ShoppingBag, Plus } from "lucide-react";

export default function PurchaseOrdersPage() {
  const { purchaseInvoices, locale, organization, isLoadingData } = useERP();
  const isAr = locale === "ar";

  const orders = purchaseInvoices.filter(inv => inv.invoiceType === "purchase_order");

  if (isLoadingData) {
    return <TableSkeleton rows={4} columns={7} summaryCards={0} isAr={isAr} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <ShoppingBag className="w-6 h-6 text-sky-400" />
            <span>{isAr ? "أوامر الشراء والتوريد (Purchase Orders)" : "Purchase Orders"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAr ? "إدارة وتتبع أوامر الشراء الصادرة للموردين ومطابقتها عند الاستلام" : "Manage and track vendor purchase orders"}
          </p>
        </div>

        <Link
          href="/purchases"
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-sky-600 to-blue-500 hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-950/60 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{isAr ? "إنشاء أمر شراء جديد" : "New Purchase Order"}</span>
        </Link>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <table className="w-full text-xs text-right border-collapse">
          <thead>
            <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
              <th className="p-3.5 rounded-r-lg">#</th>
              <th className="p-3.5">{isAr ? "رقم أمر الشراء" : "PO Number"}</th>
              <th className="p-3.5">{isAr ? "المورد" : "Supplier"}</th>
              <th className="p-3.5">{isAr ? "تاريخ الأمر" : "Order Date"}</th>
              <th className="p-3.5">{isAr ? "تاريخ الاستلام المتوقع" : "Expected Delivery"}</th>
              <th className="p-3.5 text-center font-mono">{isAr ? "القيمة التقديرية" : "Total"}</th>
              <th className="p-3.5 rounded-l-lg text-center">{isAr ? "الحالة" : "Status"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-slate-500 font-bold">
                  {isAr ? "لا توجد أوامر شراء مسجلة حالياً." : "No purchase orders registered yet."}
                </td>
              </tr>
            ) : (
              orders.map((po, idx) => (
                <tr key={po.id} className="hover:bg-slate-800/30">
                  <td className="p-3.5 text-slate-500 font-mono">{idx + 1}</td>
                  <td className="p-3.5 font-bold text-white font-mono">{po.invoiceNumber}</td>
                  <td className="p-3.5 text-slate-200">{po.supplierName}</td>
                  <td className="p-3.5 text-slate-400">{formatDate(po.date, locale)}</td>
                  <td className="p-3.5 text-slate-400">{formatDate(po.dueDate || po.date, locale)}</td>
                  <td className="p-3.5 text-center font-mono font-bold text-sky-400">
                    {formatCurrency(po.grandTotal, organization.currency, locale)}
                  </td>
                  <td className="p-3.5 text-center">
                    <span className="px-2.5 py-1 bg-sky-500/10 text-sky-400 rounded-xl font-bold border border-sky-500/20">
                      {isAr ? "أمر شراء" : "Purchase Order"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
