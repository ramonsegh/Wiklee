import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { UserButton, useUser } from "@clerk/react";
import { Calendar, CalendarClock, Clock, LayoutDashboard, Link as LinkIcon, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/event-types", label: "Event Types", icon: CalendarClock },
  { href: "/availability", label: "Availability", icon: Clock },
  { href: "/bookings", label: "Bookings", icon: LinkIcon },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user } = useUser();

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex md:w-60 md:flex-col border-r border-sidebar-border bg-sidebar">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <span className="font-display font-semibold text-lg text-sidebar-foreground">Wiklee</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover-elevate",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border flex items-center gap-3">
          <UserButton />
          <div className="min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.fullName ?? user?.primaryEmailAddress?.emailAddress}
            </p>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden h-14 flex items-center justify-between px-4 border-b border-border bg-card">
          <span className="font-display font-semibold">Wiklee</span>
          <UserButton />
        </header>
        <nav className="md:hidden flex overflow-x-auto gap-1 px-2 py-2 border-b border-border bg-card">
          {navItems.map((item) => {
            const active = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap hover-elevate",
                  active ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <main className="flex-1 p-4 md:p-8 max-w-5xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

export { basePath };
