"use client";

import React, { useState } from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency, formatDate, generateId } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import ZatcaInvoiceModal from "@/components/ui/ZatcaInvoiceModal";
import { SalesInvoice, SalesInvoiceItem } from "@/types/erp";
import {
  ShoppingCart, Plus, Search, Filter, Eye, Printer,
  FileText, CheckCircle2, AlertCircle, Clock, Trash2
} from "lucide-react";

export default function SalesInvoicesPage() {
  const {
    salesInvoices, customers, products, warehouses,
    createSalesInvoice, organization, activeBranchId,
    currentUser, locale
  } = useERP();

  const isAr = locale === "ar";
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Invoice Form State
  const [customerId, setCustomerId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30*24*3600*1000).toISOString().split("T")[0]);
  const [warehouseId, setWarehouseId] = useState("");
  const [items, setItems] = useState<Omit<SalesInvoiceItem, "id">[]>([]);

  const handleOpenAddModal = () => {
    const defaultCust = customers[0]?.id || "";
    const defaultWh = warehouses.find(w => w.isDefault)?.id || warehouses[0]?.id || "";
    const defaultProd = products[0];

    setCustomerId(defaultCust);
    setWarehouseId(defaultWh);
    setDate(new Date().toISOString().split("T")[0]);
    setDueDate(new Date(Date.now() + 30*24*3600*1000).toISOString().split("T")[0]);

    if (defaultProd) {
      setItems([{
        productId: defaultProd.id,
        productName: isAr ? defaultProd.nameAr : defaultProd.nameEn,
        warehouseId: defaultWh,
        quantity: 1,
        unitPrice: defaultProd.sellingPrice,
        costPrice: defaultProd.costPrice,
        discountPercent: 0,
        discountAmount: 0,
        taxRate: organization.defaultVatRate,
        taxAmount: (defaultProd.sellingPrice * organization.defaultVatRate) / 100,
        total: defaultProd.sellingPrice * (1 + organization.defaultVatRate / 100),
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
        unitPrice: p.sellingPrice,
        costPrice: p.costPrice,
        discountPercent: 0,
        discountAmount: 0,
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

  const subtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const taxTotal = items.reduce((sum, item) => sum + item.taxAmount, 0);
  const grandTotal = subtotal + taxTotal;

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find(c => c.id === customerId) || customers[0];
    if (!cust || items.length === 0) return;

    const invoiceNumber = "INV-" + new Date().getFullYear() + "-" + (salesInvoices.length + 1).toString().padStart(3, "0");

    const created = await createSalesInvoice({
      organizationId: organization.id,
      branchId: activeBranchId,
      invoiceNumber,
      date,
      dueDate,
      customerId: cust.id,
      customerName: cust.nameAr,
      customerTaxNumber: cust.taxNumber,
      salesRepId: currentUser.id,
      salesRepName: currentUser.name,
      warehouseId: warehouseId || warehouses[0]?.id || "00000000-0000-0000-0000-000000000004",
      status: "unpaid",
      items: items.map(item => ({ ...item, id: generateId() })),
      subtotal,
      discountTotal: 0,
      taxTotal,
      grandTotal,
      paidAmount: 0,
      dueAmount: grandTotal,
      notes: "فاتورة مبيعات إلكترونية معتمدة",
      createdBy: currentUser.name,
    });

    setIsAddModalOpen(false);
    setSelectedInvoice(created);
  };

  const filteredInvoices = salesInvoices.filter(inv => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return inv.invoiceNumber.toLowerCase().includes(q) || inv.customerName.includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <ShoppingCart className="w-6 h-6 text-emerald-400" />
            <span>{isAr ? "فواتير المبيعات والفوترة الإلكترونية" : "Sales Invoices & E-Billing"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAr ? "إصدار وإدارة الفواتير الضريبية المتوافقة مع متطلبات هيئة الزكاة والضريبة والجمارك (ZATCA) ومصلحة الضرائب المصرية (ETA)" : "ZATCA & ETA compliant electronic tax invoicing"}
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/60 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{isAr ? "إصدار فاتورة مبيعات جديدة" : "Create Sales Invoice"}</span>
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
          <input
            type="text"
            placeholder={isAr ? "بحث برقم الفاتورة أو اسم العميل..." : "Search invoice number or customer..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                <th className="p-3.5 rounded-r-lg">#</th>
                <th className="p-3.5">{isAr ? "رقم الفاتورة" : "Invoice No"}</th>
                <th className="p-3.5">{isAr ? "تاريخ الإصدار" : "Date"}</th>
                <th className="p-3.5">{isAr ? "العميل" : "Customer"}</th>
                <th className="p-3.5 text-center font-mono">{isAr ? "المجموع (بدون ضريبة)" : "Subtotal"}</th>
                <th className="p-3.5 text-center font-mono">{isAr ? "الضريبة" : "VAT"}</th>
                <th className="p-3.5 text-center font-mono">{isAr ? "الإجمالي الصافي" : "Grand Total"}</th>
                <th className="p-3.5 text-center">{isAr ? "الحالة" : "Status"}</th>
                <th className="p-3.5 rounded-l-lg text-center">{isAr ? "عرض الفاتورة" : "View"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredInvoices.map((inv, idx) => (
                <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3.5 text-slate-500 font-mono">{idx + 1}</td>
                  <td className="p-3.5">
                    <div className="font-mono font-bold text-white flex items-center gap-1.5">
                      <span>{inv.invoiceNumber}</span>
                      <span className="text-[9px] px-1 bg-emerald-500/20 text-emerald-400 rounded">
                        QR
                      </span>
                    </div>
                  </td>
                  <td className="p-3.5 text-slate-400 font-sans">{formatDate(inv.date, locale)}</td>
                  <td className="p-3.5 font-bold text-slate-200">{inv.customerName}</td>
                  <td className="p-3.5 text-center font-mono text-slate-400">
                    {formatCurrency(inv.subtotal, organization.currency, locale)}
                  </td>
                  <td className="p-3.5 text-center font-mono text-emerald-400 font-bold">
                    {formatCurrency(inv.taxTotal, organization.currency, locale)}
                  </td>
                  <td className="p-3.5 text-center font-mono font-bold text-white">
                    {formatCurrency(inv.grandTotal, organization.currency, locale)}
                  </td>
                  <td className="p-3.5 text-center">
                    <span className={"px-2.5 py-1 rounded-xl text-[10px] font-bold border " + (
                      inv.status === "paid"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : inv.status === "partially_paid"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    )}>
                      {inv.status === "paid" && (isAr ? "مدفوعة بالكامل" : "Paid")}
                      {inv.status === "partially_paid" && (isAr ? "مدفوعة جزئياً" : "Partially Paid")}
                      {inv.status === "unpaid" && (isAr ? "غير مسددة" : "Unpaid")}
                    </span>
                  </td>
                  <td className="p-3.5 text-center">
                    <button
                      onClick={() => setSelectedInvoice(inv)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{isAr ? "الفاتورة الضريبية" : "View"}</span>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-500">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-2 stroke-[1.5] text-slate-700" />
                    <p className="text-sm font-semibold text-slate-400">
                      {isAr ? "لا توجد فواتير مبيعات مسجلة" : "No sales invoices found"}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      {isAr ? "اضغط على زر (فاتورة مبيعات جديدة) لإصدار أول فاتورة ضريبية إلكترونية" : "Click 'New Invoice' to issue your first tax invoice"}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={isAr ? "تحرير فاتورة مبيعات ضريبية جديدة" : "New Sales Invoice"}
        maxWidth="4xl"
      >
        {customers.length === 0 || products.length === 0 ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 text-center space-y-4">
            <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
            <div>
              <h3 className="text-sm font-bold text-white mb-1">
                {isAr ? "متطلبات إصدار الفاتورة الضريبية" : "Invoice Prerequisites Required"}
              </h3>
              <p className="text-xs text-slate-300">
                {customers.length === 0 && products.length === 0
                  ? (isAr ? "يرجى إضافة عميل واحد ومنتج واحد على الأقل قبل إصدار أول فاتورة." : "Please add at least one customer and one product first.")
                  : customers.length === 0
                  ? (isAr ? "يرجى إضافة عميل في دليل العملاء أولاً." : "Please add a customer first.")
                  : (isAr ? "يرجى إضافة صنف / منتج في المخزن أولاً." : "Please add a product first.")}
              </p>
            </div>
            <div className="flex justify-center gap-3">
              {customers.length === 0 && (
                <a href="/customers" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs">
                  {isAr ? "إضافة عميل" : "Add Customer"}
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
          <form onSubmit={handleCreateInvoice} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "العميل *" : "Customer *"}</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-bold"
              >
                {customers.map(c => <option key={c.id} value={c.id}>{c.nameAr} ({c.code})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "تاريخ الفاتورة *" : "Invoice Date *"}</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "مستودع الصرف *" : "Warehouse *"}</label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
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
                  <th className="p-3 text-center w-24">{isAr ? "الكمية" : "Qty"}</th>
                  <th className="p-3 text-center w-32">{isAr ? "السعر" : "Price"}</th>
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
            <div className="p-2 bg-slate-950 flex justify-start">
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAr ? "إضافة سطر صنف جديد" : "Add Line Item"}</span>
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
                <span>{isAr ? ("الضريبة (" + organization.defaultVatRate + "%):") : "VAT:"}</span>
                <span className="font-mono font-bold text-emerald-400">{formatCurrency(taxTotal, organization.currency, locale)}</span>
              </div>
              <div className="flex justify-between text-base font-black text-white pt-2 border-t border-slate-800">
                <span>{isAr ? "الإجمالي النهائي:" : "Grand Total:"}</span>
                <span className="font-mono text-emerald-400">{formatCurrency(grandTotal, organization.currency, locale)}</span>
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
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition-colors"
            >
              {isAr ? "إصدار الفاتورة واعتماد القيد والمخزن" : "Issue Invoice & Post Journal"}
            </button>
          </div>
        </form>
        )}
      </Modal>

      <ZatcaInvoiceModal
        invoice={selectedInvoice}
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />
    </div>
  );
}
