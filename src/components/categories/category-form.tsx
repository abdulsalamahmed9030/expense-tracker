"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { categorySchema, type CategoryInput } from "@/lib/validation/category";
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
    watch,
    setValue,
  } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: initialData ?? { name: "", color: "#000000", icon: "" },
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) reset(initialData);
  }, [initialData, reset]);

  // Single source of truth for the color
  const color = watch("color");

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
        <Input {...register("name")} autoComplete="off" />
        {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
      </div>

      <div>
        <label className="text-sm font-medium">Color</label>
        <div className="flex items-center gap-3">
          {/* The color picker is the ONLY registered input for "color" */}
          <Input
            type="color"
            className="h-10 w-16 p-1"
            {...register("color")}
            // Optional: ensure RHF marks as dirty/validating on manual set
            onChange={(e) =>
              setValue("color", e.target.value, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            value={color}
          />

          {/* Mirror field: NOT registered. It just mirrors and updates via setValue */}
          <Input
            placeholder="#000000"
            inputMode="text"
            className="flex-1"
            value={color}
            onChange={(e) => {
              const v = e.target.value;
              setValue("color", v, { shouldDirty: true, shouldValidate: true });
            }}
            onBlur={(e) => {
              // Optional: normalize uppercase and trim
              const v = e.target.value.trim();
              setValue("color", v.toUpperCase(), { shouldValidate: true });
            }}
          />
        </div>
        {errors.color && <p className="text-sm text-red-500">{errors.color.message}</p>}
      </div>

      <div>
        <label className="text-sm font-medium">Icon (optional)</label>
        <Input
          {...register("icon")}
          placeholder="e.g. shopping-cart"
          autoComplete="off"
          inputMode="text"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Saving..." : initialData?.id ? "Update Category" : "Save Category"}
      </Button>
    </form>
  );
}
