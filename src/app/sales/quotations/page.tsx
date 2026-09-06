"use client";

import React, { useState, useMemo } from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency, formatDate, generateId } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import TableSkeleton from "@/components/ui/TableSkeleton";
import ZatcaInvoiceModal from "@/components/ui/ZatcaInvoiceModal";
import { SalesInvoice, SalesInvoiceItem } from "@/types/erp";
import {
  FileText, Plus, Search, Eye, Printer, Edit, Trash2,
  CheckCircle2, AlertCircle, Clock, Loader2, DollarSign,
  Tag, Calendar, User, Building, AlertTriangle, Send, Check
} from "lucide-react";

export default function SalesQuotationsPage() {
  const {
    salesInvoices, customers, products, warehouses,
    createSalesInvoice, updateSalesInvoice, deleteSalesInvoice,
    organization, activeBranchId, currentUser, locale, showToast,
    isLoadingData
  } = useERP();

  const isAr = locale === "ar";
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuote, setSelectedQuote] = useState<SalesInvoice | null>(null);
  const [printQuote, setPrintQuote] = useState<SalesInvoice | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<SalesInvoice | null>(null);
  const [deletingQuote, setDeletingQuote] = useState<SalesInvoice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [customerId, setCustomerId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString().split("T")[0]);
  const [warehouseId, setWarehouseId] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Omit<SalesInvoiceItem, "id">[]>([]);

  // Filter only quotations
  const quotationsList = useMemo(() => {
    return salesInvoices.filter(inv => inv.invoiceType === "quotation");
  }, [salesInvoices]);

  // Metrics
  const metrics = useMemo(() => {
    const totalValue = quotationsList.reduce((sum, q) => sum + (Number(q.grandTotal) || 0), 0);
    const count = quotationsList.length;
    return { totalValue, count };
  }, [quotationsList]);

  // Open Create Modal
  const handleOpenAddModal = () => {
    setFormError(null);
    setEditingQuote(null);
    const defaultWh = warehouses.find(w => w.isDefault)?.id || warehouses[0]?.id || "";

    setCustomerId("");
    setWarehouseId(defaultWh);
    setDate(new Date().toISOString().split("T")[0]);
    setDueDate(new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString().split("T")[0]);
    setDiscountType("percentage");
    setDiscountValue(0);
    setNotes("");
    setItems([]);
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (quote: SalesInvoice) => {
    setFormError(null);
    setEditingQuote(quote);
    setCustomerId(quote.customerId || "");
    setWarehouseId(quote.warehouseId || warehouses[0]?.id || "");
    setDate(quote.date || new Date().toISOString().split("T")[0]);
    setDueDate(quote.dueDate || quote.date || new Date().toISOString().split("T")[0]);
    setDiscountType(quote.discountType || "percentage");
    setDiscountValue(quote.discountValue || 0);
    setNotes(quote.notes || "");

    const quoteItems = (quote.items || []).map(it => ({
      productId: it.productId,
      productName: it.productName,
      warehouseId: it.warehouseId || quote.warehouseId || warehouses[0]?.id || "",
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      costPrice: it.costPrice,
      discountPercent: it.discountPercent || 0,
      discountAmount: it.discountAmount || 0,
      taxRate: it.taxRate,
      taxAmount: it.taxAmount,
      total: it.total,
    }));
    setItems(quoteItems);
    setIsAddModalOpen(true);
  };

  // Add Item Line
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

  // Select Product in Line
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
  };

  // Update Line Item
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

  // Live Recalculations
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

  // Handle Save Quote
  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cust = customers.find(c => c.id === customerId);
    if (!cust) {
      setFormError(isAr ? "يرجى اختيار العميل أولاً" : "Please select a customer first");
      return;
    }

    if (items.length === 0) {
      setFormError(isAr ? "يرجى إضافة صنف واحد على الأقل لعرض السعر" : "Please add at least one line item");
      return;
    }

    if (items.some(it => !it.productId)) {
      setFormError(isAr ? "يرجى تحديد كافة الأصناف" : "Please select a product for all items");
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingQuote) {
        await updateSalesInvoice(editingQuote.id, {
          customerId: cust.id,
          customerName: cust.nameAr,
          customerTaxNumber: cust.taxNumber,
          warehouseId: warehouseId || warehouses[0]?.id || "00000000-0000-0000-0000-000000000004",
          date,
          dueDate,
          items: items.map(item => ({ ...item, id: generateId() })),
          subtotal: itemsSubtotal,
          discountType,
          discountValue,
          discountTotal: calculatedDiscountTotal,
          taxTotal: calculatedTaxTotal,
          grandTotal,
          paidAmount: 0,
          dueAmount: grandTotal,
          notes: notes || "عرض أسعار رسمي معتمد",
        });

        setIsAddModalOpen(false);
        setEditingQuote(null);
        showToast(isAr ? `تم تحديث عرض السعر ${editingQuote.invoiceNumber} بنجاح` : "Quotation updated successfully", "success");
      } else {
        const quoteNumber = `QUOT-${new Date().getFullYear()}-${(quotationsList.length + 1).toString().padStart(4, "0")}`;

        const created = await createSalesInvoice({
          organizationId: organization.id,
          branchId: activeBranchId,
          invoiceType: "quotation",
          invoiceNumber: quoteNumber,
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
          subtotal: itemsSubtotal,
          discountType,
          discountValue,
          discountTotal: calculatedDiscountTotal,
          taxTotal: calculatedTaxTotal,
          grandTotal,
          paidAmount: 0,
          dueAmount: grandTotal,
          notes: notes || (isAr ? "عرض أسعار رسمي معتمد" : "Official Sales Quotation"),
          createdBy: currentUser.name,
        });

        setIsAddModalOpen(false);
        setSelectedQuote(created);
        showToast(isAr ? `تم إنشاء عرض السعر (${quoteNumber}) بنجاح` : "Quotation created successfully", "success");
      }
    } catch (err: any) {
      console.error("Failed to save quotation:", err);
      const errMsg = err?.message || (isAr ? "فشل حفظ عرض السعر" : "Failed to save quotation");
      setFormError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Quote
  const handleConfirmDelete = async () => {
    if (!deletingQuote) return;
    setIsSubmitting(true);
    try {
      await deleteSalesInvoice(deletingQuote.id);
      setDeletingQuote(null);
      showToast(isAr ? `تم حذف عرض السعر ${deletingQuote.invoiceNumber}` : "Quotation deleted", "success");
    } catch (err: any) {
      console.error("Failed to delete quotation:", err);
      showToast(err?.message || (isAr ? "فشل حذف عرض السعر" : "Failed to delete"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredQuotes = quotationsList.filter(q => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (q.invoiceNumber || "").toLowerCase().includes(query) || (q.customerName || "").includes(query);
    }
    return true;
  });

  if (isLoadingData) {
    return <TableSkeleton rows={5} columns={7} summaryCards={2} isAr={isAr} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-emerald-400" />
            <span>{isAr ? "عروض الأسعار والصفقات (Quotations)" : "Sales Quotations"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAr ? "واجهة مخصصة ومستقلة لإنشاء وإدارة عروض الأسعار الرسمية دون التأثير على المخزون أو القيود المحاسبية" : "Standalone quotations workflow without altering stock or GL balances"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/60 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? "إنشاء عرض سعر جديد" : "New Quotation"}</span>
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
          <div className="text-xs text-slate-400 font-bold mb-1">{isAr ? "إجمالي عروض الأسعار المسجلة" : "Total Quotations"}</div>
          <div className="text-xl font-extrabold text-white font-mono">{metrics.count}</div>
        </div>
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
          <div className="text-xs text-slate-400 font-bold mb-1">{isAr ? "إجمالي القيمة التقديرية للعروض" : "Total Quotations Value"}</div>
          <div className="text-xl font-extrabold text-emerald-400 font-mono">{formatCurrency(metrics.totalValue, organization.currency, locale)}</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={isAr ? "بحث برقم عرض السعر أو اسم العميل..." : "Search quote number or customer..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-9 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Quotations Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                <th className="p-3.5 rounded-r-lg">#</th>
                <th className="p-3.5">{isAr ? "رقم العرض" : "Quote No"}</th>
                <th className="p-3.5">{isAr ? "العميل" : "Customer"}</th>
                <th className="p-3.5">{isAr ? "تاريخ العرض" : "Quote Date"}</th>
                <th className="p-3.5">{isAr ? "ساري حتى" : "Valid Until"}</th>
                <th className="p-3.5 text-center font-mono">{isAr ? "القيمة الإجمالية" : "Total Amount"}</th>
                <th className="p-3.5 text-center">{isAr ? "الحالة" : "Status"}</th>
                <th className="p-3.5 rounded-l-lg text-center">{isAr ? "الإجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500 font-bold">
                    {isAr ? "لا توجد عروض أسعار مسجلة." : "No quotations registered yet."}
                  </td>
                </tr>
              ) : (
                filteredQuotes.map((q, idx) => (
                  <tr key={q.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 text-slate-500 font-mono">{idx + 1}</td>
                    <td className="p-3.5 font-bold text-white font-mono flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span>{q.invoiceNumber}</span>
                    </td>
                    <td className="p-3.5 text-slate-200">{q.customerName}</td>
                    <td className="p-3.5 text-slate-400 font-mono">{formatDate(q.date, locale)}</td>
                    <td className="p-3.5 text-slate-400 font-mono">{formatDate(q.dueDate || q.date, locale)}</td>
                    <td className="p-3.5 text-center font-mono font-bold text-emerald-400">
                      {formatCurrency(q.grandTotal, organization.currency, locale)}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="px-2.5 py-1 bg-sky-500/10 text-sky-400 rounded-xl font-bold border border-sky-500/20 text-[11px]">
                        {isAr ? "عرض سعر رسمي" : "Quotation"}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedQuote(q)}
                          title={isAr ? "معاينة العرض" : "View"}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setPrintQuote(q)}
                          title={isAr ? "طباعة عرض السعر" : "Print"}
                          className="p-1.5 bg-slate-800 hover:bg-emerald-950/60 text-emerald-400 rounded-lg transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(q)}
                          title={isAr ? "تعديل عرض السعر" : "Edit"}
                          className="p-1.5 bg-slate-800 hover:bg-blue-950/60 text-blue-400 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingQuote(q)}
                          title={isAr ? "حذف عرض السعر" : "Delete"}
                          className="p-1.5 bg-slate-800 hover:bg-rose-950/60 text-rose-400 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE & EDIT QUOTATION MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => !isSubmitting && setIsAddModalOpen(false)}
        title={
          editingQuote
            ? (isAr ? `تعديل عرض السعر (${editingQuote.invoiceNumber})` : `Edit Quotation (${editingQuote.invoiceNumber})`)
            : (isAr ? "إنشاء عرض سعر جديد" : "New Sales Quotation")
        }
        size="2xl"
      >
        <form onSubmit={handleSubmitQuote} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {isAr ? "العميل *" : "Customer *"}
              </label>
              <select
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">{isAr ? "-- اختر العميل --" : "-- Select Customer --"}</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nameAr} {c.taxNumber ? `(ضريبة: ${c.taxNumber})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {isAr ? "المستودع المرجعي *" : "Warehouse *"}
              </label>
              <select
                required
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.nameAr}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {isAr ? "تاريخ العرض" : "Quote Date"}
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {isAr ? "صلاحية العرض حتى" : "Valid Until"}
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>{isAr ? "بنود عرض السعر" : "Quote Items"}</span>
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAr ? "إضافة بند" : "Add Item"}</span>
              </button>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3 space-y-2 max-h-60 overflow-y-auto">
              {items.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs font-bold">
                  {isAr ? "لم يتم إضافة أصناف بعد. اضغط على 'إضافة بند' لإدراج صنف في عرض السعر." : "No items added."}
                </div>
              ) : (
                items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                    <div className="col-span-5">
                      <select
                        required
                        value={item.productId}
                        onChange={(e) => handleSelectProduct(idx, e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="">{isAr ? "-- اختر الصنف --" : "-- Select Product --"}</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.sku} - {isAr ? p.nameAr : p.nameEn} ({p.sellingPrice} ج.م)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <input
                        type="number"
                        min="1"
                        placeholder={isAr ? "الكمية" : "Qty"}
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(idx, "quantity", e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white font-mono text-center focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="col-span-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder={isAr ? "السعر" : "Price"}
                        value={item.unitPrice}
                        onChange={(e) => handleUpdateItem(idx, "unitPrice", e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white font-mono text-center focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="col-span-2 text-center font-mono font-bold text-emerald-400 text-xs">
                      {formatCurrency(item.total, organization.currency, locale)}
                    </div>

                    <div className="col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Discount & Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {isAr ? "نوع الخصم" : "Discount Type"}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDiscountType("percentage")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        discountType === "percentage" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      % نسبة
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType("fixed")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        discountType === "fixed" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      مبلغ ثابت
                    </button>
                  </div>
                </div>

                <div className="w-32">
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {isAr ? "قيمة الخصم" : "Discount"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono text-center focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {isAr ? "ملاحظات وشروط العرض" : "Remarks"}
                </label>
                <input
                  type="text"
                  placeholder={isAr ? "مدة التسليم، شروط التوريد..." : "Terms & Conditions..."}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-2 text-xs divide-y divide-slate-800/80">
              <div className="flex justify-between py-1 text-slate-400">
                <span>{isAr ? "إجمالي البنود:" : "Items Subtotal:"}</span>
                <span className="font-mono text-white">{formatCurrency(itemsSubtotal, organization.currency, locale)}</span>
              </div>
              <div className="flex justify-between py-1 text-rose-400">
                <span>{isAr ? "قيمة الخصم:" : "Discount Amount:"}</span>
                <span className="font-mono">-{formatCurrency(calculatedDiscountTotal, organization.currency, locale)}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-400">
                <span>{isAr ? "ضريبة القيمة المضافة (14%):" : "VAT (14%):"}</span>
                <span className="font-mono text-white">+{formatCurrency(calculatedTaxTotal, organization.currency, locale)}</span>
              </div>
              <div className="flex justify-between py-2 font-bold text-sm text-emerald-400">
                <span>{isAr ? "إجمالي قيمة العرض:" : "Quotation Total:"}</span>
                <span className="font-mono">{formatCurrency(grandTotal, organization.currency, locale)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-95 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/60 transition-all cursor-pointer"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{editingQuote ? (isAr ? "تحديث العرض" : "Update Quote") : (isAr ? "حفظ عرض السعر" : "Save Quote")}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRM MODAL */}
      <Modal
        isOpen={!!deletingQuote}
        onClose={() => !isSubmitting && setDeletingQuote(null)}
        title={isAr ? "تأكيد حذف عرض السعر" : "Confirm Deletion"}
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400">
            <AlertTriangle className="w-8 h-8 shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-sm mb-0.5">{isAr ? "تأكيد الحذف" : "Confirm Delete"}</p>
              <p>{isAr ? `هل أنت متأكد من حذف عرض السعر رقم (${deletingQuote?.invoiceNumber})؟` : `Are you sure you want to delete quotation ${deletingQuote?.invoiceNumber}?`}</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setDeletingQuote(null)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirmDelete}
              className="flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-950/60 transition-all cursor-pointer"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isAr ? "نعم، حذف" : "Yes, Delete"}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* PRINT / VIEW MODAL */}
      {(selectedQuote || printQuote) && (
        <ZatcaInvoiceModal
          invoice={(selectedQuote || printQuote)!}
          isOpen={true}
          onClose={() => {
            setSelectedQuote(null);
            setPrintQuote(null);
          }}
        />
      )}
    </div>
  );
}
