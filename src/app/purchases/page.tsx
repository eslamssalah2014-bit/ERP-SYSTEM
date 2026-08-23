"use client";

import React, { useState } from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import { PurchaseInvoice } from "@/types/erp";
import {
  ShoppingBag, Plus, Search, Filter, Eye, CheckCircle2,
  Trash2, Building2
} from "lucide-react";

export default function PurchasesPage() {
  const {
    purchaseInvoices, suppliers, products, warehouses,
    createPurchaseInvoice, organization, activeBranchId,
    currentUser, locale
  } = useERP();

  const isAr = locale === "ar";
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || "");
  const [supplierInvoiceRef, setSupplierInvoiceRef] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30*24*3600*1000).toISOString().split("T")[0]);
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || "");
  const [items, setItems] = useState([
    {
      productId: products[0]?.id || "",
      productName: products[0]?.nameAr || "",
      warehouseId: warehouses[0]?.id || "",
      quantity: 5,
      unitCost: products[0]?.costPrice || 0,
      discountAmount: 0,
      taxRate: organization.defaultVatRate,
      taxAmount: ((products[0]?.costPrice || 0) * 5 * organization.defaultVatRate) / 100,
      total: ((products[0]?.costPrice || 0) * 5) * (1 + organization.defaultVatRate / 100),
    }
  ]);

  const handleAddItem = () => {
    const p = products[0];
    if (!p) return;
    setItems(prev => [
      ...prev,
      {
        productId: p.id,
        productName: p.nameAr,
        warehouseId: warehouses[0]?.id || "",
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

  const handleCreatePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    const supp = suppliers.find(s => s.id === supplierId);
    if (!supp || items.length === 0) return;

    const invoiceNumber = "PINV-" + new Date().getFullYear() + "-" + (purchaseInvoices.length + 1).toString().padStart(3, "0");

    createPurchaseInvoice({
      organizationId: organization.id,
      branchId: activeBranchId,
      invoiceNumber,
      supplierInvoiceRef,
      date,
      dueDate,
      supplierId: supp.id,
      supplierName: supp.nameAr,
      supplierTaxNumber: supp.taxNumber,
      warehouseId,
      status: "unpaid",
      items: items.map((item, idx) => ({ ...item, id: "pitem_" + idx })),
      subtotal,
      discountTotal: 0,
      taxTotal,
      grandTotal,
      paidAmount: 0,
      dueAmount: grandTotal,
      notes: "فاتورة توريد بضاعة ومخزون",
      createdBy: currentUser.name,
    });

    setIsAddModalOpen(false);
  };

  const filteredInvoices = purchaseInvoices.filter(inv => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return inv.invoiceNumber.toLowerCase().includes(q) || inv.supplierName.includes(q);
    }
    return true;
  });

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
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-sky-600 to-blue-500 hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-950/60 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{isAr ? "إضافة فاتورة مشتريات" : "New Purchase Invoice"}</span>
        </button>
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
                <th className="p-3.5 rounded-l-lg text-center">{isAr ? "الحالة" : "Status"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredInvoices.map((inv, idx) => (
                <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3.5 text-slate-500 font-mono">{idx + 1}</td>
                  <td className="p-3.5 font-mono font-bold text-white">{inv.invoiceNumber}</td>
                  <td className="p-3.5 text-slate-400">{formatDate(inv.date, locale)}</td>
                  <td className="p-3.5 font-bold text-slate-200">{inv.supplierName}</td>
                  <td className="p-3.5 font-mono text-slate-400">{inv.supplierInvoiceRef || "---"}</td>
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
                    <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 rounded-xl text-[10px] font-bold border border-amber-500/20">
                      {inv.status}
                    </span>
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
        title={isAr ? "تسجيل فاتورة مشتريات وتوريد مخزن" : "Record Purchase Invoice"}
        maxWidth="4xl"
      >
        <form onSubmit={handleCreatePurchase} className="space-y-4 text-xs">
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
                          className="p-1 text-slate-500 hover:text-rose-400"
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
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold rounded-lg transition-colors"
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
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-lg transition-colors"
            >
              {isAr ? "حفظ وتغذية المخزن والقيد المحاسبي" : "Save & Post to Ledger"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
