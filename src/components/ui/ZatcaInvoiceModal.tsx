"use client";

import React, { useEffect, useState } from "react";
import { useERP } from "@/context/erp-context";
import { SalesInvoice } from "@/types/erp";
import { formatCurrency, formatDate } from "@/lib/utils";
import { generateZatcaQrDataUrl } from "@/lib/zatca-qr";
import Modal from "./Modal";
import { Printer } from "lucide-react";

interface ZatcaInvoiceModalProps {
  invoice: SalesInvoice | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ZatcaInvoiceModal({ invoice, isOpen, onClose }: ZatcaInvoiceModalProps) {
  const { organization, locale } = useERP();
  const [qrUrl, setQrUrl] = useState<string>("");
  const isAr = locale === "ar";

  useEffect(() => {
    if (invoice && isOpen) {
      generateZatcaQrDataUrl(
        organization.nameAr,
        organization.taxNumber,
        invoice.createdAt || invoice.date,
        invoice.grandTotal,
        invoice.taxTotal
      ).then(url => setQrUrl(url));
    }
  }, [invoice, isOpen, organization]);

  if (!invoice) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? ("فاتورة ضريبية إلكترونية (" + invoice.invoiceNumber + ")") : ("E-Tax Invoice (" + invoice.invoiceNumber + ")")}
      maxWidth="2xl"
    >
      <div className="space-y-6 text-slate-200" id="printable-invoice">
        <div className="flex justify-between items-start border-b border-slate-800 pb-4">
          <div>
            <div className="text-xl font-bold text-emerald-400">{organization.nameAr}</div>
            <div className="text-xs text-slate-400">{organization.nameEn}</div>
            <div className="text-xs text-slate-300 mt-1">
              {isAr ? "الرقم الضريبي: " : "VAT No: "}
              <span className="font-mono font-bold text-white">{organization.taxNumber}</span>
            </div>
            <div className="text-xs text-slate-400">{organization.address}</div>
          </div>
          {qrUrl && (
            <div className="flex flex-col items-center bg-white p-2 rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrUrl} alt="ZATCA / ETA QR" className="w-24 h-24" />
              <span className="text-[9px] text-slate-800 font-bold mt-1">ZATCA / ETA E-Invoice</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl text-xs border border-slate-800">
          <div>
            <span className="text-slate-500 block">{isAr ? "بيانات العميل:" : "Customer:"}</span>
            <div className="font-bold text-white text-sm mt-0.5">{invoice.customerName}</div>
            <div className="text-slate-400">
              {isAr ? "الرقم الضريبي: " : "Tax ID: "}
              {invoice.customerTaxNumber || "---"}
            </div>
          </div>
          <div className="text-left">
            <span className="text-slate-500 block">{isAr ? "رقم الفاتورة والتاريخ:" : "Invoice & Date:"}</span>
            <div className="font-mono font-bold text-white text-sm mt-0.5">{invoice.invoiceNumber}</div>
            <div className="text-slate-400">{formatDate(invoice.date, locale)}</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-800 text-slate-400 font-bold">
                <th className="p-2.5 rounded-r-lg">#</th>
                <th className="p-2.5">{isAr ? "الصنف / الخدمة" : "Item"}</th>
                <th className="p-2.5 text-center">{isAr ? "الكمية" : "Qty"}</th>
                <th className="p-2.5 text-center">{isAr ? "السعر" : "Price"}</th>
                <th className="p-2.5 text-center">{isAr ? "الضريبة" : "VAT"}</th>
                <th className="p-2.5 rounded-l-lg text-left">{isAr ? "الإجمالي" : "Total"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {invoice.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30">
                  <td className="p-2.5 text-slate-500">{idx + 1}</td>
                  <td className="p-2.5 font-medium text-white">{item.productName}</td>
                  <td className="p-2.5 text-center font-mono">{item.quantity}</td>
                  <td className="p-2.5 text-center font-mono">{formatCurrency(item.unitPrice, organization.currency, locale)}</td>
                  <td className="p-2.5 text-center font-mono text-emerald-400">%{item.taxRate}</td>
                  <td className="p-2.5 text-left font-mono font-bold">{formatCurrency(item.total, organization.currency, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end pt-2">
          <div className="w-64 space-y-1.5 text-xs bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between text-slate-400">
              <span>{isAr ? "المجموع الفرعي (غير شامل الضريبة):" : "Subtotal:"}</span>
              <span className="font-mono font-bold text-white">{formatCurrency(invoice.subtotal, organization.currency, locale)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>{isAr ? ("ضريبة القيمة المضافة (" + organization.defaultVatRate + "%):") : "VAT Total:"}</span>
              <span className="font-mono font-bold text-emerald-400">{formatCurrency(invoice.taxTotal, organization.currency, locale)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-slate-800">
              <span>{isAr ? "الإجمالي المستحق:" : "Grand Total:"}</span>
              <span className="font-mono text-emerald-400">{formatCurrency(invoice.grandTotal, organization.currency, locale)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>{isAr ? "طباعة الفاتورة الضريبية" : "Print Invoice"}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
