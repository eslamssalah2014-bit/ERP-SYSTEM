"use client";

import React from "react";
import { useERP } from "@/context/erp-context";
import { computeIncomeStatement } from "@/lib/accounting-engine";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, Printer } from "lucide-react";

export default function IncomeStatementPage() {
  const { accounts, journalEntries, organization, locale } = useERP();
  const isAr = locale === "ar";

  const { revenues, cogs, expenses, totalRevenue, totalCOGS, grossProfit, totalExpenses, netIncome } = computeIncomeStatement(accounts, journalEntries);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <TrendingUp className="w-6 h-6 text-emerald-400" />
            <span>{isAr ? "قائمة الدخل والأرباح والخسائر (Income Statement / P&L)" : "Income Statement (P&L)"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAr ? "تقرير الأداء المالي وصافي الربح التشغيلي للفترة الحالية" : "Financial performance, gross margin, and net profit report"}
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
        >
          <Printer className="w-4 h-4" />
          <span>{isAr ? "طباعة التقرير" : "Print P&L"}</span>
        </button>
      </div>

      {/* Net Income Highlight Card */}
      <div className="bg-gradient-to-r from-slate-900 to-emerald-950/40 p-6 rounded-3xl border border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-slate-400 block">{isAr ? "صافي الربح للفترة (Net Income):" : "Net Operating Profit:"}</span>
          <span className="text-3xl font-black text-emerald-400 font-mono mt-1 block">
            {formatCurrency(netIncome, organization.currency, locale)}
          </span>
        </div>
        <div className="text-left">
          <span className="text-xs font-bold text-slate-400 block">{isAr ? "مجمل الربح (Gross Profit):" : "Gross Profit:"}</span>
          <span className="text-xl font-black text-white font-mono mt-1 block">
            {formatCurrency(grossProfit, organization.currency, locale)}
          </span>
        </div>
      </div>

      {/* P&L Statement Sections */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
        {/* 1. Revenues */}
        <div>
          <h3 className="text-sm font-bold text-emerald-400 border-b border-slate-800 pb-2 mb-3">
            {isAr ? "1. الإيرادات والمبيعات (Revenues)" : "1. Revenues"}
          </h3>
          <div className="space-y-2 text-xs">
            {revenues.map(acc => (
              <div key={acc.id} className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-300">{acc.code} - {isAr ? acc.nameAr : acc.nameEn}</span>
                <span className="font-mono font-bold text-white">{formatCurrency(acc.balance, organization.currency, locale)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold pt-2 text-emerald-400 text-sm">
              <span>{isAr ? "إجمالي الإيرادات:" : "Total Revenues:"}</span>
              <span className="font-mono">{formatCurrency(totalRevenue, organization.currency, locale)}</span>
            </div>
          </div>
        </div>

        {/* 2. COGS */}
        <div>
          <h3 className="text-sm font-bold text-sky-400 border-b border-slate-800 pb-2 mb-3">
            {isAr ? "2. تكلفة البضاعة المباعة (Cost of Goods Sold - COGS)" : "2. Cost of Goods Sold"}
          </h3>
          <div className="space-y-2 text-xs">
            {cogs.map(acc => (
              <div key={acc.id} className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-300">{acc.code} - {isAr ? acc.nameAr : acc.nameEn}</span>
                <span className="font-mono font-bold text-white">{formatCurrency(acc.balance, organization.currency, locale)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold pt-2 text-sky-400 text-sm">
              <span>{isAr ? "إجمالي تكلفة المبيعات:" : "Total COGS:"}</span>
              <span className="font-mono">{formatCurrency(totalCOGS, organization.currency, locale)}</span>
            </div>
          </div>
        </div>

        {/* 3. Expenses */}
        <div>
          <h3 className="text-sm font-bold text-amber-400 border-b border-slate-800 pb-2 mb-3">
            {isAr ? "3. المصروفات التشغيلية والإدارية (Operating Expenses)" : "3. Operating Expenses"}
          </h3>
          <div className="space-y-2 text-xs">
            {expenses.map(acc => (
              <div key={acc.id} className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-300">{acc.code} - {isAr ? acc.nameAr : acc.nameEn}</span>
                <span className="font-mono font-bold text-white">{formatCurrency(acc.balance, organization.currency, locale)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold pt-2 text-amber-400 text-sm">
              <span>{isAr ? "إجمالي المصروفات التشغيلية:" : "Total Expenses:"}</span>
              <span className="font-mono">{formatCurrency(totalExpenses, organization.currency, locale)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
