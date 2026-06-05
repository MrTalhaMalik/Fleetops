"use client";

import {
  Calendar,
  Camera,
  Clock,
  FileCheck2,
  IdCard,
  Mail,
  MapPin,
  Phone,
  Star,
  Truck,
  Upload,
} from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { PageLoading, ErrorState } from "@/components/ui/loading";
import { useMyDriver } from "@/lib/queries";
import { cn } from "@/lib/cn";

export default function ProfilePage() {
  const { data: driver, isLoading, error, refetch } = useMyDriver();
  const [available, setAvailable] = useState(true);

  if (isLoading && !driver) return <PageLoading label="Loading your profile…" />;
  if (error || !driver) return <ErrorState message="Could not load profile" onRetry={() => refetch()} />;

  return (
    <div>
      <PageHeader
        title="My profile"
        description="Manage your personal info, license, and documents."
        actions={
          <Button variant="outline" size="md">
            Cancel
          </Button>
        }
      />

      <Card className="mb-6 overflow-hidden">
        <div className="h-32 bg-gradient-to-br from-sidebar to-sidebar-soft" />
        <div className="-mt-16 px-6 pb-6">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="relative">
                <Avatar
                  name={driver.name}
                  color={driver.avatarColor}
                  size="xl"
                  className="size-28 text-3xl ring-4 ring-surface"
                />
                <button className="absolute bottom-1 right-1 flex size-8 items-center justify-center rounded-full bg-foreground text-white shadow-md hover:scale-105">
                  <Camera className="size-3.5" />
                </button>
              </div>
              <div className="pb-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">{driver.name}</h2>
                  <Badge tone="brand" dot>
                    Verified
                  </Badge>
                </div>
                <p className="mt-0.5 text-sm text-muted">
                  Driver · {driver.experienceYears} years experience
                </p>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Star className="size-3.5 fill-amber-400 text-amber-400" />
                    {driver.rating > 0 ? driver.rating.toFixed(2) : "—"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Truck className="size-3.5" />
                    {driver.shiftsCompleted} shifts
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" />
                    {driver.city}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border-soft p-3 sm:w-auto">
              <div>
                <p className="text-sm font-semibold">Available for shifts</p>
                <p className="text-xs text-muted">
                  {available ? "Drivers can be auto-assigned" : "Won't receive assignments"}
                </p>
              </div>
              <button
                onClick={() => setAvailable((s) => !s)}
                className={cn(
                  "relative h-6 w-11 rounded-full transition-colors",
                  available ? "bg-success" : "bg-border",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform",
                    available ? "translate-x-5" : "translate-x-0.5",
                  )}
                />
              </button>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Personal information</CardTitle>
            <Button variant="ghost" size="sm">
              Save changes
            </Button>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field icon={<IdCard className="size-4" />} label="Full name" value={driver.name} />
            <Field icon={<Mail className="size-4" />} label="Email" value={driver.email} />
            <Field icon={<Phone className="size-4" />} label="Phone" value={driver.phone} />
            <Field icon={<MapPin className="size-4" />} label="Home city" value={driver.city} />
            <Field icon={<Calendar className="size-4" />} label="Date of birth" value="March 14, 1992" />
            <Field icon={<Clock className="size-4" />} label="Preferred shift" value="Morning · 6 AM – 2 PM" />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>License details</CardTitle>
              <Badge tone="success">Valid</Badge>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-border-soft pb-2">
                <span className="text-muted">Class</span>
                <span className="font-medium">{driver.licenseClass}</span>
              </div>
              <div className="flex justify-between border-b border-border-soft pb-2">
                <span className="text-muted">Expiry</span>
                <span className="font-medium">{driver.licenseExpiry}</span>
              </div>
              <div className="flex justify-between border-b border-border-soft pb-2">
                <span className="text-muted">Issued</span>
                <span className="font-medium">CA, USA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Endorsements</span>
                <span className="font-medium">None</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(driver.documents ?? []).map((doc) => (
                <div
                  key={doc.name}
                  className="flex items-center justify-between rounded-xl border border-border-soft p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
                      <FileCheck2 className="size-4" />
                    </span>
                    <p className="text-sm font-medium">{doc.name}</p>
                  </div>
                  <Badge tone={doc.status === "verified" ? "success" : "warning"}>
                    {doc.status === "verified" ? "Verified" : "Expires soon"}
                  </Badge>
                </div>
              ))}
              <button className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-background py-4 text-sm font-medium text-muted hover:border-brand hover:text-brand-strong">
                <Upload className="size-4" /> Upload document
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted">
        {icon} {label}
      </label>
      <Input defaultValue={value} />
    </div>
  );
}
