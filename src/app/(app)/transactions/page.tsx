"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AddTransactionModal } from "@/components/transactions/add-transaction-modal";
import { EditTransactionModal } from "@/components/transactions/edit-transaction-modal";
import { DeleteTransactionButton } from "@/components/transactions/delete-transaction-button";
import { CategoryPill } from "@/components/categories/category-pill";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

type Transaction = {
  id: string;
  amount: number;
  type: "income" | "expense";
  category_id: string | null;
  occurred_at: string; // YYYY-MM-DD or ISO
  note: string | null;
  user_id?: string;
};

type Category = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
};

export default function TransactionsPage() {
  const supabase = createSupabaseBrowserClient();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Build id -> category map
  const catMap = useMemo(() => {
    const m = new Map<string, Category>();
    for (const c of categories) m.set(c.id, c);
    return m;
  }, [categories]);

  useEffect(() => {
    let isMounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      setLoading(true);

      const [{ data: tx }, { data: cats }] = await Promise.all([
        supabase.from("transactions").select("*").order("occurred_at", { ascending: false }),
        supabase.from("categories").select("id,name,color,icon").order("created_at", { ascending: false }),
      ]);

      if (isMounted && tx) setTransactions(tx as Transaction[]);
      if (isMounted && cats) setCategories(cats as Category[]);
      setLoading(false);

      // realtime for current user
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return;

      channel = supabase
        .channel("transactions+categories-realtime")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "transactions", filter: `user_id=eq.${userId}` },
          (payload) => setTransactions((prev) => [payload.new as Transaction, ...prev])
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "transactions", filter: `user_id=eq.${userId}` },
          (payload) => {
            const next = payload.new as Transaction;
            setTransactions((prev) => prev.map((t) => (t.id === next.id ? next : t)));
          }
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "transactions", filter: `user_id=eq.${userId}` },
          (payload) => {
            const oldRow = payload.old as { id: string };
            setTransactions((prev) => prev.filter((t) => t.id !== oldRow.id));
          }
        )
        .subscribe();
    };

    init();

    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Transactions</h1>

      <AddTransactionModal />

      <div className="rounded-2xl border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30">
            <tr>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-left">Category</th>
              <th className="px-4 py-2 text-left">Amount</th>
              <th className="px-4 py-2 text-left">Note</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading &&
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-2"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-2"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-4 py-2"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-4 py-2"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-4 py-2"><Skeleton className="h-4 w-28" /></td>
                  <td className="px-4 py-2"><Skeleton className="h-8 w-20" /></td>
                </tr>
              ))}

            {!loading &&
              transactions.map((t) => {
                const cat = t.category_id ? catMap.get(t.category_id) : null;
                return (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="px-4 py-2">{new Date(t.occurred_at).toLocaleDateString()}</td>
                    <td className="px-4 py-2">{t.type}</td>
                    <td className="px-4 py-2">
                      {cat ? (
                        <CategoryPill name={cat.name} color={cat.color} />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2">${Number(t.amount).toFixed(2)}</td>
                    <td className="px-4 py-2">{t.note ?? "-"}</td>
                    <td className="px-4 py-2 flex gap-2">
                      <EditTransactionModal transaction={t} />
                      <DeleteTransactionButton id={t.id} />
                    </td>
                  </tr>
                );
              })}

            {!loading && transactions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center">
                  <EmptyState
                    title="No transactions yet"
                    description="Add your first transaction to get started."
                    action={<AddTransactionModal />}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
