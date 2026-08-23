"use client";

import React, { useState } from "react";
import { useERP } from "@/context/erp-context";
import { Currency } from "@/types/erp";
import { Settings, Building2, Globe, Shield, Save, Check } from "lucide-react";

export default function SettingsPage() {
  const { organization, setOrganization, branches, locale } = useERP();
  const isAr = locale === "ar";

  const [nameAr, setNameAr] = useState(organization.nameAr);
  const [nameEn, setNameEn] = useState(organization.nameEn);
  const [taxNumber, setTaxNumber] = useState(organization.taxNumber);
  const [currency, setCurrency] = useState<Currency>(organization.currency);
  const [defaultVatRate, setDefaultVatRate] = useState(organization.defaultVatRate);
  const [address, setAddress] = useState(organization.address || "");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setOrganization({
      ...organization,
      nameAr,
      nameEn,
      taxNumber,
      currency,
      defaultVatRate,
      address,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm">
        <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-emerald-400" />
          <span>{isAr ? "إعدادات المنظومة والمنشأة (SaaS Tenant Settings)" : "Settings"}</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          {isAr ? "إدارة بيانات الشركة، الرقم الضريبي، العملة الافتراضية، ونسبة ضريبة القيمة المضافة" : "Organization profile, VAT configuration, and tenant preferences"}
        </p>
      </div>

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
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{isAr ? "حفظ الإعدادات" : "Save Changes"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
