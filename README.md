# Expense Tracker

Modern, production-ready expense tracker built with **Next.js App Router (TypeScript)**, **Supabase** (Auth, DB, Realtime, Storage), **Tailwind + shadcn/ui**, **Recharts**, and **RLS** done right.

## ✨ Features

- Email/password authentication (Supabase)
- Secure RLS: user-scoped reads/writes
- Transactions & Categories (CRUD) with realtime live updates
- Budgets per category/month with progress bars (live updates from expenses)
- Dashboard: KPIs, monthly trend (area), category spend (pie)
- Global filters: date range, type, category
- Reports + **Export to PDF** (jsPDF + autoTable)
- Polished UI: Tailwind + shadcn/ui, lucide icons, dark mode
- Accessibility touches: keyboard-friendly, focusable actions
- Deployed to Vercel + Supabase

---

## 🧱 Tech Stack

- **Frontend:** Next.js 15 (App Router), TypeScript, React 18
- **Styling:** Tailwind CSS v4, shadcn/ui, lucide-react
- **Data:** Supabase (Postgres, Auth, Realtime, Storage)
- **State/Forms:** React Hook Form + Zod
- **Dates:** date-fns
- **Charts:** Recharts
- **PDF:** jsPDF + jspdf-autotable

---

## 📦 Folder Structure (key parts)

