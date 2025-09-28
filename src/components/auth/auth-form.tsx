"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  const onSubmit = async (values: FormValues) => {
    setError(null);

    if (mode === "sign-up") {
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
      });
      if (error) return setError(error.message);
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) return setError(error.message);
    }

    router.push("/dashboard");
    router.refresh();
  };

  const title = mode === "sign-in" ? "Sign In" : "Sign Up";
  const altText =
    mode === "sign-in"
      ? "Don’t have an account?"
      : "Already have an account?";
  const altHref = mode === "sign-in" ? "/sign-up" : "/sign-in";
  const altCta = mode === "sign-in" ? "Sign up" : "Sign in";

  return (
    <Card className="mx-auto max-w-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Input
            type="email"
            placeholder="Email"
            {...form.register("email")}
            aria-label="Email"
          />
          {form.formState.errors.email && (
            <p className="text-sm text-red-500">
              {form.formState.errors.email.message}
            </p>
          )}

          {/* 👇 Eye toggle password field */}
          <PasswordInput
            placeholder="Password"
            aria-label="Password"
            {...form.register("password")}
          />
          {form.formState.errors.password && (
            <p className="text-sm text-red-500">
              {form.formState.errors.password.message}
            </p>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" className="w-full">
            {title}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {altText}{" "}
            <Link href={altHref} className="font-medium underline underline-offset-4">
              {altCta}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
