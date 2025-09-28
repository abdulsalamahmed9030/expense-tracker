import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AppSidebarLayout } from "@/components/sidebar/app-sidebar";
import { TopNav } from "@/components/nav/top-nav";
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
        {/* ThemeProvider should manage the `class` attribute for dark mode */}
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AppSidebarLayout>
            <TopNav />
            <main className="p-6">{children}</main>
          </AppSidebarLayout>

          {/* ✅ Sonner toaster (theme-aware, nice colors) */}
          <Toaster richColors theme="system" />
        </ThemeProvider>
      </body>
    </html>
  );
}
