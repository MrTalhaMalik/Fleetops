"use client";

import { useAuth } from "@/lib/auth-context";
import { AdminEvents } from "./admin";
import { DriverEvents } from "./driver";

export default function EventsPage() {
  const { user } = useAuth();
  if (!user) return null;
  return user.role === "admin" ? <AdminEvents /> : <DriverEvents />;
}
