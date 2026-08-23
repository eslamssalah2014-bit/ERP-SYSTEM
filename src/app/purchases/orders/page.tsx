"use client";

import React from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ShoppingBag } from "lucide-react";

export default function PurchaseOrdersPage() {
  const { suppliers, locale, organization } = useERP();
  const isAr = locale === "ar";

  const sampleOrders = [
    {
      id: "po_01",
      orderNumber: "PO-2026-001",
      supplierName: "شركة ديل للتوزيع - مصر",
      orderDate: "2026-08-01",
      expectedDate: "2026-08-10",
      totalAmount: 64000,
      status: "received"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm">
        <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
          <ShoppingBag className="w-6 h-6 text-sky-400" />
          <span>{isAr ? "أوامر الشراء والتوريد (Purchase Orders)" : "Purchase Orders"}</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          {isAr ? "إدارة وتتبع أوامر الشراء الصادرة للموردين ومطابقتها عند الاستلام" : "Manage and track vendor purchase orders"}
        </p>
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
            {sampleOrders.map((po, idx) => (
              <tr key={po.id} className="hover:bg-slate-800/30">
                <td className="p-3.5 text-slate-500 font-mono">{idx + 1}</td>
                <td className="p-3.5 font-bold text-white font-mono">{po.orderNumber}</td>
                <td className="p-3.5 text-slate-200">{po.supplierName}</td>
                <td className="p-3.5 text-slate-400">{formatDate(po.orderDate, locale)}</td>
                <td className="p-3.5 text-slate-400">{formatDate(po.expectedDate, locale)}</td>
                <td className="p-3.5 text-center font-mono font-bold text-sky-400">
                  {formatCurrency(po.totalAmount, organization.currency, locale)}
                </td>
                <td className="p-3.5 text-center">
                  <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-xl font-bold border border-emerald-500/20">
                    {isAr ? "تم الاستلام والمطابقة" : "Received"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
