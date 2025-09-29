"use client";

import * as React from "react";
import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteBudget } from "@/app/(app)/budgets/actions";
import { toast } from "sonner";

export function DeleteBudgetButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const confirmDelete = () => {
    startTransition(async () => {
      try {
        await deleteBudget(id);
        toast.success("Budget deleted", {
          description: "The budget entry was removed successfully.",
        });
        setOpen(false);
        router.refresh();
        window.dispatchEvent(new Event("budgets:refetch"));
      } catch (e: unknown) {
        toast.error("Failed to delete", {
          description: e instanceof Error ? e.message : "Unknown error",
        });
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => !isPending && setOpen(next)}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={isPending}>
          {isPending ? "Deleting..." : "Delete"}
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent className="max-w-[95vw] sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete budget?</AlertDialogTitle>
          <AlertDialogDescription>
            This action can’t be undone. The budget record will be permanently removed.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button variant="destructive" onClick={confirmDelete} disabled={isPending}>
              {isPending ? "Deleting..." : "Delete"}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
