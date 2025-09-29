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
import { CategoryForm } from "./category-form";

// Small hook to detect screen size (matches Tailwind <sm)
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

export function AddCategoryModal() {
  const [open, setOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 640px)");

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {/* Full-width on mobile so it feels intentional */}
        <Button className="w-full sm:w-auto">+ Add Category</Button>
      </SheetTrigger>

      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={isMobile ? "w-full max-w-full p-4 pb-6" : "w-[480px] p-6"}
      >
        <SheetHeader>
          <SheetTitle>Add Category</SheetTitle>
        </SheetHeader>

        {/* Scrollable area to avoid keyboard cut-off */}
        <div className="mt-4 overflow-y-auto max-h-[70vh]">
          {/* CategoryForm calls router.refresh() onSuccess */}
          <CategoryForm onSuccess={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
