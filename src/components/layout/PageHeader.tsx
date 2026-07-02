import type { ReactNode } from "react";

/** Page header — title, subtitle, and right-aligned actions. Responsive & truncating. */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:flex sm:flex-wrap sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl truncate">
          {title}
        </h1>
        {subtitle && <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>}
    </div>
  );
}
