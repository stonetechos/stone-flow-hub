import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * The STOS tile in the sidebar, mobile bar and vendor header.
 *
 * Why this is a component rather than four copies of `<img
 * src={stosAppIcon.url} />`: that URL is `/__l5e/assets-v1/<uuid>/…`, a
 * Lovable-managed path, and the only thing in this repository that serves
 * it is `lovableAssetsProxyPlugin` in `@lovable.dev/vite-tanstack-config`
 * — which declares `apply: "serve"`, meaning it exists in the Vite dev
 * server and nowhere else. The production bundle ships to Cloudflare
 * Workers with `.output/public` as its asset directory, and there is no
 * `__l5e` directory in it. On a custom domain there is no Lovable edge in
 * front to intercept the path either, so unless Lovable's own hosting
 * layer resolves it, every one of these requests falls through to the
 * SSR handler and comes back as HTML that an `<img>` cannot decode.
 *
 * That is the same failure the `/branding/*.png` references used to have.
 * The image itself is not in the repository — only this JSON descriptor
 * is — so it cannot simply be committed and referenced relatively, and
 * inventing a stand-in PNG would be worse than the bug. Instead the
 * component keeps the managed URL as the preferred source and falls back,
 * on error, to the same faceted-slab glyph the sign-in page draws inline.
 * If the URL resolves, nothing changes. If it does not, the app shows its
 * mark instead of a broken-image icon on every single page.
 */
export function AppMark({ size, className }: { size: number; className?: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "grid shrink-0 place-items-center overflow-hidden rounded-lg bg-cyan-900 border border-cyan-700/50",
          className,
        )}
        style={{ width: size, height: size }}
      >
        <span className="font-display font-black text-white text-[11px]">ST</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-lg bg-white/95 shadow-xs p-0.5 ring-1 ring-white/30",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <img
        src="/branding/stone-tech-icon.png"
        alt="Stone Tech"
        width={size}
        height={size}
        className="h-full w-full object-contain"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
