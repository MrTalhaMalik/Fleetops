"use client";

import { motion } from "framer-motion";
import { Car as CarIcon, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { PageLoading, ErrorState } from "@/components/ui/loading";
import { useCars, useDeleteCar } from "@/lib/queries";
import type { Car } from "@/lib/types";
import { CarFormModal } from "./car-form-modal";

function formatDate(value: string | null) {
  if (!value) return "—";
  // Wire format is "YYYY-MM-DD" — render in the user's locale without
  // re-parsing as a timestamp (which would shift dates by timezone).
  const [y, m, d] = value.split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

export default function CarsPage() {
  const { data: cars = [], isLoading, error, refetch } = useCars();
  const remove = useDeleteCar();

  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editCar, setEditCar] = useState<Car | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Car | null>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return cars;
    const q = query.toLowerCase();
    return cars.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.model.toLowerCase().includes(q) ||
        c.plateNumber.toLowerCase().includes(q) ||
        (c.assignedDriverName ?? "").toLowerCase().includes(q),
    );
  }, [cars, query]);

  const assigned = cars.filter((c) => c.assignedDriverId).length;

  function handleDelete(car: Car) {
    remove.mutate(car.id, {
      onSuccess: () => {
        toast.success(`${car.name} removed`);
        setConfirmDelete(null);
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Could not remove car"),
    });
  }

  return (
    <div>
      <PageHeader
        title="Cars"
        description={
          isLoading
            ? "Loading cars…"
            : `${cars.length} total · ${assigned} assigned · ${cars.length - assigned} available`
        }
        actions={
          <Button size="md" onClick={() => setFormOpen(true)}>
            <Plus className="size-4" /> Add car
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-soft" />
          <input
            type="search"
            placeholder="Search name, plate, driver…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm placeholder:text-muted-soft focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
          />
        </div>
      </div>

      {isLoading && cars.length === 0 ? (
        <PageLoading label="Loading cars…" />
      ) : error ? (
        <ErrorState message="Could not load cars" onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-border-soft text-muted">
            <CarIcon className="size-6" />
          </span>
          <h3 className="mt-4 text-base font-semibold">
            {cars.length === 0 ? "No cars yet" : "No cars match your search"}
          </h3>
          <p className="mt-1 max-w-sm text-sm text-muted">
            {cars.length === 0
              ? "Register your first vehicle to start tracking fleet assignments."
              : "Try a different search term."}
          </p>
          {cars.length === 0 && (
            <Button className="mt-4" size="md" onClick={() => setFormOpen(true)}>
              <Plus className="size-4" /> Add car
            </Button>
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-soft text-xs uppercase tracking-wider text-muted">
                  <th className="px-6 py-3 font-semibold">Car name</th>
                  <th className="px-6 py-3 font-semibold">Model</th>
                  <th className="px-6 py-3 font-semibold">No. Plate</th>
                  <th className="px-6 py-3 font-semibold">Assigned to</th>
                  <th className="px-6 py-3 font-semibold">Start</th>
                  <th className="px-6 py-3 font-semibold">End</th>
                  <th className="px-6 py-3 font-semibold sr-only">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.02 }}
                    className="border-b border-border-soft last:border-b-0 transition-colors hover:bg-border-soft/60"
                  >
                    <td className="px-6 py-4 font-medium text-foreground">{c.name}</td>
                    <td className="px-6 py-4 text-muted">{c.model || "—"}</td>
                    <td className="px-6 py-4 font-mono text-xs text-foreground">
                      {c.plateNumber}
                    </td>
                    <td className="px-6 py-4">
                      {c.assignedDriverName ? (
                        <span className="font-medium text-foreground">
                          {c.assignedDriverName}
                        </span>
                      ) : (
                        <Badge tone="muted">Unassigned</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted">{formatDate(c.assignmentStart)}</td>
                    <td className="px-6 py-4 text-muted">{formatDate(c.assignmentEnd)}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setEditCar(c)}
                          className="rounded-lg p-2 text-muted hover:bg-border-soft hover:text-foreground"
                          aria-label="Edit car"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(c)}
                          className="rounded-lg p-2 text-muted hover:bg-rose-50 hover:text-rose-600"
                          aria-label="Remove car"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <CarFormModal open={formOpen} onClose={() => setFormOpen(false)} />
      <CarFormModal open={Boolean(editCar)} car={editCar} onClose={() => setEditCar(null)} />

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
              This will delete the car record permanently. Any current driver assignment will be cleared.
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
