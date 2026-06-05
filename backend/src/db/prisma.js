// Single PrismaClient instance — reused across the process. With `node --watch`
// in dev, restarts kill the process anyway so the connection pool isn't leaked.
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "production" ? ["error"] : ["error", "warn"],
});
