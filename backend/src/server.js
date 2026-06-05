import "dotenv/config";
import "express-async-errors";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { z } from "zod";

import authRoutes from "./routes/auth.routes.js";
import driverRoutes from "./routes/driver.routes.js";
import eventRoutes from "./routes/event.routes.js";
import alertRoutes from "./routes/alert.routes.js";
import statsRoutes from "./routes/stats.routes.js";
import carRoutes from "./routes/car.routes.js";
import { startLocationWatchdog } from "./jobs/location-watchdog.js";

const app = express();

// Accept multiple origins via comma-separated CORS_ORIGIN (e.g. "https://app.example.com,https://staging.example.com").
const corsOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json({ limit: "12mb" }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use("/api/auth", authRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/cars", carRoutes);

app.use((req, res) => res.status(404).json({ error: "Not found", path: req.originalUrl }));

app.use((err, _req, res, _next) => {
  if (err instanceof z.ZodError) {
    return res.status(400).json({ error: "Validation failed", details: err.flatten() });
  }
  console.error(err);
  const status = err.status ?? 500;
  res.status(status).json({ error: err.message ?? "Internal server error" });
});

const PORT = process.env.PORT ?? 4000;

startLocationWatchdog();
console.log("[fleetops] location watchdog started");
app.listen(PORT, () => console.log(`[fleetops] api listening on http://localhost:${PORT}`));
