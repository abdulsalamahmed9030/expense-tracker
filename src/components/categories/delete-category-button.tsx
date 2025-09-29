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
import { deleteCategory } from "@/app/(app)/categories/actions";
import { toast } from "sonner";

export function DeleteCategoryButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const confirmDelete = () => {
    startTransition(async () => {
      try {
        await deleteCategory(id);
        toast.success("Category deleted", {
          description: "The category was removed successfully.",
        });
        // Close dialog, refresh data (server + client)
        setOpen(false);
        router.refresh();
        window.dispatchEvent(new Event("categories:refetch"));
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
          <AlertDialogTitle>Delete category?</AlertDialogTitle>
          <AlertDialogDescription>
            This action can’t be undone. The category will be permanently removed.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={isPending}>
            Cancel
          </AlertDialogCancel>
          {/* Use asChild so we can keep our button styles if you prefer */}
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
