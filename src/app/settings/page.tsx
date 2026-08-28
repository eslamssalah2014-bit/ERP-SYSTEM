"use client";

import React, { useState } from "react";
import { useERP } from "@/context/erp-context";
import { Currency, CustomerCategory } from "@/types/erp";
import Modal from "@/components/ui/Modal";
import { Settings, Building2, Globe, Shield, Save, Check, Users, Plus, Edit, Trash2, Tag, Loader2, AlertCircle } from "lucide-react";

export default function SettingsPage() {
  const {
    organization, updateOrganization, customerCategories,
    addCustomerCategory, updateCustomerCategory, deleteCustomerCategory,
    locale, showToast
  } = useERP();
  const isAr = locale === "ar";

  const [activeTab, setActiveTab] = useState<"general" | "categories">("general");

  // General Settings Form
  const [nameAr, setNameAr] = useState(organization.nameAr);
  const [nameEn, setNameEn] = useState(organization.nameEn);
  const [taxNumber, setTaxNumber] = useState(organization.taxNumber);
  const [currency, setCurrency] = useState<Currency>(organization.currency);
  const [defaultVatRate, setDefaultVatRate] = useState(organization.defaultVatRate);
  const [address, setAddress] = useState(organization.address || "");
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CustomerCategory | null>(null);
  const [catNameAr, setCatNameAr] = useState("");
  const [catNameEn, setCatNameEn] = useState("");
  const [catCode, setCatCode] = useState("");
  const [catDescription, setCatDescription] = useState("");
  const [catError, setCatError] = useState<string | null>(null);
  const [isCatSubmitting, setIsCatSubmitting] = useState(false);

  // Sync state when organization updates
  React.useEffect(() => {
    setNameAr(organization.nameAr);
    setNameEn(organization.nameEn);
    setTaxNumber(organization.taxNumber);
    setCurrency(organization.currency);
    setDefaultVatRate(organization.defaultVatRate);
    setAddress(organization.address || "");
  }, [organization]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateOrganization({
        nameAr,
        nameEn,
        taxNumber,
        currency,
        defaultVatRate,
        address,
      });
      setSaved(true);
      showToast(isAr ? "تم حفظ إعدادات المنشأة بنجاح" : "Settings saved", "success");
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      console.error("Failed to save settings:", err);
      showToast(err?.message || "Failed to save settings", "error");
    } finally {
      setIsSaving(false);
    }
  };

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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm">
        <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-emerald-400" />
          <span>{isAr ? "إعدادات المنظومة والمنشأة (SaaS Tenant Settings)" : "Settings"}</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          {isAr ? "إدارة بيانات الشركة، الرقم الضريبي، العملة الافتراضية، تصنيفات العملاء، ونسبة الضريبة" : "Organization profile, VAT configuration, and tenant preferences"}
        </p>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-800">
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
            onClick={() => setActiveTab("categories")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "categories"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/50"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>{isAr ? "تصنيفات العملاء" : "Customer Categories"} ({customerCategories.length})</span>
          </button>
        </div>
      </div>

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

          <div className="grid grid-cols-3 gap-4">
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
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "نسبة ضريبة القيمة المضافة الافتراضية *" : "Default VAT Rate % *"}</label>
              <input
                type="number"
                min="0"
                max="100"
                required
                value={defaultVatRate}
                onChange={(e) => setDefaultVatRate(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">{isAr ? "العنوان والمقر الرئيسي" : "Address"}</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
            />
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

      {activeTab === "categories" && (
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

      {/* Customer Category Modal */}
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
    </div>
  );
}
