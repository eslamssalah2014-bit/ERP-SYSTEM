"use client";

import { useState } from "react";
import { ERPProvider } from "@/context/erp-context";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import CommandPalette from "@/components/layout/CommandPalette";
import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <html lang="ar" dir="rtl" className="dark">
      <head>
        <title>سند ERP | المنظومة السحابية المتكاملة لإدارة المنشآت</title>
        <meta name="description" content="منظومة سحابية متكاملة لإدارة المخزون والمبيعات والمشتريات والحسابات العامة والفوترة الإلكترونية للشركات في مصر والخليج" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-slate-950 text-slate-100 font-sans antialiased overflow-hidden selection:bg-emerald-500 selection:text-white">
        <ERPProvider>
          <div className="flex h-screen w-screen overflow-hidden bg-slate-950">
            {/* Main Navigation Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
              <Header onOpenSearch={() => setIsSearchOpen(true)} />
              <main className="flex-1 overflow-y-auto p-6 bg-slate-950/60 custom-scrollbar">
                <div className="max-w-7xl mx-auto space-y-6">
                  {children}
                </div>
              </main>
            </div>

            {/* Global Command Palette */}
            <CommandPalette
              isOpen={isSearchOpen}
              onClose={() => setIsSearchOpen(false)}
            />
          </div>
        </ERPProvider>
      </body>
    </html>
  );
}
