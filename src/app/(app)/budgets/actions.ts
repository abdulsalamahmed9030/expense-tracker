"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { budgetSchema } from "@/lib/validation/budget";

/**
 * Create Budget
 * Accepts the plain budgetSchema (without id).
 */
export async function createBudget(data: unknown) {
  const supabase = await createSupabaseServerClient();
  const parsed = budgetSchema.omit({ id: true }).safeParse(data);
  if (!parsed.success) throw new Error("Invalid input");

  const { error } = await supabase.from("budgets").insert(parsed.data);
  if (error) throw error;

  revalidatePath("/budgets");
}

/**
 * Update Budget
 * Accepts the full budgetSchema (with id).
 */
export async function updateBudget(data: unknown) {
  const supabase = await createSupabaseServerClient();
  const parsed = budgetSchema.safeParse(data);
  if (!parsed.success) throw new Error("Invalid input");

  const { id, ...rest } = parsed.data;
  const { error } = await supabase.from("budgets").update(rest).eq("id", id!);
  if (error) throw error;

  revalidatePath("/budgets");
}

/**
 * Delete Budget
 */
export async function deleteBudget(id: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("budgets").delete().eq("id", id);
  if (error) throw error;

  revalidatePath("/budgets");
}
