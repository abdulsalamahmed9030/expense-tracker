"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Home, ArrowLeftCircle } from "lucide-react";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <Card className="w-full max-w-xl p-8 text-center space-y-6 rounded-2xl">
        <div className="space-y-2">
          <div className="text-7xl font-black tracking-tight text-muted-foreground/40">404</div>
          <h1 className="text-2xl font-semibold">Page not found</h1>
          <p className="text-sm text-muted-foreground">
            The page you’re looking for doesn’t exist or has moved.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            onClick={() => router.back()}
            aria-label="Go back"
            className="rounded-2xl"
          >
            <ArrowLeftCircle className="mr-2 h-4 w-4" />
            Go back
          </Button>

          <Button asChild className="rounded-2xl">
            <Link href="/dashboard" aria-label="Go to dashboard">
              <Home className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          If you think this is an error, try refreshing or navigate from the sidebar.
        </p>
      </Card>
    </div>
  );
}
