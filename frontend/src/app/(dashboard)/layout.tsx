"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useAuth } from "@/lib/auth-context";
import type { Role } from "@/lib/types";

// Whitelist of which role may visit which top-level route. Anything not listed
// is treated as shared (both roles allowed).
const adminOnly = ["/drivers", "/live-map"];
const driverOnly = ["/profile", "/shifts"];

function isAllowed(pathname: string, role: Role) {
  if (adminOnly.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return role === "admin";
  }
  if (driverOnly.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return role === "driver";
  }
  return true;
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!isAllowed(pathname, user.role)) {
      router.replace("/dashboard");
    }
  }, [loading, user, pathname, router]);

  if (loading || !user || !isAllowed(pathname, user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-10 animate-spin rounded-full border-2 border-border border-t-brand" />
      </div>
    );
  }

  return <DashboardShell>{children}</DashboardShell>;
}
