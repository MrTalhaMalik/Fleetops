"use client";

import { motion } from "framer-motion";
import { ArrowLeft, History, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { PageLoading, ErrorState } from "@/components/ui/loading";
import { useCarLog } from "@/lib/queries";

function formatDate(value: string | null) {
  if (!value) return "—";
  const [y, m, d] = value.split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

export default function CarLogPage() {
  const { data: log = [], isLoading, error, refetch } = useCarLog();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return log;
    const q = query.toLowerCase();
    return log.filter(
      (r) =>
        (r.carName ?? "").toLowerCase().includes(q) ||
        (r.carModel ?? "").toLowerCase().includes(q) ||
        (r.carPlate ?? "").toLowerCase().includes(q) ||
        (r.driverName ?? "").toLowerCase().includes(q) ||
        (r.eventTitle ?? "").toLowerCase().includes(q),
    );
  }, [log, query]);

  return (
    <div>
      <PageHeader
        title="Car Log"
        description={
          isLoading
            ? "Loading log…"
            : `${log.length} assignment ${log.length === 1 ? "record" : "records"}`
        }
        actions={
          <Link href="/cars">
            <Button size="md" variant="outline">
              <ArrowLeft className="size-4" /> Back to cars
            </Button>
          </Link>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-soft" />
          <input
            type="search"
            placeholder="Search car, plate, driver, event…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm placeholder:text-muted-soft focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
          />
        </div>
      </div>

      {isLoading && log.length === 0 ? (
        <PageLoading label="Loading log…" />
      ) : error ? (
        <ErrorState message="Could not load car log" onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-border-soft text-muted">
            <History className="size-6" />
          </span>
          <h3 className="mt-4 text-base font-semibold">
            {log.length === 0 ? "No assignments logged yet" : "No records match your search"}
          </h3>
          <p className="mt-1 max-w-sm text-sm text-muted">
            {log.length === 0
              ? "Assign a car to a driver on the Cars page — each save will appear here as a new log entry."
              : "Try a different search term."}
          </p>
          {log.length === 0 && (
            <Link href="/cars" className="mt-4">
              <Button size="md" variant="outline">
                <ArrowLeft className="size-4" /> Back to cars
              </Button>
            </Link>
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-soft text-xs uppercase tracking-wider text-muted">
                  <th className="px-6 py-3 font-semibold">Car name</th>
                  <th className="px-6 py-3 font-semibold">Model</th>
                  <th className="px-6 py-3 font-semibold">No. Plate</th>
                  <th className="px-6 py-3 font-semibold">Assigned to</th>
                  <th className="px-6 py-3 font-semibold">Start</th>
                  <th className="px-6 py-3 font-semibold">End</th>
                  <th className="px-6 py-3 font-semibold">Event</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.02 }}
                    className="border-b border-border-soft last:border-b-0 transition-colors hover:bg-border-soft/60"
                  >
                    <td className="px-6 py-4 font-medium text-foreground">
                      {r.carName ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-muted">{r.carModel || "—"}</td>
                    <td className="px-6 py-4 font-mono text-xs text-foreground">
                      {r.carPlate ?? "—"}
                    </td>
                    <td className="px-6 py-4">
                      {r.driverName ? (
                        <span className="font-medium text-foreground">{r.driverName}</span>
                      ) : (
                        <Badge tone="muted">Unassigned</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted">{formatDate(r.startDate)}</td>
                    <td className="px-6 py-4 text-muted">{formatDate(r.endDate)}</td>
                    <td className="px-6 py-4 text-muted">{r.eventTitle ?? "—"}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
