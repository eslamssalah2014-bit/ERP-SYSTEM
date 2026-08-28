"use client";

import React, { useState } from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency, formatDate, generateId } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import { PurchaseInvoice } from "@/types/erp";
import {
  ShoppingBag, Plus, Search, Filter, Eye, CheckCircle2,
  Trash2, Building2, Printer, FileText, Calendar, User, Package, AlertCircle, Loader2
} from "lucide-react";

export default function PurchasesPage() {
  const {
    purchaseInvoices, suppliers, products, warehouses,
    createPurchaseInvoice, deletePurchaseInvoice, organization, activeBranchId,
    currentUser, locale, hasPermission, showToast
  } = useERP();

  const isAr = locale === "ar";
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // New Purchase Form State
  const [supplierId, setSupplierId] = useState("");
  const [supplierInvoiceRef, setSupplierInvoiceRef] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30*24*3600*1000).toISOString().split("T")[0]);
  const [warehouseId, setWarehouseId] = useState("");
  const [items, setItems] = useState<any[]>([]);

  const handleOpenAddModal = () => {
    setFormError(null);
    const defaultSupp = suppliers[0]?.id || "";
    const defaultWh = warehouses.find(w => w.isDefault)?.id || warehouses[0]?.id || "";
    const defaultProd = products[0];

    setSupplierId(defaultSupp);
    setWarehouseId(defaultWh);
    setDate(new Date().toISOString().split("T")[0]);
    setDueDate(new Date(Date.now() + 30*24*3600*1000).toISOString().split("T")[0]);
    setSupplierInvoiceRef("");

    if (defaultProd) {
      setItems([{
        productId: defaultProd.id,
        productName: isAr ? defaultProd.nameAr : defaultProd.nameEn,
        warehouseId: defaultWh,
        quantity: 5,
        unitCost: defaultProd.costPrice || 0,
        discountAmount: 0,
        taxRate: organization.defaultVatRate,
        taxAmount: ((defaultProd.costPrice || 0) * 5 * organization.defaultVatRate) / 100,
        total: ((defaultProd.costPrice || 0) * 5) * (1 + organization.defaultVatRate / 100),
      }]);
    } else {
      setItems([]);
    }
    setIsAddModalOpen(true);
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
        unitCost: p.costPrice,
        discountAmount: 0,
        taxRate: organization.defaultVatRate,
        taxAmount: (p.costPrice * organization.defaultVatRate) / 100,
        total: p.costPrice * (1 + organization.defaultVatRate / 100),
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
          current.unitCost = prod.costPrice;
        }
      } else if (field === "quantity") {
        current.quantity = Math.max(1, parseInt(value) || 1);
      } else if (field === "unitCost") {
        current.unitCost = Math.max(0, parseFloat(value) || 0);
      }

      const lineSubtotal = current.unitCost * current.quantity;
      current.taxAmount = (lineSubtotal * current.taxRate) / 100;
      current.total = lineSubtotal + current.taxAmount;

      updated[index] = current;
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, item) => sum + (item.unitCost * item.quantity), 0);
  const taxTotal = items.reduce((sum, item) => sum + item.taxAmount, 0);
  const grandTotal = subtotal + taxTotal;

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const supp = suppliers.find(s => s.id === supplierId) || suppliers[0];
    if (!supp) {
      setFormError(isAr ? "يرجى اختيار المورد أولاً" : "Please select a supplier");
      return;
    }

    if (items.length === 0) {
      setFormError(isAr ? "يرجى إضافة صنف واحد على الأقل للفاتورة" : "Please add at least one line item");
      return;
    }

    setIsSubmitting(true);

    try {
      const invoiceNumber = "PINV-" + new Date().getFullYear() + "-" + (purchaseInvoices.length + 1).toString().padStart(4, "0");

      await createPurchaseInvoice({
        organizationId: organization.id,
        branchId: activeBranchId,
        invoiceNumber,
        supplierInvoiceRef,
        date,
        dueDate,
        supplierId: supp.id,
        supplierName: supp.nameAr,
        supplierTaxNumber: supp.taxNumber,
        warehouseId: warehouseId || warehouses[0]?.id || "00000000-0000-0000-0000-000000000004",
        status: "unpaid",
        items: items.map(item => ({ ...item, id: generateId() })),
        subtotal,
        discountTotal: 0,
        taxTotal,
        grandTotal,
        paidAmount: 0,
        dueAmount: grandTotal,
        notes: isAr ? "فاتورة توريد بضاعة ومخزون" : "Standard Purchase Invoice",
        createdBy: currentUser.name,
      });

      setIsAddModalOpen(false);
    } catch (err: any) {
      console.error("Failed to create purchase invoice:", err);
      const errMsg = err?.message || (isAr ? "فشل حفظ فاتورة المشتريات" : "Failed to create purchase invoice");
      setFormError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(isAr ? "هل أنت متأكد من حذف فاتورة المشتريات هذه وتعديل قيودها ومخزونها؟" : "Are you sure you want to delete this purchase invoice?")) {
      try {
        await deletePurchaseInvoice(id);
        if (selectedInvoice?.id === id) setSelectedInvoice(null);
      } catch (err: any) {
        showToast(err?.message || (isAr ? "فشل حذف الفاتورة" : "Failed to delete"), "error");
      }
    }
  };

  const filteredInvoices = purchaseInvoices.filter(inv => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (inv.invoiceNumber || "").toLowerCase().includes(q) || (inv.supplierName || "").includes(q);
    }
    return true;
  });

  const canManage = hasPermission(["super_admin", "tenant_admin", "accountant", "inventory_manager"]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <ShoppingBag className="w-6 h-6 text-sky-400" />
            <span>{isAr ? "فواتير المشتريات وتوريدات المخزون" : "Purchase Invoices & Inventory Supply"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAr ? "إثبات استلام الشحنات وتحديث أرصدة المخازن وحسابات الموردين وخصم ضريبة المدخلات" : "Record vendor invoices, replenish stock, and manage AP ledgers"}
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-sky-600 to-blue-500 hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-950/60 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{isAr ? "إضافة فاتورة مشتريات" : "New Purchase Invoice"}</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
        <div className="relative w-72">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? "بحث برقم الفاتورة أو المورد..." : "Search invoice # or supplier..."}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 font-medium"
          />
        </div>
        <span className="text-xs text-slate-400 font-semibold">
          {isAr ? `إجمالي الفواتير: ${filteredInvoices.length}` : `Total Invoices: ${filteredInvoices.length}`}
        </span>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                <th className="p-3.5 rounded-r-lg">#</th>
                <th className="p-3.5">{isAr ? "رقم الفاتورة" : "Invoice No"}</th>
                <th className="p-3.5">{isAr ? "تاريخ الفاتورة" : "Date"}</th>
                <th className="p-3.5">{isAr ? "المورد" : "Supplier"}</th>
                <th className="p-3.5 font-mono">{isAr ? "رقم فاتورة المورد" : "Vendor Ref"}</th>
                <th className="p-3.5 text-center font-mono">{isAr ? "المجموع" : "Subtotal"}</th>
                <th className="p-3.5 text-center font-mono">{isAr ? "الضريبة" : "VAT"}</th>
                <th className="p-3.5 text-center font-mono">{isAr ? "الإجمالي المستحق" : "Grand Total"}</th>
                <th className="p-3.5 text-center">{isAr ? "الحالة" : "Status"}</th>
                <th className="p-3.5 rounded-l-lg text-center">{isAr ? "الإجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredInvoices.map((inv, idx) => (
                <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3.5 text-slate-500 font-mono">{idx + 1}</td>
                  <td className="p-3.5 font-mono font-bold text-white">{inv.invoiceNumber}</td>
                  <td className="p-3.5 text-slate-400 font-sans">{formatDate(inv.date, locale)}</td>
                  <td className="p-3.5 font-bold text-slate-200">{inv.supplierName}</td>
                  <td className="p-3.5 text-slate-400 font-mono">{inv.supplierInvoiceRef || "---"}</td>
                  <td className="p-3.5 text-center font-mono text-slate-400">
                    {formatCurrency(inv.subtotal, organization.currency, locale)}
                  </td>
                  <td className="p-3.5 text-center font-mono text-sky-400 font-bold">
                    {formatCurrency(inv.taxTotal, organization.currency, locale)}
                  </td>
                  <td className="p-3.5 text-center font-mono font-bold text-white">
                    {formatCurrency(inv.grandTotal, organization.currency, locale)}
                  </td>
                  <td className="p-3.5 text-center">
                    <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold border bg-sky-500/10 text-sky-400 border-sky-500/20">
                      {isAr ? "معتمدة وموردة" : "Posted & Received"}
                    </span>
                  </td>
                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="p-1.5 bg-slate-800 hover:bg-sky-600 hover:text-white text-slate-300 rounded-lg transition-colors cursor-pointer"
                        title={isAr ? "معاينة الفاتورة" : "View"}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {canManage && (
                        <button
                          onClick={() => handleDelete(inv.id)}
                          className="p-1.5 bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-400 rounded-lg transition-colors cursor-pointer"
                          title={isAr ? "حذف الفاتورة" : "Delete"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-500">
                    <ShoppingBag className="w-8 h-8 mx-auto mb-2 stroke-[1.5] text-slate-700" />
                    <p className="text-sm font-semibold text-slate-400">
                      {isAr ? "لا توجد فواتير مشتريات مسجلة" : "No purchase invoices found"}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Modal */}
      {selectedInvoice && (
        <Modal
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          title={isAr ? `فاتورة مشتريات: ${selectedInvoice.invoiceNumber}` : `Purchase Invoice: ${selectedInvoice.invoiceNumber}`}
          maxWidth="4xl"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div>
                <span className="text-slate-500 block mb-0.5">{isAr ? "المورد:" : "Supplier:"}</span>
                <span className="font-bold text-white">{selectedInvoice.supplierName}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">{isAr ? "تاريخ الفاتورة:" : "Date:"}</span>
                <span className="font-mono text-slate-300">{formatDate(selectedInvoice.date, locale)}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">{isAr ? "الرقم المرجعي:" : "Vendor Ref:"}</span>
                <span className="font-mono text-slate-300">{selectedInvoice.supplierInvoiceRef || "---"}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">{isAr ? "المستودع:" : "Warehouse:"}</span>
                <span className="font-semibold text-slate-300">
                  {warehouses.find(w => w.id === selectedInvoice.warehouseId)?.nameAr || "المستودع المركزي"}
                </span>
              </div>
            </div>

            <div className="border border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="bg-slate-800 text-slate-400 font-bold">
                    <th className="p-3">{isAr ? "الصنف" : "Item"}</th>
                    <th className="p-3 text-center">{isAr ? "الكمية" : "Qty"}</th>
                    <th className="p-3 text-center">{isAr ? "سعر التكلفة" : "Unit Cost"}</th>
                    <th className="p-3 text-left">{isAr ? "الإجمالي" : "Total"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-950/60">
                  {(selectedInvoice.items || []).map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-3 font-bold text-white">{it.productName}</td>
                      <td className="p-3 text-center font-mono text-slate-300">{it.quantity}</td>
                      <td className="p-3 text-center font-mono text-slate-300">
                        {formatCurrency(it.unitCost, organization.currency, locale)}
                      </td>
                      <td className="p-3 text-left font-mono font-bold text-white">
                        {formatCurrency(it.total, organization.currency, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>{isAr ? "طباعة الفاتورة" : "Print"}</span>
              </button>
              <div className="text-left space-y-1">
                <div className="text-slate-400">
                  {isAr ? "الإجمالي الصافي: " : "Grand Total: "}
                  <span className="font-mono font-bold text-base text-sky-400">
                    {formatCurrency(selectedInvoice.grandTotal, organization.currency, locale)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => !isSubmitting && setIsAddModalOpen(false)}
        title={isAr ? "تسجيل فاتورة مشتريات وتوريد مخزون" : "New Purchase Invoice"}
        maxWidth="4xl"
      >
        {suppliers.length === 0 || products.length === 0 ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 text-center space-y-4">
            <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
            <div>
              <h3 className="text-sm font-bold text-white mb-1">
                {isAr ? "متطلبات تسجيل فاتورة المشتريات" : "Prerequisites Required"}
              </h3>
              <p className="text-xs text-slate-300">
                {suppliers.length === 0 && products.length === 0
                  ? (isAr ? "يرجى إضافة مورد واحد ومنتج واحد على الأقل أولاً." : "Please add a supplier and product first.")
                  : suppliers.length === 0
                  ? (isAr ? "يرجى إضافة مورد في دليل الموردين أولاً." : "Please add a supplier first.")
                  : (isAr ? "يرجى إضافة صنف / منتج في المخزن أولاً." : "Please add a product first.")}
              </p>
            </div>
            <div className="flex justify-center gap-3">
              {suppliers.length === 0 && (
                <a href="/suppliers" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs">
                  {isAr ? "إضافة مورد" : "Add Supplier"}
                </a>
              )}
              {products.length === 0 && (
                <a href="/inventory" className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs">
                  {isAr ? "إضافة منتج" : "Add Product"}
                </a>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreatePurchase} className="space-y-4 text-xs">
            {formError && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "المورد *" : "Supplier *"}</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                >
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.nameAr}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "رقم فاتورة المورد" : "Supplier Inv Ref"}</label>
                <input
                  type="text"
                  value={supplierInvoiceRef}
                  onChange={(e) => setSupplierInvoiceRef(e.target.value)}
                  placeholder="SUPP-0091..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "تاريخ الفاتورة *" : "Date *"}</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "مستودع الاستلام *" : "Target Warehouse *"}</label>
                <select
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.nameAr}</option>)}
                </select>
              </div>
            </div>

            <div className="border border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="bg-slate-800 text-slate-400 font-bold">
                    <th className="p-3">{isAr ? "الصنف" : "Item"}</th>
                    <th className="p-3 text-center w-24">{isAr ? "الكمية الموردة" : "Qty"}</th>
                    <th className="p-3 text-center w-32">{isAr ? "سعر التكلفة للوحدة" : "Unit Cost"}</th>
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
                          value={item.unitCost}
                          onChange={(e) => handleUpdateItem(idx, "unitCost", e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-center text-white font-mono"
                        />
                      </td>
                      <td className="p-2 text-center font-mono text-sky-400 font-bold">
                        %{item.taxRate}
                      </td>
                      <td className="p-2 text-left font-mono font-bold text-white">
                        {formatCurrency(item.total, organization.currency, locale)}
                      </td>
                      <td className="p-2 text-center">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-2 bg-slate-950">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAr ? "إضافة صنف مشتريات" : "Add Line"}</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <div className="w-72 bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex justify-between text-slate-400">
                  <span>{isAr ? "المجموع الفرعي:" : "Subtotal:"}</span>
                  <span className="font-mono font-bold text-white">{formatCurrency(subtotal, organization.currency, locale)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>{isAr ? ("ضريبة المدخلات (" + organization.defaultVatRate + "%):") : "VAT Input:"}</span>
                  <span className="font-mono font-bold text-sky-400">{formatCurrency(taxTotal, organization.currency, locale)}</span>
                </div>
                <div className="flex justify-between text-base font-black text-white pt-2 border-t border-slate-800">
                  <span>{isAr ? "إجمالي الفاتورة:" : "Grand Total:"}</span>
                  <span className="font-mono text-sky-400">{formatCurrency(grandTotal, organization.currency, locale)}</span>
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
                className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isAr ? "جاري الحفظ والتوريد..." : "Saving & Posting..."}</span>
                  </>
                ) : (
                  <span>{isAr ? "حفظ وتغذية المخزن والقيد المحاسبي" : "Save & Post to Ledger"}</span>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
