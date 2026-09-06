"use client";

import React, { useState, useMemo } from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import TableSkeleton from "@/components/ui/TableSkeleton";
import { Account, AccountType } from "@/types/erp";
import {
  BookOpen, Plus, Search, Loader2, AlertCircle, Edit2, Trash2,
  FolderTree, ChevronRight, ChevronDown, Layers, ShieldCheck,
  CheckCircle2, ArrowRightLeft, Sparkles
} from "lucide-react";

export default function ChartOfAccountsPage() {
  const { accounts, addAccount, updateAccount, deleteAccount, organization, currentUser, locale, hasPermission, showToast, isLoadingData } = useERP();
  const isAr = locale === "ar";
  const canManage = hasPermission(["super_admin", "tenant_admin", "accountant"]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [code, setCode] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [type, setType] = useState<AccountType>("assets");
  const [parentId, setParentId] = useState<string>("");
  const [nature, setNature] = useState<"debit" | "credit">("debit");
  const [isActive, setIsActive] = useState(true);

  // Expanded Tree State
  const [expandedNodes, setExpandedNodes] = useState<{ [id: string]: boolean }>({});

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenAddModal = (presetParentId?: string) => {
    setFormError(null);
    if (presetParentId) {
      const parent = accounts.find(a => a.id === presetParentId);
      if (parent) {
        setParentId(parent.id);
        setType(parent.type);
        setNature(parent.nature);
        // Suggest child code
        const siblings = accounts.filter(a => a.parentId === parent.id);
        let nextSuffix = siblings.length + 1;
        let candidateCode = `${parent.code}${String(nextSuffix).padStart(parent.level === 3 ? 3 : 2, "0")}`;
        if (accounts.some(a => a.code === candidateCode)) {
          candidateCode = `${parent.code}${String(nextSuffix + 10).padStart(parent.level === 3 ? 3 : 2, "0")}`;
        }
        setCode(candidateCode);
      }
    } else {
      setParentId("");
      setType("assets");
      setNature("debit");
      setCode("");
    }
    setNameAr("");
    setNameEn("");
    setIsActive(true);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (acc: Account) => {
    setFormError(null);
    setEditingAccount(acc);
    setCode(acc.code);
    setNameAr(acc.nameAr);
    setNameEn(acc.nameEn);
    setType(acc.type);
    setParentId(acc.parentId || "");
    setNature(acc.nature);
    setIsActive(acc.isActive);
    setIsEditModalOpen(true);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!code.trim() || !nameAr.trim()) {
      setFormError(isAr ? "يرجى كتابة رقم واسم الحساب" : "Please enter account code and name");
      return;
    }

    if (accounts.some(a => a.code === code.trim())) {
      setFormError(isAr ? `كود الحساب (${code.trim()}) مستخدم مسبقاً، يرجى كتابة كود فريد.` : "Account code already exists. Please choose a unique code.");
      return;
    }

    const parent = parentId ? accounts.find(a => a.id === parentId) : null;
    const computedLevel = parent ? parent.level + 1 : 1;

    setIsSubmitting(true);
    try {
      await addAccount({
        organizationId: organization.id,
        code: code.trim(),
        nameAr: nameAr.trim(),
        nameEn: nameEn.trim() || nameAr.trim(),
        type: parent ? parent.type : type,
        parentId: parentId || undefined,
        level: computedLevel,
        nature: parent ? parent.nature : nature,
        balance: 0,
        currency: organization.currency,
        isActive: true,
        isSystem: false,
      });

      setIsAddModalOpen(false);
      setCode("");
      setNameAr("");
      setNameEn("");
      showToast(isAr ? "تم إنشاء الحساب بنجاح" : "Account created successfully", "success");
    } catch (err: any) {
      console.error("Failed to add account:", err);
      const errMsg = err?.message || (isAr ? "فشل حفظ الحساب" : "Failed to add account");
      setFormError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    setFormError(null);

    if (!code.trim() || !nameAr.trim()) {
      setFormError(isAr ? "يرجى كتابة رقم واسم الحساب" : "Please enter account code and name");
      return;
    }

    if (accounts.some(a => a.code === code.trim() && a.id !== editingAccount.id)) {
      setFormError(isAr ? `كود الحساب (${code.trim()}) مسجل لحساب آخر.` : "Account code already exists for another account.");
      return;
    }

    const parent = parentId ? accounts.find(a => a.id === parentId) : null;
    const computedLevel = parent ? parent.level + 1 : 1;

    setIsSubmitting(true);
    try {
      await updateAccount(editingAccount.id, {
        code: code.trim(),
        nameAr: nameAr.trim(),
        nameEn: nameEn.trim() || nameAr.trim(),
        type: parent ? parent.type : type,
        parentId: parentId || undefined,
        level: computedLevel,
        nature,
        isActive,
      });

      setIsEditModalOpen(false);
      setEditingAccount(null);
      showToast(isAr ? "تم تحديث الحساب بنجاح" : "Account updated successfully", "success");
    } catch (err: any) {
      console.error("Failed to update account:", err);
      const errMsg = err?.message || (isAr ? "فشل تعديل الحساب" : "Failed to update account");
      setFormError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async (acc: Account) => {
    const hasChildren = accounts.some(a => a.parentId === acc.id);
    if (hasChildren) {
      alert(isAr ? "لا يمكن حذف هذا الحساب لوجود حسابات فرعية تابعة له. يرجى نقلها أو حذفها أولاً." : "Cannot delete account with child subaccounts. Please move or delete subaccounts first.");
      return;
    }

    const confirmMsg = isAr
      ? `هل أنت متأكد من حذف الحساب (${acc.code} - ${acc.nameAr})؟`
      : `Are you sure you want to delete account (${acc.code} - ${acc.nameEn})?`;

    if (!confirm(confirmMsg)) return;

    try {
      await deleteAccount(acc.id);
      showToast(isAr ? "تم حذف الحساب بنجاح" : "Account deleted successfully", "success");
    } catch (err: any) {
      console.error("Failed to delete account:", err);
      showToast(err?.message || (isAr ? "فشل حذف الحساب" : "Failed to delete account"), "error");
    }
  };

  const filteredAccounts = useMemo(() => {
    return accounts
      .filter(acc => {
        if (selectedType !== "all" && acc.type !== selectedType) return false;
        if (selectedLevel !== "all" && acc.level !== Number(selectedLevel)) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          return (
            acc.nameAr.toLowerCase().includes(q) ||
            acc.nameEn.toLowerCase().includes(q) ||
            acc.code.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  }, [accounts, selectedType, selectedLevel, searchQuery]);

  const stats = useMemo(() => {
    const total = accounts.length;
    const lvl1 = accounts.filter(a => a.level === 1).length;
    const lvl4 = accounts.filter(a => a.level === 4).length;
    const active = accounts.filter(a => a.isActive).length;
    return { total, lvl1, lvl4, active };
  }, [accounts]);

  const getAccountTypeBadge = (t: AccountType) => {
    switch (t) {
      case "assets": return <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-[10px] font-bold border border-emerald-500/20">{isAr ? "1- أصول (Assets)" : "Assets"}</span>;
      case "liabilities": return <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 rounded-lg text-[10px] font-bold border border-rose-500/20">{isAr ? "2- خصوم (Liabilities)" : "Liabilities"}</span>;
      case "equity": return <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded-lg text-[10px] font-bold border border-purple-500/20">{isAr ? "3- ملكية (Equity)" : "Equity"}</span>;
      case "revenue": return <span className="px-2 py-0.5 bg-sky-500/10 text-sky-400 rounded-lg text-[10px] font-bold border border-sky-500/20">{isAr ? "4- إيرادات (Revenue)" : "Revenue"}</span>;
      case "expense": return <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-lg text-[10px] font-bold border border-amber-500/20">{isAr ? "5- مصروفات (Expenses)" : "Expenses"}</span>;
    }
  };

  const getLevelBadge = (lvl: number) => {
    switch (lvl) {
      case 1: return <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 font-mono font-bold rounded text-[10px]">L1 رئيسي</span>;
      case 2: return <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-300 font-mono font-bold rounded text-[10px]">L2 عام</span>;
      case 3: return <span className="px-1.5 py-0.5 bg-teal-500/20 text-teal-300 font-mono font-bold rounded text-[10px]">L3 فرعي</span>;
      case 4: default: return <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 font-mono font-bold rounded text-[10px]">L4 تحليلي</span>;
    }
  };

  if (isLoadingData) {
    return <TableSkeleton rows={8} columns={6} summaryCards={4} isAr={isAr} />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-emerald-400" />
            <span>{isAr ? "دليل شجرة الحسابات العامة (Chart of Accounts)" : "Standard Chart of Accounts"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? "دليل الحسابات الشجري الهرمي المعتمد وفق المعيار المحاسبي الدولي Report #6 بـ 4 مستويات وتحديث فوري"
              : "Standard 4-tier Chart of Accounts hierarchy compliant with international accounting principles"}
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => handleOpenAddModal()}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/60 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? "إضافة حساب مالي جديد" : "Add New Account"}</span>
          </button>
        )}
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-400 block text-[11px] font-medium">{isAr ? "إجمالي الحسابات:" : "Total Accounts:"}</span>
            <span className="text-xl font-black font-mono text-white mt-1 block">{stats.total}</span>
          </div>
          <FolderTree className="w-8 h-8 text-emerald-400/30" />
        </div>
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-400 block text-[11px] font-medium">{isAr ? "التصنيفات الرئيسية (L1):" : "Main Classes (L1):"}</span>
            <span className="text-xl font-black font-mono text-indigo-400 mt-1 block">{stats.lvl1}</span>
          </div>
          <Layers className="w-8 h-8 text-indigo-400/30" />
        </div>
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-400 block text-[11px] font-medium">{isAr ? "الحسابات التحليلية (L4):" : "Posting Accounts (L4):"}</span>
            <span className="text-xl font-black font-mono text-teal-400 mt-1 block">{stats.lvl4}</span>
          </div>
          <Sparkles className="w-8 h-8 text-teal-400/30" />
        </div>
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-400 block text-[11px] font-medium">{isAr ? "الحسابات النشطة:" : "Active Accounts:"}</span>
            <span className="text-xl font-black font-mono text-emerald-400 mt-1 block">{stats.active}</span>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-400/30" />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
          <input
            type="text"
            placeholder={isAr ? "بحث برقم أو اسم الحساب..." : "Search account code or name..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto text-xs font-semibold w-full md:w-auto">
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
              className={"px-3 py-1.5 rounded-xl transition-all cursor-pointer " + (
                selectedType === btn.id ? "bg-emerald-600 text-white shadow-md font-bold" : "bg-slate-950 text-slate-400 hover:text-white"
              )}
            >
              {isAr ? btn.labelAr : btn.labelEn}
            </button>
          ))}

          <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">{isAr ? "كل المستويات" : "All Levels"}</option>
            <option value="1">{isAr ? "المستوى 1 (رئيسي)" : "Level 1 (Class)"}</option>
            <option value="2">{isAr ? "المستوى 2 (مجموعة)" : "Level 2 (Group)"}</option>
            <option value="3">{isAr ? "المستوى 3 (حساب عام)" : "Level 3 (General)"}</option>
            <option value="4">{isAr ? "المستوى 4 (حساب تحليلي)" : "Level 4 (Posting)"}</option>
          </select>
        </div>
      </div>

      {/* Main Accounts Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                <th className="p-3.5 rounded-r-lg font-mono w-32">{isAr ? "كود الحساب" : "Account Code"}</th>
                <th className="p-3.5">{isAr ? "اسم الحساب الدفتري" : "Account Name"}</th>
                <th className="p-3.5">{isAr ? "التصنيف الرئيسي" : "Type"}</th>
                <th className="p-3.5 text-center">{isAr ? "طبيعة الحساب" : "Nature"}</th>
                <th className="p-3.5 text-center font-mono">{isAr ? "المستوى" : "Level"}</th>
                <th className="p-3.5 text-center font-mono">{isAr ? "الرصيد الدفتري" : "Balance"}</th>
                <th className="p-3.5 rounded-l-lg text-center">{isAr ? "الإجراءات والعمليات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 font-bold">
                    {isAr ? "لا توجد حسابات مطابقة للبحث أو التصفية" : "No accounts match your filter"}
                  </td>
                </tr>
              ) : (
                filteredAccounts.map(acc => {
                  const hasChildren = accounts.some(child => child.parentId === acc.id);
                  const isIndented = acc.level > 1;

                  return (
                    <tr
                      key={acc.id}
                      className={"hover:bg-slate-800/40 transition-colors " + (
                        acc.level === 1 ? "bg-slate-950/40 font-bold text-white" :
                        acc.level === 2 ? "bg-slate-950/20 text-slate-200" :
                        "text-slate-300"
                      )}
                    >
                      <td className="p-3.5 font-mono font-bold text-white whitespace-nowrap">
                        <span className={"inline-block px-2 py-0.5 rounded-md border " + (
                          acc.level === 1 ? "bg-indigo-950/60 border-indigo-500/40 text-indigo-300" :
                          acc.level === 2 ? "bg-blue-950/60 border-blue-500/40 text-blue-300" :
                          acc.level === 3 ? "bg-teal-950/60 border-teal-500/40 text-teal-300" :
                          "bg-slate-950 border-slate-800 text-slate-300"
                        )}>
                          {acc.code}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div
                          className="flex items-center gap-1.5"
                          style={{
                            paddingRight: isAr ? ((acc.level - 1) * 22) + "px" : undefined,
                            paddingLeft: !isAr ? ((acc.level - 1) * 22) + "px" : undefined,
                          }}
                        >
                          {isIndented && (
                            <span className="text-slate-600 font-mono text-sm select-none">
                              {acc.level === 4 ? "↳" : "├─"}
                            </span>
                          )}
                          <div className="flex flex-col">
                            <span className={"font-bold " + (acc.level === 1 ? "text-white text-[13px]" : acc.level === 2 ? "text-slate-100" : "text-slate-300")}>
                              {acc.nameAr}
                            </span>
                            {acc.nameEn && acc.nameEn !== acc.nameAr && (
                              <span className="text-[10px] text-slate-500 font-sans">{acc.nameEn}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">{getAccountTypeBadge(acc.type)}</td>
                      <td className="p-3.5 text-center font-bold whitespace-nowrap">
                        <span className={acc.nature === "debit" ? "text-emerald-400 font-mono" : "text-sky-400 font-mono"}>
                          {acc.nature === "debit" ? (isAr ? "مدين (Dr)" : "Debit") : (isAr ? "دائن (Cr)" : "Credit")}
                        </span>
                      </td>
                      <td className="p-3.5 text-center whitespace-nowrap">{getLevelBadge(acc.level)}</td>
                      <td className="p-3.5 text-center font-mono font-black text-white whitespace-nowrap">
                        {formatCurrency(acc.balance, organization.currency, locale)}
                      </td>
                      <td className="p-3.5 text-center whitespace-nowrap">
                        {canManage && (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenAddModal(acc.id)}
                              title={isAr ? "إضافة حساب فرعي تحت هذا الحساب" : "Add subaccount"}
                              className="p-1.5 text-emerald-400 hover:text-white hover:bg-emerald-600 rounded-lg transition-colors cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(acc)}
                              title={isAr ? "تعديل الحساب ونقله بالدليل" : "Edit or move account"}
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {!acc.isSystem && (
                              <button
                                onClick={() => handleDeleteAccount(acc)}
                                title={isAr ? "حذف الحساب" : "Delete account"}
                                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Account Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => !isSubmitting && setIsAddModalOpen(false)}
        title={isAr ? "إضافة حساب مالي جديد إلى شجرة الحسابات" : "Add New Account to Chart of Accounts"}
        maxWidth="lg"
      >
        <form onSubmit={handleCreateAccount} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-400 font-semibold mb-1">
              {isAr ? "الحساب الرئيسي الأب (Parent Account)" : "Parent Account"}
            </label>
            <select
              value={parentId}
              onChange={(e) => {
                const pId = e.target.value;
                setParentId(pId);
                if (pId) {
                  const p = accounts.find(a => a.id === pId);
                  if (p) {
                    setType(p.type);
                    setNature(p.nature);
                    // auto generate candidate code
                    const siblings = accounts.filter(a => a.parentId === p.id);
                    const nextNum = siblings.length + 1;
                    const newCandidate = `${p.code}${String(nextNum).padStart(p.level === 3 ? 3 : 2, "0")}`;
                    if (!code || code.startsWith(p.code.slice(0, 1))) {
                      setCode(newCandidate);
                    }
                  }
                }
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-emerald-500"
            >
              <option value="">{isAr ? "--- حساب رئيسي من المستوى الأول (Root Class) ---" : "Top Level (Root Class)"}</option>
              {accounts.filter(a => a.level < 4).map(a => (
                <option key={a.id} value={a.id}>
                  {a.code} - {a.nameAr} ({getLevelBadge(a.level).props.children})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "كود الحساب الفريد *" : "Unique Code *"}</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="1101003..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "التصنيف الرئيسي *" : "Account Type *"}</label>
              <select
                disabled={Boolean(parentId)}
                value={type}
                onChange={(e) => setType(e.target.value as AccountType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white disabled:opacity-60 focus:outline-none focus:border-emerald-500"
              >
                <option value="assets">{isAr ? "1- الأصول (Assets)" : "Assets"}</option>
                <option value="liabilities">{isAr ? "2- الخصوم (Liabilities)" : "Liabilities"}</option>
                <option value="equity">{isAr ? "3- حقوق الملكية (Equity)" : "Equity"}</option>
                <option value="revenue">{isAr ? "4- الإيرادات (Revenue)" : "Revenue"}</option>
                <option value="expense">{isAr ? "5- المصروفات (Expenses)" : "Expenses"}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "اسم الحساب (عربي) *" : "Name (Arabic) *"}</label>
              <input
                type="text"
                required
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder={isAr ? "مثال: حساب بنك مصر الجاري..." : "e.g. Bank Account..."}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "اسم الحساب (إنجليزي)" : "Name (English)"}</label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="e.g. Current Bank Account..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">{isAr ? "طبيعة الحساب المحاسبية *" : "Accounting Nature *"}</label>
            <select
              disabled={Boolean(parentId)}
              value={nature}
              onChange={(e) => setNature(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white disabled:opacity-60 focus:outline-none focus:border-emerald-500"
            >
              <option value="debit">{isAr ? "مدين (Debit) - للأصول والمصروفات" : "Debit - Assets & Expenses"}</option>
              <option value="credit">{isAr ? "دائن (Credit) - للخصوم وحقوق الملكية والإيرادات" : "Credit - Liabilities, Equity & Revenue"}</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isAr ? "جاري الحفظ..." : "Saving..."}</span>
                </>
              ) : (
                <span>{isAr ? "حفظ الحساب المالي" : "Save Account"}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit & Move Account Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => !isSubmitting && setIsEditModalOpen(false)}
        title={isAr ? `تعديل ونقل الحساب (${editingAccount?.code || ""})` : "Edit & Move Account"}
        maxWidth="lg"
      >
        <form onSubmit={handleUpdateAccount} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-400 font-semibold mb-1">
              <span className="flex items-center gap-1.5">
                <ArrowRightLeft className="w-3.5 h-3.5 text-teal-400" />
                <span>{isAr ? "نقل الحساب تحت حساب رئيسي جديد (Move within Hierarchy)" : "Parent Account (Move)"}</span>
              </span>
            </label>
            <select
              value={parentId}
              onChange={(e) => {
                const pId = e.target.value;
                setParentId(pId);
                if (pId) {
                  const p = accounts.find(a => a.id === pId);
                  if (p) setType(p.type);
                }
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-emerald-500"
            >
              <option value="">{isAr ? "--- حساب رئيسي أعلى (Top Level) ---" : "Top Level"}</option>
              {accounts
                .filter(a => a.id !== editingAccount?.id && a.parentId !== editingAccount?.id && a.level < 4)
                .map(a => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.nameAr}
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "كود الحساب *" : "Code *"}</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "اسم الحساب (عربي) *" : "Name (AR) *"}</label>
              <input
                type="text"
                required
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "اسم الحساب (إنجليزي)" : "Name (EN)"}</label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "طبيعة الحساب" : "Nature"}</label>
              <select
                value={nature}
                onChange={(e) => setNature(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="debit">{isAr ? "مدين (Debit)" : "Debit"}</option>
                <option value="credit">{isAr ? "دائن (Credit)" : "Credit"}</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "حالة الحساب" : "Status"}</label>
              <select
                value={isActive ? "active" : "inactive"}
                onChange={(e) => setIsActive(e.target.value === "active")}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="active">{isAr ? "نشط ومفعل" : "Active"}</option>
                <option value="inactive">{isAr ? "معطل ومجمد" : "Inactive"}</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isAr ? "جاري الحفظ..." : "Saving..."}</span>
                </>
              ) : (
                <span>{isAr ? "حفظ التعديلات" : "Save Changes"}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
