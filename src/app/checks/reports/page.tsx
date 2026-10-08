"use client";

import React from "react";
import Link from "next/link";
import { useERP } from "@/context/erp-context";
import { formatCurrency } from "@/lib/utils";
import {
  Landmark, ArrowDownLeft, ArrowUpRight, Wallet,
  FileSpreadsheet, ArrowLeft, ArrowRight, BarChart3,
  CheckCircle2, Clock, AlertCircle, ShieldAlert
} from "lucide-react";

export default function ChecksReportsPage() {
  const { checks, organization, locale } = useERP();
  const isAr = locale === "ar";

  // Statistics for Card 1: تقرير أوراق القبض (Incoming)
  const incomingChecks = checks.filter(c => c.type === "incoming");
  const totalIncomingAmount = incomingChecks.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const incomingCollected = incomingChecks.filter(c => c.status === "collected").length;
  const incomingInTreasury = incomingChecks.filter(c => c.status === "in_treasury").length;
  const incomingUnderCollection = incomingChecks.filter(c => c.status === "under_collection").length;

  // Statistics for Card 2: تقرير أوراق الدفع (Outgoing)
  const outgoingChecks = checks.filter(c => c.type === "outgoing");
  const totalOutgoingAmount = outgoingChecks.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const outgoingPaid = outgoingChecks.filter(c => c.status === "paid" || c.status === "cleared").length;
  const outgoingPending = outgoingChecks.filter(c => c.status === "pending" || c.status === "in_treasury").length;

  // Statistics for Card 3: محفظة الشيكات العامة (Total Portfolio)
  const totalPortfolioAmount = totalIncomingAmount + totalOutgoingAmount;
  const totalChecksCount = checks.length;

  const cards = [
    {
      id: "card_receivable",
      titleAr: "تقرير أوراق القبض",
      titleEn: "Receivable Notes Report",
      subtitleAr: "تحليل شامل لجميع أوراق القبض المستلمة من العملاء وحالات التحصيل والإيداع البنكي وتواريخ الاستحقاق",
      subtitleEn: "Detailed analytics of customer receivable notes, collection statuses and due dates",
      icon: ArrowDownLeft,
      color: "emerald",
      badgeAr: `${incomingChecks.length} شيك قبض`,
      badgeEn: `${incomingChecks.length} Notes`,
      amount: totalIncomingAmount,
      href: "/checks/report-receivable",
      metrics: [
        { labelAr: "في الخزينة", labelEn: "In Treasury", val: incomingInTreasury, color: "text-blue-400" },
        { labelAr: "برسم التحصيل", labelEn: "Under Collection", val: incomingUnderCollection, color: "text-amber-400" },
        { labelAr: "تم التحصيل", labelEn: "Collected", val: incomingCollected, color: "text-emerald-400" },
      ]
    },
    {
      id: "card_payable",
      titleAr: "تقرير أوراق الدفع",
      titleEn: "Payable Notes Report",
      subtitleAr: "سجل كامل ومفصل لكافة الشيكات الصادرة للموردين والجهات الدائنة ومتابعة الصرف والخصم البنكي",
      subtitleEn: "Complete registry and tracking for outgoing supplier notes and bank clearances",
      icon: ArrowUpRight,
      color: "amber",
      badgeAr: `${outgoingChecks.length} شيك دفع`,
      badgeEn: `${outgoingChecks.length} Notes`,
      amount: totalOutgoingAmount,
      href: "/checks/report-payable",
      metrics: [
        { labelAr: "قيد الصرف", labelEn: "Pending", val: outgoingPending, color: "text-amber-400" },
        { labelAr: "تم الصرف بنكياً", labelEn: "Paid/Cleared", val: outgoingPaid, color: "text-emerald-400" },
        { labelAr: "إجمالي المصدر", labelEn: "Total Issued", val: outgoingChecks.length, color: "text-slate-300" },
      ]
    },
    {
      id: "card_portfolio",
      titleAr: "محفظة الشيكات العامة",
      titleEn: "General Checks Portfolio",
      subtitleAr: "لوحة تحكم مركزية لمحفظة الشيكات المجمعة، إحصائيات السيولة المستقبلية، والتوزيع الزمني للاستحقاقات",
      subtitleEn: "Central command dashboard for total checks portfolio, expected cashflow and maturity schedules",
      icon: Wallet,
      color: "indigo",
      badgeAr: `${totalChecksCount} إجمالي الشيكات`,
      badgeEn: `${totalChecksCount} Total Checks`,
      amount: totalPortfolioAmount,
      href: "/checks",
      metrics: [
        { labelAr: "أوراق قبض", labelEn: "Receivables", val: incomingChecks.length, color: "text-emerald-400" },
        { labelAr: "أوراق دفع", labelEn: "Payables", val: outgoingChecks.length, color: "text-amber-400" },
        { labelAr: "نسبة التحصيل", labelEn: "Collection Rate", val: incomingChecks.length ? `${Math.round((incomingCollected / incomingChecks.length) * 100)}%` : "0%", color: "text-sky-400" },
      ]
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-2 font-medium">
            <Link href="/checks" className="hover:text-emerald-400 transition-colors">
              {isAr ? "الشيكات والبنوك" : "Banks & Checks"}
            </Link>
            <span>/</span>
            <span className="text-emerald-400 font-bold">{isAr ? "تقارير الشيكات والبنوك" : "Reports"}</span>
          </div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Landmark className="w-6 h-6 text-emerald-400" />
            <span>{isAr ? "تقارير الشيكات والبنوك" : "Cheques & Banks Reports"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? "المركز الموحد لتقارير أوراق القبض والدفع ومحفظة الشيكات النقدية والمصرفية"
              : "Unified hub for receivable, payable, and general portfolio analytical reports"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/checks/receivable"
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all"
          >
            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
            <span>{isAr ? "سند استلام أ.ق" : "Receivable Notes"}</span>
          </Link>
          <Link
            href="/checks/payable"
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all"
          >
            <ArrowUpRight className="w-4 h-4 text-amber-400" />
            <span>{isAr ? "سند صرف أ.د" : "Payable Notes"}</span>
          </Link>
        </div>
      </div>

      {/* 3 Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between hover:border-slate-700 hover:shadow-2xl hover:shadow-slate-950/60 transition-all group relative overflow-hidden"
            >
              <div className="space-y-4">
                {/* Card Top Header */}
                <div className="flex items-center justify-between">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    card.color === "emerald"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : card.color === "amber"
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                  }`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    card.color === "emerald"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : card.color === "amber"
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                  }`}>
                    {isAr ? card.badgeAr : card.badgeEn}
                  </span>
                </div>

                {/* Card Title & Description */}
                <div>
                  <div className="text-[11px] font-bold text-slate-500 font-mono">
                    {isAr ? `البطاقة رقم ${idx + 1}` : `Card #${idx + 1}`}
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors mt-0.5">
                    {isAr ? card.titleAr : card.titleEn}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {isAr ? card.subtitleAr : card.subtitleEn}
                  </p>
                </div>

                {/* Amount Highlight */}
                <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block font-medium">
                    {isAr ? "إجمالي القيمة المالية:" : "Total Monetary Value:"}
                  </span>
                  <span className="text-xl font-mono font-black text-white mt-1 block">
                    {formatCurrency(card.amount, organization.currency, locale)}
                  </span>
                </div>

                {/* Metrics Badges */}
                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  {card.metrics.map((m, mIdx) => (
                    <div key={mIdx} className="bg-slate-950/50 p-2 rounded-xl border border-slate-800/50">
                      <span className="text-[10px] text-slate-400 block">{isAr ? m.labelAr : m.labelEn}</span>
                      <span className={`text-xs font-mono font-bold mt-0.5 block ${m.color}`}>{m.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-6 mt-4 border-t border-slate-800/80">
                <Link
                  href={card.href}
                  className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs transition-all ${
                    card.color === "emerald"
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40"
                      : card.color === "amber"
                      ? "bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-950/40"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-950/40"
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{isAr ? `فتح ${card.titleAr}` : `Open ${card.titleEn}`}</span>
                  {isAr ? <ArrowLeft className="w-3.5 h-3.5 mr-1" /> : <ArrowRight className="w-3.5 h-3.5 ml-1" />}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
