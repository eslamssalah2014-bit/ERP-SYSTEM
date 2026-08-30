"use client";

import React, { useState, useMemo } from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency, formatDate, generateId } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import TableSkeleton from "@/components/ui/TableSkeleton";
import ZatcaInvoiceModal from "@/components/ui/ZatcaInvoiceModal";
import { SalesInvoice, SalesInvoiceItem } from "@/types/erp";
import {
  ShoppingCart, Plus, Search, Filter, Eye, Printer,
  FileText, CheckCircle2, AlertCircle, Clock, Trash2, Loader2,
  Percent, DollarSign, Tag, Receipt, FileSpreadsheet
} from "lucide-react";

export default function SalesInvoicesPage() {
  const {
    salesInvoices, customers, products, warehouses,
    createSalesInvoice, organization, activeBranchId,
    currentUser, locale, showToast, isLoadingData
  } = useERP();

  const isAr = locale === "ar";
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "tax_invoice" | "quotation">("all");
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // New Invoice Form State
  const [invoiceType, setInvoiceType] = useState<"tax_invoice" | "quotation">("tax_invoice");
  const [customerId, setCustomerId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split("T")[0]);
  const [warehouseId, setWarehouseId] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Omit<SalesInvoiceItem, "id">[]>([]);

  // Product quick-search state inside modal
  const [productSearchTerms, setProductSearchTerms] = useState<Record<number, string>>({});

  const handleOpenAddModal = () => {
    setFormError(null);
    setInvoiceType("tax_invoice");
    const defaultWh = warehouses.find(w => w.isDefault)?.id || warehouses[0]?.id || "";

    setCustomerId("");
    setWarehouseId(defaultWh);
    setDate(new Date().toISOString().split("T")[0]);
    setDueDate(new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split("T")[0]);
    setDiscountType("percentage");
    setDiscountValue(0);
    setNotes("");
    setProductSearchTerms({});
    setItems([]);
    setIsAddModalOpen(true);
  };

  const handleAddItem = () => {
    const currentWh = warehouseId || warehouses[0]?.id || "";
    setItems(prev => [
      ...prev,
      {
        productId: "",
        productName: "",
        warehouseId: currentWh,
        quantity: 1,
        unitPrice: 0,
        costPrice: 0,
        discountPercent: 0,
        discountAmount: 0,
        taxRate: organization.defaultVatRate,
        taxAmount: 0,
        total: 0,
      }
    ]);
  };

  const handleSelectProduct = (index: number, prodId: string) => {
    const prod = products.find(p => p.id === prodId);
    if (!prod) return;

    setItems(prev => {
      const updated = [...prev];
      const current = { ...updated[index] };
      current.productId = prod.id;
      current.productName = isAr ? prod.nameAr : prod.nameEn;
      current.unitPrice = prod.sellingPrice;
      current.costPrice = prod.costPrice;
      current.taxRate = organization.defaultVatRate;

      const lineSubtotal = current.unitPrice * current.quantity;
      current.taxAmount = (lineSubtotal * current.taxRate) / 100;
      current.total = lineSubtotal + current.taxAmount;

      updated[index] = current;
      return updated;
    });

    setProductSearchTerms(prev => ({ ...prev, [index]: "" }));
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    setItems(prev => {
      const updated = [...prev];
      const current = { ...updated[index] };

      if (field === "quantity") {
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

  // Live Recalculations for Invoice
  const itemsSubtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  }, [items]);

  const calculatedDiscountTotal = useMemo(() => {
    if (discountType === "percentage") {
      const pct = Math.min(100, Math.max(0, Number(discountValue) || 0));
      return (itemsSubtotal * pct) / 100;
    } else {
      return Math.min(itemsSubtotal, Math.max(0, Number(discountValue) || 0));
    }
  }, [itemsSubtotal, discountType, discountValue]);

  const netSubtotal = Math.max(0, itemsSubtotal - calculatedDiscountTotal);

  const calculatedTaxTotal = useMemo(() => {
    if (itemsSubtotal <= 0) return 0;
    const discountRatio = itemsSubtotal > 0 ? netSubtotal / itemsSubtotal : 1;
    return items.reduce((sum, item) => {
      const discountedLine = (item.unitPrice * item.quantity) * discountRatio;
      return sum + (discountedLine * item.taxRate) / 100;
    }, 0);
  }, [items, itemsSubtotal, netSubtotal]);

  const grandTotal = netSubtotal + calculatedTaxTotal;

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cust = customers.find(c => c.id === customerId);
    if (!cust) {
      setFormError(isAr ? "يرجى اختيار العميل أولاً من القائمة" : "Please select a customer first");
      return;
    }

    if (items.length === 0) {
      setFormError(isAr ? "يرجى إضافة صنف واحد على الأقل للفاتورة" : "Please add at least one line item");
      return;
    }

    if (items.some(it => !it.productId)) {
      setFormError(isAr ? "يرجى تحديد كافة الأصناف في بنود الفاتورة" : "Please select a product for all invoice items");
      return;
    }

    setIsSubmitting(true);

    try {
      const prefix = invoiceType === "quotation" ? "QUOT" : "INV";
      const invoiceNumber = `${prefix}-${new Date().getFullYear()}-${(salesInvoices.length + 1).toString().padStart(4, "0")}`;

      const created = await createSalesInvoice({
        organizationId: organization.id,
        branchId: activeBranchId,
        invoiceType,
        invoiceNumber,
        date,
        dueDate,
        customerId: cust.id,
        customerName: cust.nameAr,
        customerTaxNumber: cust.taxNumber,
        salesRepId: currentUser.id,
        salesRepName: currentUser.name,
        warehouseId: warehouseId || warehouses[0]?.id || "00000000-0000-0000-0000-000000000004",
        status: invoiceType === "quotation" ? "unpaid" : "unpaid",
        items: items.map(item => ({ ...item, id: generateId() })),
        subtotal: itemsSubtotal,
        discountType,
        discountValue,
        discountTotal: calculatedDiscountTotal,
        taxTotal: calculatedTaxTotal,
        grandTotal,
        paidAmount: 0,
        dueAmount: grandTotal,
        notes: notes || (invoiceType === "quotation" ? (isAr ? "عرض أسعار رسمي" : "Sales Quotation") : (isAr ? "فاتورة مبيعات إلكترونية معتمدة" : "Standard Sales Invoice")),
        createdBy: currentUser.name,
      });

      setIsAddModalOpen(false);
      setSelectedInvoice(created);
      showToast(
        isAr
          ? (invoiceType === "quotation" ? `تم إنشاء عرض الأسعار (${invoiceNumber}) بنجاح` : `تم إصدار الفاتورة الضريبية (${invoiceNumber}) وترحيل المخزن والقيد`)
          : "Saved successfully",
        "success"
      );
    } catch (err: any) {
      console.error("Failed to create sales invoice:", err);
      const errMsg = err?.message || (isAr ? "فشل إصدار الفاتورة، يرجى المحاولة مرة أخرى" : "Failed to issue invoice");
      setFormError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredInvoices = salesInvoices.filter(inv => {
    if (typeFilter !== "all") {
      const invType = inv.invoiceType || "tax_invoice";
      if (invType !== typeFilter) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (inv.invoiceNumber || "").toLowerCase().includes(q) || (inv.customerName || "").includes(q);
    }
    return true;
  });

  if (isLoadingData) {
    return <TableSkeleton rows={6} columns={8} summaryCards={4} isAr={isAr} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <ShoppingCart className="w-6 h-6 text-emerald-400" />
            <span>{isAr ? "فواتير المبيعات وعروض الأسعار" : "Sales Invoices & Quotations"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAr ? "إصدار وإدارة الفواتير الضريبية وعروض الأسعار الإلكترونية مع الخصومات المباشرة" : "Issue tax invoices, quotations with percentage/fixed discounts"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/sales/returns"
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all cursor-pointer"
          >
            <Receipt className="w-4 h-4 text-amber-400" />
            <span>{isAr ? "مرتجعات المبيعات (إشعارات دائنة)" : "Sales Returns"}</span>
          </a>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/60 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? "إصدار فاتورة / عرض أسعار جديد" : "New Invoice / Quotation"}</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTypeFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              typeFilter === "all" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {isAr ? "الكل" : "All"} ({salesInvoices.length})
          </button>
          <button
            onClick={() => setTypeFilter("tax_invoice")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              typeFilter === "tax_invoice" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {isAr ? "فواتير ضريبية" : "Tax Invoices"} ({salesInvoices.filter(i => (i.invoiceType || "tax_invoice") === "tax_invoice").length})
          </button>
          <button
            onClick={() => setTypeFilter("quotation")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              typeFilter === "quotation" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {isAr ? "عروض أسعار" : "Quotations"} ({salesInvoices.filter(i => i.invoiceType === "quotation").length})
          </button>
        </div>

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

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                <th className="p-3.5 rounded-r-lg">#</th>
                <th className="p-3.5">{isAr ? "النوع" : "Type"}</th>
                <th className="p-3.5">{isAr ? "رقم الفاتورة" : "Invoice No"}</th>
                <th className="p-3.5">{isAr ? "تاريخ الإصدار" : "Date"}</th>
                <th className="p-3.5">{isAr ? "العميل" : "Customer"}</th>
                <th className="p-3.5 text-center font-mono">{isAr ? "المجموع" : "Subtotal"}</th>
                <th className="p-3.5 text-center font-mono">{isAr ? "الخصم" : "Discount"}</th>
                <th className="p-3.5 text-center font-mono">{isAr ? "الضريبة" : "VAT"}</th>
                <th className="p-3.5 text-center font-mono">{isAr ? "الإجمالي الصافي" : "Grand Total"}</th>
                <th className="p-3.5 text-center">{isAr ? "الحالة" : "Status"}</th>
                <th className="p-3.5 rounded-l-lg text-center">{isAr ? "عرض" : "View"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredInvoices.map((inv, idx) => {
                const isQuot = inv.invoiceType === "quotation";
                return (
                  <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3.5 text-slate-500 font-mono">{idx + 1}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        isQuot ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      }`}>
                        {isQuot ? (isAr ? "عرض أسعار" : "Quotation") : (isAr ? "فاتورة ضريبية" : "Tax Invoice")}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="font-mono font-bold text-white flex items-center gap-1.5">
                        <span>{inv.invoiceNumber}</span>
                        {!isQuot && (
                          <span className="text-[9px] px-1 bg-emerald-500/20 text-emerald-400 rounded">
                            QR
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-400 font-sans">{formatDate(inv.date, locale)}</td>
                    <td className="p-3.5 font-bold text-slate-200">{inv.customerName}</td>
                    <td className="p-3.5 text-center font-mono text-slate-400">
                      {formatCurrency(inv.subtotal, organization.currency, locale)}
                    </td>
                    <td className="p-3.5 text-center font-mono text-rose-400">
                      {inv.discountTotal ? formatCurrency(inv.discountTotal, organization.currency, locale) : "-"}
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
                        className="px-3 py-1.5 bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{isAr ? "عرض الفاتورة" : "View"}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-slate-500">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-2 stroke-[1.5] text-slate-700" />
                    <p className="text-sm font-semibold text-slate-400">
                      {isAr ? "لا توجد فواتير مبيعات مسجلة" : "No sales invoices found"}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      {isAr ? "اضغط على زر (إصدار فاتورة جديدة) للبدء" : "Click 'New Invoice' to get started"}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Invoice Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => !isSubmitting && setIsAddModalOpen(false)}
        title={isAr ? "تحرير فاتورة مبيعات / عرض أسعار جديد" : "New Sales Invoice / Quotation"}
        maxWidth="4xl"
      >
        {customers.length === 0 || products.length === 0 ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 text-center space-y-4">
            <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
            <div>
              <h3 className="text-sm font-bold text-white mb-1">
                {isAr ? "متطلبات إصدار الفاتورة" : "Invoice Prerequisites Required"}
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
            {formError && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Invoice Type & Core Info */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "نوع المستند *" : "Document Type *"}</label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setInvoiceType("tax_invoice")}
                    className={`py-1.5 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                      invoiceType === "tax_invoice" ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {isAr ? "فاتورة ضريبية" : "Tax Invoice"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoiceType("quotation")}
                    className={`py-1.5 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                      invoiceType === "quotation" ? "bg-amber-600 text-white shadow" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {isAr ? "عرض أسعار" : "Quotation"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "العميل *" : "Customer *"}</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-bold"
                >
                  <option value="">{isAr ? "-- اختر العميل من القائمة --" : "-- Select Customer --"}</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nameAr} ({c.code}){c.categoryName ? ` [${c.categoryName}]` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "تاريخ الإصدار *" : "Date *"}</label>
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

            {/* Line Items Table with Instant Product Search */}
            <div className="border border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="bg-slate-800 text-slate-400 font-bold">
                    <th className="p-3">{isAr ? "الصنف (الاسم / الباركود / SKU)" : "Product (Name / Barcode / SKU)"}</th>
                    <th className="p-3 text-center w-24">{isAr ? "الكمية" : "Qty"}</th>
                    <th className="p-3 text-center w-32">{isAr ? "سعر الوحدة" : "Unit Price"}</th>
                    <th className="p-3 text-center w-24">{isAr ? "الضريبة %" : "VAT %"}</th>
                    <th className="p-3 text-left w-32">{isAr ? "الإجمالي" : "Total"}</th>
                    <th className="p-3 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-950/60">
                  {items.map((item, idx) => {
                    const searchTerm = (productSearchTerms[idx] || "").toLowerCase();
                    const filteredProds = searchTerm
                      ? products.filter(p =>
                          (p.nameAr || "").toLowerCase().includes(searchTerm) ||
                          (p.nameEn || "").toLowerCase().includes(searchTerm) ||
                          (p.barcode || "").toLowerCase().includes(searchTerm) ||
                          (p.sku || "").toLowerCase().includes(searchTerm)
                        )
                      : products;

                    return (
                      <tr key={idx}>
                        <td className="p-2">
                          <div className="space-y-1">
                            <select
                              value={item.productId}
                              onChange={(e) => handleSelectProduct(idx, e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-bold"
                            >
                              <option value="">{isAr ? "-- اختر الصنف من القائمة --" : "-- Select Product --"}</option>
                              {filteredProds.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.nameAr} {p.barcode ? `(${p.barcode})` : ""} {p.sku ? `[${p.sku}]` : ""} - {p.sellingPrice} {organization.currency}
                                </option>
                              ))}
                            </select>
                            {products.length > 5 && (
                              <input
                                type="text"
                                placeholder={isAr ? "🔍 تصفية بالاسم أو الباركود..." : "🔍 Search by name/barcode..."}
                                value={productSearchTerms[idx] || ""}
                                onChange={(e) => setProductSearchTerms({ ...productSearchTerms, [idx]: e.target.value })}
                                className="w-full bg-slate-950/80 border border-slate-800/80 rounded px-2 py-0.5 text-[10px] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                              />
                            )}
                          </div>
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
                              className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="p-2 bg-slate-950 flex justify-start">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAr ? "إضافة سطر صنف جديد" : "Add Line Item"}</span>
                </button>
              </div>
            </div>

            {/* Discount Section & Totals Calculation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Discount Box */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-slate-300 font-bold">
                  <Percent className="w-4 h-4 text-emerald-400" />
                  <span>{isAr ? "قسم الخصم على الفاتورة" : "Invoice Discount"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">{isAr ? "نوع الخصم" : "Discount Type"}</label>
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-bold"
                    >
                      <option value="percentage">{isAr ? "نسبة مئوية (%)" : "Percentage (%)"}</option>
                      <option value="fixed">{isAr ? "مبلغ ثابت (مقطوع)" : "Fixed Amount"}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">
                      {isAr ? (discountType === "percentage" ? "نسبة الخصم %" : "قيمة الخصم") : "Discount Value"}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={discountType === "percentage" ? 100 : itemsSubtotal}
                      step="any"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono font-bold text-center"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">{isAr ? "ملاحظات الفاتورة" : "Invoice Notes"}</label>
                  <input
                    type="text"
                    placeholder={isAr ? "ملاحظات أو شروط الدفع..." : "Notes or payment terms..."}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white placeholder:text-slate-600"
                  />
                </div>
              </div>

              {/* Totals Summary */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex justify-between text-slate-400">
                  <span>{isAr ? "المجموع قبل الخصم:" : "Subtotal:"}</span>
                  <span className="font-mono font-bold text-white">{formatCurrency(itemsSubtotal, organization.currency, locale)}</span>
                </div>
                {calculatedDiscountTotal > 0 && (
                  <div className="flex justify-between text-rose-400">
                    <span>{isAr ? `الخصم (${discountType === "percentage" ? discountValue + "%" : "مبلغ"}):` : "Discount:"}</span>
                    <span className="font-mono font-bold">-{formatCurrency(calculatedDiscountTotal, organization.currency, locale)}</span>
                  </div>
                )}
                {calculatedDiscountTotal > 0 && (
                  <div className="flex justify-between text-slate-300">
                    <span>{isAr ? "الصافي الخاضع للضريبة:" : "Net Taxable:"}</span>
                    <span className="font-mono font-bold text-white">{formatCurrency(netSubtotal, organization.currency, locale)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400">
                  <span>{isAr ? `ضريبة القيمة المضافة (${organization.defaultVatRate}%):` : "VAT:"}</span>
                  <span className="font-mono font-bold text-emerald-400">{formatCurrency(calculatedTaxTotal, organization.currency, locale)}</span>
                </div>
                <div className="flex justify-between text-base font-black text-white pt-2 border-t border-slate-800">
                  <span>{isAr ? "الإجمالي الصافي النهائي:" : "Grand Total:"}</span>
                  <span className="font-mono text-emerald-400">{formatCurrency(grandTotal, organization.currency, locale)}</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
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
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isAr ? "جاري الحفظ والترحيل..." : "Saving & Posting..."}</span>
                  </>
                ) : (
                  <span>
                    {invoiceType === "quotation"
                      ? (isAr ? "حفظ عرض الأسعار" : "Save Quotation")
                      : (isAr ? "إصدار الفاتورة الضريبية والترحيل" : "Issue Tax Invoice & Post")}
                  </span>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Tax Invoice QR / Print Modal */}
      <ZatcaInvoiceModal
        invoice={selectedInvoice}
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />
    </div>
  );
}
