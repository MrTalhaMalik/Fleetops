import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { sweepCompletedEvents } from "../db/event-status.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/dashboard", requireRole("admin"), async (_req, res) => {
  await sweepCompletedEvents(prisma);

  // Date-driven status means "not completed" = endDate is today or later.
  const today = new Date().toISOString().slice(0, 10);
  const [
    totalDrivers,
    pendingDrivers,
    activeNow,
    upcomingEvents,
    totalAlerts,
  ] = await Promise.all([
    prisma.driver.count({ where: { approved: true } }),
    prisma.driver.count({ where: { approved: false } }),
    // on-duty = approved + assigned to an event + has an open shift
    prisma.driver.count({
      where: {
        approved: true,
        assignedEventId: { not: null },
        shiftStartedAt: { not: null },
        shiftEndedAt: null,
      },
    }),
    prisma.event.count({ where: { endDate: { gte: today } } }),
    prisma.alert.count(),
  ]);

  res.json({
    totalDrivers,
    pendingDrivers,
    activeNow,
    activeShifts: activeNow,
    upcomingEvents,
    totalAlerts,
  });
});

export default router;
