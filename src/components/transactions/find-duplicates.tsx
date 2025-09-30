"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { findDuplicatesAction } from "@/app/(app)/transactions/ai-actions";

type Tx = { id: string; amount: number; note?: string | null; occurred_at: string };

type Props = {
  transactions: Tx[]; // pass what's currently visible/loaded in the table
  onResult: (ids: string[]) => void; // parent will highlight these rows
  className?: string;
};

export default function FindDuplicatesButton({ transactions, onResult, className }: Props) {
  const [loading, setLoading] = React.useState(false);

  async function onClick() {
    if (!transactions?.length) {
      toast.message("No transactions to scan");
      return;
    }

    setLoading(true);
    try {
      const res = await findDuplicatesAction({ transactions });
      if (res.ok) {
        onResult(res.ids);
        toast.success(
          res.ids.length ? `Found ${res.ids.length} possible duplicate${res.ids.length > 1 ? "s" : ""}` : "No duplicates found"
        );
      } else {
        toast.error(res.error || "Couldn’t detect duplicates");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn("[AI][tx.findDuplicates.ui] error:", msg);
      toast.error("Duplicate scan failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" variant="outline" onClick={onClick} disabled={loading} className={className}>
      {loading ? "Scanning…" : "Find Duplicates"}
    </Button>
  );
}
