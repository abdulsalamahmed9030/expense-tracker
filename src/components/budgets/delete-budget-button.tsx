"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteBudget } from "@/app/(app)/budgets/actions";

export function DeleteBudgetButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);

  return (
    <Button
      variant="destructive"
      size="sm"
      disabled={loading}
      onClick={async () => {
        if (!confirm("Are you sure?")) return;
        setLoading(true);
        try {
          await deleteBudget(id);
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? "Deleting..." : "Delete"}
    </Button>
  );
}
