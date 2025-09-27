"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { budgetSchema, type BudgetInput } from "@/lib/validation/budget";
import { createBudget, updateBudget } from "@/app/(app)/budgets/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Category = {
  id: string;
  name: string;
  color: string | null;
};

const thisMonth = new Date();

export function BudgetForm({
  onSuccess,
  initialData,
}: {
  onSuccess?: () => void;
  initialData?: BudgetInput;
}) {
  const supabase = createSupabaseBrowserClient();

  // ❌ Remove <BudgetInput> generic — let resolver handle it
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(budgetSchema),
    defaultValues: initialData ?? {
      category_id: "",
      month: thisMonth.getMonth() + 1,
      year: thisMonth.getFullYear(),
      amount: 0,
    },
  });

  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingCats(true);
      const { data } = await supabase
        .from("categories")
        .select("id,name,color")
        .order("created_at", { ascending: false });
      if (mounted && data) setCategories(data as Category[]);
      setLoadingCats(false);
    })();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (initialData) reset(initialData);
  }, [initialData, reset]);

  const onSubmit = async (values: unknown) => {
    setError(null);
    try {
      // ✅ Parse with Zod to guarantee correct type
      const parsed = budgetSchema.parse(values);

      if (initialData?.id) {
        await updateBudget(parsed);
      } else {
        await createBudget(parsed);
      }
      reset();
      onSuccess?.();
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error";
      setError(message);
    }
  };

  const years = useMemo(() => {
    const y = thisMonth.getFullYear();
    return [y - 1, y, y + 1, y + 2];
  }, []);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {initialData?.id && <input type="hidden" {...register("id")} />}

      {/* Category */}
      <div>
        <label className="text-sm font-medium">Category</label>
        <select
          {...register("category_id")}
          className="w-full rounded-xl border px-3 py-2"
          disabled={loadingCats}
        >
          <option value="">
            {loadingCats ? "Loading..." : "Select category"}
          </option>
          {!loadingCats &&
            categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
        {errors.category_id && (
          <p className="text-sm text-red-500">{String(errors.category_id.message)}</p>
        )}
      </div>

      {/* Month + Year */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Month</label>
          <select {...register("month")} className="w-full rounded-xl border px-3 py-2">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          {errors.month && (
            <p className="text-sm text-red-500">{String(errors.month.message)}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium">Year</label>
          <select {...register("year")} className="w-full rounded-xl border px-3 py-2">
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          {errors.year && (
            <p className="text-sm text-red-500">{String(errors.year.message)}</p>
          )}
        </div>
      </div>

      {/* Amount */}
      <div>
        <label className="text-sm font-medium">Amount</label>
        <Input type="number" step="0.01" {...register("amount")} />
        {errors.amount && (
          <p className="text-sm text-red-500">{String(errors.amount.message)}</p>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting
          ? "Saving..."
          : initialData?.id
          ? "Update Budget"
          : "Save Budget"}
      </Button>
    </form>
  );
}
