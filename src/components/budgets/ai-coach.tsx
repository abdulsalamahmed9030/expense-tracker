"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Lightbulb } from "lucide-react";
import { budgetCoachAction } from "@/app/(app)/budgets/ai-actions";

type BudgetItem = {
  category: string;
  planned: number;
  actual: number;
};

type Props = {
  month: number; // 1..12
  year: number;  // 4-digit
  budgets: BudgetItem[]; // pass the month's category budgets
  // Optional UI props
  className?: string;
  buttonLabel?: string;
  compact?: boolean; // renders a compact text block instead of Card
};

export default function AICoach({
  month,
  year,
  budgets,
  className,
  buttonLabel = "Ask Coach",
  compact = false,
}: Props) {
  const [loading, setLoading] = React.useState(false);
  const [advice, setAdvice] = React.useState<string>("");

  async function onAsk() {
    setLoading(true);
    setAdvice("");
    try {
      const res = await budgetCoachAction({ month, year, budgets });
      if (res.ok) {
        setAdvice(res.advice);
        toast.success("Coach ready");
      } else {
        toast.error(res.error || "AI coach failed");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn("[AI][budgets.ui] coach error:", msg);
      toast.error("AI coach failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={onAsk}
        disabled={loading}
        aria-label="Ask AI Coach for budget advice"
        title="Ask AI Coach for budget advice"
        className="gap-1"
      >
        <Lightbulb className="h-4 w-4" />
        {loading ? "Thinking…" : buttonLabel}
      </Button>

      <div className="mt-2" aria-live="polite" role="status" aria-atomic="true">
        {loading ? (
          compact ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : (
            <Card className="mt-1">
              <CardContent className="p-4">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          )
        ) : advice ? (
          compact ? (
            <p className="mt-2 text-sm leading-6">{advice}</p>
          ) : (
            <Card className="mt-1">
              <CardContent className="p-4 text-sm leading-6">{advice}</CardContent>
            </Card>
          )
        ) : null}
      </div>
    </div>
  );
}
