"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  Info,
  Plus,
  Siren,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { PageLoading, ErrorState } from "@/components/ui/loading";
import {
  useAlerts,
  useDeleteAlert,
  useEvents,
  useToggleAlertRead,
} from "@/lib/queries";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { AlertItem } from "@/lib/types";
import { cn } from "@/lib/cn";
import { AlertComposer } from "./alert-composer";

const tabs = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "emergency", label: "Emergency" },
  { key: "shift", label: "Shift" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

const typeMeta: Record<
  AlertItem["type"],
  {
    icon: typeof Bell;
    tone: "danger" | "brand" | "info" | "muted";
    bg: string;
    label: string;
  }
> = {
  emergency: { icon: Siren, tone: "danger", bg: "bg-danger-soft text-rose-700", label: "Emergency" },
  shift: { icon: AlertTriangle, tone: "brand", bg: "bg-brand-soft text-brand-strong", label: "Shift" },
  info: { icon: Info, tone: "info", bg: "bg-info-soft text-blue-700", label: "Info" },
  system: { icon: Bell, tone: "muted", bg: "bg-border-soft text-muted", label: "System" },
};

export default function AlertsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: items = [], isLoading, error, refetch } = useAlerts();
  const { data: events = [] } = useEvents();
  const toggleRead = useToggleAlertRead();
  const deleteAlert = useDeleteAlert();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabKey>("all");
  const [composerOpen, setComposerOpen] = useState(false);

  const markAll = useMutation({
    mutationFn: async () => {
      await Promise.all(
        items
          .filter((a) => !a.read)
          .map((a) =>
            api(`/alerts/${a.id}/read`, { method: "PATCH", body: { read: true } }),
          ),
      );
    },
    onSuccess: () => {
      toast.success("All alerts marked as read");
      qc.invalidateQueries({ queryKey: ["alerts"] });
    },
    onError: () => toast.error("Could not mark alerts as read"),
  });

  const filtered = useMemo(() => {
    return items.filter((a) => {
      if (tab === "all") return true;
      if (tab === "unread") return !a.read;
      return a.type === tab;
    });
  }, [items, tab]);

  const unreadCount = items.filter((a) => !a.read).length;

  function recipientLabel(a: AlertItem) {
    if (a.recipientType === "all-drivers") return "All drivers";
    if (a.recipientType === "admin") return "Admin";
    if (a.recipientType === "event-drivers") {
      const ev = events.find((e) => e.id === a.recipientEventId);
      return ev ? `Event: ${ev.title}` : "Event drivers";
    }
    return "You";
  }

  if (isLoading && items.length === 0) return <PageLoading label="Loading alerts…" />;
  if (error) return <ErrorState message="Could not load alerts" onRetry={() => refetch()} />;

  return (
    <div>
      <PageHeader
        title="Alerts"
        description={`${unreadCount} unread · ${items.length} total`}
        actions={
          <>
            {isAdmin && (
              <Button size="md" onClick={() => setComposerOpen(true)}>
                <Plus className="size-4" /> New alert
              </Button>
            )}
            <Button
              variant="outline"
              size="md"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending || unreadCount === 0}
            >
              <CheckCheck className="size-4" /> Mark all read
            </Button>
          </>
        }
      />

      <div className="mb-5 flex gap-1.5 rounded-2xl border border-border bg-surface p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-all",
              tab === t.key
                ? "bg-foreground text-white shadow-sm"
                : "text-muted hover:text-foreground",
            )}
          >
            {t.label}
            {t.key === "unread" && unreadCount > 0 && (
              <span className="ml-1.5 inline-flex size-5 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-foreground">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-border-soft text-muted">
            <Bell className="size-6" />
          </span>
          <h3 className="mt-4 text-base font-semibold">You&apos;re all caught up</h3>
          <p className="mt-1 max-w-sm text-sm text-muted">
            {isAdmin
              ? "No alerts in this view. Send a new one to your drivers."
              : "No alerts here. We'll notify you when something needs attention."}
          </p>
          {isAdmin && (
            <Button className="mt-4" size="md" onClick={() => setComposerOpen(true)}>
              <Plus className="size-4" /> New alert
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((a, i) => {
            const meta = typeMeta[a.type];
            const Icon = meta.icon;
            const canDelete = isAdmin || a.recipientType === "user";
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.03 }}
              >
                <Card
                  className={cn(
                    "group flex items-start gap-4 p-5 transition-all hover:shadow-md",
                    !a.read && "ring-1 ring-brand/15",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-xl",
                      meta.bg,
                    )}
                  >
                    <Icon className="size-5" strokeWidth={2.25} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3
                            className={cn(
                              "truncate text-sm",
                              a.read
                                ? "font-medium text-foreground"
                                : "font-semibold text-foreground",
                            )}
                          >
                            {a.title}
                          </h3>
                          <Badge tone={meta.tone}>{meta.label}</Badge>
                          {isAdmin && (
                            <Badge tone="neutral">→ {recipientLabel(a)}</Badge>
                          )}
                          {!a.read && <span className="size-2 shrink-0 rounded-full bg-brand" />}
                        </div>
                        <p className="mt-1 text-sm text-muted">{a.message}</p>
                      </div>
                      <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => toggleRead.mutate({ id: a.id, read: !a.read })}
                          disabled={toggleRead.isPending}
                          className="rounded-lg p-1.5 text-muted hover:bg-border-soft hover:text-foreground disabled:opacity-50"
                          aria-label={a.read ? "Mark unread" : "Mark read"}
                        >
                          <CheckCheck className="size-4" />
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => {
                              deleteAlert.mutate(a.id, {
                                onSuccess: () => toast.success("Alert deleted"),
                                onError: (err) =>
                                  toast.error(
                                    err instanceof Error
                                      ? err.message
                                      : "Could not delete alert",
                                  ),
                              });
                            }}
                            disabled={deleteAlert.isPending}
                            className="rounded-lg p-1.5 text-muted hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                            aria-label="Delete"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <AlertComposer open={composerOpen} onClose={() => setComposerOpen(false)} />
    </div>
  );
}
