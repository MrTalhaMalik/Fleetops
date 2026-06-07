"use client";

import { motion } from "framer-motion";
import {
  Calendar,
  Car as CarIcon,
  CheckCircle2,
  ChevronRight,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { PageLoading, ErrorState } from "@/components/ui/loading";
import {
  useCars,
  useDeleteEvent,
  useDrivers,
  useEvents,
  useUnassignDriver,
  useUpdateCar,
} from "@/lib/queries";
import type { Car, EventItem, EventStatus, Invitation } from "@/lib/types";
import { cn } from "@/lib/cn";
import { EventFormModal } from "./event-form-modal";
import { EventChat } from "./event-chat";

const filters = [
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "ongoing", label: "Ongoing" },
  { key: "completed", label: "Past" },
] as const;

type FilterKey = (typeof filters)[number]["key"];

const statusTone: Record<EventStatus, "info" | "brand" | "muted"> = {
  upcoming: "info",
  ongoing: "brand",
  completed: "muted",
};

export function AdminEvents() {
  const { data: events = [], isLoading, error, refetch } = useEvents();
  const { data: drivers = [] } = useDrivers();
  const { data: cars = [] } = useCars();
  const deleteEvent = useDeleteEvent();
  const unassign = useUnassignDriver();
  const updateCar = useUpdateCar();

  const driverById = useMemo(() => {
    const m = new Map(drivers.map((d) => [d.id, d]));
    return m;
  }, [drivers]);

  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<EventItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<EventItem | null>(null);

  const list = useMemo(() => {
    return events
      .filter((e) => (filter === "all" ? true : e.status === filter))
      .filter((e) =>
        query
          ? e.title.toLowerCase().includes(query.toLowerCase()) ||
            e.location.toLowerCase().includes(query.toLowerCase())
          : true,
      );
  }, [events, filter, query]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(ev: EventItem) {
    setEditing(ev);
    setFormOpen(true);
    setSelected(null);
  }
  function handleDelete(ev: EventItem) {
    deleteEvent.mutate(ev.id, {
      onSuccess: () => {
        toast.success("Event deleted");
        setConfirmDelete(null);
        setSelected(null);
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : "Could not delete event"),
    });
  }
  function handleUnassign(eventId: string, driverId: string, driverName: string) {
    unassign.mutate(
      { eventId, driverId },
      {
        onSuccess: () => toast.success(`${driverName} unassigned`),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Could not unassign driver"),
      },
    );
  }

  function handleAssignCar(car: Car, ev: EventItem, driverId: string, driverName: string) {
    updateCar.mutate(
      {
        id: car.id,
        input: {
          assignedDriverId: driverId,
          assignedEventId: ev.id,
          assignmentStart: ev.startDate,
          assignmentEnd: ev.endDate,
        },
      },
      {
        onSuccess: () => toast.success(`${car.name} assigned to ${driverName}`),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Could not assign car"),
      },
    );
  }

  function handleUnassignCar(car: Car) {
    updateCar.mutate(
      { id: car.id, input: { assignedDriverId: null } },
      {
        onSuccess: () => toast.success(`${car.name} unassigned`),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Could not unassign car"),
      },
    );
  }

  function countByStatus(invitations: Invitation[], status: Invitation["status"]) {
    return invitations.filter((i) => i.status === status).length;
  }

  return (
    <div>
      <PageHeader
        title="Events"
        description={
          isLoading
            ? "Loading events…"
            : `${events.length} events · ${events.filter((e) => e.status !== "completed").length} active`
        }
        actions={
          <Button size="md" onClick={openCreate}>
            <Plus className="size-4" /> New event
          </Button>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5 rounded-2xl border border-border bg-surface p-1">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-xl px-4 py-1.5 text-xs font-medium transition-all",
                filter === f.key
                  ? "bg-foreground text-white shadow-sm"
                  : "text-muted hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-soft" />
          <input
            type="search"
            placeholder="Search events..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm placeholder:text-muted-soft focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
          />
        </div>
      </div>

      {isLoading && events.length === 0 ? (
        <PageLoading label="Loading events…" />
      ) : error ? (
        <ErrorState message="Could not load events" onRetry={() => refetch()} />
      ) : list.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-border-soft text-muted">
            <Calendar className="size-6" />
          </span>
          <h3 className="mt-4 text-base font-semibold">
            {events.length === 0 ? "No events yet" : "No events match your filter"}
          </h3>
          <p className="mt-1 max-w-sm text-sm text-muted">
            {events.length === 0
              ? "Create your first event and invite drivers."
              : "Try changing the filter or search."}
          </p>
          {events.length === 0 && (
            <Button className="mt-4" size="md" onClick={openCreate}>
              <Plus className="size-4" /> Create event
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {list.map((e, i) => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
            >
              <Card className="group relative flex h-full flex-col p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
                <div className="absolute right-4 top-4 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={(ev) => {
                      ev.stopPropagation();
                      openEdit(e);
                    }}
                    className="rounded-lg bg-surface p-1.5 text-muted shadow-sm ring-1 ring-border hover:text-foreground"
                    aria-label="Edit event"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setConfirmDelete(e);
                    }}
                    className="rounded-lg bg-surface p-1.5 text-muted shadow-sm ring-1 ring-border hover:bg-rose-50 hover:text-rose-600"
                    aria-label="Delete event"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSelected(e)}
                  className="flex h-full flex-col text-left"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex size-14 flex-col items-center justify-center rounded-2xl bg-brand-soft text-brand-strong">
                      <span className="text-[10px] font-semibold uppercase">
                        {new Date(e.startDate).toLocaleDateString("en-US", { month: "short" })}
                      </span>
                      <span className="text-lg font-bold leading-none">
                        {new Date(e.startDate).getDate()}
                      </span>
                    </div>
                    <Badge tone={statusTone[e.status]} dot>
                      {e.status}
                    </Badge>
                  </div>
                  <h3 className="mt-4 text-base font-semibold leading-snug text-foreground">
                    {e.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm text-muted">
                    {e.description || "No description provided."}
                  </p>
                  <div className="mt-4 space-y-1.5 border-t border-border-soft pt-3 text-xs text-muted">
                    <p className="inline-flex items-center gap-1.5">
                      <Calendar className="size-3.5" /> {formatEventDates(e.startDate, e.endDate)}
                    </p>
                    <p className="inline-flex items-center gap-1.5">
                      <MapPin className="size-3.5" /> {e.location}
                    </p>
                    <p className="inline-flex items-center gap-1.5">
                      <Users className="size-3.5" />
                      <span>
                        {countByStatus(e.invitations, "accepted")}
                        {e.driverLimit != null ? `/${e.driverLimit}` : ""} accepted ·{" "}
                        {countByStatus(e.invitations, "invited")} pending
                      </span>
                    </p>
                    {e.driverLimit != null &&
                      countByStatus(e.invitations, "accepted") >= e.driverLimit && (
                        <p className="inline-flex items-center gap-1.5 font-medium text-emerald-600">
                          Registration closed · roster full
                        </p>
                      )}
                  </div>
                  <div className="mt-auto pt-4">
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-strong group-hover:underline">
                      View details <ChevronRight className="size-3.5" />
                    </span>
                  </div>
                </button>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setSelected(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-surface shadow-2xl sm:rounded-2xl"
          >
            <div className="relative h-32 bg-gradient-to-br from-brand to-brand-strong">
              <button
                onClick={() => setSelected(null)}
                className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/30"
              >
                <X className="size-4" />
              </button>
              <div className="absolute -bottom-8 left-6 flex size-16 flex-col items-center justify-center rounded-2xl bg-surface shadow-lg">
                <span className="text-[10px] font-semibold uppercase text-muted">
                  {new Date(selected.startDate).toLocaleDateString("en-US", { month: "short" })}
                </span>
                <span className="text-xl font-bold leading-none">
                  {new Date(selected.startDate).getDate()}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6 pt-12">
              <Badge tone={statusTone[selected.status]} dot>
                {selected.status}
              </Badge>
              <h2 className="mt-3 text-xl font-semibold">{selected.title}</h2>
              <p className="mt-2 text-sm text-muted">
                {selected.description || "No description provided."}
              </p>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <DetailBox label="Starts">{selected.startDate}</DetailBox>
                <DetailBox label="Ends">{selected.endDate}</DetailBox>
                <DetailBox label="Location">{selected.location}</DetailBox>
              </div>

              <div className="mt-3 rounded-xl border border-border-soft bg-background p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted">
                    Roster
                  </span>
                  <span className="text-sm font-semibold">
                    {countByStatus(selected.invitations, "accepted")}
                    {selected.driverLimit != null ? ` / ${selected.driverLimit}` : ""}
                    <span className="ml-1 text-xs font-normal text-muted">
                      accepted{selected.driverLimit == null ? " · unlimited" : ""}
                    </span>
                  </span>
                </div>
                {selected.driverLimit != null &&
                  countByStatus(selected.invitations, "accepted") >= selected.driverLimit && (
                    <p className="mt-1 text-xs font-medium text-emerald-600">
                      Registration closed automatically — remaining invitations were closed.
                    </p>
                  )}
              </div>

              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Invited drivers</h3>
                  <span className="text-xs text-muted">
                    {selected.invitations.length} total
                  </span>
                </div>
                {selected.invitations.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted">
                    No drivers invited yet. Edit the event to invite some.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selected.invitations.map((inv) => {
                      const d = driverById.get(inv.driverId);
                      if (!d) return null;
                      const assignedCar =
                        inv.status === "accepted"
                          ? cars.find(
                              (c) =>
                                c.assignedDriverId === d.id &&
                                c.assignedEventId === selected.id,
                            ) ?? null
                          : null;
                      const eventCarPool = cars.filter(
                        (c) =>
                          c.assignedEventId === selected.id && !c.assignedDriverId,
                      );
                      return (
                        <div
                          key={inv.driverId}
                          className="rounded-xl border border-border-soft p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <Avatar name={d.name} color={d.avatarColor} size="sm" />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">{d.name}</p>
                                <p className="truncate text-xs text-muted">{d.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                tone={
                                  inv.status === "accepted"
                                    ? "success"
                                    : inv.status === "declined"
                                      ? "danger"
                                      : inv.status === "closed"
                                        ? "muted"
                                        : "info"
                                }
                                dot
                              >
                                {inv.status}
                              </Badge>
                              {inv.status === "accepted" && (
                                <button
                                  onClick={() => handleUnassign(selected.id, d.id, d.name)}
                                  className="rounded-lg p-1.5 text-muted hover:bg-rose-50 hover:text-rose-600"
                                  aria-label="Unassign driver"
                                  title="Unassign driver"
                                >
                                  <X className="size-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                          {inv.status === "accepted" && (
                            <div className="mt-2 flex items-center gap-2 border-t border-border-soft pt-2">
                              <CarIcon className="size-3.5 shrink-0 text-muted" />
                              {assignedCar ? (
                                <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                                  <span className="truncate text-xs">
                                    <span className="font-medium text-foreground">
                                      {assignedCar.name}
                                    </span>{" "}
                                    <span className="font-mono text-muted">
                                      {assignedCar.plateNumber}
                                    </span>
                                  </span>
                                  <button
                                    onClick={() => handleUnassignCar(assignedCar)}
                                    disabled={updateCar.isPending}
                                    className="rounded-md px-2 py-0.5 text-[11px] font-medium text-muted hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                                  >
                                    Unassign
                                  </button>
                                </div>
                              ) : eventCarPool.length > 0 ? (
                                <select
                                  defaultValue=""
                                  onChange={(e) => {
                                    const carId = e.target.value;
                                    if (!carId) return;
                                    const car = eventCarPool.find((c) => c.id === carId);
                                    if (car) handleAssignCar(car, selected, d.id, d.name);
                                    e.target.value = "";
                                  }}
                                  disabled={updateCar.isPending}
                                  className="h-7 min-w-0 flex-1 rounded-md border border-border bg-surface px-2 text-xs focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                                >
                                  <option value="">Assign a car…</option>
                                  {eventCarPool.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.name} · {c.plateNumber}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-[11px] text-muted">
                                  No cars added to this event. Add one from the Cars page.
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Group chat</h3>
                  <span className="text-xs text-muted">Admin + invited drivers</span>
                </div>
                <EventChat eventId={selected.id} />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-border-soft p-5">
              <Button variant="outline" className="flex-1" onClick={() => setSelected(null)}>
                Close
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => openEdit(selected)}>
                <Pencil className="size-4" /> Edit
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => setConfirmDelete(selected)}
              >
                <Trash2 className="size-4" /> Delete
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {confirmDelete && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setConfirmDelete(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-2xl"
          >
            <h3 className="text-lg font-semibold text-foreground">Delete event?</h3>
            <p className="mt-1.5 text-sm text-muted">
              &quot;{confirmDelete.title}&quot; will be permanently removed and any assigned driver
              will be unassigned. This can&apos;t be undone.
            </p>
            <div className="mt-5 flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setConfirmDelete(null)}
                disabled={deleteEvent.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleteEvent.isPending}
              >
                <CheckCircle2 className="size-4" /> Yes, delete
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      <EventFormModal open={formOpen} onClose={() => setFormOpen(false)} event={editing} />
    </div>
  );
}

function DetailBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border-soft p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{children}</p>
    </div>
  );
}

function formatEventDates(startDate: string, endDate: string) {
  if (!startDate) return "";
  if (!endDate || endDate === startDate) return startDate;
  return `${startDate} – ${endDate}`;
}
