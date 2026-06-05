"use client";

import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, Lock, Mail, Truck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { user, login } = useAuth();
  const [email, setEmail] = useState("admin@admin.com");
  const [password, setPassword] = useState("1234");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-10 sm:px-12 lg:px-16">
        <div className="flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand text-foreground shadow-md">
            <Truck className="size-5" strokeWidth={2.5} />
          </span>
          <div>
            <p className="text-base font-semibold tracking-tight text-foreground">FleetOps</p>
            <p className="text-[11px] uppercase tracking-wider text-muted">Fleet management</p>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Welcome back</h1>
            <p className="mt-2 text-sm text-muted">
              Sign in to your FleetOps account to manage your fleet.
            </p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-soft" />
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="you@fleetops.io"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium text-foreground">
                    Password
                  </label>
                  <button
                    type="button"
                    className="text-xs font-medium text-brand-strong hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-soft" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    className="px-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted-soft hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="size-4 rounded border-border accent-brand"
                />
                Remember me for 30 days
              </label>

              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Signing in…
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>

              <p className="text-center text-sm text-muted">
                New driver?{" "}
                <Link
                  href="/signup"
                  className="font-semibold text-brand-strong hover:underline"
                >
                  Sign up
                </Link>
              </p>
            </form>
          </motion.div>
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
              v2.4 · Live tracking now in beta
            </div>
            <h2 className="text-4xl font-semibold leading-tight tracking-tight text-white">
              Run your fleet
              <br />
              like the best in the world.
            </h2>
            <p className="max-w-md text-base text-sidebar-muted">
              Dispatch, track, and grow your driver operation with the same toolkit powering
              thousands of shifts every day.
            </p>
          </motion.div>
          <div className="text-xs text-sidebar-muted">
            Trusted by operations teams at modern logistics companies
          </div>
        </div>
      </div>
    </div>
  );
}
