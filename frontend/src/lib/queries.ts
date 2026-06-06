import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type {
  AlertItem,
  AlertRecipientType,
  Car,
  CarLogEntry,
  DashboardStats,
  Driver,
  EventItem,
  EventMessage,
  EventStatus,
  ShiftLogGroup,
} from "./types";

// ---------- Drivers
export function useDrivers() {
  return useQuery<Driver[]>({
    queryKey: ["drivers"],
    queryFn: () => api("/drivers"),
    // Light polling keeps the live map's driver positions current without manual refresh.
    refetchInterval: 5000,
  });
}

export function usePendingDrivers() {
  return useQuery<Driver[]>({
    queryKey: ["drivers", "pending"],
    queryFn: () => api("/drivers/pending"),
  });
}

export function useMyDriver(enabled = true) {
  return useQuery<Driver>({
    queryKey: ["drivers", "me"],
    queryFn: () => api("/drivers/me"),
    enabled,
  });
}

export type AdminCreateDriverInput = {
  name: string;
  email: string;
  phone: string;
  password: string;
  city?: string;
  licenseClass?: string;
  licenseExpiry?: string;
};

export function useCreateDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AdminCreateDriverInput) =>
      api<Driver>("/drivers", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["drivers"] }),
  });
}

export type DriverDocuments = {
  qidImage: string | null;
  licenseImage: string | null;
};

export function useDriverDocuments(driverId: string | null | undefined) {
  return useQuery<DriverDocuments>({
    queryKey: ["drivers", driverId, "documents"],
    queryFn: () => api(`/drivers/${driverId}/documents`),
    enabled: Boolean(driverId),
    staleTime: 60_000,
  });
}

export function useApproveDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<Driver>(`/drivers/${id}/approve`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["drivers"] }),
  });
}

export function useRejectDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/drivers/${id}/reject`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["drivers"] }),
  });
}

export function useDeleteDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/drivers/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["drivers"] }),
  });
}

// ---------- Events
export function useEvents() {
  return useQuery<EventItem[]>({ queryKey: ["events"], queryFn: () => api("/events") });
}

export type EventInput = {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  status: EventStatus;
  invitedDriverIds: string[];
  driverLimit: number | null;
};

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EventInput) =>
      api<EventItem>("/events", { method: "POST", body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["alerts"] });
    },
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<EventInput> }) =>
      api<EventItem>(`/events/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["alerts"] });
    },
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/events/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["drivers"] });
    },
  });
}

export function useInviteDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, driverId }: { eventId: string; driverId: string }) =>
      api<EventItem>(`/events/${eventId}/invite`, {
        method: "POST",
        body: { driverId },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["alerts"] });
    },
  });
}

export function useRespondToInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, accept }: { eventId: string; accept: boolean }) =>
      api<EventItem>(`/events/${eventId}/respond`, {
        method: "POST",
        body: { accept },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["drivers"] });
    },
  });
}

export function useStartShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, lat, lng }: { eventId: string; lat: number; lng: number }) =>
      api<Driver>(`/events/${eventId}/start`, {
        method: "POST",
        body: { lat, lng },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drivers"] });
      qc.invalidateQueries({ queryKey: ["shifts", "me"] });
    },
  });
}

export function useUpdateMyLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lat, lng }: { lat: number; lng: number }) =>
      api<Driver>("/drivers/me/location", {
        method: "POST",
        body: { lat, lng },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drivers"] });
    },
  });
}

export function useStopShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) =>
      api<Driver>(`/events/${eventId}/stop`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drivers"] });
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["shifts", "me"] });
    },
  });
}

export function useMyShifts() {
  return useQuery<ShiftLogGroup[]>({
    queryKey: ["shifts", "me"],
    queryFn: () => api("/drivers/me/shifts"),
  });
}

export function useDriverShifts(driverId: string | null | undefined) {
  return useQuery<ShiftLogGroup[]>({
    queryKey: ["shifts", "driver", driverId],
    queryFn: () => api(`/drivers/${driverId}/shifts`),
    enabled: Boolean(driverId),
  });
}

export function useEventMessages(eventId: string | null | undefined) {
  return useQuery<EventMessage[]>({
    queryKey: ["events", eventId, "messages"],
    queryFn: () => api(`/events/${eventId}/messages`),
    enabled: Boolean(eventId),
    refetchInterval: 5000,
  });
}

export function useSendEventMessage(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      api<EventMessage>(`/events/${eventId}/messages`, {
        method: "POST",
        body: { body },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events", eventId, "messages"] });
      qc.invalidateQueries({ queryKey: ["alerts"] });
    },
  });
}

export function useUnassignDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, driverId }: { eventId: string; driverId: string }) =>
      api(`/events/${eventId}/unassign`, { method: "POST", body: { driverId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["drivers"] });
    },
  });
}

// ---------- Alerts
export function useAlerts() {
  return useQuery<AlertItem[]>({ queryKey: ["alerts"], queryFn: () => api("/alerts") });
}

export type AlertInput = {
  title: string;
  message: string;
  type: "emergency" | "shift" | "system" | "info";
  recipientType: AlertRecipientType;
  recipientEventId?: string | null;
  recipientUserId?: string | null;
};

export function useCreateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AlertInput) =>
      api<AlertItem>("/alerts", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });
}

export function useToggleAlertRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, read }: { id: string; read: boolean }) =>
      api<AlertItem>(`/alerts/${id}/read`, { method: "PATCH", body: { read } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });
}

export function useDeleteAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/alerts/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });
}

// ---------- Cars
export function useCars() {
  return useQuery<Car[]>({
    queryKey: ["cars"],
    queryFn: () => api("/cars"),
  });
}

export function useCarLog() {
  return useQuery<CarLogEntry[]>({
    queryKey: ["cars", "log"],
    queryFn: () => api("/cars/log"),
  });
}

export type CarInput = {
  name: string;
  model: string;
  plateNumber: string;
  assignedDriverId: string | null;
  assignedEventId: string | null;
  assignmentStart: string | null;
  assignmentEnd: string | null;
};

export function useCreateCar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CarInput) => api<Car>("/cars", { method: "POST", body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cars"] });
    },
  });
}

export function useUpdateCar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CarInput> }) =>
      api<Car>(`/cars/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cars"] });
    },
  });
}

export function useDeleteCar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/cars/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cars"] }),
  });
}

// ---------- Stats
export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ["stats", "dashboard"],
    queryFn: () => api("/stats/dashboard"),
  });
}
