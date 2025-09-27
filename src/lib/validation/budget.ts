// src/lib/validation/budget.ts
import { z } from "zod";

export const budgetSchema = z.object({
  id: z.string().uuid().optional(),
  category_id: z.string().uuid({ message: "Pick a category" }),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
  amount: z.coerce.number().positive({ message: "Amount must be > 0" }),
});

export type BudgetInput = z.infer<typeof budgetSchema>;
