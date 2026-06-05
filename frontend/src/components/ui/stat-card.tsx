"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/cn";
import { Card } from "./card";

type Props = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  delta?: number;
  helper?: string;
  accent?: "brand" | "info" | "success" | "danger";
  delay?: number;
};

const accents: Record<NonNullable<Props["accent"]>, string> = {
  brand: "bg-brand-soft text-brand-strong",
  info: "bg-info-soft text-blue-700",
  success: "bg-success-soft text-emerald-700",
  danger: "bg-danger-soft text-rose-700",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  delta,
  helper,
  accent = "brand",
  delay = 0,
}: Props) {
  const trendingUp = (delta ?? 0) >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="p-6 transition-shadow duration-200 hover:shadow-[0_4px_20px_rgba(15,23,42,0.08)]">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted">{label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
          </div>
          <div className={cn("flex size-11 items-center justify-center rounded-xl", accents[accent])}>
            <Icon className="size-5" strokeWidth={2.25} />
          </div>
        </div>
        {(delta !== undefined || helper) && (
          <div className="mt-4 flex items-center gap-2 text-xs">
            {delta !== undefined && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
                  trendingUp ? "bg-success-soft text-emerald-700" : "bg-danger-soft text-rose-700",
                )}
              >
                {trendingUp ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                {Math.abs(delta)}%
              </span>
            )}
            {helper && <span className="text-muted">{helper}</span>}
          </div>
        )}
      </Card>
    </motion.div>
  );
}
