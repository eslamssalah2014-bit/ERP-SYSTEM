"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useERP } from "@/context/erp-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import StatCard from "@/components/ui/StatCard";
import ZatcaInvoiceModal from "@/components/ui/ZatcaInvoiceModal";
import { SalesInvoice } from "@/types/erp";
import {
  TrendingUp, ShoppingCart, ShoppingBag, Wallet, AlertTriangle,
  Package, Users, ArrowUpRight, ArrowDownRight, Plus, Eye,
  CheckCircle2, Clock, MonitorPlay, FileText, CheckSquare,
  BarChart3, PieChart as PieChartIcon
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

export default function Dashboard() {
  const {
    locale, organization, salesInvoices, purchaseInvoices,
    products, customers, suppliers, treasuryAccounts, checks,
    categories, updateCheckStatus
  } = useERP();

  const isAr = locale === "ar";
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);

  // Financial KPI calculations
  const totalSales = useMemo(() => salesInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0), [salesInvoices]);
  const totalPurchases = useMemo(() => purchaseInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0), [purchaseInvoices]);
  const totalTreasuryBalance = useMemo(() => treasuryAccounts.reduce((sum, t) => sum + t.balance, 0), [treasuryAccounts]);
  const totalReceivables = useMemo(() => customers.reduce((sum, c) => sum + c.currentBalance, 0), [customers]);
  const estimatedGrossProfit = totalSales - totalPurchases;

  // Low stock products
  const lowStockProducts = useMemo(() => products.filter(p => {
    const totalQty = Object.values(p.warehouseStock || {}).reduce((a, b) => a + b, 0);
    return totalQty <= p.minStockLevel;
  }), [products]);

  // Due checks
  const pendingChecks = useMemo(() => checks.filter(c => c.status === "pending"), [checks]);

  // Real-time Monthly Chart Data dynamically calculated from actual invoices
  const monthlyChartData = useMemo(() => {
    const monthNamesAr = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    const monthNamesEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Return current year months (last 6 months up to current month)
    const currentMonthIndex = new Date().getMonth();
    const monthsToShow = [];

    for (let i = 5; i >= 0; i--) {
      const targetMonthIndex = (currentMonthIndex - i + 12) % 12;
      const monthLabel = isAr ? monthNamesAr[targetMonthIndex] : monthNamesEn[targetMonthIndex];

      // Calculate actual sales for this month
      const monthSales = salesInvoices
        .filter(inv => {
          const d = new Date(inv.date);
          return d.getMonth() === targetMonthIndex;
        })
        .reduce((sum, inv) => sum + inv.grandTotal, 0);

      // Calculate actual purchases for this month
      const monthPurchases = purchaseInvoices
        .filter(inv => {
          const d = new Date(inv.date);
          return d.getMonth() === targetMonthIndex;
        })
        .reduce((sum, inv) => sum + inv.grandTotal, 0);

      monthsToShow.push({
        month: monthLabel,
        sales: monthSales,
        purchases: monthPurchases,
      });
    }

    return monthsToShow;
  }, [salesInvoices, purchaseInvoices, isAr]);

  // Real-time Category Distribution Data dynamically calculated from actual product sales
  const categoryPieData = useMemo(() => {
    if (salesInvoices.length === 0) {
      return [];
    }

    const categoryMap: { [catId: string]: number } = {};
    salesInvoices.forEach(inv => {
      inv.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        const catId = prod?.categoryId || "other";
        categoryMap[catId] = (categoryMap[catId] || 0) + item.total;
      });
    });

    const colors = ["#10b981", "#06b6d4", "#8b5cf6", "#f59e0b", "#ec4899", "#3b82f6"];
    const totalCatSales = Object.values(categoryMap).reduce((a, b) => a + b, 0);

    return Object.entries(categoryMap).map(([catId, amount], idx) => {
      const cat = categories.find(c => c.id === catId);
      const name = cat ? (isAr ? cat.nameAr : cat.nameEn) : (isAr ? "أصناف متنوعة" : "Miscellaneous");
      const percentage = totalCatSales > 0 ? Math.round((amount / totalCatSales) * 100) : 0;
      return {
        name,
        value: percentage,
        amount,
        color: colors[idx % colors.length]
      };
    });
  }, [salesInvoices, products, categories, isAr]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <span>{isAr ? "لوحة المؤشرات والرقابة المالية" : "Executive Dashboard"}</span>
            <span className="text-xs px-2.5 py-1 bg-emerald-500/20 text-emerald-400 rounded-full font-bold border border-emerald-500/30">
              {isAr ? "نظام إنتاجي جاهز" : "PRODUCTION READY"}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? "متابعة لحظية لحركة المبيعات، المخزون، التدفقات النقدية، والشيكات المستحقة"
              : "Real-time overview of sales, inventory, cash flows, and checks"}
          </p>
        </div>

        {/* Quick Launchers */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/pos"
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/60 transition-all"
          >
            <MonitorPlay className="w-4 h-4" />
            <span>{isAr ? "شاشة الكاشير (POS)" : "Open POS"}</span>
          </Link>
          <Link
            href="/sales"
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>{isAr ? "فاتورة مبيعات جديدة" : "New Invoice"}</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          titleAr="إجمالي المبيعات"
          titleEn="Total Sales Revenue"
          value={totalSales}
          isCurrency
          changePercent={0}
          icon={ShoppingCart}
          color="emerald"
          subtitle={isAr ? "إجمالي الفواتير الصادرة" : "Issued invoices total"}
        />
        <StatCard
          titleAr="إجمالي المشتريات"
          titleEn="Total Purchases"
          value={totalPurchases}
          isCurrency
          changePercent={0}
          icon={ShoppingBag}
          color="blue"
          subtitle={isAr ? "تغذية المخزون والموردين" : "Suppliers replenishment"}
        />
        <StatCard
          titleAr="النقدية المتاحة بالخزائن والبنوك"
          titleEn="Available Cash & Banks"
          value={totalTreasuryBalance}
          isCurrency
          changePercent={0}
          icon={Wallet}
          color="amber"
          subtitle={isAr ? "السيولة النقدية الحالية" : "Current liquid cash"}
        />
        <StatCard
          titleAr="المستحقات لدى العملاء"
          titleEn="Accounts Receivable (A/R)"
          value={totalReceivables}
          isCurrency
          changePercent={0}
          icon={Users}
          color="purple"
          subtitle={isAr ? "مديونيات العملاء المستحقة" : "Customer outstanding balance"}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Sales vs Purchases Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-white">
                {isAr ? "مقارنة المبيعات والمشتريات الشهرية" : "Sales vs Purchases Overview"}
              </h2>
              <p className="text-xs text-slate-400">
                {isAr ? "أداء الإيرادات وتكلفة التوريدات الفعلية المسجلة" : "Monthly financial performance"}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                <span>{isAr ? "المبيعات" : "Sales"}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sky-400">
                <span className="w-3 h-3 rounded-full bg-sky-500 inline-block" />
                <span>{isAr ? "المشتريات" : "Purchases"}</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} tickFormatter={(val) => `${val}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", fontSize: "12px" }}
                  itemStyle={{ color: "#f8fafc" }}
                  formatter={(value: any) => [formatCurrency(Number(value) || 0, organization.currency, locale), ""]}
                />
                <Bar dataKey="sales" name={isAr ? "المبيعات" : "Sales"} fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={32} />
                <Bar dataKey="purchases" name={isAr ? "المشتريات" : "Purchases"} fill="#0284c7" radius={[6, 6, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue by Category Donut Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-white">
              {isAr ? "توزيع الإيرادات حسب القطاع" : "Revenue by Category"}
            </h2>
            <p className="text-xs text-slate-400">
              {isAr ? "نسبة مساهمة خطوط المنتجات" : "Product line contribution"}
            </p>
          </div>

          {categoryPieData.length === 0 ? (
            <div className="h-52 flex flex-col items-center justify-center text-center text-slate-500 py-8">
              <PieChartIcon className="w-10 h-10 mb-2 stroke-[1.5] text-slate-700" />
              <span className="text-xs font-semibold text-slate-400">
                {isAr ? "لا توجد مبيعات تصنيفية بعد" : "No sales data recorded yet"}
              </span>
              <span className="text-[11px] text-slate-600 mt-0.5">
                {isAr ? "سيتم احتساب النسب آلياً مع إصدار أول فاتورة" : "Calculated automatically with first invoice"}
              </span>
            </div>
          ) : (
            <>
              <div className="h-52 w-full my-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", fontSize: "12px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800">
                {categoryPieData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-300 font-medium">{item.name}</span>
                    </div>
                    <span className="font-bold text-white font-mono">{item.value}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Actionable Bottom Row: Low Stock, Due Checks, Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low Stock Alerts */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h2 className="text-sm font-bold text-white">
                {isAr ? "تنبيهات المخزون المنخفض" : "Low Stock Alerts"}
              </h2>
            </div>
            <Link href="/inventory" className="text-xs text-emerald-400 hover:underline">
              {isAr ? "إدارة المخزون" : "Manage"}
            </Link>
          </div>

          <div className="space-y-3">
            {lowStockProducts.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-8">
                {products.length === 0
                  ? (isAr ? "لا توجد منتجات مسجلة بالمخزن بعد" : "No products registered yet")
                  : (isAr ? "جميع الأصناف بمستويات آمنة" : "All stocks healthy")}
              </div>
            ) : (
              lowStockProducts.map(p => {
                const totalStock = Object.values(p.warehouseStock || {}).reduce((a, b) => a + b, 0);
                return (
                  <div key={p.id} className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-200">{isAr ? p.nameAr : p.nameEn}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">{p.sku}</div>
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-black text-rose-400 font-mono px-2 py-0.5 bg-rose-500/10 rounded-lg border border-rose-500/20">
                        {totalStock} / {isAr ? `حد الأمان ${p.minStockLevel}` : `Min ${p.minStockLevel}`}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Due Checks Dashboard */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-emerald-400" />
              <h2 className="text-sm font-bold text-white">
                {isAr ? "حافظة الشيكات المستحقة" : "Pending Checks"}
              </h2>
            </div>
            <Link href="/checks" className="text-xs text-emerald-400 hover:underline">
              {isAr ? "إدارة الشيكات" : "Manage"}
            </Link>
          </div>

          <div className="space-y-3">
            {pendingChecks.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-8">
                {isAr ? "لا توجد شيكات معلقة للتحصيل أو الصرف" : "No pending checks recorded"}
              </div>
            ) : (
              pendingChecks.map(chk => (
                <div key={chk.id} className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white font-mono">{chk.checkNumber}</span>
                    <span className="text-xs font-bold text-emerald-400 font-mono">
                      {formatCurrency(chk.amount, organization.currency, locale)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{chk.partyName}</span>
                    <span className="flex items-center gap-1 text-amber-400 font-medium">
                      <Clock className="w-3 h-3" />
                      <span>{chk.dueDate}</span>
                    </span>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => updateCheckStatus(chk.id, "collected", treasuryAccounts[0]?.id)}
                      className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white text-[10px] font-bold rounded-lg transition-colors border border-emerald-500/30"
                    >
                      {isAr ? "تحصيل وإيداع بالخزينة" : "Collect Check"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-sky-400" />
              <h2 className="text-sm font-bold text-white">
                {isAr ? "أحدث فواتير المبيعات" : "Recent Invoices"}
              </h2>
            </div>
            <Link href="/sales" className="text-xs text-emerald-400 hover:underline">
              {isAr ? "عرض الكل" : "View All"}
            </Link>
          </div>

          <div className="space-y-3">
            {salesInvoices.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-8">
                {isAr ? "لا توجد فواتير مبيعات مسجلة بعد" : "No sales invoices issued yet"}
              </div>
            ) : (
              salesInvoices.slice(0, 3).map(inv => (
                <div
                  key={inv.id}
                  onClick={() => setSelectedInvoice(inv)}
                  className="p-3 bg-slate-950/60 hover:bg-slate-800/40 cursor-pointer rounded-2xl border border-slate-800 flex items-center justify-between transition-colors"
                >
                  <div>
                    <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                      <span>{inv.invoiceNumber}</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-md font-sans">
                        ZATCA QR
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{inv.customerName}</div>
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-white font-mono">
                      {formatCurrency(inv.grandTotal, organization.currency, locale)}
                    </div>
                    <div className="text-[10px] text-slate-500">{formatDate(inv.date, locale)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ZATCA Tax Invoice Modal */}
      <ZatcaInvoiceModal
        invoice={selectedInvoice}
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />
    </div>
  );
}
