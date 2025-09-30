"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAI } from "@/lib/ai/router";
import { parseOrThrow, budgetCoachInput } from "@/lib/validation/ai";
import { sanitizeStrings } from "@/lib/ai/provider";
import { consumeRateLimit, perMinute } from "@/lib/rate-limit";

/**
 * Provide brief guidance for overspends and next-month adjustments.
 */
export async function budgetCoachAction(
  raw: unknown
): Promise<{ ok: true; advice: string } | { ok: false; error: string }> {
  const ACTION = "budgets.coach";

  // ⬇️ await the Supabase server client
  const supabase = await createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id ?? "anon";

  const rl = consumeRateLimit(`${userId}:${ACTION}`, perMinute(6));
  if (!rl.ok) {
    return {
      ok: false,
      error: `Too many requests. Try again in ${Math.ceil(rl.retryAfterMs / 1000)}s.`,
    };
  }

  try {
    const input = parseOrThrow(budgetCoachInput, raw);

    const trimmed = { ...input, budgets: input.budgets.slice(0, 200) };
    const safe = sanitizeStrings(trimmed, 200);

    // ⬇️ await the AI provider
    const ai = await getAI();
    const advice = await ai.budgetCoach(safe);

    return { ok: true, advice };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[AI][budgets.coach] error", { user: !!u.user, message });
    return { ok: false, error: "Couldn’t generate budget advice." };
  }
}
 