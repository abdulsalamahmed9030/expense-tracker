"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AddCategoryModal } from "@/components/categories/add-category-modal";
import { EditCategoryModal } from "@/components/categories/edit-category-modal";
import { DeleteCategoryButton } from "@/components/categories/delete-category-button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

type Category = {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  created_at?: string | null;
};

export default function CategoriesPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refreshCategories = async () => {
    if (mountedRef.current) setLoading(true);
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("created_at", { ascending: false }); // adjust if no created_at

    if (!error && data && mountedRef.current) {
      setCategories(data as Category[]);
    }
    if (mountedRef.current) setLoading(false);
  };

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      // Initial load
      await refreshCategories();

      // Realtime for INSERT/UPDATE/DELETE
      channel = supabase
        .channel("categories-realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "categories" },
          (payload) => {
            if (payload.eventType === "INSERT") {
              const next = payload.new as Category;
              setCategories((prev) => {
                if (prev.find((c) => c.id === next.id)) return prev;
                return [next, ...prev];
              });
            } else if (payload.eventType === "UPDATE") {
              const next = payload.new as Category;
              setCategories((prev) => prev.map((c) => (c.id === next.id ? next : c)));
            } else if (payload.eventType === "DELETE") {
              const old = payload.old as { id: string };
              setCategories((prev) => prev.filter((c) => c.id !== old.id));
            }
          }
        )
        .subscribe(() => {
          // no-op: we don't need the status; avoids unused var warnings
        });

      // 🔔 Refetch immediately when a local action fires (optimistic + safety)
      const onRefetch = () => refreshCategories();
      window.addEventListener("categories:refetch", onRefetch);

      // Also refetch on focus/visibility regain (safety net)
      const onFocus = () => refreshCategories();
      const onVisible = () => {
        if (document.visibilityState === "visible") refreshCategories();
      };
      window.addEventListener("focus", onFocus);
      document.addEventListener("visibilitychange", onVisible);

      // Cleanup
      return () => {
        window.removeEventListener("categories:refetch", onRefetch);
        window.removeEventListener("focus", onFocus);
        document.removeEventListener("visibilitychange", onVisible);
        if (channel) supabase.removeChannel(channel);
      };
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // supabase is memoized

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {loading ? (
          <>
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-9 w-36" />
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold">Categories</h1>
            <div className="w-full sm:w-auto">
              <AddCategoryModal />
            </div>
          </>
        )}
      </div>

      {loading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="flex min-w-0 items-center justify-between gap-2 rounded-xl border p-4 shadow-sm"
            >
              <div className="flex min-w-0 items-center gap-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-24" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && categories.length === 0 && (
        <div className="rounded-xl border p-6 shadow-sm">
          <EmptyState
            title="No categories yet"
            description="Create categories to organize your expenses."
            action={
              <div className="w-full sm:w-auto">
                <AddCategoryModal />
              </div>
            }
          />
        </div>
      )}

      {!loading && categories.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <div
              key={c.id}
              className="flex min-w-0 items-center justify-between gap-2 rounded-xl border p-4 shadow-sm"
            >
              <div className="flex min-w-0 items-center gap-2">
                <div
                  className="h-6 w-6 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: c.color }}
                  aria-label={`Category color ${c.color}`}
                />
                <span className="truncate">{c.name}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <EditCategoryModal category={c} />
                <DeleteCategoryButton id={c.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
