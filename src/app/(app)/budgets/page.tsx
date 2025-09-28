"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AddBudgetModal } from "@/components/budgets/add-budget-modal";
import { EditBudgetModal } from "@/components/budgets/edit-budget-modal";
import { DeleteBudgetButton } from "@/components/budgets/delete-budget-button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

type Budget = {
  id: string;
  category_id: string;
  month: number;
  year: number;
  amount: number;
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

export default function BudgetsPage() {
  const supabase = createSupabaseBrowserClient();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [spending, setSpending] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);

    // 1) Categories
    const { data: catData } = await supabase
      .from("categories")
      .select("id,name,color");
    if (catData) setCategories(catData as Category[]);

    // 2) Budgets
    const { data: budData } = await supabase.from("budgets").select("*");
    if (budData) setBudgets(budData as Budget[]);

    // 3) Current month expenses
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];

    const { data: txData } = await supabase
      .from("transactions")
      .select("category_id,amount,type,occurred_at")
      .gte("occurred_at", start)
      .lte("occurred_at", end)
      .eq("type", "expense");

    if (txData) {
      const sums: Record<string, number> = {};
      for (const t of txData) {
        const key = t.category_id ?? "__uncategorized__";
        sums[key] = (sums[key] ?? 0) + Number(t.amount);
      }
      setSpending(sums);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();

    // realtime: budgets
    const budgetChannel = supabase
      .channel("budgets-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "budgets" },
        () => fetchData()
      )
      .subscribe();

    // realtime: transactions (affects spent bar)
    const txChannel = supabase
      .channel("txs-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(budgetChannel);
      supabase.removeChannel(txChannel);
    };
  }, [supabase, fetchData]);

  return (
    <div className="space-y-6">
      {/* Header: stack on mobile, row on sm+ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {loading ? (
          <>
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-9 w-36" />
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">Budgets</h1>
            <div className="w-full sm:w-auto">
              <AddBudgetModal />
            </div>
          </>
        )}
      </div>

      {/* Loading skeleton grid: 1 → 2 (md) → 3 (lg) */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-2 w-full" />
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-24" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && budgets.length === 0 && (
        <Card className="p-6">
          <EmptyState
            title="No budgets yet"
            description="Create a monthly budget to track your spending."
            action={
              <div className="w-full sm:w-auto">
                <AddBudgetModal />
              </div>
            }
          />
        </Card>
      )}

      {/* Budgets grid: 1 → 2 (md) → 3 (lg) */}
      {!loading && budgets.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {budgets.map((b) => {
            const cat = categories.find((c) => c.id === b.category_id);
            const spent = spending[b.category_id] ?? 0;
            const pct = Math.min((spent / b.amount) * 100, 100);

            let barColor = "bg-green-500";
            if (spent > b.amount) barColor = "bg-red-500";
            else if (pct > 80) barColor = "bg-amber-500";

            return (
              <Card key={b.id} className="space-y-2 p-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-medium">
                    {cat ? (
                      <>
                        <span
                          className="inline-block h-3 w-3 rounded-full"
                          style={{ backgroundColor: cat.color ?? "#9ca3af" }}
                          aria-label={`Category color ${cat.color ?? "gray"}`}
                        />
                        {cat.name}
                      </>
                    ) : (
                      "Unknown category"
                    )}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {b.month}/{b.year}
                  </span>
                </div>

                <div className="text-sm tabular-nums">
                  Budget: ₹ {formatINR(b.amount)} | Spent: ₹ {formatINR(spent)}
                </div>

                <div
                  className="h-2 w-full rounded bg-muted"
                  aria-label="Budget progress bar"
                >
                  <div
                    className={`h-2 rounded ${barColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <EditBudgetModal budget={b} />
                  <DeleteBudgetButton id={b.id} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
