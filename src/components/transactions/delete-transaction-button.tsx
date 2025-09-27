"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteTransaction } from "@/app/(app)/transactions/actions";

export function DeleteTransactionButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  const onDelete = () => {
    if (!confirm("Delete this transaction?")) return;
    startTransition(async () => {
      await deleteTransaction(id);
    });
  };

  return (
    <Button variant="destructive" size="sm" onClick={onDelete} disabled={isPending}>
      {isPending ? "Deleting..." : "Delete"}
    </Button>
  );
}
