import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);
router.use(requireRole("admin"));

const carCreateSchema = z.object({
  name: z.string().trim().min(1, "Car name is required"),
  model: z.string().trim().default(""),
  plateNumber: z.string().trim().min(1, "Plate number is required"),
  assignedDriverId: z.string().nullable().optional(),
  assignedEventId: z.string().nullable().optional(),
  assignmentStart: z.string().nullable().optional(),
  assignmentEnd: z.string().nullable().optional(),
});

const carUpdateSchema = carCreateSchema.partial();

// Strip the nested driver/event records to flat name strings so the frontend
// can render the table without learning the full Driver/Event shapes.
function shape(car) {
  const { assignedDriver, assignedEvent, ...rest } = car;
  return {
    ...rest,
    assignedDriverName: assignedDriver?.name ?? null,
    assignedEventTitle: assignedEvent?.title ?? null,
  };
}

// Flatten a CarAssignment + joined relations into the log row shape the
// frontend consumes.
function shapeLog(row) {
  return {
    id: row.id,
    carId: row.carId,
    carName: row.car?.name ?? null,
    carModel: row.car?.model ?? null,
    carPlate: row.car?.plateNumber ?? null,
    driverId: row.driverId,
    driverName: row.driver?.name ?? null,
    eventId: row.eventId,
    eventTitle: row.event?.title ?? null,
    startDate: row.startDate,
    endDate: row.endDate,
    createdAt: row.createdAt,
  };
}

// Append a history row when the car has any assignment data. Called after
// every successful create/update; uses post-write values so partial PATCH
// payloads still snapshot a consistent state.
async function snapshotAssignment(car) {
  if (
    !car.assignedDriverId &&
    !car.assignedEventId &&
    !car.assignmentStart &&
    !car.assignmentEnd
  ) {
    return;
  }
  await prisma.carAssignment.create({
    data: {
      carId: car.id,
      driverId: car.assignedDriverId || null,
      eventId: car.assignedEventId || null,
      startDate: car.assignmentStart || null,
      endDate: car.assignmentEnd || null,
    },
  });
}

router.get("/", async (_req, res) => {
  const cars = await prisma.car.findMany({
    include: {
      assignedDriver: { select: { id: true, name: true } },
      assignedEvent: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  res.json(cars.map(shape));
});

router.get("/log", async (_req, res) => {
  const rows = await prisma.carAssignment.findMany({
    include: {
      car: { select: { name: true, model: true, plateNumber: true } },
      driver: { select: { name: true } },
      event: { select: { title: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(rows.map(shapeLog));
});

router.post("/", async (req, res) => {
  const data = carCreateSchema.parse(req.body);

  if (data.assignedDriverId) {
    const driver = await prisma.driver.findUnique({ where: { id: data.assignedDriverId } });
    if (!driver) return res.status(400).json({ error: "Assigned driver not found" });
  }
  if (data.assignedEventId) {
    const event = await prisma.event.findUnique({ where: { id: data.assignedEventId } });
    if (!event) return res.status(400).json({ error: "Assigned event not found" });
  }

  try {
    const car = await prisma.car.create({
      data: {
        name: data.name,
        model: data.model,
        plateNumber: data.plateNumber,
        assignedDriverId: data.assignedDriverId || null,
        assignedEventId: data.assignedEventId || null,
        assignmentStart: data.assignmentStart || null,
        assignmentEnd: data.assignmentEnd || null,
      },
      include: {
        assignedDriver: { select: { id: true, name: true } },
        assignedEvent: { select: { id: true, title: true } },
      },
    });
    await snapshotAssignment(car);
    res.status(201).json(shape(car));
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "A car with that plate number already exists" });
    }
    throw err;
  }
});

router.patch("/:id", async (req, res) => {
  const data = carUpdateSchema.parse(req.body);

  if (data.assignedDriverId) {
    const driver = await prisma.driver.findUnique({ where: { id: data.assignedDriverId } });
    if (!driver) return res.status(400).json({ error: "Assigned driver not found" });
  }
  if (data.assignedEventId) {
    const event = await prisma.event.findUnique({ where: { id: data.assignedEventId } });
    if (!event) return res.status(400).json({ error: "Assigned event not found" });
  }

  // Decide whether this PATCH touches assignment fields. If it does, snapshot
  // a new log row after the write. A name/model/plate-only edit does NOT
  // append to the log — only assignment changes do.
  const touchesAssignment =
    data.assignedDriverId !== undefined ||
    data.assignedEventId !== undefined ||
    data.assignmentStart !== undefined ||
    data.assignmentEnd !== undefined;

  try {
    const car = await prisma.car.update({
      where: { id: req.params.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.model !== undefined && { model: data.model }),
        ...(data.plateNumber !== undefined && { plateNumber: data.plateNumber }),
        ...(data.assignedDriverId !== undefined && {
          assignedDriverId: data.assignedDriverId || null,
        }),
        ...(data.assignedEventId !== undefined && {
          assignedEventId: data.assignedEventId || null,
        }),
        ...(data.assignmentStart !== undefined && {
          assignmentStart: data.assignmentStart || null,
        }),
        ...(data.assignmentEnd !== undefined && {
          assignmentEnd: data.assignmentEnd || null,
        }),
      },
      include: {
        assignedDriver: { select: { id: true, name: true } },
        assignedEvent: { select: { id: true, title: true } },
      },
    });
    if (touchesAssignment) await snapshotAssignment(car);
    res.json(shape(car));
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Car not found" });
    if (err.code === "P2002") {
      return res.status(409).json({ error: "A car with that plate number already exists" });
    }
    throw err;
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await prisma.car.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Car not found" });
    throw err;
  }
});

export default router;
