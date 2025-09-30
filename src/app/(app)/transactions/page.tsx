// src/app/(app)/transactions/page.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AddTransactionModal } from "@/components/transactions/add-transaction-modal";
import { EditTransactionModal } from "@/components/transactions/edit-transaction-modal";
import { DeleteTransactionButton } from "@/components/transactions/delete-transaction-button";
import { CategoryPill } from "@/components/categories/category-pill";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

// AI helpers
import FindDuplicatesButton from "@/components/transactions/find-duplicates";
import NLFilterBar from "@/components/transactions/nl-filter-bar";

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

  // duplicate highlights + NL overlay filter
  const [duplicateIds, setDuplicateIds] = useState<string[]>([]);
  const [overlayFilter, setOverlayFilter] = useState<{
    type?: "income" | "expense";
    categoryId?: string;
    from?: string; // YYYY-MM-DD
    to?: string; // YYYY-MM-DD
    maxAmount?: number;
  }>({});

  const clearOverlayFilter = useCallback(() => {
    setOverlayFilter({});
  }, []);

  const catMap = useMemo(() => {
    const m = new Map<string, Category>();
    for (const c of categories) m.set(c.id, c);
    return m;
  }, [categories]);

  // Map provider-returned category "name" to our ID if needed
  const normalizeFilter = useCallback(
    (f: typeof overlayFilter) => {
      const out = { ...f };
      if (out.categoryId) {
        const byId = categories.find((c) => c.id === out.categoryId);
        if (!byId) {
          const byName = categories.find(
            (c) => c.name.toLowerCase() === out.categoryId!.toLowerCase()
          );
          if (byName) out.categoryId = byName.id;
          else delete out.categoryId; // unknown; drop
        }
      }
      return out;
    },
    [categories]
  );

  const matchesStructuredFilter = useCallback(
    (tx: Transaction) => {
      const f = normalizeFilter(overlayFilter);
      if (f.type && tx.type !== f.type) return false;
      if (f.categoryId && (tx.category_id ?? "") !== f.categoryId) return false;
      if (f.from && tx.occurred_at.slice(0, 10) < f.from) return false;
      if (f.to && tx.occurred_at.slice(0, 10) > f.to) return false;
      if (typeof f.maxAmount === "number" && Number(tx.amount) > f.maxAmount) return false;
      return true;
    },
    [overlayFilter, normalizeFilter]
  );

  // The list currently shown (used by UI and for duplicate scan input)
  const visibleTransactions = useMemo(
    () => transactions.filter((t) => matchesStructuredFilter(t)),
    [transactions, matchesStructuredFilter]
  );

  // Reset duplicate highlights any time the visible list changes (prevents stale badges)
  useEffect(() => {
    setDuplicateIds([]);
  }, [visibleTransactions.length, overlayFilter]);

  useEffect(() => {
    let isMounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      setLoading(true);

      const [{ data: tx }, { data: cats }] = await Promise.all([
        supabase.from("transactions").select("*").order("occurred_at", { ascending: false }),
        supabase
          .from("categories")
          .select("id,name,color,icon")
          .order("created_at", { ascending: false }),
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
          {
            event: "INSERT",
            schema: "public",
            table: "transactions",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => setTransactions((prev) => [payload.new as Transaction, ...prev])
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "transactions",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const next = payload.new as Transaction;
            setTransactions((prev) => prev.map((t) => (t.id === next.id ? next : t)));
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "transactions",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const oldRow = payload.old as { id: string };
            setTransactions((prev) => prev.filter((t) => t.id !== oldRow.id));
          }
        )
        .subscribe();
    };

    void init();

    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase]);

  const totalCount = transactions.length;
  const visibleCount = visibleTransactions.length;
  const hasActiveFilter =
    !!overlayFilter.type ||
    !!overlayFilter.categoryId ||
    !!overlayFilter.from ||
    !!overlayFilter.to ||
    typeof overlayFilter.maxAmount === "number";

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold">Transactions</h1>
        {!loading && (
          <div className="text-xs text-muted-foreground">
            Showing <span className="font-medium">{visibleCount}</span> of{" "}
            <span className="font-medium">{totalCount}</span>
          </div>
        )}
      </div>

      {/* Toolbar: Add + NL Filter + Duplicates */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:w-auto">
          <AddTransactionModal />
        </div>

        <div className="flex flex-1 items-center gap-2 sm:max-w-xl">
          <NLFilterBar onParsed={setOverlayFilter} />
          {hasActiveFilter && (
            <Button
              type="button"
              variant="ghost"
              className="shrink-0"
              onClick={clearOverlayFilter}
              aria-label="Clear text filter"
              title="Clear text filter"
            >
              Clear
            </Button>
          )}
        </div>

        <FindDuplicatesButton
          transactions={visibleTransactions.map((t) => ({
            id: t.id,
            amount: Number(t.amount),
            note: t.note ?? null,
            occurred_at: t.occurred_at,
          }))}
          onResult={setDuplicateIds}
        />
      </div>

      {/* ---------- MOBILE: Card list (no horizontal scroll) ---------- */}
      <div className="space-y-3 sm:hidden">
        {loading &&
          [...Array(5)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border bg-card shadow-sm p-4 space-y-2"
              aria-busy="true"
            >
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-24" />
            </div>
          ))}

        {!loading &&
          visibleTransactions.map((t) => {
            const cat = t.category_id ? catMap.get(t.category_id) : null;
            const isDup = duplicateIds.includes(t.id);
            return (
              <div
                key={t.id}
                className={`rounded-2xl border bg-card shadow-sm p-4 ${
                  isDup ? "border-amber-400" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">
                      {fmtDate(t.occurred_at)}
                    </div>
                    <div className="text-base font-medium capitalize flex items-center gap-2">
                      {t.type}
                      {isDup && (
                        <span className="inline-flex items-center rounded bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                          Possible duplicate
                        </span>
                      )}
                    </div>
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

                {t.note && (
                  <div className="mt-2 text-sm leading-relaxed break-words">
                    {t.note}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <EditTransactionModal transaction={t} />
                  <DeleteTransactionButton id={t.id} />
                </div>
              </div>
            );
          })}

        {!loading && visibleTransactions.length === 0 && (
          <EmptyState
            title="No transactions match"
            description="Try changing or clearing the text filter."
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
                <tr key={i} aria-busy="true">
                  <td className="px-4 py-2">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="px-4 py-2">
                    <Skeleton className="h-4 w-16" />
                  </td>
                  <td className="px-4 py-2">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="px-4 py-2">
                    <Skeleton className="h-4 w-16" />
                  </td>
                  <td className="px-4 py-2">
                    <Skeleton className="h-4 w-28" />
                  </td>
                  <td className="px-4 py-2">
                    <Skeleton className="h-8 w-20" />
                  </td>
                </tr>
              ))}

            {!loading &&
              visibleTransactions.map((t) => {
                const cat = t.category_id ? catMap.get(t.category_id) : null;
                const isDup = duplicateIds.includes(t.id);
                return (
                  <tr
                    key={t.id}
                    className={`border-b last:border-0 align-top ${
                      isDup ? "bg-amber-50" : ""
                    }`}
                  >
                    <td className="px-4 py-2 whitespace-nowrap">
                      {fmtDate(t.occurred_at)}
                    </td>
                    <td className="px-4 py-2 capitalize">
                      {t.type}{" "}
                      {isDup && (
                        <span className="ml-2 inline-flex items-center rounded bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                          Possible duplicate
                        </span>
                      )}
                    </td>
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
                    <td className="px-4 py-2 break-words">{t.note ?? "-"}</td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-2">
                        <EditTransactionModal transaction={t} />
                        <DeleteTransactionButton id={t.id} />
                      </div>
                    </td>
                  </tr>
                );
              })}

            {!loading && visibleTransactions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6">
                  <EmptyState
                    title="No transactions match"
                    description="Try changing or clearing the text filter."
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
