"use client";

import React, { useState, useMemo } from "react";
import { useERP } from "@/context/erp-context";
import { Currency, CustomerCategory, ProductCategory, CostCenter, CostCenterType } from "@/types/erp";
import Modal from "@/components/ui/Modal";
import TableSkeleton from "@/components/ui/TableSkeleton";
import {
  Settings, Building2, Globe, Shield, Save, Check, Users, Plus,
  Edit, Trash2, Tag, Layers, Package, Loader2, AlertCircle
} from "lucide-react";

export default function SettingsPage() {
  const {
    organization, updateOrganization,
    customerCategories, addCustomerCategory, updateCustomerCategory, deleteCustomerCategory,
    categories, addCategory, updateCategory, deleteCategory,
    costCenters, addCostCenter, updateCostCenter, deleteCostCenter,
    products, journalEntries,
    locale, showToast, isLoadingData
  } = useERP();
  const isAr = locale === "ar";

  const [activeTab, setActiveTab] = useState<"general" | "customer_categories" | "product_categories" | "cost_center_accounts">("general");

  // General Settings Form State
  const [nameAr, setNameAr] = useState(organization.nameAr);
  const [nameEn, setNameEn] = useState(organization.nameEn);
  const [taxNumber, setTaxNumber] = useState(organization.taxNumber);
  const [commercialRegister, setCommercialRegister] = useState(organization.commercialRegister || "");
  const [country, setCountry] = useState(organization.country || "EG");
  const [currency, setCurrency] = useState<Currency>(organization.currency);
  const [defaultVatRate, setDefaultVatRate] = useState(organization.defaultVatRate);
  const [address, setAddress] = useState(organization.address || "");
  const [logoUrl, setLogoUrl] = useState(organization.logoUrl || "");
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Customer Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CustomerCategory | null>(null);
  const [catNameAr, setCatNameAr] = useState("");
  const [catNameEn, setCatNameEn] = useState("");
  const [catCode, setCatCode] = useState("");
  const [catDescription, setCatDescription] = useState("");
  const [catError, setCatError] = useState<string | null>(null);
  const [isCatSubmitting, setIsCatSubmitting] = useState(false);

  // Product Category Modal State (Item 5 Part A)
  const [isProdCatModalOpen, setIsProdCatModalOpen] = useState(false);
  const [editingProdCat, setEditingProdCat] = useState<ProductCategory | null>(null);
  const [prodCatCode, setProdCatCode] = useState("");
  const [prodCatNameAr, setProdCatNameAr] = useState("");
  const [prodCatNameEn, setProdCatNameEn] = useState("");
  const [prodCatError, setProdCatError] = useState<string | null>(null);
  const [isProdCatSubmitting, setIsProdCatSubmitting] = useState(false);

  // Cost Center Master Account Modal State (Item 5 Part B)
  const [isCcAccModalOpen, setIsCcAccModalOpen] = useState(false);
  const [editingCcAcc, setEditingCcAcc] = useState<CostCenter | null>(null);
  const [ccAccCode, setCcAccCode] = useState("");
  const [ccAccNameAr, setCcAccNameAr] = useState("");
  const [ccAccNameEn, setCcAccNameEn] = useState("");
  const [ccAccType, setCcAccType] = useState<CostCenterType>("expense");
  const [ccAccError, setCcAccError] = useState<string | null>(null);
  const [isCcAccSubmitting, setIsCcAccSubmitting] = useState(false);

  // Master Cost Centers (Level 1)
  const masterCostCenters = useMemo(() => {
    return costCenters.filter(c => c.level === 1 || !c.parentId);
  }, [costCenters]);

  // Sync state when organization updates
  React.useEffect(() => {
    setNameAr(organization.nameAr);
    setNameEn(organization.nameEn);
    setTaxNumber(organization.taxNumber);
    setCommercialRegister(organization.commercialRegister || "");
    setCountry(organization.country || "EG");
    setCurrency(organization.currency);
    setDefaultVatRate(organization.defaultVatRate);
    setAddress(organization.address || "");
    setLogoUrl(organization.logoUrl || "");
  }, [organization]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateOrganization({
        id: organization.id,
        nameAr: nameAr.trim(),
        nameEn: nameEn.trim(),
        taxNumber: taxNumber.trim(),
        commercialRegister: commercialRegister.trim(),
        country: country as any,
        currency,
        defaultVatRate,
        address: address.trim(),
        logoUrl: logoUrl.trim() || undefined,
      });
      setSaved(true);
      showToast(isAr ? "تم حفظ إعدادات المنشأة وتأكيد المزامنة مع قاعدة البيانات" : "Settings saved successfully", "success");
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      console.error("Failed to save settings:", err);
      showToast(err?.message || (isAr ? "فشل حفظ إعدادات المنشأة" : "Failed to save settings"), "error");
    } finally {
      setIsSaving(false);
    }
  };

  // --- Customer Category Handlers ---
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCatError(null);
    setCatCode(`CAT-${(customerCategories.length + 1).toString().padStart(2, "0")}`);
    setCatNameAr("");
    setCatNameEn("");
    setCatDescription("");
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: CustomerCategory) => {
    setEditingCategory(cat);
    setCatError(null);
    setCatCode(cat.code);
    setCatNameAr(cat.nameAr);
    setCatNameEn(cat.nameEn);
    setCatDescription(cat.description || "");
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatError(null);

    const trimmedAr = catNameAr.trim();
    if (!trimmedAr) {
      setCatError(isAr ? "يرجى كتابة اسم التصنيف بالعربي" : "Please enter category name");
      return;
    }

    const dup = customerCategories.find(
      c => (!editingCategory || c.id !== editingCategory.id) && c.nameAr.toLowerCase() === trimmedAr.toLowerCase()
    );
    if (dup) {
      const err = isAr ? `اسم التصنيف (${trimmedAr}) مستخدم بالفعل` : "Category name already exists";
      setCatError(err);
      return;
    }

    setIsCatSubmitting(true);
    try {
      if (editingCategory) {
        await updateCustomerCategory(editingCategory.id, {
          nameAr: trimmedAr,
          nameEn: catNameEn.trim() || trimmedAr,
          code: catCode.trim(),
          description: catDescription.trim(),
        });
        showToast(isAr ? "تم تحديث التصنيف بنجاح" : "Category updated", "success");
      } else {
        await addCustomerCategory({
          organizationId: organization.id,
          nameAr: trimmedAr,
          nameEn: catNameEn.trim() || trimmedAr,
          code: catCode.trim() || `CAT-${(customerCategories.length + 1).toString().padStart(2, "0")}`,
          description: catDescription.trim(),
        });
        showToast(isAr ? "تمت إضافة التصنيف بنجاح" : "Category added", "success");
      }
      setIsCategoryModalOpen(false);
    } catch (err: any) {
      console.error("Failed to save category:", err);
      const errMsg = err?.message || (isAr ? "فشل حفظ التصنيف" : "Failed to save category");
      setCatError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setIsCatSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm(isAr ? "هل أنت متأكد من حذف هذا التصنيف؟" : "Are you sure you want to delete this category?")) return;
    try {
      await deleteCustomerCategory(id);
      showToast(isAr ? "تم حذف التصنيف بنجاح" : "Category deleted", "success");
    } catch (err: any) {
      showToast(err?.message || (isAr ? "فشل حذف التصنيف" : "Failed to delete"), "error");
    }
  };

  // --- Product Category Handlers (Item 5 Part A) ---
  const handleOpenAddProdCat = () => {
    setEditingProdCat(null);
    setProdCatError(null);
    setProdCatCode(`PCAT-${(categories.length + 1).toString().padStart(2, "0")}`);
    setProdCatNameAr("");
    setProdCatNameEn("");
    setIsProdCatModalOpen(true);
  };

  const handleOpenEditProdCat = (cat: ProductCategory) => {
    setEditingProdCat(cat);
    setProdCatError(null);
    setProdCatCode(cat.code);
    setProdCatNameAr(cat.nameAr);
    setProdCatNameEn(cat.nameEn || "");
    setIsProdCatModalOpen(true);
  };

  const handleSaveProdCat = async (e: React.FormEvent) => {
    e.preventDefault();
    setProdCatError(null);

    const trimmedAr = prodCatNameAr.trim();
    if (!trimmedAr) {
      setProdCatError(isAr ? "يرجى كتابة اسم تصنيف المنتجات بالعربي" : "Please enter product category name");
      return;
    }

    const dup = categories.find(
      c => (!editingProdCat || c.id !== editingProdCat.id) && c.nameAr.toLowerCase() === trimmedAr.toLowerCase()
    );
    if (dup) {
      setProdCatError(isAr ? `اسم التصنيف (${trimmedAr}) مستخدم بالفعل` : "Category name already exists");
      return;
    }

    setIsProdCatSubmitting(true);
    try {
      if (editingProdCat) {
        await updateCategory(editingProdCat.id, {
          code: prodCatCode.trim(),
          nameAr: trimmedAr,
          nameEn: prodCatNameEn.trim() || trimmedAr,
        });
        showToast(isAr ? "تم تحديث تصنيف المنتجات بنجاح" : "Product category updated", "success");
      } else {
        await addCategory({
          organizationId: organization.id,
          code: prodCatCode.trim() || `PCAT-${(categories.length + 1).toString().padStart(2, "0")}`,
          nameAr: trimmedAr,
          nameEn: prodCatNameEn.trim() || trimmedAr,
        });
        showToast(isAr ? "تمت إضافة تصنيف المنتجات بنجاح" : "Product category added", "success");
      }
      setIsProdCatModalOpen(false);
    } catch (err: any) {
      console.error("Failed to save product category:", err);
      const errMsg = err?.message || (isAr ? "فشل حفظ التصنيف" : "Failed to save product category");
      setProdCatError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setIsProdCatSubmitting(false);
    }
  };

  const handleDeleteProdCat = async (id: string) => {
    // Validation: cannot delete if products are assigned
    const assignedCount = products.filter(p => p.categoryId === id).length;
    if (assignedCount > 0) {
      showToast(
        isAr ? `لا يمكن حذف هذا التصنيف لوجود (${assignedCount}) منتج مرتبط به حالياً` : `Cannot delete category: ${assignedCount} products assigned`,
        "error"
      );
      return;
    }

    if (!confirm(isAr ? "هل أنت متأكد من حذف هذا التصنيف؟" : "Are you sure you want to delete this product category?")) return;
    try {
      await deleteCategory(id);
      showToast(isAr ? "تم حذف تصنيف المنتجات بنجاح" : "Product category deleted", "success");
    } catch (err: any) {
      showToast(err?.message || (isAr ? "فشل حذف التصنيف" : "Failed to delete"), "error");
    }
  };

  // --- Main Cost Center Accounts Handlers (Item 5 Part B) ---
  const handleOpenAddCcAcc = () => {
    setEditingCcAcc(null);
    setCcAccError(null);
    setCcAccCode(`CC-M-${(masterCostCenters.length + 1).toString().padStart(2, "0")}`);
    setCcAccNameAr("");
    setCcAccNameEn("");
    setCcAccType("expense");
    setIsCcAccModalOpen(true);
  };

  const handleOpenEditCcAcc = (cc: CostCenter) => {
    setEditingCcAcc(cc);
    setCcAccError(null);
    setCcAccCode(cc.code);
    setCcAccNameAr(cc.nameAr);
    setCcAccNameEn(cc.nameEn || "");
    setCcAccType((cc.costCenterType || cc.type || "expense") as CostCenterType);
    setIsCcAccModalOpen(true);
  };

  const handleSaveCcAcc = async (e: React.FormEvent) => {
    e.preventDefault();
    setCcAccError(null);

    const trimmedAr = ccAccNameAr.trim();
    if (!trimmedAr) {
      setCcAccError(isAr ? "يرجى كتابة اسم حساب مركز التكلفة بالعربي" : "Please enter name");
      return;
    }

    setIsCcAccSubmitting(true);
    try {
      if (editingCcAcc) {
        await updateCostCenter(editingCcAcc.id, {
          code: ccAccCode.trim(),
          nameAr: trimmedAr,
          nameEn: ccAccNameEn.trim() || trimmedAr,
          level: 1,
          costCenterType: ccAccType,
          type: ccAccType,
        });
        showToast(isAr ? "تم تحديث حساب مركز التكلفة الرئيسي بنجاح" : "Main cost center account updated", "success");
      } else {
        await addCostCenter({
          organizationId: organization.id,
          code: ccAccCode.trim() || `CC-M-${(masterCostCenters.length + 1).toString().padStart(2, "0")}`,
          nameAr: trimmedAr,
          nameEn: ccAccNameEn.trim() || trimmedAr,
          level: 1,
          isActive: true,
          costCenterType: ccAccType,
          type: ccAccType,
        });
        showToast(isAr ? "تمت إضافة حساب مركز التكلفة الرئيسي بنجاح" : "Main cost center account added", "success");
      }
      setIsCcAccModalOpen(false);
    } catch (err: any) {
      console.error("Failed to save cost center account:", err);
      const errMsg = err?.message || (isAr ? "فشل حفظ الحساب" : "Failed to save account");
      setCcAccError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setIsCcAccSubmitting(false);
    }
  };

  const handleDeleteCcAcc = async (id: string) => {
    // Validation 1: cannot delete if sub cost centers are attached
    const subCentersCount = costCenters.filter(c => c.parentId === id).length;
    if (subCentersCount > 0) {
      showToast(
        isAr ? `لا يمكن حذف هذا الحساب لوجود (${subCentersCount}) مراكز تكلفة فرعية تابعة له` : `Cannot delete: ${subCentersCount} sub-centers attached`,
        "error"
      );
      return;
    }

    // Validation 2: cannot delete if transactions are attached
    const isUsedInJournals = journalEntries.some(je => je.lines?.some(l => l.costCenterId === id));
    if (isUsedInJournals) {
      showToast(
        isAr ? "لا يمكن حذف هذا المركز لوجود قيود محاسبية مسجلة عليه" : "Cannot delete cost center with accounting records",
        "error"
      );
      return;
    }

    if (!confirm(isAr ? "هل أنت متأكد من حذف هذا الحساب؟" : "Are you sure you want to delete this cost center account?")) return;
    try {
      await deleteCostCenter(id);
      showToast(isAr ? "تم حذف حساب مركز التكلفة بنجاح" : "Cost center account deleted", "success");
    } catch (err: any) {
      showToast(err?.message || (isAr ? "فشل حذف الحساب" : "Failed to delete"), "error");
    }
  };

  if (isLoadingData) {
    return <TableSkeleton rows={6} columns={4} summaryCards={0} isAr={isAr} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
              <Settings className="w-6 h-6 text-emerald-400" />
              <span>{isAr ? "إعدادات النظام والمنشأة" : "System & General Settings"}</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {isAr ? "البيانات الأساسية للمنشأة، إعدادات الضريبة، تصنيفات العملاء، وتصنيفات المنتجات ومراكز التكلفة" : "Organization profile, tax presets, customer categories, product categories, and master cost center accounts"}
            </p>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-800 flex-wrap">
          <button
            onClick={() => setActiveTab("general")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "general"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/50"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>{isAr ? "بيانات المنشأة والضريبة" : "Organization & Tax"}</span>
          </button>

          <button
            onClick={() => setActiveTab("customer_categories")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "customer_categories"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/50"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>{isAr ? "تصنيفات العملاء" : "Customer Categories"} ({customerCategories.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("product_categories")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "product_categories"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/50"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <Package className="w-4 h-4" />
            <span>{isAr ? "تصنيفات المنتجات" : "Product Categories"} ({categories.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("cost_center_accounts")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "cost_center_accounts"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/50"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{isAr ? "حسابات مراكز التكلفة الرئيسية" : "Cost Center Accounts"} ({masterCostCenters.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: General & Tax Settings */}
      {activeTab === "general" && (
        <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-6 text-xs">
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between">
            <div>
              <div className="font-bold text-white text-sm">{isAr ? "باقة الاشتراك: Enterprise SaaS" : "Subscription: Enterprise"}</div>
              <div className="text-slate-400 text-[11px] mt-0.5">{isAr ? "مستخدمين غير محدودين - مستودعات وفروع متعددة - فوترة إلكترونية ZATCA / ETA" : "Unlimited users, multi-branch, electronic invoicing active"}</div>
            </div>
            <span className="px-3 py-1 bg-emerald-600 text-white rounded-full font-bold text-xs">
              {isAr ? "مفعلة" : "Active"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "اسم المنشأة (بالعربية) *" : "Company Name (AR) *"}</label>
              <input
                type="text"
                required
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "اسم المنشأة (بالإنجليزية) *" : "Company Name (EN) *"}</label>
              <input
                type="text"
                required
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "الرقم الضريبي الموحد *" : "Tax / VAT ID *"}</label>
              <input
                type="text"
                required
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "رقم السجل التجاري" : "Commercial Register"}</label>
              <input
                type="text"
                value={commercialRegister}
                placeholder={isAr ? "مثال: 1010987654" : "e.g. 1010987654"}
                onChange={(e) => setCommercialRegister(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "الدولة / النطاق الجغرافي *" : "Country *"}</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-bold focus:outline-none focus:border-emerald-500"
              >
                <option value="EG">{isAr ? "مصر (Egypt - EGP / 14%)" : "Egypt (EG)"}</option>
                <option value="SA">{isAr ? "المملكة العربية السعودية (KSA - SAR / 15%)" : "Saudi Arabia (SA)"}</option>
                <option value="AE">{isAr ? "الإمارات العربية المتحدة (UAE - AED / 5%)" : "United Arab Emirates (AE)"}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "العملة الأساسية للنظام *" : "Base Currency *"}</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-bold focus:outline-none focus:border-emerald-500"
              >
                <option value="EGP">{isAr ? "جنيه مصري (EGP)" : "Egyptian Pound (EGP)"}</option>
                <option value="SAR">{isAr ? "ريال سعودي (SAR)" : "Saudi Riyal (SAR)"}</option>
                <option value="AED">{isAr ? "درهم إماراتي (AED)" : "UAE Dirham (AED)"}</option>
                <option value="USD">{isAr ? "دولار أمريكي (USD)" : "US Dollar (USD)"}</option>
              </select>
            </div>

            {/* ITEM 1: Tax Settings with "No Tax" (0%) Option */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                {isAr ? "نسبة ضريبة القيمة المضافة الافتراضية (%) *" : "Default VAT Rate % *"}
              </label>
              <div className="space-y-2">
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setDefaultVatRate(0)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      defaultVatRate === 0
                        ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700"
                    }`}
                  >
                    {isAr ? "بدون ضريبة (0%)" : "No Tax (0%)"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDefaultVatRate(14)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      defaultVatRate === 14
                        ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700"
                    }`}
                  >
                    14% (مصر)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDefaultVatRate(15)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      defaultVatRate === 15
                        ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700"
                    }`}
                  >
                    15% (السعودية)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDefaultVatRate(5)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      defaultVatRate === 5
                        ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700"
                    }`}
                  >
                    5% (الإمارات)
                  </button>
                </div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  required
                  value={defaultVatRate}
                  onChange={(e) => setDefaultVatRate(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "العنوان والمقر الرئيسي" : "Address"}</label>
              <input
                type="text"
                value={address}
                placeholder={isAr ? "المدينة، الشارع، المبنى..." : "City, street, building..."}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "رابط شعار المنشأة (Logo URL)" : "Logo URL"}</label>
              <input
                type="text"
                value={logoUrl}
                placeholder="https://example.com/logo.png"
                onChange={(e) => setLogoUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            {saved ? (
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <Check className="w-4 h-4" />
                <span>{isAr ? "تم حفظ التعديلات بنجاح!" : "Changes saved successfully!"}</span>
              </span>
            ) : <div />}

            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isAr ? "جاري الحفظ..." : "Saving..."}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isAr ? "حفظ الإعدادات" : "Save Changes"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: Customer Categories */}
      {activeTab === "customer_categories" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">{isAr ? "دليل تصنيفات وشرائح العملاء" : "Customer Categories"}</h2>
              <p className="text-slate-400 text-[11px] mt-0.5">
                {isAr ? "تقسيم العملاء إلى شرائح (جملة، تجزئة، VIP، شركات) لتسهيل الفلترة والتقارير" : "Categorize customers for targeted pricing and analytics"}
              </p>
            </div>
            <button
              onClick={handleOpenAddCategory}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? "إضافة تصنيف جديد" : "Add Category"}</span>
            </button>
          </div>

          <div className="border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                  <th className="p-3">#</th>
                  <th className="p-3">{isAr ? "كود التصنيف" : "Code"}</th>
                  <th className="p-3">{isAr ? "اسم التصنيف (عربي)" : "Name (AR)"}</th>
                  <th className="p-3">{isAr ? "اسم التصنيف (إنجليزي)" : "Name (EN)"}</th>
                  <th className="p-3">{isAr ? "الوصف" : "Description"}</th>
                  <th className="p-3 text-center">{isAr ? "الإجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {customerCategories.map((cat, idx) => (
                  <tr key={cat.id} className="hover:bg-slate-800/30">
                    <td className="p-3 text-slate-500 font-mono">{idx + 1}</td>
                    <td className="p-3 font-mono font-bold text-emerald-400">{cat.code}</td>
                    <td className="p-3 font-bold text-white">{cat.nameAr}</td>
                    <td className="p-3 text-slate-300">{cat.nameEn}</td>
                    <td className="p-3 text-slate-400">{cat.description || "---"}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditCategory(cat)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-300 transition-colors cursor-pointer"
                          title={isAr ? "تعديل" : "Edit"}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-400 transition-colors cursor-pointer"
                          title={isAr ? "حذف" : "Delete"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {customerCategories.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-500">
                      {isAr ? "لا توجد تصنيفات مسجلة حتى الآن" : "No categories found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Main Product Categories (Item 5 Part A) */}
      {activeTab === "product_categories" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-400" />
                <span>{isAr ? "دليل تصنيفات المنتجات الرئيسية" : "Main Product Categories"}</span>
              </h2>
              <p className="text-slate-400 text-[11px] mt-0.5">
                {isAr ? "إدارة تصنيفات الأصناف والمنتجات ديناميكياً لاستخدامها في المخزون والفواتير ونقاط البيع" : "Manage product categories for inventory categorization and reporting"}
              </p>
            </div>
            <button
              onClick={handleOpenAddProdCat}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? "إضافة تصنيف منتجات جديد" : "Add Category"}</span>
            </button>
          </div>

          <div className="border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                  <th className="p-3">#</th>
                  <th className="p-3">{isAr ? "كود التصنيف" : "Code"}</th>
                  <th className="p-3">{isAr ? "اسم التصنيف (عربي)" : "Name (AR)"}</th>
                  <th className="p-3">{isAr ? "اسم التصنيف (إنجليزي)" : "Name (EN)"}</th>
                  <th className="p-3 text-center">{isAr ? "عدد المنتجات التابعة" : "Products"}</th>
                  <th className="p-3 text-center">{isAr ? "الإجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {categories.map((cat, idx) => {
                  const prodCount = products.filter(p => p.categoryId === cat.id).length;
                  return (
                    <tr key={cat.id} className="hover:bg-slate-800/30">
                      <td className="p-3 text-slate-500 font-mono">{idx + 1}</td>
                      <td className="p-3 font-mono font-bold text-emerald-400">{cat.code}</td>
                      <td className="p-3 font-bold text-white">{cat.nameAr}</td>
                      <td className="p-3 text-slate-300">{cat.nameEn || "---"}</td>
                      <td className="p-3 text-center">
                        <span className="px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-slate-800 text-slate-300 border border-slate-700">
                          {prodCount} {isAr ? "منتج" : "items"}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditProdCat(cat)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-300 transition-colors cursor-pointer"
                            title={isAr ? "تعديل" : "Edit"}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProdCat(cat.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-400 transition-colors cursor-pointer"
                            title={isAr ? "حذف" : "Delete"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {categories.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-500">
                      {isAr ? "لا توجد تصنيفات منتجات مسجلة حتى الآن" : "No product categories found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Main Cost Center Accounts (Item 5 Part B) */}
      {activeTab === "cost_center_accounts" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>{isAr ? "حسابات مراكز التكلفة الرئيسية (المستوى الأول)" : "Master Cost Center Accounts"}</span>
              </h2>
              <p className="text-slate-400 text-[11px] mt-0.5">
                {isAr ? "إدارة الحسابات والمراكز الرئيسية بهيكل شجرة التكاليف وتحديد طبيعتها (مصروف، إيراد، أصل، التزامات)" : "Manage master cost center accounts with 4 nature types"}
              </p>
            </div>
            <button
              onClick={handleOpenAddCcAcc}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? "إضافة حساب مركز تكلفة رئيسي" : "Add Master Center"}</span>
            </button>
          </div>

          <div className="border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                  <th className="p-3">#</th>
                  <th className="p-3 font-mono">{isAr ? "كود الحساب" : "Code"}</th>
                  <th className="p-3">{isAr ? "اسم الحساب الرئيسي (عربي)" : "Name (AR)"}</th>
                  <th className="p-3">{isAr ? "اسم الحساب (إنجليزي)" : "Name (EN)"}</th>
                  <th className="p-3 text-center">{isAr ? "طبيعة الحساب" : "Nature Type"}</th>
                  <th className="p-3 text-center">{isAr ? "المراكز الفرعية" : "Sub-centers"}</th>
                  <th className="p-3 text-center">{isAr ? "الإجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {masterCostCenters.map((cc, idx) => {
                  const subCount = costCenters.filter(c => c.parentId === cc.id).length;
                  const t = (cc.costCenterType || cc.type || "expense") as CostCenterType;
                  return (
                    <tr key={cc.id} className="hover:bg-slate-800/30">
                      <td className="p-3 text-slate-500 font-mono">{idx + 1}</td>
                      <td className="p-3 font-mono font-bold text-emerald-400">{cc.code}</td>
                      <td className="p-3 font-bold text-white">{cc.nameAr}</td>
                      <td className="p-3 text-slate-300">{cc.nameEn || "---"}</td>
                      <td className="p-3 text-center">
                        {t === "revenue" ? (
                          <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-xl font-bold border border-emerald-500/20 text-[10px]">
                            {isAr ? "إيراد (Revenue)" : "Revenue"}
                          </span>
                        ) : t === "asset" ? (
                          <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 rounded-xl font-bold border border-indigo-500/20 text-[10px]">
                            {isAr ? "أصل (Asset)" : "Asset"}
                          </span>
                        ) : t === "liability" ? (
                          <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 rounded-xl font-bold border border-amber-500/20 text-[10px]">
                            {isAr ? "التزامات (Liability)" : "Liability"}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-xl font-bold border border-blue-500/20 text-[10px]">
                            {isAr ? "مصروف (Expense)" : "Expense"}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-slate-800 text-slate-300 border border-slate-700">
                          {subCount} {isAr ? "مراكز فرعية" : "subs"}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditCcAcc(cc)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-300 transition-colors cursor-pointer"
                            title={isAr ? "تعديل" : "Edit"}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCcAcc(cc.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-400 transition-colors cursor-pointer"
                            title={isAr ? "حذف" : "Delete"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {masterCostCenters.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-500">
                      {isAr ? "لا توجد حسابات مراكز تكلفة رئيسية مسجلة حتى الآن" : "No master cost center accounts found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: Customer Category Modal */}
      {isCategoryModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => !isCatSubmitting && setIsCategoryModalOpen(false)}
          title={editingCategory ? (isAr ? "تعديل تصنيف عملاء" : "Edit Category") : (isAr ? "إضافة تصنيف عملاء جديد" : "New Category")}
          maxWidth="md"
        >
          <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
            {catError && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{catError}</span>
              </div>
            )}

            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "كود التصنيف *" : "Code *"}</label>
              <input
                type="text"
                required
                value={catCode}
                onChange={(e) => setCatCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "اسم التصنيف (عربي) *" : "Name (AR) *"}</label>
              <input
                type="text"
                required
                placeholder={isAr ? "مثال: عملاء جملة / عملاء قطاعي / VIP" : "e.g. Wholesale"}
                value={catNameAr}
                onChange={(e) => setCatNameAr(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "اسم التصنيف (إنجليزي)" : "Name (EN)"}</label>
              <input
                type="text"
                value={catNameEn}
                onChange={(e) => setCatNameEn(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "الوصف" : "Description"}</label>
              <textarea
                rows={2}
                value={catDescription}
                onChange={(e) => setCatDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                disabled={isCatSubmitting}
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl cursor-pointer disabled:opacity-50"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={isCatSubmitting}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {isCatSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isAr ? "جاري الحفظ..." : "Saving..."}</span>
                  </>
                ) : (
                  <span>{isAr ? "حفظ التصنيف" : "Save Category"}</span>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: Product Category Modal (Item 5 Part A) */}
      {isProdCatModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => !isProdCatSubmitting && setIsProdCatModalOpen(false)}
          title={editingProdCat ? (isAr ? "تعديل تصنيف منتجات" : "Edit Product Category") : (isAr ? "إضافة تصنيف منتجات جديد" : "New Product Category")}
          maxWidth="md"
        >
          <form onSubmit={handleSaveProdCat} className="space-y-4 text-xs">
            {prodCatError && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{prodCatError}</span>
              </div>
            )}

            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "كود التصنيف *" : "Code *"}</label>
              <input
                type="text"
                required
                value={prodCatCode}
                onChange={(e) => setProdCatCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "اسم التصنيف (عربي) *" : "Name (AR) *"}</label>
              <input
                type="text"
                required
                placeholder={isAr ? "مثال: عسل طبيعي / بقوليات / زيوت" : "e.g. Honey"}
                value={prodCatNameAr}
                onChange={(e) => setProdCatNameAr(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "اسم التصنيف (إنجليزي)" : "Name (EN)"}</label>
              <input
                type="text"
                value={prodCatNameEn}
                onChange={(e) => setProdCatNameEn(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                disabled={isProdCatSubmitting}
                onClick={() => setIsProdCatModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl cursor-pointer disabled:opacity-50"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={isProdCatSubmitting}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {isProdCatSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isAr ? "جاري الحفظ..." : "Saving..."}</span>
                  </>
                ) : (
                  <span>{isAr ? "حفظ التصنيف" : "Save Category"}</span>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 3: Cost Center Master Account Modal (Item 5 Part B) */}
      {isCcAccModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => !isCcAccSubmitting && setIsCcAccModalOpen(false)}
          title={editingCcAcc ? (isAr ? "تعديل حساب مركز تكلفة رئيسي" : "Edit Master Center") : (isAr ? "إضافة حساب مركز تكلفة رئيسي جديد" : "New Master Center")}
          maxWidth="md"
        >
          <form onSubmit={handleSaveCcAcc} className="space-y-4 text-xs">
            {ccAccError && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{ccAccError}</span>
              </div>
            )}

            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "كود الحساب *" : "Code *"}</label>
              <input
                type="text"
                required
                value={ccAccCode}
                onChange={(e) => setCcAccCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "طبيعة مركز التكلفة *" : "Nature Type *"}</label>
              <select
                value={ccAccType}
                onChange={(e) => setCcAccType(e.target.value as CostCenterType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-bold"
              >
                <option value="expense">{isAr ? "مصروف (Expense)" : "Expense"}</option>
                <option value="revenue">{isAr ? "إيراد (Revenue)" : "Revenue"}</option>
                <option value="asset">{isAr ? "أصل (Asset)" : "Asset"}</option>
                <option value="liability">{isAr ? "التزامات (Liability)" : "Liability"}</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "اسم الحساب (عربي) *" : "Name (AR) *"}</label>
              <input
                type="text"
                required
                placeholder={isAr ? "مثال: مصاريف التسويق والترويج" : "e.g. Marketing"}
                value={ccAccNameAr}
                onChange={(e) => setCcAccNameAr(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "اسم الحساب (إنجليزي)" : "Name (EN)"}</label>
              <input
                type="text"
                value={ccAccNameEn}
                onChange={(e) => setCcAccNameEn(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                disabled={isCcAccSubmitting}
                onClick={() => setIsCcAccModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl cursor-pointer disabled:opacity-50"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={isCcAccSubmitting}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {isCcAccSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isAr ? "جاري الحفظ..." : "Saving..."}</span>
                  </>
                ) : (
                  <span>{isAr ? "حفظ الحساب" : "Save Account"}</span>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
