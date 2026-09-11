"use client";

import React from "react";
import { useERP } from "@/context/erp-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import Modal from "./Modal";
import { JournalEntry } from "@/types/erp";
import { Printer, FileText, CheckCircle2, Building2, User, Clock, ShieldCheck } from "lucide-react";

interface JournalVoucherPrintModalProps {
  entry: JournalEntry | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function JournalVoucherPrintModal({ entry, isOpen, onClose }: JournalVoucherPrintModalProps) {
  const { organization, costCenters, locale } = useERP();
  const isAr = locale === "ar";

  if (!entry) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${isAr ? "سند قيد محاسبي" : "Journal Voucher"} (${entry.entryNumber})`}
      maxWidth="4xl"
    >
      <div className="space-y-6 text-slate-900" id="printable-journal-voucher">
        {/* Printable Official Voucher Container */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0">
          {/* Company Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
            <div className="text-right">
              <h2 className="text-xl font-black text-slate-950 tracking-tight">{organization.nameAr}</h2>
              <p className="text-xs text-slate-700 font-semibold">{organization.nameEn}</p>
              <div className="flex items-center gap-4 text-[11px] text-slate-600 mt-1 font-mono">
                <span>الرقم الضريبي: {organization.taxNumber}</span>
                {organization.commercialRegister && (
                  <span>س.ت: {organization.commercialRegister}</span>
                )}
              </div>
              {organization.address && (
                <p className="text-[11px] text-slate-600 mt-0.5">{organization.address}</p>
              )}
            </div>

            <div className="text-center px-4 py-2 bg-slate-100 rounded-xl border border-slate-300">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">JOURNAL VOUCHER</span>
              <h1 className="text-lg font-black text-slate-950 mt-0.5">{isAr ? "سند قيد محاسبي" : "Journal Voucher"}</h1>
              <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full mt-1 inline-block">
                {entry.status === "posted" ? (isAr ? "مرحل ومعتمد" : "Posted") : entry.status}
              </span>
            </div>

            <div className="text-left font-mono text-xs text-slate-700 space-y-1">
              <div>
                <span className="text-slate-500">{isAr ? "رقم القيد: " : "Entry #: "}</span>
                <span className="font-bold text-slate-950">{entry.entryNumber}</span>
              </div>
              <div>
                <span className="text-slate-500">{isAr ? "التاريخ: " : "Date: "}</span>
                <span className="font-bold text-slate-950">{formatDate(entry.date, locale)}</span>
              </div>
              <div>
                <span className="text-slate-500">{isAr ? "المرجع: " : "Ref: "}</span>
                <span className="font-semibold text-slate-800">{entry.referenceType || "قيد يدوي"}</span>
              </div>
            </div>
          </div>

          {/* Entry Description Memo */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mt-4 text-xs">
            <span className="text-slate-500 font-bold ml-2">{isAr ? "بيان وشرح القيد:" : "Description / Memo:"}</span>
            <span className="font-bold text-slate-900">{entry.description}</span>
          </div>

          {/* Journal Double-Entry Lines Table */}
          <div className="mt-4 border border-slate-300 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <th className="p-2.5 font-mono w-28 text-slate-900">{isAr ? "كود الحساب" : "Code"}</th>
                  <th className="p-2.5 text-slate-900">{isAr ? "اسم الحساب الدفتري" : "Account Name"}</th>
                  <th className="p-2.5 text-slate-900">{isAr ? "البيان التحليلي" : "Line Description"}</th>
                  <th className="p-2.5 text-slate-900">{isAr ? "مركز التكلفة" : "Cost Center"}</th>
                  <th className="p-2.5 text-left font-mono w-32 text-slate-950">{isAr ? "مدين (Debit)" : "Debit"}</th>
                  <th className="p-2.5 text-left font-mono w-32 text-slate-950">{isAr ? "دائن (Credit)" : "Credit"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono text-slate-900">
                {entry.lines.map((line, idx) => {
                  const cc = line.costCenterId ? costCenters.find(c => c.id === line.costCenterId) : null;
                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-700">{line.accountCode}</td>
                      <td className="p-2.5 font-sans font-bold text-slate-950">{line.accountName}</td>
                      <td className="p-2.5 font-sans text-slate-600 text-[11px]">{line.description || line.notes || "---"}</td>
                      <td className="p-2.5 font-sans text-[11px] text-slate-700">
                        {cc ? `${cc.code} - ${isAr ? cc.nameAr : cc.nameEn}` : "---"}
                      </td>
                      <td className="p-2.5 text-left font-bold text-slate-950">
                        {line.debit > 0 ? formatCurrency(line.debit, organization.currency, locale) : "-"}
                      </td>
                      <td className="p-2.5 text-left font-bold text-slate-950">
                        {line.credit > 0 ? formatCurrency(line.credit, organization.currency, locale) : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-400 text-slate-950 font-mono text-xs">
                  <td colSpan={4} className="p-3 font-sans text-right font-black">
                    {isAr ? "الإجمالي الكلي للقيد المحاسبي:" : "Voucher Total Debit & Credit:"}
                  </td>
                  <td className="p-3 text-left font-black text-slate-950">
                    {formatCurrency(entry.totalDebit, organization.currency, locale)}
                  </td>
                  <td className="p-3 text-left font-black text-slate-950">
                    {formatCurrency(entry.totalCredit, organization.currency, locale)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Balance Confirmation Stamp */}
          <div className="flex items-center justify-between mt-3 text-xs text-slate-600">
            <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>{isAr ? "القيد متوازن محاسبياً (المدين = الدائن) وتم ترحيله إلى سجل الأستاذ العام" : "Journal entry is perfectly balanced and posted to General Ledger"}</span>
            </div>
            <div className="font-mono text-[11px]">
              <span>{isAr ? "العملة: " : "Currency: "}</span>
              <span className="font-bold text-slate-900">{organization.currency}</span>
            </div>
          </div>

          {/* Audit Trail Note if edited */}
          {entry.description?.includes("[تم التعديل") && (
            <div className="mt-4 p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-[11px] font-sans flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{entry.description.slice(entry.description.indexOf("[تم التعديل"))}</span>
            </div>
          )}

          {/* Signatures & Approvals Section */}
          <div className="mt-10 pt-4 border-t border-slate-300 text-xs text-slate-700">
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <div className="font-bold text-slate-900 mb-8">{isAr ? "إعداد وتنظيم (المحاسب)" : "Prepared By"}</div>
                <div className="border-t border-dotted border-slate-400 pt-1 text-[11px] text-slate-600">
                  {entry.createdBy || currentUserPlaceholder(isAr)}
                </div>
              </div>
              <div>
                <div className="font-bold text-slate-900 mb-8">{isAr ? "المراجعة والتدقيق" : "Reviewed By"}</div>
                <div className="border-t border-dotted border-slate-400 pt-1 text-[11px] text-slate-600">
                  {isAr ? "المراجع الداخلي" : "Internal Auditor"}
                </div>
              </div>
              <div>
                <div className="font-bold text-slate-900 mb-8">{isAr ? "اعتماد وترحيل الإدارة" : "Approved By"}</div>
                <div className="border-t border-dotted border-slate-400 pt-1 text-[11px] text-slate-600">
                  {isAr ? "المدير المالي" : "Chief Financial Officer"}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mt-6 text-[10px] text-slate-500 font-mono border-t border-slate-200 pt-2">
              <span>سند ERP — نظام إدارة الموارد المالية والمحاسبية</span>
              <span>تاريخ الطباعة: {new Date().toLocaleString("ar-EG")}</span>
            </div>
          </div>
        </div>

        {/* Modal Action Controls */}
        <div className="flex justify-end gap-2.5 pt-2 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            {isAr ? "إغلاق" : "Close"}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/60 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{isAr ? "طباعة السند الرسمي" : "Print Journal Voucher"}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}

function currentUserPlaceholder(isAr: boolean) {
  return isAr ? "المحاسب المالي المسؤول" : "Accountant in Charge";
}
