"use client";

import React, { useState } from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import {
  Package, Plus, Search, Filter, Edit, Trash2,
  AlertTriangle, Barcode, Warehouse, Layers, ArrowUpDown
} from "lucide-react";

export default function InventoryPage() {
  const {
    products, categories, units, warehouses, addProduct,
    updateProduct, deleteProduct, locale, organization
  } = useERP();

  const isAr = locale === "ar";
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [unitId, setUnitId] = useState(units[0]?.id || "");
  const [costPrice, setCostPrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [minStockLevel, setMinStockLevel] = useState<number>(5);
  const [initialWarehouseStock, setInitialWarehouseStock] = useState<{ [whId: string]: number }>({});

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr || !sku) return;

    addProduct({
      organizationId: organization.id,
      sku,
      barcode: barcode || ("622" + Date.now().toString().slice(-10)),
      nameAr,
      nameEn: nameEn || nameAr,
      categoryId,
      unitId,
      costPrice,
      sellingPrice,
      taxRate: organization.defaultVatRate,
      minStockLevel,
      status: "active",
      warehouseStock: initialWarehouseStock,
    });

    setIsAddModalOpen(false);
    setNameAr("");
    setNameEn("");
    setSku("");
    setBarcode("");
    setCostPrice(0);
    setSellingPrice(0);
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
    const totalQty = Object.values(p.warehouseStock).reduce((a, b) => a + b, 0);
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
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
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
                <th className="p-3.5 rounded-r-lg">#</th>
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
              {filteredProducts.map((p, idx) => {
                const totalStock = Object.values(p.warehouseStock).reduce((a, b) => a + b, 0);
                const isLow = totalStock <= p.minStockLevel;
                const cat = categories.find(c => c.id === p.categoryId);

                return (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3.5 text-slate-500 font-mono">{idx + 1}</td>
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
                        {Object.entries(p.warehouseStock).map(([wId, qty]) => {
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
                        <button
                          onClick={() => deleteProduct(p.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={isAr ? "إضافة منتج جديد للمخزون" : "Add New Product"}
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              >
                {categories.map(c => <option key={c.id} value={c.id}>{c.nameAr}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{isAr ? "وحدة القياس" : "Unit"}</label>
              <select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
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
            <div className="font-bold text-slate-300">{isAr ? "توزيع الرصيد الافتتاحي على المستودعات:" : "Initial Stock Distribution:"}</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {warehouses.map(w => (
                <div key={w.id}>
                  <span className="text-[11px] text-slate-400 block mb-0.5">{isAr ? w.nameAr : w.nameEn}</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    onChange={(e) => setInitialWarehouseStock(prev => ({ ...prev, [w.id]: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
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
              {isAr ? "حفظ المنتج" : "Save Product"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
