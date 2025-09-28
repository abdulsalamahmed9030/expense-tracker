"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <Card className="w-full max-w-xl p-8 text-center space-y-6 rounded-2xl">
        <div className="flex flex-col items-center gap-3">
          <AlertTriangle className="h-12 w-12 text-red-500" />
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            An unexpected error occurred. Don’t worry — it’s not your fault.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Button onClick={() => reset()} className="rounded-2xl" aria-label="Retry action">
            <RotateCcw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Error digest: {error.digest ?? "n/a"}
        </p>
      </Card>
    </div>
  );
}
