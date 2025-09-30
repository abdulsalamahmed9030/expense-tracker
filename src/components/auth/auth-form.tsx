"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils"; // optional; remove if you don't have this helper

const APP_NAME = "expense tracker by abdul salam ahmed";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type FormValues = z.infer<typeof schema>;

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const isSignIn = mode === "sign-in";
  const title = isSignIn ? "Sign In" : "Sign Up";
  const altText = isSignIn ? "Don’t have an account?" : "Already have an account?";
  const altHref = isSignIn ? "/sign-up" : "/sign-in";
  const altCta = isSignIn ? "Sign up" : "Sign in";

  // Set the browser tab title (since you only shared this file)
  useEffect(() => {
    document.title = `${title} — ${APP_NAME}`;
  }, [title]);

  const onSubmit = async (values: FormValues) => {
    setError(null);

    if (!values.email || !values.password) return;

    if (isSignIn) {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) return setError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
      });
      if (error) return setError(error.message);
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className={cn("mx-auto w-full max-w-sm")}>
      {/* App name branding */}
      <div className="mb-4 text-center">
        <h1 className="text-xl font-semibold tracking-tight">{APP_NAME}</h1>
        <p className="text-xs text-muted-foreground">
          {isSignIn ? "Welcome back" : "Create your account"}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              {...form.register("email")}
              aria-label="Email address"
              autoComplete="email"
              inputMode="email"
            />
            {form.formState.errors.email && (
              <p className="text-sm text-red-500">
                {form.formState.errors.email.message}
              </p>
            )}

            <PasswordInput
              placeholder="Password"
              aria-label="Password"
              {...form.register("password")}
              autoComplete={isSignIn ? "current-password" : "new-password"}
            />
            {form.formState.errors.password && (
              <p className="text-sm text-red-500">
                {form.formState.errors.password.message}
              </p>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button
              type="submit"
              className="w-full"
              aria-label={`${title} to ${APP_NAME}`}
            >
              {title}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {altText}{" "}
              <Link
                href={altHref}
                className="font-medium underline underline-offset-4"
                aria-label={`${altCta} for ${APP_NAME}`}
              >
                {altCta}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
