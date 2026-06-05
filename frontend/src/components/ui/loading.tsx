import { cn } from "@/lib/cn";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block size-5 animate-spin rounded-full border-2 border-border border-t-brand",
        className,
      )}
    />
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return <div className={cn("skeleton h-24 rounded-2xl", className)} />;
}

export function PageLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-sm text-muted">
      <Spinner />
      <p>{label}</p>
    </div>
  );
}

export function ErrorState({
  message = "Something went wrong",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-rose-200 bg-rose-50/40 py-12 text-center text-sm text-rose-700">
      <p className="font-medium">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs font-semibold underline-offset-4 hover:underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}
