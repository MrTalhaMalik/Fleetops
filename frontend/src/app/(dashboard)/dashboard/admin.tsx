"use client";

import { motion } from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  Calendar,
  Truck,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { PageLoading } from "@/components/ui/loading";
import { useAuth } from "@/lib/auth-context";
import { useDashboardStats, useDrivers, useEvents } from "@/lib/queries";

export function AdminDashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: drivers = [] } = useDrivers();
  const { data: events = [] } = useEvents();

  if (statsLoading && !stats) return <PageLoading label="Loading dashboard…" />;

  const onShift = drivers.filter((d) => d.status === "on-duty");

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-sidebar via-sidebar to-sidebar-soft p-6 text-white sm:p-8"
      >
        <div className="absolute right-0 top-0 size-64 -translate-y-16 translate-x-16 rounded-full bg-brand/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-brand">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Welcome back, {user?.name.split(" ")[0]} 👋
            </h1>
            <p className="mt-1 text-sm text-sidebar-muted">
              Manage your fleet, dispatch events, and approve new drivers.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/events"
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-foreground transition-transform hover:scale-[1.03]"
            >
              New event
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
      </motion.div>

      <PageHeader title="Dashboard" description="Real-time overview of your fleet operations." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Approved drivers"
          value={stats?.totalDrivers ?? 0}
          icon={Users}
          helper="active accounts"
          accent="info"
        />
        <StatCard
          label="Pending approvals"
          value={stats?.pendingDrivers ?? 0}
          icon={UserCheck}
          helper="awaiting review"
          accent="brand"
          delay={0.05}
        />
        <StatCard
          label="On duty now"
          value={stats?.activeNow ?? onShift.length}
          icon={Activity}
          helper="drivers on shift"
          accent="success"
          delay={0.1}
        />
        <StatCard
          label="Active events"
          value={stats?.upcomingEvents ?? events.filter((e) => e.status !== "completed").length}
          icon={Calendar}
          helper="upcoming or ongoing"
          accent="danger"
          delay={0.15}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>On-duty drivers</CardTitle>
            <Link
              href="/drivers"
              className="text-xs font-semibold text-brand-strong hover:underline"
            >
              Manage
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {onShift.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">No drivers on shift right now.</p>
            ) : (
              onShift.slice(0, 6).map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-xl border border-border-soft p-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={d.name} color={d.avatarColor} />
                    <div>
                      <p className="text-sm font-medium text-foreground">{d.name}</p>
                      <p className="text-xs text-muted">{d.email}</p>
                    </div>
                  </div>
                  <Badge tone="success" dot>
                    <Truck className="size-3" /> Driving
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming events</CardTitle>
            <Link href="/events" className="text-xs font-semibold text-brand-strong hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {events.filter((e) => e.status !== "completed").length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">
                No upcoming events. Create one to get started.
              </p>
            ) : (
              events
                .filter((e) => e.status !== "completed")
                .slice(0, 6)
                .map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center gap-3 rounded-xl border border-border-soft p-3"
                  >
                    <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-soft text-brand-strong">
                      <span className="text-[10px] font-semibold uppercase">
                        {new Date(e.startDate).toLocaleDateString("en-US", { month: "short" })}
                      </span>
                      <span className="text-base font-bold leading-none">
                        {new Date(e.startDate).getDate()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{e.title}</p>
                      <p className="truncate text-xs text-muted">
                        {e.endDate && e.endDate !== e.startDate ? `${e.startDate} – ${e.endDate}` : e.startDate} · {e.location}
                      </p>
                    </div>
                    <Badge tone={e.status === "ongoing" ? "brand" : "info"}>{e.status}</Badge>
                  </div>
                ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
