"use client";

import React, { useState, useMemo } from "react";
import { useERP } from "@/context/erp-context";
import { FixedAsset, FixedAssetStatus, Account } from "@/types/erp";
import { computeAssetDepreciation } from "@/lib/accounting-engine";
import { formatCurrency, formatDate } from "@/lib/utils";
import { exportTableToExcel } from "@/lib/excel-export";
import Modal from "@/components/ui/Modal";
import TableSkeleton from "@/components/ui/TableSkeleton";
import { ReportPrintHeader } from "@/components/ui/ReportPrintHeader";
import {
  Building2, Plus, Search, Printer, Download, Calendar,
  Edit2, Trash2, Eye, CheckCircle2, XCircle, Filter,
  FileSpreadsheet, Sparkles, Truck, Monitor, Armchair, Wrench,
  Landmark, ArrowRight, BookOpen, Layers
} from "lucide-react";

export default function FixedAssetsRegisterPage() {
  const {
    fixedAssets,
    addFixedAsset,
    updateFixedAsset,
    deleteFixedAsset,
    accounts,
    costCenters,
    organization,
    activeBranchId,
    locale,
    showToast,
    isLoadingData
  } = useERP();

  const isAr = locale === "ar";
  const todayStr = new Date().toISOString().split("T")[0];
  const currentFiscalYear = new Date().getFullYear();
  const defaultFiscalStart = `${currentFiscalYear}-01-01`;

  // Views: "register" (سجل الأصول الرئيسي) | "balances_report" (تقرير أرصدة الأصول)
  const [activeTab, setActiveTab] = useState<"register" | "balances_report">("register");

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [accountFilter, setAccountFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [reportDateFrom, setReportDateFrom] = useState(defaultFiscalStart);
  const [reportDateTo, setReportDateTo] = useState(todayStr);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<FixedAsset | null>(null);
  const [viewingAsset, setViewingAsset] = useState<FixedAsset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formAccountId, setFormAccountId] = useState("");
  const [formPurchaseDate, setFormPurchaseDate] = useState(todayStr);
  const [formPurchaseValue, setFormPurchaseValue] = useState<number | "">("");
  const [formBeginningDeprec, setFormBeginningDeprec] = useState<number | "">("");
  const [formDeprecRate, setFormDeprecRate] = useState<number | "">("");
  const [formStatus, setFormStatus] = useState<FixedAssetStatus>("active");
  const [formCostCenterId, setFormCostCenterId] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // Filter COA for Fixed Asset parent / main accounts (Code 12 or 1201 or names)
  const fixedAssetAccounts = useMemo(() => {
    return accounts.filter(acc => {
      const code = acc.code || "";
      const isFixedCode = code.startsWith("12") || code.startsWith("1201");
      const isFixedName =
        acc.nameAr.includes("أصول ثابتة") ||
        acc.nameAr.includes("أراضي") ||
        acc.nameAr.includes("مباني") ||
        acc.nameAr.includes("سيارات") ||
        acc.nameAr.includes("آلات") ||
        acc.nameAr.includes("معدات") ||
        acc.nameAr.includes("أجهزة") ||
        acc.nameAr.includes("حاسب") ||
        acc.nameAr.includes("أثاث");
      return (isFixedCode || isFixedName) && acc.nature === "debit";
    }).sort((a, b) => (a.code || "").localeCompare(b.code || ""));
  }, [accounts]);

  // Asset type icons helper
  const getAssetIcon = (accCode?: string, name?: string) => {
    const text = (accCode || "") + " " + (name || "");
    if (text.includes("سيار") || text.includes("1201003")) return <Truck className="w-4 h-4 text-amber-400" />;
    if (text.includes("حاسب") || text.includes("كمبيوتر") || text.includes("1201005")) return <Monitor className="w-4 h-4 text-blue-400" />;
    if (text.includes("مبان") || text.includes("عقار") || text.includes("1201002")) return <Building2 className="w-4 h-4 text-emerald-400" />;
    if (text.includes("أثاث") || text.includes("فرش") || text.includes("1201006")) return <Armchair className="w-4 h-4 text-purple-400" />;
    if (text.includes("آلات") || text.includes("معدات") || text.includes("1201004")) return <Wrench className="w-4 h-4 text-orange-400" />;
    return <Landmark className="w-4 h-4 text-cyan-400" />;
  };

  // Asset Master Data Calculations
  const assetMasterRows = useMemo(() => {
    return fixedAssets.map(asset => {
      const parentAcc = accounts.find(a => a.id === asset.accountId);
      const calc = computeAssetDepreciation(asset, todayStr);
      const currentBookValue = calc.currentAssetValue;
      const currentDeprec = calc.currentPeriodDepreciation;
      const totalAccumDeprec = calc.accumulatedDepreciation;

      return {
        ...asset,
        accountCode: parentAcc?.code || "",
        accountNameAr: parentAcc?.nameAr || "",
        accountNameEn: parentAcc?.nameEn || "",
        currentDepreciation: currentDeprec,
        accumulatedDepreciation: totalAccumDeprec,
        currentBookValue: currentBookValue,
      };
    });
  }, [fixedAssets, accounts, todayStr]);

  // Filtered Assets for Master Register
  const filteredMasterAssets = useMemo(() => {
    return assetMasterRows.filter(a => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (accountFilter !== "all" && a.accountId !== accountFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = a.code?.toLowerCase().includes(q);
        const matchName = a.name?.toLowerCase().includes(q);
        const matchAcc = a.accountNameAr?.toLowerCase().includes(q) || a.accountCode?.includes(q);
        if (!matchCode && !matchName && !matchAcc) return false;
      }
      return true;
    });
  }, [assetMasterRows, statusFilter, accountFilter, searchQuery]);

  // Asset Balances Report Rows (Requirement 9)
  const assetBalancesReportRows = useMemo(() => {
    return fixedAssets
      .filter(a => {
        if (accountFilter !== "all" && a.accountId !== accountFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchCode = a.code?.toLowerCase().includes(q);
          const matchName = a.name?.toLowerCase().includes(q);
          if (!matchCode && !matchName) return false;
        }
        return true;
      })
      .map(asset => {
        const parentAcc = accounts.find(a => a.id === asset.accountId);
        // Calculate depreciation within selected date range
        const calc = computeAssetDepreciation(asset, reportDateTo, reportDateFrom, reportDateTo);
        const purchaseVal = Number(asset.purchaseValue) || 0;
        const openingDeprec = Number(asset.beginningDepreciation) || 0;
        const currentPeriodDeprec = calc.currentPeriodDepreciation;
        const totalAccumDeprec = calc.accumulatedDepreciation;
        const endingBookVal = calc.currentAssetValue;

        return {
          id: asset.id,
          assetName: asset.name,
          assetCode: asset.code,
          accountName: parentAcc ? `${parentAcc.code} - ${parentAcc.nameAr}` : (isAr ? "غير محدد" : "Unspecified"),
          purchaseDate: asset.purchaseDate,
          openingDepreciation: openingDeprec,
          purchaseValue: purchaseVal,
          currentPeriodDepreciation: currentPeriodDeprec,
          accumulatedDepreciation: totalAccumDeprec,
          endingBookValue: endingBookVal,
          status: asset.status
        };
      });
  }, [fixedAssets, accounts, accountFilter, searchQuery, reportDateFrom, reportDateTo, isAr]);

  // Register KPI Totals
  const totalPurchaseValue = useMemo(() => filteredMasterAssets.reduce((s, a) => s + (Number(a.purchaseValue) || 0), 0), [filteredMasterAssets]);
  const totalAccumulatedDeprec = useMemo(() => filteredMasterAssets.reduce((s, a) => s + (Number(a.accumulatedDepreciation) || 0), 0), [filteredMasterAssets]);
  const totalCurrentBookValue = useMemo(() => filteredMasterAssets.reduce((s, a) => s + (Number(a.currentBookValue) || 0), 0), [filteredMasterAssets]);

  // Open Form Modal (Add / Edit)
  const handleOpenAddModal = () => {
    setEditingAsset(null);
    setFormError(null);
    const generatedCode = `AST-${String(fixedAssets.length + 1).padStart(4, "0")}`;
    setFormCode(generatedCode);
    setFormName("");
    setFormAccountId(fixedAssetAccounts[0]?.id || "");
    setFormPurchaseDate(todayStr);
    setFormPurchaseValue("");
    setFormBeginningDeprec(0);
    setFormDeprecRate(10);
    setFormStatus("active");
    setFormCostCenterId("");
    setFormNotes("");
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (asset: FixedAsset) => {
    setEditingAsset(asset);
    setFormError(null);
    setFormCode(asset.code || "");
    setFormName(asset.name || "");
    setFormAccountId(asset.accountId || "");
    setFormPurchaseDate(asset.purchaseDate || todayStr);
    setFormPurchaseValue(asset.purchaseValue || 0);
    setFormBeginningDeprec(asset.beginningDepreciation || 0);
    setFormDeprecRate(asset.depreciationRate || 10);
    setFormStatus(asset.status || "active");
    setFormCostCenterId(asset.costCenterId || "");
    setFormNotes(asset.notes || "");
    setIsFormModalOpen(true);
  };

  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formCode.trim()) {
      setFormError(isAr ? "يرجى إدخال كود الأصل" : "Please enter asset code");
      return;
    }
    if (!formName.trim()) {
      setFormError(isAr ? "يرجى إدخال اسم الأصل" : "Please enter asset name");
      return;
    }
    if (!formAccountId) {
      setFormError(isAr ? "يرجى اختيار حساب الأصل الرئيسي" : "Please select main asset account");
      return;
    }
    if (formPurchaseValue === "" || Number(formPurchaseValue) < 0) {
      setFormError(isAr ? "يرجى إدخال قيمة شراء صحيحة" : "Please enter valid purchase value");
      return;
    }

    setIsSubmitting(true);
    try {
      const assetData = {
        organizationId: organization.id,
        branchId: activeBranchId,
        code: formCode.trim(),
        name: formName.trim(),
        assetType: "purchased" as const,
        accountId: formAccountId,
        purchaseDate: formPurchaseDate,
        purchaseValue: Number(formPurchaseValue) || 0,
        beginningDepreciation: Number(formBeginningDeprec) || 0,
        depreciationRate: Number(formDeprecRate) || 0,
        status: formStatus,
        costCenterId: formCostCenterId || undefined,
        notes: formNotes.trim() || undefined,
      };

      if (editingAsset) {
        await updateFixedAsset(editingAsset.id, assetData);
        showToast(isAr ? "تم تحديث بيانات الأصل بنجاح" : "Asset updated successfully", "success");
      } else {
        await addFixedAsset(assetData);
        showToast(isAr ? "تم تسجيل الأصل الثابت بنجاح" : "Asset created successfully", "success");
      }
      setIsFormModalOpen(false);
    } catch (err: any) {
      console.error("Save asset error:", err);
      setFormError(err?.message || (isAr ? "حدث خطأ أثناء حفظ الأصل" : "Failed to save asset"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(isAr ? `هل أنت متأكد من حذف الأصل (${name})؟` : `Are you sure you want to delete ${name}?`)) {
      try {
        await deleteFixedAsset(id);
        showToast(isAr ? "تم حذف الأصل بنجاح" : "Asset deleted", "success");
      } catch (err: any) {
        showToast(err?.message || (isAr ? "فشل حذف الأصل" : "Failed to delete asset"), "error");
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const tableId = activeTab === "register" ? "fixed-assets-master-table" : "fixed-assets-balances-table";
    const filename = activeTab === "register" ? "سجل_الاصول_الثابتة" : "تقرير_ارصدة_الاصول_الثابتة";
    exportTableToExcel(tableId, filename);
  };

  if (isLoadingData) {
    return <TableSkeleton rows={6} columns={8} summaryCards={3} isAr={isAr} />;
  }

  return (
    <div className="space-y-6">
      {/* Print Header */}
      <div className="hidden print:block">
        <ReportPrintHeader
          organization={organization}
          reportTitleAr={activeTab === "register" ? "سجل الأصول الثابتة (بيانات رئيسية)" : "تقرير أرصدة الأصول الثابتة"}
          reportTitleEn={activeTab === "register" ? "Fixed Assets Master Register" : "Fixed Asset Balances Report"}
          dateFrom={activeTab === "balances_report" ? reportDateFrom : undefined}
          dateTo={activeTab === "balances_report" ? reportDateTo : todayStr}
          locale={locale}
        />
      </div>

      {/* Main Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm print:hidden">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-emerald-400" />
            <span>{isAr ? "سجل الأصول الثابتة (Fixed Assets Register)" : "Fixed Assets Register"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? "إدارة الأصول الثابتة، تكلفة الشراء، الإهلاك المتراكم، والقيمة الدفترية الحالية منفصلة تماماً عن مجمع الإهلاك"
              : "Comprehensive Fixed Asset Master Data with acquisition cost, accumulated depreciation, and book value"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>{isAr ? "تصدير Excel" : "Excel"}</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all shadow-sm"
          >
            <Printer className="w-4 h-4 text-sky-400" />
            <span>{isAr ? "طباعة" : "Print"}</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/60 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? "إضافة أصل جديد" : "Add Asset"}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-900/60 p-2 rounded-2xl border border-slate-800 print:hidden">
        <button
          onClick={() => setActiveTab("register")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === "register"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
              : "bg-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>{isAr ? "سجل الأصول (بيانات رئيسية)" : "Asset Master Register"}</span>
        </button>
        <button
          onClick={() => setActiveTab("balances_report")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === "balances_report"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
              : "bg-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>{isAr ? "تقرير أرصدة الأصول الثابتة" : "Asset Balances Report"}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 print:hidden">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] text-slate-400 block">{isAr ? "عدد الأصول الثابتة" : "Total Assets"}</span>
          <span className="text-xl font-bold font-mono text-white mt-1 block">{filteredMasterAssets.length}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] text-slate-400 block">{isAr ? "إجمالي قيمة الشراء (التكلفة التاريخية)" : "Historical Cost"}</span>
          <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
            {formatCurrency(totalPurchaseValue, organization.currency, locale)}
          </span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] text-slate-400 block">{isAr ? "إجمالي مجمع الإهلاك" : "Total Depreciation"}</span>
          <span className="text-xl font-bold font-mono text-amber-400 mt-1 block">
            {formatCurrency(totalAccumulatedDeprec, organization.currency, locale)}
          </span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] text-slate-400 block">{isAr ? "صافي القيمة الدفترية الحالية" : "Net Book Value"}</span>
          <span className="text-xl font-bold font-mono text-sky-400 mt-1 block">
            {formatCurrency(totalCurrentBookValue, organization.currency, locale)}
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 print:hidden">
        {/* Search */}
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-slate-500 absolute top-3 right-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? "بحث بكود الأصل، اسم الأصل، أو اسم الحساب..." : "Search by asset code, name, or account..."}
            className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 pr-9 pl-3 py-2.5 rounded-xl focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Main Asset Account Filter */}
        <div>
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">{isAr ? "جميع حسابات الأصول" : "All Asset Accounts"}</option>
            {fixedAssetAccounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.code} - {acc.nameAr}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter (Register View) OR Date Filter (Report View) */}
        {activeTab === "register" ? (
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">{isAr ? "جميع الحالات" : "All Statuses"}</option>
              <option value="active">{isAr ? "نشط (قيد الاستخدام)" : "Active"}</option>
              <option value="inactive">{isAr ? "معطل / موقوف" : "Inactive"}</option>
            </select>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="date"
              value={reportDateFrom}
              onChange={(e) => setReportDateFrom(e.target.value)}
              className="w-1/2 bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-2 py-2 focus:outline-none focus:border-emerald-500"
              title={isAr ? "من تاريخ" : "From Date"}
            />
            <input
              type="date"
              value={reportDateTo}
              onChange={(e) => setReportDateTo(e.target.value)}
              className="w-1/2 bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-2 py-2 focus:outline-none focus:border-emerald-500"
              title={isAr ? "إلى تاريخ" : "To Date"}
            />
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: MASTER ASSETS REGISTER TABLE (Requirement 7) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "register" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table id="fixed-assets-master-table" className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                  <th className="p-3.5 rounded-r-lg">#</th>
                  <th className="p-3.5 font-mono">{isAr ? "كود الأصل" : "Asset Code"}</th>
                  <th className="p-3.5">{isAr ? "اسم الأصل" : "Asset Name"}</th>
                  <th className="p-3.5">{isAr ? "الحساب الرئيسي" : "Main Asset Account"}</th>
                  <th className="p-3.5">{isAr ? "تاريخ الشراء" : "Purchase Date"}</th>
                  <th className="p-3.5 text-center font-mono">{isAr ? "قيمة الشراء" : "Purchase Value"}</th>
                  <th className="p-3.5 text-center font-mono">{isAr ? "إهلاك أول المدة" : "Opening Deprec"}</th>
                  <th className="p-3.5 text-center font-mono">{isAr ? "إهلاك الفترة" : "Period Deprec"}</th>
                  <th className="p-3.5 text-center font-mono">{isAr ? "مجمع الإهلاك" : "Accumulated"}</th>
                  <th className="p-3.5 text-center font-mono text-emerald-400">{isAr ? "القيمة الدفترية" : "Book Value"}</th>
                  <th className="p-3.5 text-center">{isAr ? "الحالة" : "Status"}</th>
                  <th className="p-3.5">{isAr ? "ملاحظات" : "Notes"}</th>
                  <th className="p-3.5 rounded-l-lg text-center print:hidden">{isAr ? "الإجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredMasterAssets.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="p-8 text-center text-slate-500 font-sans">
                      {isAr ? "لا توجد أصول ثابتة مسجلة مطابقة لمعايير البحث" : "No fixed assets match the criteria"}
                    </td>
                  </tr>
                ) : (
                  filteredMasterAssets.map((asset, idx) => (
                    <tr key={asset.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3.5 text-slate-500 font-mono">{idx + 1}</td>
                      <td className="p-3.5 font-mono font-bold text-white">{asset.code}</td>
                      <td className="p-3.5 font-bold text-slate-200">
                        <div className="flex items-center gap-2">
                          {getAssetIcon(asset.accountCode, asset.name)}
                          <span>{asset.name}</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-300 font-medium">
                        {asset.accountCode} - {asset.accountNameAr || asset.accountNameEn}
                      </td>
                      <td className="p-3.5 text-slate-400 font-sans">{formatDate(asset.purchaseDate, locale)}</td>
                      <td className="p-3.5 text-center font-mono font-semibold text-slate-200">
                        {formatCurrency(asset.purchaseValue, organization.currency, locale)}
                      </td>
                      <td className="p-3.5 text-center font-mono text-slate-400">
                        {formatCurrency(asset.beginningDepreciation || 0, organization.currency, locale)}
                      </td>
                      <td className="p-3.5 text-center font-mono text-amber-400">
                        {formatCurrency(asset.currentDepreciation || 0, organization.currency, locale)}
                      </td>
                      <td className="p-3.5 text-center font-mono text-rose-400 font-semibold">
                        {formatCurrency(asset.accumulatedDepreciation || 0, organization.currency, locale)}
                      </td>
                      <td className="p-3.5 text-center font-mono font-black text-emerald-400">
                        {formatCurrency(asset.currentBookValue || 0, organization.currency, locale)}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          asset.status === "active"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                        }`}>
                          {asset.status === "active" ? (isAr ? "نشط" : "Active") : (isAr ? "موقوف" : "Inactive")}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px] max-w-[150px] truncate">
                        {asset.notes || "-"}
                      </td>
                      <td className="p-3.5 text-center print:hidden">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setViewingAsset(asset)}
                            title={isAr ? "عرض بطاقة الأصل" : "View"}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(asset)}
                            title={isAr ? "تعديل الأصل" : "Edit"}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(asset.id, asset.name)}
                            title={isAr ? "حذف الأصل" : "Delete"}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: ASSET BALANCES REPORT (Requirement 9) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "balances_report" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table id="fixed-assets-balances-table" className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                  <th className="p-3.5 rounded-r-lg">#</th>
                  <th className="p-3.5">{isAr ? "اسم الأصل" : "Asset Name"}</th>
                  <th className="p-3.5 font-mono">{isAr ? "كود الأصل" : "Asset Code"}</th>
                  <th className="p-3.5">{isAr ? "الحساب الرئيسي" : "Main Asset Account"}</th>
                  <th className="p-3.5">{isAr ? "تاريخ الشراء" : "Purchase Date"}</th>
                  <th className="p-3.5 text-center font-mono">{isAr ? "قيمة الشراء" : "Purchase Value"}</th>
                  <th className="p-3.5 text-center font-mono">{isAr ? "إهلاك أول المدة" : "Opening Deprec"}</th>
                  <th className="p-3.5 text-center font-mono text-amber-400">{isAr ? "إهلاك الفترة الحالية" : "Current Period Deprec"}</th>
                  <th className="p-3.5 text-center font-mono text-rose-400">{isAr ? "مجمع الإهلاك" : "Accumulated Deprec"}</th>
                  <th className="p-3.5 text-center font-mono text-emerald-400 font-black rounded-l-lg">{isAr ? "صافي القيمة الدفترية" : "Ending Book Value"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {assetBalancesReportRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-500 font-sans">
                      {isAr ? "لا توجد بيانات متاحة للعرض في هذا التقرير" : "No asset data available for report"}
                    </td>
                  </tr>
                ) : (
                  assetBalancesReportRows.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3.5 text-slate-500 font-mono">{idx + 1}</td>
                      <td className="p-3.5 font-bold text-white">{row.assetName}</td>
                      <td className="p-3.5 font-mono text-slate-300">{row.assetCode}</td>
                      <td className="p-3.5 text-slate-400">{row.accountName}</td>
                      <td className="p-3.5 text-slate-400 font-sans">{formatDate(row.purchaseDate, locale)}</td>
                      <td className="p-3.5 text-center font-mono font-semibold text-slate-200">
                        {formatCurrency(row.purchaseValue, organization.currency, locale)}
                      </td>
                      <td className="p-3.5 text-center font-mono text-slate-400">
                        {formatCurrency(row.openingDepreciation, organization.currency, locale)}
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-amber-400">
                        {formatCurrency(row.currentPeriodDepreciation, organization.currency, locale)}
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-rose-400">
                        {formatCurrency(row.accumulatedDepreciation, organization.currency, locale)}
                      </td>
                      <td className="p-3.5 text-center font-mono font-black text-emerald-400 text-sm">
                        {formatCurrency(row.endingBookValue, organization.currency, locale)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD / EDIT ASSET (Master Data) */}
      {/* ------------------------------------------------------------- */}
      {isFormModalOpen && (
        <Modal
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          title={editingAsset ? (isAr ? "تعديل بيانات الأصل الثابت" : "Edit Fixed Asset") : (isAr ? "إضافة أصل ثابت جديد" : "Add Fixed Asset")}
          size="lg"
        >
          <form onSubmit={handleSaveAsset} className="space-y-4">
            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Asset Code */}
              <div>
                <label className="text-xs text-slate-400 block mb-1 font-bold">
                  {isAr ? "كود الأصل *" : "Asset Code *"}
                </label>
                <input
                  type="text"
                  required
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white px-3 py-2 rounded-xl focus:border-emerald-500 font-mono"
                  placeholder="AST-0001"
                />
              </div>

              {/* Asset Name */}
              <div>
                <label className="text-xs text-slate-400 block mb-1 font-bold">
                  {isAr ? "اسم الأصل *" : "Asset Name *"}
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white px-3 py-2 rounded-xl focus:border-emerald-500"
                  placeholder={isAr ? "مثال: سيارة تويوتا كورولا 2024" : "e.g., Toyota Corolla 2024"}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Main Asset Account */}
              <div>
                <label className="text-xs text-slate-400 block mb-1 font-bold">
                  {isAr ? "الحساب الرئيسي للأصل *" : "Main Asset Account *"}
                </label>
                <select
                  required
                  value={formAccountId}
                  onChange={(e) => setFormAccountId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white px-3 py-2 rounded-xl focus:border-emerald-500"
                >
                  <option value="">{isAr ? "-- اختر الحساب من شجرة الحسابات --" : "-- Select Account --"}</option>
                  {fixedAssetAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} - {acc.nameAr}
                    </option>
                  ))}
                </select>
              </div>

              {/* Purchase Date */}
              <div>
                <label className="text-xs text-slate-400 block mb-1 font-bold">
                  {isAr ? "تاريخ الشراء *" : "Purchase Date *"}
                </label>
                <input
                  type="date"
                  required
                  value={formPurchaseDate}
                  onChange={(e) => setFormPurchaseDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white px-3 py-2 rounded-xl focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Purchase Value */}
              <div>
                <label className="text-xs text-slate-400 block mb-1 font-bold">
                  {isAr ? "قيمة الشراء (التكلفة) *" : "Purchase Value *"}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={formPurchaseValue}
                  onChange={(e) => setFormPurchaseValue(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white px-3 py-2 rounded-xl focus:border-emerald-500 font-mono"
                  placeholder="0.00"
                />
              </div>

              {/* Opening Accumulated Depreciation */}
              <div>
                <label className="text-xs text-slate-400 block mb-1 font-bold">
                  {isAr ? "مجمع إهلاك أول المدة" : "Opening Depreciation"}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formBeginningDeprec}
                  onChange={(e) => setFormBeginningDeprec(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white px-3 py-2 rounded-xl focus:border-emerald-500 font-mono"
                  placeholder="0.00"
                />
              </div>

              {/* Annual Depreciation Rate % */}
              <div>
                <label className="text-xs text-slate-400 block mb-1 font-bold">
                  {isAr ? "نسبة الإهلاك السنوي (%)" : "Annual Deprec Rate %"}
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formDeprecRate}
                  onChange={(e) => setFormDeprecRate(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white px-3 py-2 rounded-xl focus:border-emerald-500 font-mono"
                  placeholder="10.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Status */}
              <div>
                <label className="text-xs text-slate-400 block mb-1 font-bold">
                  {isAr ? "حالة الأصل" : "Status"}
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white px-3 py-2 rounded-xl focus:border-emerald-500"
                >
                  <option value="active">{isAr ? "نشط (قيد الاستخدام والإهلاك)" : "Active"}</option>
                  <option value="inactive">{isAr ? "موقوف (إيقاف احتساب الإهلاك)" : "Inactive"}</option>
                </select>
              </div>

              {/* Cost Center */}
              <div>
                <label className="text-xs text-slate-400 block mb-1 font-bold">
                  {isAr ? "مركز التكلفة (اختياري)" : "Cost Center (Optional)"}
                </label>
                <select
                  value={formCostCenterId}
                  onChange={(e) => setFormCostCenterId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white px-3 py-2 rounded-xl focus:border-emerald-500"
                >
                  <option value="">{isAr ? "-- بدون مركز تكلفة --" : "-- None --"}</option>
                  {costCenters.map(cc => (
                    <option key={cc.id} value={cc.id}>
                      {cc.code} - {cc.nameAr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs text-slate-400 block mb-1 font-bold">
                {isAr ? "ملاحظات إضافية" : "Notes"}
              </label>
              <textarea
                rows={2}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-white px-3 py-2 rounded-xl focus:border-emerald-500"
                placeholder={isAr ? "رقم الشاسيه، اللوحة، موقع الأصل، أو أي بيانات تعريفية..." : "Serial number, chassis, location..."}
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white text-xs font-bold rounded-xl"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-950/40 disabled:opacity-50"
              >
                {isSubmitting ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ الأصل" : "Save Asset")}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: VIEW ASSET DETAILS */}
      {/* ------------------------------------------------------------- */}
      {viewingAsset && (
        <Modal
          isOpen={!!viewingAsset}
          onClose={() => setViewingAsset(null)}
          title={isAr ? "بطاقة الأصل الثابت" : "Asset Details Card"}
          size="md"
        >
          <div className="space-y-4">
            <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-xs text-slate-400">{isAr ? "كود الأصل:" : "Asset Code:"}</span>
                <span className="font-mono font-bold text-white text-sm">{viewingAsset.code}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-xs text-slate-400">{isAr ? "اسم الأصل:" : "Asset Name:"}</span>
                <span className="font-bold text-white text-sm">{viewingAsset.name}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-xs text-slate-400">{isAr ? "الحساب الرئيسي:" : "Main Account:"}</span>
                <span className="text-slate-300 text-xs">
                  {accounts.find(a => a.id === viewingAsset.accountId)?.nameAr || "-"}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-xs text-slate-400">{isAr ? "تاريخ الشراء:" : "Purchase Date:"}</span>
                <span className="text-slate-300 text-xs">{formatDate(viewingAsset.purchaseDate, locale)}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-xs text-slate-400">{isAr ? "قيمة الشراء التاريخية:" : "Purchase Value:"}</span>
                <span className="font-mono font-bold text-slate-200">
                  {formatCurrency(viewingAsset.purchaseValue, organization.currency, locale)}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-xs text-slate-400">{isAr ? "مجمع إهلاك أول المدة:" : "Opening Deprec:"}</span>
                <span className="font-mono font-bold text-slate-400">
                  {formatCurrency(viewingAsset.beginningDepreciation || 0, organization.currency, locale)}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-xs text-slate-400">{isAr ? "معدل الإهلاك السنوي:" : "Annual Rate:"}</span>
                <span className="font-mono font-bold text-amber-400">{viewingAsset.depreciationRate}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">{isAr ? "الحالة:" : "Status:"}</span>
                <span className="font-bold text-emerald-400">
                  {viewingAsset.status === "active" ? (isAr ? "نشط" : "Active") : (isAr ? "موقوف" : "Inactive")}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingAsset(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white text-xs font-bold rounded-xl"
              >
                {isAr ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
