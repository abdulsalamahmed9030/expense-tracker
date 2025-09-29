"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  transactionSchema,
  type TransactionInput,
} from "@/lib/validation/transaction";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createTransaction, updateTransaction } from "@/app/(app)/transactions/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Category = {
  id: string;
  name: string;
  color: string;
  icon: string | null;
};

export function TransactionForm({
  onSuccess,
  initialData,
}: {
  onSuccess?: () => void;
  initialData?: TransactionInput; // edit mode if provided
}) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: initialData ?? {
      type: "expense",
      occurred_at: new Date().toISOString().split("T")[0], // yyyy-mm-dd
      category_id: "",
      note: "",
    },
  });

  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);

  // Load categories once
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingCats(true);
      const { data, error } = await supabase
        .from("categories")
        .select("id,name,color,icon")
        .order("created_at", { ascending: false });
      if (mounted) {
        if (!error && data) setCategories(data as Category[]);
        setLoadingCats(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  // When editing, reset form with initial data
  useEffect(() => {
    if (initialData) reset(initialData);
  }, [initialData, reset]);

  const onSubmit = async (values: TransactionInput) => {
    setError(null);
    try {
      if (initialData?.id) {
        await updateTransaction(values);
        toast.success("Transaction updated", {
          description: "Your changes have been saved.",
        });
      } else {
        await createTransaction({
          ...values,
          category_id: values.category_id ? values.category_id : null,
        });
        toast.success("Transaction added", {
          description: "The transaction has been created.",
        });
      }
      reset();
      onSuccess?.();                 // close modal/sheet if provided
      router.refresh();              // refresh server components on the route
      window.dispatchEvent(new Event("transactions:refetch")); // notify client lists
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error";
      setError(message);
      toast.error("Failed to save", { description: String(message) });
    }
  };

  const selectedCategoryId = watch("category_id");
  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId) || null,
    [categories, selectedCategoryId]
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {initialData?.id && <input type="hidden" {...register("id")} />}

      <div>
        <label className="text-sm font-medium">Amount</label>
        <Input
          type="number"
          step="0.01"
          inputMode="decimal"
          {...register("amount", { valueAsNumber: true })}
        />
        {errors.amount && <p className="text-sm text-red-500">{errors.amount.message}</p>}
      </div>

      <div>
        <label className="text-sm font-medium">Type</label>
        <select {...register("type")} className="w-full rounded-xl border px-3 py-2">
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        {errors.type && <p className="text-sm text-red-500">{errors.type.message}</p>}
      </div>

      <div>
        <label className="text-sm font-medium">Category (optional)</label>
        <select
          {...register("category_id")}
          className="w-full rounded-xl border px-3 py-2"
          disabled={loadingCats}
        >
          <option value="">{loadingCats ? "Loading..." : "None"}</option>
          {!loadingCats &&
            categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>

        {selectedCategory && (
          <div className="mt-2 inline-flex items-center gap-2 rounded-xl border px-2 py-1 text-xs">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: selectedCategory.color }}
            />
            <span>{selectedCategory.name}</span>
          </div>
        )}

        {errors.category_id && (
          <p className="text-sm text-red-500">{errors.category_id.message}</p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium">Date</label>
        <Input type="date" {...register("occurred_at")} />
        {errors.occurred_at && (
          <p className="text-sm text-red-500">{errors.occurred_at.message}</p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium">Note</label>
        <Input {...register("note")} placeholder="Optional note" />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Saving..." : initialData?.id ? "Update Transaction" : "Save Transaction"}
      </Button>
    </form>
  );
}
