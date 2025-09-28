"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  GlobalFilters,
  type FiltersState,
} from "@/components/filters/global-filters";
import { KpiCard } from "@/components/dashboard/kpi-card";
import {
  TrendChart,
  CategoryPie,
  type TrendPoint,
  type CategorySlice,
} from "@/components/dashboard/charts";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

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

// 🔢 INR formatter (Indian digit grouping)
const formatINR = (n: number) =>
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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
      const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
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

  const showSkeletons = !filters || loading;

  return (
    <div className="mx-auto max-w-screen-2xl px-3 sm:px-4 lg:px-0">
      <div className="space-y-6">
        {/* Page title scales down on mobile */}
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Dashboard
        </h1>

        {/* Make sure filters never cause sideways scroll on mobile */}
        <div className="overflow-x-auto">
          <GlobalFilters
            categories={cats.map((c) => ({ id: c.id, name: c.name }))}
            onChange={setFilters}
          />
        </div>

        {/* KPIs */}
        {showSkeletons ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4 lg:gap-4">
            <div className="min-w-0 rounded-2xl border bg-card p-3 shadow-sm sm:p-4">
              <Skeleton className="h-4 w-24 sm:w-28" />
              <Skeleton className="mt-3 h-6 w-20 sm:h-7 sm:w-24" />
            </div>
            <div className="min-w-0 rounded-2xl border bg-card p-3 shadow-sm sm:p-4">
              <Skeleton className="h-4 w-24 sm:w-28" />
              <Skeleton className="mt-3 h-6 w-20 sm:h-7 sm:w-24" />
            </div>
            <div className="min-w-0 rounded-2xl border bg-card p-3 shadow-sm sm:p-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="mt-3 h-6 w-20 sm:h-7 sm:w-24" />
            </div>
            <div className="min-w-0 rounded-2xl border bg-card p-3 shadow-sm sm:p-4">
              <Skeleton className="h-4 w-20 sm:w-24" />
              <Skeleton className="mt-3 h-6 w-10 sm:h-7 sm:w-10" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4 lg:gap-4">
            {/* min-w-0 prevents number wrapping/overflow on tiny screens */}
            <div className="min-w-0">
              <KpiCard title="This Range Spend" value={`₹ ${formatINR(expense)}`} />
            </div>
            <div className="min-w-0">
              <KpiCard title="This Range Income" value={`₹ ${formatINR(income)}`} />
            </div>
            <div className="min-w-0">
              <KpiCard title="Net" value={`₹ ${formatINR(net)}`} />
            </div>
            <div className="min-w-0">
              <KpiCard title="Transactions" value={`${count}`} />
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border bg-card p-3 shadow-sm sm:p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-base font-medium sm:text-lg">Income vs Expense</h2>
              {loading && (
                <span className="text-xs text-muted-foreground">Loading…</span>
              )}
            </div>
            {showSkeletons ? (
              <Skeleton className="h-[220px] w-full rounded-xl sm:h-[260px]" />
            ) : txs.length === 0 ? (
              <EmptyState
                title="No data for this range"
                description="Try widening your date range or adding transactions."
              />
            ) : (
              // Parent has stable, responsive height
              <div className="h-[220px] w-full sm:h-[260px]">
                <TrendChart data={trendData} />
              </div>
            )}
          </div>

          <div className="rounded-2xl border bg-card p-3 shadow-sm sm:p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-base font-medium sm:text-lg">Spend by Category</h2>
              {loading && (
                <span className="text-xs text-muted-foreground">Loading…</span>
              )}
            </div>
            {showSkeletons ? (
              <Skeleton className="h-[220px] w-full rounded-xl sm:h-[260px]" />
            ) : txs.length === 0 ? (
              <EmptyState
                title="No expenses to show"
                description="When you add expense transactions, they’ll appear here."
              />
            ) : (
              <div className="h-[220px] w-full sm:h-[260px]">
                <CategoryPie data={categoryPieData} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
