"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useERP } from "@/context/erp-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import { exportTableToExcel } from "@/lib/excel-export";
import { ReportPrintHeader } from "@/components/ui/ReportPrintHeader";
import {
  ShoppingBag, FileSpreadsheet, Printer, Download, Filter,
  Calendar, Truck, Package, Layers, TrendingDown, DollarSign,
  FileText, Search, ArrowRight, RotateCcw
} from "lucide-react";

type ReportType = "monthly" | "supplier" | "product" | "group" | "period";

export default function PurchaseReportsPage() {
  const {
    purchaseInvoices,
    suppliers,
    products,
    categories,
    organization,
    locale
  } = useERP();

  const isAr = locale === "ar";
  const todayStr = new Date().toISOString().split("T")[0];
  const currentFiscalYear = new Date().getFullYear();
  const defaultFromDate = `${currentFiscalYear}-01-01`;

  // Filters State
  const [activeReport, setActiveReport] = useState<ReportType>("monthly");
  const [dateFrom, setDateFrom] = useState(defaultFromDate);
  const [dateTo, setDateTo] = useState(todayStr);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("all");
  const [selectedProductId, setSelectedProductId] = useState<string>("all");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Filtered Purchase Invoices
  const filteredInvoices = useMemo(() => {
    return purchaseInvoices.filter(inv => {
      if (inv.invoiceType === "purchase_order") return false;
      if (inv.status === "cancelled") return false;

      // Date Range Filter
      if (dateFrom && inv.date < dateFrom) return false;
      if (dateTo && inv.date > dateTo) return false;

      // Supplier Filter
      if (selectedSupplierId !== "all" && inv.supplierId !== selectedSupplierId) return false;

      // Product Filter & Group Filter
      if (selectedProductId !== "all" || selectedGroupId !== "all") {
        const hasMatchingItem = inv.items.some(item => {
          if (selectedProductId !== "all" && item.productId !== selectedProductId) return false;
          if (selectedGroupId !== "all") {
            const prod = products.find(p => p.id === item.productId);
            if (!prod || prod.categoryId !== selectedGroupId) return false;
          }
          return true;
        });
        if (!hasMatchingItem) return false;
      }

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNum = inv.invoiceNumber.toLowerCase().includes(q);
        const matchesSupp = inv.supplierName.toLowerCase().includes(q);
        if (!matchesNum && !matchesSupp) return false;
      }

      return true;
    });
  }, [purchaseInvoices, dateFrom, dateTo, selectedSupplierId, selectedProductId, selectedGroupId, searchQuery, products]);

  // Filtered Line Items
  const filteredItems = useMemo(() => {
    const list: Array<{
      invoiceId: string;
      invoiceNumber: string;
      invoiceDate: string;
      supplierId: string;
      supplierName: string;
      productId: string;
      productName: string;
      productSku: string;
      categoryId: string;
      categoryName: string;
      quantity: number;
      unitCost: number;
      taxRate: number;
      taxAmount: number;
      total: number;
    }> = [];

    filteredInvoices.forEach(inv => {
      inv.items.forEach(item => {
        if (selectedProductId !== "all" && item.productId !== selectedProductId) return;

        const prod = products.find(p => p.id === item.productId);
        const catId = prod?.categoryId || "";
        if (selectedGroupId !== "all" && catId !== selectedGroupId) return;

        const cat = categories.find((c: any) => c.id === catId);

        list.push({
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          invoiceDate: inv.date,
          supplierId: inv.supplierId,
          supplierName: inv.supplierName,
          productId: item.productId,
          productName: item.productName || prod?.nameAr || item.productId,
          productSku: prod?.sku || "-",
          categoryId: catId,
          categoryName: cat?.nameAr || (isAr ? "عام" : "General"),
          quantity: Number(item.quantity) || 0,
          unitCost: Number(item.unitCost) || 0,
          taxRate: Number(item.taxRate) || 0,
          taxAmount: Number(item.taxAmount) || 0,
          total: Number(item.total) || 0,
        });
      });
    });

    return list;
  }, [filteredInvoices, selectedProductId, selectedGroupId, products, categories, isAr]);

  // Overall KPIs
  const totalPurchasesCost = useMemo(() => {
    return filteredInvoices.reduce((s, inv) => s + (Number(inv.grandTotal) || 0), 0);
  }, [filteredInvoices]);

  const totalPurchasesTax = useMemo(() => {
    return filteredInvoices.reduce((s, inv) => s + (Number(inv.taxTotal) || 0), 0);
  }, [filteredInvoices]);

  const totalInvoicesCount = filteredInvoices.length;

  const totalQuantityPurchased = useMemo(() => {
    return filteredItems.reduce((s, item) => s + item.quantity, 0);
  }, [filteredItems]);

  const averageInvoiceValue = totalInvoicesCount > 0 ? totalPurchasesCost / totalInvoicesCount : 0;

  // 1. Monthly Purchases Report Data
  const monthlyData = useMemo(() => {
    const map = new Map<string, {
      monthKey: string;
      invoicesCount: number;
      subtotal: number;
      taxTotal: number;
      grandTotal: number;
    }>();

    filteredInvoices.forEach(inv => {
      const monthKey = inv.date ? inv.date.slice(0, 7) : "Unknown";
      const existing = map.get(monthKey) || {
        monthKey,
        invoicesCount: 0,
        subtotal: 0,
        taxTotal: 0,
        grandTotal: 0
      };

      existing.invoicesCount += 1;
      existing.subtotal += Number(inv.subtotal) || 0;
      existing.taxTotal += Number(inv.taxTotal) || 0;
      existing.grandTotal += Number(inv.grandTotal) || 0;
      map.set(monthKey, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [filteredInvoices]);

  // 2. Purchases by Supplier Data
  const supplierData = useMemo(() => {
    const map = new Map<string, {
      supplierId: string;
      supplierCode: string;
      supplierName: string;
      invoicesCount: number;
      subtotal: number;
      taxTotal: number;
      grandTotal: number;
      paidAmount: number;
      dueAmount: number;
    }>();

    filteredInvoices.forEach(inv => {
      const supp = suppliers.find(s => s.id === inv.supplierId);
      const existing = map.get(inv.supplierId) || {
        supplierId: inv.supplierId,
        supplierCode: supp?.code || "-",
        supplierName: inv.supplierName || supp?.nameAr || "-",
        invoicesCount: 0,
        subtotal: 0,
        taxTotal: 0,
        grandTotal: 0,
        paidAmount: 0,
        dueAmount: 0
      };

      existing.invoicesCount += 1;
      existing.subtotal += Number(inv.subtotal) || 0;
      existing.taxTotal += Number(inv.taxTotal) || 0;
      existing.grandTotal += Number(inv.grandTotal) || 0;
      existing.paidAmount += Number(inv.paidAmount) || 0;
      existing.dueAmount += Number(inv.dueAmount) || 0;
      map.set(inv.supplierId, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.grandTotal - a.grandTotal);
  }, [filteredInvoices, suppliers]);

  // 3. Purchases by Product Data
  const productData = useMemo(() => {
    const map = new Map<string, {
      productId: string;
      productSku: string;
      productName: string;
      categoryName: string;
      totalQty: number;
      totalCost: number;
      totalTax: number;
      invoicesCount: Set<string>;
    }>();

    filteredItems.forEach(item => {
      const existing = map.get(item.productId) || {
        productId: item.productId,
        productSku: item.productSku,
        productName: item.productName,
        categoryName: item.categoryName,
        totalQty: 0,
        totalCost: 0,
        totalTax: 0,
        invoicesCount: new Set<string>()
      };

      existing.totalQty += item.quantity;
      existing.totalCost += item.total;
      existing.totalTax += item.taxAmount;
      existing.invoicesCount.add(item.invoiceId);
      map.set(item.productId, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.totalCost - a.totalCost);
  }, [filteredItems]);

  // 4. Purchases by Product Group Data
  const groupData = useMemo(() => {
    const map = new Map<string, {
      categoryId: string;
      categoryName: string;
      itemsCount: number;
      totalQty: number;
      totalCost: number;
      totalTax: number;
    }>();

    filteredItems.forEach(item => {
      const catKey = item.categoryId || "none";
      const existing = map.get(catKey) || {
        categoryId: catKey,
        categoryName: item.categoryName,
        itemsCount: 0,
        totalQty: 0,
        totalCost: 0,
        totalTax: 0
      };

      existing.itemsCount += 1;
      existing.totalQty += item.quantity;
      existing.totalCost += item.total;
      existing.totalTax += item.taxAmount;
      map.set(catKey, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.totalCost - a.totalCost);
  }, [filteredItems]);

  // Export Excel
  const handleExportExcel = () => {
    const tableId = `purchase-report-table-${activeReport}`;
    const filename = `تقرير_المشتريات_${activeReport}_${todayStr}`;
    exportTableToExcel(tableId, filename);
  };

  const handlePrint = () => {
    window.print();
  };

  const resetFilters = () => {
    setDateFrom(defaultFromDate);
    setDateTo(todayStr);
    setSelectedSupplierId("all");
    setSelectedProductId("all");
    setSelectedGroupId("all");
    setSearchQuery("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm print:hidden">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-2 font-medium">
            <Link href="/purchases" className="hover:text-emerald-400 transition-colors">
              {isAr ? "المشتريات والموردين" : "Purchases & Suppliers"}
            </Link>
            <span>/</span>
            <span className="text-emerald-400 font-bold">{isAr ? "تقارير المشتريات" : "Purchase Reports"}</span>
          </div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <ShoppingBag className="w-6 h-6 text-emerald-400" />
            <span>{isAr ? "تقارير المشتريات والمدفوعات التحليلية" : "Purchase & AP Analytical Reports"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? "تحليل تكاليف المشتريات شهرياً، حسب الموردين والأصناف والمجموعات مع إمكانيات التصدير والطباعة"
              : "Comprehensive procurement analytics by month, supplier, product, and category"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>{isAr ? "تصدير إكسيل" : "Excel Export"}</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{isAr ? "طباعة التقرير" : "Print Report"}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 print:grid-cols-5">
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <span className="text-xs text-slate-400 block font-medium">{isAr ? "إجمالي المشتريات:" : "Total Purchases:"}</span>
          <span className="text-lg font-black font-mono text-emerald-400 mt-1 block">
            {formatCurrency(totalPurchasesCost, organization.currency, locale)}
          </span>
        </div>
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <span className="text-xs text-slate-400 block font-medium">{isAr ? "إجمالي ضريبة المدخلات:" : "Input VAT:"}</span>
          <span className="text-lg font-black font-mono text-sky-400 mt-1 block">
            {formatCurrency(totalPurchasesTax, organization.currency, locale)}
          </span>
        </div>
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <span className="text-xs text-slate-400 block font-medium">{isAr ? "عدد الفواتير:" : "Bills Count:"}</span>
          <span className="text-lg font-black font-mono text-white mt-1 block">
            {totalInvoicesCount}
          </span>
        </div>
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <span className="text-xs text-slate-400 block font-medium">{isAr ? "الكميات المشتراة:" : "Units Purchased:"}</span>
          <span className="text-lg font-black font-mono text-amber-400 mt-1 block">
            {totalQuantityPurchased}
          </span>
        </div>
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 col-span-2 sm:col-span-1">
          <span className="text-xs text-slate-400 block font-medium">{isAr ? "متوسط فاتورة الشراء:" : "Avg Bill Cost:"}</span>
          <span className="text-lg font-black font-mono text-indigo-400 mt-1 block">
            {formatCurrency(averageInvoiceValue, organization.currency, locale)}
          </span>
        </div>
      </div>

      {/* Report Tabs Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-900/60 p-2 rounded-2xl border border-slate-800 print:hidden">
        {[
          { id: "monthly", labelAr: "المشتريات الشهرية", labelEn: "Monthly Purchases", icon: Calendar },
          { id: "supplier", labelAr: "المشتريات حسب الموردين", labelEn: "By Supplier", icon: Truck },
          { id: "product", labelAr: "المشتريات حسب الأصناف", labelEn: "By Product", icon: Package },
          { id: "group", labelAr: "المشتريات حسب مجموعات الأصناف", labelEn: "By Product Group", icon: Layers },
          { id: "period", labelAr: "المشتريات خلال الفترة المحددة", labelEn: "During Period", icon: FileText },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeReport === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReport(tab.id as ReportType)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                  : "bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800/80"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{isAr ? tab.labelAr : tab.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* Filters Form */}
      <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-3 print:hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isAr ? "خيارات التصفية والتحديد:" : "Filter Criteria:"}</span>
          </span>
          <button
            onClick={resetFilters}
            className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{isAr ? "إعادة ضبط التصفية" : "Reset"}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
          {/* Date From */}
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">{isAr ? "من تاريخ:" : "From Date:"}</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">{isAr ? "إلى تاريخ:" : "To Date:"}</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Supplier */}
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">{isAr ? "المورد:" : "Supplier:"}</label>
            <select
              value={selectedSupplierId}
              onChange={e => setSelectedSupplierId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-emerald-500"
            >
              <option value="all">{isAr ? "-- جميع الموردين --" : "-- All Suppliers --"}</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{isAr ? s.nameAr : s.nameEn}</option>
              ))}
            </select>
          </div>

          {/* Product Group */}
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">{isAr ? "مجموعة الأصناف:" : "Product Group:"}</label>
            <select
              value={selectedGroupId}
              onChange={e => setSelectedGroupId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-emerald-500"
            >
              <option value="all">{isAr ? "-- جميع المجموعات --" : "-- All Groups --"}</option>
              {categories.map((cat: any) => (
                <option key={cat.id} value={cat.id}>{cat.nameAr}</option>
              ))}
            </select>
          </div>

          {/* Product */}
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">{isAr ? "الصنف:" : "Product:"}</label>
            <select
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-emerald-500"
            >
              <option value="all">{isAr ? "-- جميع الأصناف --" : "-- All Products --"}</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>[{p.sku}] {isAr ? p.nameAr : p.nameEn}</option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">{isAr ? "بحث عام:" : "Search:"}</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={isAr ? "رقم الفاتورة أو المورد..." : "Bill # or supplier..."}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Printable Header */}
      <div className="hidden print:block mb-4">
        <ReportPrintHeader
          organization={organization}
          reportTitleAr={`تقرير المشتريات - ${
            activeReport === "monthly" ? "المشتريات الشهرية" :
            activeReport === "supplier" ? "المشتريات حسب الموردين" :
            activeReport === "product" ? "المشتريات حسب الأصناف" :
            activeReport === "group" ? "المشتريات حسب مجموعات الأصناف" : "المشتريات التفصيلية خلال الفترة"
          }`}
          reportTitleEn="Procurement Intelligence Report"
          dateFrom={dateFrom}
          dateTo={dateTo}
          locale={locale}
        />
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. Monthly Purchases Report Table                             */}
      {/* ------------------------------------------------------------- */}
      {activeReport === "monthly" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table id="purchase-report-table-monthly" className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                  <th className="p-3.5 rounded-r-lg">#</th>
                  <th className="p-3.5 font-mono">{isAr ? "الشهر" : "Month"}</th>
                  <th className="p-3.5 text-center font-mono">{isAr ? "عدد الفواتير" : "Bills Count"}</th>
                  <th className="p-3.5 text-center font-mono">{isAr ? "المشتريات قبل الضريبة" : "Taxable Subtotal"}</th>
                  <th className="p-3.5 text-center font-mono text-sky-400">{isAr ? "ضريبة القيمة المضافة" : "VAT Amount"}</th>
                  <th className="p-3.5 text-center font-mono text-emerald-400 rounded-l-lg">{isAr ? "إجمالي المشتريات (شامل الضريبة)" : "Total Purchases (Gross)"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {monthlyData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 font-sans">
                      {isAr ? "لا توجد فواتير مشتريات مسجلة تطابق معايير التصفية المحددة." : "No monthly purchase data found."}
                    </td>
                  </tr>
                ) : (
                  monthlyData.map((row, idx) => (
                    <tr key={row.monthKey} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3.5 text-slate-500">{idx + 1}</td>
                      <td className="p-3.5 font-bold text-white">{row.monthKey}</td>
                      <td className="p-3.5 text-center text-slate-300">{row.invoicesCount}</td>
                      <td className="p-3.5 text-center text-slate-200">{formatCurrency(row.subtotal, organization.currency, locale)}</td>
                      <td className="p-3.5 text-center text-sky-400 font-bold">{formatCurrency(row.taxTotal, organization.currency, locale)}</td>
                      <td className="p-3.5 text-center text-emerald-400 font-black">{formatCurrency(row.grandTotal, organization.currency, locale)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {monthlyData.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-950 font-bold border-t border-slate-800 text-white font-mono">
                    <td colSpan={2} className="p-3.5 font-sans">{isAr ? "الإجمالي العام:" : "Grand Total:"}</td>
                    <td className="p-3.5 text-center">{monthlyData.reduce((s, r) => s + r.invoicesCount, 0)}</td>
                    <td className="p-3.5 text-center">{formatCurrency(monthlyData.reduce((s, r) => s + r.subtotal, 0), organization.currency, locale)}</td>
                    <td className="p-3.5 text-center text-sky-400">{formatCurrency(monthlyData.reduce((s, r) => s + r.taxTotal, 0), organization.currency, locale)}</td>
                    <td className="p-3.5 text-center text-emerald-400 text-sm font-black">{formatCurrency(totalPurchasesCost, organization.currency, locale)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. Purchases by Supplier Table                                */}
      {/* ------------------------------------------------------------- */}
      {activeReport === "supplier" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table id="purchase-report-table-supplier" className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                  <th className="p-3.5 rounded-r-lg">#</th>
                  <th className="p-3.5 font-mono">{isAr ? "كود المورد" : "Supplier Code"}</th>
                  <th className="p-3.5">{isAr ? "اسم المورد" : "Supplier Name"}</th>
                  <th className="p-3.5 text-center font-mono">{isAr ? "عدد الفواتير" : "Bills Count"}</th>
                  <th className="p-3.5 text-center font-mono">{isAr ? "المشتريات قبل الضريبة" : "Taxable Purchases"}</th>
                  <th className="p-3.5 text-center font-mono text-sky-400">{isAr ? "الضريبة" : "VAT"}</th>
                  <th className="p-3.5 text-center font-mono text-emerald-400">{isAr ? "إجمالي الفواتير" : "Total Bills"}</th>
                  <th className="p-3.5 text-center font-mono text-blue-400 rounded-l-lg">{isAr ? "المسدد نقداً" : "Paid"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {supplierData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500 font-sans">
                      {isAr ? "لا توجد مشتريات موردين مطابقة للتصفية." : "No supplier purchases found."}
                    </td>
                  </tr>
                ) : (
                  supplierData.map((row, idx) => (
                    <tr key={row.supplierId} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3.5 text-slate-500">{idx + 1}</td>
                      <td className="p-3.5 font-bold text-slate-300">{row.supplierCode}</td>
                      <td className="p-3.5 font-sans font-bold text-white">{row.supplierName}</td>
                      <td className="p-3.5 text-center text-slate-400">{row.invoicesCount}</td>
                      <td className="p-3.5 text-center text-slate-200">{formatCurrency(row.subtotal, organization.currency, locale)}</td>
                      <td className="p-3.5 text-center text-sky-400 font-semibold">{formatCurrency(row.taxTotal, organization.currency, locale)}</td>
                      <td className="p-3.5 text-center text-emerald-400 font-black">{formatCurrency(row.grandTotal, organization.currency, locale)}</td>
                      <td className="p-3.5 text-center text-blue-400">{formatCurrency(row.paidAmount, organization.currency, locale)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {supplierData.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-950 font-bold border-t border-slate-800 text-white font-mono">
                    <td colSpan={3} className="p-3.5 font-sans">{isAr ? "الإجمالي العام:" : "Grand Total:"}</td>
                    <td className="p-3.5 text-center">{supplierData.reduce((s, r) => s + r.invoicesCount, 0)}</td>
                    <td className="p-3.5 text-center">{formatCurrency(supplierData.reduce((s, r) => s + r.subtotal, 0), organization.currency, locale)}</td>
                    <td className="p-3.5 text-center text-sky-400">{formatCurrency(supplierData.reduce((s, r) => s + r.taxTotal, 0), organization.currency, locale)}</td>
                    <td className="p-3.5 text-center text-emerald-400 text-sm font-black">{formatCurrency(supplierData.reduce((s, r) => s + r.grandTotal, 0), organization.currency, locale)}</td>
                    <td className="p-3.5 text-center text-blue-400">{formatCurrency(supplierData.reduce((s, r) => s + r.paidAmount, 0), organization.currency, locale)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. Purchases by Product Table                                 */}
      {/* ------------------------------------------------------------- */}
      {activeReport === "product" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table id="purchase-report-table-product" className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                  <th className="p-3.5 rounded-r-lg">#</th>
                  <th className="p-3.5 font-mono">{isAr ? "كود الصنف" : "SKU"}</th>
                  <th className="p-3.5">{isAr ? "اسم الصنف" : "Product Name"}</th>
                  <th className="p-3.5">{isAr ? "المجموعة" : "Group"}</th>
                  <th className="p-3.5 text-center font-mono">{isAr ? "الكمية المشتراة" : "Qty Purchased"}</th>
                  <th className="p-3.5 text-center font-mono">{isAr ? "عدد الفواتير" : "Bills"}</th>
                  <th className="p-3.5 text-center font-mono text-sky-400">{isAr ? "الضريبة" : "VAT"}</th>
                  <th className="p-3.5 text-center font-mono text-emerald-400 rounded-l-lg">{isAr ? "إجمالي التكلفة" : "Total Cost"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {productData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500 font-sans">
                      {isAr ? "لا توجد مشتريات أصناف مطابقة للتصفية." : "No product purchases found."}
                    </td>
                  </tr>
                ) : (
                  productData.map((row, idx) => (
                    <tr key={row.productId} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3.5 text-slate-500">{idx + 1}</td>
                      <td className="p-3.5 font-bold text-slate-300">{row.productSku}</td>
                      <td className="p-3.5 font-sans font-bold text-white">{row.productName}</td>
                      <td className="p-3.5 font-sans text-slate-400">{row.categoryName}</td>
                      <td className="p-3.5 text-center font-bold text-amber-400">{row.totalQty}</td>
                      <td className="p-3.5 text-center text-slate-400">{row.invoicesCount.size}</td>
                      <td className="p-3.5 text-center text-sky-400 font-semibold">{formatCurrency(row.totalTax, organization.currency, locale)}</td>
                      <td className="p-3.5 text-center text-emerald-400 font-black">{formatCurrency(row.totalCost, organization.currency, locale)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {productData.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-950 font-bold border-t border-slate-800 text-white font-mono">
                    <td colSpan={4} className="p-3.5 font-sans">{isAr ? "الإجمالي العام:" : "Grand Total:"}</td>
                    <td className="p-3.5 text-center text-amber-400">{productData.reduce((s, r) => s + r.totalQty, 0)}</td>
                    <td className="p-3.5 text-center">-</td>
                    <td className="p-3.5 text-center text-sky-400">{formatCurrency(productData.reduce((s, r) => s + r.totalTax, 0), organization.currency, locale)}</td>
                    <td className="p-3.5 text-center text-emerald-400 text-sm font-black">{formatCurrency(productData.reduce((s, r) => s + r.totalCost, 0), organization.currency, locale)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. Purchases by Product Group Table                           */}
      {/* ------------------------------------------------------------- */}
      {activeReport === "group" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table id="purchase-report-table-group" className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                  <th className="p-3.5 rounded-r-lg">#</th>
                  <th className="p-3.5">{isAr ? "اسم المجموعة / التصنيف" : "Group Name"}</th>
                  <th className="p-3.5 text-center font-mono">{isAr ? "عدد العمليات" : "Transactions"}</th>
                  <th className="p-3.5 text-center font-mono">{isAr ? "إجمالي الكميات المشتراة" : "Qty Purchased"}</th>
                  <th className="p-3.5 text-center font-mono text-sky-400">{isAr ? "ضريبة القيمة المضافة" : "VAT Amount"}</th>
                  <th className="p-3.5 text-center font-mono text-emerald-400">{isAr ? "إجمالي التكلفة" : "Total Purchases"}</th>
                  <th className="p-3.5 text-center font-mono rounded-l-lg">{isAr ? "النسبة من المشتريات" : "% of Purchases"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {groupData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 font-sans">
                      {isAr ? "لا توجد مشتريات مجموعات أصناف مطابقة." : "No category purchases found."}
                    </td>
                  </tr>
                ) : (
                  groupData.map((row, idx) => {
                    const totalGroupSum = groupData.reduce((s, r) => s + r.totalCost, 0);
                    const pct = totalGroupSum > 0 ? ((row.totalCost / totalGroupSum) * 100).toFixed(1) : "0";
                    return (
                      <tr key={row.categoryId} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3.5 text-slate-500">{idx + 1}</td>
                        <td className="p-3.5 font-sans font-bold text-white">{row.categoryName}</td>
                        <td className="p-3.5 text-center text-slate-400">{row.itemsCount}</td>
                        <td className="p-3.5 text-center font-bold text-amber-400">{row.totalQty}</td>
                        <td className="p-3.5 text-center text-sky-400 font-semibold">{formatCurrency(row.totalTax, organization.currency, locale)}</td>
                        <td className="p-3.5 text-center text-emerald-400 font-black">{formatCurrency(row.totalCost, organization.currency, locale)}</td>
                        <td className="p-3.5 text-center text-slate-300 font-bold">%{pct}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {groupData.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-950 font-bold border-t border-slate-800 text-white font-mono">
                    <td colSpan={2} className="p-3.5 font-sans">{isAr ? "الإجمالي العام:" : "Grand Total:"}</td>
                    <td className="p-3.5 text-center">{groupData.reduce((s, r) => s + r.itemsCount, 0)}</td>
                    <td className="p-3.5 text-center text-amber-400">{groupData.reduce((s, r) => s + r.totalQty, 0)}</td>
                    <td className="p-3.5 text-center text-sky-400">{formatCurrency(groupData.reduce((s, r) => s + r.totalTax, 0), organization.currency, locale)}</td>
                    <td className="p-3.5 text-center text-emerald-400 text-sm font-black">{formatCurrency(groupData.reduce((s, r) => s + r.totalCost, 0), organization.currency, locale)}</td>
                    <td className="p-3.5 text-center">100%</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. Purchases during selected period Table                     */}
      {/* ------------------------------------------------------------- */}
      {activeReport === "period" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table id="purchase-report-table-period" className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                  <th className="p-3.5 rounded-r-lg">#</th>
                  <th className="p-3.5 font-mono">{isAr ? "رقم الفاتورة" : "Bill #"}</th>
                  <th className="p-3.5 font-mono">{isAr ? "التاريخ" : "Date"}</th>
                  <th className="p-3.5">{isAr ? "المورد" : "Supplier"}</th>
                  <th className="p-3.5 text-center font-mono">{isAr ? "عدد البنود" : "Items"}</th>
                  <th className="p-3.5 text-center font-mono">{isAr ? "قبل الضريبة" : "Subtotal"}</th>
                  <th className="p-3.5 text-center font-mono text-sky-400">{isAr ? "الضريبة" : "VAT"}</th>
                  <th className="p-3.5 text-center font-mono text-emerald-400 rounded-l-lg">{isAr ? "إجمالي الفاتورة" : "Grand Total"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500 font-sans">
                      {isAr ? "لا توجد فواتير مشتريات مسجلة خلال الفترة المحددة." : "No purchase invoices during selected period."}
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv, idx) => (
                    <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3.5 text-slate-500">{idx + 1}</td>
                      <td className="p-3.5 font-bold text-white">
                        <Link href={`/purchases`} className="hover:text-emerald-400 transition-colors">
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="p-3.5 text-slate-400">{formatDate(inv.date, locale)}</td>
                      <td className="p-3.5 font-sans font-medium text-slate-200">{inv.supplierName}</td>
                      <td className="p-3.5 text-center text-slate-400">{inv.items?.length || 0}</td>
                      <td className="p-3.5 text-center text-slate-300">{formatCurrency(inv.subtotal, organization.currency, locale)}</td>
                      <td className="p-3.5 text-center text-sky-400 font-semibold">{formatCurrency(inv.taxTotal, organization.currency, locale)}</td>
                      <td className="p-3.5 text-center text-emerald-400 font-black">{formatCurrency(inv.grandTotal, organization.currency, locale)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredInvoices.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-950 font-bold border-t border-slate-800 text-white font-mono">
                    <td colSpan={4} className="p-3.5 font-sans">{isAr ? "الإجمالي العام للفترة:" : "Period Total:"}</td>
                    <td className="p-3.5 text-center">{filteredInvoices.reduce((s, inv) => s + (inv.items?.length || 0), 0)}</td>
                    <td className="p-3.5 text-center">{formatCurrency(filteredInvoices.reduce((s, inv) => s + Number(inv.subtotal), 0), organization.currency, locale)}</td>
                    <td className="p-3.5 text-center text-sky-400">{formatCurrency(totalPurchasesTax, organization.currency, locale)}</td>
                    <td className="p-3.5 text-center text-emerald-400 text-sm font-black">{formatCurrency(totalPurchasesCost, organization.currency, locale)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
