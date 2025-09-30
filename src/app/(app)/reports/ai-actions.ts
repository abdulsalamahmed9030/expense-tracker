"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAI } from "@/lib/ai/router";
import { parseOrThrow, reportSummaryInput } from "@/lib/validation/ai";
import { sanitizeStrings } from "@/lib/ai/provider";
import { consumeRateLimit, perMinute } from "@/lib/rate-limit";

/**
 * Summarize the report KPIs for a date range.
 * Input must match reportSummaryInput schema.
 */
export async function summarizeReportAction(
  raw: unknown
): Promise<{ ok: true; summary: string } | { ok: false; error: string }> {
  try {
    // 1) Validate
    const input = parseOrThrow(reportSummaryInput, raw);

    // 2) Per-user rate limit (8 per minute)
    const supabase = await createSupabaseServerClient();
    const { data: u } = await supabase.auth.getUser();
    const userId = u.user?.id ?? "anon";
    const rl = consumeRateLimit(`${userId}:reports.summarize`, perMinute(8));
    if (!rl.ok) {
      return {
        ok: false,
        error: `Too many requests. Try again in ${Math.ceil(rl.retryAfterMs / 1000)}s.`,
      };
    }

    // 3) Sanitize strings
    const safeInput = sanitizeStrings(input, 300);

    // 4) Call provider
    const ai = await getAI();
    const summary = await ai.summarizeReport(safeInput);

    return { ok: true, summary };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[AI][reports.summarize] error:", message);
    return { ok: false, error: "Unable to summarize report right now." };
  }
}
