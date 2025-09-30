// src/app/(app)/transactions/ai-actions.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAI } from "@/lib/ai/router";
import {
  parseOrThrow,
  categorySuggestInput,
  duplicatesInput,
  nlFilterInput,
} from "@/lib/validation/ai";
import { sanitizeStrings } from "@/lib/ai/provider";
import { consumeRateLimit, perMinute } from "@/lib/rate-limit";

export async function suggestCategoryAction(raw: unknown) {
  const ACTION = "tx.suggestCategory";

  // ⬇️ await the Supabase server client
  const supabase = await createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id ?? "anon";

  const rl = consumeRateLimit(`${userId}:${ACTION}`, perMinute(12));
  if (!rl.ok) return { ok: false as const, error: `Rate limited. ${Math.ceil(rl.retryAfterMs / 1000)}s` };

  try {
    const input = parseOrThrow(categorySuggestInput, raw);
    const safe = sanitizeStrings({ ...input, note: input.note }, 300);

    // ⬇️ await the AI provider
    const ai = await getAI();
    const res = await ai.suggestCategory(safe);
    return { ok: true as const, ...res };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.warn(`[AI][${ACTION}]`, { user: !!u.user, message });
    return { ok: false as const, error: message || "Failed to suggest category" };
  }
}

export async function findDuplicatesAction(raw: unknown) {
  const ACTION = "tx.findDuplicates";

  // ⬇️ await the Supabase server client
  const supabase = await createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id ?? "anon";

  const rl = consumeRateLimit(`${userId}:${ACTION}`, perMinute(6));
  if (!rl.ok) return { ok: false as const, error: `Rate limited. ${Math.ceil(rl.retryAfterMs / 1000)}s` };

  try {
    const input = parseOrThrow(duplicatesInput, raw);
    const truncated = { ...input, transactions: input.transactions.slice(0, 500) };
    const safe = sanitizeStrings(truncated, 200);

    // ⬇️ await the AI provider
    const ai = await getAI();
    const res = await ai.findDuplicates(safe);
    return { ok: true as const, ids: res.ids };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.warn(`[AI][${ACTION}]`, { user: !!u.user, message });
    return { ok: false as const, error: message || "Failed to detect duplicates" };
  }
}

export async function nlFilterToQueryAction(raw: unknown) {
  const ACTION = "tx.nlFilter";

  // ⬇️ await the Supabase server client
  const supabase = await createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id ?? "anon";

  const rl = consumeRateLimit(`${userId}:${ACTION}`, perMinute(30));
  if (!rl.ok) return { ok: false as const, error: `Rate limited. ${Math.ceil(rl.retryAfterMs / 1000)}s` };

  try {
    const input = parseOrThrow(nlFilterInput, raw);
    const safe = sanitizeStrings(input, 200);

    // ⬇️ await the AI provider
    const ai = await getAI();
    const filter = await ai.nlFilterToQuery(safe);
    return { ok: true as const, filter };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.warn(`[AI][${ACTION}]`, { user: !!u.user, message });
    return { ok: false as const, error: message || "Failed to parse text" };
  }
}
