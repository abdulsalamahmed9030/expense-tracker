"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
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

// AI suggest button
import SuggestCategoryButton from "@/components/transactions/suggest-category";

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

  // Keep full methods for FormProvider/useFormContext
  const form = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: initialData ?? {
      type: "expense",
      occurred_at: new Date().toISOString().split("T")[0], // yyyy-mm-dd
      category_id: "",
      note: "",
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
  } = form;

  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);

  // NEW: When AI suggests a name not in DB
  const [pendingNewCatName, setPendingNewCatName] = useState<string | null>(null);
  const [creatingCat, setCreatingCat] = useState(false);

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
      setPendingNewCatName(null);
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
  const selectedCategory =
    categories.find((c) => c.id === selectedCategoryId) || null;

  // Quick-create category then select it
  async function createCategoryQuick(name: string) {
    if (!name.trim()) return;
    setCreatingCat(true);
    try {
      // Pick a default color if you don't prompt the user
      const defaultColor = "#60a5fa"; // tailwind blue-400
      const { data, error } = await supabase
        .from("categories")
        .insert({ name: name.trim(), color: defaultColor, icon: null })
        .select("id,name,color,icon")
        .single();

      if (error || !data) {
        throw new Error(error?.message || "Failed to create category");
      }

      // Update local list & select it
      const newCat = data as Category;
      setCategories((prev) => [newCat, ...prev]);
      setValue("category_id", newCat.id, { shouldValidate: true, shouldDirty: true });
      setPendingNewCatName(null);
      toast.success(`Created category: ${newCat.name}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Create category failed", { description: msg });
    } finally {
      setCreatingCat(false);
    }
  }

  return (
    <FormProvider {...form}>
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
          {errors.amount && (
            <p className="text-sm text-red-500">{errors.amount.message}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium">Type</label>
          <select {...register("type")} className="w-full rounded-xl border px-3 py-2">
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          {errors.type && (
            <p className="text-sm text-red-500">{errors.type.message}</p>
          )}
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

          {/* Inline helper if AI suggested a new category name */}
          {pendingNewCatName && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span>
                Suggested new category:{" "}
                <strong className="font-medium">{pendingNewCatName}</strong>
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => createCategoryQuick(pendingNewCatName)}
                disabled={creatingCat}
              >
                {creatingCat ? "Creating…" : "Create & select"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setPendingNewCatName(null)}
              >
                Dismiss
              </Button>
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-medium">Date</label>
          <Input type="date" {...register("occurred_at")} />
          {errors.occurred_at && (
            <p className="text-sm text-red-500">{errors.occurred_at.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium" htmlFor="note">
              Note
            </label>
            <SuggestCategoryButton
              categories={categories}
              onSuggestNew={setPendingNewCatName}
              // If your field names differ, uncomment and set:
              // noteFieldName="note"
              // categoryFieldName="category_id"
            />
          </div>
          <Input id="note" {...register("note")} placeholder="Optional note" />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting
            ? "Saving..."
            : initialData?.id
            ? "Update Transaction"
            : "Save Transaction"}
        </Button>
      </form>
    </FormProvider>
  );
}
