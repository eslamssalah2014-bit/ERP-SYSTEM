"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useERP } from "@/context/erp-context";
import { formatCurrency } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import { Product } from "@/types/erp";
import {
  Package, Plus, Search, Filter, Edit, Trash2, Eye,
  AlertTriangle, Barcode, Warehouse, Layers, ArrowUpDown,
  Image as ImageIcon, Upload, X, FileSpreadsheet, CheckCircle2
} from "lucide-react";

export default function InventoryPage() {
  const {
    products, categories, units, warehouses, addProduct,
    updateProduct, deleteProduct, locale, organization, hasPermission
  } = useERP();

  const isAr = locale === "ar";
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Add Form State
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [unitId, setUnitId] = useState(units[0]?.id || "");
  const [costPrice, setCostPrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [minStockLevel, setMinStockLevel] = useState<number>(5);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [initialWarehouseStock, setInitialWarehouseStock] = useState<{ [whId: string]: number }>({});

  // Edit Form State
  const [editNameAr, setEditNameAr] = useState("");
  const [editNameEn, setEditNameEn] = useState("");
  const [editSku, setEditSku] = useState("");
  const [editBarcode, setEditBarcode] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editUnitId, setEditUnitId] = useState("");
  const [editCostPrice, setEditCostPrice] = useState<number>(0);
  const [editSellingPrice, setEditSellingPrice] = useState<number>(0);
  const [editMinStockLevel, setEditMinStockLevel] = useState<number>(5);
  const [editImageUrl, setEditImageUrl] = useState<string>("");
  const [editWarehouseStock, setEditWarehouseStock] = useState<{ [whId: string]: number }>({});

  const canManageInventory = hasPermission(["super_admin", "tenant_admin", "inventory_manager"]);

  // Helper for image upload to base64
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>, isEditMode = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (max 3MB)
    if (file.size > 3 * 1024 * 1024) {
      alert(isAr ? "حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 3 ميجابايت" : "Image size exceeds 3MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (isEditMode) {
        setEditImageUrl(result);
      } else {
        setImageUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr || !sku) return;

    const activeCatId = categoryId || categories[0]?.id || "";
    const activeUnitId = unitId || units[0]?.id || "";

    addProduct({
      organizationId: organization.id,
      sku,
      barcode: barcode || ("622" + Date.now().toString().slice(-10)),
      nameAr,
      nameEn: nameEn || nameAr,
      categoryId: activeCatId,
      unitId: activeUnitId,
      costPrice,
      sellingPrice,
      taxRate: organization.defaultVatRate || 14,
      minStockLevel,
      status: "active",
      warehouseStock: initialWarehouseStock,
      imageUrl: imageUrl || undefined,
    });

    setIsAddModalOpen(false);
    setNameAr("");
    setNameEn("");
    setSku("");
    setBarcode("");
    setCostPrice(0);
    setSellingPrice(0);
    setImageUrl("");
    setInitialWarehouseStock({});
  };

  const handleOpenEdit = (p: Product) => {
    setEditProduct(p);
    setEditNameAr(p.nameAr);
    setEditNameEn(p.nameEn);
    setEditSku(p.sku);
    setEditBarcode(p.barcode || "");
    setEditCategoryId(p.categoryId);
    setEditUnitId(p.unitId);
    setEditCostPrice(p.costPrice);
    setEditSellingPrice(p.sellingPrice);
    setEditMinStockLevel(p.minStockLevel);
    setEditImageUrl(p.imageUrl || "");
    setEditWarehouseStock({ ...(p.warehouseStock || {}) });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProduct) return;

    updateProduct(editProduct.id, {
      nameAr: editNameAr,
      nameEn: editNameEn,
      sku: editSku,
      barcode: editBarcode,
      categoryId: editCategoryId,
      unitId: editUnitId,
      costPrice: editCostPrice,
      sellingPrice: editSellingPrice,
      minStockLevel: editMinStockLevel,
      imageUrl: editImageUrl || undefined,
      warehouseStock: editWarehouseStock,
    });

    setEditProduct(null);
  };

  const handleConfirmDelete = () => {
    if (!deleteTargetId) return;
    deleteProduct(deleteTargetId);
    setDeleteTargetId(null);
  };

  const filteredProducts = products.filter(p => {
    if (categoryFilter !== "all" && p.categoryId !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.nameAr.includes(q) || p.nameEn.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.barcode.includes(q);
    }
    return true;
  });

  const totalInventoryValue = products.reduce((sum, p) => {
    const totalQty = Object.values(p.warehouseStock || {}).reduce((a, b) => a + b, 0);
    return sum + (totalQty * p.costPrice);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Package className="w-6 h-6 text-emerald-400" />
            <span>{isAr ? "إدارة المنتجات والمخزون السلعي" : "Products & Inventory Management"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? ("إجمالي " + products.length + " منتج مسجل بقيمة مخزون تقديرية " + formatCurrency(totalInventoryValue, organization.currency, locale))
              : ("Total " + products.length + " products with inventory value " + formatCurrency(totalInventoryValue, organization.currency, locale))}
          </p>
        </div>

        {canManageInventory && (
          <button
            onClick={() => {
              setSku("PROD-" + (products.length + 1).toString().padStart(3, "0"));
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/60 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? "إضافة منتج جديد" : "Add Product"}</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
          <input
            type="text"
            placeholder={isAr ? "بحث بالاسم، الباركود، أو SKU..." : "Search by name, SKU, barcode..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 font-semibold"
          >
            <option value="all">{isAr ? "جميع التصنيفات" : "All Categories"}</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{isAr ? c.nameAr : c.nameEn}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                <th className="p-3.5 rounded-r-lg w-12">#</th>
                <th className="p-3.5 w-14 text-center">{isAr ? "الصورة" : "Image"}</th>
                <th className="p-3.5">{isAr ? "كود الصنف / SKU" : "SKU / Barcode"}</th>
                <th className="p-3.5">{isAr ? "اسم المنتج" : "Product Name"}</th>
                <th className="p-3.5">{isAr ? "التصنيف" : "Category"}</th>
                <th className="p-3.5 text-center">{isAr ? "سعر التكلفة" : "Cost"}</th>
                <th className="p-3.5 text-center">{isAr ? "سعر البيع" : "Selling"}</th>
                <th className="p-3.5 text-center">{isAr ? "الرصيد الكلي" : "Total Stock"}</th>
                <th className="p-3.5">{isAr ? "توزيع المخازن" : "Warehouse Distribution"}</th>
                <th className="p-3.5 rounded-l-lg text-center">{isAr ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-10 text-center text-slate-500 font-sans">
                    {isAr ? "لا توجد منتجات مطابقة لخيارات البحث" : "No products found"}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p, idx) => {
                  const totalStock = Object.values(p.warehouseStock || {}).reduce((a, b) => a + b, 0);
                  const isLow = totalStock <= p.minStockLevel;
                  const cat = categories.find(c => c.id === p.categoryId);

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3.5 text-slate-500 font-mono">{idx + 1}</td>
                      <td className="p-3.5 text-center">
                        <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0 mx-auto">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.nameAr} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-4 h-4 text-slate-600" />
                          )}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-mono font-bold text-slate-200">{p.sku}</div>
                        <div className="font-mono text-[10px] text-slate-500">{p.barcode}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-white">{isAr ? p.nameAr : p.nameEn}</div>
                        <div className="text-[10px] text-slate-400">{p.brand || "---"}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md text-[10px] font-semibold border border-slate-700">
                          {isAr ? cat?.nameAr : cat?.nameEn}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-slate-400">
                        {formatCurrency(p.costPrice, organization.currency, locale)}
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-emerald-400">
                        {formatCurrency(p.sellingPrice, organization.currency, locale)}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={"px-2.5 py-1 rounded-xl text-xs font-mono font-bold border " + (
                          isLow
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        )}>
                          {totalStock} {isAr ? "قطعة" : "pcs"}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(p.warehouseStock || {}).map(([wId, qty]) => {
                            const wh = warehouses.find(w => w.id === wId);
                            return (
                              <span key={wId} className="text-[10px] bg-slate-950 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800">
                                {wh?.code}: <b className="text-white font-mono">{qty}</b>
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View Button */}
                          <button
                            onClick={() => setViewProduct(p)}
                            title={isAr ? "عرض بيانات المنتج" : "View Product"}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Kardex Link */}
                          <Link
                            href={`/inventory/kardex?productId=${p.id}`}
                            title={isAr ? "عرض كارت الصنف (Kardex)" : "View Kardex"}
                            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                          </Link>

                          {/* Edit Button */}
                          {canManageInventory && (
                            <button
                              onClick={() => handleOpenEdit(p)}
                              title={isAr ? "تعديل المنتج" : "Edit Product"}
                              className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-lg transition-colors"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete Button */}
                          {canManageInventory && (
                            <button
                              onClick={() => setDeleteTargetId(p.id)}
                              title={isAr ? "حذف المنتج" : "Delete Product"}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Product Modal (Read-Only) */}
      <Modal
        isOpen={!!viewProduct}
        onClose={() => setViewProduct(null)}
        title={isAr ? "تفاصيل المنتج وبطاقة الصنف" : "Product Details"}
        maxWidth="2xl"
      >
        {viewProduct && (
          <div className="space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="w-24 h-24 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                {viewProduct.imageUrl ? (
                  <img src={viewProduct.imageUrl} alt={viewProduct.nameAr} className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-10 h-10 text-slate-600" />
                )}
              </div>

              <div className="flex-1 text-right space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs bg-slate-900 text-emerald-400 px-2 py-0.5 rounded-lg border border-slate-800">
                    {viewProduct.sku}
                  </span>
                  <span className="text-slate-400 font-mono text-xs">{viewProduct.barcode}</span>
                </div>
                <h3 className="text-base font-bold text-white">{viewProduct.nameAr}</h3>
                <div className="text-slate-400 font-sans">{viewProduct.nameEn}</div>
                <div className="text-[11px] text-slate-500">
                  {isAr ? "التصنيف: " : "Category: "}
                  <span className="text-slate-300 font-semibold">{categories.find(c => c.id === viewProduct.categoryId)?.nameAr || "---"}</span>
                </div>
              </div>
            </div>

            {/* Financials & Stock Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <span className="text-slate-400 block text-[11px]">{isAr ? "سعر التكلفة:" : "Cost Price:"}</span>
                <span className="font-mono font-bold text-white text-sm mt-0.5 block">
                  {formatCurrency(viewProduct.costPrice, organization.currency, locale)}
                </span>
              </div>

              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <span className="text-slate-400 block text-[11px]">{isAr ? "سعر البيع:" : "Selling Price:"}</span>
                <span className="font-mono font-bold text-emerald-400 text-sm mt-0.5 block">
                  {formatCurrency(viewProduct.sellingPrice, organization.currency, locale)}
                </span>
              </div>

              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <span className="text-slate-400 block text-[11px]">{isAr ? "الرصيد الإجمالي:" : "Total Stock:"}</span>
                <span className="font-mono font-black text-emerald-400 text-sm mt-0.5 block">
                  {Object.values(viewProduct.warehouseStock || {}).reduce((a, b) => a + b, 0)} {units.find(u => u.id === viewProduct.unitId)?.symbol || "قطعة"}
                </span>
              </div>

              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <span className="text-slate-400 block text-[11px]">{isAr ? "قيمة المخزون:" : "Valuation:"}</span>
                <span className="font-mono font-bold text-sky-400 text-sm mt-0.5 block">
                  {formatCurrency(Object.values(viewProduct.warehouseStock || {}).reduce((a, b) => a + b, 0) * viewProduct.costPrice, organization.currency, locale)}
                </span>
              </div>
            </div>

            {/* Warehouse Stock Breakdown */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <h4 className="font-bold text-white text-xs">{isAr ? "أرصدة المستودعات:" : "Warehouse Stock Allocation:"}</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {warehouses.map(w => {
                  const qty = viewProduct.warehouseStock?.[w.id] || 0;
                  return (
                    <div key={w.id} className="p-2 bg-slate-900 rounded-xl border border-slate-800 flex justify-between items-center">
                      <span className="text-slate-300 font-semibold">{w.nameAr}</span>
                      <span className="font-mono font-bold text-emerald-400">{qty}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-800">
              <Link
                href={`/inventory/kardex`}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded-xl font-bold transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>{isAr ? "الانتقال لكارت الصنف (Kardex)" : "Open Kardex"}</span>
              </Link>

              <button
                type="button"
                onClick={() => setViewProduct(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold"
              >
                {isAr ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        isOpen={!!editProduct}
        onClose={() => setEditProduct(null)}
        title={isAr ? "تعديل بيانات المنتج والمخزون" : "Edit Product"}
        maxWidth="2xl"
      >
        {editProduct && (
          <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
            {/* Image Section */}
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                {editImageUrl ? (
                  <img src={editImageUrl} alt="Product" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-slate-600" />
                )}
              </div>
              <div className="flex-1 space-y-1.5">
                <span className="font-bold text-white block">{isAr ? "صورة المنتج:" : "Product Image:"}</span>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold text-[11px] flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isAr ? "رفع صورة جديدة" : "Upload Image"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageFileChange(e, true)}
                    />
                  </label>
                  {editImageUrl && (
                    <button
                      type="button"
                      onClick={() => setEditImageUrl("")}
                      className="px-3 py-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-lg font-bold text-[11px] flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>{isAr ? "حذف الصورة" : "Remove"}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "اسم المنتج بالعربية *" : "Name (Arabic) *"}</label>
                <input
                  type="text"
                  required
                  value={editNameAr}
                  onChange={(e) => setEditNameAr(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "اسم المنتج بالإنجليزية" : "Name (English)"}</label>
                <input
                  type="text"
                  value={editNameEn}
                  onChange={(e) => setEditNameEn(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "كود SKU *" : "SKU *"}</label>
                <input
                  type="text"
                  required
                  value={editSku}
                  onChange={(e) => setEditSku(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "الباركود" : "Barcode"}</label>
                <input
                  type="text"
                  value={editBarcode}
                  onChange={(e) => setEditBarcode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "التصنيف" : "Category"}</label>
                <select
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-semibold"
                >
                  {categories.map(c => <option key={c.id} value={c.id}>{c.nameAr}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "الوحدة" : "Unit"}</label>
                <select
                  value={editUnitId}
                  onChange={(e) => setEditUnitId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-semibold"
                >
                  {units.map(u => <option key={u.id} value={u.id}>{u.nameAr}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "سعر التكلفة *" : "Cost Price *"}</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  value={editCostPrice}
                  onChange={(e) => setEditCostPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "سعر البيع *" : "Selling Price *"}</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  value={editSellingPrice}
                  onChange={(e) => setEditSellingPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{isAr ? "حد الطلب الأدنى" : "Min Stock Level"}</label>
                <input
                  type="number"
                  min="1"
                  value={editMinStockLevel}
                  onChange={(e) => setEditMinStockLevel(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
            </div>

            {/* Warehouse Stock Update (Stock Adjustments) */}
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
              <div className="font-bold text-slate-300 flex items-center justify-between">
                <span>{isAr ? "تعديل رصيد المستودعات (تسوية جردية):" : "Warehouse Stock Adjustment:"}</span>
                <span className="text-[11px] text-amber-400 font-normal">
                  {isAr ? "⚠️ أي تعديل في الكميات يسجل تسوية جردية وقيد محاسبي" : "Adjustments automatically post GL entries"}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {warehouses.map(w => (
                  <div key={w.id}>
                    <span className="text-[11px] text-slate-400 block mb-0.5">{w.nameAr}</span>
                    <input
                      type="number"
                      min="0"
                      value={editWarehouseStock[w.id] ?? 0}
                      onChange={(e) => setEditWarehouseStock(prev => ({ ...prev, [w.id]: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500 font-bold"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditProduct(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg"
              >
                {isAr ? "حفظ التعديلات" : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Add Product Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={isAr ? "إضافة منتج جديد للمخزون" : "Add New Product"}
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
          {/* Image Upload Area */}
          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
              {imageUrl ? (
                <img src={imageUrl} alt="New Product" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-6 h-6 text-slate-600" />
              )}
            </div>
            <div className="flex-1 space-y-1.5">
              <span className="font-bold text-white block">{isAr ? "صورة المنتج:" : "Product Image:"}</span>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold text-[11px] flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isAr ? "رفع صورة" : "Upload Image"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageFileChange(e, false)}
                  />
                </label>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl("")}
                    className="px-3 py-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-lg font-bold text-[11px] flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>{isAr ? "إزالة" : "Remove"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                {isAr ? "اسم المنتج بالعربية *" : "Product Name (Arabic) *"}
              </label>
              <input
                type="text"
                required
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                {isAr ? "اسم المنتج بالإنجليزية" : "Product Name (English)"}
              </label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "كود SKU *" : "SKU *"}</label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500 font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "الباركود" : "Barcode"}</label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="622..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "التصنيف" : "Category"}</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-semibold"
              >
                {categories.map(c => <option key={c.id} value={c.id}>{c.nameAr}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "وحدة القياس" : "Unit"}</label>
              <select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-semibold"
              >
                {units.map(u => <option key={u.id} value={u.id}>{u.nameAr}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "سعر التكلفة" : "Cost Price"}</label>
              <input
                type="number"
                min="0"
                step="any"
                value={costPrice}
                onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500 font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "سعر البيع" : "Selling Price"}</label>
              <input
                type="number"
                min="0"
                step="any"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500 font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "حد الطلب الأدنى" : "Min Stock Level"}</label>
              <input
                type="number"
                min="1"
                value={minStockLevel}
                onChange={(e) => setMinStockLevel(parseInt(e.target.value) || 5)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Initial Warehouse Stock Allocation */}
          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
            <div className="font-bold text-slate-300 flex items-center justify-between">
              <span>{isAr ? "توزيع الرصيد الافتتاحي على المستودعات:" : "Initial Stock Distribution:"}</span>
              <span className="text-[11px] text-emerald-400 font-normal">
                {isAr ? "✓ ينشئ قيد افتتاحي في الأصول وحقوق الملكية تلقائياً" : "Auto creates opening stock journal"}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {warehouses.map(w => (
                <div key={w.id}>
                  <span className="text-[11px] text-slate-400 block mb-0.5">{isAr ? w.nameAr : w.nameEn}</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    onChange={(e) => setInitialWarehouseStock(prev => ({ ...prev, [w.id]: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>
              ))}
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
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition-colors"
            >
              {isAr ? "حفظ المنتج ورصيد أول المدة" : "Save Product"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        title={isAr ? "تأكيد حذف المنتج" : "Confirm Delete"}
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-300">
            {isAr
              ? "هل أنت متأكد من رغبتك في حذف هذا المنتج وجميع أرصدته المخزنية المرتبطة به؟"
              : "Are you sure you want to delete this product and its associated stock?"}
          </p>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setDeleteTargetId(null)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold shadow-lg"
            >
              {isAr ? "تأكيد الحذف" : "Confirm Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
