"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { budgetSchema } from "@/lib/validation/budget";

export async function createBudget(data: unknown) {
  const supabase = await createSupabaseServerClient();
  const parsed = budgetSchema.omit({ id: true }).safeParse(data);
  if (!parsed.success) throw new Error("Invalid input");

  const { error } = await supabase.from("budgets").insert(parsed.data);
  if (error) throw error;
  revalidatePath("/budgets");
}

export async function updateBudget(data: unknown) {
  const supabase = await createSupabaseServerClient();
  const parsed = budgetSchema.safeParse(data);
  if (!parsed.success) throw new Error("Invalid input");

  const { id, ...rest } = parsed.data;
  const { error } = await supabase.from("budgets").update(rest).eq("id", id!);
  if (error) throw error;
  revalidatePath("/budgets");
}

export async function deleteBudget(id: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("budgets").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/budgets");
}
