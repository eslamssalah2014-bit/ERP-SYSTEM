"use client";

import React from "react";
import { useERP } from "@/context/erp-context";
import { computeBalanceSheet } from "@/lib/accounting-engine";
import { formatCurrency } from "@/lib/utils";
import { Scale, Printer, CheckCircle2 } from "lucide-react";

export default function BalanceSheetPage() {
  const { accounts, journalEntries, organization, locale } = useERP();
  const isAr = locale === "ar";

  const { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity, netIncome, isBalanced } = computeBalanceSheet(accounts, journalEntries);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Scale className="w-6 h-6 text-emerald-400" />
            <span>{isAr ? "الميزانية العمومية وقائمة المركز المالي (Balance Sheet)" : "Balance Sheet"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAr ? "الأصول = الخصوم + حقوق الملكية (مع إدراج صافي أرباح الفترة)" : "Assets = Liabilities + Equity balance verification"}
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
        >
          <Printer className="w-4 h-4" />
          <span>{isAr ? "طباعة المركز المالي" : "Print"}</span>
        </button>
      </div>

      <div className={"p-4 rounded-2xl border flex items-center justify-between text-xs font-bold " + (
        isBalanced
          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
          : "bg-rose-500/10 border-rose-500/20 text-rose-400"
      )}>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{isBalanced ? (isAr ? "معادلة المركز المالي متطابقة تماماً (الأصول = الخصوم + الملكية)" : "Balance Sheet Equation Holds") : "Imbalanced"}</span>
        </div>
        <div className="font-mono">
          {formatCurrency(totalAssets, organization.currency, locale)} = {formatCurrency(totalLiabilities + totalEquity, organization.currency, locale)}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Assets Column */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-emerald-400 border-b border-slate-800 pb-2">
            {isAr ? "الأصول والموجودات (Assets)" : "Assets"}
          </h3>
          <div className="space-y-2 text-xs">
            {assets.map(acc => (
              <div key={acc.id} className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-300">{acc.code} - {isAr ? acc.nameAr : acc.nameEn}</span>
                <span className="font-mono font-bold text-white">{formatCurrency(acc.balance, organization.currency, locale)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold pt-3 text-emerald-400 text-sm border-t border-slate-700">
              <span>{isAr ? "إجمالي الأصول:" : "Total Assets:"}</span>
              <span className="font-mono">{formatCurrency(totalAssets, organization.currency, locale)}</span>
            </div>
          </div>
        </div>

        {/* Liabilities & Equity Column */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          {/* Liabilities */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-rose-400 border-b border-slate-800 pb-2">
              {isAr ? "الخصوم والالتزامات (Liabilities)" : "Liabilities"}
            </h3>
            <div className="space-y-2 text-xs">
              {liabilities.map(acc => (
                <div key={acc.id} className="flex justify-between py-1 border-b border-slate-800/40">
                  <span className="text-slate-300">{acc.code} - {isAr ? acc.nameAr : acc.nameEn}</span>
                  <span className="font-mono font-bold text-white">{formatCurrency(acc.balance, organization.currency, locale)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold pt-2 text-rose-400 text-xs">
                <span>{isAr ? "إجمالي الخصوم:" : "Total Liabilities:"}</span>
                <span className="font-mono">{formatCurrency(totalLiabilities, organization.currency, locale)}</span>
              </div>
            </div>
          </div>

          {/* Equity */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-purple-400 border-b border-slate-800 pb-2">
              {isAr ? "حقوق الملكية (Equity)" : "Equity"}
            </h3>
            <div className="space-y-2 text-xs">
              {equity.map(acc => (
                <div key={acc.id} className="flex justify-between py-1 border-b border-slate-800/40">
                  <span className="text-slate-300">{acc.code} - {isAr ? acc.nameAr : acc.nameEn}</span>
                  <span className="font-mono font-bold text-white">{formatCurrency(acc.balance, organization.currency, locale)}</span>
                </div>
              ))}
              <div className="flex justify-between py-1 border-b border-slate-800/40 text-emerald-400 font-semibold">
                <span>{isAr ? "صافي أرباح الفترة الحالية" : "Current Period Net Profit"}</span>
                <span className="font-mono font-bold">{formatCurrency(netIncome, organization.currency, locale)}</span>
              </div>
              <div className="flex justify-between font-bold pt-2 text-purple-400 text-xs">
                <span>{isAr ? "إجمالي حقوق الملكية:" : "Total Equity:"}</span>
                <span className="font-mono">{formatCurrency(totalEquity, organization.currency, locale)}</span>
              </div>
            </div>
          </div>

          {/* Liabilities + Equity Total */}
          <div className="flex justify-between font-bold pt-3 text-white text-sm border-t border-slate-700">
            <span>{isAr ? "إجمالي الخصوم وحقوق الملكية:" : "Total Liabilities & Equity:"}</span>
            <span className="font-mono text-emerald-400">{formatCurrency(totalLiabilities + totalEquity, organization.currency, locale)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
