"use client";

import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { PageLoading, ErrorState } from "@/components/ui/loading";
import { useDrivers } from "@/lib/queries";
import type { Driver } from "@/lib/types";
import { cn } from "@/lib/cn";

const MapboxMap = dynamic(() => import("./mapbox-map").then((m) => m.MapboxMap), {
  ssr: false,
  loading: () => <div className="size-full skeleton rounded-2xl" />,
});

export default function LiveMapPage() {
  const { data: drivers = [], isLoading, error, refetch } = useDrivers();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Driver | null>(null);

  useEffect(() => {
    if (!selected && drivers.length > 0) setSelected(drivers[0]);
  }, [selected, drivers]);

  const filteredDrivers = useMemo(
    () =>
      drivers.filter((d) =>
        query
          ? d.name.toLowerCase().includes(query.toLowerCase()) ||
            d.city.toLowerCase().includes(query.toLowerCase())
          : true,
      ),
    [drivers, query],
  );

  const onShift = drivers.filter((d) => d.status === "on-duty");

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col lg:h-[calc(100vh-8rem)] lg:min-h-0">
      <PageHeader
        title="Live map"
        description={
          isLoading ? "Loading drivers…" : `Tracking ${onShift.length} drivers in real time`
        }
        actions={
          <div className="flex items-center gap-2">
            <Badge tone="success" dot>
              Live
            </Badge>
          </div>
        }
      />

      {isLoading && drivers.length === 0 ? (
        <PageLoading label="Loading map data…" />
      ) : error ? (
        <ErrorState message="Could not load driver locations" onRetry={() => refetch()} />
      ) : (
        <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[320px_1fr] lg:overflow-hidden">
          <Card className="order-2 flex max-h-[50vh] flex-col overflow-hidden lg:order-none lg:max-h-none">
            <div className="border-b border-border-soft p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-soft" />
                <input
                  type="search"
                  placeholder="Search drivers..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-soft focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
                />
              </div>
              <p className="mt-3 text-xs font-medium uppercase tracking-wider text-muted">
                {filteredDrivers.length} drivers
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {filteredDrivers.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelected(d)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors",
                    selected?.id === d.id
                      ? "bg-brand-soft/60 ring-1 ring-brand/30"
                      : "hover:bg-border-soft",
                  )}
                >
                  <Avatar name={d.name} color={d.avatarColor} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{d.name}</p>
                    <p className="truncate text-xs text-muted">{d.city}</p>
                  </div>
                  <Badge
                    tone={
                      d.status === "on-duty"
                        ? "success"
                        : d.status === "available"
                          ? "info"
                          : "muted"
                    }
                    dot
                  />
                </button>
              ))}
            </div>
          </Card>

          <Card className="relative order-1 h-[65vh] overflow-hidden lg:order-none lg:h-auto">
            <MapboxMap drivers={filteredDrivers} selected={selected} onSelect={setSelected} />

            {selected && (
              <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-sm">
                <Card className="p-4 shadow-xl">
                  <div className="flex items-start gap-3">
                    <Avatar name={selected.name} color={selected.avatarColor} size="lg" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">{selected.name}</p>
                        <Badge
                          tone={
                            selected.status === "on-duty"
                              ? "success"
                              : selected.status === "available"
                                ? "info"
                                : "muted"
                          }
                          dot
                        >
                          {selected.status === "on-duty"
                            ? "On duty"
                            : selected.status === "available"
                              ? "Available"
                              : selected.status === "off-duty"
                                ? "Off duty"
                                : "Pending"}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-muted">
                        {selected.city} · {selected.licenseClass}
                      </p>
                      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border-soft pt-3 text-xs">
                        <div>
                          <p className="text-muted-soft">Shifts</p>
                          <p className="font-semibold">{selected.shiftsCompleted}</p>
                        </div>
                        <div>
                          <p className="text-muted-soft">Hours/wk</p>
                          <p className="font-semibold">{selected.hoursThisWeek}h</p>
                        </div>
                        <div>
                          <p className="text-muted-soft">Rating</p>
                          <p className="font-semibold">
                            {selected.rating > 0 ? selected.rating.toFixed(2) : "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
