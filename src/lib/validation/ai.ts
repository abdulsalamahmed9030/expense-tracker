// src/lib/validation/ai.ts
import { z } from "zod";

/**
 * Common primitives
 */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be ISO date (YYYY-MM-DD)");

const isoDateTime = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})$/,
    "Must be ISO date-time"
  );

/**
 * Money coercion & bounds
 * Raised cap to 1e12 to avoid false positives on large totals.
 */
const MONEY_MAX = 1_000_000_000_000; // 1e12

// Accept numbers or numeric strings; coerce to number, then bound-check.
const nonNegativeMoney = z.coerce
  .number()
  .refine((n) => Number.isFinite(n), { message: "Amount must be a finite number" })
  .min(0, { message: "Must be ≥ 0" })
  .max(MONEY_MAX, { message: "Amount too large" });

const safeNote = z
  .string()
  .trim()
  .min(1, { message: "Note required" })
  .max(500, { message: "Note too long" });

/**
 * 1) Report Summary
 */
export const reportSummaryInput = z.object({
  from: isoDate,
  to: isoDate,
  income: nonNegativeMoney,
  expense: nonNegativeMoney,
  net: z.coerce
    .number()
    .refine((n) => Number.isFinite(n), { message: "Net must be a finite number" })
    .min(-MONEY_MAX, { message: "Too negative" })
    .max(MONEY_MAX, { message: "Too large" }),
  count: z.coerce.number().int().min(0).max(1_000_000),
});

export type ReportSummaryInput = z.infer<typeof reportSummaryInput>;

/**
 * 2) Category Suggestion
 */
export const categorySuggestInput = z.object({
  note: safeNote,
  candidates: z
    .array(z.string().trim().min(1).max(60))
    .max(200)
    .optional(),
});

export type CategorySuggestInput = z.infer<typeof categorySuggestInput>;

/**
 * 3) Budget Coach
 */
export const budgetCoachInput = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
  budgets: z
    .array(
      z.object({
        category: z.string().trim().min(1).max(60),
        planned: nonNegativeMoney,
        actual: nonNegativeMoney,
      })
    )
    .min(1)
    .max(1000),
});

export type BudgetCoachInput = z.infer<typeof budgetCoachInput>;

/**
 * 4) Duplicates / Anomaly Detector
 */
export const duplicatesInput = z.object({
  transactions: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(64),
        amount: nonNegativeMoney,
        note: z.string().trim().max(500).nullable().optional(),
        occurred_at: isoDateTime,
      })
    )
    .min(1)
    .max(5000),
});

export type DuplicatesInput = z.infer<typeof duplicatesInput>;

/**
 * 5) Natural Language Filter
 */
export const nlFilterInput = z.object({
  text: z.string().trim().min(1).max(300),
});

export type NLFilterInput = z.infer<typeof nlFilterInput>;

/**
 * Helpers for actions
 */
export function parseOrThrow<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message =
      result.error.issues?.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") ||
      "Invalid input";
    throw new Error(message);
  }
  return result.data;
}
