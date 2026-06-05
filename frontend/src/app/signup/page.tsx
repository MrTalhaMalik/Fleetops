"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Eye, EyeOff, IdCard, Loader2, Lock, Mail, Phone, Truck, Upload, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export default function SignupPage() {
  const router = useRouter();
  const { user, signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [qidImage, setQidImage] = useState("");
  const [licenseImage, setLicenseImage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!qidImage) {
      toast.error("Upload a picture of your QID");
      return;
    }
    if (!licenseImage) {
      toast.error("Upload a picture of your Qatar license");
      return;
    }
    setLoading(true);
    try {
      await signup({ name, email, phone, password, qidImage, licenseImage });
      setSubmitted(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-up failed");
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-10 sm:px-12 lg:px-16">
        <Link href="/login" className="flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand text-foreground shadow-md">
            <Truck className="size-5" strokeWidth={2.5} />
          </span>
          <div>
            <p className="text-base font-semibold tracking-tight text-foreground">FleetOps</p>
            <p className="text-[11px] uppercase tracking-wider text-muted">Driver sign-up</p>
          </div>
        </Link>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 text-center"
            >
              <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-500 text-white">
                <CheckCircle2 className="size-7" />
              </span>
              <h2 className="mt-4 text-xl font-semibold text-emerald-900">Application submitted</h2>
              <p className="mt-2 text-sm text-emerald-800">
                Thanks {name.split(" ")[0]}! An admin will review your account and approve it.
                You&apos;ll be able to log in as soon as you&apos;re cleared.
              </p>
              <Link
                href="/login"
                className="mt-6 inline-flex items-center justify-center rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-white"
              >
                Back to sign in
              </Link>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Apply to drive with FleetOps
              </h1>
              <p className="mt-2 text-sm text-muted">
                Fill in the details below. An admin must approve your account before you can sign
                in.
              </p>

              <form onSubmit={handleSubmit} className="mt-7 space-y-4">
                <Field icon={<UserRound className="size-4" />} label="Full name">
                  <Input
                    required
                    placeholder="Jane Driver"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                  />
                </Field>
                <Field icon={<Mail className="size-4" />} label="Email">
                  <Input
                    required
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                  />
                </Field>
                <Field icon={<Phone className="size-4" />} label="Phone">
                  <Input
                    required
                    type="tel"
                    placeholder="+1 (555) 123 4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10"
                  />
                </Field>
                <Field icon={<Lock className="size-4" />} label="Password">
                  <Input
                    required
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 4 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="px-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted-soft hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </Field>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <DocumentUpload
                    label="Qatar ID (QID)"
                    value={qidImage}
                    onChange={setQidImage}
                    icon={<IdCard className="size-4" />}
                  />
                  <DocumentUpload
                    label="Qatar driver license"
                    value={licenseImage}
                    onChange={setLicenseImage}
                    icon={<IdCard className="size-4" />}
                  />
                </div>
                <p className="-mt-2 text-[11px] text-muted-soft">
                  Clear photos of both sides if printed on separate cards. Max 8 MB each.
                </p>

                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Submitting…
                    </>
                  ) : (
                    "Submit application"
                  )}
                </Button>

                <p className="text-center text-sm text-muted">
                  Already have an account?{" "}
                  <Link href="/login" className="font-semibold text-brand-strong hover:underline">
                    Sign in
                  </Link>
                </p>
              </form>
            </motion.div>
          )}
        </div>

        <p className="text-center text-xs text-muted-soft">
          © {new Date().getFullYear()} FleetOps · Built for modern fleets
        </p>
      </div>

      <div className="relative hidden overflow-hidden bg-sidebar lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(244,163,0,0.18),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(59,130,246,0.12),transparent_50%)]" />
        <div className="relative flex h-full flex-col justify-between px-16 py-16">
          <div />
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-sidebar-muted backdrop-blur">
              <span className="size-1.5 rounded-full bg-brand" />
              Drive with the modern operations stack
            </div>
            <h2 className="text-4xl font-semibold leading-tight tracking-tight text-white">
              Join the FleetOps
              <br />
              driver network.
            </h2>
            <p className="max-w-md text-base text-sidebar-muted">
              Get assigned to events, track your shifts, and grow your driving career — all from a
              single app.
            </p>
          </motion.div>
          <div className="text-xs text-sidebar-muted">
            Approvals are usually completed within 24 hours.
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-soft">
          {icon}
        </span>
        {children}
      </div>
    </div>
  );
}

function DocumentUpload({
  label,
  value,
  onChange,
  icon,
}: {
  label: string;
  value: string;
  onChange: (dataUrl: string) => void;
  icon: React.ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please pick an image file");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image is larger than 8 MB");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await readAsDataUrl(file);
      onChange(dataUrl);
    } catch {
      toast.error("Could not read that image");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFile}
      />
      {value ? (
        <div className="relative overflow-hidden rounded-xl border border-border bg-surface">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={label} className="block h-32 w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
            aria-label={`Remove ${label}`}
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex h-32 w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border bg-surface text-xs text-muted hover:border-brand hover:text-foreground"
        >
          {busy ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <span className="flex size-9 items-center justify-center rounded-full bg-border-soft text-muted-soft">
              {icon ?? <Upload className="size-4" />}
            </span>
          )}
          <span className="font-medium">Upload photo</span>
        </button>
      )}
    </div>
  );
}
