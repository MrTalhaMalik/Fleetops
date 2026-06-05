import { cn } from "@/lib/cn";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type Props = {
  name: string;
  color?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const sizes: Record<NonNullable<Props["size"]>, string> = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-12 text-base",
  xl: "size-20 text-2xl",
};

export function Avatar({ name, color = "bg-brand", size = "md", className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white shadow-sm ring-2 ring-white",
        color,
        sizes[size],
        className,
      )}
      aria-label={name}
    >
      {initials(name)}
    </span>
  );
}
