"use client";

import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Play,
  Star,
  X,
} from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useDriverShifts } from "@/lib/queries";
import type { Driver, DriverStatus, ShiftEntry, ShiftLogGroup } from "@/lib/types";
import { cn } from "@/lib/cn";

const statusTone: Record<DriverStatus, "success" | "info" | "muted" | "warning"> = {
  "on-duty": "success",
  "off-duty": "muted",
  available: "info",
  pending: "warning",
};

const statusLabel: Record<DriverStatus, string> = {
  "on-duty": "On duty",
  "off-duty": "Off duty",
  available: "Available",
  pending: "Pending",
};

type Tab = "info" | "shifts";

export function DriverDetailModal({
  driver,
  onClose,
}: {
  driver: Driver;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("info");

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
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-surface shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-border p-5">
          <div className="flex items-center gap-3">
            <Avatar name={driver.name} color={driver.avatarColor} />
            <div>
              <h2 className="text-lg font-semibold">{driver.name}</h2>
              <div className="mt-0.5 flex items-center gap-2">
                <Badge tone={statusTone[driver.status]} dot>
                  {statusLabel[driver.status]}
                </Badge>
                {driver.city && (
                  <span className="text-xs text-muted">{driver.city}</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-border-soft"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex gap-1 border-b border-border-soft bg-background px-5">
          <TabButton active={tab === "info"} onClick={() => setTab("info")}>
            Info
          </TabButton>
          <TabButton active={tab === "shifts"} onClick={() => setTab("shifts")}>
            Shift logs
          </TabButton>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === "info" ? <InfoTab driver={driver} /> : <ShiftsTab driverId={driver.id} />}
        </div>
      </motion.div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative px-4 py-3 text-sm font-medium transition-colors",
        active ? "text-foreground" : "text-muted hover:text-foreground",
      )}
    >
      {children}
      {active && (
        <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-foreground" />
      )}
    </button>
  );
}

function InfoTab({ driver }: { driver: Driver }) {
  const hasLocation =
    driver.location && (driver.location.lat !== 0 || driver.location.lng !== 0);
  return (
    <div className="space-y-5">
      <Section title="Contact">
        <DetailRow icon={<Mail className="size-4" />} label="Email" value={driver.email} />
        <DetailRow
          icon={<Phone className="size-4" />}
          label="Phone"
          value={driver.phone || "—"}
        />
        <DetailRow
          icon={<MapPin className="size-4" />}
          label="City"
          value={driver.city || "—"}
        />
      </Section>

      <Section title="License">
        <DetailRow
          icon={<FileText className="size-4" />}
          label="Class"
          value={driver.licenseClass || "—"}
        />
        <DetailRow
          icon={<Calendar className="size-4" />}
          label="Expiry"
          value={driver.licenseExpiry || "—"}
        />
        <DetailRow
          icon={<Clock className="size-4" />}
          label="Experience"
          value={
            driver.experienceYears
              ? `${driver.experienceYears} year${driver.experienceYears === 1 ? "" : "s"}`
              : "—"
          }
        />
      </Section>

      <Section title="Performance">
        <DetailRow
          icon={<Star className="size-4" />}
          label="Rating"
          value={driver.rating ? `${driver.rating.toFixed(1)} / 5` : "—"}
        />
        <DetailRow
          icon={<Clock className="size-4" />}
          label="Shifts completed"
          value={String(driver.shiftsCompleted ?? 0)}
        />
        <DetailRow
          icon={<Clock className="size-4" />}
          label="Hours this week"
          value={`${driver.hoursThisWeek ?? 0}h`}
        />
      </Section>

      {hasLocation && (
        <Section title="Last known location">
          <DetailRow
            icon={<MapPin className="size-4" />}
            label="Coordinates"
            value={`${driver.location.lat.toFixed(5)}, ${driver.location.lng.toFixed(5)}`}
          />
          {driver.location.updatedAt && (
            <DetailRow
              icon={<Clock className="size-4" />}
              label="Updated"
              value={new Date(driver.location.updatedAt).toLocaleString()}
            />
          )}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
        {title}
      </h3>
      <Card className="divide-y divide-border-soft overflow-hidden">{children}</Card>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
      <span className="inline-flex items-center gap-2 text-xs text-muted">
        {icon}
        {label}
      </span>
      <span className="truncate text-right text-sm font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}

function ShiftsTab({ driverId }: { driverId: string }) {
  const { data: groups = [], isLoading, error } = useDriverShifts(driverId);

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-muted">
        <Loader2 className="mr-2 size-4 animate-spin" /> Loading shifts…
      </div>
    );
  }
  if (error) {
    return (
      <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        Could not load shifts.
      </p>
    );
  }
  if (groups.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center px-6 py-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-border-soft text-muted">
          <Clock className="size-5" />
        </span>
        <h3 className="mt-3 text-sm font-semibold">No shifts logged yet</h3>
        <p className="mt-1 max-w-sm text-xs text-muted">
          This driver hasn&apos;t started any shifts yet.
        </p>
      </Card>
    );
  }

  const grandTotalMs = groups.reduce((sum, g) => sum + g.totalMs, 0);
  const totalShifts = groups.reduce((sum, g) => sum + g.shifts.length, 0);

  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-2">
        <SummaryTile label="Total time" value={formatDuration(grandTotalMs)} />
        <SummaryTile label="Shifts" value={String(totalShifts)} />
        <SummaryTile label="Events" value={String(groups.length)} />
      </div>
      <div className="space-y-3">
        {groups.map((group) => (
          <EventShiftCard key={group.eventId} group={group} />
        ))}
      </div>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-soft bg-surface p-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold tracking-tight text-foreground">{value}</p>
    </div>
  );
}

function EventShiftCard({ group }: { group: ShiftLogGroup }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border-soft bg-background px-4 py-3">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-semibold">{group.eventTitle}</h4>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
            {group.eventStartDate && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="size-3" />
                {formatEventDates(group.eventStartDate, group.eventEndDate)}
              </span>
            )}
            {group.eventLocation && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" />
                {group.eventLocation}
              </span>
            )}
          </div>
        </div>
        <span className="shrink-0 text-sm font-semibold tracking-tight text-foreground">
          {formatDuration(group.totalMs)}
        </span>
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
    <li className="flex items-center justify-between gap-3 px-4 py-2.5">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-xl",
            shift.ongoing
              ? "bg-success/15 text-success"
              : "bg-border-soft text-muted",
          )}
        >
          {shift.ongoing ? <Play className="size-3.5" /> : <Clock className="size-3.5" />}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            {startedAt ? formatDateTime(startedAt) : "—"}
            {" → "}
            {endedAt ? formatTime(endedAt) : <span className="text-success">ongoing</span>}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-foreground">
          {formatDuration(shift.durationMs)}
        </p>
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

function formatEventDates(startDate: string | null, endDate: string | null) {
  if (!startDate) return "";
  if (!endDate || endDate === startDate) return startDate;
  return `${startDate} – ${endDate}`;
}
