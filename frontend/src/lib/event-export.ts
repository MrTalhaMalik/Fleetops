import { api } from "./api";

type ExportEvent = {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
};

type ExportMessage = {
  createdAt: string;
  authorName: string;
  authorRole: string;
  body: string;
};

type ExportCarAssignment = {
  driverId: string | null;
  driverName: string | null;
  carName: string | null;
  carModel: string | null;
  carPlate: string | null;
  startDate: string | null;
  endDate: string | null;
};

type ExportShift = {
  driverId: string;
  driverName: string | null;
  startedAt: string;
  endedAt: string | null;
  durationMs: number;
  ongoing: boolean;
};

type ExportPayload = {
  event: ExportEvent;
  messages: ExportMessage[];
  carAssignments: ExportCarAssignment[];
  shifts: ExportShift[];
};

function formatDateTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function formatDuration(ms: number) {
  if (!ms || ms < 0) return "0h 0m";
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function safeFileName(name: string) {
  // Strip characters Windows/macOS reject in filenames so the download lands cleanly.
  return name.replace(/[\\/:*?"<>|]+/g, "_").trim() || "event";
}

export async function exportEventToXlsx(eventId: string) {
  const data = await api<ExportPayload>(`/events/${eventId}/export-data`);
  const XLSX = await import("xlsx");

  const wb = XLSX.utils.book_new();

  // Sheet 1 — All chats
  const chatsRows = data.messages.length
    ? data.messages.map((m) => ({
        "Date / Time": formatDateTime(m.createdAt),
        Author: m.authorName,
        Role: m.authorRole,
        Message: m.body,
      }))
    : [{ "Date / Time": "", Author: "", Role: "", Message: "(no chat messages)" }];
  const chatsSheet = XLSX.utils.json_to_sheet(chatsRows, {
    header: ["Date / Time", "Author", "Role", "Message"],
  });
  chatsSheet["!cols"] = [{ wch: 22 }, { wch: 22 }, { wch: 10 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, chatsSheet, "All chats");

  // Sheet 2 — Car info (each row is one car-to-driver assignment for this event).
  // Kilometers travelled is included per request; we don't track odometer/route
  // distance yet so the column stays blank for now.
  const carRows = data.carAssignments.length
    ? data.carAssignments.map((c) => ({
        Driver: c.driverName ?? "(unassigned)",
        "Car name": c.carName ?? "",
        Model: c.carModel ?? "",
        "Plate number": c.carPlate ?? "",
        "Start date": c.startDate ?? "",
        "End date": c.endDate ?? "",
        "Kilometers travelled": "",
      }))
    : [
        {
          Driver: "",
          "Car name": "",
          Model: "",
          "Plate number": "",
          "Start date": "",
          "End date": "",
          "Kilometers travelled": "(no cars assigned to this event)",
        },
      ];
  const carSheet = XLSX.utils.json_to_sheet(carRows, {
    header: [
      "Driver",
      "Car name",
      "Model",
      "Plate number",
      "Start date",
      "End date",
      "Kilometers travelled",
    ],
  });
  carSheet["!cols"] = [
    { wch: 24 },
    { wch: 22 },
    { wch: 22 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, carSheet, "Car info");

  // Sheet 3 — Shift info (one row per shift, sorted per driver so it reads
  // as "Driver A: shift 1, shift 2, …  Driver B: shift 1, …").
  const sortedShifts = [...data.shifts].sort((a, b) => {
    const nameCmp = (a.driverName ?? "").localeCompare(b.driverName ?? "");
    if (nameCmp !== 0) return nameCmp;
    return (a.startedAt ?? "").localeCompare(b.startedAt ?? "");
  });
  const shiftRows = sortedShifts.length
    ? sortedShifts.map((s) => ({
        Driver: s.driverName ?? "(deleted driver)",
        "Shift start": formatDateTime(s.startedAt),
        "Shift end": s.endedAt ? formatDateTime(s.endedAt) : "",
        Duration: formatDuration(s.durationMs),
        Status: s.ongoing ? "Ongoing" : "Completed",
      }))
    : [
        {
          Driver: "",
          "Shift start": "",
          "Shift end": "",
          Duration: "",
          Status: "(no shifts logged for this event)",
        },
      ];
  const shiftSheet = XLSX.utils.json_to_sheet(shiftRows, {
    header: ["Driver", "Shift start", "Shift end", "Duration", "Status"],
  });
  shiftSheet["!cols"] = [
    { wch: 24 },
    { wch: 22 },
    { wch: 22 },
    { wch: 12 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, shiftSheet, "Shift info");

  const filename = `FleetOps - ${safeFileName(data.event.title)} - export.xlsx`;
  XLSX.writeFile(wb, filename);
}
