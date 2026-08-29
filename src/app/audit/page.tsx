"use client";

import React from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import TableSkeleton from "@/components/ui/TableSkeleton";
import { ShieldCheck, User, Clock } from "lucide-react";

export default function AuditTrailPage() {
  const { auditLogs, locale, isLoadingData } = useERP();
  const isAr = locale === "ar";

  if (isLoadingData) {
    return <TableSkeleton rows={6} columns={5} summaryCards={0} isAr={isAr} />;
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm">
        <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
          <span>{isAr ? "سجل التدقيق والرقابة الأمنية (Audit Trail)" : "Audit Trail & Activity Logs"}</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          {isAr ? "سجل غير قابل للتعديل يوثق جميع عمليات الإنشاء والتعديل والترحيل المالي مع هوية المستخدم والوقت" : "Immutable ledger recording all user actions, logins, and journal postings"}
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                <th className="p-3.5 rounded-r-lg">{isAr ? "الوقت والتاريخ" : "Timestamp"}</th>
                <th className="p-3.5">{isAr ? "المستخدم" : "User"}</th>
                <th className="p-3.5">{isAr ? "نوع العملية" : "Action"}</th>
                <th className="p-3.5">{isAr ? "الكائن / الوحدة" : "Entity"}</th>
                <th className="p-3.5 rounded-l-lg">{isAr ? "تفاصيل العملية" : "Details"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-500 font-bold">
                    {isAr ? "لا توجد سجلات تدقيق حالياً." : "No audit logs recorded yet."}
                  </td>
                </tr>
              ) : (
                auditLogs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30">
                    <td className="p-3.5 text-slate-400 font-mono flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{log.createdAt}</span>
                    </td>
                    <td className="p-3.5 font-bold text-white">{log.userName}</td>
                    <td className="p-3.5 font-mono">
                      <span className="px-2 py-0.5 bg-slate-800 text-emerald-400 rounded border border-slate-700 font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-300 font-medium">{log.entityType}</td>
                    <td className="p-3.5 text-slate-400 font-sans text-[11px]">{log.details}</td>
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
