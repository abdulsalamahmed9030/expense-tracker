"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteCategory } from "@/app/(app)/categories/actions";

export function DeleteCategoryButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const onDelete = () => {
    if (!confirm("Delete this category?")) return;
    startTransition(async () => {
      await deleteCategory(id);
      router.refresh();                       // server side
      window.dispatchEvent(new Event("categories:refetch")); // client side
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
