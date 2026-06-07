// Event status + cleanup are date-driven, not stored. Both event status
// and driver assignment derive from today vs event endDate so no cron job
// is needed — sweeps run lazily at the top of GET requests.

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

// Wire dates are "YYYY-MM-DD" strings, so lexicographic comparison works.
export function deriveEventStatus(startDate, endDate) {
  if (!startDate || !endDate) return "upcoming";
  const today = todayString();
  if (today < startDate) return "upcoming";
  if (today > endDate) return "completed";
  return "ongoing";
}

// Releases drivers from events that have ended: clears their assignedEventId
// + shift markers and closes any still-open shifts. Idempotent — safe to call
// on every relevant GET.
export async function sweepCompletedEvents(prisma) {
  const today = todayString();
  const completed = await prisma.event.findMany({
    where: { endDate: { lt: today } },
    select: { id: true },
  });
  if (!completed.length) return;
  const ids = completed.map((e) => e.id);

  const now = new Date().toISOString();
  await prisma.shift.updateMany({
    where: { eventId: { in: ids }, endedAt: null },
    data: { endedAt: now },
  });
  await prisma.driver.updateMany({
    where: { assignedEventId: { in: ids } },
    data: {
      assignedEventId: null,
      shiftStartedAt: null,
      shiftEndedAt: null,
    },
  });
}
