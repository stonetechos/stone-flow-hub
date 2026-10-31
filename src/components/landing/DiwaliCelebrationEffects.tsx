import { useEffect, useRef, useState, memo } from "react";
import { cn } from "@/lib/utils";
import { Sparkles, Flame } from "lucide-react";

/**
 * Single SVG Diya with realistic multi-layer flame & ambient glow.
 */
function DiyaSvg({ className, glowIntensity = 1 }: { className?: string; glowIntensity?: number }) {
  return (
    <div className={cn("relative inline-block select-none pointer-events-none", className)}>
      {/* Outer ambient warm halo glow */}
      <div
        className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-amber-500/30 blur-md pointer-events-none animate-pulse"
        style={{ opacity: 0.7 * glowIntensity }}
      />

      <svg
        viewBox="0 0 64 64"
        className="w-full h-full drop-shadow-[0_2px_8px_rgba(245,158,11,0.5)] overflow-visible"
        aria-hidden="true"
      >
        <defs>
          {/* Flame gradients */}
          <radialGradient id="flameAura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.8" />
            <stop offset="40%" stopColor="#F59E0B" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="outerFlameGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FBBF24" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#DC2626" />
          </linearGradient>
          <linearGradient id="innerFlameGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FEF9C3" />
            <stop offset="60%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
          {/* Terracotta Earthen Diya Gradients */}
          <linearGradient id="terracottaBowl" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#D97706" />
            <stop offset="40%" stopColor="#B45309" />
            <stop offset="100%" stopColor="#78350F" />
          </linearGradient>
          <linearGradient id="goldenRim" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="50%" stopColor="#FDE68A" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
        </defs>

        {/* Ambient Flame Aura */}
        <circle cx="32" cy="18" r="16" fill="url(#flameAura)" />

        {/* Animated Flickering Flame */}
        <g className="diya-flame-flicker origin-bottom" style={{ transformOrigin: "32px 30px" }}>
          {/* Outer teardrop flame */}
          <path
            d="M32 4 C27 13 23 18 23 25 C23 30 27 33 32 33 C37 33 41 30 41 25 C41 18 37 13 32 4 Z"
            fill="url(#outerFlameGrad)"
          />
          {/* Middle yellow flame */}
          <path
            d="M32 9 C28.5 15 26 19 26 25 C26 28.5 28.7 31 32 31 C35.3 31 38 28.5 38 25 C38 19 35.5 15 32 9 Z"
            fill="url(#innerFlameGrad)"
          />
          {/* White-hot center core */}
          <ellipse cx="32" cy="26" rx="2.5" ry="4" fill="#FFFFFF" opacity="0.9" />
        </g>

        {/* Charred Cotton Wick */}
        <path
          d="M32 28 C32 31 33 33 34 35"
          stroke="#382110"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Earthen Terracotta Diya Body */}
        <path
          d="M10 36 C10 36 15 48 32 48 C49 48 54 36 54 36 C54 36 47 41 32 41 C17 41 10 36 10 36 Z"
          fill="url(#terracottaBowl)"
          stroke="#92400E"
          strokeWidth="1"
        />

        {/* Golden Metallic Rim */}
        <path
          d="M10 36 C16 41 48 41 54 36 C48 39 16 39 10 36 Z"
          fill="url(#goldenRim)"
          opacity="0.95"
        />

        {/* Traditional Earthen Base Stand */}
        <path
          d="M26 48 C26 48 24 53 22 54 C24 54.5 40 54.5 42 54 C40 53 38 48 38 48 Z"
          fill="#78350F"
          stroke="#572607"
          strokeWidth="0.8"
        />
      </svg>
    </div>
  );
}

// Particle types for the canvas firecrackers & golden sparkles
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  decay: number;
  color: string;
  size: number;
  flickerSpeed: number;
  flickerOffset: number;
  type: "ember" | "burst" | "sparkler";
  gravity: number;
  drag: number;
}

export const DiwaliCelebrationEffects = memo(function DiwaliCelebrationEffects() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    if (!isEnabled) return;

    // Check user's preferred motion setting
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Responsive resize handler
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const particles: Particle[] = [];
    const maxParticles = 65; // Ultra-lightweight: strictly capped to maintain 60 FPS

    const festiveColors = [
      "#FBBF24", // Golden amber
      "#F59E0B", // Deep warm gold
      "#FEF08A", // Radiant champagne
      "#EF4444", // Auspicious vermillion
      "#10B981", // Emerald sparkle
      "#F43F5E", // Rose gold
      "#FFFFFF", // White diamond sparkle
    ];

    // Spawn an upward rising golden ember (subtle floating phuljhadi spark)
    const spawnEmber = (xOrigin?: number, yOrigin?: number) => {
      if (particles.length >= maxParticles) return;
      const x = xOrigin ?? Math.random() * width;
      const y = yOrigin ?? height + 10;
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 0.8,
        vy: -(0.5 + Math.random() * 1.2),
        alpha: 0.35 + Math.random() * 0.4,
        decay: 0.003 + Math.random() * 0.005,
        color: festiveColors[Math.floor(Math.random() * festiveColors.length)],
        size: 1.5 + Math.random() * 2,
        flickerSpeed: 0.08 + Math.random() * 0.12,
        flickerOffset: Math.random() * Math.PI * 2,
        type: "ember",
        gravity: -0.005,
        drag: 0.995,
      });
    };

    // Spawn an occasional gentle firecracker burst (chakri / phuljhadi burst in margins)
    const spawnBurst = (x?: number, y?: number) => {
      if (particles.length >= maxParticles - 15) return;
      const burstX =
        x ??
        (Math.random() > 0.5
          ? width * (0.05 + Math.random() * 0.25)
          : width * (0.7 + Math.random() * 0.25));
      const burstY = y ?? height * (0.15 + Math.random() * 0.35);
      const count = 12 + Math.floor(Math.random() * 10);
      const burstColor = festiveColors[Math.floor(Math.random() * festiveColors.length)];

      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
        const speed = 1.2 + Math.random() * 2.4;
        particles.push({
          x: burstX,
          y: burstY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 0.75,
          decay: 0.016 + Math.random() * 0.015,
          color: Math.random() > 0.3 ? burstColor : "#FEF08A",
          size: 1.8 + Math.random() * 2,
          flickerSpeed: 0.2,
          flickerOffset: Math.random() * Math.PI,
          type: "burst",
          gravity: 0.04,
          drag: 0.97,
        });
      }
    };

    // Interactive pointer sparkler
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (particles.length >= maxParticles) return;
      const clientX = "touches" in e ? e.touches[0]?.clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0]?.clientY : e.clientY;
      if (clientX === undefined || clientY === undefined) return;

      if (Math.random() > 0.4) {
        particles.push({
          x: clientX + (Math.random() - 0.5) * 8,
          y: clientY + (Math.random() - 0.5) * 8,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5 - 0.5,
          alpha: 0.7,
          decay: 0.03 + Math.random() * 0.02,
          color: festiveColors[Math.floor(Math.random() * festiveColors.length)],
          size: 1.5 + Math.random() * 2,
          flickerSpeed: 0.3,
          flickerOffset: Math.random() * Math.PI,
          type: "sparkler",
          gravity: 0.03,
          drag: 0.98,
        });
      }
    };

    window.addEventListener("mousemove", handlePointerMove, { passive: true });
    window.addEventListener("touchmove", handlePointerMove, { passive: true });

    let lastEmberSpawn = 0;
    let lastBurstSpawn = 0;
    let isTabVisible = !document.hidden;

    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Initial batch of ambient embers
    for (let i = 0; i < 15; i++) {
      spawnEmber(Math.random() * width, Math.random() * height);
    }

    const render = (time: number) => {
      if (isTabVisible) {
        // Clear canvas with transparent clearRect
        ctx.clearRect(0, 0, width, height);
        ctx.globalCompositeOperation = "lighter";

        // Periodically spawn floating embers
        if (time - lastEmberSpawn > 450) {
          spawnEmber();
          lastEmberSpawn = time;
        }

        // Periodically spawn subtle margin bursts (every 2.8 - 4s)
        if (time - lastBurstSpawn > 3200) {
          spawnBurst();
          lastBurstSpawn = time;
        }

        // Update & draw particles
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= p.drag;
          p.vy = p.vy * p.drag + p.gravity;
          p.alpha -= p.decay;

          if (p.alpha <= 0 || p.y < -20 || p.y > height + 40 || p.x < -20 || p.x > width + 20) {
            particles.splice(i, 1);
            continue;
          }

          // Shimmer calculation
          const flicker = Math.sin(time * 0.005 * p.flickerSpeed + p.flickerOffset);
          const currentAlpha = Math.max(0, Math.min(1, p.alpha * (0.8 + flicker * 0.2)));

          ctx.fillStyle = p.color;
          ctx.globalAlpha = currentAlpha;

          // Draw sparkling star or soft circular ember
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();

          // Delicate 4-point star cross-glint on brighter particles
          if (p.size > 2.2 && currentAlpha > 0.45) {
            ctx.lineWidth = 0.8;
            ctx.strokeStyle = p.color;
            ctx.beginPath();
            ctx.moveTo(p.x - p.size * 2, p.y);
            ctx.lineTo(p.x + p.size * 2, p.y);
            ctx.moveTo(p.x, p.y - p.size * 2);
            ctx.lineTo(p.x, p.y + p.size * 2);
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("touchmove", handlePointerMove);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isEnabled]);

  if (!isEnabled) {
    return (
      <button
        type="button"
        onClick={() => setIsEnabled(true)}
        className="fixed bottom-4 right-20 z-40 p-2 rounded-full bg-amber-500/20 hover:bg-amber-500/40 text-amber-700 dark:text-amber-300 border border-amber-400/40 backdrop-blur-md text-[10px] font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
        title="Enable Diwali Celebration Animation"
      >
        <span>🪔</span>
        <span className="hidden sm:inline">Diwali Glow</span>
      </button>
    );
  }

  return (
    <>
      {/* 1. Fullscreen Non-Intrusive Firecrackers & Sparkler Particles Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-20 w-full h-full mix-blend-screen"
        style={{ opacity: 0.85 }}
        aria-hidden="true"
      />

      {/* 2. Live Moving / Floating Diyas (Strategically positioned in margins without obstructing content) */}
      <div className="fixed inset-0 pointer-events-none z-25 overflow-hidden" aria-hidden="true">
        {/* Floating Diya 1: Left Margin Gentle Wave Drifter */}
        <div className="absolute top-[32%] -left-1 sm:left-4 animate-diya-drift-left opacity-90 drop-shadow-[0_4px_16px_rgba(245,158,11,0.6)]">
          <DiyaSvg className="w-9 h-9 sm:w-11 sm:h-11 transform -rotate-6" glowIntensity={1.2} />
        </div>

        {/* Floating Diya 2: Right Margin Gentle Wave Drifter */}
        <div className="absolute top-[52%] -right-1 sm:right-4 animate-diya-drift-right opacity-90 drop-shadow-[0_4px_16px_rgba(245,158,11,0.6)]">
          <DiyaSvg className="w-9 h-9 sm:w-11 sm:h-11 transform rotate-6" glowIntensity={1.2} />
        </div>

        {/* Ambient Corner Diya: Bottom Left of Screen */}
        <div className="absolute bottom-5 left-3 sm:left-6 animate-diya-subtle-sway opacity-95 drop-shadow-[0_4px_20px_rgba(245,158,11,0.7)]">
          <DiyaSvg className="w-10 h-10 sm:w-12 sm:h-12" glowIntensity={1.3} />
        </div>

        {/* Ambient Corner Diya: Bottom Right of Screen (placed beside bottom widgets) */}
        <div className="absolute bottom-5 right-20 sm:right-24 animate-diya-subtle-sway-delayed opacity-95 drop-shadow-[0_4px_20px_rgba(245,158,11,0.7)]">
          <DiyaSvg
            className="w-10 h-10 sm:w-12 sm:h-12 transform -scale-x-100"
            glowIntensity={1.3}
          />
        </div>
      </div>

      {/* Inlined CSS animations for living flame flicker & weightless organic floating */}
      <style>{`
        @keyframes flameFlicker {
          0%, 100% {
            transform: scale(1) rotate(0deg);
            opacity: 0.95;
          }
          20% {
            transform: scaleY(1.12) scaleX(0.94) rotate(-2deg);
            opacity: 1;
          }
          40% {
            transform: scaleY(0.92) scaleX(1.05) rotate(1.5deg);
            opacity: 0.88;
          }
          60% {
            transform: scaleY(1.08) scaleX(0.96) rotate(-1deg);
            opacity: 0.98;
          }
          80% {
            transform: scaleY(0.96) scaleX(1.02) rotate(1deg);
            opacity: 0.92;
          }
        }

        .diya-flame-flicker {
          animation: flameFlicker 1.4s ease-in-out infinite alternate;
        }

        @keyframes diyaDriftLeft {
          0%, 100% {
            transform: translateY(0px) rotate(-4deg);
          }
          50% {
            transform: translateY(-22px) rotate(3deg);
          }
        }

        @keyframes diyaDriftRight {
          0%, 100% {
            transform: translateY(-16px) rotate(4deg);
          }
          50% {
            transform: translateY(12px) rotate(-3deg);
          }
        }

        @keyframes diyaSubtleSway {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-8px) rotate(1.5deg);
          }
        }

        @keyframes diyaSubtleSwayDelayed {
          0%, 100% {
            transform: translateY(-6px) rotate(-1deg) scaleX(-1);
          }
          50% {
            transform: translateY(6px) rotate(1.5deg) scaleX(-1);
          }
        }

        .animate-diya-drift-left {
          animation: diyaDriftLeft 6.5s ease-in-out infinite;
        }

        .animate-diya-drift-right {
          animation: diyaDriftRight 7.2s ease-in-out infinite;
        }

        .animate-diya-subtle-sway {
          animation: diyaSubtleSway 4.8s ease-in-out infinite;
        }

        .animate-diya-subtle-sway-delayed {
          animation: diyaSubtleSwayDelayed 5.4s ease-in-out infinite;
        }
      `}</style>
    </>
  );
});
