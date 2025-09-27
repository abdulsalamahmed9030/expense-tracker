"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AddBudgetModal } from "@/components/budgets/add-budget-modal";
import { EditBudgetModal } from "@/components/budgets/edit-budget-modal";
import { DeleteBudgetButton } from "@/components/budgets/delete-budget-button";
import { Card } from "@/components/ui/card";

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

export default function BudgetsPage() {
  const supabase = createSupabaseBrowserClient();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [spending, setSpending] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const { data: catData } = await supabase
      .from("categories")
      .select("id,name,color");
    if (catData) setCategories(catData as Category[]);

    const { data: budData } = await supabase.from("budgets").select("*");
    if (budData) setBudgets(budData as Budget[]);

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
        const cat = t.category_id ?? "__uncategorized__";
        sums[cat] = (sums[cat] ?? 0) + Number(t.amount);
      }
      setSpending(sums);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();

    const budgetChannel = supabase
      .channel("budgets-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "budgets" },
        () => {
          fetchData();
        }
      )
      .subscribe();

    const txChannel = supabase
      .channel("txs-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(budgetChannel);
      supabase.removeChannel(txChannel);
    };
  }, [supabase, fetchData]);

  if (loading) return <p className="p-6 text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Budgets</h1>
        <AddBudgetModal />
      </div>

      {budgets.length === 0 && (
        <p className="text-muted-foreground">No budgets set yet.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {budgets.map((b) => {
          const cat = categories.find((c) => c.id === b.category_id);
          const spent = spending[b.category_id] ?? 0;
          const pct = Math.min((spent / b.amount) * 100, 100);

          let barColor = "bg-green-500";
          if (spent > b.amount) barColor = "bg-red-500";
          else if (pct > 80) barColor = "bg-amber-500";

          return (
            <Card key={b.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium flex items-center gap-2">
                  {cat ? (
                    <>
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: cat.color ?? "#9ca3af" }}
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

              <div className="text-sm">
                Budget: ${b.amount.toFixed(2)} | Spent: ${spent.toFixed(2)}
              </div>

              <div className="h-2 w-full rounded bg-muted">
                <div
                  className={`h-2 rounded ${barColor}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* ✅ Actions */}
              <div className="flex gap-2 pt-2">
                <EditBudgetModal budget={b} />
                <DeleteBudgetButton id={b.id!} />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
