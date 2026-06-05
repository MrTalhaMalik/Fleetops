"use client";

import { motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateDriver } from "@/lib/queries";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function DriverFormModal({ open, onClose }: Props) {
  const create = useCreateDriver();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("1234");
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Name is required";
    if (!email.trim()) next.email = "Email is required";
    if (!phone.trim()) next.phone = "Phone is required";
    if (password.length < 4) next.password = "Password must be at least 4 characters";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    try {
      await create.mutateAsync({ name, email, phone, password });
      toast.success(`Driver ${name} added`);
      setName("");
      setEmail("");
      setPhone("");
      setPassword("1234");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create driver");
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
            <h2 className="text-lg font-semibold">Add a driver</h2>
            <p className="text-xs text-muted">
              Admin-created drivers are auto-approved and can sign in immediately.
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
          <Field label="Full name" error={errors.name}>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Driver"
            />
          </Field>
          <Field label="Email" error={errors.email}>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
            />
          </Field>
          <Field label="Phone" error={errors.phone}>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 123 4567"
            />
          </Field>
          <Field label="Temporary password" error={errors.password}>
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 4 characters"
            />
          </Field>

          <div className="flex gap-2 border-t border-border-soft pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={create.isPending}>
              {create.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Adding…
                </>
              ) : (
                "Add driver"
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
