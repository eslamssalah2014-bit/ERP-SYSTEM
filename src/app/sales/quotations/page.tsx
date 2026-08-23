"use client";

import React from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FileText, Plus } from "lucide-react";

export default function QuotationsPage() {
  const { customers, locale, organization } = useERP();
  const isAr = locale === "ar";

  const sampleQuotations = [
    {
      id: "quot_01",
      quotationNumber: "QUOT-2026-001",
      customerName: "شركة وادي التكنولوجيا",
      date: "2026-08-10",
      validUntil: "2026-08-30",
      grandTotal: 45000,
      status: "sent"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-emerald-400" />
            <span>{isAr ? "عروض الأسعار والصفقات" : "Sales Quotations"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAr ? "إنشاء عروض الأسعار مع التحويل الفوري بنقرة واحدة إلى فواتير مبيعات" : "Create quotations and 1-click convert to sales invoices"}
          </p>
        </div>
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
            {sampleQuotations.map((q, idx) => (
              <tr key={q.id} className="hover:bg-slate-800/30">
                <td className="p-3.5 text-slate-500 font-mono">{idx + 1}</td>
                <td className="p-3.5 font-bold text-white font-mono">{q.quotationNumber}</td>
                <td className="p-3.5 text-slate-200">{q.customerName}</td>
                <td className="p-3.5 text-slate-400">{formatDate(q.date, locale)}</td>
                <td className="p-3.5 text-slate-400">{formatDate(q.validUntil, locale)}</td>
                <td className="p-3.5 text-center font-mono font-bold text-emerald-400">
                  {formatCurrency(q.grandTotal, organization.currency, locale)}
                </td>
                <td className="p-3.5 text-center">
                  <span className="px-2.5 py-1 bg-sky-500/10 text-sky-400 rounded-xl font-bold border border-sky-500/20">
                    {isAr ? "مرسل للعميل" : "Sent"}
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
