// src/app/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClientReadOnly } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function HomePage() {
  // If user is already logged in, send them to the app
  const supabase = await createSupabaseServerClientReadOnly();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/dashboard");
  }

  // Public landing with both choices
  return (
    <div className="flex min-h-[calc(100dvh-3rem)] items-center justify-center p-6">
      <Card className="w-full max-w-md p-6 space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Expense Tracker</h1>
        <p className="text-sm text-muted-foreground">
          Track expenses, budgets, and reports with real-time sync.
        </p>

        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link href="/sign-in" className="w-full">
            <Button variant="secondary" className="w-full" aria-label="Go to Sign in">
              Sign in
            </Button>
          </Link>
          <Link href="/sign-up" className="w-full">
            <Button className="w-full" aria-label="Go to Sign up">
              Sign up
            </Button>
          </Link>
        </div>

        <p className="text-xs text-muted-foreground">
          New here? Click <span className="font-medium">Sign up</span> to create your account.
        </p>
      </Card>
    </div>
  );
}
