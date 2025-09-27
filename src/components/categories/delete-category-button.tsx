"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteCategory } from "@/app/(app)/categories/actions";

export function DeleteCategoryButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  const onDelete = () => {
    if (!confirm("Delete this category?")) return;
    startTransition(async () => {
      await deleteCategory(id);
    });
  };

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={onDelete}
      disabled={isPending}
    >
      {isPending ? "Deleting..." : "Delete"}
    </Button>
  );
}
