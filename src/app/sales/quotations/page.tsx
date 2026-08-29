"use client";

import React from "react";
import Link from "next/link";
import { useERP } from "@/context/erp-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import TableSkeleton from "@/components/ui/TableSkeleton";
import { FileText, Plus, ShoppingCart, ArrowRight } from "lucide-react";

export default function QuotationsPage() {
  const { salesInvoices, locale, organization, isLoadingData } = useERP();
  const isAr = locale === "ar";

  const quotations = salesInvoices.filter(inv => inv.invoiceType === "quotation");

  if (isLoadingData) {
    return <TableSkeleton rows={5} columns={7} summaryCards={0} isAr={isAr} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-emerald-400" />
            <span>{isAr ? "عروض الأسعار والصفقات" : "Sales Quotations"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAr ? "إدارة عروض الأسعار المسجلة مع إمكانية إصدار عروض جديدة من شاشة المبيعات" : "Manage registered quotations with instant conversion to invoices"}
          </p>
        </div>

        <Link
          href="/sales"
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/60 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{isAr ? "إنشاء عرض سعر جديد" : "New Quotation"}</span>
        </Link>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <table className="w-full text-xs text-right border-collapse">
          <thead>
            <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
              <th className="p-3.5 rounded-r-lg">#</th>
              <th className="p-3.5">{isAr ? "رقم العرض" : "Quote No"}</th>
              <th className="p-3.5">{isAr ? "العميل" : "Customer"}</th>
              <th className="p-3.5">{isAr ? "تاريخ العرض" : "Date"}</th>
              <th className="p-3.5">{isAr ? "ساري حتى" : "Valid Until"}</th>
              <th className="p-3.5 text-center font-mono">{isAr ? "القيمة الإجمالية" : "Total"}</th>
              <th className="p-3.5 rounded-l-lg text-center">{isAr ? "الحالة" : "Status"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {quotations.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-slate-500 font-bold">
                  {isAr ? "لا توجد عروض أسعار مسجلة حالياً." : "No quotations registered yet."}
                </td>
              </tr>
            ) : (
              quotations.map((q, idx) => (
                <tr key={q.id} className="hover:bg-slate-800/30">
                  <td className="p-3.5 text-slate-500 font-mono">{idx + 1}</td>
                  <td className="p-3.5 font-bold text-white font-mono">{q.invoiceNumber}</td>
                  <td className="p-3.5 text-slate-200">{q.customerName}</td>
                  <td className="p-3.5 text-slate-400">{formatDate(q.date, locale)}</td>
                  <td className="p-3.5 text-slate-400">{formatDate(q.dueDate || q.date, locale)}</td>
                  <td className="p-3.5 text-center font-mono font-bold text-emerald-400">
                    {formatCurrency(q.grandTotal, organization.currency, locale)}
                  </td>
                  <td className="p-3.5 text-center">
                    <span className="px-2.5 py-1 bg-sky-500/10 text-sky-400 rounded-xl font-bold border border-sky-500/20">
                      {isAr ? "عرض سعر" : "Quotation"}
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
