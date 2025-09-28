"use client";

import { useEffect, useState } from "react";
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
};

export default function CategoriesPage() {
  const supabase = createSupabaseBrowserClient();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      setLoading(true);

      // Load initial
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) setCategories(data as Category[]);
      setLoading(false);

      // Subscribe realtime
      channel = supabase
        .channel("categories-realtime")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "categories" },
          (payload) => {
            setCategories((prev) => [payload.new as Category, ...prev]);
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "categories" },
          (payload) => {
            const next = payload.new as Category;
            setCategories((prev) => prev.map((c) => (c.id === next.id ? next : c)));
          }
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "categories" },
          (payload) => {
            const old = payload.old as { id: string };
            setCategories((prev) => prev.filter((c) => c.id !== old.id));
          }
        )
        .subscribe();
    };

    init();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        {loading ? (
          <>
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-9 w-36" />
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold">Categories</h1>
            <AddCategoryModal />
          </>
        )}
      </div>

      {/* Loading grid skeleton */}
      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-4 shadow-sm flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-24" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && categories.length === 0 && (
        <div className="rounded-xl border p-6 shadow-sm">
          <EmptyState
            title="No categories yet"
            description="Create categories to organize your expenses."
            action={<AddCategoryModal />}
          />
        </div>
      )}

      {/* Categories grid */}
      {!loading && categories.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-2 rounded-xl border p-4 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-6 w-6 rounded-full"
                  style={{ backgroundColor: c.color }}
                  aria-label={`Category color ${c.color}`}
                />
                <span>{c.name}</span>
              </div>
              <div className="flex gap-2">
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
