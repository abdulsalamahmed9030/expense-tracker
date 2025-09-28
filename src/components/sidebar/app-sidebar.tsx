"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger, // <-- toggle button
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  ReceiptText,
  Tags,
  Wallet,
  PieChart,
  Settings,
} from "lucide-react";

const items = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Transactions", href: "/transactions", icon: ReceiptText },
  { title: "Categories", href: "/categories", icon: Tags },
  { title: "Budgets", href: "/budgets", icon: Wallet },
  { title: "Reports", href: "/reports", icon: PieChart },
  { title: "Settings", href: "/settings", icon: Settings },
];

// Simple viewport check (matches Tailwind lg breakpoint = 1024px)
function useIsMobile(breakpointPx = 1024) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width:${breakpointPx}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, [breakpointPx]);
  return isMobile;
}

export function AppSidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMobile = useIsMobile();

  // Control sidebar open/close here (desktop open by default, mobile closed)
  const [open, setOpen] = useState<boolean>(!isMobile);

  // Sync open state when viewport crosses breakpoint
  useEffect(() => {
    setOpen(!isMobile);
  }, [isMobile]);

  // Auto-close on route change (mobile only)
  useEffect(() => {
    if (isMobile) setOpen(false);
  }, [pathname, isMobile]);

  const handleNavigate = useCallback(() => {
    if (isMobile) setOpen(false);
  }, [isMobile]);

  return (
    <SidebarProvider open={open} onOpenChange={setOpen}>
      <Sidebar collapsible="icon">
        <SidebarHeader className="flex items-center gap-2 px-3 py-2">
          {/* Trigger shows a hamburger icon provided by shadcn/ui/sidebar */}
          <SidebarTrigger className="lg:hidden" />
          <div className="text-sm font-semibold">Expense Tracker</div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => {
                  const Icon = item.icon;
                  const active =
                    pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={active}>
                        <Link href={item.href} onClick={handleNavigate}>
                          <Icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="px-3 py-2 text-xs text-muted-foreground">
          v0.1.0
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
