
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Lightbulb, Loader2, MessageCircleQuestion } from "lucide-react";
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

const MAX_Q_LEN = 200;

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
  const [question, setQuestion] = React.useState<string>("");

  const qLen = question.length;
  const qTooLong = qLen > MAX_Q_LEN;
  const qDisabled = loading || !question.trim() || qTooLong;

  async function onAskInitial() {
    setLoading(true);
    setAdvice("");
    try {
      const res = await budgetCoachAction({ month, year, budgets });
      if (res?.ok) {
        setAdvice(res.advice ?? "");
        toast.success("Coach ready");
      } else {
        toast.error(res?.error || "AI coach failed");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn("[AI][budgets.ui] coach error:", msg);
      toast.error("AI coach failed");
    } finally {
      setLoading(false);
    }
  }

  async function onAskFollowUp() {
    const q = question.trim();
    if (!q) {
      toast.info("Type a follow-up question first.");
      return;
    }
    if (q.length > MAX_Q_LEN) {
      toast.error(`Keep it under ${MAX_Q_LEN} characters.`);
      return;
    }
    setLoading(true);
    try {
      const res = await budgetCoachAction({ month, year, budgets, question: q });
      if (res?.ok) {
        const next = res.advice ?? "";
        setAdvice((prev) => (prev ? `${prev}\n\n— Follow-up —\n${next}` : next));
        toast.success("Coach answered your follow-up");
        setQuestion("");
      } else {
        toast.error(res?.error || "AI coach failed");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn("[AI][budgets.ui] follow-up error:", msg);
      toast.error("AI coach failed");
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!qDisabled) onAskFollowUp();
    }
  }

  return (
    <div className={className}>
      {/* Primary ask button */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onAskInitial}
          disabled={loading}
          aria-label="Ask AI Coach for budget advice"
          title="Ask AI Coach for budget advice"
          className="gap-1"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Thinking…
            </>
          ) : (
            <>
              <Lightbulb className="h-4 w-4" />
              {buttonLabel}
            </>
          )}
        </Button>
      </div>

      {/* Follow-up input + Ask button */}
      <div className="mt-3">
        <div className="flex items-center gap-2">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask a follow-up…"
            aria-label="Ask a follow-up question"
            maxLength={MAX_Q_LEN + 1} /* allow 1 extra so counter can show red */
            disabled={loading}
          />
          <Button
            type="button"
            size="sm"
            onClick={onAskFollowUp}
            disabled={qDisabled}
            className="gap-1"
            aria-label="Send follow-up to AI Coach"
            title="Send follow-up to AI Coach"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Ask
              </>
            ) : (
              <>
                <MessageCircleQuestion className="h-4 w-4" />
                Ask
              </>
            )}
          </Button>
        </div>
        <div className="mt-1 flex items-center justify-end">
          <span
            className={`text-xs ${qTooLong ? "text-destructive" : "text-muted-foreground"}`}
            aria-live="polite"
          >
            {qLen}/{MAX_Q_LEN}
          </span>
        </div>
      </div>

      {/* Response region */}
      <div
        className="mt-2"
        aria-live="polite"
        aria-busy={loading ? "true" : "false"}
        role="status"
        aria-atomic="true"
      >
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
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{advice}</p>
          ) : (
            <Card className="mt-1">
              <CardContent className="p-4 whitespace-pre-wrap text-sm leading-6">
                {advice}
              </CardContent>
            </Card>
          )
        ) : null}
      </div>
    </div>
  );
}

