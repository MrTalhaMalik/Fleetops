import { prisma } from "../db/prisma.js";

// Drivers must heartbeat their location while on shift. If no fresh ping arrives
// for this long, we assume they closed the app or disabled location and stop
// the shift on their behalf.
const STALE_MS = 60_000;
const CHECK_INTERVAL_MS = 15_000;

async function autoStopShift(driver, reason) {
  if (!driver.shiftStartedAt || driver.shiftEndedAt) return;
  const endedAt = new Date().toISOString();
  const openShift = await prisma.shift.findFirst({
    where: {
      driverId: driver.id,
      eventId: driver.assignedEventId ?? undefined,
      endedAt: null,
    },
  });
  if (openShift) {
    await prisma.shift.update({ where: { id: openShift.id }, data: { endedAt } });
  }
  await prisma.driver.update({
    where: { id: driver.id },
    data: {
      shiftEndedAt: endedAt,
      shiftsCompleted: { increment: 1 },
    },
  });
  if (driver.userId) {
    await prisma.alert.create({
      data: {
        title: "Shift ended automatically",
        message: reason,
        type: "shift",
        read: false,
        recipientType: "user",
        recipientUserId: driver.userId,
        recipientEventId: driver.assignedEventId ?? null,
      },
    });
  }
}

async function tick() {
  const now = Date.now();
  const onShift = await prisma.driver.findMany({
    where: { shiftStartedAt: { not: null }, shiftEndedAt: null },
  });
  for (const driver of onShift) {
    // The /start endpoint stamps locationUpdatedAt to the moment the shift began,
    // so this is always populated for an on-shift driver. If missing for some
    // reason, fall back to the shift start time.
    const lastPingISO = driver.locationUpdatedAt ?? driver.shiftStartedAt;
    const age = now - new Date(lastPingISO).getTime();
    if (age > STALE_MS) {
      await autoStopShift(
        driver,
        "Your location stopped reporting. Re-enable location services and start a new shift to keep tracking time.",
      );
    }
  }
}

export function startLocationWatchdog() {
  setInterval(() => {
    tick().catch((err) => console.error("[watchdog]", err));
  }, CHECK_INTERVAL_MS);
}
