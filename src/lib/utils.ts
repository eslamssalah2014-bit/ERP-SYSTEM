import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Currency, Language } from "@/types/erp";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(prefix: string = "id"): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
}

export function formatCurrency(amount: number, currency: Currency = "EGP", lang: Language = "ar"): string {
  const currencyLabels: { [key in Currency]: { ar: string; en: string } } = {
    EGP: { ar: "ج.م", en: "EGP" },
    SAR: { ar: "ر.س", en: "SAR" },
    AED: { ar: "د.إ", en: "AED" },
    USD: { ar: "$", en: "USD" },
  };

  const formattedNumber = new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  const symbol = currencyLabels[currency]?.[lang] || currency;
  return lang === "ar" ? `${formattedNumber} ${symbol}` : `${symbol} ${formattedNumber}`;
}

export function formatDate(dateString: string, lang: Language = "ar"): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  } catch {
    return dateString;
  }
}
