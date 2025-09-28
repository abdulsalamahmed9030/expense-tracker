import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: {
    default: "Expense Tracker",
    template: "%s • Expense Tracker",
  },
  description: "Track expenses, budgets, and reports with real-time sync.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        {/* Keep Root bare: no Supabase, no app chrome */}
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster richColors theme="system" />
        </ThemeProvider>
      </body>
    </html>
  );
}
