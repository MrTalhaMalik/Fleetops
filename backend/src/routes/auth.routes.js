import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const imageDataUrl = z
  .string()
  .trim()
  .regex(/^data:image\/(png|jpe?g|webp|heic|heif);base64,/i, "Must be an image upload");

const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().email(),
  phone: z.string().trim().min(1, "Phone is required"),
  password: z.string().min(4, "Password must be at least 4 characters"),
  qidImage: imageDataUrl,
  licenseImage: imageDataUrl,
});

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, name: user.name },
    process.env.JWT_SECRET ?? "dev-secret",
    { expiresIn: process.env.JWT_EXPIRES_IN ?? "7d" },
  );
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatarColor: user.avatarColor,
  };
}

router.post("/login", async (req, res) => {
  const data = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase() },
    include: { driver: true },
  });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const ok = await bcrypt.compare(data.password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  // If user is a driver, block login until admin has approved them.
  if (user.role === "driver" && user.driver && !user.driver.approved) {
    return res.status(403).json({
      error:
        "Your account is awaiting admin approval. We'll let you know once you're cleared to sign in.",
    });
  }

  res.json({ token: signToken(user), user: publicUser(user) });
});

// Driver self-signup. Creates an unapproved driver record — admin must approve before login works.
router.post("/signup", async (req, res) => {
  const data = signupSchema.parse(req.body);
  const email = data.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "An account with that email already exists" });
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const avatarColor = pickAvatarColor();

  await prisma.user.create({
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
          approved: false,
          qidImage: data.qidImage,
          licenseImage: data.licenseImage,
        },
      },
    },
  });

  res
    .status(201)
    .json({ ok: true, message: "Account submitted. An admin will review and approve it." });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(publicUser(user));
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
function pickAvatarColor() {
  return colors[Math.floor(Math.random() * colors.length)];
}

export default router;
