import { useState } from "react";
import { cn } from "@/lib/utils";
import stosAppIcon from "@/assets/stos-app-icon.png.asset.json";

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
        className={cn("grid shrink-0 place-items-center overflow-hidden", className)}
        style={{
          width: size,
          height: size,
          background: "linear-gradient(140deg, var(--mint-500), var(--mint-700))",
        }}
      >
        <svg
          viewBox="0 0 32 32"
          width={Math.round(size * 0.62)}
          height={Math.round(size * 0.62)}
          className="text-text-on-intent"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
        >
          <path d="M4 10 L16 4 L28 10 L28 22 L16 28 L4 22 Z" />
          <path d="M4 10 L16 16 L28 10" />
          <path d="M16 16 L16 28" />
        </svg>
      </span>
    );
  }

  return (
    <img
      src={stosAppIcon.url}
      alt="STOS"
      width={size}
      height={size}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
