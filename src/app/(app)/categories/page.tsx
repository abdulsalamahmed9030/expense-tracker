"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AddCategoryModal } from "@/components/categories/add-category-modal";
import { EditCategoryModal } from "@/components/categories/edit-category-modal";
import { DeleteCategoryButton } from "@/components/categories/delete-category-button";

type Category = {
  id: string;
  name: string;
  color: string;
  icon: string | null;
};

export default function CategoriesPage() {
  const supabase = createSupabaseBrowserClient();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      // Load initial
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) setCategories(data as Category[]);

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
            setCategories((prev) =>
              prev.map((c) => (c.id === next.id ? next : c))
            );
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
      <h1 className="text-2xl font-semibold">Categories</h1>
      <AddCategoryModal />

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
              />
              <span>{c.name}</span>
            </div>
            <div className="flex gap-2">
              <EditCategoryModal category={c} />
              <DeleteCategoryButton id={c.id} />
            </div>
          </div>
        ))}
        {categories.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground">
            No categories yet
          </p>
        )}
      </div>
    </div>
  );
}
