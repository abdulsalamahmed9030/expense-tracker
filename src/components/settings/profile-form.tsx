"use client";

import { useMemo, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema, type ProfileInput } from "@/lib/validation/profile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { updateProfile } from "@/app/(app)/settings/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export function ProfileForm({
  initialData,
  email,
}: {
  initialData: ProfileInput;
  email: string;
}) {
  const supabase = createSupabaseBrowserClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: initialData.full_name ?? "",
      // store undefined (not null) to satisfy the schema/type
      avatar_url: initialData.avatar_url ?? undefined,
    },
  });

  const [file, setFile] = useState<File | null>(null);

  // Live values for preview / initials
  const fullName = watch("full_name") ?? "";
  const avatarUrl = watch("avatar_url") ?? undefined;

  // Update preview immediately when user types/pastes a link
  useEffect(() => {
    if (file && avatarUrl && !avatarUrl.startsWith("blob:")) {
      // If they type a URL after selecting a file, drop the file preview
      setFile(null);
    }
  }, [avatarUrl, file]);

  const initials = useMemo(() => {
    const fromName =
      fullName.match(/\b\w/g)?.slice(0, 2).join("").toUpperCase() || "";
    return fromName || email?.[0]?.toUpperCase() || "?";
  }, [fullName, email]);

  const onFileChange = (f: File | null) => {
    setFile(f);
    // Show a local preview via blob URL
    if (f) {
      setValue("avatar_url", URL.createObjectURL(f), { shouldValidate: false });
    } else {
      setValue("avatar_url", initialData.avatar_url ?? undefined, {
        shouldValidate: false,
      });
    }
  };

  const onSubmit = async (values: ProfileInput) => {
    try {
      // Decide final avatar_url:
      // - if a new file is selected, upload and use its public URL
      // - else, use the typed link (trim empty -> undefined)
      let finalAvatarUrl: string | undefined =
        (values.avatar_url?.trim() || undefined) ?? undefined;

      if (file) {
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth?.user?.id;
        if (!userId) {
          toast.error("Not authenticated");
          return;
        }

        const ext = file.name.split(".").pop() || "png";
        const objectPath = `${userId}/${Date.now()}.${ext}`; // no 'avatars/' prefix

        const { error: uploadErr } = await supabase.storage
          .from("avatars")
          .upload(objectPath, file, { upsert: true });

        if (uploadErr) {
          toast.error(uploadErr.message || "Upload failed");
          return;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(objectPath);

        finalAvatarUrl = publicUrl;
      }

      await updateProfile({
        full_name: values.full_name,
        avatar_url: finalAvatarUrl, // string | undefined
      });

      // lock the form to the final URL (so preview stays correct after submit)
      setValue("avatar_url", finalAvatarUrl, { shouldValidate: false });
      toast.success("Profile updated");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to update profile";
      toast.error(msg);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Email (read-only) */}
      <div>
        <label className="text-sm text-muted-foreground">Email</label>
        <Input value={email} readOnly disabled className="mt-1" />
      </div>

      {/* Avatar preview + upload + optional link */}
      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={avatarUrl} alt="Avatar" />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-2">
          <div>
            <label className="text-sm font-medium">Avatar (upload)</label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
              className="mt-1"
              aria-label="Upload avatar image"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Or Avatar URL (optional)</label>
            <Input
              placeholder="https://…"
              {...register("avatar_url")}
              className="mt-1"
              aria-label="Avatar URL"
            />
            {errors.avatar_url && (
              <p className="text-sm text-red-500 mt-1">
                {errors.avatar_url.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Full name */}
      <div>
        <label className="text-sm font-medium">Full name</label>
        <Input
          placeholder="Your name"
          {...register("full_name")}
          className="mt-1"
          aria-label="Full name"
        />
        {errors.full_name && (
          <p className="text-sm text-red-500 mt-1">
            {errors.full_name.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full"
        aria-label="Save profile"
      >
        {isSubmitting ? "Saving..." : "Save Profile"}
      </Button>
    </form>
  );
}
