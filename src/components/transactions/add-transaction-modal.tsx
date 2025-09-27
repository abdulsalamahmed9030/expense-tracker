"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { TransactionForm } from "./transaction-form";

export function AddTransactionModal() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>+ Add Transaction</Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[500px]">
        <SheetHeader>
          <SheetTitle>Add Transaction</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <TransactionForm onSuccess={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
