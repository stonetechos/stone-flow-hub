import { cn } from "@/lib/utils";

/**
 * Stone Tech OS skeleton — Phase D.
 *
 * Static tinted bar on `--surface-panel` with a slow, low-contrast
 * shimmer. Motion honours `prefers-reduced-motion` via the keyframe
 * `stone-shimmer` defined in styles.css (falls back to a pulse).
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-surface-panel",
        "motion-safe:before:absolute motion-safe:before:inset-0 motion-safe:before:-translate-x-full",
        "motion-safe:before:bg-gradient-to-r motion-safe:before:from-transparent motion-safe:before:via-[oklch(from_var(--text-primary)_l_c_h_/_0.06)] motion-safe:before:to-transparent",
        "motion-safe:before:animate-[stone-shimmer_1.6s_var(--ease-out)_infinite]",
        "motion-reduce:animate-pulse",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
