/**
 * StoneGrainFilter — the single SVG turbulence filter that powers the
 * Stone Material Engine. Mounted once at the app root so every surface
 * using the `stone-grain` / `material-*` utility classes references it
 * via `filter: url(#stone-grain)` at zero HTTP cost.
 *
 * The <svg> itself is width/height 0, aria-hidden, and fixed-positioned
 * so it never affects layout, focus order, or hit testing.
 */
export function StoneGrainFilter() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={0}
      height={0}
      style={{ position: "absolute", width: 0, height: 0, pointerEvents: "none" }}
    >
      <defs>
        <filter id="stone-grain" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            seed="7"
            stitchTiles="stitch"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0
                    0 0 0 0 0
                    0 0 0 0 0
                    0 0 0 0.9 0"
          />
        </filter>
      </defs>
    </svg>
  );
}
