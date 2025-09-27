import { AuthForm } from "@/components/auth/auth-form";

export default function SignInPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <AuthForm mode="sign-in" />
    </div>
  );
}
