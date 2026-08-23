"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useERP } from "@/context/erp-context";
import {
  LayoutDashboard, Package, Warehouse, FileSpreadsheet, ShoppingCart,
  ShoppingBag, Users, Truck, Wallet, CheckSquare, BookOpen,
  FileText, BarChart3, ShieldCheck, Settings, MonitorPlay, ChevronDown,
  Layers, CircleDollarSign, ArrowLeftRight
} from "lucide-react";

interface NavItem {
  titleAr: string;
  titleEn: string;
  href: string;
  icon: React.ElementType;
  badge?: string | number;
  children?: { titleAr: string; titleEn: string; href: string }[];
}

export default function Sidebar() {
  const pathname = usePathname();
  const { locale, organization, notifications } = useERP();
  const isAr = locale === "ar";
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    inventory: true,
    sales: true,
    purchases: true,
    accounting: true,
  });

  const toggleSection = (sec: string) => {
    setOpenSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  const navItems: NavItem[] = [
    {
      titleAr: "لوحة المؤشرات",
      titleEn: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
    },
    {
      titleAr: "المخزون والمستودعات",
      titleEn: "Inventory",
      href: "/inventory",
      icon: Package,
      children: [
        { titleAr: "المنتجات والأصناف", titleEn: "Products & Items", href: "/inventory" },
        { titleAr: "المستودعات والفروع", titleEn: "Warehouses", href: "/inventory/warehouses" },
        { titleAr: "كارت الصنف (Kardex)", titleEn: "Stock Card (Kardex)", href: "/inventory/kardex" },
      ]
    },
    {
      titleAr: "المبيعات والعملاء",
      titleEn: "Sales & CRM",
      href: "/sales",
      icon: ShoppingCart,
      children: [
        { titleAr: "فواتير المبيعات", titleEn: "Sales Invoices", href: "/sales" },
        { titleAr: "نقطة البيع (POS)", titleEn: "POS Terminal", href: "/pos" },
        { titleAr: "عروض الأسعار", titleEn: "Quotations", href: "/sales/quotations" },
        { titleAr: "سجل العملاء", titleEn: "Customers", href: "/customers" },
      ]
    },
    {
      titleAr: "المشتريات والموردين",
      titleEn: "Purchasing",
      href: "/purchases",
      icon: ShoppingBag,
      children: [
        { titleAr: "فواتير المشتريات", titleEn: "Purchase Invoices", href: "/purchases" },
        { titleAr: "أوامر الشراء", titleEn: "Purchase Orders", href: "/purchases/orders" },
        { titleAr: "سجل الموردين", titleEn: "Suppliers", href: "/suppliers" },
      ]
    },
    {
      titleAr: "الخزينة والبنوك",
      titleEn: "Treasury & Cash",
      href: "/treasury",
      icon: Wallet,
    },
    {
      titleAr: "حافظة الشيكات",
      titleEn: "Checks Portfolio",
      href: "/checks",
      icon: CheckSquare,
    },
    {
      titleAr: "الحسابات العامة",
      titleEn: "General Accounting",
      href: "/accounting/coa",
      icon: BookOpen,
      children: [
        { titleAr: "شجرة الحسابات", titleEn: "Chart of Accounts", href: "/accounting/coa" },
        { titleAr: "القيود اليومية", titleEn: "Journal Entries", href: "/accounting/journal" },
        { titleAr: "دفتر الأستاذ العام", titleEn: "General Ledger", href: "/accounting/ledger" },
        { titleAr: "ميزان المراجعة", titleEn: "Trial Balance", href: "/accounting/trial-balance" },
        { titleAr: "قائمة الدخل (الأرباح والخسائر)", titleEn: "Income Statement", href: "/accounting/income-statement" },
        { titleAr: "الميزانية العمومية", titleEn: "Balance Sheet", href: "/accounting/balance-sheet" },
      ]
    },
    {
      titleAr: "مراكز التكلفة",
      titleEn: "Cost Centers",
      href: "/cost-centers",
      icon: Layers,
    },
    {
      titleAr: "التقارير التحليلية",
      titleEn: "Reports & Analytics",
      href: "/reports",
      icon: BarChart3,
    },
    {
      titleAr: "سجل التدقيق والرقابة",
      titleEn: "Audit Trail",
      href: "/audit",
      icon: ShieldCheck,
    },
    {
      titleAr: "الإعدادات العامة",
      titleEn: "Settings",
      href: "/settings",
      icon: Settings,
    }
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen select-none shrink-0 transition-all">
      <div className="h-16 px-4 flex items-center gap-3 border-b border-slate-800">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-emerald-900/30">
          س
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-white text-base truncate tracking-tight">
            {isAr ? "سَنَد ERP" : "SANAD ERP"}
          </span>
          <span className="text-xs text-slate-400 truncate">
            {isAr ? organization.nameAr : organization.nameEn}
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 custom-scrollbar">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (Boolean(item.children) && (item.children?.some(c => pathname === c.href) || false));
          const hasChildren = Boolean(item.children && item.children.length > 0);
          const sectionKey = item.href.replace("/", "") || "dashboard";
          const isOpen = openSections[sectionKey] ?? false;

          return (
            <div key={index} className="space-y-1">
              {hasChildren && item.children ? (
                <div>
                  <button
                    onClick={() => toggleSection(sectionKey)}
                    className={"w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors " + (
                      isActive
                        ? "bg-slate-800 text-emerald-400 font-semibold"
                        : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={"w-5 h-5 " + (isActive ? "text-emerald-400" : "text-slate-400")} />
                      <span>{isAr ? item.titleAr : item.titleEn}</span>
                    </div>
                    <ChevronDown
                      className={"w-4 h-4 text-slate-400 transition-transform duration-200 " + (
                        isOpen ? "transform rotate-180" : ""
                      )}
                    />
                  </button>

                  {isOpen && (
                    <div className="mt-1 mr-4 pl-2 space-y-1 border-r-2 border-slate-800">
                      {item.children.map((child, cIdx) => {
                        const isChildActive = pathname === child.href;
                        return (
                          <Link
                            key={cIdx}
                            href={child.href}
                            className={"block px-3 py-1.5 rounded-md text-xs font-medium transition-colors " + (
                              isChildActive
                                ? "bg-emerald-500/10 text-emerald-400 font-semibold"
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                            )}
                          >
                            {isAr ? child.titleAr : child.titleEn}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href={item.href}
                  className={"flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors " + (
                    isActive
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={"w-5 h-5 " + (isActive ? "text-white" : "text-slate-400")} />
                    <span>{isAr ? item.titleAr : item.titleEn}</span>
                  </div>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-800">
        <Link
          href="/pos"
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-900/40 hover:opacity-95 transition-opacity"
        >
          <MonitorPlay className="w-4 h-4" />
          <span>{isAr ? "نقطة البيع (POS السريع)" : "POS Terminal"}</span>
        </Link>
      </div>
    </aside>
  );
}
