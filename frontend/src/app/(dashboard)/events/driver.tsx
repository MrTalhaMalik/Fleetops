"use client";

import { motion } from "framer-motion";
import { Calendar, Check, MapPin, X } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { PageLoading } from "@/components/ui/loading";
import { useEvents, useMyDriver, useRespondToInvite } from "@/lib/queries";
import type { EventItem, InvitationStatus } from "@/lib/types";
import { EventChat } from "./event-chat";

export function DriverEvents() {
  const { data: me, isLoading: meLoading } = useMyDriver();
  const { data: events = [], isLoading: eventsLoading } = useEvents();
  const respond = useRespondToInvite();

  const myInvitations = useMemo(() => {
    if (!me) return [];
    return events
      .map((e) => {
        const inv = e.invitations.find((i) => i.driverId === me.id);
        return inv ? { event: e, status: inv.status } : null;
      })
      .filter((x): x is { event: EventItem; status: InvitationStatus } => Boolean(x));
  }, [events, me]);

  const invited = myInvitations.filter((i) => i.status === "invited");
  const accepted = myInvitations.filter((i) => i.status === "accepted");
  const past = myInvitations.filter(
    (i) =>
      i.status === "declined" ||
      i.status === "closed" ||
      i.event.status === "completed",
  );

  if ((meLoading || eventsLoading) && !me) return <PageLoading label="Loading events…" />;

  function handleRespond(eventId: string, accept: boolean, title: string) {
    respond.mutate(
      { eventId, accept },
      {
        onSuccess: () =>
          toast.success(
            accept ? `Accepted "${title}"` : `Declined "${title}"`,
          ),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Could not respond"),
      },
    );
  }

  return (
    <div>
      <PageHeader
        title="Events"
        description={
          invited.length > 0
            ? `${invited.length} invitation${invited.length === 1 ? "" : "s"} awaiting your response`
            : accepted.length > 0
              ? "Your current event is below."
              : "No invitations yet — check back later."
        }
      />

      {/* Pending invitations */}
      {invited.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
            Pending invitations
          </h2>
          <div className="space-y-3">
            {invited.map(({ event }, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className="overflow-hidden">
                  <div className="bg-gradient-to-br from-brand-soft to-amber-50 px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <Badge tone="brand" dot>
                          Invitation
                        </Badge>
                        <h3 className="mt-2 text-base font-semibold">{event.title}</h3>
                        <p className="mt-1 text-sm text-muted">
                          {event.description || "No description provided."}
                        </p>
                      </div>
                      <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-surface text-brand-strong shadow-sm">
                        <span className="text-[10px] font-semibold uppercase">
                          {new Date(event.startDate).toLocaleDateString("en-US", { month: "short" })}
                        </span>
                        <span className="text-lg font-bold leading-none">
                          {new Date(event.startDate).getDate()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-2">
                    <InfoRow icon={<Calendar className="size-4" />} label="When">
                      {formatEventDates(event.startDate, event.endDate)}
                    </InfoRow>
                    <InfoRow icon={<MapPin className="size-4" />} label="Where">
                      {event.location}
                    </InfoRow>
                  </div>
                  {event.driverLimit != null && (() => {
                    const taken = event.invitations.filter((i) => i.status === "accepted").length;
                    const left = Math.max(0, event.driverLimit - taken);
                    return (
                      <div className="px-5 pb-2 text-xs font-medium text-amber-700">
                        First-come-first-serve · {left} of {event.driverLimit} spot
                        {event.driverLimit === 1 ? "" : "s"} left
                      </div>
                    );
                  })()}
                  <div className="flex gap-2 border-t border-border-soft p-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleRespond(event.id, false, event.title)}
                      disabled={respond.isPending}
                    >
                      <X className="size-4" /> Decline
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => handleRespond(event.id, true, event.title)}
                      disabled={respond.isPending || accepted.length > 0}
                      title={
                        accepted.length > 0
                          ? "You're already assigned to an event. An admin must unassign you first."
                          : "Accept this invitation"
                      }
                    >
                      <Check className="size-4" /> Accept
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
          {accepted.length > 0 && (
            <p className="mt-3 text-xs text-muted">
              You&apos;re currently assigned to an event — an admin must unassign you before you can
              accept another.
            </p>
          )}
        </section>
      )}

      {/* Currently assigned event */}
      {accepted.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
            Current event
          </h2>
          {accepted.map(({ event }) => (
            <Card key={event.id} className="overflow-hidden">
              <div className="bg-emerald-50 px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Badge tone="success" dot>
                      Accepted
                    </Badge>
                    <h3 className="mt-2 text-base font-semibold">{event.title}</h3>
                    <p className="mt-1 text-sm text-muted">
                      {event.description || "No description provided."}
                    </p>
                  </div>
                  <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-surface text-emerald-700 shadow-sm">
                    <span className="text-[10px] font-semibold uppercase">
                      {new Date(event.startDate).toLocaleDateString("en-US", { month: "short" })}
                    </span>
                    <span className="text-lg font-bold leading-none">
                      {new Date(event.startDate).getDate()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-2">
                <InfoRow icon={<Calendar className="size-4" />} label="When">
                  {formatEventDates(event.startDate, event.endDate)}
                </InfoRow>
                <InfoRow icon={<MapPin className="size-4" />} label="Where">
                  {event.location}
                </InfoRow>
              </div>
              <div className="border-t border-border-soft p-4 text-xs text-muted">
                Open your Dashboard to start or stop a shift. You can log as many shifts as you
                need — see <span className="font-medium text-foreground">Shifts</span> for the log.
              </div>
              <div className="border-t border-border-soft p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Group chat</h4>
                  <span className="text-xs text-muted">You · admin · invited drivers</span>
                </div>
                <EventChat eventId={event.id} />
              </div>
            </Card>
          ))}
        </section>
      )}

      {/* Past / declined */}
      {past.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
            History
          </h2>
          <div className="space-y-2">
            {past.map(({ event, status }) => (
              <div
                key={event.id}
                className="flex items-center gap-3 rounded-xl border border-border-soft bg-surface p-3"
              >
                <div className="flex size-10 flex-col items-center justify-center rounded-lg bg-border-soft text-xs">
                  <span className="text-[10px] uppercase text-muted">
                    {new Date(event.startDate).toLocaleDateString("en-US", { month: "short" })}
                  </span>
                  <span className="font-semibold">{new Date(event.startDate).getDate()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{event.title}</p>
                  <p className="truncate text-xs text-muted">
                    {formatEventDates(event.startDate, event.endDate)} · {event.location}
                  </p>
                </div>
                <Badge
                  tone={
                    status === "declined"
                      ? "danger"
                      : status === "closed"
                        ? "info"
                        : "muted"
                  }
                >
                  {status === "declined"
                    ? "Declined"
                    : status === "closed"
                      ? "Closed"
                      : "Completed"}
                </Badge>
              </div>
            ))}
          </div>
        </section>
      )}

      {myInvitations.length === 0 && (
        <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-border-soft text-muted">
            <Calendar className="size-6" />
          </span>
          <h3 className="mt-4 text-base font-semibold">No events yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted">
            When an admin invites you to an event, it&apos;ll show up here.
          </p>
        </Card>
      )}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border-soft p-3">
      <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted">
        {icon} {label}
      </span>
      <p className="mt-1 text-sm font-medium text-foreground">{children}</p>
    </div>
  );
}

function formatEventDates(startDate: string, endDate: string) {
  if (!startDate) return "";
  if (!endDate || endDate === startDate) return startDate;
  return `${startDate} – ${endDate}`;
}
