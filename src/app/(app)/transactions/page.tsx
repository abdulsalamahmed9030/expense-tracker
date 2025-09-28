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

// 🔢 INR formatter (Indian grouping)
const formatINR = (n: number) =>
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export default function TransactionsPage() {
  const supabase = createSupabaseBrowserClient();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

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

      {/* Make trigger full-width on mobile for better ergonomics */}
      <div className="w-full sm:w-auto">
        <AddTransactionModal />
      </div>

      {/* ---------- MOBILE: Card list (no horizontal scroll) ---------- */}
      <div className="space-y-3 sm:hidden">
        {loading &&
          [...Array(5)].map((_, i) => (
            <div key={i} className="rounded-2xl border bg-card shadow-sm p-4 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-24" />
            </div>
          ))}

        {!loading &&
          transactions.map((t) => {
            const cat = t.category_id ? catMap.get(t.category_id) : null;
            return (
              <div key={t.id} className="rounded-2xl border bg-card shadow-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">{fmtDate(t.occurred_at)}</div>
                    <div className="text-base font-medium capitalize">{t.type}</div>
                    <div className="pt-1">
                      {cat ? (
                        <CategoryPill name={cat.name} color={cat.color} />
                      ) : (
                        <span className="text-muted-foreground">Uncategorized</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold tabular-nums whitespace-nowrap">
                      ₹ {formatINR(Number(t.amount))}
                    </div>
                  </div>
                </div>

                {t.note && <div className="mt-2 text-sm leading-relaxed break-words">{t.note}</div>}

                <div className="mt-3 flex flex-wrap gap-2">
                  <EditTransactionModal transaction={t} />
                  <DeleteTransactionButton id={t.id} />
                </div>
              </div>
            );
          })}

        {!loading && transactions.length === 0 && (
          <EmptyState
            title="No transactions yet"
            description="Add your first transaction to get started."
            action={<AddTransactionModal />}
          />
        )}
      </div>

      {/* ---------- DESKTOP (sm+): Table ---------- */}
      <div className="hidden sm:block rounded-2xl border bg-card shadow-sm">
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col className="w-[16%]" />
            <col className="w-[14%]" />
            <col className="w-[22%]" />
            <col className="w-[18%]" />
            <col className="w-[20%]" />
            <col className="w-[10%]" />
          </colgroup>

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
                  <tr key={t.id} className="border-b last:border-0 align-top">
                    <td className="px-4 py-2 whitespace-nowrap">{fmtDate(t.occurred_at)}</td>
                    <td className="px-4 py-2 capitalize">{t.type}</td>
                    <td className="px-4 py-2">
                      {cat ? (
                        <CategoryPill name={cat.name} color={cat.color} />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 tabular-nums whitespace-nowrap">
                      ₹ {formatINR(Number(t.amount))}
                    </td>
                    <td className="px-4 py-2 break-words">
                      {t.note ?? "-"}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-2">
                        <EditTransactionModal transaction={t} />
                        <DeleteTransactionButton id={t.id} />
                      </div>
                    </td>
                  </tr>
                );
              })}

            {!loading && transactions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6">
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
