"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { profileSchema, passwordSchema } from "@/lib/validation/profile";

export async function updateProfile(data: unknown) {
  const supabase = await createSupabaseServerClient();

  // Get current user (from cookie-bound server client)
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) throw new Error("Not authenticated");

  const parsed = profileSchema.safeParse(data);
  if (!parsed.success) {
    // ZodError.issues is the correct array
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { full_name, avatar_url } = parsed.data;

  // Upsert profile (create if missing)
  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userData.user.id,
        full_name,
        // store null if empty string
        avatar_url: avatar_url && avatar_url.length > 0 ? avatar_url : null,
      },
      { onConflict: "id" }
    );

  if (error) throw error;

  revalidatePath("/settings");
}

export async function changePassword(data: unknown) {
  const supabase = await createSupabaseServerClient();

  // Ensure user
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) throw new Error("Not authenticated");

  const parsed = passwordSchema.safeParse(data);
  if (!parsed.success) {
    // ZodError.issues is the correct array
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { new_password } = parsed.data;

  const { error } = await supabase.auth.updateUser({ password: new_password });
  if (error) throw new Error(error.message);

  // Optional: revalidate settings after update
  revalidatePath("/settings");
}
