"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { GlobalFilters, type FiltersState } from "@/components/filters/global-filters";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { generateReportPDF, type ReportCategoryRow, type ReportTxRow } from "@/lib/reporting/pdf";

type Transaction = {
  id: string;
  amount: number;
  type: "income" | "expense";
  category_id: string | null;
  occurred_at: string; // YYYY-MM-DD or ISO
  note: string | null;
};

type Category = {
  id: string;
  name: string;
  color: string | null;
};

export default function ReportsPage() {
  const supabase = createSupabaseBrowserClient();
  const [filters, setFilters] = useState<FiltersState | null>(null);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  // Load categories once
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("categories")
        .select("id,name,color")
        .order("created_at", { ascending: false });
      if (mounted && data) setCats(data as Category[]);
    })();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  // Load transactions per filters (with a fixed 2s artificial delay)
  useEffect(() => {
    if (!filters) return;
    let mounted = true;

    (async () => {
      setLoading(true);

      // ✅ Artificial delay: always wait 2 seconds before showing results
      await new Promise((resolve) => setTimeout(resolve, 2000));

      let q = supabase
        .from("transactions")
        .select("*")
        .gte("occurred_at", filters.from)
        .lte("occurred_at", filters.to)
        .order("occurred_at", { ascending: true });

      if (filters.type && filters.type !== "all") {
        q = q.eq("type", filters.type);
      }
      if (filters.categoryId) {
        q = q.eq("category_id", filters.categoryId);
      }

      const { data, error } = await q;
      if (!error && data && mounted) setTxs(data as Transaction[]);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [filters, supabase]);

  // KPI calculations
  const { income, expense, net, count } = useMemo(() => {
    const income = txs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const expense = txs.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    return { income, expense, net: income - expense, count: txs.length };
  }, [txs]);

  // Category breakdown (expenses)
  const catMap = useMemo(() => {
    const m = new Map<string, Category>();
    for (const c of cats) m.set(c.id, c);
    return m;
  }, [cats]);

  const categoryRows: ReportCategoryRow[] = useMemo(() => {
    const sums = new Map<string, number>();
    for (const t of txs) {
      if (t.type !== "expense") continue;
      const key = t.category_id ?? "__uncategorized__";
      sums.set(key, (sums.get(key) ?? 0) + Number(t.amount));
    }
    const rows: ReportCategoryRow[] = [];
    for (const [key, value] of sums.entries()) {
      if (key === "__uncategorized__") {
        rows.push({ name: "Uncategorized", amount: value });
      } else {
        const c = catMap.get(key);
        rows.push({ name: c?.name ?? "Unknown", amount: value });
      }
    }
    return rows.sort((a, b) => b.amount - a.amount);
  }, [txs, catMap]);

  // Tx rows for PDF
  const txRows: ReportTxRow[] = useMemo(() => {
    return txs.map((t) => ({
      date: new Date(t.occurred_at).toLocaleDateString(),
      type: t.type,
      category: t.category_id ? (catMap.get(t.category_id)?.name ?? "Unknown") : "Uncategorized",
      amount: Number(t.amount),
      note: t.note ?? ""
    }));
  }, [txs, catMap]);

  const exportPdf = () => {
    if (!filters) return;
    generateReportPDF({
      title: "Expense Tracker Report",
      from: filters.from,
      to: filters.to,
      kpis: { income, expense, net, count },
      categories: categoryRows,
      transactions: txRows
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <Button onClick={exportPdf} disabled={!filters || loading}>
          {loading ? "Preparing…" : "Export PDF"}
        </Button>
      </div>

      <GlobalFilters
        categories={cats.map(c => ({ id: c.id, name: c.name }))}
        onChange={setFilters}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Income</div>
          <div className="mt-2 text-2xl font-semibold">${income.toFixed(2)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Expense</div>
          <div className="mt-2 text-2xl font-semibold">${expense.toFixed(2)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Net</div>
          <div className="mt-2 text-2xl font-semibold">${net.toFixed(2)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Transactions</div>
          <div className="mt-2 text-2xl font-semibold">{count}</div>
        </Card>
      </div>

      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="mb-2 text-lg font-medium">Category Breakdown (Expenses)</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="px-4 py-2 text-left">Category</th>
                <th className="px-4 py-2 text-left">Amount</th>
              </tr>
            </thead>
            <tbody>
              {categoryRows.map((r, idx) => (
                <tr key={`${r.name}-${idx}`} className="border-b last:border-0">
                  <td className="px-4 py-2">{r.name}</td>
                  <td className="px-4 py-2">${r.amount.toFixed(2)}</td>
                </tr>
              ))}
              {categoryRows.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-muted-foreground">
                    {loading ? "Loading…" : "No expenses in this range"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="mb-2 text-lg font-medium">Transactions</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Category</th>
                <th className="px-4 py-2 text-left">Amount</th>
                <th className="px-4 py-2 text-left">Note</th>
              </tr>
            </thead>
            <tbody>
              {txRows.map((t, idx) => (
                <tr key={idx} className="border-b last:border-0">
                  <td className="px-4 py-2">{t.date}</td>
                  <td className="px-4 py-2">{t.type}</td>
                  <td className="px-4 py-2">{t.category}</td>
                  <td className="px-4 py-2">${t.amount.toFixed(2)}</td>
                  <td className="px-4 py-2">{t.note || "-"}</td>
                </tr>
              ))}
              {txRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    {loading ? "Loading…" : "No transactions in this range"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
  