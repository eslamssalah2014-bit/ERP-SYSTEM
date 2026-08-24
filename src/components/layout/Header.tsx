"use client";

import React, { useState } from "react";
import { useERP } from "@/context/erp-context";
import {
  Search, Bell, Globe, Sun, Moon, Building2, User, Check,
  ChevronDown, AlertTriangle, Info, CheckCircle2, RotateCcw
} from "lucide-react";

export default function Header({ onOpenSearch }: { onOpenSearch?: () => void }) {
  const {
    organization, branches, activeBranchId, setActiveBranchId,
    currentUser, users, setCurrentUser, locale, setLocale,
    theme, setTheme, notifications, markNotificationRead, resetToDemoData,
    isDbConnected, isLoadingData
  } = useERP();

  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const isAr = locale === "ar";
  const unreadNotifs = notifications.filter(n => !n.read);
  const activeBranch = branches.find(b => b.id === activeBranchId) || branches[0];

  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Branch Selector & Search Trigger */}
      <div className="flex items-center gap-4">
        {/* Branch Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowBranchMenu(!showBranchMenu)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-all"
          >
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span>{isAr ? activeBranch?.nameAr : activeBranch?.nameEn}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showBranchMenu && (
            <div className="absolute top-full mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-1.5 text-xs text-slate-400 font-medium">
                {isAr ? "اختر الفرع الحالي" : "Select Active Branch"}
              </div>
              {branches.map(b => (
                <button
                  key={b.id}
                  onClick={() => {
                    setActiveBranchId(b.id);
                    setShowBranchMenu(false);
                  }}
                  className={"w-full text-right px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between " + (
                    b.id === activeBranchId
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "text-slate-300 hover:bg-slate-700/50"
                  )}
                >
                  <span>{isAr ? b.nameAr : b.nameEn}</span>
                  {b.id === activeBranchId && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Global Search Bar (Ctrl+K) */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-3 px-3 py-1.5 bg-slate-950/60 hover:bg-slate-950 border border-slate-800 text-slate-400 text-xs rounded-xl w-64 justify-between transition-all"
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-500" />
            <span>{isAr ? "بحث عام أو أمر سريعة..." : "Search anything..."}</span>
          </div>
          <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded text-[10px] font-mono border border-slate-700">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Database Connection Status Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl text-[11px]">
          <span className={"w-2 h-2 rounded-full " + (isDbConnected ? "bg-emerald-400" : isLoadingData ? "bg-amber-400 animate-pulse" : "bg-slate-500")} />
          <span className={isDbConnected ? "text-emerald-400 font-bold" : "text-slate-400"}>
            {isLoadingData ? (isAr ? "مزامنة..." : "Syncing...") : isDbConnected ? (isAr ? "قاعدة البيانات متصلة" : "Cloud DB Live") : (isAr ? "غير متصل" : "Offline")}
          </span>
        </div>

        {/* Language Switch */}
        <button
          onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-slate-300 hover:bg-slate-800 rounded-lg text-xs font-semibold border border-slate-700/50 transition-colors"
        >
          <Globe className="w-4 h-4 text-emerald-400" />
          <span>{locale === "ar" ? "English" : "العربية"}</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
        >
          {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
        </button>

        {/* Notifications Popup */}
        <div className="relative">
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg relative transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifs.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute left-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
                <span className="text-xs font-bold text-white">
                  {isAr ? "التنبيهات والإشعارات" : "Notifications"}
                </span>
                <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full font-bold">
                  {unreadNotifs.length} {isAr ? "جديد" : "new"}
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-700/40">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    {isAr ? "لا توجد تنبيهات" : "No notifications"}
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      className={"p-3 hover:bg-slate-700/50 cursor-pointer flex gap-3 " + (
                        !n.read ? "bg-slate-700/20" : ""
                      )}
                    >
                      {n.type === "warning" && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
                      {n.type === "info" && <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />}
                      {n.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-slate-200">
                          {isAr ? n.titleAr : n.titleEn}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                          {isAr ? n.messageAr : n.messageEn}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative border-r border-slate-800 pr-3 mr-1">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center text-xs font-bold text-white border border-slate-600">
              {currentUser.name.charAt(0)}
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-200 leading-tight">
                {currentUser.name}
              </div>
              <div className="text-[10px] text-emerald-400 font-medium capitalize">
                {currentUser.role.replace("_", " ")}
              </div>
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute left-0 mt-2 w-60 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-1 z-50 animate-in fade-in">
              <div className="px-3 py-2 border-b border-slate-700 text-xs">
                <div className="font-bold text-white">{currentUser.name}</div>
                <div className="text-[11px] text-slate-400">{currentUser.email}</div>
              </div>
              <div className="py-1">
                <div className="px-3 py-1 text-[10px] text-slate-400 font-semibold uppercase">
                  {isAr ? "التبديل بين المستخدمين" : "Switch User Persona"}
                </div>
                {users.map(u => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setCurrentUser(u);
                      setShowUserMenu(false);
                    }}
                    className={"w-full text-right px-3 py-1.5 rounded-md text-xs flex items-center justify-between " + (
                      u.id === currentUser.id
                        ? "bg-emerald-500/20 text-emerald-400 font-bold"
                        : "text-slate-300 hover:bg-slate-700/50"
                    )}
                  >
                    <div>
                      <div>{u.name}</div>
                      <div className="text-[10px] text-slate-400 capitalize">{u.role.replace("_", " ")}</div>
                    </div>
                    {u.id === currentUser.id && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
