"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { categorySchema } from "@/lib/validation/category";

const LIST_PATH = "/categories";
const CATEGORIES_TAG = "categories";

export async function createCategory(data: unknown) {
  const supabase = await createSupabaseServerClient();

  const parsed = categorySchema.omit({ id: true }).safeParse(data);
  if (!parsed.success) throw new Error("Invalid input");

  const { data: row, error } = await supabase
    .from("categories")
    .insert(parsed.data)
    .select("*")
    .single();

  if (error) throw error;

  revalidatePath(LIST_PATH);
  revalidateTag(CATEGORIES_TAG);

  return { ok: true, data: row };
}

export async function updateCategory(data: unknown) {
  const supabase = await createSupabaseServerClient();

  const parsed = categorySchema.safeParse(data);
  if (!parsed.success) throw new Error("Invalid input");

  const { id, ...rest } = parsed.data;

  const { data: row, error } = await supabase
    .from("categories")
    .update(rest)
    .eq("id", id!)
    .select("*")
    .single();

  if (error) throw error;

  revalidatePath(LIST_PATH);
  revalidateTag(CATEGORIES_TAG);

  return { ok: true, data: row };
}

export async function deleteCategory(id: string) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;

  revalidatePath(LIST_PATH);
  revalidateTag(CATEGORIES_TAG);

  return { ok: true, id };
}
