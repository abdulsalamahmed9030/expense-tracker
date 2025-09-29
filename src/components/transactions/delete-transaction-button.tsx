"use client";

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
import { deleteTransaction } from "@/app/(app)/transactions/actions";
import { toast } from "sonner";

export function DeleteTransactionButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const confirmDelete = () => {
    startTransition(async () => {
      try {
        await deleteTransaction(id);
        toast.success("Transaction deleted", {
          description: "The transaction was removed successfully.",
        });
        setOpen(false);
        router.refresh();
        window.dispatchEvent(new Event("transactions:refetch"));
      } catch (e: unknown) {
        toast.error("Failed to delete", {
          description: e instanceof Error ? e.message : "Unknown error",
        });
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={(next: boolean) => !isPending && setOpen(next)}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">Delete</Button>
      </AlertDialogTrigger>

      <AlertDialogContent className="max-w-[95vw] sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
          <AlertDialogDescription>
            This action can’t be undone. The transaction will be permanently removed.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isPending}
            >
              {isPending ? "Deleting..." : "Delete"}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
