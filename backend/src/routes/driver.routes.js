import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { withStatus, withoutDocs } from "../db/driver-status.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const adminCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().email(),
  phone: z.string().trim().default(""),
  password: z.string().min(4).default("1234"),
  city: z.string().optional().default(""),
  licenseClass: z.string().optional().default(""),
  licenseExpiry: z.string().optional().default(""),
});

const colors = [
  "bg-amber-500",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-rose-500",
  "bg-violet-500",
  "bg-cyan-500",
  "bg-orange-500",
  "bg-pink-500",
];
const pickColor = () => colors[Math.floor(Math.random() * colors.length)];

router.get("/", async (_req, res) => {
  const drivers = await prisma.driver.findMany({ orderBy: { createdAt: "asc" } });
  res.json(drivers.map((d) => withoutDocs(withStatus(d))));
});

router.get("/pending", requireRole("admin"), async (_req, res) => {
  const drivers = await prisma.driver.findMany({
    where: { approved: false },
    orderBy: { createdAt: "asc" },
  });
  res.json(drivers.map((d) => withoutDocs(withStatus(d))));
});

router.get("/me", async (req, res) => {
  const driver = await prisma.driver.findUnique({ where: { userId: req.user.sub } });
  if (!driver) return res.status(404).json({ error: "Driver record not found" });
  res.json(withoutDocs(withStatus(driver)));
});

// Group a driver's shifts per event with per-event + grand totals.
async function loadShiftGroupsForDriver(driverId) {
  const shifts = await prisma.shift.findMany({
    where: { driverId },
    include: { event: true },
    orderBy: { startedAt: "desc" },
  });

  const groups = new Map();
  for (const shift of shifts) {
    const ev = shift.event;
    const key = shift.eventId;
    if (!groups.has(key)) {
      groups.set(key, {
        eventId: shift.eventId,
        eventTitle: ev?.title ?? "(deleted event)",
        eventLocation: ev?.location ?? "",
        eventStartDate: ev?.startDate ?? null,
        eventEndDate: ev?.endDate ?? null,
        shifts: [],
        totalMs: 0,
      });
    }
    const group = groups.get(key);
    const start = shift.startedAt ? new Date(shift.startedAt).getTime() : null;
    const end = shift.endedAt
      ? new Date(shift.endedAt).getTime()
      : Date.now(); // count in-progress shift up to now
    const durationMs = start ? Math.max(0, end - start) : 0;
    group.shifts.push({
      id: shift.id,
      startedAt: shift.startedAt,
      endedAt: shift.endedAt,
      durationMs,
      ongoing: !shift.endedAt,
    });
    group.totalMs += durationMs;
  }

  return Array.from(groups.values());
}

// Driver: every shift they've ever logged, grouped per event with totals.
router.get("/me/shifts", requireRole("driver"), async (req, res) => {
  const driver = await prisma.driver.findUnique({ where: { userId: req.user.sub } });
  if (!driver) return res.status(404).json({ error: "Driver record not found" });
  res.json(await loadShiftGroupsForDriver(driver.id));
});

// Admin: same shape as /me/shifts but for any driver by id.
router.get("/:id/shifts", requireRole("admin"), async (req, res) => {
  const driver = await prisma.driver.findUnique({
    where: { id: req.params.id },
    select: { id: true },
  });
  if (!driver) return res.status(404).json({ error: "Driver not found" });
  res.json(await loadShiftGroupsForDriver(driver.id));
});

router.get("/:id", async (req, res) => {
  const driver = await prisma.driver.findUnique({ where: { id: req.params.id } });
  if (!driver) return res.status(404).json({ error: "Driver not found" });
  if (req.user.role !== "admin" && driver.userId !== req.user.sub) {
    return res.status(403).json({ error: "Forbidden" });
  }
  res.json(withoutDocs(withStatus(driver)));
});

// Admin-only: return the QID + license image data URLs for a driver. Fetched on demand.
router.get("/:id/documents", requireRole("admin"), async (req, res) => {
  const driver = await prisma.driver.findUnique({
    where: { id: req.params.id },
    select: { qidImage: true, licenseImage: true },
  });
  if (!driver) return res.status(404).json({ error: "Driver not found" });
  res.json({
    qidImage: driver.qidImage ?? null,
    licenseImage: driver.licenseImage ?? null,
  });
});

// Admin: create + approve a driver in one step.
router.post("/", requireRole("admin"), async (req, res) => {
  const data = adminCreateSchema.parse(req.body);
  const email = data.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "An account with that email already exists" });
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const avatarColor = pickColor();

  const user = await prisma.user.create({
    data: {
      email,
      name: data.name,
      role: "driver",
      passwordHash,
      avatarColor,
      phone: data.phone,
      driver: {
        create: {
          name: data.name,
          email,
          phone: data.phone,
          avatarColor,
          city: data.city,
          licenseClass: data.licenseClass,
          licenseExpiry: data.licenseExpiry,
          approved: true,
        },
      },
    },
    include: { driver: true },
  });

  res.status(201).json(withoutDocs(withStatus(user.driver)));
});

// Admin: approve a pending driver (allows them to log in).
router.post("/:id/approve", requireRole("admin"), async (req, res) => {
  try {
    const driver = await prisma.driver.update({
      where: { id: req.params.id },
      data: { approved: true },
    });
    res.json(withoutDocs(withStatus(driver)));
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Driver not found" });
    throw err;
  }
});

// Admin: reject (delete) a pending driver.
router.post("/:id/reject", requireRole("admin"), async (req, res) => {
  const driver = await prisma.driver.findUnique({ where: { id: req.params.id } });
  if (!driver) return res.status(404).json({ error: "Driver not found" });
  if (driver.approved) {
    return res.status(400).json({ error: "Cannot reject an already-approved driver" });
  }
  // Deleting the user cascades to the driver via the unique FK.
  await prisma.user.delete({ where: { id: driver.userId } });
  res.status(204).end();
});

router.patch("/:id", requireRole("admin"), async (req, res) => {
  const { status, assignedEventId, shiftStartedAt, shiftEndedAt, location, ...rest } = req.body;
  // Whitelist editable scalar fields so callers can't reach into ID/timestamp columns.
  const allowed = ["name", "email", "phone", "avatarColor", "city", "licenseClass", "licenseExpiry", "experienceYears", "rating", "shiftsCompleted", "hoursThisWeek"];
  const data = {};
  for (const key of allowed) {
    if (rest[key] !== undefined) data[key] = rest[key];
  }
  try {
    const driver = await prisma.driver.update({ where: { id: req.params.id }, data });
    res.json(withoutDocs(withStatus(driver)));
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Driver not found" });
    throw err;
  }
});

router.delete("/:id", requireRole("admin"), async (req, res) => {
  const driver = await prisma.driver.findUnique({ where: { id: req.params.id } });
  if (!driver) return res.status(404).json({ error: "Driver not found" });
  await prisma.user.delete({ where: { id: driver.userId } });
  res.status(204).end();
});

router.post("/me/location", requireRole("driver"), async (req, res) => {
  const driver = await prisma.driver.findUnique({ where: { userId: req.user.sub } });
  if (!driver) return res.status(404).json({ error: "Driver record not found" });
  const updated = await prisma.driver.update({
    where: { id: driver.id },
    data: {
      locationLat: Number(req.body.lat),
      locationLng: Number(req.body.lng),
      locationUpdatedAt: new Date().toISOString(),
    },
  });
  res.json(withStatus(updated));
});

export default router;
