// src/lib/ai/provider.ts

export type ReportSummaryInput = {
  from: string; // ISO date
  to: string;   // ISO date
  income: number;
  expense: number;
  net: number;
  count: number; // number of transactions
};

export type CategorySuggestInput = {
  note: string;
  candidates?: string[]; // existing category names (optional)
};

export type BudgetCoachInput = {
  month: number; // 1-12
  year: number;  // e.g. 2025
  budgets: Array<{ category: string; planned: number; actual: number }>;
};

export type DuplicatesInput = {
  transactions: Array<{
    id: string;
    amount: number;              // positive expense or income number
    note?: string | null;
    occurred_at: string;         // ISO date-time string
  }>;
};

export type NLFilterInput = { text: string };

export type NLFilterResult = {
  type?: "income" | "expense";
  categoryId?: string; // leave mapping to caller; provider may return a name or slug for you to map
  from?: string;       // ISO date (inclusive)
  to?: string;         // ISO date (inclusive)
  maxAmount?: number;  // treat as <= maxAmount
};

export type CategorySuggestResult = {
  categoryName: string;
  confidence: number; // 0..1
};

export type DuplicatesResult = { ids: string[] };

export interface AIProvider {
  /** Human-readable name of the provider (e.g., "mock", "openai", "gemini"). */
  readonly name: string;

  summarizeReport(input: ReportSummaryInput): Promise<string>;

  suggestCategory(input: CategorySuggestInput): Promise<CategorySuggestResult>;

  budgetCoach(input: BudgetCoachInput): Promise<string>;

  findDuplicates(input: DuplicatesInput): Promise<DuplicatesResult>;

  nlFilterToQuery(input: NLFilterInput): Promise<NLFilterResult>;
}

/* -------------------- Safety & Utility Helpers -------------------- */

/** Redact emails and obvious phone-like sequences to reduce PII exposure. */
export function sanitizeText(s: string, max = 500): string {
  const redacted = s
    // emails
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    // phone-ish (7+ digits possibly separated)
    .replace(/\b(?:\+?\d[\s-]?){7,}\b/g, "[redacted-phone]");
  return truncate(redacted.trim(), max);
}

/** Hard truncate to cap model input size. */
export function truncate(s: string, max = 800): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + "…";
}

/** Clamp number to a safe range. */
export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Safe JSON parse that never throws. */
export function safeJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/**
 * Recursively trim & truncate *all string fields* within an object/array.
 * Leaves numbers/booleans/dates intact and preserves structure.
 */
export function sanitizeStrings<T>(value: T, maxLen = 500): T {
  if (value == null) return value;
  const t = typeof value;
  if (t === "string") {
    return truncate((value as unknown as string).trim(), maxLen) as unknown as T;
  }
  if (Array.isArray(value)) {
    return (value as unknown as unknown[]).map((v) => sanitizeStrings(v, maxLen)) as unknown as T;
  }
  if (t === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeStrings(v as never, maxLen);
    }
    return out as T;
  }
  return value;
}

/**
 * Pick a whitelist of keys from an object (TypeScript-safe).
 * Use to ensure we never pass sensitive/unneeded fields (e.g., user_id) to providers.
 */
export function pick<T extends object, K extends keyof T>(obj: T, keys: readonly K[]): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const k of keys) out[k] = obj[k];
  return out;
}
