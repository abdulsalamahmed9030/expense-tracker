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

// Hook to detect <sm screens (matches Tailwind's sm breakpoint)
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

export function AddBudgetModal() {
  const [open, setOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 640px)");

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {/* Full width on mobile for better tap target */}
        <Button className="w-full sm:w-auto">+ Add Budget</Button>
      </SheetTrigger>

      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={isMobile ? "w-full max-w-full p-4 pb-6" : "w-[480px] p-6"}
      >
        <SheetHeader>
          <SheetTitle>Add Budget</SheetTitle>
        </SheetHeader>

        {/* Scrollable area prevents keyboard clipping on phones */}
        <div className="mt-4 overflow-y-auto max-h-[70vh]">
          <BudgetForm onSuccess={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
