"use client";

import React, { useState, useMemo } from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency, formatDate, generateId } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import TableSkeleton from "@/components/ui/TableSkeleton";
import { PurchaseInvoice, PurchaseInvoiceItem } from "@/types/erp";
import {
  ShoppingBag, Plus, Search, Eye, Printer, Edit, Trash2,
  CheckCircle2, AlertCircle, Clock, Loader2, Building2,
  Package, DollarSign, Tag, Calendar, User, AlertTriangle
} from "lucide-react";

export default function PurchaseOrdersPage() {
  const {
    purchaseInvoices, suppliers, products, warehouses,
    createPurchaseInvoice, updatePurchaseInvoice, deletePurchaseInvoice,
    organization, activeBranchId, currentUser, locale, showToast,
    isLoadingData
  } = useERP();

  const isAr = locale === "ar";
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<PurchaseInvoice | null>(null);
  const [printOrder, setPrintOrder] = useState<PurchaseInvoice | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseInvoice | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<PurchaseInvoice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [supplierId, setSupplierId] = useState("");
  const [supplierInvoiceRef, setSupplierInvoiceRef] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString().split("T")[0]);
  const [warehouseId, setWarehouseId] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Omit<PurchaseInvoiceItem, "id">[]>([]);

  // Filter only purchase orders
  const ordersList = useMemo(() => {
    return purchaseInvoices.filter(inv => inv.invoiceType === "purchase_order");
  }, [purchaseInvoices]);

  // Metrics
  const metrics = useMemo(() => {
    const totalValue = ordersList.reduce((sum, po) => sum + (Number(po.grandTotal) || 0), 0);
    const count = ordersList.length;
    return { totalValue, count };
  }, [ordersList]);

  // Open Create Modal
  const handleOpenAddModal = () => {
    setFormError(null);
    setEditingOrder(null);
    const defaultWh = warehouses.find(w => w.isDefault)?.id || warehouses[0]?.id || "";

    setSupplierId("");
    setWarehouseId(defaultWh);
    setDate(new Date().toISOString().split("T")[0]);
    setDueDate(new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString().split("T")[0]);
    setSupplierInvoiceRef("");
    setDiscountType("percentage");
    setDiscountValue(0);
    setNotes("");
    setItems([]);
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (order: PurchaseInvoice) => {
    setFormError(null);
    setEditingOrder(order);
    setSupplierId(order.supplierId || "");
    setWarehouseId(order.warehouseId || warehouses[0]?.id || "");
    setDate(order.date || new Date().toISOString().split("T")[0]);
    setDueDate(order.dueDate || order.date || new Date().toISOString().split("T")[0]);
    setSupplierInvoiceRef(order.supplierInvoiceRef || "");
    setDiscountType(order.discountType || "percentage");
    setDiscountValue(order.discountValue || 0);
    setNotes(order.notes || "");

    const orderItems = (order.items || []).map(it => ({
      productId: it.productId,
      productName: it.productName,
      warehouseId: it.warehouseId || order.warehouseId || warehouses[0]?.id || "",
      quantity: it.quantity,
      unitCost: it.unitCost,
      discountPercent: it.discountPercent || 0,
      discountAmount: it.discountAmount || 0,
      taxRate: it.taxRate,
      taxAmount: it.taxAmount,
      total: it.total,
    }));
    setItems(orderItems);
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
        unitCost: 0,
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
      current.unitCost = prod.costPrice || 0;
      current.taxRate = organization.defaultVatRate;

      const lineSubtotal = current.unitCost * current.quantity;
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

  // Live Recalculations
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

  // Handle Save PO
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const supp = suppliers.find(s => s.id === supplierId);
    if (!supp) {
      setFormError(isAr ? "يرجى اختيار المورد أولاً" : "Please select a supplier first");
      return;
    }

    if (items.length === 0) {
      setFormError(isAr ? "يرجى إضافة صنف واحد على الأقل لأمر الشراء" : "Please add at least one line item");
      return;
    }

    if (items.some(it => !it.productId)) {
      setFormError(isAr ? "يرجى تحديد كافة الأصناف" : "Please select a product for all items");
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingOrder) {
        await updatePurchaseInvoice(editingOrder.id, {
          supplierId: supp.id,
          supplierName: supp.nameAr,
          supplierTaxNumber: supp.taxNumber,
          supplierInvoiceRef: supplierInvoiceRef || undefined,
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
          notes: notes || "أمر شراء وتوريد رسمي",
        });

        setIsAddModalOpen(false);
        setEditingOrder(null);
        showToast(isAr ? `تم تحديث أمر الشراء ${editingOrder.invoiceNumber} بنجاح` : "Purchase order updated successfully", "success");
      } else {
        const poNumber = `PO-${new Date().getFullYear()}-${(ordersList.length + 1).toString().padStart(4, "0")}`;

        const created = await createPurchaseInvoice({
          organizationId: organization.id,
          branchId: activeBranchId,
          invoiceType: "purchase_order",
          invoiceNumber: poNumber,
          supplierInvoiceRef: supplierInvoiceRef || undefined,
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
          notes: notes || (isAr ? "أمر شراء وتوريد رسمي" : "Official Purchase Order"),
          createdBy: currentUser.name,
        });

        setIsAddModalOpen(false);
        setSelectedOrder(created);
        showToast(isAr ? `تم إنشاء أمر الشراء (${poNumber}) بنجاح` : "Purchase order created successfully", "success");
      }
    } catch (err: any) {
      console.error("Failed to save purchase order:", err);
      const errMsg = err?.message || (isAr ? "فشل حفظ أمر الشراء" : "Failed to save purchase order");
      setFormError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete PO
  const handleConfirmDelete = async () => {
    if (!deletingOrder) return;
    setIsSubmitting(true);
    try {
      await deletePurchaseInvoice(deletingOrder.id);
      setDeletingOrder(null);
      showToast(isAr ? `تم حذف أمر الشراء ${deletingOrder.invoiceNumber}` : "Purchase order deleted", "success");
    } catch (err: any) {
      console.error("Failed to delete purchase order:", err);
      showToast(err?.message || (isAr ? "فشل حذف أمر الشراء" : "Failed to delete"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredOrders = ordersList.filter(po => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (po.invoiceNumber || "").toLowerCase().includes(query) || (po.supplierName || "").includes(query);
    }
    return true;
  });

  if (isLoadingData) {
    return <TableSkeleton rows={4} columns={7} summaryCards={2} isAr={isAr} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <ShoppingBag className="w-6 h-6 text-sky-400" />
            <span>{isAr ? "أوامر الشراء والتوريد (Purchase Orders)" : "Purchase Orders"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAr ? "واجهة مخصصة ومستقلة لإنشاء وتتبع أوامر الشراء الصادرة للموردين ومطابقتها قبل إصدار فواتير الشراء" : "Standalone purchase orders workflow without altering stock or accounts payable balances"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-sky-600 to-blue-500 hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-950/60 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? "إنشاء أمر شراء جديد" : "New Purchase Order"}</span>
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
          <div className="text-xs text-slate-400 font-bold mb-1">{isAr ? "إجمالي أوامر الشراء المسجلة" : "Total Purchase Orders"}</div>
          <div className="text-xl font-extrabold text-white font-mono">{metrics.count}</div>
        </div>
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
          <div className="text-xs text-slate-400 font-bold mb-1">{isAr ? "إجمالي القيمة التقديرية للأوامر" : "Total PO Estimated Value"}</div>
          <div className="text-xl font-extrabold text-sky-400 font-mono">{formatCurrency(metrics.totalValue, organization.currency, locale)}</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={isAr ? "بحث برقم أمر الشراء أو اسم المورد..." : "Search PO number or supplier..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-9 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                <th className="p-3.5 rounded-r-lg">#</th>
                <th className="p-3.5">{isAr ? "رقم أمر الشراء" : "PO Number"}</th>
                <th className="p-3.5">{isAr ? "المورد" : "Supplier"}</th>
                <th className="p-3.5">{isAr ? "تاريخ الأمر" : "Order Date"}</th>
                <th className="p-3.5">{isAr ? "تاريخ الاستلام المتوقع" : "Expected Delivery"}</th>
                <th className="p-3.5 text-center font-mono">{isAr ? "القيمة الإجمالية" : "Total Amount"}</th>
                <th className="p-3.5 text-center">{isAr ? "الحالة" : "Status"}</th>
                <th className="p-3.5 rounded-l-lg text-center">{isAr ? "الإجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500 font-bold">
                    {isAr ? "لا توجد أوامر شراء مسجلة." : "No purchase orders registered yet."}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((po, idx) => (
                  <tr key={po.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 text-slate-500 font-mono">{idx + 1}</td>
                    <td className="p-3.5 font-bold text-white font-mono flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span>{po.invoiceNumber}</span>
                    </td>
                    <td className="p-3.5 text-slate-200">{po.supplierName}</td>
                    <td className="p-3.5 text-slate-400 font-mono">{formatDate(po.date, locale)}</td>
                    <td className="p-3.5 text-slate-400 font-mono">{formatDate(po.dueDate || po.date, locale)}</td>
                    <td className="p-3.5 text-center font-mono font-bold text-sky-400">
                      {formatCurrency(po.grandTotal, organization.currency, locale)}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="px-2.5 py-1 bg-sky-500/10 text-sky-400 rounded-xl font-bold border border-sky-500/20 text-[11px]">
                        {isAr ? "أمر شراء رسمي" : "Purchase Order"}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedOrder(po)}
                          title={isAr ? "معاينة أمر الشراء" : "View"}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setPrintOrder(po)}
                          title={isAr ? "طباعة أمر الشراء" : "Print"}
                          className="p-1.5 bg-slate-800 hover:bg-sky-950/60 text-sky-400 rounded-lg transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(po)}
                          title={isAr ? "تعديل أمر الشراء" : "Edit"}
                          className="p-1.5 bg-slate-800 hover:bg-blue-950/60 text-blue-400 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingOrder(po)}
                          title={isAr ? "حذف أمر الشراء" : "Delete"}
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

      {/* CREATE & EDIT PURCHASE ORDER MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => !isSubmitting && setIsAddModalOpen(false)}
        title={
          editingOrder
            ? (isAr ? `تعديل أمر الشراء (${editingOrder.invoiceNumber})` : `Edit Purchase Order (${editingOrder.invoiceNumber})`)
            : (isAr ? "إنشاء أمر شراء وتوريد جديد" : "New Purchase Order")
        }
        size="2xl"
      >
        <form onSubmit={handleSubmitOrder} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {isAr ? "المورد *" : "Supplier *"}
              </label>
              <select
                required
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
              >
                <option value="">{isAr ? "-- اختر المورد --" : "-- Select Supplier --"}</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.nameAr} {s.taxNumber ? `(ضريبة: ${s.taxNumber})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {isAr ? "مستودع الاستلام المتوقع *" : "Warehouse *"}
              </label>
              <select
                required
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
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
                {isAr ? "تاريخ أمر الشراء" : "Order Date"}
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {isAr ? "تاريخ التوريد المتوقع" : "Expected Delivery Date"}
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-sky-400" />
                <span>{isAr ? "بنود أمر الشراء" : "Order Items"}</span>
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600/20 text-sky-400 hover:bg-sky-600/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAr ? "إضافة صنف" : "Add Item"}</span>
              </button>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3 space-y-2 max-h-60 overflow-y-auto">
              {items.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs font-bold">
                  {isAr ? "لم يتم إضافة أصناف بعد. اضغط على 'إضافة صنف' لإدراج صنف في أمر الشراء." : "No items added."}
                </div>
              ) : (
                items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                    <div className="col-span-5">
                      <select
                        required
                        value={item.productId}
                        onChange={(e) => handleSelectProduct(idx, e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
                      >
                        <option value="">{isAr ? "-- اختر الصنف --" : "-- Select Product --"}</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.sku} - {isAr ? p.nameAr : p.nameEn} (تكلفة: {p.costPrice} ج.م)
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
                        className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white font-mono text-center focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div className="col-span-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder={isAr ? "سعر الشراء" : "Cost"}
                        value={item.unitCost}
                        onChange={(e) => handleUpdateItem(idx, "unitCost", e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white font-mono text-center focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div className="col-span-2 text-center font-mono font-bold text-sky-400 text-xs">
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

          {/* Discount & Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {isAr ? "نوع الخصم المتوقع" : "Discount Type"}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDiscountType("percentage")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        discountType === "percentage" ? "bg-sky-600 text-white" : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      % نسبة
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType("fixed")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        discountType === "fixed" ? "bg-sky-600 text-white" : "bg-slate-800 text-slate-400"
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
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono text-center focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {isAr ? "ملاحظات أمر الشراء" : "Remarks"}
                </label>
                <input
                  type="text"
                  placeholder={isAr ? "تعليمات الشحن والتسليم..." : "Shipping remarks..."}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
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
              <div className="flex justify-between py-2 font-bold text-sm text-sky-400">
                <span>{isAr ? "إجمالي قيمة أمر الشراء:" : "PO Total:"}</span>
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
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-sky-600 to-blue-500 hover:opacity-95 text-white rounded-xl text-xs font-bold shadow-lg shadow-sky-950/60 transition-all cursor-pointer"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{editingOrder ? (isAr ? "تحديث أمر الشراء" : "Update PO") : (isAr ? "حفظ أمر الشراء" : "Save PO")}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRM MODAL */}
      <Modal
        isOpen={!!deletingOrder}
        onClose={() => !isSubmitting && setDeletingOrder(null)}
        title={isAr ? "تأكيد حذف أمر الشراء" : "Confirm Deletion"}
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400">
            <AlertTriangle className="w-8 h-8 shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-sm mb-0.5">{isAr ? "تأكيد الحذف" : "Confirm Delete"}</p>
              <p>{isAr ? `هل أنت متأكد من حذف أمر الشراء رقم (${deletingOrder?.invoiceNumber})؟` : `Are you sure you want to delete purchase order ${deletingOrder?.invoiceNumber}?`}</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setDeletingOrder(null)}
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

      {/* VIEW & PRINT DETAILS MODAL */}
      {(selectedOrder || printOrder) && (
        <Modal
          isOpen={true}
          onClose={() => {
            setSelectedOrder(null);
            setPrintOrder(null);
          }}
          title={isAr ? `أمر شراء (${(selectedOrder || printOrder)!.invoiceNumber})` : `Purchase Order Details`}
          size="lg"
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
              <div>
                <div className="text-xs text-slate-400">{isAr ? "المورد المستهدف:" : "Target Supplier:"}</div>
                <div className="text-sm font-bold text-white">{(selectedOrder || printOrder)!.supplierName}</div>
                {(selectedOrder || printOrder)!.supplierTaxNumber && (
                  <div className="text-xs text-slate-400 font-mono">{isAr ? "الرقم الضريبي:" : "Tax ID:"} {(selectedOrder || printOrder)!.supplierTaxNumber}</div>
                )}
              </div>
              <div className="text-left">
                <div className="text-xs text-slate-400">{isAr ? "تاريخ الأمر:" : "Date:"}</div>
                <div className="text-sm font-bold text-sky-400 font-mono">{formatDate((selectedOrder || printOrder)!.date, locale)}</div>
              </div>
            </div>

            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-slate-800 text-slate-400 font-bold border-b border-slate-700">
                  <th className="p-3">#</th>
                  <th className="p-3">{isAr ? "الصنف" : "Product"}</th>
                  <th className="p-3 text-center">{isAr ? "الكمية المطلوبة" : "Requested Qty"}</th>
                  <th className="p-3 text-center font-mono">{isAr ? "السعر التقديري" : "Unit Cost"}</th>
                  <th className="p-3 text-center font-mono">{isAr ? "الإجمالي" : "Total"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {((selectedOrder || printOrder)!.items || []).map((it, i) => (
                  <tr key={i}>
                    <td className="p-3 text-slate-500 font-mono">{i + 1}</td>
                    <td className="p-3 font-bold text-white">{it.productName}</td>
                    <td className="p-3 text-center font-mono text-slate-200">{it.quantity}</td>
                    <td className="p-3 text-center font-mono text-slate-200">{formatCurrency(it.unitCost, organization.currency, locale)}</td>
                    <td className="p-3 text-center font-mono font-bold text-sky-400">{formatCurrency(it.total, organization.currency, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end pt-2">
              <div className="w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>{isAr ? "الإجمالي:" : "Subtotal:"}</span>
                  <span className="font-mono text-white">{formatCurrency((selectedOrder || printOrder)!.subtotal, organization.currency, locale)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>{isAr ? "الضريبة (14%):" : "VAT (14%):"}</span>
                  <span className="font-mono text-white">+{formatCurrency((selectedOrder || printOrder)!.taxTotal, organization.currency, locale)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-sky-400 pt-2 border-t border-slate-800">
                  <span>{isAr ? "إجمالي القيمة التقديرية:" : "Total PO Amount:"}</span>
                  <span className="font-mono">{formatCurrency((selectedOrder || printOrder)!.grandTotal, organization.currency, locale)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-2 px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>{isAr ? "طباعة أمر الشراء" : "Print PO"}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
