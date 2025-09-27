"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { GlobalFilters, type FiltersState } from "@/components/filters/global-filters";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { TrendChart, CategoryPie, type TrendPoint, type CategorySlice } from "@/components/dashboard/charts";

type Transaction = {
  id: string;
  user_id: string;
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

export default function DashboardPage() {
  const supabase = createSupabaseBrowserClient();

  const [filters, setFilters] = useState<FiltersState | null>(null);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  // fetch categories once
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

  // fetch transactions whenever filters change
  useEffect(() => {
    if (!filters) return;
    let mounted = true;

    (async () => {
      setLoading(true);

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
    const income = txs
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + Number(t.amount), 0);
    const expense = txs
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + Number(t.amount), 0);
    return { income, expense, net: income - expense, count: txs.length };
  }, [txs]);

  // Trend chart: group by month label (YYYY-MM)
  const trendData: TrendPoint[] = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    for (const t of txs) {
      const d = new Date(t.occurred_at);
      const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map.has(label)) map.set(label, { income: 0, expense: 0 });
      const entry = map.get(label)!;
      if (t.type === "income") entry.income += Number(t.amount);
      else entry.expense += Number(t.amount);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([label, v]) => ({ label, income: v.income, expense: v.expense }));
  }, [txs]);

  // Category lookup map
  const catMap = useMemo(() => {
    const m = new Map<string, Category>();
    for (const c of cats) m.set(c.id, c);
    return m;
  }, [cats]);

  // Category pie: sum of EXPENSES by category with color
  const categoryPieData: CategorySlice[] = useMemo(() => {
    const sums = new Map<string, number>();
    for (const t of txs) {
      if (t.type !== "expense") continue;
      const key = t.category_id ?? "__uncategorized__";
      sums.set(key, (sums.get(key) ?? 0) + Number(t.amount));
    }
    const arr: CategorySlice[] = [];
    for (const [key, value] of sums.entries()) {
      if (key === "__uncategorized__") {
        arr.push({ name: "Uncategorized", value, color: "#9ca3af" }); // gray
      } else {
        const c = catMap.get(key);
        arr.push({
          name: c?.name ?? "Unknown",
          value,
          color: c?.color ?? "#9ca3af",
        });
      }
    }
    return arr.sort((a, b) => b.value - a.value);
  }, [txs, catMap]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>

      <GlobalFilters
        categories={cats.map((c) => ({ id: c.id, name: c.name }))}
        onChange={setFilters}
      />

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="This Range Spend" value={`$${expense.toFixed(2)}`} />
        <KpiCard title="This Range Income" value={`$${income.toFixed(2)}`} />
        <KpiCard title="Net" value={`$${net.toFixed(2)}`} />
        <KpiCard title="Transactions" value={`${count}`} />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-medium">Income vs Expense</h2>
            {loading && (
              <span className="text-xs text-muted-foreground">Loading…</span>
            )}
          </div>
          <TrendChart data={trendData} />
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-medium">Spend by Category</h2>
            {loading && (
              <span className="text-xs text-muted-foreground">Loading…</span>
            )}
          </div>
          <CategoryPie data={categoryPieData} />
        </div>
      </div>
    </div>
  );
}
