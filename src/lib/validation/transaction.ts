import { z } from "zod";

export const transactionSchema = z.object({
  id: z.string().uuid().optional(),
  amount: z.number().positive(),
  type: z.enum(["income", "expense"]),
  // category: optional string (letters, numbers, empty allowed)
  category_id: z.string().regex(/^[a-zA-Z0-9]*$/, {
    message: "Category can only contain letters or numbers",
  }).optional().nullable(),
  // only date, no time → accept YYYY-MM-DD
  occurred_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "Date must be in format YYYY-MM-DD",
  }),
  note: z.string().max(255).optional().nullable(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
