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
  assignmentStart: z.string().nullable().optional(),
  assignmentEnd: z.string().nullable().optional(),
});

const carUpdateSchema = carCreateSchema.partial();

// Strip the nested driver record to a flat { id, name } so the frontend can render
// "Assigned to" without learning the full Driver shape.
function shape(car) {
  const { assignedDriver, ...rest } = car;
  return {
    ...rest,
    assignedDriverName: assignedDriver?.name ?? null,
  };
}

router.get("/", async (_req, res) => {
  const cars = await prisma.car.findMany({
    include: { assignedDriver: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  res.json(cars.map(shape));
});

router.post("/", async (req, res) => {
  const data = carCreateSchema.parse(req.body);

  if (data.assignedDriverId) {
    const driver = await prisma.driver.findUnique({ where: { id: data.assignedDriverId } });
    if (!driver) return res.status(400).json({ error: "Assigned driver not found" });
  }

  try {
    const car = await prisma.car.create({
      data: {
        name: data.name,
        model: data.model,
        plateNumber: data.plateNumber,
        assignedDriverId: data.assignedDriverId || null,
        assignmentStart: data.assignmentStart || null,
        assignmentEnd: data.assignmentEnd || null,
      },
      include: { assignedDriver: { select: { id: true, name: true } } },
    });
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
        ...(data.assignmentStart !== undefined && {
          assignmentStart: data.assignmentStart || null,
        }),
        ...(data.assignmentEnd !== undefined && {
          assignmentEnd: data.assignmentEnd || null,
        }),
      },
      include: { assignedDriver: { select: { id: true, name: true } } },
    });
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
