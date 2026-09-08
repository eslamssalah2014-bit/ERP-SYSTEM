"use client";

import React from "react";
import { useERP } from "@/context/erp-context";
import { computeBalanceSheet } from "@/lib/accounting-engine";
import { formatCurrency } from "@/lib/utils";
import TableSkeleton from "@/components/ui/TableSkeleton";
import { Scale, Printer, CheckCircle2, AlertTriangle, Building2, Layers, DollarSign } from "lucide-react";

export default function BalanceSheetPage() {
  const { accounts, journalEntries, organization, locale, isLoadingData } = useERP();
  const isAr = locale === "ar";

  if (isLoadingData) {
    return <TableSkeleton rows={8} columns={4} summaryCards={3} isAr={isAr} />;
  }

  const {
    currentAssets,
    totalCurrentAssets,
    fixedAssetGroups,
    totalFixedAssetsCost,
    totalAccumulatedDepreciation,
    totalNetFixedAssets,
    otherNonCurrentAssets,
    totalOtherNonCurrentAssets,
    totalAssets,
    currentLiabilities,
    totalCurrentLiabilities,
    nonCurrentLiabilities,
    totalNonCurrentLiabilities,
    totalLiabilities,
    equity,
    totalEquityBeforeProfit,
    netIncome,
    totalEquity,
    totalLiabilitiesAndEquity,
    isBalanced,
  } = computeBalanceSheet(accounts, journalEntries);

  return (
    <div className="space-y-6 pb-20">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm print:hidden">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Scale className="w-6 h-6 text-emerald-400" />
            <span>{isAr ? "الميزانية العمومية وقائمة المركز المالي (Balance Sheet)" : "Balance Sheet & Financial Position"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? "المركز المالي الشامل مع خصم مجمع الإهلاك (Contra Asset) من الأصول الثابتة لاحتساب صافي القيمة الدفترية"
              : "Complete balance sheet deducting Contra-Asset Accumulated Depreciation from Fixed Assets to calculate Net Book Value"}
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>{isAr ? "طباعة المركز المالي (PDF)" : "Print Balance Sheet"}</span>
        </button>
      </div>

      {/* Balancing Status Banner */}
      <div className={"p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-bold " + (
        isBalanced
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
          : "bg-rose-500/10 border-rose-500/30 text-rose-400"
      )}>
        <div className="flex items-center gap-2">
          {isBalanced ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
          <div>
            <span className="text-sm block font-black">
              {isBalanced
                ? (isAr ? "✓ معادلة المركز المالي متطابقة تماماً (صافي الأصول = الخصوم + حقوق الملكية)" : "✓ Balance Sheet Equation Holds (Net Assets = Liabilities + Equity)")
                : (isAr ? "⚠️ يوجد عدم اتزان في معادلة المركز المالي" : "⚠️ Balance Sheet Imbalance")}
            </span>
            <span className="text-[11px] text-slate-400 font-normal">
              {isAr
                ? "تم احتساب مجمع الإهلاك كحساب مدين/دائن عكسي مخصوم من تكلفة الأصل"
                : "Accumulated depreciation is correctly deducted as a contra asset from asset cost"}
            </span>
          </div>
        </div>
        <div className="font-mono text-sm sm:text-base font-black bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
          <span className="text-emerald-400">{formatCurrency(totalAssets, organization.currency, locale)}</span>
          <span className="text-slate-400 mx-2">=</span>
          <span className="text-sky-400">{formatCurrency(totalLiabilitiesAndEquity, organization.currency, locale)}</span>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <span className="text-slate-400 block text-[11px] font-medium">{isAr ? "الأصول المتداولة:" : "Current Assets:"}</span>
          <span className="text-lg font-black font-mono text-emerald-400 mt-1 block">
            {formatCurrency(totalCurrentAssets, organization.currency, locale)}
          </span>
        </div>
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <span className="text-slate-400 block text-[11px] font-medium">{isAr ? "صافي الأصول الثابتة:" : "Net Fixed Assets:"}</span>
          <span className="text-lg font-black font-mono text-teal-400 mt-1 block">
            {formatCurrency(totalNetFixedAssets, organization.currency, locale)}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
            {isAr ? `(تكلفة: ${formatCurrency(totalFixedAssetsCost, organization.currency, locale)} - إهلاك: ${formatCurrency(totalAccumulatedDepreciation, organization.currency, locale)})` : `(Cost - Depr)`}
          </span>
        </div>
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <span className="text-slate-400 block text-[11px] font-medium">{isAr ? "إجمالي الخصوم والالتزامات:" : "Total Liabilities:"}</span>
          <span className="text-lg font-black font-mono text-rose-400 mt-1 block">
            {formatCurrency(totalLiabilities, organization.currency, locale)}
          </span>
        </div>
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <span className="text-slate-400 block text-[11px] font-medium">{isAr ? "إجمالي حقوق الملكية:" : "Total Equity:"}</span>
          <span className="text-lg font-black font-mono text-purple-400 mt-1 block">
            {formatCurrency(totalEquity, organization.currency, locale)}
          </span>
        </div>
      </div>

      {/* Main Two-Column Structure */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ========================================== */}
        {/* ASSETS COLUMN */}
        {/* ========================================== */}
        <div className="space-y-6">
          {/* 1. Current Assets */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                <span>{isAr ? "1. الأصول المتداولة (Current Assets)" : "1. Current Assets"}</span>
              </h3>
              <span className="font-mono text-xs font-bold text-emerald-400">
                {formatCurrency(totalCurrentAssets, organization.currency, locale)}
              </span>
            </div>

            <div className="space-y-1 text-xs">
              {currentAssets.length === 0 ? (
                <div className="p-3 text-center text-slate-500 font-medium">
                  {isAr ? "لا توجد أصول متداولة مسجلة" : "No current assets"}
                </div>
              ) : (
                currentAssets.map(acc => (
                  <div key={acc.id} className="flex justify-between py-1.5 px-2 rounded-lg hover:bg-slate-800/40 border-b border-slate-800/30">
                    <span className="text-slate-300">
                      <span className="font-mono text-slate-500 ml-2">{acc.code}</span>
                      <span>{isAr ? acc.nameAr : acc.nameEn}</span>
                    </span>
                    <span className={"font-mono font-bold " + (acc.balance < 0 ? "text-rose-400" : "text-white")}>
                      {formatCurrency(acc.balance, organization.currency, locale)}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-between font-bold pt-3 text-emerald-400 text-xs border-t border-slate-800">
              <span>{isAr ? "مجموع الأصول المتداولة:" : "Subtotal Current Assets:"}</span>
              <span className="font-mono text-sm">{formatCurrency(totalCurrentAssets, organization.currency, locale)}</span>
            </div>
          </div>

          {/* 2. Fixed Assets & Contra Depreciation Matrix */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-teal-400 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  <span>{isAr ? "2. الأصول غير المتداولة والثابتة (Fixed Assets & Depreciation)" : "2. Fixed Assets & Depreciation"}</span>
                </h3>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  {isAr ? "صافي القيمة الدفترية = تكلفة الأصل التاريخية - مجمع الإهلاك" : "Net Book Value = Asset Cost - Accumulated Depreciation"}
                </span>
              </div>
              <span className="font-mono text-xs font-bold text-teal-400">
                {formatCurrency(totalNetFixedAssets, organization.currency, locale)}
              </span>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 font-bold border-b border-slate-800">
                    <th className="p-2.5 font-sans">{isAr ? "بند الأصل الثابت" : "Asset Group"}</th>
                    <th className="p-2.5 text-center font-mono">{isAr ? "التكلفة (Dr)" : "Cost"}</th>
                    <th className="p-2.5 text-center font-mono text-rose-400">{isAr ? "(-) مجمع الإهلاك (Cr)" : "(-) Acc. Depr"}</th>
                    <th className="p-2.5 text-left font-mono text-teal-400">{isAr ? "صافي القيمة الدفترية" : "Net Value"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 font-mono">
                  {fixedAssetGroups.map((g) => (
                    <tr key={g.key} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-2.5 font-sans font-medium text-slate-200">
                        <div className="flex flex-col">
                          <span>{isAr ? g.nameAr : g.nameEn}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {g.costCode} {g.depreciationCode ? `| ${g.depreciationCode}` : ""}
                          </span>
                        </div>
                      </td>
                      <td className="p-2.5 text-center font-bold text-white">
                        {formatCurrency(g.costBalance, organization.currency, locale)}
                      </td>
                      <td className="p-2.5 text-center font-bold text-rose-400/90">
                        {g.depreciationBalance > 0 ? `-${formatCurrency(g.depreciationBalance, organization.currency, locale)}` : "-"}
                      </td>
                      <td className="p-2.5 text-left font-bold text-teal-300">
                        {formatCurrency(g.netBookValue, organization.currency, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-950 font-mono font-bold text-xs border-t-2 border-slate-700">
                    <td className="p-2.5 font-sans text-slate-300">{isAr ? "إجمالي الأصول الثابتة:" : "Total Fixed Assets:"}</td>
                    <td className="p-2.5 text-center text-white">{formatCurrency(totalFixedAssetsCost, organization.currency, locale)}</td>
                    <td className="p-2.5 text-center text-rose-400">-{formatCurrency(totalAccumulatedDepreciation, organization.currency, locale)}</td>
                    <td className="p-2.5 text-left text-teal-400 text-sm font-black">{formatCurrency(totalNetFixedAssets, organization.currency, locale)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Other non-current assets if any */}
            {otherNonCurrentAssets.length > 0 && (
              <div className="pt-2 space-y-1 text-xs border-t border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 block mb-1">{isAr ? "أصول غير متداولة أخرى:" : "Other Non Current Assets:"}</span>
                {otherNonCurrentAssets.map(acc => (
                  <div key={acc.id} className="flex justify-between py-1 px-2 border-b border-slate-800/30">
                    <span className="text-slate-300">{acc.code} - {isAr ? acc.nameAr : acc.nameEn}</span>
                    <span className="font-mono font-bold text-white">{formatCurrency(acc.balance, organization.currency, locale)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total Net Assets Grand Summary */}
          <div className="bg-gradient-to-r from-emerald-950/40 to-slate-900 border-2 border-emerald-500/40 rounded-3xl p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-300 block">{isAr ? "إجمالي صافي الأصول والموجودات:" : "TOTAL NET ASSETS:"}</span>
              <span className="text-[11px] text-emerald-400 block mt-0.5">
                {isAr ? "الأصول المتداولة + صافي الأصول الثابتة" : "Current Assets + Net Fixed Assets"}
              </span>
            </div>
            <span className="text-xl font-black font-mono text-emerald-400">
              {formatCurrency(totalAssets, organization.currency, locale)}
            </span>
          </div>
        </div>

        {/* ========================================== */}
        {/* LIABILITIES & EQUITY COLUMN */}
        {/* ========================================== */}
        <div className="space-y-6">
          {/* 1. Liabilities */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span>{isAr ? "1. الخصوم والالتزامات (Liabilities)" : "1. Liabilities"}</span>
              </h3>
              <span className="font-mono text-xs font-bold text-rose-400">
                {formatCurrency(totalLiabilities, organization.currency, locale)}
              </span>
            </div>

            {/* Current Liabilities */}
            <div className="space-y-2 text-xs">
              <span className="text-[11px] font-bold text-slate-400 block">{isAr ? "أ. الخصوم المتداولة (قصيرة الأجل):" : "A. Current Liabilities:"}</span>
              {currentLiabilities.length === 0 ? (
                <div className="p-2 text-center text-slate-500 font-medium">
                  {isAr ? "لا توجد التزامات متداولة" : "No current liabilities"}
                </div>
              ) : (
                currentLiabilities.map(acc => (
                  <div key={acc.id} className="flex justify-between py-1.5 px-2 rounded-lg hover:bg-slate-800/40 border-b border-slate-800/30">
                    <span className="text-slate-300">
                      <span className="font-mono text-slate-500 ml-2">{acc.code}</span>
                      <span>{isAr ? acc.nameAr : acc.nameEn}</span>
                    </span>
                    <span className={"font-mono font-bold " + (acc.balance < 0 ? "text-amber-400" : "text-white")}>
                      {formatCurrency(acc.balance, organization.currency, locale)}
                    </span>
                  </div>
                ))
              )}
              <div className="flex justify-between font-bold pt-1 text-rose-400 text-xs">
                <span>{isAr ? "مجموع الخصوم المتداولة:" : "Subtotal Current Liabilities:"}</span>
                <span className="font-mono">{formatCurrency(totalCurrentLiabilities, organization.currency, locale)}</span>
              </div>
            </div>

            {/* Non-Current Liabilities */}
            {nonCurrentLiabilities.length > 0 && (
              <div className="space-y-2 text-xs pt-3 border-t border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 block">{isAr ? "ب. الخصوم غير المتداولة (طويلة الأجل):" : "B. Non-Current Liabilities:"}</span>
                {nonCurrentLiabilities.map(acc => (
                  <div key={acc.id} className="flex justify-between py-1.5 px-2 rounded-lg hover:bg-slate-800/40 border-b border-slate-800/30">
                    <span className="text-slate-300">
                      <span className="font-mono text-slate-500 ml-2">{acc.code}</span>
                      <span>{isAr ? acc.nameAr : acc.nameEn}</span>
                    </span>
                    <span className={"font-mono font-bold " + (acc.balance < 0 ? "text-amber-400" : "text-white")}>
                      {formatCurrency(acc.balance, organization.currency, locale)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between font-bold pt-1 text-rose-400 text-xs">
                  <span>{isAr ? "مجموع الخصوم غير المتداولة:" : "Subtotal Non-Current Liabilities:"}</span>
                  <span className="font-mono">{formatCurrency(totalNonCurrentLiabilities, organization.currency, locale)}</span>
                </div>
              </div>
            )}

            <div className="flex justify-between font-bold pt-3 text-rose-400 text-xs border-t border-slate-800">
              <span>{isAr ? "إجمالي الخصوم والالتزامات:" : "Total Liabilities:"}</span>
              <span className="font-mono text-sm">{formatCurrency(totalLiabilities, organization.currency, locale)}</span>
            </div>
          </div>

          {/* 2. Equity */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-purple-400 flex items-center gap-2">
                <Scale className="w-4 h-4" />
                <span>{isAr ? "2. حقوق الملكية ورأس المال (Equity)" : "2. Owner's Equity"}</span>
              </h3>
              <span className="font-mono text-xs font-bold text-purple-400">
                {formatCurrency(totalEquity, organization.currency, locale)}
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              {equity.map(acc => (
                <div key={acc.id} className="flex justify-between py-1.5 px-2 rounded-lg hover:bg-slate-800/40 border-b border-slate-800/30">
                  <span className="text-slate-300">
                    <span className="font-mono text-slate-500 ml-2">{acc.code}</span>
                    <span>{isAr ? acc.nameAr : acc.nameEn}</span>
                  </span>
                  <span className={"font-mono font-bold " + (acc.balance < 0 ? "text-amber-400" : "text-white")}>
                    {formatCurrency(acc.balance, organization.currency, locale)}
                  </span>
                </div>
              ))}

              {/* Current Period Net Income from P&L */}
              <div className="flex justify-between py-2 px-2 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-emerald-400 font-bold">
                <span>{isAr ? "صافي أرباح / (خسائر) الفترة الحالية من قائمة الدخل" : "Current Period Net Income (from P&L)"}</span>
                <span className="font-mono">{formatCurrency(netIncome, organization.currency, locale)}</span>
              </div>
            </div>

            <div className="flex justify-between font-bold pt-3 text-purple-400 text-xs border-t border-slate-800">
              <span>{isAr ? "إجمالي حقوق الملكية:" : "Total Owner's Equity:"}</span>
              <span className="font-mono text-sm">{formatCurrency(totalEquity, organization.currency, locale)}</span>
            </div>
          </div>

          {/* Total Liabilities & Equity Grand Summary */}
          <div className="bg-gradient-to-r from-sky-950/40 to-slate-900 border-2 border-sky-500/40 rounded-3xl p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-300 block">{isAr ? "إجمالي الخصوم وحقوق الملكية:" : "TOTAL LIABILITIES & EQUITY:"}</span>
              <span className="text-[11px] text-sky-400 block mt-0.5">
                {isAr ? "الخصوم + حقوق الملكية + صافي الربح" : "Liabilities + Equity + Net Profit"}
              </span>
            </div>
            <span className="text-xl font-black font-mono text-sky-400">
              {formatCurrency(totalLiabilitiesAndEquity, organization.currency, locale)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

