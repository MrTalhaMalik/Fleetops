import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { deriveEventStatus, sweepCompletedEvents } from "../db/event-status.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const eventSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().optional().default(""),
  startDate: z.string().trim().min(1, "Start date is required"),
  endDate: z.string().trim().min(1, "End date is required"),
  location: z.string().trim().min(1, "Location is required"),
  status: z.enum(["upcoming", "ongoing", "completed"]).default("upcoming"),
  invitedDriverIds: z.array(z.string()).default([]),
  driverLimit: z.coerce.number().int().positive().nullable().optional(),
});

function acceptedCount(ev) {
  return (ev.invitations ?? []).filter((i) => i.status === "accepted").length;
}

function isFull(ev) {
  return ev.driverLimit != null && acceptedCount(ev) >= ev.driverLimit;
}

function assertDateRange(start, end) {
  if (start && end && end < start) {
    const err = new Error("End date must be on or after start date");
    err.status = 400;
    throw err;
  }
}

// Strip the relation FK fields from invitations so the frontend gets the same
// shape it had under the in-memory store: {driverId, status, invitedAt, respondedAt}.
function shapeInvitation(inv) {
  return {
    id: inv.id,
    driverId: inv.driverId,
    status: inv.status,
    invitedAt: inv.invitedAt,
    respondedAt: inv.respondedAt,
  };
}

function shapeEvent(ev) {
  const invitations = (ev.invitations ?? []).map(shapeInvitation);
  return {
    id: ev.id,
    title: ev.title,
    description: ev.description,
    startDate: ev.startDate,
    endDate: ev.endDate,
    location: ev.location,
    // Status is derived from today vs the date range, not the stored column.
    // The DB column is kept around for legacy writes but ignored on read.
    status: deriveEventStatus(ev.startDate, ev.endDate),
    driverLimit: ev.driverLimit,
    invitations,
    attendees: invitations.filter((i) => i.status === "accepted").length,
    createdAt: ev.createdAt,
    updatedAt: ev.updatedAt,
  };
}

function formatDateRange(startDate, endDate) {
  if (!startDate) return "";
  if (!endDate || endDate === startDate) return startDate;
  return `${startDate} – ${endDate}`;
}

router.get("/", async (req, res) => {
  await sweepCompletedEvents(prisma);
  if (req.user.role === "driver") {
    const driver = await prisma.driver.findUnique({ where: { userId: req.user.sub } });
    if (!driver) return res.json([]);
    const list = await prisma.event.findMany({
      where: { invitations: { some: { driverId: driver.id } } },
      include: { invitations: true },
      orderBy: { startDate: "asc" },
    });
    return res.json(list.map(shapeEvent));
  }
  const list = await prisma.event.findMany({
    include: { invitations: true },
    orderBy: { startDate: "asc" },
  });
  res.json(list.map(shapeEvent));
});

router.get("/:id", async (req, res) => {
  const ev = await prisma.event.findUnique({
    where: { id: req.params.id },
    include: { invitations: true },
  });
  if (!ev) return res.status(404).json({ error: "Event not found" });
  res.json(shapeEvent(ev));
});

router.post("/", requireRole("admin"), async (req, res) => {
  const data = eventSchema.parse(req.body);
  assertDateRange(data.startDate, data.endDate);

  // Only invite drivers that actually exist.
  const validDrivers = data.invitedDriverIds.length
    ? await prisma.driver.findMany({
        where: { id: { in: data.invitedDriverIds } },
        select: { id: true, userId: true },
      })
    : [];

  const now = new Date().toISOString();
  const ev = await prisma.event.create({
    data: {
      title: data.title,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate,
      location: data.location,
      status: data.status,
      driverLimit: data.driverLimit ?? null,
      invitations: {
        create: validDrivers.map((d) => ({
          driverId: d.id,
          status: "invited",
          invitedAt: now,
        })),
      },
    },
    include: { invitations: true },
  });

  // Drop an alert in every invited driver's inbox so they see the request immediately.
  if (validDrivers.length) {
    await prisma.alert.createMany({
      data: validDrivers.map((d) => ({
        title: `New event invitation: ${ev.title}`,
        message: `You've been requested for "${ev.title}" (${formatDateRange(ev.startDate, ev.endDate)}). Open Events to accept or decline.`,
        type: "shift",
        read: false,
        recipientType: "user",
        recipientUserId: d.userId,
        recipientEventId: ev.id,
      })),
    });
  }

  res.status(201).json(shapeEvent(ev));
});

router.patch("/:id", requireRole("admin"), async (req, res) => {
  const ev = await prisma.event.findUnique({
    where: { id: req.params.id },
    include: { invitations: true },
  });
  if (!ev) return res.status(404).json({ error: "Event not found" });

  const data = eventSchema.partial().parse(req.body);
  const nextStart = data.startDate ?? ev.startDate;
  const nextEnd = data.endDate ?? ev.endDate;
  assertDateRange(nextStart, nextEnd);

  const patch = {};
  for (const key of ["title", "description", "startDate", "endDate", "location", "status"]) {
    if (data[key] !== undefined) patch[key] = data[key];
  }
  if (data.driverLimit !== undefined) patch.driverLimit = data.driverLimit ?? null;

  let newlyInvited = [];
  if (data.invitedDriverIds) {
    const existingIds = new Set(ev.invitations.map((i) => i.driverId));
    const candidates = data.invitedDriverIds.filter((id) => !existingIds.has(id));
    newlyInvited = candidates.length
      ? await prisma.driver.findMany({
          where: { id: { in: candidates } },
          select: { id: true, userId: true },
        })
      : [];
  }

  const now = new Date().toISOString();
  const updated = await prisma.event.update({
    where: { id: ev.id },
    data: {
      ...patch,
      ...(newlyInvited.length && {
        invitations: {
          create: newlyInvited.map((d) => ({
            driverId: d.id,
            status: "invited",
            invitedAt: now,
          })),
        },
      }),
    },
    include: { invitations: true },
  });

  if (newlyInvited.length) {
    await prisma.alert.createMany({
      data: newlyInvited.map((d) => ({
        title: `New event invitation: ${updated.title}`,
        message: `You've been requested for "${updated.title}" (${formatDateRange(nextStart, nextEnd)}). Open Events to accept or decline.`,
        type: "shift",
        read: false,
        recipientType: "user",
        recipientUserId: d.userId,
        recipientEventId: updated.id,
      })),
    });
  }

  res.json(shapeEvent(updated));
});

router.delete("/:id", requireRole("admin"), async (req, res) => {
  // Driver.assignedEventId is set null automatically by the FK (onDelete: SetNull).
  // Invitations + shifts + messages are cascaded by their own FKs.
  try {
    await prisma.event.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Event not found" });
    throw err;
  }
});

// Admin: invite an existing driver to an existing event (used from the Drivers page).
router.post("/:id/invite", requireRole("admin"), async (req, res) => {
  const { driverId } = req.body ?? {};
  const ev = await prisma.event.findUnique({
    where: { id: req.params.id },
    include: { invitations: true },
  });
  if (!ev) return res.status(404).json({ error: "Event not found" });
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) return res.status(400).json({ error: "Driver not found" });

  if (isFull(ev)) {
    return res.status(409).json({ error: "Registration is closed — this event is full." });
  }
  if (ev.invitations.some((inv) => inv.driverId === driver.id)) {
    return res.status(409).json({ error: "Driver already invited" });
  }

  const now = new Date().toISOString();
  await prisma.invitation.create({
    data: {
      eventId: ev.id,
      driverId: driver.id,
      status: "invited",
      invitedAt: now,
    },
  });

  await prisma.alert.create({
    data: {
      title: `New event invitation: ${ev.title}`,
      message: `You've been requested for "${ev.title}" (${formatDateRange(ev.startDate, ev.endDate)}). Open Events to accept or decline.`,
      type: "shift",
      read: false,
      recipientType: "user",
      recipientUserId: driver.userId,
      recipientEventId: ev.id,
    },
  });

  const updated = await prisma.event.findUnique({
    where: { id: ev.id },
    include: { invitations: true },
  });
  res.json(shapeEvent(updated));
});

// Driver: respond to an invitation.
// Enforces the rule: a driver can only be assigned to 1 event at a time.
router.post("/:id/respond", requireRole("driver"), async (req, res) => {
  const accept = Boolean(req.body?.accept);
  const driver = await prisma.driver.findUnique({ where: { userId: req.user.sub } });
  if (!driver) return res.status(404).json({ error: "Driver record not found" });

  const ev = await prisma.event.findUnique({
    where: { id: req.params.id },
    include: { invitations: true },
  });
  if (!ev) return res.status(404).json({ error: "Event not found" });

  const myInv = ev.invitations.find((inv) => inv.driverId === driver.id);
  if (!myInv) return res.status(403).json({ error: "You weren't invited to this event" });
  if (myInv.status !== "invited") {
    return res
      .status(409)
      .json({ error: `You've already ${myInv.status} this event` });
  }

  const now = new Date().toISOString();

  if (accept) {
    if (driver.assignedEventId && driver.assignedEventId !== ev.id) {
      return res.status(409).json({
        error: "You're already assigned to another event. Stop and clear that assignment first.",
      });
    }
    // First-come-first-serve: reject if the roster is already full.
    if (isFull(ev)) {
      await prisma.invitation.update({
        where: { id: myInv.id },
        data: { status: "closed", respondedAt: now },
      });
      return res.status(409).json({ error: "Registration is closed — this event is full." });
    }

    await prisma.invitation.update({
      where: { id: myInv.id },
      data: { status: "accepted", respondedAt: now },
    });

    // Auto-decline every other open invitation for this driver — they only get one event.
    await prisma.invitation.updateMany({
      where: {
        driverId: driver.id,
        status: "invited",
        eventId: { not: ev.id },
      },
      data: { status: "declined", respondedAt: now },
    });

    await prisma.driver.update({
      where: { id: driver.id },
      data: {
        assignedEventId: ev.id,
        shiftStartedAt: null,
        shiftEndedAt: null,
      },
    });

    // If this acceptance just filled the roster, close every remaining "invited"
    // entry and let those drivers know registration is over.
    if (ev.driverLimit != null) {
      const acceptedNow = await prisma.invitation.count({
        where: { eventId: ev.id, status: "accepted" },
      });
      if (acceptedNow >= ev.driverLimit) {
        const stillOpen = await prisma.invitation.findMany({
          where: { eventId: ev.id, status: "invited" },
          include: { driver: { select: { userId: true } } },
        });
        if (stillOpen.length) {
          await prisma.invitation.updateMany({
            where: { eventId: ev.id, status: "invited" },
            data: { status: "closed", respondedAt: now },
          });
          await prisma.alert.createMany({
            data: stillOpen.map((inv) => ({
              title: `Registration closed: ${ev.title}`,
              message: `"${ev.title}" is now full. Your invitation is no longer accepting responses.`,
              type: "info",
              read: false,
              recipientType: "user",
              recipientUserId: inv.driver.userId,
              recipientEventId: ev.id,
            })),
          });
        }
      }
    }
  } else {
    await prisma.invitation.update({
      where: { id: myInv.id },
      data: { status: "declined", respondedAt: now },
    });
  }

  const updated = await prisma.event.findUnique({
    where: { id: ev.id },
    include: { invitations: true },
  });
  res.json(shapeEvent(updated));
});

// Driver: start a new shift for their currently-assigned event.
// A driver can start as many shifts as they want while assigned — each one is logged.
// Location is REQUIRED: we won't open a shift without coordinates because the
// watchdog auto-stops shifts that go dark on location.
const startShiftSchema = z.object({
  lat: z.coerce.number().refine(Number.isFinite, "lat required"),
  lng: z.coerce.number().refine(Number.isFinite, "lng required"),
});

router.post("/:id/start", requireRole("driver"), async (req, res) => {
  const driver = await prisma.driver.findUnique({ where: { userId: req.user.sub } });
  if (!driver) return res.status(404).json({ error: "Driver record not found" });
  if (driver.assignedEventId !== req.params.id) {
    return res.status(403).json({ error: "You aren't assigned to this event" });
  }
  if (driver.shiftStartedAt && !driver.shiftEndedAt) {
    return res.status(409).json({ error: "You're already on shift" });
  }
  const parsed = startShiftSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Location is required to start a shift. Enable location and try again." });
  }
  const { lat, lng } = parsed.data;
  const startedAt = new Date().toISOString();
  await prisma.shift.create({
    data: {
      driverId: driver.id,
      eventId: req.params.id,
      startedAt,
    },
  });
  const updated = await prisma.driver.update({
    where: { id: driver.id },
    data: {
      shiftStartedAt: startedAt,
      shiftEndedAt: null,
      locationLat: lat,
      locationLng: lng,
      locationUpdatedAt: startedAt,
    },
  });
  res.json(updated);
});

// Driver: stop the currently-open shift. The driver REMAINS assigned to the event
// so they can start another shift later — only an admin unassigns them.
router.post("/:id/stop", requireRole("driver"), async (req, res) => {
  const driver = await prisma.driver.findUnique({ where: { userId: req.user.sub } });
  if (!driver) return res.status(404).json({ error: "Driver record not found" });
  if (driver.assignedEventId !== req.params.id) {
    return res.status(403).json({ error: "You aren't assigned to this event" });
  }
  if (!driver.shiftStartedAt || driver.shiftEndedAt) {
    return res.status(409).json({ error: "You aren't currently on shift" });
  }
  const endedAt = new Date().toISOString();
  const openShift = await prisma.shift.findFirst({
    where: { driverId: driver.id, eventId: req.params.id, endedAt: null },
  });
  if (openShift) {
    await prisma.shift.update({ where: { id: openShift.id }, data: { endedAt } });
  }
  const updated = await prisma.driver.update({
    where: { id: driver.id },
    data: {
      shiftEndedAt: endedAt,
      shiftsCompleted: { increment: 1 },
    },
  });
  res.json(updated);
});

// Group chat: anyone with a stake in the event (admin + invited drivers) can read & post.
async function getEventChatContext(req) {
  const ev = await prisma.event.findUnique({
    where: { id: req.params.id },
    include: { invitations: true },
  });
  if (!ev) return { error: { status: 404, message: "Event not found" } };

  let driver = null;
  if (req.user.role === "driver") {
    driver = await prisma.driver.findUnique({ where: { userId: req.user.sub } });
    const invited = ev.invitations.some((inv) => inv.driverId === driver?.id);
    if (!invited) {
      return { error: { status: 403, message: "You aren't part of this event's chat" } };
    }
  }
  return { ev, driver };
}

router.get("/:id/messages", async (req, res) => {
  const ctx = await getEventChatContext(req);
  if (ctx.error) return res.status(ctx.error.status).json({ error: ctx.error.message });

  const list = await prisma.message.findMany({
    where: { eventId: ctx.ev.id },
    orderBy: { createdAt: "asc" },
  });
  res.json(list);
});

const messageSchema = z.object({
  body: z.string().trim().min(1, "Message cannot be empty").max(2000, "Message too long"),
});

router.post("/:id/messages", async (req, res) => {
  const ctx = await getEventChatContext(req);
  if (ctx.error) return res.status(ctx.error.status).json({ error: ctx.error.message });

  const { body } = messageSchema.parse(req.body);
  const author = await prisma.user.findUnique({ where: { id: req.user.sub } });
  const authorName = author?.name ?? req.user.name ?? "Unknown";

  const msg = await prisma.message.create({
    data: {
      eventId: ctx.ev.id,
      authorUserId: req.user.sub,
      authorName,
      authorRole: req.user.role,
      body,
    },
  });

  // Build recipient list: every admin + every invited driver's user, minus the sender.
  const [admins, invitedDrivers] = await Promise.all([
    prisma.user.findMany({ where: { role: "admin" }, select: { id: true } }),
    prisma.driver.findMany({
      where: { id: { in: ctx.ev.invitations.map((inv) => inv.driverId) } },
      select: { userId: true },
    }),
  ]);
  const recipientUserIds = new Set();
  for (const a of admins) recipientUserIds.add(a.id);
  for (const d of invitedDrivers) recipientUserIds.add(d.userId);
  recipientUserIds.delete(req.user.sub);

  const preview = body.length > 80 ? `${body.slice(0, 80)}…` : body;
  if (recipientUserIds.size) {
    await prisma.alert.createMany({
      data: Array.from(recipientUserIds).map((uid) => ({
        title: `New message in ${ctx.ev.title}`,
        message: `${authorName}: ${preview}`,
        type: "info",
        read: false,
        recipientType: "user",
        recipientUserId: uid,
        recipientEventId: ctx.ev.id,
      })),
    });
  }

  res.status(201).json(msg);
});

// Admin: unassign a driver from their current event (e.g. they cancelled).
router.post("/:id/unassign", requireRole("admin"), async (req, res) => {
  const { driverId } = req.body ?? {};
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) return res.status(404).json({ error: "Driver not found" });
  if (driver.assignedEventId !== req.params.id) {
    return res.status(400).json({ error: "Driver isn't assigned to this event" });
  }
  await prisma.driver.update({
    where: { id: driver.id },
    data: {
      assignedEventId: null,
      shiftStartedAt: null,
      shiftEndedAt: null,
    },
  });
  await prisma.invitation.updateMany({
    where: { eventId: req.params.id, driverId: driver.id },
    data: { status: "declined" },
  });
  res.status(204).end();
});

export default router;
