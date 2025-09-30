"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { summarizeReportAction } from "@/app/(app)/reports/ai-actions";

type Props = {
  from: string;   // YYYY-MM-DD
  to: string;     // YYYY-MM-DD
  income: number;
  expense: number;
  net: number;
  count: number;
  className?: string;
  currency?: string; // defaults to INR
  locale?: string;   // defaults to en-IN
};

type SummarizeRequest = {
  from: string;
  to: string;
  income: number;
  expense: number;
  net: number;
  count: number;
  currency: string;
  locale: string;
};

type SummarizeResponse = {
  ok: boolean;
  summary?: string;
  error?: string;
};

function normalizeCurrencyToINR(text: string): string {
  if (!text) return text;

  let out = text.replace(/\bUSD\b/gi, "INR");
  out = out.replace(/\bUS\$\s?/gi, "₹");
  out = out.replace(/(\$)\s?(?=\d)/g, "₹");
  out = out.replace(/\bRs\.?\s?(?=\d)/gi, "₹");

  return out;
}

export default function AIReportSummary({
  from,
  to,
  income,
  expense,
  net,
  count,
  className,
  currency = "INR",
  locale = "en-IN",
}: Props) {
  const [loading, setLoading] = React.useState(false);
  const [summary, setSummary] = React.useState<string>("");

  async function run() {
    setLoading(true);
    try {
      const payload: SummarizeRequest = {
        from,
        to,
        income,
        expense,
        net,
        count,
        currency,
        locale,
      };

      const res: SummarizeResponse = await summarizeReportAction(payload);

      if (res.ok) {
        const coerced = normalizeCurrencyToINR(res.summary ?? "");
        setSummary(coerced);
        toast.success("AI summary generated");
      } else {
        toast.error(res.error || "Unable to summarize right now");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn("[AI][reports.ui] summarize error:", msg);
      toast.error("Unable to summarize right now");
    } finally {
      setLoading(false);
    }
  }

  function clearSummary() {
    setSummary("");
    toast.message("Cleared summary");
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={run}
          disabled={loading}
          aria-label="Generate AI Summary"
          title="Generate AI Summary"
        >
          {loading ? "Generating…" : "Generate AI Summary"}
        </Button>

        {summary && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearSummary}
            aria-label="Clear AI Summary"
            title="Clear AI Summary"
          >
            Clear
          </Button>
        )}
      </div>

      <div
        className="mt-3"
        aria-live="polite"
        role="status"
        aria-atomic="true"
      >
        {loading ? (
          <Card>
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
              <Skeleton className="h-4 w-3/6" />
            </CardContent>
          </Card>
        ) : summary ? (
          <Card>
            <CardContent className="p-4 text-sm leading-6 whitespace-pre-wrap">
              {summary}
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">
            No summary yet. Click <span className="font-medium">Generate AI Summary</span> to create one for the current range.
          </p>
        )}
      </div>
    </div>
  );
}
