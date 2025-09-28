import { z } from "zod";

export const profileSchema = z.object({
  full_name: z
    .string()
    .min(1, "Full name is required")
    .max(100, "Too long"),
  // Allow empty string (treated as null on save) or a valid URL
  avatar_url: z
    .union([z.literal(""), z.string().url("Must be a valid URL")])
    .optional(),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const passwordSchema = z
  .object({
    new_password: z.string().min(6, "At least 6 characters"),
    confirm_password: z.string().min(6, "At least 6 characters"),
  })
  .refine((v) => v.new_password === v.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords do not match",
  });

export type PasswordInput = z.infer<typeof passwordSchema>;
