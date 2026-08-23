"use client";

import React, { useState } from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency } from "@/lib/utils";
import { BarChart3, FileSpreadsheet, ShieldCheck, Printer } from "lucide-react";

export default function ReportsPage() {
  const { salesInvoices, purchaseInvoices, products, organization, locale } = useERP();
  const isAr = locale === "ar";
  const [selectedReport, setSelectedReport] = useState<"vat" | "inventory" | "sales">("vat");

  // VAT Return Computations
  const totalSalesTaxable = salesInvoices.reduce((sum, inv) => sum + inv.subtotal, 0);
  const totalSalesVat = salesInvoices.reduce((sum, inv) => sum + inv.taxTotal, 0);

  const totalPurchasesTaxable = purchaseInvoices.reduce((sum, inv) => sum + inv.subtotal, 0);
  const totalPurchasesVat = purchaseInvoices.reduce((sum, inv) => sum + inv.taxTotal, 0);

  const netVatPayable = totalSalesVat - totalPurchasesVat;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-emerald-400" />
            <span>{isAr ? "مركز التقارير التحليلية والضريبية" : "Reports & Tax Filing Center"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAr ? "إقرارات ضريبة القيمة المضافة لـ ZATCA و ETA، تقارير تقييم المخزون، وتحليلات المبيعات" : "VAT return filing, inventory valuation, and sales analytics"}
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
        >
          <Printer className="w-4 h-4" />
          <span>{isAr ? "طباعة التقرير" : "Print Report"}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-900/60 p-3 rounded-2xl border border-slate-800 text-xs font-bold">
        <button
          onClick={() => setSelectedReport("vat")}
          className={"px-4 py-2 rounded-xl transition-all " + (
            selectedReport === "vat" ? "bg-emerald-600 text-white shadow-md" : "bg-slate-950 text-slate-400 hover:text-white"
          )}
        >
          {isAr ? "إقرار ضريبة القيمة المضافة (VAT Return)" : "VAT Return"}
        </button>
        <button
          onClick={() => setSelectedReport("inventory")}
          className={"px-4 py-2 rounded-xl transition-all " + (
            selectedReport === "inventory" ? "bg-emerald-600 text-white shadow-md" : "bg-slate-950 text-slate-400 hover:text-white"
          )}
        >
          {isAr ? "تقرير تقييم المخزون السلعي" : "Inventory Valuation"}
        </button>
      </div>

      {/* VAT Return Report Content */}
      {selectedReport === "vat" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white">{isAr ? "نموذج إقرار ضريبة القيمة المضافة الدوري" : "Periodic VAT Return"}</h2>
              <div className="text-xs text-slate-400 mt-0.5">
                {isAr ? "الرقم الضريبي للمنشأة: " : "Tax ID: "} <span className="font-mono text-emerald-400 font-bold">{organization.taxNumber}</span>
              </div>
            </div>
            <div className="text-left">
              <span className="text-xs text-slate-500 block">{isAr ? "صافي الضريبة الواجبة السداد:" : "Net VAT Payable:"}</span>
              <span className="text-2xl font-black font-mono text-emerald-400">
                {formatCurrency(netVatPayable, organization.currency, locale)}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              {isAr ? "1. المخرجات (المبيعات الخاضعة للضريبة)" : "1. Output VAT (Sales)"}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-slate-400 font-bold">
                    <th className="p-3 rounded-r-lg">{isAr ? "البند" : "Item"}</th>
                    <th className="p-3 text-center font-mono">{isAr ? "المبلغ الخاضع للضريبة" : "Taxable Amount"}</th>
                    <th className="p-3 text-center font-mono">{isAr ? "نسبة الضريبة" : "Rate"}</th>
                    <th className="p-3 rounded-l-lg text-center font-mono text-emerald-400">{isAr ? "مبلغ الضريبة" : "VAT Amount"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  <tr>
                    <td className="p-3 font-sans font-semibold text-white">{isAr ? "المبيعات المحلية القياسية" : "Standard Rated Sales"}</td>
                    <td className="p-3 text-center text-slate-200">{formatCurrency(totalSalesTaxable, organization.currency, locale)}</td>
                    <td className="p-3 text-center text-emerald-400">%{organization.defaultVatRate}</td>
                    <td className="p-3 text-center font-bold text-emerald-400">{formatCurrency(totalSalesVat, organization.currency, locale)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider pt-4">
              {isAr ? "2. المدخلات (المشتريات القابلة للخصم)" : "2. Input VAT (Purchases)"}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-slate-400 font-bold">
                    <th className="p-3 rounded-r-lg">{isAr ? "البند" : "Item"}</th>
                    <th className="p-3 text-center font-mono">{isAr ? "المبلغ الخاضع للضريبة" : "Taxable Amount"}</th>
                    <th className="p-3 text-center font-mono">{isAr ? "نسبة الضريبة" : "Rate"}</th>
                    <th className="p-3 rounded-l-lg text-center font-mono text-sky-400">{isAr ? "مبلغ الضريبة المخصوم" : "Recoverable VAT"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  <tr>
                    <td className="p-3 font-sans font-semibold text-white">{isAr ? "المشتريات المحلية القياسية" : "Standard Rated Purchases"}</td>
                    <td className="p-3 text-center text-slate-200">{formatCurrency(totalPurchasesTaxable, organization.currency, locale)}</td>
                    <td className="p-3 text-center text-sky-400">%{organization.defaultVatRate}</td>
                    <td className="p-3 text-center font-bold text-sky-400">{formatCurrency(totalPurchasesVat, organization.currency, locale)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Valuation Report Content */}
      {selectedReport === "inventory" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                  <th className="p-3.5 rounded-r-lg">{isAr ? "كود SKU" : "SKU"}</th>
                  <th className="p-3.5">{isAr ? "اسم الصنف" : "Item Name"}</th>
                  <th className="p-3.5 text-center font-mono">{isAr ? "الكمية المتاحة" : "Qty on Hand"}</th>
                  <th className="p-3.5 text-center font-mono">{isAr ? "تكلفة الوحدة" : "Unit Cost"}</th>
                  <th className="p-3.5 text-center font-mono">{isAr ? "سعر البيع" : "Selling Price"}</th>
                  <th className="p-3.5 text-center font-mono text-emerald-400">{isAr ? "قيمة المخزون بالتكلفة" : "Total Cost Value"}</th>
                  <th className="p-3.5 rounded-l-lg text-center font-mono text-sky-400">{isAr ? "القيمة البيعية المتوقعة" : "Retail Value"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {products.map(p => {
                  const qty = Object.values(p.warehouseStock).reduce((a, b) => a + b, 0);
                  const costVal = qty * p.costPrice;
                  const sellVal = qty * p.sellingPrice;

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/30">
                      <td className="p-3.5 text-slate-400 font-bold">{p.sku}</td>
                      <td className="p-3.5 font-sans font-bold text-white">{isAr ? p.nameAr : p.nameEn}</td>
                      <td className="p-3.5 text-center text-white">{qty}</td>
                      <td className="p-3.5 text-center text-slate-300">{formatCurrency(p.costPrice, organization.currency, locale)}</td>
                      <td className="p-3.5 text-center text-slate-300">{formatCurrency(p.sellingPrice, organization.currency, locale)}</td>
                      <td className="p-3.5 text-center font-bold text-emerald-400">{formatCurrency(costVal, organization.currency, locale)}</td>
                      <td className="p-3.5 text-center font-bold text-sky-400">{formatCurrency(sellVal, organization.currency, locale)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
