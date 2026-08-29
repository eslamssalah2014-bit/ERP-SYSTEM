"use client";

import React from "react";
import { useERP } from "@/context/erp-context";
import { computeTrialBalance } from "@/lib/accounting-engine";
import { formatCurrency } from "@/lib/utils";
import TableSkeleton from "@/components/ui/TableSkeleton";
import { Scale, CheckCircle2, Printer } from "lucide-react";

export default function TrialBalancePage() {
  const { accounts, journalEntries, organization, locale, isLoadingData } = useERP();
  const isAr = locale === "ar";

  if (isLoadingData) {
    return <TableSkeleton rows={7} columns={6} summaryCards={0} isAr={isAr} />;
  }

  const { rows, totalDebit, totalCredit, isBalanced } = computeTrialBalance(accounts, journalEntries);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Scale className="w-6 h-6 text-emerald-400" />
            <span>{isAr ? "ميزان المراجعة بالأرصدة والمجاميع (Trial Balance)" : "Trial Balance"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAr ? "التحقق من توازن الأستاذ العام وتطابق إجمالي المدين والدائن لجميع الحسابات" : "Verify general ledger balance across all active accounts"}
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
        >
          <Printer className="w-4 h-4" />
          <span>{isAr ? "طباعة الميزان" : "Print"}</span>
        </button>
      </div>

      {/* Balance Indicator Banner */}
      <div className={"p-4 rounded-2xl border flex items-center justify-between text-xs font-bold " + (
        isBalanced
          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
          : "bg-rose-500/10 border-rose-500/20 text-rose-400"
      )}>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{isBalanced ? (isAr ? "ميزان المراجعة متزن تماماً (إجمالي المدين = إجمالي الدائن)" : "Trial Balance is perfectly balanced") : (isAr ? "يوجد خلل في التوازن" : "Imbalanced")}</span>
        </div>
        <div className="font-mono">
          {formatCurrency(totalDebit, organization.currency, locale)} = {formatCurrency(totalCredit, organization.currency, locale)}
        </div>
      </div>

      {/* Trial Balance Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                <th className="p-3.5 rounded-r-lg font-mono">{isAr ? "كود الحساب" : "Code"}</th>
                <th className="p-3.5">{isAr ? "اسم الحساب" : "Account"}</th>
                <th className="p-3.5 text-center font-mono text-emerald-400">{isAr ? "إجمالي المدين (Debit)" : "Debit Total"}</th>
                <th className="p-3.5 text-center font-mono text-sky-400">{isAr ? "إجمالي الدائن (Credit)" : "Credit Total"}</th>
                <th className="p-3.5 text-center font-mono text-emerald-300">{isAr ? "رصيد مدين" : "Debit Balance"}</th>
                <th className="p-3.5 rounded-l-lg text-center font-mono text-sky-300">{isAr ? "رصيد دائن" : "Credit Balance"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {rows.map(r => (
                <tr key={r.accountCode} className="hover:bg-slate-800/30">
                  <td className="p-3.5 text-slate-400 font-bold">{r.accountCode}</td>
                  <td className="p-3.5 font-sans font-bold text-white">{isAr ? r.accountNameAr : r.accountNameEn}</td>
                  <td className="p-3.5 text-center text-slate-300">
                    {r.periodDebit > 0 ? formatCurrency(r.periodDebit, organization.currency, locale) : "-"}
                  </td>
                  <td className="p-3.5 text-center text-slate-300">
                    {r.periodCredit > 0 ? formatCurrency(r.periodCredit, organization.currency, locale) : "-"}
                  </td>
                  <td className="p-3.5 text-center font-bold text-emerald-400">
                    {r.endingDebit > 0 ? formatCurrency(r.endingDebit, organization.currency, locale) : "-"}
                  </td>
                  <td className="p-3.5 text-center font-bold text-sky-400">
                    {r.endingCredit > 0 ? formatCurrency(r.endingCredit, organization.currency, locale) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-950 font-mono font-black text-sm text-white border-t border-slate-700">
                <td colSpan={2} className="p-4 font-sans">{isAr ? "الإجمالي الكلي:" : "Totals:"}</td>
                <td className="p-4 text-center text-slate-300">{formatCurrency(totalDebit, organization.currency, locale)}</td>
                <td className="p-4 text-center text-slate-300">{formatCurrency(totalCredit, organization.currency, locale)}</td>
                <td className="p-4 text-center text-emerald-400">{formatCurrency(totalDebit, organization.currency, locale)}</td>
                <td className="p-4 text-center text-sky-400">{formatCurrency(totalCredit, organization.currency, locale)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
