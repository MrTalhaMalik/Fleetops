"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Calendar,
  Car,
  Clock,
  LayoutDashboard,
  LogOut,
  Map,
  Truck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

type NavItem = { label: string; href: string; icon: LucideIcon };

const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Events", href: "/events", icon: Calendar },
  { label: "Drivers", href: "/drivers", icon: Users },
  { label: "Cars", href: "/cars", icon: Car },
  { label: "Live Map", href: "/live-map", icon: Map },
  { label: "Alerts", href: "/alerts", icon: AlertTriangle },
];

const driverNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Events", href: "/events", icon: Calendar },
  { label: "Shifts", href: "/shifts", icon: Clock },
  { label: "Alerts", href: "/alerts", icon: AlertTriangle },
  { label: "Profile", href: "/profile", icon: UserRound },
];

type Props = { mobileOpen: boolean; onClose: () => void };

export function Sidebar({ mobileOpen, onClose }: Props) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [confirmLogout, setConfirmLogout] = useState(false);

  const role = user?.role ?? "driver";
  const nav = role === "admin" ? adminNav : driverNav;

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-sidebar text-sidebar-muted transition-transform duration-300 ease-out lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex items-center justify-between px-6 pt-7 pb-6">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand text-foreground shadow-md">
              <Truck className="size-5" strokeWidth={2.5} />
            </span>
            <div className="leading-tight">
              <p className="text-base font-semibold tracking-tight text-white">FleetOps</p>
              <p className="text-[11px] uppercase tracking-wider text-sidebar-muted">
                {role === "admin" ? "Operations" : "Driver"}
              </p>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden rounded-lg p-1.5 text-sidebar-muted hover:bg-sidebar-soft hover:text-white"
            aria-label="Close menu"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-brand text-foreground shadow-sm"
                    : "text-sidebar-muted hover:bg-sidebar-soft hover:text-white",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="sidebar-active"
                    className="absolute inset-0 -z-10 rounded-xl bg-brand"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon className="size-[18px]" strokeWidth={2.25} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-soft p-4">
          <button
            onClick={() => setConfirmLogout(true)}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-sidebar-muted transition-colors hover:bg-sidebar-soft hover:text-white"
          >
            <LogOut className="size-[18px]" strokeWidth={2.25} />
            Logout
          </button>
        </div>
      </aside>

      {confirmLogout && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-2xl"
          >
            <h3 className="text-lg font-semibold text-foreground">Sign out of FleetOps?</h3>
            <p className="mt-1.5 text-sm text-muted">
              You&apos;ll need to sign in again to access your dashboard.
            </p>
            <div className="mt-5 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmLogout(false)}>
                Cancel
              </Button>
              <Button variant="primary" className="flex-1" onClick={logout}>
                Sign out
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
