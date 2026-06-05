export type Role = "admin" | "driver";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarColor: string;
};

export type DriverStatus = "pending" | "available" | "off-duty" | "on-duty";

export type Driver = {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  avatarColor: string;
  city: string;
  licenseClass: string;
  licenseExpiry: string;
  experienceYears: number;
  approved: boolean;
  assignedEventId: string | null;
  shiftStartedAt: string | null;
  shiftEndedAt: string | null;
  status: DriverStatus;
  rating: number;
  shiftsCompleted: number;
  hoursThisWeek: number;
  location: { lat: number; lng: number; updatedAt?: string };
  documents?: { name: string; status: "verified" | "pending" | "expires-soon" }[];
};

export type EventStatus = "upcoming" | "ongoing" | "completed";

export type InvitationStatus = "invited" | "accepted" | "declined" | "closed";

export type Invitation = {
  driverId: string;
  status: InvitationStatus;
  invitedAt: string;
  respondedAt: string | null;
};

export type EventItem = {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  status: EventStatus;
  driverLimit: number | null;
  invitations: Invitation[];
  attendees: number;
};

export type EventMessage = {
  id: string;
  eventId: string;
  authorUserId: string;
  authorName: string;
  authorRole: Role;
  body: string;
  createdAt: string;
};

export type AlertRecipientType = "all-drivers" | "event-drivers" | "user" | "admin";

export type AlertItem = {
  id: string;
  title: string;
  message: string;
  type: "emergency" | "shift" | "system" | "info";
  read: boolean;
  recipientType: AlertRecipientType;
  recipientEventId?: string | null;
  recipientUserId?: string | null;
  createdAt?: string;
};

export type ShiftEntry = {
  id: string;
  startedAt: string;
  endedAt: string | null;
  durationMs: number;
  ongoing: boolean;
};

export type ShiftLogGroup = {
  eventId: string;
  eventTitle: string;
  eventLocation: string;
  eventStartDate: string | null;
  eventEndDate: string | null;
  shifts: ShiftEntry[];
  totalMs: number;
};

export type Car = {
  id: string;
  name: string;
  model: string;
  plateNumber: string;
  assignedDriverId: string | null;
  assignedDriverName: string | null;
  assignmentStart: string | null;
  assignmentEnd: string | null;
  createdAt?: string;
};

export type DashboardStats = {
  totalDrivers: number;
  pendingDrivers: number;
  activeNow: number;
  activeShifts: number;
  upcomingEvents: number;
  totalAlerts: number;
};
