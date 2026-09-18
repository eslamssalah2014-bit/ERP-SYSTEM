"use client";

import React, { useState, useMemo } from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency, formatDate, generateId } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import TableSkeleton from "@/components/ui/TableSkeleton";
import ZatcaInvoiceModal from "@/components/ui/ZatcaInvoiceModal";
import { SalesInvoice, SalesInvoiceItem, InvoiceStatus } from "@/types/erp";
import {
  ShoppingCart, Plus, Search, Filter, Eye, Printer, Edit,
  FileText, CheckCircle2, AlertCircle, Clock, Trash2, Loader2,
  Percent, DollarSign, Tag, Receipt, Check, X, AlertTriangle
} from "lucide-react";

export default function SalesInvoicesPage() {
  const {
    salesInvoices, customers, products, warehouses,
    createSalesInvoice, updateSalesInvoice, deleteSalesInvoice,
    organization, activeBranchId, currentUser, locale, showToast,
    isLoadingData, hasPermission
  } = useERP();

  const isAr = locale === "ar";
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "unpaid" | "partially_paid">("all");
  
  // Modals state
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [printInvoice, setPrintInvoice] = useState<SalesInvoice | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<SalesInvoice | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<SalesInvoice | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State (for Create & Edit)
  const [customerId, setCustomerId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split("T")[0]);
  const [warehouseId, setWarehouseId] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<InvoiceStatus>("unpaid");
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [items, setItems] = useState<Omit<SalesInvoiceItem, "id">[]>([]);
  const [productSearchTerms, setProductSearchTerms] = useState<Record<number, string>>({});

  // Filter only standard sales invoices (exclude quotations)
  const invoicesList = useMemo(() => {
    return salesInvoices.filter(inv => (inv.invoiceType || "tax_invoice") !== "quotation");
  }, [salesInvoices]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalSales = invoicesList.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
    const totalPaid = invoicesList.reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0);
    const totalDue = invoicesList.reduce((sum, inv) => sum + (Number(inv.dueAmount) || 0), 0);
    const count = invoicesList.length;
    return { totalSales, totalPaid, totalDue, count };
  }, [invoicesList]);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setFormError(null);
    setEditingInvoice(null);
    const defaultWh = warehouses.find(w => w.isDefault)?.id || warehouses[0]?.id || "";

    setCustomerId("");
    setWarehouseId(defaultWh);
    setDate(new Date().toISOString().split("T")[0]);
    setDueDate(new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split("T")[0]);
    setDiscountType("percentage");
    setDiscountValue(0);
    setStatus("unpaid");
    setPaidAmount(0);
    setNotes("");
    setProductSearchTerms({});
    setItems([]);
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (invoice: SalesInvoice) => {
    setFormError(null);
    setEditingInvoice(invoice);
    setCustomerId(invoice.customerId || "");
    setWarehouseId(invoice.warehouseId || warehouses[0]?.id || "");
    setDate(invoice.date || new Date().toISOString().split("T")[0]);
    setDueDate(invoice.dueDate || invoice.date || new Date().toISOString().split("T")[0]);
    setDiscountType(invoice.discountType || "percentage");
    setDiscountValue(invoice.discountValue || 0);
    setStatus(invoice.status || "unpaid");
    setPaidAmount(invoice.paidAmount || 0);
    setNotes(invoice.notes || "");
    setProductSearchTerms({});
    
    // Map items
    const invoiceItems = (invoice.items || []).map(it => ({
      productId: it.productId,
      productName: it.productName,
      warehouseId: it.warehouseId || invoice.warehouseId || warehouses[0]?.id || "",
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      costPrice: it.costPrice,
      discountPercent: it.discountPercent || 0,
      discountAmount: it.discountAmount || 0,
      taxRate: it.taxRate,
      taxAmount: it.taxAmount,
      total: it.total,
    }));
    setItems(invoiceItems);
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
      current.taxRate = (prod.taxRate !== undefined && prod.taxRate !== null && !isNaN(Number(prod.taxRate)))
        ? Number(prod.taxRate)
        : (organization.defaultVatRate || 0);

      const lineSubtotal = current.unitPrice * current.quantity;
      current.taxAmount = (lineSubtotal * current.taxRate) / 100;
      current.total = lineSubtotal + current.taxAmount;

      updated[index] = current;
      return updated;
    });

    setProductSearchTerms(prev => ({ ...prev, [index]: "" }));
  };

  // Update Line Item Field
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
  const calculatedDueAmount = Math.max(0, grandTotal - (Number(paidAmount) || 0));

  // Handle Save / Submit (Create or Edit)
  const handleSubmitInvoice = async (e: React.FormEvent) => {
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
      if (editingInvoice) {
        // UPDATE MODE
        await updateSalesInvoice(editingInvoice.id, {
          customerId: cust.id,
          customerName: cust.nameAr,
          customerTaxNumber: cust.taxNumber,
          warehouseId: warehouseId || warehouses[0]?.id || "00000000-0000-0000-0000-000000000004",
          date,
          dueDate,
          status,
          items: items.map(item => ({ ...item, id: generateId() })),
          subtotal: itemsSubtotal,
          discountType,
          discountValue,
          discountTotal: calculatedDiscountTotal,
          taxTotal: calculatedTaxTotal,
          grandTotal,
          paidAmount: Number(paidAmount) || 0,
          dueAmount: calculatedDueAmount,
          notes: notes || "فاتورة مبيعات إلكترونية معتمدة",
        });

        setIsAddModalOpen(false);
        setEditingInvoice(null);
        showToast(isAr ? `تم تحديث الفاتورة ${editingInvoice.invoiceNumber} بنجاح` : "Invoice updated successfully", "success");
      } else {
        // CREATE MODE
        const currentYear = new Date().getFullYear();
        const yearPrefix = `INV-${currentYear}-`;
        let maxSeq = 0;
        invoicesList.forEach(inv => {
          if (inv.invoiceNumber?.startsWith(yearPrefix)) {
            const n = parseInt(inv.invoiceNumber.substring(yearPrefix.length), 10);
            if (!isNaN(n) && n > maxSeq) maxSeq = n;
          }
        });
        const invoiceNumber = `${yearPrefix}${(maxSeq + 1).toString().padStart(4, "0")}`;

        const created = await createSalesInvoice({
          organizationId: organization.id,
          branchId: activeBranchId,
          invoiceType: "tax_invoice",
          invoiceNumber,
          date,
          dueDate,
          customerId: cust.id,
          customerName: cust.nameAr,
          customerTaxNumber: cust.taxNumber,
          salesRepId: currentUser.id,
          salesRepName: currentUser.name,
          warehouseId: warehouseId || warehouses[0]?.id || "00000000-0000-0000-0000-000000000004",
          status,
          items: items.map(item => ({ ...item, id: generateId() })),
          subtotal: itemsSubtotal,
          discountType,
          discountValue,
          discountTotal: calculatedDiscountTotal,
          taxTotal: calculatedTaxTotal,
          grandTotal,
          paidAmount: Number(paidAmount) || 0,
          dueAmount: calculatedDueAmount,
          notes: notes || (isAr ? "فاتورة مبيعات إلكترونية معتمدة" : "Standard Sales Invoice"),
          createdBy: currentUser.name,
        });

        setIsAddModalOpen(false);
        setSelectedInvoice(created);
        showToast(isAr ? `تم إصدار الفاتورة الضريبية (${invoiceNumber}) بنجاح` : "Invoice issued successfully", "success");
      }
    } catch (err: any) {
      console.error("Failed to save sales invoice:", err);
      const errMsg = err?.message || (isAr ? "فشل حفظ الفاتورة، يرجى المحاولة مرة أخرى" : "Failed to save invoice");
      setFormError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Invoice
  const handleConfirmDelete = async () => {
    if (!deletingInvoice) return;
    setIsSubmitting(true);
    try {
      await deleteSalesInvoice(deletingInvoice.id);
      setDeletingInvoice(null);
      showToast(isAr ? `تم حذف الفاتورة ${deletingInvoice.invoiceNumber} نهائياً` : "Invoice permanently deleted", "success");
    } catch (err: any) {
      console.error("Failed to delete invoice:", err);
      showToast(err?.message || (isAr ? "فشل حذف الفاتورة" : "Failed to delete invoice"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered List
  const filteredInvoices = invoicesList.filter(inv => {
    if (statusFilter !== "all" && inv.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (inv.invoiceNumber || "").toLowerCase().includes(q) || (inv.customerName || "").toLowerCase().includes(q);
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
            <span>{isAr ? "فواتير المبيعات الضريبية" : "Tax Sales Invoices"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAr ? "إصدار وإدارة وتعديل الفواتير الضريبية الإلكترونية مع الترحيل التلقائي للمخزون والقيود" : "Manage sales invoices with automatic inventory and GL posting"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/60 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? "إصدار فاتورة مبيعات جديدة" : "New Sales Invoice"}</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
          <div className="text-xs text-slate-400 font-bold mb-1">{isAr ? "إجمالي الفواتير الصادرة" : "Total Invoices"}</div>
          <div className="text-xl font-extrabold text-white font-mono">{metrics.count}</div>
        </div>
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
          <div className="text-xs text-slate-400 font-bold mb-1">{isAr ? "إجمالي المبيعات" : "Total Sales"}</div>
          <div className="text-xl font-extrabold text-emerald-400 font-mono">{formatCurrency(metrics.totalSales, organization.currency, locale)}</div>
        </div>
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
          <div className="text-xs text-slate-400 font-bold mb-1">{isAr ? "المبالغ المحصلة" : "Total Paid"}</div>
          <div className="text-xl font-extrabold text-teal-400 font-mono">{formatCurrency(metrics.totalPaid, organization.currency, locale)}</div>
        </div>
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
          <div className="text-xs text-slate-400 font-bold mb-1">{isAr ? "المبالغ المستحقة (المتبقية)" : "Total Due"}</div>
          <div className="text-xl font-extrabold text-amber-400 font-mono">{formatCurrency(metrics.totalDue, organization.currency, locale)}</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              statusFilter === "all" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {isAr ? "الكل" : "All"} ({invoicesList.length})
          </button>
          <button
            onClick={() => setStatusFilter("paid")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              statusFilter === "paid" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {isAr ? "مدفوعة" : "Paid"} ({invoicesList.filter(i => i.status === "paid").length})
          </button>
          <button
            onClick={() => setStatusFilter("unpaid")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              statusFilter === "unpaid" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {isAr ? "غير مدفوعة (آجلة)" : "Unpaid"} ({invoicesList.filter(i => i.status === "unpaid").length})
          </button>
          <button
            onClick={() => setStatusFilter("partially_paid")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              statusFilter === "partially_paid" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {isAr ? "مدفوعة جزئياً" : "Partially Paid"} ({invoicesList.filter(i => i.status === "partially_paid").length})
          </button>
        </div>

        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={isAr ? "بحث برقم الفاتورة أو اسم العميل..." : "Search invoice number or customer..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-9 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                <th className="p-3.5 rounded-r-lg">#</th>
                <th className="p-3.5">{isAr ? "رقم الفاتورة" : "Invoice No"}</th>
                <th className="p-3.5">{isAr ? "العميل" : "Customer"}</th>
                <th className="p-3.5">{isAr ? "تاريخ الإصدار" : "Date"}</th>
                <th className="p-3.5 text-center font-mono">{isAr ? "الإجمالي قبل الضريبة" : "Subtotal"}</th>
                <th className="p-3.5 text-center font-mono">{isAr ? "الضريبة (14%)" : "Tax (14%)"}</th>
                <th className="p-3.5 text-center font-mono">{isAr ? "الصافي الإجمالي" : "Grand Total"}</th>
                <th className="p-3.5 text-center">{isAr ? "حالة الدفع" : "Status"}</th>
                <th className="p-3.5 rounded-l-lg text-center">{isAr ? "الإجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-500 font-bold">
                    {isAr ? "لا توجد فواتير مبيعات مطابقة لمعايير البحث." : "No sales invoices found."}
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv, idx) => (
                  <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 text-slate-500 font-mono">{idx + 1}</td>
                    <td className="p-3.5 font-bold text-white font-mono flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{inv.invoiceNumber}</span>
                    </td>
                    <td className="p-3.5 text-slate-200">
                      <div className="font-bold">{inv.customerName}</div>
                      {inv.customerTaxNumber && (
                        <div className="text-[10px] text-slate-500 font-mono">{inv.customerTaxNumber}</div>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-400 font-mono">{formatDate(inv.date, locale)}</td>
                    <td className="p-3.5 text-center font-mono text-slate-300">
                      {formatCurrency(inv.subtotal - (inv.discountTotal || 0), organization.currency, locale)}
                    </td>
                    <td className="p-3.5 text-center font-mono text-slate-400">
                      {formatCurrency(inv.taxTotal, organization.currency, locale)}
                    </td>
                    <td className="p-3.5 text-center font-mono font-bold text-emerald-400">
                      {formatCurrency(inv.grandTotal, organization.currency, locale)}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`px-2.5 py-1 rounded-xl font-bold border text-[11px] ${
                        inv.status === "paid"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : inv.status === "partially_paid"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      }`}>
                        {inv.status === "paid" ? (isAr ? "مدفوعة" : "Paid") : inv.status === "partially_paid" ? (isAr ? "جزئي" : "Partial") : (isAr ? "آجلة / غير مسددة" : "Unpaid")}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* View Invoice */}
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          title={isAr ? "عرض الفاتورة" : "View Details"}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Print Invoice */}
                        <button
                          onClick={() => setPrintInvoice(inv)}
                          title={isAr ? "طباعة الفاتورة" : "Print Invoice"}
                          className="p-1.5 bg-slate-800 hover:bg-emerald-950/60 text-emerald-400 rounded-lg transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Invoice */}
                        <button
                          onClick={() => handleOpenEditModal(inv)}
                          title={isAr ? "تعديل الفاتورة" : "Edit Invoice"}
                          className="p-1.5 bg-slate-800 hover:bg-blue-950/60 text-blue-400 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Invoice */}
                        <button
                          onClick={() => setDeletingInvoice(inv)}
                          title={isAr ? "حذف الفاتورة" : "Delete Invoice"}
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

      {/* CREATE & EDIT INVOICE MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => !isSubmitting && setIsAddModalOpen(false)}
        title={
          editingInvoice
            ? (isAr ? `تعديل فاتورة المبيعات (${editingInvoice.invoiceNumber})` : `Edit Invoice (${editingInvoice.invoiceNumber})`)
            : (isAr ? "إصدار فاتورة مبيعات ضريبية جديدة" : "New Tax Sales Invoice")
        }
        size="2xl"
      >
        <form onSubmit={handleSubmitInvoice} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Customer & Warehouse Selection */}
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
                {isAr ? "مستودع الصرف *" : "Warehouse *"}
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

          {/* Dates & Payment Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {isAr ? "تاريخ الفاتورة" : "Invoice Date"}
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
                {isAr ? "تاريخ الاستحقاق" : "Due Date"}
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {isAr ? "حالة الدفع" : "Payment Status"}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="unpaid">{isAr ? "غير مسددة (آجلة)" : "Unpaid"}</option>
                <option value="paid">{isAr ? "مسددة بالكامل (نقداً)" : "Paid in Full"}</option>
                <option value="partially_paid">{isAr ? "مسددة جزئياً" : "Partially Paid"}</option>
              </select>
            </div>
          </div>

          {/* Line Items Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>{isAr ? "بنود وأصناف الفاتورة" : "Invoice Items"}</span>
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
                  {isAr ? "لم يتم إضافة أي أصناف بعد. اضغط على 'إضافة بند' لإدراج صنف." : "No items added yet."}
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

          {/* Discount & Totals Breakdown */}
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
                  {isAr ? "ملاحظات الفاتورة" : "Notes"}
                </label>
                <input
                  type="text"
                  placeholder={isAr ? "شروط الدفع أو تفاصيل إضافية..." : "Invoice remarks..."}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Calculations Summary */}
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
                <span>{isAr ? "الصافي الإجمالي المستحق:" : "Grand Total:"}</span>
                <span className="font-mono">{formatCurrency(grandTotal, organization.currency, locale)}</span>
              </div>
            </div>
          </div>

          {/* Form Actions */}
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
              <span>{editingInvoice ? (isAr ? "تحديث الفاتورة" : "Update Invoice") : (isAr ? "إصدار الفاتورة" : "Issue Invoice")}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={!!deletingInvoice}
        onClose={() => !isSubmitting && setDeletingInvoice(null)}
        title={isAr ? "تأكيد حذف الفاتورة نهائياً" : "Confirm Permanent Deletion"}
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400">
            <AlertTriangle className="w-8 h-8 shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-sm mb-0.5">{isAr ? "تحذير: هذا الإجراء لا يمكن التراجع عنه" : "Warning: Irreversible action"}</p>
              <p>{isAr ? `سيتم حذف الفاتورة رقم (${deletingInvoice?.invoiceNumber}) وكافة قيودها اليومية وحركات المخزن المرتبطة بها.` : `Invoice ${deletingInvoice?.invoiceNumber} and all linked records will be deleted.`}</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setDeletingInvoice(null)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              {isAr ? "تراجع" : "Cancel"}
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirmDelete}
              className="flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-950/60 transition-all cursor-pointer"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isAr ? "نعم، حذف الفاتورة" : "Yes, Delete"}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* PRINT / ZATCA INVOICE VIEW MODAL */}
      {(selectedInvoice || printInvoice) && (
        <ZatcaInvoiceModal
          invoice={(selectedInvoice || printInvoice)!}
          isOpen={true}
          onClose={() => {
            setSelectedInvoice(null);
            setPrintInvoice(null);
          }}
        />
      )}
    </div>
  );
}
