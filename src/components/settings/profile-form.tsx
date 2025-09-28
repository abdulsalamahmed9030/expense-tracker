"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema, type ProfileInput } from "@/lib/validation/profile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { updateProfile } from "@/app/(app)/settings/actions";

export function ProfileForm({
  initialData,
  email,
}: {
  initialData: ProfileInput;
  email: string;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: initialData,
  });

  const [message, setMessage] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const avatarUrl = watch("avatar_url") ?? "";

  const onSubmit = async (values: ProfileInput) => {
    setMessage(null);
    setErr(null);
    try {
      await updateProfile(values);
      setMessage("Profile updated");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to update profile";
      setErr(msg);
    }
  };

  const fallback = (email?.[0] ?? "?").toUpperCase();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Email (read-only) */}
      <div>
        <label className="text-sm text-muted-foreground">Email</label>
        <Input value={email} readOnly disabled className="mt-1" />
      </div>

      {/* Avatar preview */}
      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={avatarUrl || undefined} alt="Avatar" />
          <AvatarFallback>{fallback}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <label className="text-sm font-medium">Avatar URL</label>
          <Input
            placeholder="https://…"
            {...register("avatar_url")}
            className="mt-1"
          />
          {errors.avatar_url && (
            <p className="text-sm text-red-500">{errors.avatar_url.message}</p>
          )}
        </div>
      </div>

      {/* Full name */}
      <div>
        <label className="text-sm font-medium">Full name</label>
        <Input placeholder="Your name" {...register("full_name")} className="mt-1" />
        {errors.full_name && (
          <p className="text-sm text-red-500">{errors.full_name.message}</p>
        )}
      </div>

      {err && <p className="text-sm text-red-500">{err}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Saving..." : "Save Profile"}
      </Button>
    </form>
  );
}
