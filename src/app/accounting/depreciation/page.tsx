"use client";

import React, { useState, useMemo } from "react";
import { useERP } from "@/context/erp-context";
import { FixedAsset, FixedAssetType, FixedAssetStatus, Account } from "@/types/erp";
import { computeAssetDepreciation } from "@/lib/accounting-engine";
import { formatCurrency, formatDate } from "@/lib/utils";
import { exportTableToExcel } from "@/lib/excel-export";
import Modal from "@/components/ui/Modal";
import TableSkeleton from "@/components/ui/TableSkeleton";
import { ReportPrintHeader, ReportPrintFooter } from "@/components/ui/ReportPrintHeader";
import {
  Building,
  Building2,
  Plus,
  Search,
  Printer,
  Download,
  Calendar,
  Layers,
  Calculator,
  ShieldCheck,
  Power,
  Edit2,
  Trash2,
  Sparkles,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  History,
  Truck,
  Monitor,
  Armchair,
  Wrench,
  Landmark,
  ArrowRight,
  Filter
} from "lucide-react";

export default function FixedAssetDepreciationPage() {
  const {
    fixedAssets,
    addFixedAsset,
    updateFixedAsset,
    deleteFixedAsset,
    postAssetDepreciation,
    postAllActiveAssetsDepreciation,
    accounts,
    costCenters,
    organization,
    activeBranchId,
    currentUser,
    locale,
    showToast,
    isLoadingData,
    auditLogs,
  } = useERP();

  const isAr = locale === "ar";
  const currentFiscalYear = new Date().getFullYear();
  const defaultFiscalStart = `${currentFiscalYear}-01-01`;
  const todayStr = new Date().toISOString().split("T")[0];

  // Active Tab: 
  // - purchased: Card 1 (إضافة وعرض أصول مشتراة)
  // - opening: Card 2 (إثبات أصول أول المدة)
  // - report: Card 3 (تقرير أرصدة الأصول)
  // - audit: سجل التدقيق والمراجعة
  const [activeTab, setActiveTab] = useState<"purchased" | "opening" | "report" | "audit">("purchased");

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [reportAssetFilter, setReportAssetFilter] = useState<string>("all");
  const [reportFromDate, setReportFromDate] = useState<string>(defaultFiscalStart);
  const [reportToDate, setReportToDate] = useState<string>(todayStr);

  // Modal State: Create / Edit Purchased Asset
  const [isPurchasedModalOpen, setIsPurchasedModalOpen] = useState(false);
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<FixedAsset | null>(null);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formAccountId, setFormAccountId] = useState("");
  const [formPurchaseValue, setFormPurchaseValue] = useState<number | "">("");
  const [formBeginningDeprec, setFormBeginningDeprec] = useState<number | "">("");
  const [formPurchaseDate, setFormPurchaseDate] = useState(todayStr);
  const [formRate, setFormRate] = useState<number | "">("");
  const [formStatus, setFormStatus] = useState<FixedAssetStatus>("active");
  const [formCostCenterId, setFormCostCenterId] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Posting state
  const [isPostingAll, setIsPostingAll] = useState(false);

  // -------------------------------------------------------------
  // Filter Fixed Asset Accounts strictly from Chart of Accounts
  // Examples: Land (1201001), Buildings (1201002), Vehicles (1201003),
  // Equipment (1201004), Computers (1201005), Furniture (1201006)
  // -------------------------------------------------------------
  const fixedAssetAccounts = useMemo(() => {
    return accounts.filter(acc => {
      const c = acc.code || "";
      const isCodeMatch = c.startsWith("1201") || c.startsWith("120");
      const isNameMatch =
        acc.nameAr.includes("أصول ثابتة") ||
        acc.nameAr.includes("أراضي") ||
        acc.nameAr.includes("مباني") ||
        acc.nameAr.includes("سيارات") ||
        acc.nameAr.includes("آلات") ||
        acc.nameAr.includes("معدات") ||
        acc.nameAr.includes("أجهزة") ||
        acc.nameAr.includes("حاسب") ||
        acc.nameAr.includes("أثاث");
      // Only include leaf accounts or level >= 3
      return (isCodeMatch || isNameMatch) && acc.level >= 3 && acc.nature === "debit";
    });
  }, [accounts]);

  // Account icon selector
  const getAccountIcon = (code?: string, name?: string) => {
    const text = (code || "") + " " + (name || "");
    if (text.includes("سيارات") || text.includes("1201003")) return <Truck className="w-4 h-4 text-amber-400" />;
    if (text.includes("حاسب") || text.includes("1201005")) return <Monitor className="w-4 h-4 text-blue-400" />;
    if (text.includes("مباني") || text.includes("1201002")) return <Building2 className="w-4 h-4 text-emerald-400" />;
    if (text.includes("أثاث") || text.includes("1201006")) return <Armchair className="w-4 h-4 text-purple-400" />;
    if (text.includes("آلات") || text.includes("معدات") || text.includes("1201004")) return <Wrench className="w-4 h-4 text-orange-400" />;
    return <Landmark className="w-4 h-4 text-cyan-400" />;
  };

  // -------------------------------------------------------------
  // Calculate Live Depreciation and Valuations for all assets
  // -------------------------------------------------------------
  const calculatedAssets = useMemo(() => {
    return fixedAssets.map(asset => {
      const calc = computeAssetDepreciation(asset, todayStr);
      const mainAcc = accounts.find(a => a.id === asset.accountId);
      return {
        ...asset,
        calc,
        mainAccount: mainAcc,
      };
    });
  }, [fixedAssets, accounts, todayStr]);

  // KPIs
  const kpis = useMemo(() => {
    const totalCount = fixedAssets.length;
    const activeCount = fixedAssets.filter(a => a.status === "active").length;
    const totalPurchaseValue = calculatedAssets.reduce((sum, a) => sum + (Number(a.purchaseValue) || 0), 0);
    const totalAccumulatedDeprec = calculatedAssets.reduce((sum, a) => sum + (Number(a.calc.accumulatedDepreciation) || 0), 0);
    const totalCurrentValue = calculatedAssets.reduce((sum, a) => sum + (Number(a.calc.currentAssetValue) || 0), 0);
    const currentPeriodDeprec = calculatedAssets.reduce((sum, a) => sum + (Number(a.calc.currentPeriodDepreciation) || 0), 0);

    return {
      totalCount,
      activeCount,
      totalPurchaseValue,
      totalAccumulatedDeprec,
      totalCurrentValue,
      currentPeriodDeprec,
    };
  }, [fixedAssets, calculatedAssets]);

  // Filtered lists
  const purchasedAssetsList = useMemo(() => {
    return calculatedAssets.filter(a => {
      if (a.assetType === "opening") return false;
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = a.name.toLowerCase().includes(q);
        const matchAcc = a.mainAccount?.nameAr.toLowerCase().includes(q) || a.mainAccount?.code.includes(q);
        if (!matchName && !matchAcc) return false;
      }
      return true;
    });
  }, [calculatedAssets, statusFilter, searchQuery]);

  const openingAssetsList = useMemo(() => {
    return calculatedAssets.filter(a => {
      if (a.assetType !== "opening") return false;
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = a.name.toLowerCase().includes(q);
        const matchAcc = a.mainAccount?.nameAr.toLowerCase().includes(q) || a.mainAccount?.code.includes(q);
        if (!matchName && !matchAcc) return false;
      }
      return true;
    });
  }, [calculatedAssets, statusFilter, searchQuery]);

  // Report Rows Calculation
  const reportRows = useMemo(() => {
    return calculatedAssets
      .filter(a => {
        if (reportAssetFilter !== "all" && a.id !== reportAssetFilter) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchName = a.name.toLowerCase().includes(q);
          const matchAcc = a.mainAccount?.nameAr.toLowerCase().includes(q) || a.mainAccount?.code.includes(q);
          if (!matchName && !matchAcc) return false;
        }
        return true;
      })
      .map(a => {
        // Calculate within custom date window [reportFromDate, reportToDate]
        const periodCalc = computeAssetDepreciation(a, undefined, reportFromDate, reportToDate);
        return {
          id: a.id,
          name: a.name,
          mainAccountCode: a.mainAccount?.code || "-",
          mainAccountName: a.mainAccount ? (isAr ? a.mainAccount.nameAr : a.mainAccount.nameEn) : (isAr ? "أصول ثابتة" : "Fixed Assets"),
          purchaseDate: a.purchaseDate,
          purchaseValue: Number(a.purchaseValue) || 0,
          beginningDepreciation: Number(a.beginningDepreciation) || 0,
          openingAssetValue: periodCalc.openingAssetValue,
          currentPeriodDepreciation: periodCalc.currentPeriodDepreciation,
          accumulatedDepreciation: periodCalc.accumulatedDepreciation,
          closingAssetValue: periodCalc.currentAssetValue,
          status: a.status,
          depreciationRate: a.depreciationRate,
        };
      });
  }, [calculatedAssets, reportAssetFilter, reportFromDate, reportToDate, searchQuery, isAr]);

  // Report Totals
  const reportTotals = useMemo(() => {
    return reportRows.reduce(
      (acc, r) => ({
        purchaseValue: acc.purchaseValue + r.purchaseValue,
        beginningDepreciation: acc.beginningDepreciation + r.beginningDepreciation,
        openingAssetValue: acc.openingAssetValue + r.openingAssetValue,
        currentPeriodDepreciation: acc.currentPeriodDepreciation + r.currentPeriodDepreciation,
        accumulatedDepreciation: acc.accumulatedDepreciation + r.accumulatedDepreciation,
        closingAssetValue: acc.closingAssetValue + r.closingAssetValue,
      }),
      {
        purchaseValue: 0,
        beginningDepreciation: 0,
        openingAssetValue: 0,
        currentPeriodDepreciation: 0,
        accumulatedDepreciation: 0,
        closingAssetValue: 0,
      }
    );
  }, [reportRows]);

  // -------------------------------------------------------------
  // Handlers: Open Modals
  // -------------------------------------------------------------
  const openAddPurchasedModal = () => {
    setEditingAsset(null);
    setFormName("");
    setFormAccountId(fixedAssetAccounts[0]?.id || "");
    setFormPurchaseValue("");
    setFormBeginningDeprec(0);
    setFormPurchaseDate(todayStr);
    setFormRate(10);
    setFormStatus("active");
    setFormCostCenterId("");
    setFormNotes("");
    setFormError(null);
    setIsPurchasedModalOpen(true);
  };

  const openAddOpeningModal = () => {
    setEditingAsset(null);
    setFormName("");
    setFormAccountId(fixedAssetAccounts[0]?.id || "");
    setFormPurchaseValue("");
    setFormBeginningDeprec("");
    setFormPurchaseDate(defaultFiscalStart); // Auto-assigns 01/01/Current Fiscal Year
    setFormRate(10);
    setFormStatus("active");
    setFormCostCenterId("");
    setFormNotes("");
    setFormError(null);
    setIsOpeningModalOpen(true);
  };

  const openEditModal = (asset: FixedAsset) => {
    setEditingAsset(asset);
    setFormName(asset.name);
    setFormAccountId(asset.accountId || "");
    setFormPurchaseValue(asset.purchaseValue);
    setFormBeginningDeprec(asset.beginningDepreciation);
    setFormPurchaseDate(asset.purchaseDate);
    setFormRate(asset.depreciationRate);
    setFormStatus(asset.status);
    setFormCostCenterId(asset.costCenterId || "");
    setFormNotes(asset.notes || "");
    setFormError(null);

    if (asset.assetType === "opening") {
      setIsOpeningModalOpen(true);
    } else {
      setIsPurchasedModalOpen(true);
    }
  };

  // -------------------------------------------------------------
  // Form Submit Handler
  // -------------------------------------------------------------
  const handleSaveAsset = async (type: FixedAssetType) => {
    if (!formName.trim()) {
      setFormError(isAr ? "يرجى إدخال اسم الأصل" : "Asset name is required");
      return;
    }
    const pVal = Number(formPurchaseValue);
    if (isNaN(pVal) || pVal <= 0) {
      setFormError(isAr ? "يرجى إدخال قيمة شراء صحيحة أكبر من صفر" : "Valid purchase value required");
      return;
    }
    const bDep = Number(formBeginningDeprec) || 0;
    if (bDep < 0 || bDep > pVal) {
      setFormError(isAr ? "إهلاك أول المدة يجب ألا يتجاوز قيمة الشراء" : "Beginning depreciation cannot exceed purchase value");
      return;
    }
    const rate = Number(formRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      setFormError(isAr ? "يرجى إدخال نسبة إهلاك بين 0% و 100%" : "Rate must be between 0% and 100%");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      if (editingAsset) {
        await updateFixedAsset(editingAsset.id, {
          name: formName.trim(),
          accountId: formAccountId || undefined,
          purchaseValue: pVal,
          beginningDepreciation: bDep,
          purchaseDate: type === "opening" ? defaultFiscalStart : formPurchaseDate,
          depreciationRate: rate,
          status: formStatus,
          costCenterId: formCostCenterId || undefined,
          notes: formNotes,
        });
      } else {
        await addFixedAsset({
          organizationId: organization.id,
          branchId: activeBranchId,
          name: formName.trim(),
          assetType: type,
          accountId: formAccountId || fixedAssetAccounts[0]?.id,
          purchaseDate: type === "opening" ? defaultFiscalStart : formPurchaseDate,
          purchaseValue: pVal,
          beginningDepreciation: bDep,
          depreciationRate: rate,
          status: formStatus,
          costCenterId: formCostCenterId || undefined,
          notes: formNotes,
          createdBy: currentUser.name,
        });
      }

      setIsPurchasedModalOpen(false);
      setIsOpeningModalOpen(false);
      setEditingAsset(null);
    } catch (err: any) {
      setFormError(err.message || (isAr ? "حدث خطأ أثناء الحفظ" : "Save failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status toggle handler
  const handleToggleStatus = async (asset: FixedAsset) => {
    const nextStatus: FixedAssetStatus = asset.status === "active" ? "inactive" : "active";
    try {
      await updateFixedAsset(asset.id, { status: nextStatus });
    } catch (err: any) {
      showToast(err.message || (isAr ? "فشل تعديل الحالة" : "Status update failed"), "error");
    }
  };

  // Delete handler
  const handleDeleteAsset = async (asset: FixedAsset) => {
    const confirmMsg = isAr
      ? `هل أنت متأكد من حذف الأصل (${asset.name})؟ لن يؤثر هذا على القيود المسجلة مسبقاً.`
      : `Are you sure you want to delete asset (${asset.name})?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await deleteFixedAsset(asset.id);
    } catch (err: any) {
      showToast(err.message || (isAr ? "فشل حذف الأصل" : "Delete failed"), "error");
    }
  };

  // Single post depreciation
  const handlePostSingleDepreciation = async (asset: FixedAsset) => {
    try {
      await postAssetDepreciation(asset.id, todayStr);
    } catch (err: any) {
      showToast(err.message || (isAr ? "فشل ترحيل الإهلاك" : "Depreciation post failed"), "error");
    }
  };

  // Post all active depreciation
  const handlePostAllActive = async () => {
    const confirmMsg = isAr
      ? `هل ترغب في احتساب وترحيل إهلاك الفترة لكافة الأصول النشطة وتوليد القيود المحاسبية تلقائياً؟`
      : `Post depreciation for all active assets?`;
    if (!window.confirm(confirmMsg)) return;

    setIsPostingAll(true);
    try {
      await postAllActiveAssetsDepreciation(todayStr);
    } finally {
      setIsPostingAll(false);
    }
  };

  // -------------------------------------------------------------
  // Excel Export Handler
  // -------------------------------------------------------------
  const handleExportExcel = () => {
    exportTableToExcel({
      filename: `تقرير_أرصدة_الأصول_الثابتة_${reportFromDate}_إلى_${reportToDate}`,
      sheetName: isAr ? "أرصدة الأصول" : "Fixed Assets",
      title: isAr ? "تقرير أرصدة وإهلاك الأصول الثابتة" : "Fixed Asset Balances & Depreciation Report",
      organizationName: isAr ? organization.nameAr : organization.nameEn,
      columns: [
        { header: isAr ? "اسم الأصل" : "Asset Name", key: "name", width: 25 },
        { header: isAr ? "الحساب الرئيسي" : "Main Account", key: "account", width: 22 },
        { header: isAr ? "تاريخ الشراء" : "Purchase Date", key: "purchaseDate", width: 14 },
        { header: isAr ? "تكلفة الشراء" : "Purchase Value", key: "purchaseValue", width: 15 },
        { header: isAr ? "إهلاك أول المدة" : "Beg. Depreciation", key: "beginningDeprec", width: 15 },
        { header: isAr ? "القيمة أول المدة" : "Opening Value", key: "openingValue", width: 15 },
        { header: isAr ? "معدل الإهلاك %" : "Deprec Rate %", key: "rate", width: 12 },
        { header: isAr ? "إهلاك الفترة" : "Period Deprec.", key: "periodDeprec", width: 15 },
        { header: isAr ? "مجمع الإهلاك" : "Accum. Deprec.", key: "accumDeprec", width: 15 },
        { header: isAr ? "صافي القيمة الدفترية" : "Closing Value", key: "closingValue", width: 18 },
        { header: isAr ? "الحالة" : "Status", key: "status", width: 12 },
      ],
      data: reportRows.map(r => ({
        name: r.name,
        account: `${r.mainAccountCode} - ${r.mainAccountName}`,
        purchaseDate: r.purchaseDate,
        purchaseValue: r.purchaseValue,
        beginningDeprec: r.beginningDepreciation,
        openingValue: r.openingAssetValue,
        rate: `${r.depreciationRate}%`,
        periodDeprec: r.currentPeriodDepreciation,
        accumDeprec: r.accumulatedDepreciation,
        closingValue: r.closingAssetValue,
        status: r.status === "active" ? (isAr ? "نشط" : "Active") : (isAr ? "غير نشط" : "Inactive"),
      }))
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 print:p-0 print:m-0 print:max-w-none">
      {/* -------------------------------------------------------------
          MODULE HEADER & ACTIONS
      ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white flex items-center gap-2">
                {isAr ? "إدارة وإهلاك الأصول الثابتة" : "Fixed Assets & Depreciation"}
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {isAr ? "تقرير 10" : "Report 10"}
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr
                  ? "متابعة دورة حياة الأصول، احتساب الإهلاك الآلي، والتأثير الفوري على القوائم المالية والتقارير الختامية"
                  : "Track fixed asset lifecycle, automated straight-line depreciation & real-time financial reporting"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={openAddPurchasedModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {isAr ? "إضافة أصل مشتراة" : "Add Purchased Asset"}
          </button>

          <button
            onClick={openAddOpeningModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <History className="w-4 h-4" />
            {isAr ? "إثبات أصل أول المدة" : "Add Opening Asset"}
          </button>

          <button
            onClick={handlePostAllActive}
            disabled={isPostingAll || kpis.activeCount === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
            title={isAr ? "احتساب وترحيل قيود إهلاك كافة الأصول النشطة إلى دفتر اليومية وميزان المراجعة" : "Post depreciation for all active assets"}
          >
            <Sparkles className={`w-4 h-4 ${isPostingAll ? "animate-spin" : ""}`} />
            {isPostingAll ? (isAr ? "جاري الترحيل..." : "Posting...") : (isAr ? "ترحيل إهلاك الفترة" : "Post All Depreciation")}
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------
          SUMMARY KPIS
      ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 print:hidden">
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-2">
            <span>{isAr ? "إجمالي الأصول" : "Total Assets"}</span>
            <Building className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-white font-mono">{kpis.totalCount}</div>
          <div className="text-[11px] text-emerald-400 font-semibold mt-1">
            {kpis.activeCount} {isAr ? "أصل نشط قيد الإهلاك" : "active assets depreciating"}
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-2">
            <span>{isAr ? "التكلفة التاريخية للشراء" : "Total Purchase Cost"}</span>
            <Landmark className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-black text-white font-mono">
            {formatCurrency(kpis.totalPurchaseValue, organization.currency, locale)}
          </div>
          <div className="text-[11px] text-slate-400 font-semibold mt-1">
            {isAr ? "إجمالي قيمة اقتناء الأصول" : "Gross capital acquisition cost"}
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-2">
            <span>{isAr ? "مجمع الإهلاك التراكمي" : "Accumulated Depreciation"}</span>
            <TrendingDown className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-black text-amber-400 font-mono">
            {formatCurrency(kpis.totalAccumulatedDeprec, organization.currency, locale)}
          </div>
          <div className="text-[11px] text-amber-400/80 font-semibold mt-1">
            {isAr ? `منها إهلاك الفترة الحالية: ${formatCurrency(kpis.currentPeriodDeprec, organization.currency, locale)}` : `Period: ${formatCurrency(kpis.currentPeriodDeprec, organization.currency, locale)}`}
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-2">
            <span>{isAr ? "صافي القيمة الدفترية" : "Net Book Value"}</span>
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-black text-cyan-400 font-mono">
            {formatCurrency(kpis.totalCurrentValue, organization.currency, locale)}
          </div>
          <div className="text-[11px] text-slate-400 font-semibold mt-1">
            {isAr ? "التكلفة − مجمع الإهلاك (المركز المالي)" : "Cost − Accum Deprec (Balance Sheet)"}
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------
          MAIN NAVIGATION TABS (THE 3 CORE REPORT 10 CARDS)
      ------------------------------------------------------------- */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 gap-2 flex-wrap print:hidden">
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab("purchased")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "purchased"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? "1. أصول مشتراة" : "1. Purchased Assets"}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/40 text-emerald-200 font-mono">
              {purchasedAssetsList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("opening")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "opening"
                ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <History className="w-4 h-4" />
            <span>{isAr ? "2. أصول أول المدة" : "2. Opening Assets"}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/40 text-blue-200 font-mono">
              {openingAssetsList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("report")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "report"
                ? "bg-purple-600 text-white shadow-md shadow-purple-900/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{isAr ? "3. تقرير أرصدة الأصول" : "3. Asset Balances Report"}</span>
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "audit"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isAr ? "سجل المراجعة" : "Audit Trail"}</span>
          </button>
        </div>

        {/* Filter / Search Bar */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className={`w-3.5 h-3.5 text-slate-400 absolute top-1/2 -translate-y-1/2 ${isAr ? "right-3" : "left-3"}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={isAr ? "بحث بالاسم أو الحساب..." : "Search assets..."}
              className={`bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 py-1.5 focus:outline-none focus:border-emerald-500 w-48 sm:w-64 ${
                isAr ? "pr-8 pl-3" : "pl-8 pr-3"
              }`}
            />
          </div>

          {(activeTab === "purchased" || activeTab === "opening") && (
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 rounded-xl text-xs text-white px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">{isAr ? "كافة الحالات" : "All Statuses"}</option>
              <option value="active">{isAr ? "النشطة فقط" : "Active Only"}</option>
              <option value="inactive">{isAr ? "غير النشطة" : "Inactive Only"}</option>
            </select>
          )}
        </div>
      </div>

      {/* -------------------------------------------------------------
          CARD 1: إضافة أصول مشتراة (PURCHASED ASSETS GRID)
          Contains the strictly required 10 columns:
          1. Asset Name
          2. Main Account
          3. Beginning Depreciation
          4. Purchase Value
          5. Purchase Date
          6. Depreciation Rate (%)
          7. Status
          8. Current Period Depreciation
          9. Accumulated Depreciation
          10. Current Asset Value
      ------------------------------------------------------------- */}
      {activeTab === "purchased" && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                {isAr ? "الأصول المشتراة خلال الفترة التشغيلية" : "Purchased Fixed Assets in Period"}
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isAr
                  ? "الأصول المقتناة بموجب مدفوعات الخزينة، فواتير الأصول، أو أوراق الدفع مع الاحتساب التلقائي للإهلاك"
                  : "Fixed assets acquired from treasury payments, asset invoices or notes payable with automatic depreciation"}
              </p>
            </div>
            <button
              onClick={openAddPurchasedModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/30 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              {isAr ? "إضافة أصل مشتراة جديد" : "New Purchased Asset"}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold bg-slate-950/40">
                  <th className="p-3 text-right">1. {isAr ? "اسم الأصل" : "Asset Name"}</th>
                  <th className="p-3 text-right">2. {isAr ? "الحساب الرئيسي" : "Main Account"}</th>
                  <th className="p-3 text-center">3. {isAr ? "إهلاك أول المدة" : "Beg. Deprec."}</th>
                  <th className="p-3 text-center">4. {isAr ? "تكلفة الشراء" : "Purchase Value"}</th>
                  <th className="p-3 text-center">5. {isAr ? "تاريخ الشراء" : "Purchase Date"}</th>
                  <th className="p-3 text-center">6. {isAr ? "النسبة %" : "Rate %"}</th>
                  <th className="p-3 text-center">7. {isAr ? "الحالة" : "Status"}</th>
                  <th className="p-3 text-center text-amber-400 font-mono">8. {isAr ? "إهلاك الفترة" : "Period Deprec."}</th>
                  <th className="p-3 text-center text-orange-400 font-mono">9. {isAr ? "مجمع الإهلاك" : "Accum. Deprec."}</th>
                  <th className="p-3 text-center text-cyan-400 font-mono">10. {isAr ? "القيمة الحالية" : "Current Value"}</th>
                  <th className="p-3 text-center">{isAr ? "إجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {isLoadingData ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-slate-400">
                      <TableSkeleton rows={4} />
                    </td>
                  </tr>
                ) : purchasedAssetsList.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-slate-500">
                      {isAr ? "لا توجد أصول مشتراة مسجلة حتى الآن. انقر على «إضافة أصل مشتراة» لإضافة أصل جديد." : "No purchased assets recorded."}
                    </td>
                  </tr>
                ) : (
                  purchasedAssetsList.map(asset => (
                    <tr key={asset.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* 1. Asset Name */}
                      <td className="p-3 font-bold text-white">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
                            {getAccountIcon(asset.mainAccount?.code, asset.name)}
                          </div>
                          <div>
                            <div>{asset.name}</div>
                            {asset.notes && <div className="text-[10px] text-slate-500 font-normal">{asset.notes}</div>}
                          </div>
                        </div>
                      </td>

                      {/* 2. Main Account */}
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <span className="px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                            {asset.mainAccount?.code || "1201"}
                          </span>
                          <span className="text-slate-300 font-sans">
                            {asset.mainAccount ? (isAr ? asset.mainAccount.nameAr : asset.mainAccount.nameEn) : (isAr ? "أصول ثابتة" : "Fixed Assets")}
                          </span>
                        </div>
                      </td>

                      {/* 3. Beginning Depreciation */}
                      <td className="p-3 text-center font-mono text-slate-400">
                        {formatCurrency(asset.beginningDepreciation, organization.currency, locale)}
                      </td>

                      {/* 4. Purchase Value */}
                      <td className="p-3 text-center font-mono font-bold text-white">
                        {formatCurrency(asset.purchaseValue, organization.currency, locale)}
                      </td>

                      {/* 5. Purchase Date */}
                      <td className="p-3 text-center font-sans text-slate-300">
                        {formatDate(asset.purchaseDate, locale)}
                      </td>

                      {/* 6. Depreciation Rate */}
                      <td className="p-3 text-center font-mono font-bold text-emerald-400">
                        {asset.depreciationRate}%
                      </td>

                      {/* 7. Status */}
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleToggleStatus(asset)}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-colors cursor-pointer inline-flex items-center gap-1 ${
                            asset.status === "active"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                              : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                          }`}
                          title={isAr ? "انقر للتبديل بين نشط (يحسب الإهلاك) وغير نشط (يتوقف الإهلاك)" : "Toggle status"}
                        >
                          <Power className="w-3 h-3" />
                          {asset.status === "active" ? (isAr ? "نشط" : "Active") : (isAr ? "غير نشط" : "Inactive")}
                        </button>
                      </td>

                      {/* 8. Current Period Depreciation */}
                      <td className="p-3 text-center font-mono font-bold text-amber-400 bg-amber-500/5">
                        {formatCurrency(asset.calc.currentPeriodDepreciation, organization.currency, locale)}
                      </td>

                      {/* 9. Accumulated Depreciation */}
                      <td className="p-3 text-center font-mono font-bold text-orange-400 bg-orange-500/5">
                        {formatCurrency(asset.calc.accumulatedDepreciation, organization.currency, locale)}
                      </td>

                      {/* 10. Current Asset Value (Net Book Value) */}
                      <td className="p-3 text-center font-mono font-black text-cyan-400 bg-cyan-500/5">
                        {formatCurrency(asset.calc.currentAssetValue, organization.currency, locale)}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {asset.status === "active" && asset.calc.currentPeriodDepreciation > 0 && (
                            <button
                              onClick={() => handlePostSingleDepreciation(asset)}
                              className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500 hover:text-white transition-colors cursor-pointer"
                              title={isAr ? "ترحيل قيد الإهلاك اليومي للأصل الآن" : "Post depreciation journal entry"}
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => openEditModal(asset)}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                            title={isAr ? "تعديل" : "Edit"}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAsset(asset)}
                            className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                            title={isAr ? "حذف" : "Delete"}
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

      {/* -------------------------------------------------------------
          CARD 2: إثبات أصول أول المدة (OPENING FIXED ASSETS)
          Purpose: Register assets that already existed before system implementation.
          Purchase Date = 01/01/Current Fiscal Year (Auto-assigned)
      ------------------------------------------------------------- */}
      {activeTab === "opening" && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-blue-400" />
                {isAr ? "أصول أول المدة (الأصول الموجودة قبل تطبيق النظام)" : "Opening Fixed Assets"}
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isAr
                  ? `يتم إثبات الأصول التاريخية مع مجمع إهلاكها السابق، وتثبيت تاريخ بدء الإهلاك تلقائياً على أول يوم في السنة المالية (${defaultFiscalStart})`
                  : `Historical assets with past accumulated depreciation, locked to the first day of current fiscal year (${defaultFiscalStart})`}
              </p>
            </div>
            <button
              onClick={openAddOpeningModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/30 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              {isAr ? "إثبات أصل أول المدة" : "Register Opening Asset"}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold bg-slate-950/40">
                  <th className="p-3 text-right">{isAr ? "اسم الأصل" : "Asset Name"}</th>
                  <th className="p-3 text-right">{isAr ? "الحساب الرئيسي" : "Main Account"}</th>
                  <th className="p-3 text-center">{isAr ? "تاريخ بداية السنة" : "Fiscal Start"}</th>
                  <th className="p-3 text-center">{isAr ? "تكلفة الشراء التاريخية" : "Historical Cost"}</th>
                  <th className="p-3 text-center text-amber-400">{isAr ? "مجمع إهلاك أول المدة" : "Beg. Accum. Deprec."}</th>
                  <th className="p-3 text-center text-blue-400">{isAr ? "القيمة الافتتاحية" : "Opening Value"}</th>
                  <th className="p-3 text-center">{isAr ? "النسبة %" : "Rate %"}</th>
                  <th className="p-3 text-center">{isAr ? "الحالة" : "Status"}</th>
                  <th className="p-3 text-center text-orange-400 font-mono">{isAr ? "إهلاك الفترة" : "Period Deprec."}</th>
                  <th className="p-3 text-center text-cyan-400 font-mono">{isAr ? "صافي القيمة الحالية" : "Current Net Value"}</th>
                  <th className="p-3 text-center">{isAr ? "إجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {isLoadingData ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-slate-400">
                      <TableSkeleton rows={3} />
                    </td>
                  </tr>
                ) : openingAssetsList.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-slate-500">
                      {isAr ? "لا توجد أصول أول مدة مسجلة. انقر على «إثبات أصل أول المدة» لإدخال الأرصدة التاريخية للأصول." : "No opening assets recorded."}
                    </td>
                  </tr>
                ) : (
                  openingAssetsList.map(asset => (
                    <tr key={asset.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-bold text-white">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
                            {getAccountIcon(asset.mainAccount?.code, asset.name)}
                          </div>
                          <div>
                            <div>{asset.name}</div>
                            {asset.notes && <div className="text-[10px] text-slate-500 font-normal">{asset.notes}</div>}
                          </div>
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <span className="px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                            {asset.mainAccount?.code || "1201"}
                          </span>
                          <span className="text-slate-300 font-sans">
                            {asset.mainAccount ? (isAr ? asset.mainAccount.nameAr : asset.mainAccount.nameEn) : (isAr ? "أصول ثابتة" : "Fixed Assets")}
                          </span>
                        </div>
                      </td>

                      <td className="p-3 text-center font-mono text-slate-400">
                        {asset.purchaseDate}
                      </td>

                      <td className="p-3 text-center font-mono font-bold text-white">
                        {formatCurrency(asset.purchaseValue, organization.currency, locale)}
                      </td>

                      <td className="p-3 text-center font-mono font-bold text-amber-400 bg-amber-500/5">
                        {formatCurrency(asset.beginningDepreciation, organization.currency, locale)}
                      </td>

                      <td className="p-3 text-center font-mono font-bold text-blue-400 bg-blue-500/5">
                        {formatCurrency(asset.calc.openingAssetValue, organization.currency, locale)}
                      </td>

                      <td className="p-3 text-center font-mono font-bold text-emerald-400">
                        {asset.depreciationRate}%
                      </td>

                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleToggleStatus(asset)}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-colors cursor-pointer inline-flex items-center gap-1 ${
                            asset.status === "active"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                              : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                          }`}
                        >
                          <Power className="w-3 h-3" />
                          {asset.status === "active" ? (isAr ? "نشط" : "Active") : (isAr ? "غير نشط" : "Inactive")}
                        </button>
                      </td>

                      <td className="p-3 text-center font-mono font-bold text-orange-400 bg-orange-500/5">
                        {formatCurrency(asset.calc.currentPeriodDepreciation, organization.currency, locale)}
                      </td>

                      <td className="p-3 text-center font-mono font-black text-cyan-400 bg-cyan-500/5">
                        {formatCurrency(asset.calc.currentAssetValue, organization.currency, locale)}
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {asset.status === "active" && asset.calc.currentPeriodDepreciation > 0 && (
                            <button
                              onClick={() => handlePostSingleDepreciation(asset)}
                              className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500 hover:text-white transition-colors cursor-pointer"
                              title={isAr ? "ترحيل قيد الإهلاك" : "Post depreciation"}
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => openEditModal(asset)}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                            title={isAr ? "تعديل" : "Edit"}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAsset(asset)}
                            className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                            title={isAr ? "حذف" : "Delete"}
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

      {/* -------------------------------------------------------------
          CARD 3: تقرير أرصدة الأصول (FIXED ASSET BALANCES REPORT)
          Contains strictly required 7 columns:
          1. Asset Name
          2. Beginning Depreciation
          3. Purchase Date
          4. Opening Asset Value
          5. Current Period Depreciation
          6. Accumulated Depreciation
          7. Closing Asset Value
      ------------------------------------------------------------- */}
      {activeTab === "report" && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          {/* Report Toolbar & Filters (Hidden during print) */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-4 border-b border-slate-800 print:hidden">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Asset Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 font-semibold">{isAr ? "الأصل:" : "Asset:"}</span>
                <select
                  value={reportAssetFilter}
                  onChange={e => setReportAssetFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="all">{isAr ? "كافة الأصول الثابتة" : "All Fixed Assets"}</option>
                  {fixedAssets.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.assetType === "opening" ? (isAr ? "أول المدة" : "Opening") : (isAr ? "مشتراة" : "Purchased")})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Filters */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 font-semibold">{isAr ? "من:" : "From:"}</span>
                <input
                  type="date"
                  value={reportFromDate}
                  onChange={e => setReportFromDate(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 font-semibold">{isAr ? "إلى:" : "To:"}</span>
                <input
                  type="date"
                  value={reportToDate}
                  onChange={e => setReportToDate(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>
            </div>

            {/* Export & Print Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                title={isAr ? "طباعة التقرير أو التصدير إلى PDF" : "Print or export to PDF"}
              >
                <Printer className="w-3.5 h-3.5 text-slate-400" />
                {isAr ? "طباعة / PDF" : "Print / PDF"}
              </button>

              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
                title={isAr ? "تصدير إلى ملف إكسيل مع المحافظة على التنسيق واللغة العربية" : "Export native Excel (.xlsx)"}
              >
                <Download className="w-3.5 h-3.5" />
                {isAr ? "تصدير إكسيل (XLSX)" : "Export Excel"}
              </button>
            </div>
          </div>

          {/* Printable Report Header */}
          <div className="hidden print:block mb-4">
            <ReportPrintHeader
              organization={organization}
              reportTitleAr="تقرير أرصدة وإهلاك الأصول الثابتة"
              reportTitleEn="Fixed Asset Balances & Depreciation Report"
              dateFrom={reportFromDate}
              dateTo={reportToDate}
              locale={locale}
            />
          </div>

          {/* Dedicated 7-Column Report Grid */}
          <div className="overflow-x-auto">
            <table id="fixed-assets-report-table" className="w-full text-xs text-right">
              <thead>
                <tr className="border-b-2 border-slate-800 text-slate-400 font-black bg-slate-950/60 print:text-black print:bg-slate-100">
                  <th className="p-3 text-right">1. {isAr ? "اسم الأصل" : "Asset Name"}</th>
                  <th className="p-3 text-center">2. {isAr ? "إهلاك أول المدة" : "Beginning Deprec."}</th>
                  <th className="p-3 text-center">3. {isAr ? "تاريخ الشراء" : "Purchase Date"}</th>
                  <th className="p-3 text-center">4. {isAr ? "القيمة أول المدة" : "Opening Asset Value"}</th>
                  <th className="p-3 text-center text-amber-400 print:text-black">5. {isAr ? "إهلاك الفترة" : "Period Deprec."}</th>
                  <th className="p-3 text-center text-orange-400 print:text-black">6. {isAr ? "مجمع الإهلاك" : "Accum. Deprec."}</th>
                  <th className="p-3 text-center text-cyan-400 print:text-black">7. {isAr ? "القيمة نهاية المدة" : "Closing Asset Value"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 print:divide-slate-300">
                {reportRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 print:text-black">
                      {isAr ? "لا توجد أصول مطابقة لمعايير البحث المحددة" : "No matching assets found"}
                    </td>
                  </tr>
                ) : (
                  reportRows.map((row, idx) => (
                    <tr key={row.id || idx} className="hover:bg-slate-800/30 print:hover:bg-transparent transition-colors">
                      {/* 1. Asset Name */}
                      <td className="p-3 font-bold text-white print:text-black">
                        <div>{row.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono print:text-slate-600">
                          {row.mainAccountCode} - {row.mainAccountName} ({row.depreciationRate}%)
                        </div>
                      </td>

                      {/* 2. Beginning Depreciation */}
                      <td className="p-3 text-center font-mono text-slate-300 print:text-black">
                        {formatCurrency(row.beginningDepreciation, organization.currency, locale)}
                      </td>

                      {/* 3. Purchase Date */}
                      <td className="p-3 text-center font-sans text-slate-400 print:text-black">
                        {row.purchaseDate}
                      </td>

                      {/* 4. Opening Asset Value */}
                      <td className="p-3 text-center font-mono font-semibold text-blue-400 print:text-black">
                        {formatCurrency(row.openingAssetValue, organization.currency, locale)}
                      </td>

                      {/* 5. Current Period Depreciation */}
                      <td className="p-3 text-center font-mono font-bold text-amber-400 print:text-black bg-amber-500/5 print:bg-transparent">
                        {formatCurrency(row.currentPeriodDepreciation, organization.currency, locale)}
                      </td>

                      {/* 6. Accumulated Depreciation */}
                      <td className="p-3 text-center font-mono font-bold text-orange-400 print:text-black bg-orange-500/5 print:bg-transparent">
                        {formatCurrency(row.accumulatedDepreciation, organization.currency, locale)}
                      </td>

                      {/* 7. Closing Asset Value */}
                      <td className="p-3 text-center font-mono font-black text-cyan-400 print:text-black bg-cyan-500/5 print:bg-transparent">
                        {formatCurrency(row.closingAssetValue, organization.currency, locale)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {/* Report Summary Row */}
              <tfoot>
                <tr className="border-t-2 border-slate-700 bg-slate-950 font-black text-xs text-white print:text-black print:bg-slate-100">
                  <td className="p-3 text-right">
                    {isAr ? "الإجمالي الكلي:" : "Total Summary:"} ({reportRows.length} {isAr ? "أصل" : "assets"})
                  </td>
                  <td className="p-3 text-center font-mono text-slate-300 print:text-black">
                    {formatCurrency(reportTotals.beginningDepreciation, organization.currency, locale)}
                  </td>
                  <td className="p-3 text-center text-slate-500">-</td>
                  <td className="p-3 text-center font-mono text-blue-400 print:text-black">
                    {formatCurrency(reportTotals.openingAssetValue, organization.currency, locale)}
                  </td>
                  <td className="p-3 text-center font-mono text-amber-400 print:text-black">
                    {formatCurrency(reportTotals.currentPeriodDepreciation, organization.currency, locale)}
                  </td>
                  <td className="p-3 text-center font-mono text-orange-400 print:text-black">
                    {formatCurrency(reportTotals.accumulatedDepreciation, organization.currency, locale)}
                  </td>
                  <td className="p-3 text-center font-mono text-cyan-400 print:text-black">
                    {formatCurrency(reportTotals.closingAssetValue, organization.currency, locale)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Printable Report Footer */}
          <div className="hidden print:block mt-8">
            <ReportPrintFooter organization={organization} />
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          TAB 4: AUDIT TRAIL LOG
      ------------------------------------------------------------- */}
      {activeTab === "audit" && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              {isAr ? "سجل التدقيق والمراجعة لحركات الأصول الثابتة" : "Fixed Assets Audit Trail Log"}
            </h2>
            <span className="text-xs text-slate-500">
              {isAr ? "تتبع عمليات الإضافة، التعديل، التنشيط، الإيقاف، وترحيل الإهلاك" : "Track all asset lifecycle events"}
            </span>
          </div>

          <div className="space-y-2">
            {auditLogs
              .filter(l => l.entityType === "FixedAsset" || l.entityType === "AssetDepreciation" || l.details?.includes("أصل"))
              .slice(0, 50)
              .map(log => (
                <div key={log.id} className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl flex items-start justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.action === "create" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        log.action === "update" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                        log.action === "status_change" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                        "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}>
                        {log.action}
                      </span>
                      <span className="font-semibold text-white">{log.details}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {isAr ? "المستخدم المسؤول: " : "User: "}
                      <span className="text-slate-300">{log.userName || "المشرف العام"}</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono whitespace-nowrap">
                    {formatDate(log.createdAt, locale)}
                  </div>
                </div>
              ))}
            {auditLogs.filter(l => l.entityType === "FixedAsset" || l.entityType === "AssetDepreciation" || l.details?.includes("أصل")).length === 0 && (
              <div className="p-8 text-center text-slate-500">
                {isAr ? "لا توجد سجلات تدقيق حتى الآن للأصول الثابتة." : "No audit trail logs recorded yet."}
              </div>
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL 1: ADD / EDIT PURCHASED ASSET (CARD 1)
      ------------------------------------------------------------- */}
      <Modal
        isOpen={isPurchasedModalOpen}
        onClose={() => {
          setIsPurchasedModalOpen(false);
          setEditingAsset(null);
        }}
        title={editingAsset ? (isAr ? "تعديل أصل مشتراة" : "Edit Purchased Asset") : (isAr ? "إضافة أصل مشتراة جديد" : "Add Purchased Asset")}
        size="lg"
      >
        <form onSubmit={e => { e.preventDefault(); handleSaveAsset("purchased"); }} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            {/* Asset Name */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-slate-400 font-semibold">{isAr ? "اسم الأصل *" : "Asset Name *"}</label>
              <input
                type="text"
                required
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder={isAr ? "مثال: سيارة توزيع تويوتا هايس 2026" : "e.g. Toyota Distribution Van"}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Main Account Selection (Strictly filtered to Fixed Assets from COA) */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-slate-400 font-semibold">{isAr ? "الحساب الرئيسي في شجرة الحسابات *" : "Main Account in COA *"}</label>
              <select
                required
                value={formAccountId}
                onChange={e => setFormAccountId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              >
                {fixedAssetAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    [{acc.code}] {acc.nameAr} ({acc.nameEn || ""})
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-500 block">
                {isAr
                  ? "الحساب الذي يستقبل رصيد الأصل وقيمته الدفترية ضمن الأصول غير المتداولة في الميزانية"
                  : "COA account receiving the asset balance under Non-Current Assets in Balance Sheet"}
              </span>
            </div>

            {/* Purchase Value */}
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">{isAr ? "تكلفة الشراء التاريخية *" : "Purchase Value *"}</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={formPurchaseValue}
                onChange={e => setFormPurchaseValue(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="0.00"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            {/* Purchase Date */}
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">{isAr ? "تاريخ الشراء *" : "Purchase Date *"}</label>
              <input
                type="date"
                required
                value={formPurchaseDate}
                onChange={e => setFormPurchaseDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            {/* Depreciation Rate */}
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">{isAr ? "معدل الإهلاك السنوي (%) *" : "Depreciation Rate (%) *"}</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                required
                value={formRate}
                onChange={e => setFormRate(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="10"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            {/* Status (Active / Inactive) */}
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">{isAr ? "الحالة *" : "Status *"}</label>
              <select
                value={formStatus}
                onChange={e => setFormStatus(e.target.value as FixedAssetStatus)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="active">{isAr ? "نشط (يحسب الإهلاك آلياً)" : "Active (Auto Depreciating)"}</option>
                <option value="inactive">{isAr ? "غير نشط (يتوقف الإهلاك)" : "Inactive (Depreciation Stopped)"}</option>
              </select>
            </div>

            {/* Cost Center */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-slate-400 font-semibold">{isAr ? "مركز التكلفة (اختياري)" : "Cost Center (Optional)"}</label>
              <select
                value={formCostCenterId}
                onChange={e => setFormCostCenterId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">{isAr ? "-- بدون مركز تكلفة --" : "-- None --"}</option>
                {costCenters.map(cc => (
                  <option key={cc.id} value={cc.id}>
                    [{cc.code}] {cc.nameAr}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-slate-400 font-semibold">{isAr ? "ملاحظات وتفاصيل الأصل" : "Notes"}</label>
              <textarea
                rows={2}
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                placeholder={isAr ? "الرقم التسلسلي، المورد، رقم لوحة السيارة، مكان التواجد..." : "Serial number, supplier, location..."}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsPurchasedModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-sm transition-colors cursor-pointer"
            >
              {isSubmitting ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ الأصل" : "Save Asset")}
            </button>
          </div>
        </form>
      </Modal>

      {/* -------------------------------------------------------------
          MODAL 2: ADD / EDIT OPENING ASSET (CARD 2)
          Form strictly asks for:
          - Asset Name
          - Main Account
          - Beginning Depreciation
          - Purchase Value
          - Depreciation Rate
          - Status
          Auto-assigned:
          - Purchase Date = First Day of Current Fiscal Year
      ------------------------------------------------------------- */}
      <Modal
        isOpen={isOpeningModalOpen}
        onClose={() => {
          setIsOpeningModalOpen(false);
          setEditingAsset(null);
        }}
        title={editingAsset ? (isAr ? "تعديل أصل أول المدة" : "Edit Opening Asset") : (isAr ? "إثبات أصول أول المدة" : "Register Opening Asset")}
        size="lg"
      >
        <form onSubmit={e => { e.preventDefault(); handleSaveAsset("opening"); }} className="space-y-4">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span>
                {isAr
                  ? `يتم تثبيت تاريخ بدء الإهلاك تلقائياً على أول يوم في السنة المالية الحالية: (${defaultFiscalStart})`
                  : `Purchase Date is automatically assigned to the first day of current fiscal year: (${defaultFiscalStart})`}
              </span>
            </div>
            <span className="font-mono font-bold text-blue-200">{defaultFiscalStart}</span>
          </div>

          {formError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            {/* Asset Name */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-slate-400 font-semibold">{isAr ? "اسم الأصل *" : "Asset Name *"}</label>
              <input
                type="text"
                required
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder={isAr ? "مثال: سيرفرات ومعدات شبكات الإدارة" : "e.g. Headquarter Network Servers"}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Main Account */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-slate-400 font-semibold">{isAr ? "الحساب الرئيسي في شجرة الحسابات *" : "Main Account in COA *"}</label>
              <select
                required
                value={formAccountId}
                onChange={e => setFormAccountId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                {fixedAssetAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    [{acc.code}] {acc.nameAr} ({acc.nameEn || ""})
                  </option>
                ))}
              </select>
            </div>

            {/* Purchase Value */}
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">{isAr ? "تكلفة الشراء التاريخية *" : "Purchase Value *"}</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={formPurchaseValue}
                onChange={e => setFormPurchaseValue(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="0.00"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            {/* Beginning Depreciation */}
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">{isAr ? "مجمع إهلاك أول المدة (السابق) *" : "Beginning Depreciation *"}</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formBeginningDeprec}
                onChange={e => setFormBeginningDeprec(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="0.00"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            {/* Depreciation Rate */}
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">{isAr ? "معدل الإهلاك السنوي (%) *" : "Depreciation Rate (%) *"}</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                required
                value={formRate}
                onChange={e => setFormRate(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="10"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            {/* Status */}
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">{isAr ? "الحالة *" : "Status *"}</label>
              <select
                value={formStatus}
                onChange={e => setFormStatus(e.target.value as FixedAssetStatus)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="active">{isAr ? "نشط (يحسب الإهلاك آلياً)" : "Active (Auto Depreciating)"}</option>
                <option value="inactive">{isAr ? "غير نشط (يتوقف الإهلاك)" : "Inactive (Depreciation Stopped)"}</option>
              </select>
            </div>

            {/* Cost Center */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-slate-400 font-semibold">{isAr ? "مركز التكلفة (اختياري)" : "Cost Center (Optional)"}</label>
              <select
                value={formCostCenterId}
                onChange={e => setFormCostCenterId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">{isAr ? "-- بدون مركز تكلفة --" : "-- None --"}</option>
                {costCenters.map(cc => (
                  <option key={cc.id} value={cc.id}>
                    [{cc.code}] {cc.nameAr}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-slate-400 font-semibold">{isAr ? "ملاحظات" : "Notes"}</label>
              <textarea
                rows={2}
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                placeholder={isAr ? "سندات القيد الافتتاحي أو تفاصيل الأصل التاريخي..." : "Opening asset details..."}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsOpeningModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-sm transition-colors cursor-pointer"
            >
              {isSubmitting ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "إثبات الأصل" : "Save Opening Asset")}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
