"use client";

import React from "react";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useERP } from "@/context/erp-context";
import { Currency } from "@/types/erp";

interface StatCardProps {
  titleAr: string;
  titleEn: string;
  value: number | string;
  isCurrency?: boolean;
  currency?: Currency;
  changePercent?: number;
  icon: LucideIcon;
  color?: "emerald" | "blue" | "amber" | "rose" | "purple";
  subtitle?: string;
}

export default function StatCard({
  titleAr,
  titleEn,
  value,
  isCurrency = false,
  currency,
  changePercent,
  icon: Icon,
  color = "emerald",
  subtitle
}: StatCardProps) {
  const { locale, organization } = useERP();
  const isAr = locale === "ar";
  const curr: Currency = currency || organization.currency;

  const colorStyles = {
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    rose: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  }[color];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition-all">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-400">
          {isAr ? titleAr : titleEn}
        </span>
        <div className={"p-2.5 rounded-xl border " + colorStyles}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="flex items-baseline justify-between">
        <div className="text-2xl font-bold text-white tracking-tight">
          {typeof value === "number" && isCurrency ? formatCurrency(value, curr, locale) : value}
        </div>
        {changePercent !== undefined && (
          <div
            className={"flex items-center gap-1 text-xs font-bold " + (
              changePercent >= 0 ? "text-emerald-400" : "text-rose-400"
            )}
          >
            {changePercent >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span>{Math.abs(changePercent)}%</span>
          </div>
        )}
      </div>

      {subtitle && (
        <div className="text-xs text-slate-500 mt-2 font-medium">
          {subtitle}
        </div>
      )}
    </div>
  );
}
