import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Tone =
  | "neutral"
  | "brand"
  | "success"
  | "danger"
  | "info"
  | "warning"
  | "muted";

const tones: Record<Tone, string> = {
  neutral: "bg-border-soft text-foreground border border-border",
  brand: "bg-brand-soft text-brand-strong border border-brand/20",
  success: "bg-success-soft text-emerald-700 border border-emerald-200",
  danger: "bg-danger-soft text-rose-700 border border-rose-200",
  info: "bg-info-soft text-blue-700 border border-blue-200",
  warning: "bg-warning-soft text-amber-700 border border-amber-200",
  muted: "bg-slate-100 text-muted border border-slate-200",
};

type Props = HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone;
  dot?: boolean;
};

export function Badge({ className, tone = "neutral", dot, children, ...props }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "size-1.5 rounded-full",
            tone === "success" && "bg-emerald-500",
            tone === "danger" && "bg-rose-500",
            tone === "brand" && "bg-brand",
            tone === "info" && "bg-blue-500",
            tone === "warning" && "bg-amber-500",
            tone === "neutral" && "bg-slate-400",
            tone === "muted" && "bg-slate-400",
          )}
        />
      )}
      {children}
    </span>
  );
}
