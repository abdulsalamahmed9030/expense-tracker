import { z } from "zod";

export const transactionSchema = z.object({
  id: z.string().uuid().optional(),

  amount: z.number().positive(),

  type: z.enum(["income", "expense"]),

  // Accept a UUID from the dropdown OR an empty string (when none selected).
  // We'll convert "" → null in the form submit.
  category_id: z.union([z.string().uuid(), z.literal("")]).optional().nullable(),

  // Date only (calendar): YYYY-MM-DD
  occurred_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be in format YYYY-MM-DD" }),

  note: z.string().max(255).optional().nullable(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
