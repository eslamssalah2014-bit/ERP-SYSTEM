"use client";

import React, { useState } from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import { Account, AccountType } from "@/types/erp";
import { BookOpen, Plus, Search } from "lucide-react";

export default function ChartOfAccountsPage() {
  const { accounts, addAccount, organization, locale } = useERP();
  const isAr = locale === "ar";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Add Account Form
  const [code, setCode] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [type, setType] = useState<AccountType>("assets");
  const [parentId, setParentId] = useState<string>("");
  const [nature, setNature] = useState<"debit" | "credit">("debit");

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !nameAr) return;

    addAccount({
      organizationId: organization.id,
      code,
      nameAr,
      nameEn: nameEn || nameAr,
      type,
      parentId: parentId || undefined,
      level: parentId ? 3 : 1,
      nature,
      balance: 0,
      currency: organization.currency,
      isActive: true,
      isSystem: false,
    });

    setIsAddModalOpen(false);
    setCode("");
    setNameAr("");
    setNameEn("");
  };

  const filteredAccounts = accounts.filter(acc => {
    if (selectedType !== "all" && acc.type !== selectedType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return acc.nameAr.includes(q) || acc.nameEn.toLowerCase().includes(q) || acc.code.includes(q);
    }
    return true;
  });

  const getAccountTypeBadge = (t: AccountType) => {
    switch (t) {
      case "assets": return <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-[10px] font-bold border border-emerald-500/20">{isAr ? "أصول" : "Assets"}</span>;
      case "liabilities": return <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 rounded text-[10px] font-bold border border-rose-500/20">{isAr ? "خصوم والتزامات" : "Liabilities"}</span>;
      case "equity": return <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded text-[10px] font-bold border border-purple-500/20">{isAr ? "حقوق ملكية" : "Equity"}</span>;
      case "revenue": return <span className="px-2 py-0.5 bg-sky-500/10 text-sky-400 rounded text-[10px] font-bold border border-sky-500/20">{isAr ? "إيرادات" : "Revenue"}</span>;
      case "expense": return <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded text-[10px] font-bold border border-amber-500/20">{isAr ? "مصروفات" : "Expense"}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-emerald-400" />
            <span>{isAr ? "دليل شجرة الحسابات العامة (Chart of Accounts)" : "Chart of Accounts"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAr ? "دليل الحسابات الشجري الهرمي خماسي المستويات المعتمد بالمعايير المحاسبية الدولية" : "5-tier standard Chart of Accounts structure"}
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/60 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{isAr ? "إضافة حساب فرعي جديد" : "Add Account"}</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
          <input
            type="text"
            placeholder={isAr ? "بحث بكود أو اسم الحساب..." : "Search code or account..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto text-xs font-semibold">
          {[
            { id: "all", labelAr: "الكل", labelEn: "All" },
            { id: "assets", labelAr: "1- الأصول", labelEn: "Assets" },
            { id: "liabilities", labelAr: "2- الخصوم", labelEn: "Liabilities" },
            { id: "equity", labelAr: "3- الملكية", labelEn: "Equity" },
            { id: "revenue", labelAr: "4- الإيرادات", labelEn: "Revenue" },
            { id: "expense", labelAr: "5- المصروفات", labelEn: "Expenses" },
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => setSelectedType(btn.id)}
              className={"px-3 py-1.5 rounded-xl transition-all " + (
                selectedType === btn.id ? "bg-emerald-600 text-white shadow-md" : "bg-slate-950 text-slate-400 hover:text-white"
              )}
            >
              {isAr ? btn.labelAr : btn.labelEn}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                <th className="p-3.5 rounded-r-lg font-mono">{isAr ? "كود الحساب" : "Account Code"}</th>
                <th className="p-3.5">{isAr ? "اسم الحساب الدفتري" : "Account Name"}</th>
                <th className="p-3.5">{isAr ? "التصنيف الرئيسي" : "Type"}</th>
                <th className="p-3.5 text-center">{isAr ? "طبيعة الحساب" : "Nature"}</th>
                <th className="p-3.5 text-center font-mono">{isAr ? "المستوى" : "Level"}</th>
                <th className="p-3.5 rounded-l-lg text-center font-mono">{isAr ? "الرصيد الدفتري" : "Balance"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredAccounts.map(acc => (
                <tr key={acc.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3.5 font-mono font-bold text-white">{acc.code}</td>
                  <td className="p-3.5">
                    <div
                      className="font-bold text-slate-200"
                      style={{ paddingRight: isAr ? ((acc.level - 1) * 20) + "px" : undefined, paddingLeft: !isAr ? ((acc.level - 1) * 20) + "px" : undefined }}
                    >
                      {acc.level > 1 && <span className="text-slate-500 font-normal ml-1">↳</span>}
                      <span>{isAr ? acc.nameAr : acc.nameEn}</span>
                    </div>
                  </td>
                  <td className="p-3.5">{getAccountTypeBadge(acc.type)}</td>
                  <td className="p-3.5 text-center font-bold">
                    <span className={acc.nature === "debit" ? "text-emerald-400" : "text-sky-400"}>
                      {acc.nature === "debit" ? (isAr ? "مدين" : "Debit") : (isAr ? "دائن" : "Credit")}
                    </span>
                  </td>
                  <td className="p-3.5 text-center font-mono text-slate-400">L{acc.level}</td>
                  <td className="p-3.5 text-center font-mono font-black text-white">
                    {formatCurrency(acc.balance, organization.currency, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={isAr ? "إضافة حساب فرعي بدليل الحسابات" : "Add Account"}
      >
        <form onSubmit={handleCreateAccount} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "كود الحساب *" : "Code *"}</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="1115..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "التصنيف الرئيسي *" : "Account Type *"}</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AccountType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="assets">{isAr ? "1- الأصول (Assets)" : "Assets"}</option>
                <option value="liabilities">{isAr ? "2- الخصوم (Liabilities)" : "Liabilities"}</option>
                <option value="equity">{isAr ? "3- حقوق الملكية (Equity)" : "Equity"}</option>
                <option value="revenue">{isAr ? "4- الإيرادات (Revenue)" : "Revenue"}</option>
                <option value="expense">{isAr ? "5- المصروفات (Expenses)" : "Expenses"}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">{isAr ? "اسم الحساب (عربي) *" : "Account Name (AR) *"}</label>
            <input
              type="text"
              required
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "الحساب الأب (Parent)" : "Parent Account"}</label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              >
                <option value="">{isAr ? "--- حساب رئيسي (مستوى أول) ---" : "Top Level"}</option>
                {accounts.filter(a => a.level < 3).map(a => (
                  <option key={a.id} value={a.id}>{a.code} - {a.nameAr}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "طبيعة الحساب" : "Nature"}</label>
              <select
                value={nature}
                onChange={(e) => setNature(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              >
                <option value="debit">{isAr ? "مدين (Debit)" : "Debit"}</option>
                <option value="credit">{isAr ? "دائن (Credit)" : "Credit"}</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition-colors"
            >
              {isAr ? "حفظ الحساب" : "Save Account"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
