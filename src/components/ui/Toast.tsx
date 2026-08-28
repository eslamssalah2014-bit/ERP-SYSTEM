"use client";

import React from "react";
import { CheckCircle2, AlertCircle, Info, Loader2, X } from "lucide-react";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info" | "loading";
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
  isAr?: boolean;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss, isAr = true }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 max-w-md w-full pointer-events-none p-2 sm:p-0"
      style={{ direction: isAr ? "rtl" : "ltr" }}
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === "success";
        const isError = toast.type === "error";
        const isLoading = toast.type === "loading";

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all duration-300 transform translate-y-0 animate-in fade-in slide-in-from-bottom-5 ${
              isSuccess
                ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-100 shadow-emerald-950/40"
                : isError
                ? "bg-rose-950/90 border-rose-500/40 text-rose-100 shadow-rose-950/40"
                : isLoading
                ? "bg-indigo-950/90 border-indigo-500/40 text-indigo-100 shadow-indigo-950/40"
                : "bg-slate-900/90 border-slate-700/60 text-slate-100 shadow-slate-950/40"
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {isError && <AlertCircle className="w-5 h-5 text-rose-400" />}
              {isLoading && <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />}
              {!isSuccess && !isError && !isLoading && <Info className="w-5 h-5 text-sky-400" />}
            </div>

            <div className="flex-1 min-w-0">
              {toast.title && (
                <h4 className="text-xs font-bold tracking-tight mb-0.5">
                  {toast.title}
                </h4>
              )}
              <p className="text-xs leading-relaxed opacity-90 break-words font-medium">
                {toast.message}
              </p>
            </div>

            {!isLoading && (
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
