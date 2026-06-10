"use client";

import { motion } from "framer-motion";
import { Calendar, MapPin, Pause, Play } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageLoading } from "@/components/ui/loading";
import { useAuth } from "@/lib/auth-context";
import {
  useEvents,
  useMyDriver,
  useStartShift,
  useStopShift,
  useUpdateMyLocation,
} from "@/lib/queries";

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation isn't supported by this browser"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10_000,
      maximumAge: 0,
    });
  });
}

export function DriverDashboard() {
  const { user } = useAuth();
  const { data: me, isLoading } = useMyDriver();
  const { data: events = [] } = useEvents();
  const startMutation = useStartShift();
  const stopMutation = useStopShift();
  const updateLocation = useUpdateMyLocation();

  const onShift = me?.status === "on-duty";
  const assignedEventId = me?.assignedEventId ?? null;

  // While on shift, stream the device's position to the server.
  // If the user revokes permission or location stops working, end the shift.
  const watchIdRef = useRef<number | null>(null);
  const stopShiftRef = useRef<() => void>(() => {});
  stopShiftRef.current = () => {
    if (!assignedEventId) return;
    stopMutation.mutate(assignedEventId, {
      onSuccess: () => toast.info("Shift ended — location is required to stay on duty"),
    });
  };

  useEffect(() => {
    if (!onShift || !assignedEventId) return;
    if (!("geolocation" in navigator)) return;

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        updateLocation.mutate({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        toast.error(
          err.code === err.PERMISSION_DENIED
            ? "Location access was turned off — ending your shift."
            : "Lost GPS signal — ending your shift.",
        );
        stopShiftRef.current();
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 30_000 },
    );
    watchIdRef.current = id;
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
    // updateLocation is a stable mutation object; we only re-wire when shift state flips.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onShift, assignedEventId]);

  if (isLoading || !me) return <PageLoading label="Loading your dashboard…" />;

  const currentEvent = me.assignedEventId
    ? events.find((e) => e.id === me.assignedEventId) ?? null
    : null;

  // Shifts can't be started before the event's first day. Wire dates are
  // "YYYY-MM-DD" strings so lexicographic comparison is correct.
  const today = new Date().toISOString().slice(0, 10);
  const eventNotStarted = Boolean(currentEvent && today < currentEvent.startDate);

  async function handleStart(eventId: string) {
    try {
      const pos = await getCurrentPosition();
      startMutation.mutate(
        { eventId, lat: pos.coords.latitude, lng: pos.coords.longitude },
        {
          onSuccess: () => toast.success("Shift started"),
          onError: (err) =>
            toast.error(err instanceof Error ? err.message : "Could not start shift"),
        },
      );
    } catch (err) {
      const geoErr = err as GeolocationPositionError | Error;
      if ("code" in geoErr && geoErr.code === geoErr.PERMISSION_DENIED) {
        toast.error("Enable location access to start your shift.");
      } else {
        toast.error("Couldn't read your location. Make sure GPS is enabled and try again.");
      }
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <p className="text-sm font-medium uppercase tracking-wider text-muted">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Hi {user?.name.split(" ")[0]}.
        </h1>
      </div>

      {currentEvent ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="overflow-hidden">
            <div className="border-b border-border-soft bg-gradient-to-br from-brand to-brand-strong p-6 text-foreground">
              <div className="flex items-center justify-between">
                <Badge tone={onShift ? "success" : "neutral"} dot>
                  {onShift ? "On duty" : "Off duty"}
                </Badge>
                <p className="text-xs font-medium uppercase tracking-wider text-foreground/80">
                  Current event
                </p>
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">{currentEvent.title}</h2>
              {currentEvent.description && (
                <p className="mt-1 text-sm text-foreground/80">{currentEvent.description}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 p-6 sm:grid-cols-3">
              <DetailRow icon={<Calendar className="size-4" />} label="Starts">
                {currentEvent.startDate}
              </DetailRow>
              <DetailRow icon={<Calendar className="size-4" />} label="Ends">
                {currentEvent.endDate}
              </DetailRow>
              <DetailRow icon={<MapPin className="size-4" />} label="Location">
                {currentEvent.location}
              </DetailRow>
            </div>

            {onShift && me.shiftStartedAt && (
              <div className="border-t border-border-soft bg-background px-6 py-3 text-xs text-muted">
                <p>
                  Shift started at{" "}
                  <span className="font-medium text-foreground">
                    {new Date(me.shiftStartedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </p>
                <p className="mt-1 inline-flex items-center gap-1.5 font-medium text-emerald-700">
                  <span className="inline-block size-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Live location sharing on
                </p>
              </div>
            )}

            <div className="border-t border-border-soft p-6">
              {onShift ? (
                <Button
                  size="lg"
                  variant="danger"
                  className="w-full"
                  disabled={stopMutation.isPending}
                  onClick={() => {
                    stopMutation.mutate(currentEvent.id, {
                      onSuccess: () => toast.success("Shift ended"),
                      onError: (err) =>
                        toast.error(
                          err instanceof Error ? err.message : "Could not stop shift",
                        ),
                    });
                  }}
                >
                  <Pause className="size-5" /> Stop shift
                </Button>
              ) : (
                <>
                  <Button
                    size="lg"
                    className="w-full"
                    disabled={startMutation.isPending || eventNotStarted}
                    onClick={() => handleStart(currentEvent.id)}
                  >
                    <Play className="size-5" /> Start shift
                  </Button>
                  <p className="mt-2 text-center text-xs text-muted">
                    {eventNotStarted
                      ? `Shifts open on ${currentEvent.startDate}.`
                      : "Location access is required while on shift."}
                  </p>
                </>
              )}
            </div>
          </Card>
        </motion.div>
      ) : (
        <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-border-soft text-muted">
            <Calendar className="size-6" />
          </span>
          <h3 className="mt-4 text-base font-semibold">No active event</h3>
          <p className="mt-1 max-w-sm text-sm text-muted">
            You haven&apos;t accepted an event yet. Check the Events page for any pending
            invitations.
          </p>
          <Link
            href="/events"
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-white"
          >
            Go to events
          </Link>
        </Card>
      )}
    </div>
  );
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border-soft p-3">
      <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted">
        {icon} {label}
      </span>
      <p className="mt-1 text-sm font-medium text-foreground">{children}</p>
    </div>
  );
}
