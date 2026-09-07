"use client";

import React from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import Modal from "./Modal";
import { Printer, CheckCircle2, Building2, Wallet } from "lucide-react";

export interface VoucherPrintData {
  voucherType: "cash_receipt" | "cash_payment" | "check_receipt" | "check_payment";
  voucherNumber: string;
  date: string;
  amount: number;
  currency?: string;
  partyName: string;
  partyType?: "customer" | "supplier" | "general";
  treasuryOrBankName?: string;
  accountName?: string;
  costCenterName?: string;
  notes?: string;
  // Check specific
  checkNumber?: string;
  draweeBank?: string;
  dueDate?: string;
  checksList?: Array<{
    checkNumber: string;
    draweeBank: string;
    amount: number;
    dueDate: string;
    partyName?: string;
  }>;
}

interface VoucherPrintModalProps {
  voucher: VoucherPrintData | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function VoucherPrintModal({ voucher, isOpen, onClose }: VoucherPrintModalProps) {
  const { organization, locale } = useERP();
  const isAr = locale === "ar";

  if (!voucher) return null;

  const getVoucherTitle = () => {
    switch (voucher.voucherType) {
      case "cash_receipt":
        return isAr ? "سند قبض نقدي" : "Cash Receipt Voucher";
      case "cash_payment":
        return isAr ? "سند صرف نقدي" : "Cash Payment Voucher";
      case "check_receipt":
        return isAr ? "سند استلام شيكات (أوراق قبض)" : "Check Receipt Voucher (Notes Receivable)";
      case "check_payment":
        return isAr ? "سند إصدار شيك (أوراق دفع)" : "Check Payment Voucher (Notes Payable)";
      default:
        return isAr ? "سند مالي" : "Financial Voucher";
    }
  };

  const getVoucherColor = () => {
    if (voucher.voucherType === "cash_receipt" || voucher.voucherType === "check_receipt") {
      return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
    }
    return "text-amber-400 border-amber-500/30 bg-amber-500/10";
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${getVoucherTitle()} (${voucher.voucherNumber})`}
      maxWidth="2xl"
    >
      <div className="space-y-6 text-slate-200" id="printable-voucher">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-800 pb-4">
          <div>
            <div className="text-xl font-bold text-white tracking-tight">{organization.nameAr}</div>
            <div className="text-xs text-slate-400 font-medium">{organization.nameEn}</div>
            <div className="text-xs text-slate-300 mt-1">
              {isAr ? "الرقم الضريبي: " : "VAT No: "}
              <span className="font-mono font-bold text-emerald-400">{organization.taxNumber}</span>
            </div>
            <div className="text-xs text-slate-400">{organization.address}</div>
          </div>
          <div className="text-left flex flex-col items-end">
            <div className={`px-3 py-1 rounded-full text-xs font-bold border ${getVoucherColor()}`}>
              {getVoucherTitle()}
            </div>
            <div className="mt-2 text-right">
              <span className="text-[10px] text-slate-400 block">{isAr ? "رقم السند:" : "Voucher No:"}</span>
              <span className="font-mono font-bold text-white text-base">{voucher.voucherNumber}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {formatDate(voucher.date, locale)}
            </div>
          </div>
        </div>

        {/* Amount Box */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <span className="text-xs text-slate-400 block">
              {voucher.voucherType.includes("receipt")
                ? (isAr ? "المبلغ المقبوض:" : "Received Amount:")
                : (isAr ? "المبلغ المصروف:" : "Paid Amount:")}
            </span>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-0.5">
              {formatCurrency(voucher.amount, (voucher.currency || organization.currency) as any, locale)}
            </div>
          </div>
          {voucher.treasuryOrBankName && (
            <div className="text-xs bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 text-slate-300 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span>{isAr ? "الخزينة / الحساب: " : "Treasury/Account: "}</span>
              <span className="font-bold text-white">{voucher.treasuryOrBankName}</span>
            </div>
          )}
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-900/50 p-4 rounded-xl border border-slate-800">
          <div>
            <span className="text-slate-400 block">
              {voucher.voucherType.includes("receipt")
                ? (isAr ? "استلمنا من السيد / السادة:" : "Received From:")
                : (isAr ? "يصرف إلى السيد / السادة:" : "Paid To:")}
            </span>
            <div className="font-bold text-white text-sm mt-1">{voucher.partyName}</div>
          </div>

          {voucher.accountName && (
            <div>
              <span className="text-slate-400 block">{isAr ? "الحساب المقابل:" : "Account:"}</span>
              <div className="font-semibold text-slate-200 mt-1">{voucher.accountName}</div>
            </div>
          )}

          {voucher.costCenterName && (
            <div>
              <span className="text-slate-400 block">{isAr ? "مركز التكلفة / المشروع:" : "Cost Center / Project:"}</span>
              <div className="font-semibold text-emerald-400 mt-1">{voucher.costCenterName}</div>
            </div>
          )}

          {voucher.checkNumber && (
            <div>
              <span className="text-slate-400 block">{isAr ? "رقم الشيك:" : "Check Number:"}</span>
              <div className="font-mono font-bold text-amber-300 mt-1">{voucher.checkNumber}</div>
            </div>
          )}

          {voucher.draweeBank && (
            <div>
              <span className="text-slate-400 block">{isAr ? "مسحوب على بنك:" : "Drawee Bank:"}</span>
              <div className="font-semibold text-slate-200 mt-1">{voucher.draweeBank}</div>
            </div>
          )}

          {voucher.dueDate && (
            <div>
              <span className="text-slate-400 block">{isAr ? "تاريخ الاستحقاق:" : "Due Date:"}</span>
              <div className="font-mono font-medium text-slate-300 mt-1">{formatDate(voucher.dueDate, locale)}</div>
            </div>
          )}
        </div>

        {/* Multi Checks Table if provided */}
        {voucher.checksList && voucher.checksList.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-300">{isAr ? "بيانات الشيكات المدرجة بالسند:" : "Voucher Checks:"}</h4>
            <div className="overflow-x-auto border border-slate-800 rounded-lg">
              <table className="w-full text-xs text-right divide-y divide-slate-800">
                <thead className="bg-slate-900 text-slate-400 font-semibold">
                  <tr>
                    <th className="p-2">#</th>
                    <th className="p-2">{isAr ? "رقم الشيك" : "Check No"}</th>
                    <th className="p-2">{isAr ? "البنك المسحوب عليه" : "Drawee Bank"}</th>
                    <th className="p-2 text-center">{isAr ? "تاريخ الاستحقاق" : "Due Date"}</th>
                    <th className="p-2 text-left">{isAr ? "المبلغ" : "Amount"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {voucher.checksList.map((chk, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      <td className="p-2 text-slate-500">{idx + 1}</td>
                      <td className="p-2 font-mono font-bold text-amber-300">{chk.checkNumber}</td>
                      <td className="p-2 text-slate-300">{chk.draweeBank}</td>
                      <td className="p-2 text-center font-mono text-slate-400">{formatDate(chk.dueDate, locale)}</td>
                      <td className="p-2 text-left font-mono font-bold text-emerald-400">{formatCurrency(chk.amount, (voucher.currency || organization.currency) as any, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Notes */}
        {voucher.notes && (
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 text-xs">
            <span className="text-slate-400 block font-semibold">{isAr ? "البيان / ملاحظات:" : "Statement / Notes:"}</span>
            <p className="text-slate-300 mt-1 leading-relaxed">{voucher.notes}</p>
          </div>
        )}

        {/* Signatures */}
        <div className="grid grid-cols-4 gap-4 border-t border-slate-800 pt-6 text-center text-xs">
          <div>
            <span className="text-slate-500 block">{isAr ? "أمين الخزينة" : "Cashier"}</span>
            <div className="h-10 border-b border-dashed border-slate-700 mt-2"></div>
          </div>
          <div>
            <span className="text-slate-500 block">{isAr ? "المحاسب" : "Accountant"}</span>
            <div className="h-10 border-b border-dashed border-slate-700 mt-2"></div>
          </div>
          <div>
            <span className="text-slate-500 block">{isAr ? "المدير المالي" : "Financial Manager"}</span>
            <div className="h-10 border-b border-dashed border-slate-700 mt-2"></div>
          </div>
          <div>
            <span className="text-slate-500 block">{isAr ? "المستلم" : "Recipient"}</span>
            <div className="h-10 border-b border-dashed border-slate-700 mt-2"></div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
          >
            {isAr ? "إغلاق" : "Close"}
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-sm shadow-lg shadow-emerald-900/30 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>{isAr ? "طباعة السند" : "Print Voucher"}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
