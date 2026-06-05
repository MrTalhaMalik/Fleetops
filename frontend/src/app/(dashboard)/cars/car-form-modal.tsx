"use client";

import { motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateCar, useDrivers, useEvents, useUpdateCar } from "@/lib/queries";
import type { Car } from "@/lib/types";

type Props = {
  open: boolean;
  car?: Car | null;
  onClose: () => void;
};

export function CarFormModal({ open, car, onClose }: Props) {
  const isEdit = Boolean(car);
  const create = useCreateCar();
  const update = useUpdateCar();
  const { data: drivers = [] } = useDrivers();
  const { data: events = [] } = useEvents();

  const [name, setName] = useState("");
  const [model, setModel] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [assignedDriverId, setAssignedDriverId] = useState("");
  const [assignedEventId, setAssignedEventId] = useState("");
  const [assignmentStart, setAssignmentStart] = useState("");
  const [assignmentEnd, setAssignmentEnd] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setName(car?.name ?? "");
    setModel(car?.model ?? "");
    setPlateNumber(car?.plateNumber ?? "");
    setAssignedDriverId(car?.assignedDriverId ?? "");
    setAssignedEventId(car?.assignedEventId ?? "");
    setAssignmentStart(car?.assignmentStart ?? "");
    setAssignmentEnd(car?.assignmentEnd ?? "");
    setErrors({});
  }, [open, car]);

  if (!open) return null;

  const pending = create.isPending || update.isPending;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Car name is required";
    if (!plateNumber.trim()) next.plateNumber = "Plate number is required";
    if (assignmentStart && assignmentEnd && assignmentEnd < assignmentStart) {
      next.assignmentEnd = "End date can't be before start date";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const payload = {
      name: name.trim(),
      model: model.trim(),
      plateNumber: plateNumber.trim(),
      assignedDriverId: assignedDriverId || null,
      assignedEventId: assignedEventId || null,
      assignmentStart: assignmentStart || null,
      assignmentEnd: assignmentEnd || null,
    };

    try {
      if (isEdit && car) {
        await update.mutateAsync({ id: car.id, input: payload });
        toast.success(`${name} updated`);
      } else {
        await create.mutateAsync(payload);
        toast.success(`Car ${name} added`);
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save car");
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
        className="w-full max-w-md overflow-hidden rounded-t-3xl bg-surface shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h2 className="text-lg font-semibold">{isEdit ? "Edit car" : "Add a car"}</h2>
            <p className="text-xs text-muted">
              {isEdit
                ? "Update details or change the driver assignment."
                : "Register a vehicle and optionally assign it to a driver."}
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

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <Field label="Car name" error={errors.name}>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Fleet Van 01"
            />
          </Field>
          <Field label="Model" error={errors.model}>
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Toyota Hiace 2024"
            />
          </Field>
          <Field label="Plate number" error={errors.plateNumber}>
            <Input
              value={plateNumber}
              onChange={(e) => setPlateNumber(e.target.value)}
              placeholder="QA-12345"
            />
          </Field>
          <Field label="Assigned driver (optional)">
            <select
              value={assignedDriverId}
              onChange={(e) => setAssignedDriverId(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-surface px-4 text-sm focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
            >
              <option value="">Unassigned</option>
              {drivers
                .filter((d) => d.approved)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Assigned event (optional)">
            <select
              value={assignedEventId}
              onChange={(e) => setAssignedEventId(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-surface px-4 text-sm focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
            >
              <option value="">No event</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Assignment start" error={errors.assignmentStart}>
              <Input
                type="date"
                value={assignmentStart}
                onChange={(e) => setAssignmentStart(e.target.value)}
              />
            </Field>
            <Field label="Assignment end" error={errors.assignmentEnd}>
              <Input
                type="date"
                value={assignmentEnd}
                onChange={(e) => setAssignmentEnd(e.target.value)}
              />
            </Field>
          </div>

          <div className="flex gap-2 border-t border-border-soft pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Saving…
                </>
              ) : isEdit ? (
                "Save changes"
              ) : (
                "Add car"
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
