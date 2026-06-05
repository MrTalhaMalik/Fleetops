"use client";

import { useAuth } from "@/lib/auth-context";
import { AdminDashboard } from "./admin";
import { DriverDashboard } from "./driver";

export default function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;
  return user.role === "admin" ? <AdminDashboard /> : <DriverDashboard />;
}
