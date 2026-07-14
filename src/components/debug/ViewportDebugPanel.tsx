/**
 * ViewportDebugPanel — dev-only floating panel that surfaces the
 * device-side numbers needed to diagnose mobile overflow issues that
 * only reproduce on physical devices (Android Chrome dynamic toolbar,
 * DPR rounding, visualViewport vs layout viewport, safe-area insets…).
 *
 * Gated behind `import.meta.env.DEV` so it never ships to production.
 * The panel itself is `position: fixed`, uses `right: 8px; bottom: 8px`,
 * has `max-width: calc(100vw - 16px)`, and observes its own bounding
 * box so it can never be the element that reports overflow.
 */
import { useEffect, useState } from "react";

type Overflowing = {
  tag: string;
  id: string;
  cls: string;
  w: number;
  left: number;
  right: number;
  overflowBy: number;
  path: string;
};

type Snapshot = {
  ts: number;
  innerWidth: number;
  outerWidth: number;
  clientWidth: number;
  docScrollWidth: number;
  bodyScrollWidth: number;
  visualViewportWidth: number | null;
  visualViewportScale: number | null;
  visualViewportOffsetLeft: number | null;
  devicePixelRatio: number;
  safeAreaTop: string;
  safeAreaRight: string;
  safeAreaBottom: string;
  safeAreaLeft: string;
  overflowing: Overflowing[];
};

function readSafeArea(side: "top" | "right" | "bottom" | "left"): string {
  try {
    const probe = document.createElement("div");
    probe.style.position = "fixed";
    probe.style.visibility = "hidden";
    probe.style.pointerEvents = "none";
    probe.style.padding = `env(safe-area-inset-${side})`;
    document.body.appendChild(probe);
    const v = getComputedStyle(probe).paddingTop; // any side works after set
    // paddingTop only meaningful for top; read the right side per case:
    const map = {
      top: getComputedStyle(probe).paddingTop,
      right: getComputedStyle(probe).paddingRight,
      bottom: getComputedStyle(probe).paddingBottom,
      left: getComputedStyle(probe).paddingLeft,
    } as const;
    document.body.removeChild(probe);
    return map[side] || v || "0px";
  } catch {
    return "?";
  }
}

function shortSelector(el: Element): { tag: string; id: string; cls: string } {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : "";
  const cls =
    typeof el.className === "string"
      ? el.className.split(/\s+/).slice(0, 4).join(" ").slice(0, 80)
      : "";
  return { tag, id, cls };
}

function collectOverflow(vw: number, panelEl: Element | null): Overflowing[] {
  const path = window.location.pathname;
  const out: Overflowing[] = [];
  const all = document.querySelectorAll<HTMLElement>("*");
  for (let i = 0; i < all.length; i += 1) {
    const el = all[i];
    if (panelEl && (el === panelEl || panelEl.contains(el))) continue;
    // skip elements we know are position: fixed AND fully within viewport
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.right > vw + 0.5) {
      const s = shortSelector(el);
      out.push({
        ...s,
        w: Math.round(r.width),
        left: Math.round(r.left),
        right: Math.round(r.right),
        overflowBy: Math.round(r.right - vw),
        path,
      });
      if (out.length >= 25) break;
    }
  }
  // Sort worst offenders first, then filter out descendants of the same
  // offender (report the outermost element only).
  out.sort((a, b) => b.overflowBy - a.overflowBy);
  return out;
}

function takeSnapshot(panelEl: Element | null): Snapshot {
  const html = document.documentElement;
  const body = document.body;
  const vv = window.visualViewport;
  return {
    ts: Date.now(),
    innerWidth: window.innerWidth,
    outerWidth: window.outerWidth,
    clientWidth: html.clientWidth,
    docScrollWidth: html.scrollWidth,
    bodyScrollWidth: body.scrollWidth,
    visualViewportWidth: vv ? Math.round(vv.width * 100) / 100 : null,
    visualViewportScale: vv ? Math.round(vv.scale * 1000) / 1000 : null,
    visualViewportOffsetLeft: vv ? Math.round(vv.offsetLeft * 100) / 100 : null,
    devicePixelRatio: window.devicePixelRatio,
    safeAreaTop: readSafeArea("top"),
    safeAreaRight: readSafeArea("right"),
    safeAreaBottom: readSafeArea("bottom"),
    safeAreaLeft: readSafeArea("left"),
    overflowing: collectOverflow(window.innerWidth, panelEl),
  };
}

export function ViewportDebugPanel() {
  const [open, setOpen] = useState(false);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [panelEl, setPanelEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    let raf = 0;
    const tick = (): void => {
      setSnap(takeSnapshot(panelEl));
      raf = window.setTimeout(tick, 500) as unknown as number;
    };
    tick();
    const onResize = (): void => setSnap(takeSnapshot(panelEl));
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("scroll", onResize);
    return () => {
      window.clearTimeout(raf);
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("scroll", onResize);
    };
  }, [open, panelEl]);

  // Ephemeral highlight when the user taps an offender row.
  const highlight = (sel: Overflowing): void => {
    const els = document.querySelectorAll<HTMLElement>(sel.tag);
    let match: HTMLElement | null = null;
    els.forEach((el) => {
      if (match) return;
      const r = el.getBoundingClientRect();
      if (
        Math.round(r.left) === sel.left &&
        Math.round(r.right) === sel.right &&
        Math.round(r.width) === sel.w
      ) {
        match = el;
      }
    });
    if (!match) return;
    const prev = match.style.outline;
    const prevOffset = match.style.outlineOffset;
    match.style.outline = "2px solid #ff2d55";
    match.style.outlineOffset = "-2px";
    match.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    window.setTimeout(() => {
      if (!match) return;
      match.style.outline = prev;
      match.style.outlineOffset = prevOffset;
    }, 2500);
  };

  return (
    <div
      ref={setPanelEl}
      style={{
        position: "fixed",
        right: "8px",
        bottom: "8px",
        zIndex: 2147483647,
        maxWidth: "calc(100vw - 16px)",
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: "10px",
        lineHeight: 1.35,
        color: "#e6edf3",
        pointerEvents: "auto",
      }}
      aria-label="Viewport debug panel"
    >
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            background: "rgba(15,23,42,0.92)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: "999px",
            padding: "6px 10px",
            fontSize: "10px",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
          }}
        >
          VP · debug
        </button>
      ) : (
        <div
          style={{
            width: "min(340px, calc(100vw - 16px))",
            maxHeight: "min(60dvh, 460px)",
            overflow: "auto",
            background: "rgba(13,17,23,0.96)",
            border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: "8px",
            padding: "8px 10px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "6px",
              gap: "6px",
            }}
          >
            <strong style={{ fontSize: "11px", letterSpacing: "0.04em" }}>
              Viewport debug
            </strong>
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                type="button"
                onClick={() => setSnap(takeSnapshot(panelEl))}
                style={btn}
                aria-label="Refresh snapshot"
              >
                ↻
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={btn}
                aria-label="Close panel"
              >
                ×
              </button>
            </div>
          </div>

          {snap ? (
            <>
              <Row k="path" v={window.location.pathname} />
              <Row k="innerWidth" v={snap.innerWidth} />
              <Row k="outerWidth" v={snap.outerWidth} />
              <Row k="html.clientWidth" v={snap.clientWidth} />
              <Row k="html.scrollWidth" v={snap.docScrollWidth} warn={snap.docScrollWidth > snap.innerWidth} />
              <Row k="body.scrollWidth" v={snap.bodyScrollWidth} warn={snap.bodyScrollWidth > snap.innerWidth} />
              <Row k="visualVP.width" v={snap.visualViewportWidth ?? "—"} />
              <Row k="visualVP.scale" v={snap.visualViewportScale ?? "—"} />
              <Row k="visualVP.offsetLeft" v={snap.visualViewportOffsetLeft ?? "—"} />
              <Row k="devicePixelRatio" v={snap.devicePixelRatio} />
              <Row k="safe-area T/R/B/L" v={`${snap.safeAreaTop} / ${snap.safeAreaRight} / ${snap.safeAreaBottom} / ${snap.safeAreaLeft}`} />

              <div
                style={{
                  marginTop: "8px",
                  paddingTop: "6px",
                  borderTop: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <div style={{ marginBottom: "4px", opacity: 0.7 }}>
                  Elements right &gt; innerWidth ({snap.overflowing.length})
                </div>
                {snap.overflowing.length === 0 ? (
                  <div style={{ opacity: 0.5 }}>None. Layout fits.</div>
                ) : (
                  snap.overflowing.map((o, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => highlight(o)}
                      style={{
                        ...offBtn,
                        borderLeft:
                          o.overflowBy >= 8
                            ? "3px solid #ff2d55"
                            : "3px solid #ff9f0a",
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>
                        +{o.overflowBy}px&nbsp;
                        <span style={{ opacity: 0.65 }}>
                          {o.tag}
                          {o.id}
                        </span>
                      </div>
                      <div style={{ opacity: 0.65, wordBreak: "break-all" }}>
                        {o.cls || "(no class)"}
                      </div>
                      <div style={{ opacity: 0.55 }}>
                        w:{o.w}  L:{o.left}  R:{o.right}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <div>Sampling…</div>
          )}
        </div>
      )}
    </div>
  );
}

const btn: React.CSSProperties = {
  background: "rgba(255,255,255,0.08)",
  color: "#e6edf3",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: "4px",
  padding: "2px 6px",
  fontSize: "11px",
  cursor: "pointer",
};

const offBtn: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  background: "rgba(255,255,255,0.04)",
  color: "#e6edf3",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "4px",
  padding: "5px 6px 5px 8px",
  marginTop: "4px",
  fontSize: "10px",
  cursor: "pointer",
};

function Row({ k, v, warn }: { k: string; v: string | number; warn?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "6px",
        color: warn ? "#ff9f0a" : undefined,
      }}
    >
      <span style={{ opacity: 0.7 }}>{k}</span>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{String(v)}</span>
    </div>
  );
}
