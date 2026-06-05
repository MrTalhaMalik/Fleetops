"use client";

import { motion } from "framer-motion";
import { Calendar, Loader2, MapPin, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useEvents, useInviteDriver } from "@/lib/queries";
import type { Driver } from "@/lib/types";
import { cn } from "@/lib/cn";

type Props = {
  open: boolean;
  onClose: () => void;
  driver: Driver | null;
};

export function AssignEventModal({ open, onClose, driver }: Props) {
  const { data: events = [] } = useEvents();
  const invite = useInviteDriver();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!open || !driver) return null;

  const eligible = events.filter((e) => e.status !== "completed");
  const alreadyInvited = (eventId: string) =>
    events
      .find((e) => e.id === eventId)
      ?.invitations.some((inv) => inv.driverId === driver.id) ?? false;

  async function handleAssign() {
    if (!selectedId || !driver) return;
    try {
      await invite.mutateAsync({ eventId: selectedId, driverId: driver.id });
      toast.success(`Invitation sent to ${driver.name}`);
      setSelectedId(null);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send invitation");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-surface shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h2 className="text-lg font-semibold">Assign event</h2>
            <p className="text-xs text-muted">
              Send {driver.name} an invitation to an upcoming event.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-border-soft"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-5">
          {eligible.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
              No upcoming events. Create one first.
            </div>
          ) : (
            eligible.map((e) => {
              const invited = alreadyInvited(e.id);
              const selected = selectedId === e.id;
              return (
                <button
                  key={e.id}
                  type="button"
                  disabled={invited}
                  onClick={() => setSelectedId(e.id)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                    invited
                      ? "cursor-not-allowed border-border-soft bg-border-soft/30 opacity-70"
                      : selected
                        ? "border-brand bg-brand-soft/40"
                        : "border-border-soft hover:bg-border-soft/40",
                  )}
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
                    <p className="truncate text-sm font-semibold">{e.title}</p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted">
                      <Calendar className="size-3" />
                      {e.endDate && e.endDate !== e.startDate ? `${e.startDate} – ${e.endDate}` : e.startDate}
                      <span className="mx-1">·</span>
                      <MapPin className="size-3" />
                      {e.location}
                    </p>
                    {invited && (
                      <p className="mt-1 text-[11px] font-medium text-amber-700">
                        Driver is already invited to this event.
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="border-t border-border-soft bg-surface p-5">
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={!selectedId || invite.isPending}
              onClick={handleAssign}
            >
              {invite.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Sending…
                </>
              ) : (
                "Send invitation"
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
