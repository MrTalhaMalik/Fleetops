import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

const variants: Record<Variant, string> = {
  primary:
    "bg-brand text-foreground hover:bg-brand-strong hover:text-white shadow-sm focus-visible:ring-brand/40",
  secondary:
    "bg-sidebar text-white hover:bg-sidebar-soft shadow-sm focus-visible:ring-sidebar/40",
  outline:
    "border border-border bg-surface text-foreground hover:bg-border-soft focus-visible:ring-border",
  ghost: "bg-transparent text-foreground hover:bg-border-soft focus-visible:ring-border",
  danger: "bg-danger text-white hover:bg-rose-600 shadow-sm focus-visible:ring-danger/40",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-6 text-sm",
  icon: "h-10 w-10",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "primary", size = "md", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-50",
        "active:scale-[0.98]",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
});
