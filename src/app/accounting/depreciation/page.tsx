"use client";

import React, { useState, useMemo } from "react";
import { useERP } from "@/context/erp-context";
import { FixedAsset, FixedAssetType, FixedAssetStatus, Account } from "@/types/erp";
import { computeAssetDepreciation } from "@/lib/accounting-engine";
import { formatCurrency, formatDate } from "@/lib/utils";
import { exportTableToExcel } from "@/lib/excel-export";
import Modal from "@/components/ui/Modal";
import TableSkeleton from "@/components/ui/TableSkeleton";
import { ReportPrintHeader } from "@/components/ui/ReportPrintHeader";
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
  Filter,
  Check,
  HelpCircle,
  Hash
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
    journalEntries,
    purchaseInvoices,
    depreciationSettings,
    getAccountDepreciationRate,
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

  // Modal State: Create / Edit Purchased Asset & Opening Asset
  const [isPurchasedModalOpen, setIsPurchasedModalOpen] = useState(false);
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<FixedAsset | null>(null);

  // Review Screen & Confirmation Dialog State (Sections 6 & 7)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isClosingConfirmDialogOpen, setIsClosingConfirmDialogOpen] = useState(false);
  const [reviewPeriodEndDate, setReviewPeriodEndDate] = useState(todayStr);
  const [selectedAssetForReview, setSelectedAssetForReview] = useState<FixedAsset | null>(null);

  // Form Fields - Strictly following Section 1 & Section 4 order:
  // Field 1: Main Asset Account
  // Field 2: Asset Name
  // Field 3: Asset Code
  const [formAccountId, setFormAccountId] = useState("");
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
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
      // Include parent asset accounts or leaf accounts with debit nature
      return (isCodeMatch || isNameMatch) && acc.level >= 3 && acc.nature === "debit";
    }).sort((a, b) => (a.code || "").localeCompare(b.code || ""));
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
  // Automatic Asset Data Discovery (Section 2 & Section 4)
  // When Main Asset Account is selected, scans Journal Entries,
  // General Ledger, Trial Balance, and Purchase Invoices
  // to present candidate assets that can be auto-loaded!
  // -------------------------------------------------------------
  const discoveredAccountingAssets = useMemo(() => {
    if (!formAccountId) return [];
    const selectedAcc = accounts.find(a => a.id === formAccountId);
    if (!selectedAcc) return [];

    const candidates: Array<{
      id: string;
      code: string;
      name: string;
      purchaseValue: number;
      beginningDepreciation: number;
      purchaseDate: string;
      source: string;
      reference: string;
    }> = [];

    const matchingAccountIds = new Set<string>([selectedAcc.id]);
    accounts.forEach(a => {
      if (a.parentId === selectedAcc.id || (selectedAcc.code && a.code.startsWith(selectedAcc.code))) {
        matchingAccountIds.add(a.id);
      }
    });

    let seq = 1;
    // 1. Scan Journal Entries & Lines
    journalEntries.forEach(je => {
      je.lines.forEach(line => {
        if (matchingAccountIds.has(line.accountId) && line.debit > 0) {
          const isOpening = je.referenceType === "opening" || je.entryNumber?.startsWith("OPENING");
          let begDeprec = 0;
          if (isOpening) {
            const contraLine = je.lines.find(l => l.accountCode.startsWith("1202") && l.credit > 0);
            if (contraLine) begDeprec = contraLine.credit;
          }

          const baseCode = `AST-${selectedAcc.code}-${String(seq).padStart(2, "0")}`;
          candidates.push({
            id: `je-${je.id}-${line.id}`,
            code: baseCode,
            name: line.description || `${selectedAcc.nameAr} - ${je.entryNumber}`,
            purchaseValue: line.debit,
            beginningDepreciation: begDeprec,
            purchaseDate: isOpening ? defaultFiscalStart : (je.date || todayStr),
            source: isOpening ? (isAr ? "القيد الافتتاحي" : "Opening Entry") : (isAr ? `قيد يومية ${je.entryNumber}` : `Journal ${je.entryNumber}`),
            reference: je.entryNumber,
          });
          seq++;
        }
      });
    });

    // 2. Scan Purchase Invoices
    purchaseInvoices.forEach(inv => {
      inv.items?.forEach(item => {
        const keywords = [selectedAcc.nameAr, selectedAcc.nameEn || "", "سيار", "معد", "أثاث", "حاسب", "كمبيوتر", "مبنى", "أصل"].filter(Boolean);
        const isMatch = keywords.some(k => k && (item.productName?.includes(k) || inv.notes?.includes(k)));
        if (isMatch) {
          const baseCode = `AST-${selectedAcc.code}-${String(seq).padStart(2, "0")}`;
          candidates.push({
            id: `pinv-${inv.id}-${item.id}`,
            code: baseCode,
            name: item.productName || `${selectedAcc.nameAr} - ${inv.invoiceNumber}`,
            purchaseValue: item.total || (item.quantity * item.unitCost),
            beginningDepreciation: 0,
            purchaseDate: inv.date || todayStr,
            source: isAr ? `فاتورة مشتريات ${inv.invoiceNumber}` : `Purchase ${inv.invoiceNumber}`,
            reference: inv.invoiceNumber,
          });
          seq++;
        }
      });
    });

    return candidates;
  }, [formAccountId, accounts, journalEntries, purchaseInvoices, todayStr, defaultFiscalStart, isAr]);

  // Handle selecting an auto-loaded discovered asset
  const handleSelectDiscoveredAsset = (cand: typeof discoveredAccountingAssets[0]) => {
    setFormName(cand.name);
    setFormCode(cand.code);
    setFormPurchaseValue(cand.purchaseValue);
    setFormPurchaseDate(cand.purchaseDate);
    if (cand.beginningDepreciation > 0) {
      setFormBeginningDeprec(cand.beginningDepreciation);
    }
    // Auto-load parent depreciation rate if configured
    if (formAccountId) {
      const rate = getAccountDepreciationRate(formAccountId);
      if (rate > 0) setFormRate(rate);
    }
    showToast(isAr ? `تم تحميل بيانات الأصل تلقائياً من [${cand.source}]` : `Asset data auto-loaded from [${cand.source}]`, "info");
  };

  // -------------------------------------------------------------
  // Calculate Live Depreciation and Valuations for all assets
  // -------------------------------------------------------------
  const calculatedAssets = useMemo(() => {
    return fixedAssets.map(asset => {
      const calc = computeAssetDepreciation(asset, todayStr);
      const mainAcc = accounts.find(a => a.id === asset.accountId);
      const safeCode = asset.code || `AST-${String(asset.id).slice(0, 8).toUpperCase()}`;
      return {
        ...asset,
        code: safeCode,
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

  // Filtered lists with Asset Code treated as primary identifier (Section 10)
  const purchasedAssetsList = useMemo(() => {
    return calculatedAssets.filter(a => {
      if (a.assetType === "opening") return false;
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchCode = (a.code || "").toLowerCase().includes(q);
        const matchName = a.name.toLowerCase().includes(q);
        const matchAcc = (a.mainAccount?.nameAr || "").toLowerCase().includes(q) || (a.mainAccount?.code || "").includes(q);
        if (!matchCode && !matchName && !matchAcc) return false;
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
        const matchCode = (a.code || "").toLowerCase().includes(q);
        const matchName = a.name.toLowerCase().includes(q);
        const matchAcc = (a.mainAccount?.nameAr || "").toLowerCase().includes(q) || (a.mainAccount?.code || "").includes(q);
        if (!matchCode && !matchName && !matchAcc) return false;
      }
      return true;
    });
  }, [calculatedAssets, statusFilter, searchQuery]);

  // Report Rows Calculation with Asset Code (Section 10)
  const reportRows = useMemo(() => {
    return calculatedAssets
      .filter(a => {
        if (reportAssetFilter !== "all" && a.id !== reportAssetFilter) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchCode = (a.code || "").toLowerCase().includes(q);
          const matchName = a.name.toLowerCase().includes(q);
          const matchAcc = (a.mainAccount?.nameAr || "").toLowerCase().includes(q) || (a.mainAccount?.code || "").includes(q);
          if (!matchCode && !matchName && !matchAcc) return false;
        }
        return true;
      })
      .map(a => {
        const periodCalc = computeAssetDepreciation(a, undefined, reportFromDate, reportToDate);
        return {
          id: a.id,
          code: a.code,
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
  // Review Rows Calculation for Closing Review Screen (Section 6)
  // -------------------------------------------------------------
  const closingReviewRows = useMemo(() => {
    const listToReview = selectedAssetForReview
      ? calculatedAssets.filter(a => a.id === selectedAssetForReview.id)
      : calculatedAssets.filter(a => a.status === "active");

    return listToReview.map(asset => {
      const calc = computeAssetDepreciation(asset, reviewPeriodEndDate);
      return {
        id: asset.id,
        code: asset.code,
        name: asset.name,
        mainAccountCode: asset.mainAccount?.code || "-",
        mainAccountName: asset.mainAccount ? (isAr ? asset.mainAccount.nameAr : asset.mainAccount.nameEn) : (isAr ? "أصول ثابتة" : "Fixed Assets"),
        openingDepreciation: Number(asset.beginningDepreciation) || 0,
        originalCost: Number(asset.purchaseValue) || 0,
        currentPeriodDepreciation: calc.currentPeriodDepreciation,
        accumulatedDepreciation: calc.accumulatedDepreciation,
        closingAssetValue: calc.currentAssetValue,
        status: asset.status,
      };
    });
  }, [calculatedAssets, selectedAssetForReview, reviewPeriodEndDate, isAr]);

  const closingReviewTotals = useMemo(() => {
    return closingReviewRows.reduce(
      (acc, r) => ({
        originalCost: acc.originalCost + r.originalCost,
        openingDepreciation: acc.openingDepreciation + r.openingDepreciation,
        currentPeriodDepreciation: acc.currentPeriodDepreciation + r.currentPeriodDepreciation,
        accumulatedDepreciation: acc.accumulatedDepreciation + r.accumulatedDepreciation,
        closingAssetValue: acc.closingAssetValue + r.closingAssetValue,
      }),
      {
        originalCost: 0,
        openingDepreciation: 0,
        currentPeriodDepreciation: 0,
        accumulatedDepreciation: 0,
        closingAssetValue: 0,
      }
    );
  }, [closingReviewRows]);

  // -------------------------------------------------------------
  // Form Openers
  // -------------------------------------------------------------
  const openAddPurchasedModal = () => {
    setEditingAsset(null);
    const initialAccId = fixedAssetAccounts[0]?.id || "";
    setFormAccountId(initialAccId);
    setFormName("");
    const initialAcc = fixedAssetAccounts.find(a => a.id === initialAccId);
    const initialCode = `AST-${initialAcc ? initialAcc.code : "1201"}-${String(fixedAssets.length + 1).padStart(2, "0")}`;
    setFormCode(initialCode);
    setFormPurchaseValue("");
    setFormBeginningDeprec(0);
    setFormPurchaseDate(todayStr);
    const inheritedRate = getAccountDepreciationRate(initialAccId);
    setFormRate(inheritedRate > 0 ? inheritedRate : 10);
    setFormStatus("active");
    setFormCostCenterId("");
    setFormNotes("");
    setFormError(null);
    setIsPurchasedModalOpen(true);
  };

  const openAddOpeningModal = () => {
    setEditingAsset(null);
    const initialAccId = fixedAssetAccounts[0]?.id || "";
    setFormAccountId(initialAccId);
    setFormName("");
    const initialAcc = fixedAssetAccounts.find(a => a.id === initialAccId);
    const initialCode = `AST-OP-${initialAcc ? initialAcc.code : "1201"}-${String(fixedAssets.length + 1).padStart(2, "0")}`;
    setFormCode(initialCode);
    setFormPurchaseValue("");
    setFormBeginningDeprec("");
    setFormPurchaseDate(defaultFiscalStart); // Auto-assigns 01/01/Current Fiscal Year
    const inheritedRate = getAccountDepreciationRate(initialAccId);
    setFormRate(inheritedRate > 0 ? inheritedRate : 10);
    setFormStatus("active");
    setFormCostCenterId("");
    setFormNotes("");
    setFormError(null);
    setIsOpeningModalOpen(true);
  };

  const openEditModal = (asset: FixedAsset) => {
    setEditingAsset(asset);
    setFormAccountId(asset.accountId || "");
    setFormName(asset.name);
    setFormCode(asset.code || `AST-${String(asset.id).slice(0, 8).toUpperCase()}`);
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

  // When account changes in form, update code and inherited rate
  const handleAccountChange = (accId: string) => {
    setFormAccountId(accId);
    const acc = fixedAssetAccounts.find(a => a.id === accId);
    if (acc) {
      if (!formCode || formCode.startsWith("AST-")) {
        const prefix = editingAsset?.assetType === "opening" ? "AST-OP" : "AST";
        setFormCode(`${prefix}-${acc.code}-${String(fixedAssets.length + 1).padStart(2, "0")}`);
      }
      const inheritedRate = getAccountDepreciationRate(accId);
      if (inheritedRate > 0) {
        setFormRate(inheritedRate);
      }
    }
  };

  // Requirement 8: Load directly from Fixed Assets Register
  const handleSelectRegisterAsset = (assetId: string) => {
    if (!assetId) return;
    const asset = fixedAssets.find(a => a.id === assetId);
    if (!asset) return;

    setFormCode(asset.code || "");
    setFormName(asset.name || "");
    if (asset.accountId) {
      setFormAccountId(asset.accountId);
    }
    setFormPurchaseValue(asset.purchaseValue || 0);
    setFormBeginningDeprec(asset.beginningDepreciation || 0);
    setFormPurchaseDate(asset.purchaseDate || todayStr);
    if (asset.depreciationRate > 0) {
      setFormRate(asset.depreciationRate);
    } else if (asset.accountId) {
      const rate = getAccountDepreciationRate(asset.accountId);
      if (rate > 0) setFormRate(rate);
    }
    setFormStatus(asset.status || "active");
    if (asset.costCenterId) setFormCostCenterId(asset.costCenterId);
    if (asset.notes) setFormNotes(asset.notes);

    showToast(
      isAr
        ? `تم استرجاع بيانات الأصل [${asset.code}] مباشرة من سجل الأصول الثابتة`
        : `Loaded asset [${asset.code}] from Fixed Assets Register`,
      "success"
    );
  };

  // -------------------------------------------------------------
  // Form Submit Handler (Sections 3 & 5)
  // -------------------------------------------------------------
  const handleSaveAsset = async (type: FixedAssetType) => {
    if (!formAccountId) {
      setFormError(isAr ? "يرجى تحديد الحساب الرئيسي للأصل من شجرة الحسابات" : "Main asset account is required");
      return;
    }
    if (!formName.trim()) {
      setFormError(isAr ? "يرجى إدخال أو اختيار اسم الأصل" : "Asset name is required");
      return;
    }
    if (!formCode.trim()) {
      setFormError(isAr ? "كود الأصل إلزامي - يرجى إدخال كود الأصل" : "Asset Code is mandatory");
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
          code: formCode.trim(),
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
          code: formCode.trim(),
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
      setFormError(err.message || (isAr ? "حدث خطأ أثناء الحفظ في قاعدة البيانات" : "Save failed"));
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
      showToast(err.message || (isAr ? "فشل تعديل حالة الأصل" : "Status update failed"), "error");
    }
  };

  // Delete handler
  const handleDeleteAsset = async (asset: FixedAsset) => {
    const confirmMsg = isAr
      ? `هل أنت متأكد من حذف الأصل [${asset.code}] «${asset.name}»؟ لا يمكن التراجع عن هذه العملية.`
      : `Are you sure you want to delete asset [${asset.code}] ${asset.name}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await deleteFixedAsset(asset.id);
    } catch (err: any) {
      showToast(err.message || (isAr ? "فشل حذف الأصل" : "Delete failed"), "error");
    }
  };

  // -------------------------------------------------------------
  // Period Closing Workflow (Sections 6 & 7)
  // Step 1: Open Review Screen
  // Step 2: User confirms review -> Open confirmation dialog
  // Step 3: User confirms dialog -> Post depreciation
  // -------------------------------------------------------------
  const handleOpenClosingReview = (singleAsset?: FixedAsset) => {
    setSelectedAssetForReview(singleAsset || null);
    setReviewPeriodEndDate(todayStr);
    setIsReviewModalOpen(true);
  };

  const handlePromptClosingConfirmation = () => {
    setIsClosingConfirmDialogOpen(true);
  };

  const handleExecuteConfirmedPosting = async () => {
    setIsPostingAll(true);
    try {
      if (selectedAssetForReview) {
        await postAssetDepreciation(selectedAssetForReview.id, reviewPeriodEndDate);
      } else {
        await postAllActiveAssetsDepreciation(reviewPeriodEndDate);
      }
      setIsClosingConfirmDialogOpen(false);
      setIsReviewModalOpen(false);
      setSelectedAssetForReview(null);
    } catch (err: any) {
      showToast(err.message || (isAr ? "فشل ترحيل قيد الإهلاك" : "Posting failed"), "error");
    } finally {
      setIsPostingAll(false);
    }
  };

  // -------------------------------------------------------------
  // Excel Export Handler (Section 10)
  // -------------------------------------------------------------
  const handleExportExcel = () => {
    exportTableToExcel({
      filename: `تقرير_أرصدة_الأصول_الثابتة_${reportFromDate}_إلى_${reportToDate}`,
      sheetName: isAr ? "أرصدة الأصول" : "Fixed Assets",
      title: isAr ? "تقرير أرصدة وإهلاك الأصول الثابتة" : "Fixed Asset Balances & Depreciation Report",
      organizationName: isAr ? organization.nameAr : organization.nameEn,
      columns: [
        { header: isAr ? "كود الأصل" : "Asset Code", key: "code", width: 16 },
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
        code: r.code,
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
                  {isAr ? "تقرير 10 وملاحقه" : "Report 10 Addendum"}
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr
                  ? "تسجيل الأصول، ربطها بدليل الحسابات، التحميل التلقائي من القيود، شاشة مراجعة الإقفال، والتأثير الفوري على القوائم المالية"
                  : "Fixed asset entry, automated COA linking, period closing review screen & real-time GL integration"}
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
            onClick={() => handleOpenClosingReview()}
            disabled={isPostingAll || kpis.activeCount === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
            title={isAr ? "عرض شاشة مراجعة إقفال فترة الإهلاك قبل الترحيل المحاسبي" : "Open Depreciation Period Closing Review Screen"}
          >
            <Sparkles className={`w-4 h-4 ${isPostingAll ? "animate-spin" : ""}`} />
            {isPostingAll ? (isAr ? "جاري الترحيل..." : "Posting...") : (isAr ? "إقفال وترحيل إهلاك الفترة" : "Review & Close Period")}
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

        {/* Filter / Search Bar (Primary Identifier: Asset Code & Name) */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className={`w-3.5 h-3.5 text-slate-400 absolute top-1/2 -translate-y-1/2 ${isAr ? "right-3" : "left-3"}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={isAr ? "بحث بكود الأصل، الاسم، الحساب..." : "Search by asset code, name, account..."}
              className={`bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 py-1.5 focus:outline-none focus:border-emerald-500 w-52 sm:w-72 ${
                isAr ? "pr-8 pl-3" : "pl-8 pr-3"
              }`}
            />
          </div>

          {(activeTab === "purchased" || activeTab === "opening") && (
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 rounded-xl text-xs text-white px-3 py-1.5 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">{isAr ? "كافة الحالات" : "All Status"}</option>
              <option value="active">{isAr ? "نشط" : "Active"}</option>
              <option value="inactive">{isAr ? "غير نشط" : "Inactive"}</option>
            </select>
          )}
        </div>
      </div>

      {/* -------------------------------------------------------------
          CARD 1: إضافة أصول مشتراة (PURCHASED ASSETS GRID)
          Includes Asset Code as primary identifier (Section 10)
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
                  ? "الأصول المقتناة بموجب مدفوعات الخزينة، فواتير الأصول، أو أوراق الدفع مع التوريث التلقائي لنسب الإهلاك"
                  : "Fixed assets acquired from treasury payments, asset invoices or notes payable with inherited depreciation"}
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
                  <th className="p-3 text-right">1. {isAr ? "كود الأصل" : "Asset Code"}</th>
                  <th className="p-3 text-right">2. {isAr ? "اسم الأصل" : "Asset Name"}</th>
                  <th className="p-3 text-right">3. {isAr ? "الحساب الرئيسي" : "Main Account"}</th>
                  <th className="p-3 text-center">4. {isAr ? "إهلاك أول المدة" : "Beg. Deprec."}</th>
                  <th className="p-3 text-center">5. {isAr ? "تكلفة الشراء" : "Purchase Value"}</th>
                  <th className="p-3 text-center">6. {isAr ? "تاريخ الشراء" : "Purchase Date"}</th>
                  <th className="p-3 text-center">7. {isAr ? "النسبة %" : "Rate %"}</th>
                  <th className="p-3 text-center">8. {isAr ? "الحالة" : "Status"}</th>
                  <th className="p-3 text-center text-amber-400 font-mono">9. {isAr ? "إهلاك الفترة" : "Period Deprec."}</th>
                  <th className="p-3 text-center text-orange-400 font-mono">10. {isAr ? "مجمع الإهلاك" : "Accum. Deprec."}</th>
                  <th className="p-3 text-center text-cyan-400 font-mono">11. {isAr ? "القيمة الحالية" : "Current Value"}</th>
                  <th className="p-3 text-center">{isAr ? "إجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {isLoadingData ? (
                  <tr>
                    <td colSpan={12} className="p-8 text-center text-slate-400">
                      <TableSkeleton rows={4} />
                    </td>
                  </tr>
                ) : purchasedAssetsList.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-8 text-center text-slate-500">
                      {isAr ? "لا توجد أصول مشتراة مسجلة حتى الآن. انقر على «إضافة أصل مشتراة» لإضافة أصل جديد." : "No purchased assets recorded."}
                    </td>
                  </tr>
                ) : (
                  purchasedAssetsList.map(asset => (
                    <tr key={asset.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* 1. Asset Code (Primary Identifier) */}
                      <td className="p-3 font-mono font-bold text-emerald-400">
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          {asset.code}
                        </span>
                      </td>

                      {/* 2. Asset Name */}
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

                      {/* 3. Main Account */}
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <span className="text-slate-400">[{asset.mainAccount?.code || "1201"}]</span>
                          <span className="text-slate-200">{asset.mainAccount?.nameAr || asset.mainAccount?.nameEn || (isAr ? "أصل ثابت" : "Fixed Asset")}</span>
                        </div>
                      </td>

                      {/* 4. Beginning Depreciation */}
                      <td className="p-3 text-center font-mono text-slate-400">
                        {formatCurrency(asset.beginningDepreciation, organization.currency, locale)}
                      </td>

                      {/* 5. Purchase Value */}
                      <td className="p-3 text-center font-mono font-bold text-white">
                        {formatCurrency(asset.purchaseValue, organization.currency, locale)}
                      </td>

                      {/* 6. Purchase Date */}
                      <td className="p-3 text-center font-mono text-slate-400">
                        {asset.purchaseDate}
                      </td>

                      {/* 7. Rate */}
                      <td className="p-3 text-center font-mono text-emerald-400 font-bold">
                        {asset.depreciationRate}%
                      </td>

                      {/* 8. Status */}
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleToggleStatus(asset)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                            asset.status === "active"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                              : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
                          }`}
                        >
                          {asset.status === "active" ? (isAr ? "نشط" : "Active") : (isAr ? "متوقف" : "Inactive")}
                        </button>
                      </td>

                      {/* 9. Current Period Depreciation */}
                      <td className="p-3 text-center font-mono font-bold text-amber-400">
                        {formatCurrency(asset.calc.currentPeriodDepreciation, organization.currency, locale)}
                      </td>

                      {/* 10. Accumulated Depreciation */}
                      <td className="p-3 text-center font-mono font-bold text-orange-400">
                        {formatCurrency(asset.calc.accumulatedDepreciation, organization.currency, locale)}
                      </td>

                      {/* 11. Current Value */}
                      <td className="p-3 text-center font-mono font-bold text-cyan-400">
                        {formatCurrency(asset.calc.currentAssetValue, organization.currency, locale)}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {asset.status === "active" && (
                            <button
                              onClick={() => handleOpenClosingReview(asset)}
                              className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500 hover:text-white transition-colors cursor-pointer"
                              title={isAr ? "مراجعة وترحيل إهلاك هذا الأصل" : "Review & post depreciation"}
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
          Includes Asset Code as primary identifier (Section 10)
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
                  ? `يتم إثبات الأصول التاريخية مع كود الأصل وتثبيت تاريخ بدء الإهلاك تلقائياً على أول يوم في السنة المالية (${defaultFiscalStart})`
                  : `Historical assets with asset code locked to the first day of current fiscal year (${defaultFiscalStart})`}
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
                  <th className="p-3 text-right">1. {isAr ? "كود الأصل" : "Asset Code"}</th>
                  <th className="p-3 text-right">2. {isAr ? "اسم الأصل" : "Asset Name"}</th>
                  <th className="p-3 text-right">3. {isAr ? "الحساب الرئيسي" : "Main Account"}</th>
                  <th className="p-3 text-center">4. {isAr ? "تاريخ بداية السنة" : "Fiscal Start"}</th>
                  <th className="p-3 text-center">5. {isAr ? "تكلفة الشراء التاريخية" : "Historical Cost"}</th>
                  <th className="p-3 text-center text-amber-400">6. {isAr ? "مجمع إهلاك أول المدة" : "Beg. Accum. Deprec."}</th>
                  <th className="p-3 text-center text-blue-400">7. {isAr ? "القيمة الافتتاحية" : "Opening Value"}</th>
                  <th className="p-3 text-center">8. {isAr ? "النسبة %" : "Rate %"}</th>
                  <th className="p-3 text-center">9. {isAr ? "الحالة" : "Status"}</th>
                  <th className="p-3 text-center text-orange-400 font-mono">10. {isAr ? "إهلاك الفترة" : "Period Deprec."}</th>
                  <th className="p-3 text-center text-cyan-400 font-mono">11. {isAr ? "صافي القيمة الحالية" : "Current Net Value"}</th>
                  <th className="p-3 text-center">{isAr ? "إجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {isLoadingData ? (
                  <tr>
                    <td colSpan={12} className="p-8 text-center text-slate-400">
                      <TableSkeleton rows={3} />
                    </td>
                  </tr>
                ) : openingAssetsList.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-8 text-center text-slate-500">
                      {isAr ? "لا توجد أصول أول مدة مسجلة. انقر على «إثبات أصل أول المدة» لإدخال الأرصدة التاريخية للأصول." : "No opening assets recorded."}
                    </td>
                  </tr>
                ) : (
                  openingAssetsList.map(asset => (
                    <tr key={asset.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* 1. Asset Code */}
                      <td className="p-3 font-mono font-bold text-blue-400">
                        <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                          {asset.code}
                        </span>
                      </td>

                      {/* 2. Asset Name */}
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

                      {/* 3. Main Account */}
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <span className="text-slate-400">[{asset.mainAccount?.code || "1201"}]</span>
                          <span className="text-slate-200">{asset.mainAccount?.nameAr || asset.mainAccount?.nameEn}</span>
                        </div>
                      </td>

                      {/* 4. Fiscal Start */}
                      <td className="p-3 text-center font-mono text-blue-400">
                        {asset.purchaseDate}
                      </td>

                      {/* 5. Historical Cost */}
                      <td className="p-3 text-center font-mono font-bold text-white">
                        {formatCurrency(asset.purchaseValue, organization.currency, locale)}
                      </td>

                      {/* 6. Beginning Accumulated Depreciation */}
                      <td className="p-3 text-center font-mono text-amber-400 font-bold">
                        {formatCurrency(asset.beginningDepreciation, organization.currency, locale)}
                      </td>

                      {/* 7. Opening Asset Value */}
                      <td className="p-3 text-center font-mono font-bold text-blue-300">
                        {formatCurrency(asset.calc.openingAssetValue, organization.currency, locale)}
                      </td>

                      {/* 8. Rate */}
                      <td className="p-3 text-center font-mono text-emerald-400 font-bold">
                        {asset.depreciationRate}%
                      </td>

                      {/* 9. Status */}
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleToggleStatus(asset)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                            asset.status === "active"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                              : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
                          }`}
                        >
                          {asset.status === "active" ? (isAr ? "نشط" : "Active") : (isAr ? "متوقف" : "Inactive")}
                        </button>
                      </td>

                      {/* 10. Period Depreciation */}
                      <td className="p-3 text-center font-mono font-bold text-orange-400">
                        {formatCurrency(asset.calc.currentPeriodDepreciation, organization.currency, locale)}
                      </td>

                      {/* 11. Net Current Value */}
                      <td className="p-3 text-center font-mono font-bold text-cyan-400">
                        {formatCurrency(asset.calc.currentAssetValue, organization.currency, locale)}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {asset.status === "active" && (
                            <button
                              onClick={() => handleOpenClosingReview(asset)}
                              className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500 hover:text-white transition-colors cursor-pointer"
                              title={isAr ? "مراجعة وترحيل إهلاك هذا الأصل" : "Review & post depreciation"}
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
          CARD 3: تقرير أرصدة وإهلاك الأصول (REPORT & EXPORT)
          Includes Asset Code as primary identifier (Section 10)
      ------------------------------------------------------------- */}
      {activeTab === "report" && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-4 border-b border-slate-800 print:hidden">
            <div className="flex items-center gap-2 flex-wrap">
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
                      [{a.code || "AST"}] {a.name}
                    </option>
                  ))}
                </select>
              </div>

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

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-slate-400" />
                {isAr ? "طباعة / PDF" : "Print / PDF"}
              </button>

              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                {isAr ? "تصدير إكسيل (XLSX)" : "Export Excel"}
              </button>
            </div>
          </div>

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

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold bg-slate-950/40">
                  <th className="p-3 text-right">1. {isAr ? "كود الأصل" : "Asset Code"}</th>
                  <th className="p-3 text-right">2. {isAr ? "اسم الأصل" : "Asset Name"}</th>
                  <th className="p-3 text-right">3. {isAr ? "الحساب الرئيسي" : "Main Account"}</th>
                  <th className="p-3 text-center">4. {isAr ? "إهلاك أول المدة" : "Beg. Deprec."}</th>
                  <th className="p-3 text-center">5. {isAr ? "تاريخ الشراء" : "Purchase Date"}</th>
                  <th className="p-3 text-center">6. {isAr ? "القيمة أول المدة" : "Opening Value"}</th>
                  <th className="p-3 text-center">7. {isAr ? "تكلفة الشراء" : "Purchase Cost"}</th>
                  <th className="p-3 text-center">8. {isAr ? "النسبة %" : "Rate %"}</th>
                  <th className="p-3 text-center text-amber-400 font-mono">9. {isAr ? "إهلاك الفترة" : "Period Deprec."}</th>
                  <th className="p-3 text-center text-orange-400 font-mono">10. {isAr ? "مجمع الإهلاك" : "Accum. Deprec."}</th>
                  <th className="p-3 text-center text-cyan-400 font-mono">11. {isAr ? "القيمة نهاية المدة" : "Closing Value"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {reportRows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-slate-500">
                      {isAr ? "لا توجد بيانات أصول تطابق معايير التقرير المختارة." : "No asset data found."}
                    </td>
                  </tr>
                ) : (
                  reportRows.map(row => (
                    <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-purple-400">
                        <span className="px-2 py-0.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                          {row.code}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-white">{row.name}</td>
                      <td className="p-3 font-mono text-[11px] text-slate-300">[{row.mainAccountCode}] {row.mainAccountName}</td>
                      <td className="p-3 text-center font-mono text-slate-400">{formatCurrency(row.beginningDepreciation, organization.currency, locale)}</td>
                      <td className="p-3 text-center font-mono text-slate-400">{row.purchaseDate}</td>
                      <td className="p-3 text-center font-mono text-blue-300 font-bold">{formatCurrency(row.openingAssetValue, organization.currency, locale)}</td>
                      <td className="p-3 text-center font-mono font-bold text-white">{formatCurrency(row.purchaseValue, organization.currency, locale)}</td>
                      <td className="p-3 text-center font-mono text-emerald-400 font-bold">{row.depreciationRate}%</td>
                      <td className="p-3 text-center font-mono font-bold text-amber-400">{formatCurrency(row.currentPeriodDepreciation, organization.currency, locale)}</td>
                      <td className="p-3 text-center font-mono font-bold text-orange-400">{formatCurrency(row.accumulatedDepreciation, organization.currency, locale)}</td>
                      <td className="p-3 text-center font-mono font-bold text-cyan-400">{formatCurrency(row.closingAssetValue, organization.currency, locale)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {reportRows.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-950 font-bold text-white border-t-2 border-slate-700">
                    <td colSpan={3} className="p-3 text-right">{isAr ? "الإجماليات الكلية للأصول:" : "Total Assets Summary:"}</td>
                    <td className="p-3 text-center font-mono text-slate-300">{formatCurrency(reportTotals.beginningDepreciation, organization.currency, locale)}</td>
                    <td className="p-3 text-center font-mono text-slate-500">-</td>
                    <td className="p-3 text-center font-mono text-blue-300">{formatCurrency(reportTotals.openingAssetValue, organization.currency, locale)}</td>
                    <td className="p-3 text-center font-mono text-white">{formatCurrency(reportTotals.purchaseValue, organization.currency, locale)}</td>
                    <td className="p-3 text-center font-mono text-slate-500">-</td>
                    <td className="p-3 text-center font-mono text-amber-400">{formatCurrency(reportTotals.currentPeriodDepreciation, organization.currency, locale)}</td>
                    <td className="p-3 text-center font-mono text-orange-400">{formatCurrency(reportTotals.accumulatedDepreciation, organization.currency, locale)}</td>
                    <td className="p-3 text-center font-mono text-cyan-400">{formatCurrency(reportTotals.closingAssetValue, organization.currency, locale)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          CARD 4: سجل التدقيق والمراجعة
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
              .filter(l => l.entityType === "FixedAsset" || l.entityType === "AssetDepreciation" || l.entityType === "DepreciationSetting" || l.details?.includes("أصل"))
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
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL 1: ADD / EDIT PURCHASED ASSET (SECTION 1 & 2)
          Strict Order Required:
          Field 1: Main Asset Account
          Field 2: Asset Name (Searchable from COA & accounting records)
          Field 3: Asset Code (Mandatory, visible, stored)
          Auto-loaded: Purchase Value, Purchase Date, Depreciation Rate
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
            {/* Requirement 8: Load directly from Fixed Assets Register */}
            <div className="sm:col-span-2 space-y-1.5 p-3.5 bg-slate-950/90 rounded-2xl border border-emerald-500/40 shadow-sm">
              <label className="text-emerald-400 font-bold flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  {isAr ? "اختيار الأصل من سجل الأصول الثابتة (Fixed Assets Register) *" : "Select from Fixed Assets Register *"}
                </span>
                <span className="text-[10px] text-slate-400 font-sans">
                  {isAr ? "استرجاع بيانات الأصل مباشرة من السجل" : "Direct retrieval from Register"}
                </span>
              </label>
              <select
                onChange={e => handleSelectRegisterAsset(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value="">{isAr ? "-- اختر الأصل من سجل الأصول الثابتة للتحميل المباشر --" : "-- Select from Fixed Assets Register --"}</option>
                {fixedAssets.map(fa => {
                  const acc = accounts.find(a => a.id === fa.accountId);
                  return (
                    <option key={fa.id} value={fa.id}>
                      [{fa.code}] {fa.name} - ({acc?.nameAr || fa.accountId}) - {formatCurrency(fa.purchaseValue, organization.currency, locale)}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* FIELD 1: Main Asset Account (Must be selected first) */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-emerald-400 font-bold flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">1</span>
                {isAr ? "الحساب الرئيسي للأصل (شجرة الحسابات) *" : "Main Asset Account (Chart of Accounts) *"}
              </label>
              <select
                required
                value={formAccountId}
                onChange={e => handleAccountChange(e.target.value)}
                className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-semibold"
              >
                {fixedAssetAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    [{acc.code}] {acc.nameAr} {acc.nameEn ? `(${acc.nameEn})` : ""}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-500 block">
                {isAr
                  ? "اختر الحساب الرئيسي أولاً (مباني، سيارات، آلات ومعدات، أثاث، حاسبات) لتطبيق قواعد الإهلاك واسترجاع الحركات"
                  : "Select the parent asset account first (Buildings, Vehicles, Equipment, Furniture, Computers)"}
              </span>
            </div>

            {/* Auto-discovered candidate suggestions from accounting records (Section 2) */}
            {discoveredAccountingAssets.length > 0 && !editingAsset && (
              <div className="sm:col-span-2 p-3 bg-slate-950/70 border border-emerald-500/20 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-[11px] text-emerald-400 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    {isAr ? "أصول مكتشفة تلقائياً من القيود المحاسبية والدفاتر:" : "Auto-discovered Assets in Accounting Records:"}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {isAr ? "انقر لتحميل الكود والقيمة والتاريخ تلقائياً" : "Click to auto-load code, value & date"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
                  {discoveredAccountingAssets.map(cand => (
                    <button
                      key={cand.id}
                      type="button"
                      onClick={() => handleSelectDiscoveredAsset(cand)}
                      className="px-2.5 py-1.5 bg-slate-900 hover:bg-emerald-950/60 border border-slate-800 hover:border-emerald-500/50 rounded-xl text-right text-[11px] text-slate-200 transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <span className="font-mono text-emerald-400 font-bold">{cand.code}</span>
                      <span className="font-medium text-white">{cand.name}</span>
                      <span className="font-mono text-cyan-300">({formatCurrency(cand.purchaseValue, organization.currency, locale)})</span>
                      <span className="text-[9px] text-slate-500 bg-slate-950 px-1 py-0.5 rounded">{cand.source}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* FIELD 2: Asset Name (Searchable from COA & accounting records) */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-emerald-400 font-bold flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">2</span>
                {isAr ? "اسم الأصل *" : "Asset Name *"}
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder={isAr ? "مثال: سيارة توزيع تويوتا هايس 2026 أو اختر من القائمة أعلاه" : "e.g. Toyota Distribution Van 2026"}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* FIELD 3: Asset Code (Mandatory, visible, stored - Section 1 & Section 10) */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-emerald-400 font-bold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">3</span>
                  {isAr ? "كود الأصل (إلزامي كمعرف رئيسي) *" : "Asset Code (Mandatory Primary Identifier) *"}
                </span>
                <span className="text-[10px] text-slate-500 font-mono font-normal">
                  {isAr ? "يخزن ويظهر في كافة السجلات والتقارير" : "Stored & visible in all reports"}
                </span>
              </label>
              <div className="relative">
                <Hash className={`w-3.5 h-3.5 text-slate-400 absolute top-1/2 -translate-y-1/2 ${isAr ? "right-3" : "left-3"}`} />
                <input
                  type="text"
                  required
                  value={formCode}
                  onChange={e => setFormCode(e.target.value)}
                  placeholder="AST-1201003-01"
                  className={`w-full bg-slate-950 border border-slate-800 rounded-xl py-2 text-white focus:outline-none focus:border-emerald-500 font-mono font-bold ${
                    isAr ? "pr-8 pl-3" : "pl-8 pr-3"
                  }`}
                />
              </div>
            </div>

            {/* Purchase Value (Auto-loaded or manual) */}
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">{isAr ? "تكلفة الشراء الأصلية *" : "Purchase Value / Cost *"}</label>
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

            {/* Depreciation Rate (Inherited or manual - Sections 8 & 9) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-slate-400 font-semibold">{isAr ? "معدل الإهلاك السنوي (%) *" : "Depreciation Rate (%) *"}</label>
                {formAccountId && getAccountDepreciationRate(formAccountId) > 0 && (
                  <span className="text-[10px] text-emerald-400 font-bold">
                    {isAr ? "موروث تلقائياً من إعدادات الحساب" : "Auto-inherited from account rules"}
                  </span>
                )}
              </div>
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
              {isSubmitting ? (isAr ? "جاري الحفظ في قاعدة البيانات..." : "Saving to database...") : (isAr ? "حفظ وتثبيت الأصل" : "Save Asset")}
            </button>
          </div>
        </form>
      </Modal>

      {/* -------------------------------------------------------------
          MODAL 2: ADD / EDIT OPENING ASSET (SECTION 4 & 5)
          Strict Order Required:
          Field 1: Main Asset Account
          Field 2: Asset Name (Searchable from COA & opening balances)
          Field 3: Asset Code (Mandatory, visible, stored)
          Auto-loaded: Purchase Value, Beginning Depreciation, Fiscal Start
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
            {/* Requirement 8: Load directly from Fixed Assets Register for Opening Assets */}
            <div className="sm:col-span-2 space-y-1.5 p-3.5 bg-slate-950/90 rounded-2xl border border-blue-500/40 shadow-sm">
              <label className="text-blue-400 font-bold flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-400" />
                  {isAr ? "اختيار الأصل من سجل الأصول الثابتة (Fixed Assets Register) *" : "Select from Fixed Assets Register *"}
                </span>
                <span className="text-[10px] text-slate-400 font-sans">
                  {isAr ? "استرجاع بيانات الأصل مباشرة من السجل" : "Direct retrieval from Register"}
                </span>
              </label>
              <select
                onChange={e => handleSelectRegisterAsset(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="">{isAr ? "-- اختر الأصل من سجل الأصول الثابتة للتحميل المباشر --" : "-- Select from Fixed Assets Register --"}</option>
                {fixedAssets.map(fa => {
                  const acc = accounts.find(a => a.id === fa.accountId);
                  return (
                    <option key={fa.id} value={fa.id}>
                      [{fa.code}] {fa.name} - ({acc?.nameAr || fa.accountId}) - {formatCurrency(fa.purchaseValue, organization.currency, locale)}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* FIELD 1: Main Asset Account */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-blue-400 font-bold flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px]">1</span>
                {isAr ? "الحساب الرئيسي للأصل (شجرة الحسابات) *" : "Main Asset Account (Chart of Accounts) *"}
              </label>
              <select
                required
                value={formAccountId}
                onChange={e => handleAccountChange(e.target.value)}
                className="w-full bg-slate-950 border border-blue-500/40 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-semibold"
              >
                {fixedAssetAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    [{acc.code}] {acc.nameAr} {acc.nameEn ? `(${acc.nameEn})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Discovered opening candidate suggestions */}
            {discoveredAccountingAssets.length > 0 && !editingAsset && (
              <div className="sm:col-span-2 p-3 bg-slate-950/70 border border-blue-500/20 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-[11px] text-blue-400 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    {isAr ? "أرصدة افتتاحية مسجلة بالدفاتر:" : "Discovered Opening Records:"}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {isAr ? "انقر للتحميل التلقائي" : "Click to auto-load"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
                  {discoveredAccountingAssets.map(cand => (
                    <button
                      key={cand.id}
                      type="button"
                      onClick={() => handleSelectDiscoveredAsset(cand)}
                      className="px-2.5 py-1.5 bg-slate-900 hover:bg-blue-950/60 border border-slate-800 hover:border-blue-500/50 rounded-xl text-right text-[11px] text-slate-200 transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <span className="font-mono text-blue-400 font-bold">{cand.code}</span>
                      <span className="font-medium text-white">{cand.name}</span>
                      <span className="font-mono text-cyan-300">({formatCurrency(cand.purchaseValue, organization.currency, locale)})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* FIELD 2: Asset Name */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-blue-400 font-bold flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px]">2</span>
                {isAr ? "اسم الأصل *" : "Asset Name *"}
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder={isAr ? "مثال: سيرفرات ومعدات شبكات الإدارة" : "e.g. Headquarter Network Servers"}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* FIELD 3: Asset Code (Section 4 & 10) */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-blue-400 font-bold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px]">3</span>
                  {isAr ? "كود الأصل (إلزامي كمعرف رئيسي) *" : "Asset Code (Mandatory Primary Identifier) *"}
                </span>
                <span className="text-[10px] text-slate-500 font-mono font-normal">
                  {isAr ? "يخزن ويظهر في كافة السجلات والتقارير" : "Stored & visible in all reports"}
                </span>
              </label>
              <div className="relative">
                <Hash className={`w-3.5 h-3.5 text-slate-400 absolute top-1/2 -translate-y-1/2 ${isAr ? "right-3" : "left-3"}`} />
                <input
                  type="text"
                  required
                  value={formCode}
                  onChange={e => setFormCode(e.target.value)}
                  placeholder="AST-OP-1201005-01"
                  className={`w-full bg-slate-950 border border-slate-800 rounded-xl py-2 text-white focus:outline-none focus:border-blue-500 font-mono font-bold ${
                    isAr ? "pr-8 pl-3" : "pl-8 pr-3"
                  }`}
                />
              </div>
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
              <div className="flex items-center justify-between">
                <label className="text-slate-400 font-semibold">{isAr ? "معدل الإهلاك السنوي (%) *" : "Depreciation Rate (%) *"}</label>
                {formAccountId && getAccountDepreciationRate(formAccountId) > 0 && (
                  <span className="text-[10px] text-blue-400 font-bold">
                    {isAr ? "موروث تلقائياً من إعدادات الحساب" : "Auto-inherited"}
                  </span>
                )}
              </div>
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
              {isSubmitting ? (isAr ? "جاري الحفظ في قاعدة البيانات..." : "Saving to database...") : (isAr ? "حفظ وتثبيت أصل أول المدة" : "Save Opening Asset")}
            </button>
          </div>
        </form>
      </Modal>

      {/* -------------------------------------------------------------
          MODAL 3: DEPRECIATION PERIOD CLOSING REVIEW SCREEN (SECTION 6 & 7)
          Displays complete review report showing:
          - Asset Code
          - Asset Name
          - Main Account
          - Opening Depreciation
          - Original Asset Cost
          - Current Period Depreciation
          - Accumulated Depreciation
          - Closing Asset Value
          No posting should occur before displaying this review screen!
      ------------------------------------------------------------- */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title={isAr ? "تقرير مراجعة إقفال فترة الإهلاك المحاسبية (Review Screen)" : "Depreciation Period Closing Review"}
        size="xl"
      >
        <div className="space-y-4 text-xs">
          {/* Review Header & Period Selector */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <Calculator className="w-4 h-4 text-purple-400" />
                <span>{isAr ? "تقرير التدقيق والمطابقة قبل الترحيل والإقفال" : "Pre-Posting Audit & Verification Report"}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isAr
                  ? "مراجعة احتساب أقساط الإهلاك للأصول المؤهلة والتأكد من صحة الحسابات ومجمعات الإهلاك قبل تنفيذ الترحيل النهائي"
                  : "Verify calculated depreciation for eligible assets before generating journal entries"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold">{isAr ? "تاريخ إقفال الفترة:" : "Period End Date:"}</span>
              <input
                type="date"
                value={reviewPeriodEndDate}
                onChange={e => setReviewPeriodEndDate(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono font-bold focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Quick Review Summary Totals */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
              <div className="text-slate-400 text-[10px]">{isAr ? "عدد الأصول الخاضعة للإقفال" : "Assets to Depreciate"}</div>
              <div className="text-base font-black text-white font-mono mt-0.5">{closingReviewRows.length}</div>
            </div>
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
              <div className="text-slate-400 text-[10px]">{isAr ? "إجمالي التكلفة التاريخية" : "Total Original Cost"}</div>
              <div className="text-base font-black text-white font-mono mt-0.5">
                {formatCurrency(closingReviewTotals.originalCost, organization.currency, locale)}
              </div>
            </div>
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
              <div className="text-amber-400 text-[10px] font-bold">{isAr ? "إجمالي إهلاك الفترة المستحق" : "Period Depreciation Due"}</div>
              <div className="text-base font-black text-amber-400 font-mono mt-0.5">
                {formatCurrency(closingReviewTotals.currentPeriodDepreciation, organization.currency, locale)}
              </div>
            </div>
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
              <div className="text-cyan-400 text-[10px] font-bold">{isAr ? "صافي القيمة الدفترية الختامية" : "Closing Net Book Value"}</div>
              <div className="text-base font-black text-cyan-400 font-mono mt-0.5">
                {formatCurrency(closingReviewTotals.closingAssetValue, organization.currency, locale)}
              </div>
            </div>
          </div>

          {/* Complete 8-Column Review Table (Section 6) */}
          <div className="overflow-x-auto max-h-80 border border-slate-800 rounded-2xl">
            <table className="w-full text-xs text-right">
              <thead className="sticky top-0 bg-slate-950 border-b border-slate-800 text-slate-300 font-bold z-10">
                <tr>
                  <th className="p-2.5 text-right">1. {isAr ? "كود الأصل" : "Asset Code"}</th>
                  <th className="p-2.5 text-right">2. {isAr ? "اسم الأصل" : "Asset Name"}</th>
                  <th className="p-2.5 text-right">3. {isAr ? "الحساب الرئيسي" : "Main Account"}</th>
                  <th className="p-2.5 text-center">4. {isAr ? "إهلاك أول المدة" : "Opening Deprec."}</th>
                  <th className="p-2.5 text-center">5. {isAr ? "تكلفة الأصل الأصلية" : "Original Cost"}</th>
                  <th className="p-2.5 text-center text-amber-400 font-mono">6. {isAr ? "إهلاك الفترة الحالية" : "Current Deprec."}</th>
                  <th className="p-2.5 text-center text-orange-400 font-mono">7. {isAr ? "مجمع الإهلاك" : "Accum. Deprec."}</th>
                  <th className="p-2.5 text-center text-cyan-400 font-mono">8. {isAr ? "القيمة الدفترية الختامية" : "Closing Asset Value"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                {closingReviewRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-500">
                      {isAr ? "لا توجد أصول نشطة مؤهلة لاحتساب الإهلاك." : "No active assets to depreciate."}
                    </td>
                  </tr>
                ) : (
                  closingReviewRows.map(row => (
                    <tr key={row.id} className="hover:bg-slate-800/40">
                      <td className="p-2.5 font-mono font-bold text-emerald-400">{row.code}</td>
                      <td className="p-2.5 font-bold text-white">{row.name}</td>
                      <td className="p-2.5 font-mono text-[11px] text-slate-300">[{row.mainAccountCode}] {row.mainAccountName}</td>
                      <td className="p-2.5 text-center font-mono text-slate-400">{formatCurrency(row.openingDepreciation, organization.currency, locale)}</td>
                      <td className="p-2.5 text-center font-mono font-bold text-white">{formatCurrency(row.originalCost, organization.currency, locale)}</td>
                      <td className="p-2.5 text-center font-mono font-bold text-amber-400">{formatCurrency(row.currentPeriodDepreciation, organization.currency, locale)}</td>
                      <td className="p-2.5 text-center font-mono font-bold text-orange-400">{formatCurrency(row.accumulatedDepreciation, organization.currency, locale)}</td>
                      <td className="p-2.5 text-center font-mono font-bold text-cyan-400">{formatCurrency(row.closingAssetValue, organization.currency, locale)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {closingReviewRows.length > 0 && (
                <tfoot className="sticky bottom-0 bg-slate-950 border-t-2 border-slate-700 font-bold text-white">
                  <tr>
                    <td colSpan={3} className="p-2.5 text-right">{isAr ? "المجموع الكلي:" : "Total:"}</td>
                    <td className="p-2.5 text-center font-mono text-slate-400">{formatCurrency(closingReviewTotals.openingDepreciation, organization.currency, locale)}</td>
                    <td className="p-2.5 text-center font-mono text-white">{formatCurrency(closingReviewTotals.originalCost, organization.currency, locale)}</td>
                    <td className="p-2.5 text-center font-mono text-amber-400">{formatCurrency(closingReviewTotals.currentPeriodDepreciation, organization.currency, locale)}</td>
                    <td className="p-2.5 text-center font-mono text-orange-400">{formatCurrency(closingReviewTotals.accumulatedDepreciation, organization.currency, locale)}</td>
                    <td className="p-2.5 text-center font-mono text-cyan-400">{formatCurrency(closingReviewTotals.closingAssetValue, organization.currency, locale)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* SECTION 7: Close Depreciation Period Prompt */}
          <div className="p-4 bg-purple-950/30 border border-purple-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="font-black text-white text-sm">
                {isAr ? "إقفال فترة الإهلاك؟" : "Close Depreciation Period?"}
              </div>
              <p className="text-[11px] text-purple-200/80 mt-0.5">
                {isAr
                  ? "هل ترغب في اعتماد مبالغ الإهلاك ومتابعة الإجراء لترحيل القيود وتوليد أثرها في دفتر الأستاذ والقوائم المالية؟"
                  : "Approve calculated depreciation and proceed to generate balanced journal entries"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                {isAr ? "لا" : "No"}
              </button>

              <button
                type="button"
                disabled={closingReviewRows.length === 0}
                onClick={handlePromptClosingConfirmation}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                {isAr ? "نعم" : "Yes"}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* -------------------------------------------------------------
          MODAL 4: DEPRECIATION CLOSING CONFIRMATION DIALOG (SECTION 7)
          Question: "Are you sure you want to close the depreciation period?"
          Options: Confirm, Cancel
          No posting occurs without confirmation!
      ------------------------------------------------------------- */}
      <Modal
        isOpen={isClosingConfirmDialogOpen}
        onClose={() => setIsClosingConfirmDialogOpen(false)}
        title={isAr ? "تأكيد نهائي: إقفال فترة الإهلاك" : "Confirm Depreciation Period Closing"}
        size="md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3 text-amber-200">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-sm text-white">
                {isAr ? "هل أنت متأكد من رغبتك في إقفال فترة الإهلاك؟" : "Are you sure you want to close the depreciation period?"}
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {isAr
                  ? `سيقوم النظام بإنشاء وترحيل قيود الإهلاك لعدد (${closingReviewRows.length}) أصل بمبلغ إجمالي (${formatCurrency(closingReviewTotals.currentPeriodDepreciation, organization.currency, locale)})، وتحديث مجمعات الإهلاك وتغذية ميزان المراجعة وقائمة الدخل تلقائياً.`
                  : `The system will post depreciation journal entries for ${closingReviewRows.length} assets with total amount of ${formatCurrency(closingReviewTotals.currentPeriodDepreciation, organization.currency, locale)}.`}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={isPostingAll}
              onClick={() => setIsClosingConfirmDialogOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              {isAr ? "إلغاء (Cancel)" : "Cancel"}
            </button>

            <button
              type="button"
              disabled={isPostingAll}
              onClick={handleExecuteConfirmedPosting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              {isPostingAll ? (isAr ? "جاري الترحيل..." : "Posting...") : (isAr ? "تأكيد (Confirm)" : "Confirm")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
