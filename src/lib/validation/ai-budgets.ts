import { z } from "zod";
import { budgetCoachInput } from "./ai";

/**
 * Shared schema for Budget Coach that ALSO supports an optional follow-up question.
 * Keep the limit aligned with UI (200 chars).
 */
export const budgetCoachInputWithQuestion = budgetCoachInput.and(
  z.object({
    question: z.string().trim().min(1).max(200).optional(),
  })
);

export type BudgetCoachWithQuestion = z.infer<typeof budgetCoachInputWithQuestion>;
