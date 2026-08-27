"use client";

import React, { useState } from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency } from "@/lib/utils";
import { Product } from "@/types/erp";
import ZatcaInvoiceModal from "@/components/ui/ZatcaInvoiceModal";
import {
  Search, ShoppingCart, Trash2, Plus, Minus, CreditCard,
  Banknote, CheckCircle2, User, ArrowRight, Printer, Sparkles
} from "lucide-react";
import confetti from "canvas-confetti";

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

export default function PosTerminal() {
  const {
    products, categories, customers, warehouses, createSalesInvoice,
    organization, activeBranchId, currentUser, locale
  } = useERP();

  const isAr = locale === "ar";
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || "");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "credit">("cash");
  const [lastIssuedInvoice, setLastIssuedInvoice] = useState<any>(null);
  const [showZatcaModal, setShowZatcaModal] = useState(false);

  // Filter products
  const filteredProducts = products.filter(p => {
    if (selectedCategory !== "all" && p.categoryId !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.nameAr.includes(q) || p.nameEn.toLowerCase().includes(q) || p.barcode.includes(q) || p.sku.toLowerCase().includes(q);
    }
    return true;
  });

  // Cart operations
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, {
        product,
        quantity: 1,
        unitPrice: product.sellingPrice,
        taxRate: product.taxRate || organization.defaultVatRate
      }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean) as CartItem[]);
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => setCart([]);

  // Cart Totals
  const subtotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const discountTotal = (subtotal * discountPercent) / 100;
  const taxableAmount = subtotal - discountTotal;
  const taxTotal = (taxableAmount * organization.defaultVatRate) / 100;
  const grandTotal = taxableAmount + taxTotal;

  // Complete Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) return;

    const defaultWarehouseId = warehouses[0]?.id || "00000000-0000-0000-0000-000000000004";
    const fallbackCustomer = customers.find(c => c.code === "CUST-POS" || c.id === "00000000-0000-0000-0000-000000000099") || customers[0] || {
      id: "00000000-0000-0000-0000-000000000099",
      nameAr: isAr ? "عميل نقدي عام (نقاط البيع)" : "Walk-in Cash Customer",
      nameEn: "Walk-in Cash Customer",
      taxNumber: "",
    };
    const customer = customers.find(c => c.id === selectedCustomerId) || fallbackCustomer;
    const invoiceNumber = "POS-" + Date.now().toString().slice(-6);

    const invoiceItems = cart.map((item, idx) => ({
      id: "pos_item_" + idx,
      productId: item.product.id,
      productName: item.product.nameAr,
      warehouseId: defaultWarehouseId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      costPrice: item.product.costPrice,
      discountPercent: 0,
      discountAmount: 0,
      taxRate: organization.defaultVatRate,
      taxAmount: (item.unitPrice * item.quantity * organization.defaultVatRate) / 100,
      total: (item.unitPrice * item.quantity) * (1 + organization.defaultVatRate / 100),
    }));

    const created = await createSalesInvoice({
      organizationId: organization.id,
      branchId: activeBranchId,
      invoiceNumber,
      date: new Date().toISOString().split("T")[0],
      dueDate: new Date().toISOString().split("T")[0],
      customerId: customer.id,
      customerName: customer.nameAr,
      customerTaxNumber: customer.taxNumber,
      salesRepId: currentUser.id,
      salesRepName: currentUser.name,
      warehouseId: defaultWarehouseId,
      status: paymentMethod === "credit" ? "unpaid" : "paid",
      items: invoiceItems,
      subtotal,
      discountTotal,
      taxTotal,
      grandTotal,
      paidAmount: paymentMethod === "credit" ? 0 : grandTotal,
      dueAmount: paymentMethod === "credit" ? grandTotal : 0,
      notes: "نقطة بيع كاشير سريعة (POS)",
      createdBy: currentUser.name,
    });

    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    setLastIssuedInvoice(created);
    setShowZatcaModal(true);
    clearCart();
  };

  return (
    <div className="h-[calc(100vh-6.5rem)] flex flex-col lg:flex-row gap-4">
      {/* Left Product Catalog Section */}
      <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-3xl p-4 overflow-hidden">
        {/* Search & Category Tabs */}
        <div className="space-y-3 mb-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={isAr ? "بحث سريع بالاسم، الباركود، أو الـ SKU..." : "Quick search by name, barcode, or SKU..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl pr-10 pl-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-all font-medium shadow-inner"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs font-bold">
            <button
              onClick={() => setSelectedCategory("all")}
              className={"px-3 py-1.5 rounded-xl whitespace-nowrap transition-all " + (
                selectedCategory === "all" ? "bg-emerald-600 text-white shadow-md" : "bg-slate-950 text-slate-400 hover:text-white"
              )}
            >
              {isAr ? "جميع الأصناف" : "All Products"} ({products.length})
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={"px-3 py-1.5 rounded-xl whitespace-nowrap transition-all " + (
                  selectedCategory === cat.id ? "bg-emerald-600 text-white shadow-md" : "bg-slate-950 text-slate-400 hover:text-white"
                )}
              >
                {isAr ? cat.nameAr : cat.nameEn}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 pr-1 custom-scrollbar">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full h-full flex flex-col items-center justify-center text-center text-slate-500 py-16">
              <Search className="w-10 h-10 mb-2 stroke-[1.5] text-slate-700" />
              <span className="text-sm font-semibold text-slate-400">
                {products.length === 0
                  ? (isAr ? "لا توجد أصناف في الكتالوج بعد" : "No products in catalog yet")
                  : (isAr ? "لا توجد نتائج مطابقة لبحثك" : "No matching products found")}
              </span>
              {products.length === 0 && (
                <a href="/inventory" className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs">
                  {isAr ? "إضافة أصناف جديدة" : "Add New Products"}
                </a>
              )}
            </div>
          ) : (
            filteredProducts.map(prod => {
              const totalStock = Object.values(prod.warehouseStock || {}).reduce((a, b) => a + b, 0);
              return (
                <div
                  key={prod.id}
                  onClick={() => addToCart(prod)}
                  className="bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800/80 hover:border-emerald-500/50 rounded-2xl p-3 flex flex-col justify-between cursor-pointer transition-all active:scale-95 group shadow-sm"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded">
                        {prod.sku}
                      </span>
                      <span className={"text-[10px] font-bold px-1.5 py-0.5 rounded " + (
                        totalStock > prod.minStockLevel ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                      )}>
                        {totalStock} {isAr ? "قطعة" : "pcs"}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-100 mt-2 line-clamp-2 group-hover:text-emerald-400 transition-colors">
                      {isAr ? prod.nameAr : prod.nameEn}
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between mt-3 pt-2 border-t border-slate-800/60">
                    <div className="text-sm font-black text-emerald-400 font-mono">
                      {formatCurrency(prod.sellingPrice, organization.currency, locale)}
                    </div>
                    <button className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Cart & Checkout Drawer */}
      <div className="w-full lg:w-96 bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between shadow-2xl">
        {/* Cart Header & Customer Selection */}
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-400" />
              <span className="font-bold text-white text-sm">
                {isAr ? "سلة المبيعات" : "Sales Cart"} ({cart.length})
              </span>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-[11px] text-rose-400 hover:underline flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>{isAr ? "تفريغ السلة" : "Clear"}</span>
              </button>
            )}
          </div>

          {/* Customer Dropdown */}
          <div className="mt-3">
            <label className="text-[11px] font-bold text-slate-400 block mb-1">
              {isAr ? "العميل المستفيد:" : "Customer:"}
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="walk_in_cash">{isAr ? "عميل نقدي عام (نقاط البيع)" : "Walk-in Cash Customer"}</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nameAr} ({c.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto my-3 space-y-2 max-h-56 custom-scrollbar pr-1">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-12">
              <ShoppingCart className="w-10 h-10 mb-2 stroke-[1.5] text-slate-700" />
              <span className="text-xs">{isAr ? "سلة المشتريات فارغة" : "Cart is empty"}</span>
              <span className="text-[10px] text-slate-600">{isAr ? "اضغط على الأصناف لإضافتها" : "Click items to add"}</span>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                <div className="flex-1 min-w-0 pr-2">
                  <div className="font-bold text-white truncate">{isAr ? item.product.nameAr : item.product.nameEn}</div>
                  <div className="text-[10px] text-emerald-400 font-mono">
                    {formatCurrency(item.unitPrice, organization.currency, locale)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-slate-800 rounded-lg bg-slate-900">
                    <button
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-2 font-bold font-mono text-white text-xs">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, 1)}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Calculation Summary & Payment Section */}
        <div className="space-y-3 pt-3 border-t border-slate-800">
          {/* Payment Method Selector */}
          <div className="grid grid-cols-3 gap-1.5 text-xs font-bold">
            <button
              onClick={() => setPaymentMethod("cash")}
              className={"py-2 rounded-xl flex items-center justify-center gap-1.5 border transition-all " + (
                paymentMethod === "cash"
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                  : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800"
              )}
            >
              <Banknote className="w-3.5 h-3.5" />
              <span>{isAr ? "نقدي" : "Cash"}</span>
            </button>
            <button
              onClick={() => setPaymentMethod("card")}
              className={"py-2 rounded-xl flex items-center justify-center gap-1.5 border transition-all " + (
                paymentMethod === "card"
                  ? "bg-sky-500/20 text-sky-400 border-sky-500/40"
                  : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800"
              )}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>{isAr ? "شبكة/بطاقة" : "Card"}</span>
            </button>
            <button
              onClick={() => setPaymentMethod("credit")}
              className={"py-2 rounded-xl flex items-center justify-center gap-1.5 border transition-all " + (
                paymentMethod === "credit"
                  ? "bg-purple-500/20 text-purple-400 border-purple-500/40"
                  : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800"
              )}
            >
              <User className="w-3.5 h-3.5" />
              <span>{isAr ? "آجل (ذمم)" : "Credit"}</span>
            </button>
          </div>

          {/* Breakdown */}
          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>{isAr ? "المجموع الفرعي:" : "Subtotal:"}</span>
              <span className="font-mono font-bold text-white">{formatCurrency(subtotal, organization.currency, locale)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>{isAr ? ("ضريبة القيمة المضافة (" + organization.defaultVatRate + "%):") : "VAT Total:"}</span>
              <span className="font-mono font-bold text-emerald-400">{formatCurrency(taxTotal, organization.currency, locale)}</span>
            </div>
            <div className="flex justify-between text-sm font-black text-white pt-1.5 border-t border-slate-800">
              <span>{isAr ? "الإجمالي الصافي:" : "Grand Total:"}</span>
              <span className="font-mono text-emerald-400">{formatCurrency(grandTotal, organization.currency, locale)}</span>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            disabled={cart.length === 0}
            onClick={handleCheckout}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-2xl shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>{isAr ? "إتمام البيع وطباعة الفاتورة" : "Complete Sale & Print"}</span>
          </button>
        </div>
      </div>

      {/* ZATCA Tax Invoice Modal View */}
      <ZatcaInvoiceModal
        invoice={lastIssuedInvoice}
        isOpen={showZatcaModal}
        onClose={() => setShowZatcaModal(false)}
      />
    </div>
  );
}
