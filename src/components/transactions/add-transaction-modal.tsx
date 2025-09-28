"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { TransactionForm } from "./transaction-form";

// Small hook to detect mobile screens (matches Tailwind sm breakpoint)
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

export function AddTransactionModal() {
  const [open, setOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 640px)"); // <sm

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {/* Full width on mobile so it doesn't look cramped */}
        <Button className="w-full sm:w-auto">+ Add Transaction</Button>
      </SheetTrigger>

      {/* On mobile: bottom sheet, full width; On desktop: right panel, fixed width */}
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={
          isMobile
            ? // Mobile: full width, comfy padding, limit height for keyboards
              "w-full max-w-full p-4 pb-6"
            : // Desktop: nice fixed width panel
              "w-[480px] p-6"
        }
      >
        <SheetHeader>
          <SheetTitle>{isMobile ? "Add Transaction" : "Add Transaction"}</SheetTitle>
        </SheetHeader>

        {/* Ensure the form can scroll inside the sheet on small screens */}
        <div className="mt-4 overflow-y-auto">
          <TransactionForm onSuccess={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
