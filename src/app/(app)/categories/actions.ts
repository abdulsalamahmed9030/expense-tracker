"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { categorySchema } from "@/lib/validation/category";

export async function createCategory(data: unknown) {
  const supabase = await createSupabaseServerClient();

  const parsed = categorySchema.omit({ id: true }).safeParse(data);
  if (!parsed.success) throw new Error("Invalid input");

  const { error } = await supabase.from("categories").insert({
    ...parsed.data,
  });

  if (error) throw error;
  revalidatePath("/categories");
}

export async function updateCategory(data: unknown) {
  const supabase = await createSupabaseServerClient();

  const parsed = categorySchema.safeParse(data);
  if (!parsed.success) throw new Error("Invalid input");

  const { id, ...rest } = parsed.data;

  const { error } = await supabase.from("categories").update(rest).eq("id", id!);
  if (error) throw error;
  revalidatePath("/categories");
}

export async function deleteCategory(id: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/categories");
}
