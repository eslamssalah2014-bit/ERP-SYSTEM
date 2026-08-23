"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useERP } from "@/context/erp-context";
import { Search, Package, FileText, Users, ShoppingCart } from "lucide-react";

export default function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { products, customers, salesInvoices, locale } = useERP();
  const isAr = locale === "ar";

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        isOpen ? onClose() : null;
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredProducts = products.filter(p =>
    p.nameAr.includes(query) || p.nameEn.toLowerCase().includes(query.toLowerCase()) || p.sku.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 3);

  const filteredCustomers = customers.filter(c =>
    c.nameAr.includes(query) || c.nameEn.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 3);

  const navigateTo = (path: string) => {
    router.push(path);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-emerald-400 shrink-0" />
          <input
            type="text"
            placeholder={isAr ? "ابحث عن منتج، عميل، فاتورة، أو تنقل سريعاً..." : "Type a command or search..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-white text-sm focus:outline-none placeholder:text-slate-500"
          />
          <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded text-[10px] font-mono border border-slate-700">
            ESC
          </kbd>
        </div>

        <div className="p-2 max-h-80 overflow-y-auto space-y-3 custom-scrollbar text-xs">
          <div>
            <div className="px-3 py-1 text-[11px] font-bold text-slate-500 uppercase">
              {isAr ? "التنقل السريع" : "Quick Navigation"}
            </div>
            <div className="grid grid-cols-2 gap-1 mt-1">
              <button
                onClick={() => navigateTo("/pos")}
                className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:bg-slate-800 rounded-lg text-right"
              >
                <ShoppingCart className="w-4 h-4 text-emerald-400" />
                <span>{isAr ? "شاشة الكاشير (POS)" : "POS Terminal"}</span>
              </button>
              <button
                onClick={() => navigateTo("/inventory")}
                className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:bg-slate-800 rounded-lg text-right"
              >
                <Package className="w-4 h-4 text-sky-400" />
                <span>{isAr ? "إدارة المنتجات والمخزون" : "Products"}</span>
              </button>
              <button
                onClick={() => navigateTo("/sales")}
                className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:bg-slate-800 rounded-lg text-right"
              >
                <FileText className="w-4 h-4 text-amber-400" />
                <span>{isAr ? "فواتير المبيعات" : "Sales Invoices"}</span>
              </button>
              <button
                onClick={() => navigateTo("/accounting/coa")}
                className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:bg-slate-800 rounded-lg text-right"
              >
                <Users className="w-4 h-4 text-purple-400" />
                <span>{isAr ? "شجرة الحسابات والقيود" : "Accounting"}</span>
              </button>
            </div>
          </div>

          {filteredProducts.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-bold text-slate-500 uppercase">
                {isAr ? "المنتجات" : "Products"}
              </div>
              {filteredProducts.map(p => (
                <button
                  key={p.id}
                  onClick={() => navigateTo("/inventory")}
                  className="w-full flex items-center justify-between px-3 py-2 text-slate-300 hover:bg-slate-800 rounded-lg text-right"
                >
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-400" />
                    <span>{isAr ? p.nameAr : p.nameEn}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">{p.sku}</span>
                </button>
              ))}
            </div>
          )}

          {filteredCustomers.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-bold text-slate-500 uppercase">
                {isAr ? "العملاء" : "Customers"}
              </div>
              {filteredCustomers.map(c => (
                <button
                  key={c.id}
                  onClick={() => navigateTo("/customers")}
                  className="w-full flex items-center justify-between px-3 py-2 text-slate-300 hover:bg-slate-800 rounded-lg text-right"
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-sky-400" />
                    <span>{isAr ? c.nameAr : c.nameEn}</span>
                  </div>
                  <span className="text-[11px] text-emerald-400 font-mono">{c.code}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
