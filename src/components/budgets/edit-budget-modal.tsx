"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { BudgetForm } from "./budget-form";
import type { BudgetInput } from "@/lib/validation/budget";

// Same <sm detector
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(query);
    const handler = () => setMatches(m.matches);
    handler();
    m.addEventListener("change", handler);
    return () => m.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

export function EditBudgetModal({ budget }: { budget: BudgetInput }) {
  const [open, setOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 640px)");

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">Edit</Button>
      </SheetTrigger>

      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={isMobile ? "w-full max-w-full p-4 pb-6" : "w-[480px] p-6"}
      >
        <SheetHeader>
          <SheetTitle>Edit Budget</SheetTitle>
        </SheetHeader>

        <div className="mt-4 overflow-y-auto max-h-[70vh]">
          <BudgetForm initialData={budget} onSuccess={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
