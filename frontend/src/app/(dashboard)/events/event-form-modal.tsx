"use client";

import { motion } from "framer-motion";
import { Check, Loader2, Search, Users, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateEvent, useDrivers, useUpdateEvent, type EventInput } from "@/lib/queries";
import type { EventItem, EventStatus } from "@/lib/types";
import { cn } from "@/lib/cn";

type Props = {
  open: boolean;
  onClose: () => void;
  event: EventItem | null;
};

const emptyForm: EventInput = {
  title: "",
  description: "",
  startDate: "",
  endDate: "",
  location: "",
  status: "upcoming",
  invitedDriverIds: [],
  driverLimit: null,
};

export function EventFormModal({ open, onClose, event }: Props) {
  const isEditing = Boolean(event);
  const create = useCreateEvent();
  const update = useUpdateEvent();
  const { data: drivers = [] } = useDrivers();

  const [form, setForm] = useState<EventInput>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof EventInput, string>>>({});
  const [driverQuery, setDriverQuery] = useState("");

  useEffect(() => {
    if (event) {
      setForm({
        title: event.title,
        description: event.description ?? "",
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
        status: event.status,
        invitedDriverIds: event.invitations.map((i) => i.driverId),
        driverLimit: event.driverLimit ?? null,
      });
    } else {
      setForm(emptyForm);
    }
    setErrors({});
    setDriverQuery("");
  }, [event, open]);

  const availableDrivers = useMemo(
    () =>
      drivers
        .filter((d) => d.approved)
        .filter((d) =>
          driverQuery
            ? d.name.toLowerCase().includes(driverQuery.toLowerCase()) ||
              d.email.toLowerCase().includes(driverQuery.toLowerCase())
            : true,
        ),
    [drivers, driverQuery],
  );

  const existingInvitations = useMemo(() => {
    if (!event) return new Map<string, string>();
    return new Map(event.invitations.map((i) => [i.driverId, i.status]));
  }, [event]);

  if (!open) return null;

  function validate() {
    const next: typeof errors = {};
    if (!form.title.trim()) next.title = "Title is required";
    if (!form.startDate) next.startDate = "Start date is required";
    if (!form.endDate) next.endDate = "End date is required";
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      next.endDate = "End date must be on or after start date";
    }
    if (!form.location.trim()) next.location = "Location is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function toggleDriver(id: string) {
    // Drivers who already have a non-invited status are locked (accepted/declined).
    if (existingInvitations.has(id) && existingInvitations.get(id) !== "invited") return;
    setForm((f) => ({
      ...f,
      invitedDriverIds: f.invitedDriverIds.includes(id)
        ? f.invitedDriverIds.filter((x) => x !== id)
        : [...f.invitedDriverIds, id],
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    try {
      if (isEditing && event) {
        // Only send NEW driver IDs when editing — existing ones are kept on the backend.
        const existingIds = new Set(event.invitations.map((i) => i.driverId));
        const newInvites = form.invitedDriverIds.filter((id) => !existingIds.has(id));
        await update.mutateAsync({
          id: event.id,
          input: { ...form, invitedDriverIds: newInvites },
        });
        toast.success(
          newInvites.length > 0
            ? `Event updated · ${newInvites.length} new invitation${newInvites.length === 1 ? "" : "s"} sent`
            : "Event updated",
        );
      } else {
        await create.mutateAsync(form);
        toast.success(
          form.invitedDriverIds.length > 0
            ? `Event created · ${form.invitedDriverIds.length} driver${form.invitedDriverIds.length === 1 ? "" : "s"} invited`
            : "Event created",
        );
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save event");
    }
  }

  const submitting = create.isPending || update.isPending;

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
        className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-surface shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h2 className="text-lg font-semibold">{isEditing ? "Edit event" : "New event"}</h2>
            <p className="text-xs text-muted">
              {isEditing
                ? "Update details and invite more drivers."
                : "Fill in the event details and pick drivers to invite."}
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

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="space-y-4 p-5">
            <FormField label="Title" required error={errors.title}>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Friday night dispatch"
                autoFocus
              />
            </FormField>

            <FormField label="Description">
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What is this event about?"
                rows={3}
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm placeholder:text-muted-soft focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
              />
            </FormField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Start date" required error={errors.startDate}>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </FormField>
              <FormField label="End date" required error={errors.endDate}>
                <Input
                  type="date"
                  value={form.endDate}
                  min={form.startDate || undefined}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </FormField>
            </div>

            <FormField label="Location" required error={errors.location}>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. Downtown depot"
              />
            </FormField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Status">
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as EventStatus })
                  }
                  className="h-11 w-full rounded-xl border border-border bg-surface px-4 text-sm focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                </select>
              </FormField>
              <FormField label="Driver limit">
                <Input
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  placeholder="Unlimited"
                  value={form.driverLimit ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setForm({
                      ...form,
                      driverLimit: raw === "" ? null : Math.max(1, Number(raw)),
                    });
                  }}
                />
                <p className="mt-1 text-[11px] text-muted">
                  Leave blank for unlimited. Once {form.driverLimit ?? "the limit"} accept,
                  remaining invitations close automatically.
                </p>
              </FormField>
            </div>

            {/* Driver picker */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Invite drivers</label>
                <span className="text-xs text-muted">
                  {form.invitedDriverIds.length} selected
                  {form.driverLimit != null && (
                    <span className="ml-1">· {form.driverLimit} spot{form.driverLimit === 1 ? "" : "s"}</span>
                  )}
                </span>
              </div>
              <div className="mb-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    const approvedIds = drivers.filter((d) => d.approved).map((d) => d.id);
                    setForm((f) => ({
                      ...f,
                      invitedDriverIds: Array.from(
                        new Set([...f.invitedDriverIds, ...approvedIds]),
                      ),
                    }));
                    toast.success(
                      `Invited ${approvedIds.length} approved driver${approvedIds.length === 1 ? "" : "s"} — first to accept get the spots.`,
                    );
                  }}
                  disabled={drivers.filter((d) => d.approved).length === 0}
                >
                  <Users className="size-4" /> Invite all approved drivers
                </Button>
              </div>
              <div className="relative mb-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-soft" />
                <input
                  type="search"
                  placeholder="Search drivers by name or email…"
                  value={driverQuery}
                  onChange={(e) => setDriverQuery(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-soft focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
                />
              </div>

              <div className="max-h-56 overflow-y-auto rounded-xl border border-border-soft">
                {availableDrivers.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted">No matching drivers.</p>
                ) : (
                  availableDrivers.map((d) => {
                    const existingStatus = existingInvitations.get(d.id);
                    const locked =
                      existingStatus === "accepted" ||
                      existingStatus === "declined" ||
                      existingStatus === "closed";
                    const checked = form.invitedDriverIds.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        disabled={locked}
                        onClick={() => toggleDriver(d.id)}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 border-b border-border-soft px-3 py-2 text-left last:border-b-0 transition-colors",
                          checked && !locked && "bg-brand-soft/40",
                          locked && "cursor-not-allowed opacity-70",
                          !locked && "hover:bg-border-soft/60",
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar name={d.name} color={d.avatarColor} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{d.name}</p>
                            <p className="truncate text-xs text-muted">{d.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {existingStatus && (
                            <Badge
                              tone={
                                existingStatus === "accepted"
                                  ? "success"
                                  : existingStatus === "declined"
                                    ? "danger"
                                    : existingStatus === "closed"
                                      ? "muted"
                                      : "info"
                              }
                            >
                              {existingStatus}
                            </Badge>
                          )}
                          <span
                            className={cn(
                              "flex size-5 items-center justify-center rounded-md border",
                              checked
                                ? "border-brand bg-brand text-foreground"
                                : "border-border bg-surface",
                            )}
                          >
                            {checked && <Check className="size-3" strokeWidth={3} />}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
              {isEditing && (
                <p className="mt-2 text-[11px] text-muted">
                  Drivers who have already responded can&apos;t be removed here. Use
                  &quot;unassign&quot; from the event detail view if needed.
                </p>
              )}
            </div>
          </div>

          <div className="sticky bottom-0 flex gap-2 border-t border-border-soft bg-surface p-5">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Saving…
                </>
              ) : isEditing ? (
                "Save changes"
              ) : (
                "Create event"
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function FormField({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
