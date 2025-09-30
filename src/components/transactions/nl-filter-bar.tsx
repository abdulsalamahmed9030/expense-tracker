"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { nlFilterToQueryAction } from "@/app/(app)/transactions/ai-actions";

type Structured = {
  type?: "income" | "expense";
  categoryId?: string; // provider may return a name; parent maps to ID
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
  maxAmount?: number;
};

type Props = {
  onParsed: (filter: Structured) => void;
  placeholder?: string;
  className?: string;
};

export default function NLFilterBar({
  onParsed,
  placeholder,
  className,
}: Props) {
  const [text, setText] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const run = React.useCallback(async () => {
    const q = text.trim();
    if (!q) return;
    setLoading(true);
    try {
      const res = await nlFilterToQueryAction({ text: q });
      if (res.ok) {
        onParsed(res.filter);
        toast.success("Text filter applied");
      } else {
        toast.error(res.error || "Couldn’t parse text");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : typeof err === "string" ? err : "Unknown error";
      console.warn("[AI][tx.nlFilter.ui] error:", msg);
      toast.error("Couldn’t parse text");
    } finally {
      setLoading(false);
    }
  }, [text, onParsed]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void run();
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={
          placeholder ??
          `Filter by text… e.g., "groceries last month under 2000 expense"`
        }
        aria-label="Natural language transaction filter"
      />
      <Button type="button" onClick={run} disabled={loading || !text.trim()}>
        {loading ? "Parsing…" : "Apply"}
      </Button>
    </div>
  );
}
