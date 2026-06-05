"use client";

import { motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateAlert, useEvents } from "@/lib/queries";
import type { AlertRecipientType } from "@/lib/types";
import { cn } from "@/lib/cn";

type Props = {
  open: boolean;
  onClose: () => void;
};

const types = [
  { key: "info", label: "Info", tone: "bg-info-soft text-blue-700" },
  { key: "shift", label: "Shift", tone: "bg-brand-soft text-brand-strong" },
  { key: "emergency", label: "Emergency", tone: "bg-danger-soft text-rose-700" },
  { key: "system", label: "System", tone: "bg-border-soft text-foreground" },
] as const;

export function AlertComposer({ open, onClose }: Props) {
  const create = useCreateAlert();
  const { data: events = [] } = useEvents();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<(typeof types)[number]["key"]>("info");
  const [recipientType, setRecipientType] = useState<AlertRecipientType>("all-drivers");
  const [recipientEventId, setRecipientEventId] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "Title is required";
    if (!message.trim()) next.message = "Message is required";
    if (recipientType === "event-drivers" && !recipientEventId) {
      next.event = "Pick an event to target";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    try {
      await create.mutateAsync({
        title,
        message,
        type,
        recipientType,
        recipientEventId:
          recipientType === "event-drivers" ? recipientEventId : null,
      });
      toast.success(
        recipientType === "event-drivers"
          ? "Alert sent to event drivers"
          : "Alert sent to all drivers",
      );
      setTitle("");
      setMessage("");
      setType("info");
      setRecipientType("all-drivers");
      setRecipientEventId("");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send alert");
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
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-surface shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h2 className="text-lg font-semibold">New alert</h2>
            <p className="text-xs text-muted">
              Send a notification to all drivers or just those in a specific event.
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
            <Field label="Title" error={errors.title}>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Weather advisory"
                autoFocus
              />
            </Field>

            <Field label="Message" error={errors.message}>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Write your message…"
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm placeholder:text-muted-soft focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
              />
            </Field>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Type</label>
              <div className="grid grid-cols-4 gap-2">
                {types.map((t) => (
                  <button
                    type="button"
                    key={t.key}
                    onClick={() => setType(t.key)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-xs font-medium transition-all",
                      type === t.key
                        ? "border-foreground bg-foreground text-white"
                        : `border-border ${t.tone} hover:opacity-90`,
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Send to
              </label>
              <div className="space-y-2">
                <label
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
                    recipientType === "all-drivers"
                      ? "border-brand bg-brand-soft/40"
                      : "border-border hover:bg-border-soft/40",
                  )}
                >
                  <input
                    type="radio"
                    name="audience"
                    checked={recipientType === "all-drivers"}
                    onChange={() => setRecipientType("all-drivers")}
                    className="mt-1 accent-brand"
                  />
                  <div>
                    <p className="text-sm font-medium">All drivers</p>
                    <p className="text-xs text-muted">
                      Every driver in your fleet will receive this alert.
                    </p>
                  </div>
                </label>
                <label
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
                    recipientType === "event-drivers"
                      ? "border-brand bg-brand-soft/40"
                      : "border-border hover:bg-border-soft/40",
                  )}
                >
                  <input
                    type="radio"
                    name="audience"
                    checked={recipientType === "event-drivers"}
                    onChange={() => setRecipientType("event-drivers")}
                    className="mt-1 accent-brand"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Drivers in a specific event</p>
                    <p className="text-xs text-muted">
                      Only drivers who&apos;ve accepted this event will be notified.
                    </p>
                    {recipientType === "event-drivers" && (
                      <select
                        value={recipientEventId}
                        onChange={(e) => setRecipientEventId(e.target.value)}
                        className="mt-2 h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
                      >
                        <option value="">Pick an event…</option>
                        {events
                          .filter((e) => e.status !== "completed")
                          .map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.title} ({e.startDate})
                            </option>
                          ))}
                      </select>
                    )}
                    {errors.event && (
                      <p className="mt-1 text-xs text-rose-600">{errors.event}</p>
                    )}
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 flex gap-2 border-t border-border-soft bg-surface p-5">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={create.isPending}>
              {create.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Sending…
                </>
              ) : (
                "Send alert"
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
