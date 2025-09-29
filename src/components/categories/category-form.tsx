"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { categorySchema, type CategoryInput } from "@/lib/validation/category";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { createCategory, updateCategory } from "@/app/(app)/categories/actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner"; // ✅ Sonner

export function CategoryForm({
  onSuccess,
  initialData,
}: {
  onSuccess?: () => void;
  initialData?: CategoryInput;
}) {
  const router = useRouter();

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

  const color = watch("color");

  const onSubmit = async (values: CategoryInput) => {
    setError(null);
    try {
      if (initialData?.id) {
        await updateCategory(values);
        toast.success("Category updated", {
          description: `"${values.name}" saved successfully.`,
        });
      } else {
        await createCategory(values);
        toast.success("Category created", {
          description: `"${values.name}" added successfully.`,
        });
      }

      reset();
      onSuccess?.();                // close sheet/modal
      router.refresh();             // refresh server comps (if any)
      window.dispatchEvent(new Event("categories:refetch")); // refresh client list
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error";
      setError(message);
      toast.error("Failed to save category", { description: String(message) });
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
          {/* Only this input is registered to "color" */}
          <Input
            type="color"
            className="h-10 w-16 p-1"
            {...register("color")}
            onChange={(e) =>
              setValue("color", e.target.value, { shouldDirty: true, shouldValidate: true })
            }
            value={color}
          />
          {/* Mirror hex field (unregistered) */}
          <Input
            placeholder="#000000"
            inputMode="text"
            className="flex-1"
            value={color}
            onChange={(e) =>
              setValue("color", e.target.value, { shouldDirty: true, shouldValidate: true })
            }
            onBlur={(e) =>
              setValue("color", e.target.value.trim().toUpperCase(), { shouldValidate: true })
            }
          />
        </div>
        {errors.color && <p className="text-sm text-red-500">{errors.color.message}</p>}
      </div>

      <div>
        <label className="text-sm font-medium">Icon (optionalf)</label>
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
  