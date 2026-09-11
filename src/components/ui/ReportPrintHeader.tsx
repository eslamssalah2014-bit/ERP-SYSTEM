import React from "react";
import { Organization, Language } from "@/types/erp";
import { formatDate } from "@/lib/utils";

interface ReportPrintHeaderProps {
  organization: Organization;
  reportTitleAr: string;
  reportTitleEn: string;
  dateFrom?: string;
  dateTo?: string;
  locale?: Language;
  extraMeta?: string;
}

export function ReportPrintHeader({
  organization,
  reportTitleAr,
  reportTitleEn,
  dateFrom,
  dateTo,
  locale = "ar",
  extraMeta,
}: ReportPrintHeaderProps) {
  const isAr = locale === "ar";
  const nowStr = new Date().toLocaleString("ar-EG");

  return (
    <div className="hidden print:block mb-6 border-b-2 border-slate-900 pb-4 text-slate-900">
      <div className="flex items-center justify-between">
        <div className="text-right">
          <h2 className="text-lg font-black text-slate-900">{organization.nameAr}</h2>
          <p className="text-xs text-slate-700 font-semibold">{organization.nameEn}</p>
          <div className="flex items-center gap-4 text-[11px] text-slate-600 mt-1 font-mono">
            <span>الرقم الضريبي: {organization.taxNumber}</span>
            {organization.commercialRegister && (
              <span>س.ت: {organization.commercialRegister}</span>
            )}
          </div>
        </div>

        <div className="text-center px-4 py-2 border border-slate-400 rounded-lg bg-slate-50">
          <h1 className="text-base font-black text-slate-950">{reportTitleAr}</h1>
          <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">{reportTitleEn}</p>
          {(dateFrom || dateTo) && (
            <p className="text-[10px] text-slate-600 font-mono mt-0.5">
              الفترة: {dateFrom ? formatDate(dateFrom, locale) : "من البداية"} إلى {dateTo ? formatDate(dateTo, locale) : "تاريخه"}
            </p>
          )}
        </div>

        <div className="text-left text-[11px] text-slate-600 font-mono space-y-0.5">
          <div>تاريخ الطباعة: {nowStr}</div>
          <div>العملة: {organization.currency}</div>
          {extraMeta && <div className="text-slate-700 font-bold">{extraMeta}</div>}
        </div>
      </div>
    </div>
  );
}

export function ReportPrintFooter({
  organization,
}: {
  organization: Organization;
}) {
  return (
    <div className="hidden print:block mt-8 pt-4 border-t border-slate-400 text-[10px] text-slate-600">
      <div className="grid grid-cols-3 text-center gap-4 pt-2">
        <div>
          <div className="font-bold text-slate-800 mb-8">المحاسب المسؤول</div>
          <div className="border-t border-dotted border-slate-400 pt-1 text-slate-500">التوقيع والاعتماد</div>
        </div>
        <div>
          <div className="font-bold text-slate-800 mb-8">المراجع المالي</div>
          <div className="border-t border-dotted border-slate-400 pt-1 text-slate-500">التوقيع والاعتماد</div>
        </div>
        <div>
          <div className="font-bold text-slate-800 mb-8">المدير المالي / الإدارة</div>
          <div className="border-t border-dotted border-slate-400 pt-1 text-slate-500">الختم والتصديق</div>
        </div>
      </div>
      <div className="flex justify-between items-center mt-6 text-[9px] text-slate-500 font-mono border-t border-slate-200 pt-1">
        <span>سند ERP — نظام الحسابات العامة وإدارة الموارد</span>
        <span>صفحة تقرير رسمية صادرة آلياً</span>
      </div>
    </div>
  );
}
