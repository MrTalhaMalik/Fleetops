"use client";

import { motion } from "framer-motion";
import {
  Calendar,
  Check,
  FileText,
  Loader2,
  Mail,
  Phone,
  Plus,
  Search,
  Trash2,
  UserPlus,
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
  useApproveDriver,
  useDeleteDriver,
  useDriverDocuments,
  useDrivers,
  useRejectDriver,
} from "@/lib/queries";
import type { Driver, DriverStatus } from "@/lib/types";
import { cn } from "@/lib/cn";
import { DriverFormModal } from "./driver-form-modal";
import { AssignEventModal } from "./assign-event-modal";

const filters = [
  { key: "all", label: "All" },
  { key: "available", label: "Available" },
  { key: "off-duty", label: "Off duty" },
  { key: "on-duty", label: "On duty" },
  { key: "pending", label: "Pending approval" },
] as const;

type FilterKey = (typeof filters)[number]["key"];

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

export default function DriversPage() {
  const { data: drivers = [], isLoading, error, refetch } = useDrivers();
  const approve = useApproveDriver();
  const reject = useRejectDriver();
  const remove = useDeleteDriver();

  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [assignDriver, setAssignDriver] = useState<Driver | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Driver | null>(null);
  const [docsDriver, setDocsDriver] = useState<Driver | null>(null);

  const pending = drivers.filter((d) => d.status === "pending");

  const filtered = useMemo(() => {
    return drivers
      .filter((d) => (filter === "all" ? d.status !== "pending" : d.status === filter))
      .filter((d) =>
        query
          ? d.name.toLowerCase().includes(query.toLowerCase()) ||
            d.email.toLowerCase().includes(query.toLowerCase())
          : true,
      );
  }, [drivers, filter, query]);

  function handleApprove(d: Driver) {
    approve.mutate(d.id, {
      onSuccess: () => toast.success(`${d.name} approved — they can now sign in`),
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : "Could not approve driver"),
    });
  }

  function handleReject(d: Driver) {
    reject.mutate(d.id, {
      onSuccess: () => toast.success(`${d.name}'s application was rejected`),
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : "Could not reject driver"),
    });
  }

  function handleDelete(d: Driver) {
    remove.mutate(d.id, {
      onSuccess: () => {
        toast.success("Driver removed");
        setConfirmDelete(null);
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : "Could not remove driver"),
    });
  }

  return (
    <div>
      <PageHeader
        title="Drivers"
        description={
          isLoading
            ? "Loading drivers…"
            : `${drivers.filter((d) => d.approved).length} approved · ${pending.length} pending`
        }
        actions={
          <Button size="md" onClick={() => setCreateOpen(true)}>
            <UserPlus className="size-4" /> Add driver
          </Button>
        }
      />

      {/* Pending approvals — only visible when there are any */}
      {pending.length > 0 && filter !== "pending" && (
        <Card className="mb-6 overflow-hidden border-amber-200 bg-amber-50/40">
          <div className="border-b border-amber-200/60 px-5 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-amber-900">Pending approvals</p>
                <p className="text-xs text-amber-700">
                  {pending.length} driver{pending.length === 1 ? "" : "s"} waiting to be approved.
                </p>
              </div>
              <button
                onClick={() => setFilter("pending")}
                className="text-xs font-semibold text-amber-900 underline-offset-4 hover:underline"
              >
                View all
              </button>
            </div>
          </div>
          <div className="space-y-2 p-4">
            {pending.slice(0, 3).map((d) => (
              <PendingRow
                key={d.id}
                driver={d}
                onApprove={() => handleApprove(d)}
                onReject={() => handleReject(d)}
                onViewDocs={() => setDocsDriver(d)}
                approving={approve.isPending}
                rejecting={reject.isPending}
              />
            ))}
          </div>
        </Card>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5 rounded-2xl border border-border bg-surface p-1">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-medium transition-all",
                filter === f.key
                  ? "bg-foreground text-white shadow-sm"
                  : "text-muted hover:text-foreground",
              )}
            >
              {f.label}
              {f.key === "pending" && pending.length > 0 && (
                <span className="ml-1.5 inline-flex size-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                  {pending.length}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-soft" />
          <input
            type="search"
            placeholder="Search by name or email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm placeholder:text-muted-soft focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
          />
        </div>
      </div>

      {isLoading && drivers.length === 0 ? (
        <PageLoading label="Loading drivers…" />
      ) : error ? (
        <ErrorState message="Could not load drivers" onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-border-soft text-muted">
            <Users className="size-6" />
          </span>
          <h3 className="mt-4 text-base font-semibold">
            {drivers.length === 0 ? "No drivers yet" : "No drivers match your filter"}
          </h3>
          <p className="mt-1 max-w-sm text-sm text-muted">
            {drivers.length === 0
              ? "Add your first driver or wait for someone to sign up."
              : "Try changing the filter or search."}
          </p>
          {drivers.length === 0 && (
            <Button className="mt-4" size="md" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" /> Add driver
            </Button>
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-soft text-xs uppercase tracking-wider text-muted">
                  <th className="px-6 py-3 font-semibold">Driver</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold">Contact</th>
                  <th className="px-6 py-3 font-semibold sr-only">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d, i) => (
                  <motion.tr
                    key={d.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.02 }}
                    className="border-b border-border-soft last:border-b-0 transition-colors hover:bg-border-soft/60"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={d.name} color={d.avatarColor} />
                        <div>
                          <p className="font-medium text-foreground">{d.name}</p>
                          <p className="text-xs text-muted">{d.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge tone={statusTone[d.status]} dot>
                        {statusLabel[d.status]}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted">
                      <div className="flex flex-col gap-0.5">
                        <span className="inline-flex items-center gap-1.5">
                          <Mail className="size-3" /> {d.email}
                        </span>
                        {d.phone && (
                          <span className="inline-flex items-center gap-1.5">
                            <Phone className="size-3" /> {d.phone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        {d.status === "pending" ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDocsDriver(d)}
                            >
                              <FileText className="size-3.5" /> View docs
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReject(d)}
                              disabled={reject.isPending}
                            >
                              <X className="size-3.5" /> Reject
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleApprove(d)}
                              disabled={approve.isPending}
                            >
                              <Check className="size-3.5" /> Approve
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setAssignDriver(d)}
                              disabled={d.status === "on-duty"}
                              title={
                                d.status === "on-duty"
                                  ? "Driver is currently on shift"
                                  : "Assign to an event"
                              }
                            >
                              <Calendar className="size-3.5" /> Assign event
                            </Button>
                            <button
                              onClick={() => setConfirmDelete(d)}
                              className="rounded-lg p-2 text-muted hover:bg-rose-50 hover:text-rose-600"
                              aria-label="Remove driver"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <DriverFormModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <AssignEventModal
        open={Boolean(assignDriver)}
        driver={assignDriver}
        onClose={() => setAssignDriver(null)}
      />
      {docsDriver && (
        <DriverDocsModal driver={docsDriver} onClose={() => setDocsDriver(null)} />
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
            <h3 className="text-lg font-semibold text-foreground">
              Remove {confirmDelete.name}?
            </h3>
            <p className="mt-1.5 text-sm text-muted">
              Their account will be deleted. They&apos;ll need to sign up again to come back.
            </p>
            <div className="mt-5 flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setConfirmDelete(null)}
                disabled={remove.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => handleDelete(confirmDelete)}
                disabled={remove.isPending}
              >
                Remove
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function PendingRow({
  driver,
  onApprove,
  onReject,
  onViewDocs,
  approving,
  rejecting,
}: {
  driver: Driver;
  onApprove: () => void;
  onReject: () => void;
  onViewDocs: () => void;
  approving: boolean;
  rejecting: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-surface p-3 shadow-sm">
      <div className="flex items-center gap-3">
        <Avatar name={driver.name} color={driver.avatarColor} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{driver.name}</p>
          <p className="truncate text-xs text-muted">
            {driver.email}
            {driver.phone ? ` · ${driver.phone}` : ""}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onViewDocs}>
          <FileText className="size-3.5" /> View docs
        </Button>
        <Button variant="outline" size="sm" onClick={onReject} disabled={rejecting}>
          <X className="size-3.5" /> Reject
        </Button>
        <Button size="sm" onClick={onApprove} disabled={approving}>
          <Check className="size-3.5" /> Approve
        </Button>
      </div>
    </div>
  );
}

function DriverDocsModal({ driver, onClose }: { driver: Driver; onClose: () => void }) {
  const { data, isLoading, error } = useDriverDocuments(driver.id);
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border p-5">
          <div className="flex items-center gap-3">
            <Avatar name={driver.name} color={driver.avatarColor} size="sm" />
            <div>
              <h3 className="text-lg font-semibold">{driver.name}&apos;s documents</h3>
              <p className="text-xs text-muted">QID and Qatar driver license</p>
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

        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center text-muted">
              <Loader2 className="mr-2 size-4 animate-spin" /> Loading documents…
            </div>
          ) : error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              Could not load documents.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DocPreview label="Qatar ID (QID)" src={data?.qidImage ?? null} />
              <DocPreview label="Qatar driver license" src={data?.licenseImage ?? null} />
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function DocPreview({ label, src }: { label: string; src: string | null }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border-soft">
      <p className="border-b border-border-soft bg-border-soft/40 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted">
        {label}
      </p>
      {src ? (
        <a href={src} target="_blank" rel="noreferrer" className="block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={label} className="block w-full object-contain" />
        </a>
      ) : (
        <p className="px-4 py-8 text-center text-xs text-muted">No image on file.</p>
      )}
    </div>
  );
}
