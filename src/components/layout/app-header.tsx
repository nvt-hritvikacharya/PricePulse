"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Bell, Heart, Home, LayoutDashboard, LogOut, Search, Settings, User } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { cn, timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { DemoBadge } from "@/components/shared/demo-badge";

interface HeaderUser {
  name: string | null;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: "USER" | "ADMIN";
}

const NAV = [
  { href: "/home", label: "Search", icon: Home },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/profile", label: "Profile", icon: User },
];

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  url: string | null;
  readAt: string | null;
  createdAt: string;
}

function NotificationsBell() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api<{ items: NotificationItem[]; unread: number }>("/api/notifications"),
    refetchInterval: 60_000,
  });
  const unread = data?.unread ?? 0;
  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open && unread) api("/api/notifications", { method: "PATCH" }).then(() => qc.invalidateQueries({ queryKey: ["notifications"] }));
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} className="relative">
          <Bell />
          {unread > 0 && <span className="absolute top-1.5 right-1.5 grid size-4 place-items-center rounded-full bg-destructive text-[10px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        {!data?.items.length && <p className="px-3 py-6 text-center text-sm text-muted-foreground">No notifications yet. Set a price alert!</p>}
        {data?.items.slice(0, 8).map((n) => (
          <DropdownMenuItem key={n.id} asChild>
            <Link href={n.url ?? "/alerts"} className="flex-col !items-start gap-0.5">
              <span className={cn("line-clamp-1 text-sm font-semibold", !n.readAt && "text-primary")}>{n.title}</span>
              <span className="line-clamp-2 text-xs text-muted-foreground">{n.body}</span>
              <span className="text-[10px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppHeader({ user, demoMode }: { user: HeaderUser; demoMode: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const nav = user.role === "ADMIN" ? [...NAV, { href: "/admin", label: "Admin", icon: LayoutDashboard }] : NAV;
  const initials = (user.name ?? user.email ?? user.phone ?? "U").slice(0, 2).toUpperCase();

  async function logout() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    qc.clear();
    toast.success("Signed out");
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      <header className="glass sticky top-0 z-40 border-x-0 border-t-0">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Logo />
          {demoMode && <DemoBadge className="hidden sm:inline-flex" />}
          <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label="Main">
            {nav.map(({ href, label }) => {
              const active = pathname === href || (href !== "/home" && pathname.startsWith(href));
              return (
                <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("relative rounded-full px-4 py-2 text-sm font-medium transition-colors", active ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
                  {active && <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-full bg-muted" transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} />}
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" asChild className="md:hidden">
              <Link href="/home" aria-label="Search"><Search /></Link>
            </Button>
            <ThemeToggle />
            <NotificationsBell />
            <DropdownMenu>
              <DropdownMenuTrigger className="ml-1 cursor-pointer rounded-full" aria-label="Account menu">
                <Avatar>
                  {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <span className="block text-sm font-semibold text-foreground">{user.name ?? "Shopper"}</span>
                  {user.email ?? user.phone}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link href="/profile"><User /> Profile</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/profile#settings"><Settings /> Settings</Link></DropdownMenuItem>
                {user.role === "ADMIN" && <DropdownMenuItem asChild><Link href="/admin"><LayoutDashboard /> Admin panel</Link></DropdownMenuItem>}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={logout} className="text-destructive"><LogOut className="!text-destructive" /> Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={logout} className="ml-2 hidden lg:inline-flex" aria-label="Log out">
              <LogOut /> Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile bottom navigation */}
      <nav className="glass fixed inset-x-3 bottom-3 z-40 flex justify-around rounded-2xl p-1.5 shadow-2xl md:hidden" aria-label="Main mobile">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/home" && pathname.startsWith(href));
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium", active ? "bg-primary/10 text-primary" : "text-muted-foreground")}>
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
