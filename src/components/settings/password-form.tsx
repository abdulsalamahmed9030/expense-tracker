"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { passwordSchema, type PasswordInput } from "@/lib/validation/profile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { changePassword } from "@/app/(app)/settings/actions";

export function PasswordForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<PasswordInput>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { new_password: "", confirm_password: "" },
  });

  const [message, setMessage] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (values: PasswordInput) => {
    setMessage(null);
    setErr(null);
    try {
      await changePassword(values);
      setMessage("Password updated");
      reset();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to update password";
      setErr(msg);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="text-sm font-medium">New password</label>
        <Input type="password" {...register("new_password")} className="mt-1" />
        {errors.new_password && (
          <p className="text-sm text-red-500">{errors.new_password.message}</p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium">Confirm password</label>
        <Input type="password" {...register("confirm_password")} className="mt-1" />
        {errors.confirm_password && (
          <p className="text-sm text-red-500">{errors.confirm_password.message}</p>
        )}
      </div>

      {err && <p className="text-sm text-red-500">{err}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Updating…" : "Change Password"}
      </Button>
    </form>
  );
}
