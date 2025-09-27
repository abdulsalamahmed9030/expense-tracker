"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  categorySchema,
  type CategoryInput,
} from "@/lib/validation/category";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { createCategory, updateCategory } from "@/app/(app)/categories/actions";

export function CategoryForm({
  onSuccess,
  initialData,
}: {
  onSuccess?: () => void;
  initialData?: CategoryInput;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: initialData ?? { name: "", color: "#000000", icon: "" },
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) reset(initialData);
  }, [initialData, reset]);

  const onSubmit = async (values: CategoryInput) => {
    setError(null);
    try {
      if (initialData?.id) {
        await updateCategory(values);
      } else {
        await createCategory(values);
      }
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
        <label className="text-sm font-medium">Name</label>
        <Input {...register("name")} />
        {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
      </div>

      <div>
        <label className="text-sm font-medium">Color</label>
        <Input type="color" {...register("color")} />
        {errors.color && <p className="text-sm text-red-500">{errors.color.message}</p>}
      </div>

      <div>
        <label className="text-sm font-medium">Icon (optional)</label>
        <Input {...register("icon")} placeholder="e.g. shopping-cart" />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Saving..." : initialData?.id ? "Update Category" : "Save Category"}
      </Button>
    </form>
  );
}
