import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AppSidebarLayout } from "@/components/sidebar/app-sidebar";
import { TopNav } from "@/components/nav/top-nav";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <AppSidebarLayout>
      <TopNav />
      <main className="p-6">{children}</main>
    </AppSidebarLayout>
  );
}
