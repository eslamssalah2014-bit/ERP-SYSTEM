"use client";

import React, { useState } from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import { BookOpen, Search } from "lucide-react";

export default function LedgerPage() {
  const { accounts, journalEntries, organization, locale } = useERP();
  const isAr = locale === "ar";
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || "");

  const selectedAccount = accounts.find(a => a.id === selectedAccountId) || accounts[0];

  // Compute ledger lines for selected account
  let runningBalance = 0;
  const ledgerLines: any[] = [];

  journalEntries.forEach(entry => {
    entry.lines.forEach(line => {
      if (line.accountId === selectedAccountId) {
        const change = line.debit - line.credit;
        runningBalance += selectedAccount?.nature === "debit" ? change : -change;
        ledgerLines.push({
          date: entry.date,
          entryNumber: entry.entryNumber,
          description: entry.description,
          debit: line.debit,
          credit: line.credit,
          balance: runningBalance,
        });
      }
    });
  });

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm">
        <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
          <BookOpen className="w-6 h-6 text-emerald-400" />
          <span>{isAr ? "دفتر الأستاذ العام (General Ledger)" : "General Ledger"}</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          {isAr ? "كشف حركة تفصيلي لكل حساب دفتري مع الرصيد المتراكم لحظياً" : "Detailed ledger entries and running balance per account"}
        </p>
      </div>

      <div className="bg-slate-900/70 p-4 rounded-2xl border border-slate-800">
        <label className="block text-xs font-bold text-slate-400 mb-1.5">
          {isAr ? "اختر الحساب الدفتري المراد فحصه:" : "Select Ledger Account:"}
        </label>
        <select
          value={selectedAccountId}
          onChange={(e) => setSelectedAccountId(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
        >
          {accounts.map(a => (
            <option key={a.id} value={a.id}>
              {a.code} - {a.nameAr} ({formatCurrency(a.balance, organization.currency, locale)})
            </option>
          ))}
        </select>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                <th className="p-3.5 rounded-r-lg">{isAr ? "التاريخ" : "Date"}</th>
                <th className="p-3.5 font-mono">{isAr ? "رقم القيد" : "Entry No"}</th>
                <th className="p-3.5">{isAr ? "البيان" : "Description"}</th>
                <th className="p-3.5 text-center font-mono text-emerald-400">{isAr ? "مدين (Debit)" : "Debit"}</th>
                <th className="p-3.5 text-center font-mono text-sky-400">{isAr ? "دائن (Credit)" : "Credit"}</th>
                <th className="p-3.5 rounded-l-lg text-center font-mono text-white">{isAr ? "الرصيد التراكمي" : "Balance"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {ledgerLines.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-sans">
                    {isAr ? "لا توجد حركات مقيدة على هذا الحساب" : "No transactions posted"}
                  </td>
                </tr>
              ) : (
                ledgerLines.map((l, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30">
                    <td className="p-3.5 font-sans text-slate-300">{formatDate(l.date, locale)}</td>
                    <td className="p-3.5 text-slate-400 font-bold">{l.entryNumber}</td>
                    <td className="p-3.5 font-sans text-white">{l.description}</td>
                    <td className="p-3.5 text-center font-bold text-emerald-400">
                      {l.debit > 0 ? formatCurrency(l.debit, organization.currency, locale) : "-"}
                    </td>
                    <td className="p-3.5 text-center font-bold text-sky-400">
                      {l.credit > 0 ? formatCurrency(l.credit, organization.currency, locale) : "-"}
                    </td>
                    <td className="p-3.5 text-center font-black text-white bg-slate-950/40">
                      {formatCurrency(l.balance, organization.currency, locale)}
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
