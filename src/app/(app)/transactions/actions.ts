"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { transactionSchema } from "@/lib/validation/transaction";

export async function createTransaction(data: unknown) {
  const supabase = await createSupabaseServerClient();

  const parsed = transactionSchema.omit({ id: true }).safeParse(data);
  if (!parsed.success) throw new Error("Invalid input");

  const { error } = await supabase.from("transactions").insert(parsed.data);

  if (error) throw error;
  revalidatePath("/transactions");
}

export async function updateTransaction(data: unknown) {
  const supabase = await createSupabaseServerClient();

  const parsed = transactionSchema.safeParse(data);
  if (!parsed.success) throw new Error("Invalid input");

  const { id, ...rest } = parsed.data;

  const { error } = await supabase
    .from("transactions")
    .update(rest)
    .eq("id", id!);

  if (error) throw error;
  revalidatePath("/transactions");
}

export async function deleteTransaction(id: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/transactions");
}
