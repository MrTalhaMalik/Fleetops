import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const alertSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  message: z.string().trim().min(1, "Message is required"),
  type: z.enum(["emergency", "shift", "system", "info"]).default("info"),
  recipientType: z.enum(["all-drivers", "event-drivers", "user", "admin"]).default("all-drivers"),
  recipientEventId: z.string().nullable().optional(),
  recipientUserId: z.string().nullable().optional(),
});

// Build the WHERE clause that captures every alert the current user can see.
function visibilityWhere(user) {
  if (user.role === "admin") {
    return {
      OR: [
        { recipientType: "admin" },
        { recipientType: "user", recipientUserId: user.sub },
      ],
    };
  }
  // Drivers see broadcasts, their own direct alerts, and event-targeted alerts
  // for events they've accepted.
  return {
    OR: [
      { recipientType: "all-drivers" },
      { recipientType: "user", recipientUserId: user.sub },
      {
        recipientType: "event-drivers",
        recipientEvent: {
          invitations: {
            some: {
              status: "accepted",
              driver: { userId: user.sub },
            },
          },
        },
      },
    ],
  };
}

router.get("/", async (req, res) => {
  const list = await prisma.alert.findMany({
    where: visibilityWhere(req.user),
    orderBy: { createdAt: "desc" },
  });
  res.json(list);
});

router.post("/", requireRole("admin"), async (req, res) => {
  const data = alertSchema.parse(req.body);

  if (data.recipientType === "event-drivers" && !data.recipientEventId) {
    return res
      .status(400)
      .json({ error: "recipientEventId is required when targeting event drivers" });
  }
  if (data.recipientType === "user" && !data.recipientUserId) {
    return res
      .status(400)
      .json({ error: "recipientUserId is required when targeting a user" });
  }

  const alert = await prisma.alert.create({
    data: {
      title: data.title,
      message: data.message,
      type: data.type,
      read: false,
      recipientType: data.recipientType,
      recipientEventId: data.recipientEventId ?? null,
      recipientUserId: data.recipientUserId ?? null,
    },
  });
  res.status(201).json(alert);
});

async function canSee(alert, user) {
  if (!alert) return false;
  switch (alert.recipientType) {
    case "user":
      return alert.recipientUserId === user.sub;
    case "admin":
      return user.role === "admin";
    case "all-drivers":
      return user.role === "driver";
    case "event-drivers": {
      if (user.role !== "driver" || !alert.recipientEventId) return false;
      const accepted = await prisma.invitation.findFirst({
        where: {
          eventId: alert.recipientEventId,
          status: "accepted",
          driver: { userId: user.sub },
        },
        select: { id: true },
      });
      return Boolean(accepted);
    }
    default:
      return false;
  }
}

router.patch("/:id/read", async (req, res) => {
  const alert = await prisma.alert.findUnique({ where: { id: req.params.id } });
  if (!alert) return res.status(404).json({ error: "Alert not found" });
  if (!(await canSee(alert, req.user))) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const updated = await prisma.alert.update({
    where: { id: alert.id },
    data: { read: req.body.read ?? true },
  });
  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const alert = await prisma.alert.findUnique({ where: { id: req.params.id } });
  if (!alert) return res.status(404).json({ error: "Alert not found" });

  // Only the targeted user can delete a user-targeted alert; otherwise admin only.
  if (alert.recipientType === "user") {
    if (alert.recipientUserId !== req.user.sub && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
  } else if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  await prisma.alert.delete({ where: { id: alert.id } });
  res.status(204).end();
});

export default router;
