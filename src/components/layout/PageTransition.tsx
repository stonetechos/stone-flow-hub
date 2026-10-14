/**
 * STOS — Page transition.
 *
 * STDL-approved motion: a short opacity fade on route change. No scale,
 * no translate, no bounce. Respects reduced-motion.
 */
import { useRouterState } from "@tanstack/react-router";
import { type ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div
      key={pathname}
      className="w-full max-w-full min-w-0 motion-safe:animate-[stone-page-in_180ms_var(--ease-out)_both]"
    >
      {children}
    </div>
  );
}
