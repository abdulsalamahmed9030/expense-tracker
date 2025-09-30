"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAI } from "@/lib/ai/router";
import { parseOrThrow, budgetCoachInput } from "@/lib/validation/ai";
import { sanitizeStrings } from "@/lib/ai/provider";
import { consumeRateLimit, perMinute } from "@/lib/rate-limit";
import { z } from "zod";

/**
 * Extend the shared schema locally to allow an optional follow-up question.
 * Keep this in sync with the UI limit (200 chars).
 */
const budgetCoachWithQuestion = budgetCoachInput.and(
  z.object({
    question: z.string().trim().min(1).max(200).optional(),
  })
);

type BudgetCoachInputWithQuestion = z.infer<typeof budgetCoachWithQuestion>;

/**
 * Provide brief guidance for overspends and next-month adjustments.
 * Also supports an optional free-text follow-up: `question?: string`.
 */
export async function budgetCoachAction(
  raw: unknown
): Promise<{ ok: true; advice: string } | { ok: false; error: string }> {
  const ACTION = "budgets.coach";

  // Auth (no PII forwarded to AI)
  const supabase = await createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id ?? "anon";

  // Simple per-user rate limit
  const rl = consumeRateLimit(`${userId}:${ACTION}`, perMinute(6));
  if (!rl.ok) {
    return {
      ok: false,
      error: `Too many requests. Try again in ${Math.ceil(
        rl.retryAfterMs / 1000
      )}s.`,
    };
  }

  try {
    // Accepts: { month, year, budgets, question? }
    const input: BudgetCoachInputWithQuestion = parseOrThrow(
      budgetCoachWithQuestion,
      raw
    );

    // Cap array length to protect model/token cost
    const capped = { ...input, budgets: input.budgets.slice(0, 200) };

    // Sanitize/truncate ALL strings (including `question`) to max 200 chars
    const safe = sanitizeStrings(capped, 200);

    // Call provider via abstraction (router picks active provider)
    const ai = await getAI();
    const advice = await ai.budgetCoach(safe);

    if (!advice || typeof advice !== "string") {
      return { ok: false, error: "Empty AI response." };
    }

    return { ok: true, advice };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[AI][budgets.coach] error", { user: !!u.user, message });
    return { ok: false, error: "Couldn’t generate budget advice." };
  }
}
