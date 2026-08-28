"use client";

import React, { useState, useMemo } from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency, formatDate, generateId } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import { SalesReturn, SalesReturnItem } from "@/types/erp";
import {
  RotateCcw, Plus, Search, Eye, Trash2, Loader2, AlertCircle,
  FileText, CheckCircle2, ShoppingCart, ArrowRight, Printer, Receipt
} from "lucide-react";

export default function SalesReturnsPage() {
  const {
    salesReturns, salesInvoices, customers, products, warehouses,
    treasuryAccounts, addSalesReturn, deleteSalesReturn,
    organization, activeBranchId, currentUser, locale, showToast
  } = useERP();

  const isAr = locale === "ar";
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReturn, setSelectedReturn] = useState<SalesReturn | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [originalInvoiceId, setOriginalInvoiceId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [refundMethod, setRefundMethod] = useState<"customer_balance" | "treasury">("customer_balance");
  const [treasuryAccountId, setTreasuryAccountId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Omit<SalesReturnItem, "id">[]>([]);

  const handleOpenAddModal = () => {
    setFormError(null);
    const defaultCust = customers[0]?.id || "";
    const defaultWh = warehouses.find(w => w.isDefault)?.id || warehouses[0]?.id || "";
    const defaultTreasury = treasuryAccounts[0]?.id || "";

    setOriginalInvoiceId("");
    setCustomerId(defaultCust);
    setWarehouseId(defaultWh);
    setTreasuryAccountId(defaultTreasury);
    setDate(new Date().toISOString().split("T")[0]);
    setRefundMethod("customer_balance");
    setNotes("");
    setItems([]);
    setIsAddModalOpen(true);
  };

  // When original invoice is selected, populate customer, warehouse, and items
  const handleSelectOriginalInvoice = (invId: string) => {
    setOriginalInvoiceId(invId);
    if (!invId) return;

    const inv = salesInvoices.find(i => i.id === invId);
    if (inv) {
      if (inv.customerId) setCustomerId(inv.customerId);
      if (inv.warehouseId) setWarehouseId(inv.warehouseId);

      if (inv.items && inv.items.length > 0) {
        setItems(inv.items.map(it => ({
          productId: it.productId,
          productName: it.productName,
          warehouseId: it.warehouseId || inv.warehouseId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          costPrice: it.costPrice,
          taxRate: it.taxRate,
          taxAmount: it.taxAmount,
          total: it.total,
        })));
      }
    }
  };

  const handleAddItem = () => {
    const p = products[0];
    if (!p) return;
    const currentWh = warehouseId || warehouses[0]?.id || "";
    setItems(prev => [
      ...prev,
      {
        productId: p.id,
        productName: isAr ? p.nameAr : p.nameEn,
        warehouseId: currentWh,
        quantity: 1,
        unitPrice: p.sellingPrice,
        costPrice: p.costPrice,
        taxRate: organization.defaultVatRate,
        taxAmount: (p.sellingPrice * organization.defaultVatRate) / 100,
        total: p.sellingPrice * (1 + organization.defaultVatRate / 100),
      }
    ]);
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    setItems(prev => {
      const updated = [...prev];
      const current = { ...updated[index] };

      if (field === "productId") {
        const prod = products.find(p => p.id === value);
        if (prod) {
          current.productId = prod.id;
          current.productName = isAr ? prod.nameAr : prod.nameEn;
          current.unitPrice = prod.sellingPrice;
          current.costPrice = prod.costPrice;
        }
      } else if (field === "quantity") {
        current.quantity = Math.max(1, parseInt(value) || 1);
      } else if (field === "unitPrice") {
        current.unitPrice = Math.max(0, parseFloat(value) || 0);
      } else if (field === "taxRate") {
        current.taxRate = Math.max(0, parseFloat(value) || 0);
      }

      const lineSubtotal = current.unitPrice * current.quantity;
      current.taxAmount = (lineSubtotal * current.taxRate) / 100;
      current.total = lineSubtotal + current.taxAmount;

      updated[index] = current;
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0), [items]);
  const taxTotal = useMemo(() => items.reduce((sum, item) => sum + item.taxAmount, 0), [items]);
  const grandTotal = subtotal + taxTotal;

  const handleCreateReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cust = customers.find(c => c.id === customerId) || customers[0];
    if (!cust) {
      setFormError(isAr ? "يرجى اختيار العميل" : "Please select a customer");
      return;
    }

    if (items.length === 0) {
      setFormError(isAr ? "يرجى إضافة صنف واحد على الأقل للمرتجع" : "Please add at least one line item to return");
      return;
    }

    setIsSubmitting(true);

    try {
      const returnNumber = `SRET-${new Date().getFullYear()}-${(salesReturns.length + 1).toString().padStart(4, "0")}`;
      const originalInv = salesInvoices.find(i => i.id === originalInvoiceId);

      const created = await addSalesReturn({
        organizationId: organization.id,
        branchId: activeBranchId,
        returnNumber,
        originalInvoiceId: originalInvoiceId || undefined,
        originalInvoiceNumber: originalInv?.invoiceNumber || undefined,
        date,
        customerId: cust.id,
        customerName: cust.nameAr,
        warehouseId: warehouseId || warehouses[0]?.id || "00000000-0000-0000-0000-000000000004",
        status: "completed",
        items: items.map(item => ({ ...item, id: generateId() })),
        subtotal,
        taxTotal,
        grandTotal,
        refundMethod,
        treasuryAccountId: refundMethod === "treasury" ? (treasuryAccountId || treasuryAccounts[0]?.id) : undefined,
        notes: notes || (isAr ? "مرتجع مبيعات وإرجاع للمخزن" : "Sales Return"),
        createdBy: currentUser.name,
      });

      setIsAddModalOpen(false);
      setSelectedReturn(created);
      showToast(
        isAr ? `تم تسجيل مرتجع المبيعات (${returnNumber}) وإرجاع المخزون بنجاح` : `Sales return (${returnNumber}) registered`,
        "success"
      );
    } catch (err: any) {
      console.error("Failed to create sales return:", err);
      const errMsg = err?.message || (isAr ? "فشل تسجيل المرتجع" : "Failed to record return");
      setFormError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(isAr ? "هل أنت متأكد من حذف إشعار المرتجع؟" : "Are you sure you want to delete this return?")) return;
    try {
      await deleteSalesReturn(id);
    } catch (err: any) {
      showToast(err?.message || "Error deleting return", "error");
    }
  };

  const filteredReturns = salesReturns.filter(ret => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (ret.returnNumber || "").toLowerCase().includes(q) ||
        (ret.customerName || "").includes(q) ||
        (ret.originalInvoiceNumber || "").toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <a href="/sales" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-xs">
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>{isAr ? "فواتير المبيعات" : "Sales Invoices"}</span>
            </a>
            <span className="text-slate-600">/</span>
            <span className="text-amber-400 font-bold text-xs">{isAr ? "مرتجعات المبيعات" : "Returns"}</span>
          </div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <RotateCcw className="w-6 h-6 text-amber-400" />
            <span>{isAr ? "مرتجعات المبيعات (الإشعارات الدائنة - Credit Notes)" : "Sales Returns & Credit Notes"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAr ? "إدارة مرتجعات البضائع المباعة مع إعادة التوريد للمخزن وتسوية حساب العميل / الخزينة آلياً" : "Process customer returns with automated inventory restock and accounting entries"}
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-500 hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-950/60 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{isAr ? "إضافة مرتجع مبيعات جديد" : "New Sales Return"}</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
          <input
            type="text"
            placeholder={isAr ? "بحث برقم المرتجع أو الفاتورة أو العميل..." : "Search return number or customer..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Returns Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                <th className="p-3.5 rounded-r-lg">#</th>
                <th className="p-3.5">{isAr ? "رقم إشعار المرتجع" : "Return No"}</th>
                <th className="p-3.5">{isAr ? "الفاتورة الأصلية" : "Original Invoice"}</th>
                <th className="p-3.5">{isAr ? "تاريخ الإرجاع" : "Return Date"}</th>
                <th className="p-3.5">{isAr ? "العميل" : "Customer"}</th>
                <th className="p-3.5 text-center font-mono">{isAr ? "المجموع" : "Subtotal"}</th>
                <th className="p-3.5 text-center font-mono">{isAr ? "الضريبة المستردة" : "VAT Refunded"}</th>
                <th className="p-3.5 text-center font-mono">{isAr ? "إجمالي الإشعار الدائن" : "Total Refund"}</th>
                <th className="p-3.5 text-center">{isAr ? "طريقة التسوية" : "Refund Method"}</th>
                <th className="p-3.5 rounded-l-lg text-center">{isAr ? "الإجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredReturns.map((ret, idx) => (
                <tr key={ret.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3.5 text-slate-500 font-mono">{idx + 1}</td>
                  <td className="p-3.5 font-mono font-bold text-amber-400">{ret.returnNumber}</td>
                  <td className="p-3.5 font-mono text-slate-300">
                    {ret.originalInvoiceNumber ? (
                      <span className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700">
                        {ret.originalInvoiceNumber}
                      </span>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                  <td className="p-3.5 text-slate-400 font-sans">{formatDate(ret.date, locale)}</td>
                  <td className="p-3.5 font-bold text-slate-200">{ret.customerName}</td>
                  <td className="p-3.5 text-center font-mono text-slate-400">
                    {formatCurrency(ret.subtotal, organization.currency, locale)}
                  </td>
                  <td className="p-3.5 text-center font-mono text-emerald-400">
                    {formatCurrency(ret.taxTotal, organization.currency, locale)}
                  </td>
                  <td className="p-3.5 text-center font-mono font-bold text-amber-400">
                    {formatCurrency(ret.grandTotal, organization.currency, locale)}
                  </td>
                  <td className="p-3.5 text-center">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      {ret.refundMethod === "treasury" ? (isAr ? "صرف نقدي من الخزينة" : "Cash Refund") : (isAr ? "خصم من رصيد العميل" : "Customer Credit")}
                    </span>
                  </td>
                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setSelectedReturn(ret)}
                        className="p-1.5 bg-slate-800 hover:bg-amber-600 hover:text-white text-slate-300 rounded-lg transition-colors cursor-pointer"
                        title={isAr ? "عرض الإشعار" : "View"}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(ret.id)}
                        className="p-1.5 bg-slate-800 hover:bg-rose-600 hover:text-white text-rose-400 rounded-lg transition-colors cursor-pointer"
                        title={isAr ? "حذف المرتجع" : "Delete"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredReturns.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-500">
                    <RotateCcw className="w-8 h-8 mx-auto mb-2 stroke-[1.5] text-slate-700" />
                    <p className="text-sm font-semibold text-slate-400">
                      {isAr ? "لا توجد مرتجعات مبيعات مسجلة" : "No sales returns recorded"}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      {isAr ? "اضغط على زر (إضافة مرتجع مبيعات جديد) لإصدار إشعار دائن" : "Click 'New Sales Return' to create a credit note"}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Return Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => !isSubmitting && setIsAddModalOpen(false)}
        title={isAr ? "تسجيل مرتجع مبيعات جديد (إشعار دائن)" : "New Sales Return (Credit Note)"}
        maxWidth="4xl"
      >
        <form onSubmit={handleCreateReturn} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                {isAr ? "ربط بفاتورة مبيعات سابقة (اختياري)" : "Original Sales Invoice"}
              </label>
              <select
                value={originalInvoiceId}
                onChange={(e) => handleSelectOriginalInvoice(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
              >
                <option value="">{isAr ? "-- بدون ربط بفاتورة محددة --" : "-- No Specific Invoice --"}</option>
                {salesInvoices.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.invoiceNumber} - {i.customerName} ({formatCurrency(i.grandTotal, organization.currency, locale)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "العميل *" : "Customer *"}</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-bold"
              >
                {customers.map(c => <option key={c.id} value={c.id}>{c.nameAr} ({c.code})</option>)}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "تاريخ الإرجاع *" : "Return Date *"}</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "مستودع إعادة الاستلام *" : "Target Warehouse *"}</label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              >
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.nameAr}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "طريقة تسوية المبلغ *" : "Refund Method *"}</label>
              <select
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-bold"
              >
                <option value="customer_balance">{isAr ? "خصم من رصيد العميل / إشعار دائن" : "Credit Customer Balance"}</option>
                <option value="treasury">{isAr ? "رد نقدي مباشر من الخزينة" : "Cash Refund from Treasury"}</option>
              </select>
            </div>

            {refundMethod === "treasury" && (
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "الخزينة المنصرف منها *" : "Treasury Account *"}</label>
                <select
                  value={treasuryAccountId}
                  onChange={(e) => setTreasuryAccountId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                >
                  {treasuryAccounts.map(t => <option key={t.id} value={t.id}>{t.nameAr} ({formatCurrency(t.balance, organization.currency, locale)})</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="bg-slate-800 text-slate-400 font-bold">
                  <th className="p-3">{isAr ? "الصنف المرتجع" : "Returned Item"}</th>
                  <th className="p-3 text-center w-24">{isAr ? "الكمية" : "Qty"}</th>
                  <th className="p-3 text-center w-32">{isAr ? "سعر الوحدة" : "Unit Price"}</th>
                  <th className="p-3 text-center w-24">{isAr ? "الضريبة %" : "VAT %"}</th>
                  <th className="p-3 text-left w-32">{isAr ? "الإجمالي" : "Total"}</th>
                  <th className="p-3 text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/60">
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-2">
                      <select
                        value={item.productId}
                        onChange={(e) => handleUpdateItem(idx, "productId", e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-bold"
                      >
                        {products.map(p => <option key={p.id} value={p.id}>{p.nameAr}</option>)}
                      </select>
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(idx, "quantity", e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-center text-white font-mono"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.unitPrice}
                        onChange={(e) => handleUpdateItem(idx, "unitPrice", e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-center text-white font-mono"
                      />
                    </td>
                    <td className="p-2 text-center font-mono text-emerald-400 font-bold">
                      %{item.taxRate}
                    </td>
                    <td className="p-2 text-left font-mono font-bold text-white">
                      {formatCurrency(item.total, organization.currency, locale)}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-2 bg-slate-950 flex justify-start">
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAr ? "إضافة صنف مرتجع" : "Add Returned Item"}</span>
              </button>
            </div>
          </div>

          {/* Totals Box */}
          <div className="flex justify-between items-center bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <div className="w-1/2">
              <label className="block text-slate-400 text-[11px] mb-1">{isAr ? "سبب الإرجاع / ملاحظات" : "Return Reason / Notes"}</label>
              <input
                type="text"
                placeholder={isAr ? "مثال: تلف بالبضاعة / خطأ في المقاس..." : "Reason for return..."}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder:text-slate-600"
              />
            </div>

            <div className="w-72 space-y-1.5 text-right">
              <div className="flex justify-between text-slate-400">
                <span>{isAr ? "المجموع الفرعي:" : "Subtotal:"}</span>
                <span className="font-mono font-bold text-white">{formatCurrency(subtotal, organization.currency, locale)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>{isAr ? `الضريبة (${organization.defaultVatRate}%):` : "VAT:"}</span>
                <span className="font-mono font-bold text-emerald-400">{formatCurrency(taxTotal, organization.currency, locale)}</span>
              </div>
              <div className="flex justify-between text-base font-black text-white pt-2 border-t border-slate-800">
                <span>{isAr ? "إجمالي الإشعار الدائن:" : "Total Refund:"}</span>
                <span className="font-mono text-amber-400">{formatCurrency(grandTotal, organization.currency, locale)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isAr ? "جاري ترحيل المرتجع وإعادة المخزون..." : "Processing Return..."}</span>
                </>
              ) : (
                <span>{isAr ? "تسجيل المرتجع وإعادة المخزون" : "Record Return & Restock"}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Return Modal */}
      {selectedReturn && (
        <Modal
          isOpen={!!selectedReturn}
          onClose={() => setSelectedReturn(null)}
          title={isAr ? `إشعار دائن مبيعات (${selectedReturn.returnNumber})` : `Credit Note (${selectedReturn.returnNumber})`}
          maxWidth="2xl"
        >
          <div className="p-4 space-y-4 text-xs">
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex justify-between items-center">
              <div>
                <p className="text-slate-400">{isAr ? "العميل" : "Customer"}</p>
                <p className="text-sm font-bold text-white">{selectedReturn.customerName}</p>
              </div>
              <div>
                <p className="text-slate-400">{isAr ? "تاريخ الإرجاع" : "Date"}</p>
                <p className="font-mono text-white">{formatDate(selectedReturn.date, locale)}</p>
              </div>
              <div>
                <p className="text-slate-400">{isAr ? "إجمالي المسترد" : "Total"}</p>
                <p className="text-base font-black text-amber-400 font-mono">
                  {formatCurrency(selectedReturn.grandTotal, organization.currency, locale)}
                </p>
              </div>
            </div>

            <div className="border border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-right">
                <thead>
                  <tr className="bg-slate-800 text-slate-400">
                    <th className="p-2.5">{isAr ? "الصنف" : "Item"}</th>
                    <th className="p-2.5 text-center">{isAr ? "الكمية" : "Qty"}</th>
                    <th className="p-2.5 text-center">{isAr ? "السعر" : "Price"}</th>
                    <th className="p-2.5 text-left">{isAr ? "الإجمالي" : "Total"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {(selectedReturn.items || []).map((it, i) => (
                    <tr key={i}>
                      <td className="p-2.5 font-bold text-white">{it.productName}</td>
                      <td className="p-2.5 text-center font-mono">{it.quantity}</td>
                      <td className="p-2.5 text-center font-mono">{formatCurrency(it.unitPrice, organization.currency, locale)}</td>
                      <td className="p-2.5 text-left font-mono font-bold text-amber-400">{formatCurrency(it.total, organization.currency, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-3">
              <button
                onClick={() => setSelectedReturn(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs"
              >
                {isAr ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
