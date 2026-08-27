# Sanad ERP (سند لتخطيط موارد المؤسسات)

A modern, full-stack Enterprise Resource Planning (ERP) web application built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase (PostgreSQL)**.

---

## 🚀 Features & Modules

- **Chart of Accounts & General Ledger**: Complete 5-tier accounting tree, journal entries, balance sheet, trial balance, and income statements.
- **Sales & Point of Sale (POS)**: POS fast checkout, ZATCA e-invoicing compliance, quotations, and accounts receivable (AR).
- **Purchases & Inventory**: Multi-warehouse stock tracking, Kardex inventory valuation, purchase invoices, and vendor payables (AP).
- **Treasury & Checks Portfolio**: Real-time cash safes, bank accounts, cash receipts/payments, and check lifecycle management.
- **Cost Centers & Audit Trail**: Multi-level hierarchical cost centers and audit logs.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Turbopack, Standalone Output)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL with RLS)
- **Icons & UI**: [Lucide React](https://lucide.dev/), [Canvas Confetti](https://github.com/catdad/canvas-confetti), [Recharts](https://recharts.org/)
- **Styling**: Tailwind CSS v4

---

## 🌐 Deploy as a Standard Render Web Service (render.com)

You can deploy Sanad ERP directly on Render as a **Standard Web Service** without Blueprint configuration.

### Deployment Steps:

1. Open your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** → **Web Service**.
3. Select **Build and deploy from a Git repository** and connect: `https://github.com/eslamssalah2014-bit/ERP-SYSTEM.git`.
4. Configure the Web Service settings:

| Setting | Value | Notes |
| :--- | :--- | :--- |
| **Name** | `sanad-erp` | Or your preferred service name |
| **Region** | `Frankfurt (EU Central)` | Recommended for MENA / Europe |
| **Branch** | `main` | Production branch |
| **Root Directory** | *(Leave blank)* | Uses root directory |
| **Runtime** | `Node` | Standard Node.js runtime |
| **Build Command** | `npm install && npm run build` | Installs deps and builds Next.js |
| **Start Command** | `npm run start` | Runs Next.js production server |
| **Instance Type** | `Free` or `Starter` | Works on both free and paid tiers |

5. Under **Advanced Settings**, set:
   - **Health Check Path**: `/api/health`

6. Under **Environment Variables**, add the following 4 variables:

| Key | Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Production environment mode |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project-id.supabase.co` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your-supabase-anon-key` | Public Anon Client Key |
| `SUPABASE_SERVICE_ROLE_KEY` | `your-supabase-service-role-key` | Server-side Admin Secret Key |

7. Click **Create Web Service**.
8. Render will build and launch the application. Once live, it will monitor `/api/health` and provide your live URL (e.g. `https://sanad-erp.onrender.com`).

---

## 💻 Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/eslamssalah2014-bit/ERP-SYSTEM.git
   cd ERP-SYSTEM
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase keys
   ```

4. Run the local dev server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. Health check verification:
   ```bash
   curl http://localhost:3000/api/health
   ```