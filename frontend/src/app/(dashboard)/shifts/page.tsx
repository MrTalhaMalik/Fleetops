"use client";

import { motion } from "framer-motion";
import { Calendar, Clock, MapPin, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { PageLoading, ErrorState } from "@/components/ui/loading";
import { useMyShifts } from "@/lib/queries";
import type { ShiftEntry, ShiftLogGroup } from "@/lib/types";

export default function ShiftsPage() {
  const { data: groups = [], isLoading, error, refetch } = useMyShifts();

  if (isLoading && groups.length === 0) return <PageLoading label="Loading shifts…" />;
  if (error) return <ErrorState message="Could not load shifts" onRetry={() => refetch()} />;

  const grandTotalMs = groups.reduce((sum, g) => sum + g.totalMs, 0);
  const totalShifts = groups.reduce((sum, g) => sum + g.shifts.length, 0);

  return (
    <div>
      <PageHeader
        title="Shifts"
        description="Every shift you've logged, grouped by event."
      />

      {groups.length === 0 ? (
        <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-border-soft text-muted">
            <Clock className="size-6" />
          </span>
          <h3 className="mt-4 text-base font-semibold">No shifts logged yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Once you start a shift from your Dashboard, it&apos;ll be logged here.
          </p>
        </Card>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SummaryTile label="Total time" value={formatDuration(grandTotalMs)} />
            <SummaryTile label="Shifts" value={String(totalShifts)} />
            <SummaryTile label="Events" value={String(groups.length)} />
          </div>

          <div className="space-y-4">
            {groups.map((group, i) => (
              <motion.div
                key={group.eventId}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <EventShiftCard group={group} />
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border-soft bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
    </div>
  );
}

function EventShiftCard({ group }: { group: ShiftLogGroup }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-border-soft bg-background px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">{group.eventTitle}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            {group.eventStartDate && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="size-3.5" />
                {formatEventDates(group.eventStartDate, group.eventEndDate)}
              </span>
            )}
            {group.eventLocation && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" />
                {group.eventLocation}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 sm:flex-col sm:items-end">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            Total
          </span>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            {formatDuration(group.totalMs)}
          </span>
        </div>
      </div>

      <ul className="divide-y divide-border-soft">
        {group.shifts.map((shift) => (
          <ShiftRow key={shift.id} shift={shift} />
        ))}
      </ul>
    </Card>
  );
}

function ShiftRow({ shift }: { shift: ShiftEntry }) {
  const startedAt = shift.startedAt ? new Date(shift.startedAt) : null;
  const endedAt = shift.endedAt ? new Date(shift.endedAt) : null;

  return (
    <li className="flex items-center justify-between gap-3 px-5 py-3">
      <div className="flex items-center gap-3">
        <span
          className={
            shift.ongoing
              ? "flex size-9 items-center justify-center rounded-xl bg-success/15 text-success"
              : "flex size-9 items-center justify-center rounded-xl bg-border-soft text-muted"
          }
        >
          {shift.ongoing ? <Play className="size-4" /> : <Clock className="size-4" />}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            {startedAt ? formatDateTime(startedAt) : "—"}
            {" → "}
            {endedAt ? formatTime(endedAt) : <span className="text-success">ongoing</span>}
          </p>
          {startedAt && endedAt && !sameDay(startedAt, endedAt) && (
            <p className="text-xs text-muted">ended {formatDateTime(endedAt)}</p>
          )}
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-foreground">{formatDuration(shift.durationMs)}</p>
        {shift.ongoing && (
          <Badge tone="success" dot>
            Active
          </Badge>
        )}
      </div>
    </li>
  );
}

function formatDuration(ms: number) {
  if (!ms || ms < 0) return "0m";
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function formatDateTime(d: Date) {
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatEventDates(startDate: string | null, endDate: string | null) {
  if (!startDate) return "";
  if (!endDate || endDate === startDate) return startDate;
  return `${startDate} – ${endDate}`;
}
