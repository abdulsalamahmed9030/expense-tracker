"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { budgetSchema } from "@/lib/validation/budget";
import { createBudget, updateBudget } from "@/app/(app)/budgets/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Category = { id: string; name: string; color: string | null };

// ---- Form schema (add optional id + coerce numbers so resolver accepts strings) ----
const budgetFormSchema = budgetSchema
  .extend({ id: z.string().optional() })
  .extend({
    month: z.coerce.number().int().min(1).max(12),
    year: z.coerce.number().int().min(1900),
    amount: z.coerce.number().nonnegative(),
  });

type FormOutput = z.infer<typeof budgetFormSchema>; // after resolver (numbers)
type FormInput = z.input<typeof budgetFormSchema>; // before resolver (strings | numbers)

const thisMonth = new Date();

export function BudgetForm({
  onSuccess,
  initialData,
}: {
  onSuccess?: () => void;
  initialData?: Partial<FormOutput>;
}) {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      id: initialData?.id,
      category_id: initialData?.category_id ?? "",
      month: initialData?.month ?? thisMonth.getMonth() + 1,
      year: initialData?.year ?? thisMonth.getFullYear(),
      amount: initialData?.amount ?? 0,
    },
  });

  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingCats(true);
      const { data, error: qErr } = await supabase
        .from("categories")
        .select("id,name,color")
        .order("created_at", { ascending: false });

      if (qErr) {
        // Don’t block the form; just surface a toast
        toast.error("Failed to load categories", { description: qErr.message });
      }
      if (mounted && data) setCategories(data as Category[]);
      setLoadingCats(false);
    })();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (initialData) {
      reset({
        id: initialData.id,
        category_id: initialData.category_id ?? "",
        month: initialData.month ?? thisMonth.getMonth() + 1,
        year: initialData.year ?? thisMonth.getFullYear(),
        amount: initialData.amount ?? 0,
      });
    }
  }, [initialData, reset]);

  // Submit expects the TRANSFORMED values (FormOutput)
  const onSubmit: SubmitHandler<FormOutput> = async (values) => {
    setError(null);
    try {
      const parsed = budgetSchema.parse(values); // persist with original schema (drops id)
      if (values.id) {
        await updateBudget(parsed);
        toast.success("Budget updated", {
          description: "Your changes were saved successfully.",
        });
      } else {
        await createBudget(parsed);
        toast.success("Budget created", {
          description: "Budget added successfully.",
        });
      }

      reset();
      onSuccess?.();                 // close sheet/modal if provided
      router.refresh();              // refresh server components
      window.dispatchEvent(new Event("budgets:refetch")); // refresh client lists
    } catch (e) {
      const message =
        e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error";
      setError(message);
      toast.error("Failed to save budget", { description: String(message) });
    }
  };

  const years = useMemo(() => {
    const y = thisMonth.getFullYear();
    return [y - 1, y, y + 1, y + 2];
  }, []);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {Boolean(initialData?.id) && <input type="hidden" {...register("id")} />}

      <div>
        <label className="text-sm font-medium">Category</label>
        <select
          {...register("category_id")}
          className="w-full rounded-xl border px-3 py-2"
          disabled={loadingCats}
        >
          <option value="">{loadingCats ? "Loading..." : "Select category"}</option>
          {!loadingCats &&
            categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
        {errors.category_id?.message && (
          <p className="text-sm text-red-500">{errors.category_id.message}</p>
        )}
      </div>

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
          {errors.month?.message && (
            <p className="text-sm text-red-500">{errors.month.message}</p>
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
          {errors.year?.message && (
            <p className="text-sm text-red-500">{errors.year.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Amount</label>
        <Input type="number" step="0.01" inputMode="decimal" {...register("amount")} />
        {errors.amount?.message && (
          <p className="text-sm text-red-500">{errors.amount.message}</p>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Saving..." : initialData?.id ? "Update Budget" : "Save Budget"}
      </Button>
    </form>
  );
}  
  