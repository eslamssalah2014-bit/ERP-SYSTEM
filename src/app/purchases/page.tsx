"use client";

import React, { useState, useMemo } from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency, formatDate, generateId } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import TableSkeleton from "@/components/ui/TableSkeleton";
import { PurchaseInvoice, PurchaseInvoiceItem } from "@/types/erp";
import {
  ShoppingBag, Plus, Search, Filter, Eye, CheckCircle2,
  Trash2, Building2, Printer, FileText, Calendar, User, Package, AlertCircle, Loader2,
  Percent, DollarSign, Tag, Receipt, FileSpreadsheet
} from "lucide-react";

export default function PurchasesPage() {
  const {
    purchaseInvoices, suppliers, products, warehouses,
    createPurchaseInvoice, deletePurchaseInvoice, organization, activeBranchId,
    currentUser, locale, hasPermission, showToast, isLoadingData
  } = useERP();

  const isAr = locale === "ar";
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "purchase_invoice" | "purchase_order">("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // New Purchase Form State
  const [invoiceType, setInvoiceType] = useState<"purchase_invoice" | "purchase_order">("purchase_invoice");
  const [supplierId, setSupplierId] = useState("");
  const [supplierInvoiceRef, setSupplierInvoiceRef] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split("T")[0]);
  const [warehouseId, setWarehouseId] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Omit<PurchaseInvoiceItem, "id">[]>([]);

  // Product search filter per line item
  const [productSearchTerms, setProductSearchTerms] = useState<Record<number, string>>({});

  const handleOpenAddModal = () => {
    setFormError(null);
    setInvoiceType("purchase_invoice");
    const defaultSupp = suppliers[0]?.id || "";
    const defaultWh = warehouses.find(w => w.isDefault)?.id || warehouses[0]?.id || "";
    const defaultProd = products[0];

    setSupplierId(defaultSupp);
    setWarehouseId(defaultWh);
    setDate(new Date().toISOString().split("T")[0]);
    setDueDate(new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split("T")[0]);
    setSupplierInvoiceRef("");
    setDiscountType("percentage");
    setDiscountValue(0);
    setNotes("");
    setProductSearchTerms({});

    if (defaultProd) {
      setItems([{
        productId: defaultProd.id,
        productName: isAr ? defaultProd.nameAr : defaultProd.nameEn,
        warehouseId: defaultWh,
        quantity: 1,
        unitCost: defaultProd.costPrice || 0,
        discountAmount: 0,
        taxRate: organization.defaultVatRate,
        taxAmount: ((defaultProd.costPrice || 0) * organization.defaultVatRate) / 100,
        total: (defaultProd.costPrice || 0) * (1 + organization.defaultVatRate / 100),
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
        unitCost: p.costPrice || 0,
        discountAmount: 0,
        taxRate: organization.defaultVatRate,
        taxAmount: ((p.costPrice || 0) * organization.defaultVatRate) / 100,
        total: (p.costPrice || 0) * (1 + organization.defaultVatRate / 100),
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
      current.unitCost = prod.costPrice || 0;
      current.taxRate = organization.defaultVatRate;

      const lineSubtotal = current.unitCost * current.quantity;
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
      } else if (field === "unitCost") {
        current.unitCost = Math.max(0, parseFloat(value) || 0);
      } else if (field === "taxRate") {
        current.taxRate = Math.max(0, parseFloat(value) || 0);
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

  // Recalculations for Purchases
  const itemsSubtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.unitCost * item.quantity), 0);
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
      const discountedLine = (item.unitCost * item.quantity) * discountRatio;
      return sum + (discountedLine * item.taxRate) / 100;
    }, 0);
  }, [items, itemsSubtotal, netSubtotal]);

  const grandTotal = netSubtotal + calculatedTaxTotal;

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
      const prefix = invoiceType === "purchase_order" ? "PO" : "PINV";
      const invoiceNumber = `${prefix}-${new Date().getFullYear()}-${(purchaseInvoices.length + 1).toString().padStart(4, "0")}`;

      await createPurchaseInvoice({
        organizationId: organization.id,
        branchId: activeBranchId,
        invoiceType,
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
        subtotal: itemsSubtotal,
        discountType,
        discountValue,
        discountTotal: calculatedDiscountTotal,
        taxTotal: calculatedTaxTotal,
        grandTotal,
        paidAmount: 0,
        dueAmount: grandTotal,
        notes: notes || (invoiceType === "purchase_order" ? (isAr ? "أمر شراء بضاعة رسمي" : "Purchase Order") : (isAr ? "فاتورة توريد بضاعة ومخزون" : "Standard Purchase Invoice")),
        createdBy: currentUser.name,
      });

      setIsAddModalOpen(false);
      showToast(
        isAr
          ? (invoiceType === "purchase_order" ? `تم حفظ أمر الشراء (${invoiceNumber}) بنجاح` : `تم حفظ فاتورة المشتريات (${invoiceNumber}) وتوريد المخزون بنجاح`)
          : "Saved successfully",
        "success"
      );
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
        showToast(isAr ? "تم حذف الفاتورة بنجاح" : "Purchase invoice deleted", "success");
      } catch (err: any) {
        showToast(err?.message || (isAr ? "فشل حذف الفاتورة" : "Failed to delete"), "error");
      }
    }
  };

  const filteredInvoices = purchaseInvoices.filter(inv => {
    if (typeFilter !== "all") {
      const invType = inv.invoiceType || "purchase_invoice";
      if (invType !== typeFilter) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (inv.invoiceNumber || "").toLowerCase().includes(q) ||
        (inv.supplierName || "").includes(q) ||
        (inv.supplierInvoiceRef || "").toLowerCase().includes(q);
    }
    return true;
  });

  const canManage = hasPermission(["super_admin", "tenant_admin", "accountant", "inventory_manager"]);

  if (isLoadingData) {
    return <TableSkeleton rows={6} columns={8} summaryCards={4} isAr={isAr} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <ShoppingBag className="w-6 h-6 text-sky-400" />
            <span>{isAr ? "فواتير المشتريات وأوامر الشراء" : "Purchase Invoices & Purchase Orders"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAr ? "إثبات استلام الشحنات وتحديث أرصدة المخازن وحسابات الموردين وخصم ضريبة المدخلات مع الخصومات المباشرة" : "Record vendor invoices, replenish stock, and manage AP ledgers"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/purchases/returns"
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all cursor-pointer"
          >
            <Receipt className="w-4 h-4 text-amber-400" />
            <span>{isAr ? "مرتجعات المشتريات (إشعارات مدينة)" : "Purchase Returns"}</span>
          </a>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-sky-600 to-blue-500 hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-950/60 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? "إضافة فاتورة / أمر شراء جديد" : "New Purchase / Order"}</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTypeFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              typeFilter === "all" ? "bg-sky-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {isAr ? "الكل" : "All"} ({purchaseInvoices.length})
          </button>
          <button
            onClick={() => setTypeFilter("purchase_invoice")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              typeFilter === "purchase_invoice" ? "bg-sky-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {isAr ? "فواتير مشتريات" : "Purchase Invoices"} ({purchaseInvoices.filter(i => (i.invoiceType || "purchase_invoice") === "purchase_invoice").length})
          </button>
          <button
            onClick={() => setTypeFilter("purchase_order")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              typeFilter === "purchase_order" ? "bg-sky-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {isAr ? "أوامر شراء" : "Purchase Orders"} ({purchaseInvoices.filter(i => i.invoiceType === "purchase_order").length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? "بحث برقم الفاتورة أو المورد..." : "Search invoice # or supplier..."}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 font-medium"
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
                <th className="p-3.5">{isAr ? "تاريخ الفاتورة" : "Date"}</th>
                <th className="p-3.5">{isAr ? "المورد" : "Supplier"}</th>
                <th className="p-3.5 font-mono">{isAr ? "مرجع المورد" : "Vendor Ref"}</th>
                <th className="p-3.5 text-center font-mono">{isAr ? "المجموع" : "Subtotal"}</th>
                <th className="p-3.5 text-center font-mono">{isAr ? "الخصم" : "Discount"}</th>
                <th className="p-3.5 text-center font-mono">{isAr ? "الضريبة" : "VAT"}</th>
                <th className="p-3.5 text-center font-mono">{isAr ? "الإجمالي المستحق" : "Grand Total"}</th>
                <th className="p-3.5 text-center">{isAr ? "الحالة" : "Status"}</th>
                <th className="p-3.5 rounded-l-lg text-center">{isAr ? "الإجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredInvoices.map((inv, idx) => {
                const isPO = inv.invoiceType === "purchase_order";
                return (
                  <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3.5 text-slate-500 font-mono">{idx + 1}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        isPO ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                      }`}>
                        {isPO ? (isAr ? "أمر شراء" : "Purchase Order") : (isAr ? "فاتورة مشتريات" : "Purchase Invoice")}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-white">{inv.invoiceNumber}</td>
                    <td className="p-3.5 text-slate-400 font-sans">{formatDate(inv.date, locale)}</td>
                    <td className="p-3.5 font-bold text-slate-200">{inv.supplierName}</td>
                    <td className="p-3.5 text-slate-400 font-mono">{inv.supplierInvoiceRef || "---"}</td>
                    <td className="p-3.5 text-center font-mono text-slate-400">
                      {formatCurrency(inv.subtotal, organization.currency, locale)}
                    </td>
                    <td className="p-3.5 text-center font-mono text-rose-400">
                      {inv.discountTotal ? formatCurrency(inv.discountTotal, organization.currency, locale) : "-"}
                    </td>
                    <td className="p-3.5 text-center font-mono text-sky-400 font-bold">
                      {formatCurrency(inv.taxTotal, organization.currency, locale)}
                    </td>
                    <td className="p-3.5 text-center font-mono font-bold text-white">
                      {formatCurrency(inv.grandTotal, organization.currency, locale)}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold border bg-sky-500/10 text-sky-400 border-sky-500/20">
                        {isPO ? (isAr ? "أمر معتمد" : "Approved") : (isAr ? "معتمدة وموردة" : "Posted & Received")}
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
                );
              })}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={12} className="text-center py-12 text-slate-500">
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

      {/* Add Invoice Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => !isSubmitting && setIsAddModalOpen(false)}
        title={isAr ? "تسجيل فاتورة مشتريات / أمر شراء جديد" : "New Purchase Invoice / Order"}
        maxWidth="4xl"
      >
        <form onSubmit={handleCreatePurchase} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Top Form Row */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "نوع المستند *" : "Document Type *"}</label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setInvoiceType("purchase_invoice")}
                  className={`py-1.5 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                    invoiceType === "purchase_invoice" ? "bg-sky-600 text-white shadow" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {isAr ? "فاتورة مشتريات" : "Invoice"}
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceType("purchase_order")}
                  className={`py-1.5 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                    invoiceType === "purchase_order" ? "bg-amber-600 text-white shadow" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {isAr ? "أمر شراء" : "Order"}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "المورد *" : "Supplier *"}</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500 font-bold"
              >
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.nameAr} ({s.code})</option>)}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "تاريخ الفاتورة *" : "Date *"}</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "مستودع الاستلام *" : "Target Warehouse *"}</label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
              >
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.nameAr}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "رقم فاتورة المورد (المرجع)" : "Vendor Invoice Ref #"}</label>
              <input
                type="text"
                placeholder={isAr ? "مثال: SUP-INV-9921" : "e.g. SUP-INV-9921"}
                value={supplierInvoiceRef}
                onChange={(e) => setSupplierInvoiceRef(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "تاريخ الاستحقاق" : "Due Date"}</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Line Items Table with Instant Product Search */}
          <div className="border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="bg-slate-800 text-slate-400 font-bold">
                  <th className="p-3">{isAr ? "الصنف (الاسم / الباركود / SKU)" : "Product (Name / Barcode / SKU)"}</th>
                  <th className="p-3 text-center w-24">{isAr ? "الكمية" : "Qty"}</th>
                  <th className="p-3 text-center w-32">{isAr ? "سعر التكلفة" : "Unit Cost"}</th>
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
                            {filteredProds.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.nameAr} {p.barcode ? `(${p.barcode})` : ""} {p.sku ? `[${p.sku}]` : ""} - تكلفة: {p.costPrice} {organization.currency}
                              </option>
                            ))}
                          </select>
                          {products.length > 5 && (
                            <input
                              type="text"
                              placeholder={isAr ? "🔍 تصفية بالاسم أو الباركود..." : "🔍 Search..."}
                              value={productSearchTerms[idx] || ""}
                              onChange={(e) => setProductSearchTerms({ ...productSearchTerms, [idx]: e.target.value })}
                              className="w-full bg-slate-950/80 border border-slate-800/80 rounded px-2 py-0.5 text-[10px] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
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
                          value={item.unitCost}
                          onChange={(e) => handleUpdateItem(idx, "unitCost", e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-center text-white font-mono"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.taxRate}
                          onChange={(e) => handleUpdateItem(idx, "taxRate", e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-center text-white font-mono"
                        />
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
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold rounded-lg transition-colors cursor-pointer"
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
                <Percent className="w-4 h-4 text-sky-400" />
                <span>{isAr ? "قسم الخصم التجاري الممنوح من المورد" : "Supplier Discount"}</span>
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
                  placeholder={isAr ? "ملاحظات الاستلام والفحص..." : "Notes or terms..."}
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
                <span>{isAr ? `ضريبة المدخلات (${organization.defaultVatRate}%):` : "Input VAT:"}</span>
                <span className="font-mono font-bold text-sky-400">{formatCurrency(calculatedTaxTotal, organization.currency, locale)}</span>
              </div>
              <div className="flex justify-between text-base font-black text-white pt-2 border-t border-slate-800">
                <span>{isAr ? "الإجمالي الصافي المستحق للمورد:" : "Grand Total:"}</span>
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
                  <span>{isAr ? "جاري الحفظ والتوريد للمخزن..." : "Saving..."}</span>
                </>
              ) : (
                <span>
                  {invoiceType === "purchase_order"
                    ? (isAr ? "حفظ أمر الشراء" : "Save Purchase Order")
                    : (isAr ? "اعتماد الفاتورة وتوريد المخزن" : "Post Purchase Invoice & Receive Stock")}
                </span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Purchase Invoice Modal */}
      {selectedInvoice && (
        <Modal
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          title={isAr ? `تفاصيل فاتورة المشتريات (${selectedInvoice.invoiceNumber})` : `Purchase Invoice (${selectedInvoice.invoiceNumber})`}
          maxWidth="2xl"
        >
          <div className="p-4 space-y-4 text-xs">
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex justify-between items-center">
              <div>
                <p className="text-slate-400">{isAr ? "المورد" : "Supplier"}</p>
                <p className="text-sm font-bold text-white">{selectedInvoice.supplierName}</p>
                <p className="text-slate-500 font-mono text-[10px]">{selectedInvoice.supplierTaxNumber || ""}</p>
              </div>
              <div>
                <p className="text-slate-400">{isAr ? "تاريخ التوريد" : "Date"}</p>
                <p className="font-mono text-white">{formatDate(selectedInvoice.date, locale)}</p>
              </div>
              <div>
                <p className="text-slate-400">{isAr ? "إجمالي الفاتورة" : "Total"}</p>
                <p className="text-base font-black text-sky-400 font-mono">
                  {formatCurrency(selectedInvoice.grandTotal, organization.currency, locale)}
                </p>
              </div>
            </div>

            <div className="border border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-right">
                <thead>
                  <tr className="bg-slate-800 text-slate-400">
                    <th className="p-2.5">{isAr ? "الصنف" : "Item"}</th>
                    <th className="p-2.5 text-center">{isAr ? "الكمية" : "Qty"}</th>
                    <th className="p-2.5 text-center">{isAr ? "سعر التكلفة" : "Unit Cost"}</th>
                    <th className="p-2.5 text-left">{isAr ? "الإجمالي" : "Total"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {(selectedInvoice.items || []).map((it, i) => (
                    <tr key={i}>
                      <td className="p-2.5 font-bold text-white">{it.productName}</td>
                      <td className="p-2.5 text-center font-mono">{it.quantity}</td>
                      <td className="p-2.5 text-center font-mono">{formatCurrency(it.unitCost, organization.currency, locale)}</td>
                      <td className="p-2.5 text-left font-mono font-bold text-sky-400">{formatCurrency(it.total, organization.currency, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-3">
              <button
                onClick={() => setSelectedInvoice(null)}
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
