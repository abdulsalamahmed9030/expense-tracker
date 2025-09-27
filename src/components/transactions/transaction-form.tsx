"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  transactionSchema,
  type TransactionInput,
} from "@/lib/validation/transaction";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { createTransaction } from "@/app/(app)/transactions/actions";

export function TransactionForm({ onSuccess }: { onSuccess?: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema.omit({ id: true })),
    defaultValues: {
      type: "expense",
      occurred_at: new Date().toISOString().split("T")[0], // yyyy-mm-dd
    },
  });

  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (values: TransactionInput) => {
    setError(null);
    try {
      // category_id can be empty → normalize null
      const payload = {
        ...values,
        category_id: values.category_id || null,
      };

      await createTransaction(payload);
      reset();
      onSuccess?.();
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error";
      setError(message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Amount</label>
        <Input
          type="number"
          step="0.01"
          {...register("amount", { valueAsNumber: true })}
        />
        {errors.amount && (
          <p className="text-sm text-red-500">{errors.amount.message}</p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium">Type</label>
        <select
          {...register("type")}
          className="w-full rounded-xl border px-3 py-2"
        >
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        {errors.type && (
          <p className="text-sm text-red-500">{errors.type.message}</p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium">Category (optional)</label>
        <Input
          {...register("category_id")}
          placeholder="Food, Rent, or leave blank"
        />
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
        {isSubmitting ? "Saving..." : "Save Transaction"}
      </Button>
    </form>
  );
}
