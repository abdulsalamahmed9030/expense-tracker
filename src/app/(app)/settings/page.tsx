import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { ProfileForm } from "@/components/settings/profile-form";
import { PasswordForm } from "@/components/settings/password-form";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login"); // ✅ better UX than null
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6 space-y-4">
          <div className="text-lg font-medium">Profile</div>
          <ProfileForm
            email={user.email ?? ""}
            initialData={{
              full_name: profile?.full_name ?? "",
              avatar_url: profile?.avatar_url ?? undefined, // ✅ normalize null → undefined
            }}
          />
        </Card>

        <Card className="p-6 space-y-4">
          <div className="text-lg font-medium">Security</div>
          <PasswordForm />
        </Card>
      </div>
    </div>
  );
}
