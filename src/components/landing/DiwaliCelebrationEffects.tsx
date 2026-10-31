import { useEffect, useRef, useState, memo } from "react";
import { cn } from "@/lib/utils";

/**
 * 1. Single SVG Diya with realistic multi-layer flickering flame & ambient golden glow.
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
        className="w-full h-full drop-shadow-[0_2px_10px_rgba(245,158,11,0.6)] overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="diyaFlameAura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.85" />
            <stop offset="45%" stopColor="#F59E0B" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="diyaOuterFlame" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FBBF24" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#DC2626" />
          </linearGradient>
          <linearGradient id="diyaInnerFlame" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FEF9C3" />
            <stop offset="60%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
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
        <circle cx="32" cy="18" r="16" fill="url(#diyaFlameAura)" />

        {/* Animated Flickering Flame */}
        <g className="diya-flame-flicker origin-bottom" style={{ transformOrigin: "32px 30px" }}>
          {/* Outer teardrop flame */}
          <path
            d="M32 4 C27 13 23 18 23 25 C23 30 27 33 32 33 C37 33 41 30 41 25 C41 18 37 13 32 4 Z"
            fill="url(#diyaOuterFlame)"
          />
          {/* Middle yellow flame */}
          <path
            d="M32 9 C28.5 15 26 19 26 25 C26 28.5 28.7 31 32 31 C35.3 31 38 28.5 38 25 C38 19 35.5 15 32 9 Z"
            fill="url(#diyaInnerFlame)"
          />
          {/* White-hot center core */}
          <ellipse cx="32" cy="26" rx="2.5" ry="4" fill="#FFFFFF" opacity="0.95" />
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

/**
 * 2. Animated Chakri (Ground Spinner Firecracker) with whirling flame jets & spiral.
 */
function ChakriFirecracker({ className }: { className?: string }) {
  return (
    <div className={cn("relative inline-block select-none pointer-events-none", className)}>
      {/* Outer ambient whirling glow */}
      <div className="absolute -inset-2 rounded-full bg-amber-500/25 blur-md pointer-events-none animate-pulse" />

      {/* Orbiting Spark Trail Ring */}
      <div
        className="absolute -inset-2 rounded-full border border-dashed border-amber-300/60 animate-spin pointer-events-none"
        style={{ animationDuration: "1.2s" }}
      />

      <svg
        viewBox="0 0 100 100"
        className="w-full h-full animate-chakri-spin drop-shadow-[0_0_14px_rgba(245,158,11,0.85)] overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="chakriCoreGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="30%" stopColor="#FEF08A" />
            <stop offset="65%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </radialGradient>
          <linearGradient id="chakriRibbonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="40%" stopColor="#F59E0B" />
            <stop offset="70%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
        </defs>

        {/* Whirling Tangential Fire Jets */}
        <g opacity="0.95">
          <path d="M50 10 C68 10 86 20 92 36 C84 32 72 26 56 24 Z" fill="#FBBF24" />
          <path d="M90 50 C90 68 80 86 64 92 C68 84 74 72 76 56 Z" fill="#F59E0B" />
          <path d="M50 90 C32 90 14 80 8 64 C16 68 28 74 44 76 Z" fill="#EF4444" />
          <path d="M10 50 C10 32 20 14 36 8 C32 16 26 28 24 44 Z" fill="#10B981" />
        </g>

        {/* Chakri Main Round Body */}
        <circle cx="50" cy="50" r="32" fill="#1C1917" stroke="#F59E0B" strokeWidth="2.5" />
        <circle cx="50" cy="50" r="26" fill="url(#chakriRibbonGrad)" opacity="0.9" />
        <circle cx="50" cy="50" r="19" fill="#292524" stroke="#FDE68A" strokeWidth="1.5" />

        {/* Traditional Indian Coiled Powder Spiral */}
        <path
          d="M50 50 A 5 5 0 0 1 55 50 A 10 10 0 0 1 45 50 A 15 15 0 0 1 65 50 A 20 20 0 0 1 35 50"
          fill="none"
          stroke="#FEF9C3"
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {/* Center Metal Brass Rivet with bright spark */}
        <circle cx="50" cy="50" r="6.5" fill="url(#chakriCoreGrad)" />
        <circle cx="50" cy="50" r="2.5" fill="#FFFFFF" />
      </svg>
    </div>
  );
}

/**
 * 3. Animated Anaar (Flowerpot Fountain Firecracker) with conical foil body & glowing apex.
 */
function AnaarFirecracker({ className }: { className?: string }) {
  return (
    <div className={cn("relative inline-block select-none pointer-events-none", className)}>
      {/* Intense apex glow aura */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-amber-400/40 blur-lg pointer-events-none animate-pulse" />

      {/* SVG Conical Flowerpot Body */}
      <svg
        viewBox="0 0 60 70"
        className="w-full h-full drop-shadow-[0_4px_14px_rgba(245,158,11,0.65)] overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="anaarBodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#991B1B" />
            <stop offset="35%" stopColor="#DC2626" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="65%" stopColor="#DC2626" />
            <stop offset="100%" stopColor="#7F1D1D" />
          </linearGradient>
          <linearGradient id="anaarGoldBand" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#D97706" />
            <stop offset="50%" stopColor="#FEF08A" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
        </defs>

        {/* Terracotta/Foil Conical Anaar Body */}
        <path
          d="M24 22 L36 22 L52 64 L8 64 Z"
          fill="url(#anaarBodyGrad)"
          stroke="#F59E0B"
          strokeWidth="1.2"
        />

        {/* Decorative Golden Festive Bands */}
        <path d="M21 34 L39 34 L41 39 L19 39 Z" fill="url(#anaarGoldBand)" />
        <path d="M16 48 L44 48 L46 53 L14 53 Z" fill="url(#anaarGoldBand)" />

        {/* Traditional Earthen Base */}
        <rect
          x="6"
          y="64"
          width="48"
          height="5"
          rx="2"
          fill="#78350F"
          stroke="#572607"
          strokeWidth="1"
        />

        {/* Charred Apex Nozzle */}
        <path
          d="M22 22 C22 20 25 17 30 17 C35 17 38 20 38 22 Z"
          fill="#292524"
          stroke="#F59E0B"
          strokeWidth="1"
        />

        {/* White-Hot Core at Nozzle */}
        <ellipse cx="30" cy="19" rx="5" ry="3" fill="#FFFFFF" />
        <ellipse
          cx="30"
          cy="19"
          rx="8"
          ry="4.5"
          fill="#FBBF24"
          opacity="0.7"
          className="animate-ping"
          style={{ animationDuration: "0.9s" }}
        />
      </svg>
    </div>
  );
}

/**
 * 4. Animated Phuljhadi (Handheld Golden Sparkler) with active sizzling rays.
 */
function PhuljhadiSparkler({ className }: { className?: string }) {
  return (
    <div className={cn("relative inline-block select-none pointer-events-none", className)}>
      {/* Sizzling light aura */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-amber-400/40 blur-md animate-pulse" />

      <svg
        viewBox="0 0 40 90"
        className="w-full h-full drop-shadow-[0_0_12px_rgba(251,191,36,0.9)] overflow-visible"
        aria-hidden="true"
      >
        {/* Metal Wire Handle */}
        <line
          x1="20"
          y1="45"
          x2="20"
          y2="88"
          stroke="#94A3B8"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="20" cy="87" r="1.5" fill="#64748B" />

        {/* Coated Pyrotechnic Powder Stem */}
        <line
          x1="20"
          y1="18"
          x2="20"
          y2="45"
          stroke="#475569"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <line
          x1="20"
          y1="18"
          x2="20"
          y2="45"
          stroke="#CBD5E1"
          strokeWidth="1"
          strokeDasharray="2,3"
        />

        {/* Burning White-Hot Spark Core */}
        <circle cx="20" cy="18" r="4.5" fill="#FFFFFF" />
        <circle cx="20" cy="18" r="7" fill="#FBBF24" opacity="0.8" />

        {/* Animated Sizzling Spark Rays */}
        <g
          className="animate-phuljhadi-sparks origin-center"
          style={{ transformOrigin: "20px 18px" }}
        >
          <line
            x1="20"
            y1="6"
            x2="20"
            y2="1"
            stroke="#FFF"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <line
            x1="28"
            y1="10"
            x2="35"
            y2="6"
            stroke="#FDE047"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <line
            x1="32"
            y1="18"
            x2="39"
            y2="18"
            stroke="#F59E0B"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <line
            x1="28"
            y1="26"
            x2="35"
            y2="30"
            stroke="#FFF"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <line
            x1="12"
            y1="10"
            x2="5"
            y2="6"
            stroke="#FDE047"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <line
            x1="8"
            y1="18"
            x2="1"
            y2="18"
            stroke="#F59E0B"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <line
            x1="12"
            y1="26"
            x2="5"
            y2="30"
            stroke="#FFF"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  );
}

// Particle types for canvas firecrackers, sparks, rockets & embers
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
  type: "ember" | "burst" | "sparkler" | "anaar_fountain";
  gravity: number;
  drag: number;
}

interface SkyRocket {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetY: number;
  color: string;
  trail: { x: number; y: number; alpha: number; size: number }[];
  exploded: boolean;
}

export const DiwaliCelebrationEffects = memo(function DiwaliCelebrationEffects() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Read initial preference from localStorage so user preference persists
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const stored = localStorage.getItem("stos_diwali_celebration");
      return stored !== null ? stored === "true" : true;
    } catch {
      return true;
    }
  });

  const toggleEnabled = () => {
    setIsEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("stos_diwali_celebration", String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

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

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const particles: Particle[] = [];
    const rockets: SkyRocket[] = [];
    const maxParticles = 90; // Strictly capped to guarantee 60 FPS

    const festiveColors = [
      "#FBBF24", // Golden amber
      "#F59E0B", // Deep warm gold
      "#FEF08A", // Radiant champagne
      "#EF4444", // Auspicious vermillion
      "#10B981", // Emerald sparkle
      "#EC4899", // Rose gold / Pink
      "#38BDF8", // Sky blue spark
      "#FFFFFF", // Diamond white
    ];

    // Spawn an upward rising golden ember
    const spawnEmber = (xOrigin?: number, yOrigin?: number) => {
      if (particles.length >= maxParticles) return;
      const x = xOrigin ?? Math.random() * width;
      const y = yOrigin ?? height + 10;
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 0.8,
        vy: -(0.6 + Math.random() * 1.3),
        alpha: 0.35 + Math.random() * 0.45,
        decay: 0.003 + Math.random() * 0.005,
        color: festiveColors[Math.floor(Math.random() * festiveColors.length)],
        size: 1.5 + Math.random() * 2,
        flickerSpeed: 0.08 + Math.random() * 0.12,
        flickerOffset: Math.random() * Math.PI * 2,
        type: "ember",
        gravity: -0.004,
        drag: 0.995,
      });
    };

    // Spawn high-velocity golden spark from the Anaar flowerpot located at bottom-right
    const spawnAnaarFountain = () => {
      if (particles.length >= maxParticles - 10) return;
      // Anaar position: approx 150px from right, 45px from bottom
      const anaarX = width > 640 ? width - 150 : width - 110;
      const anaarY = height - 42;

      for (let i = 0; i < 2; i++) {
        const spreadAngle = -Math.PI / 2 + (Math.random() - 0.5) * 0.45;
        const speed = 3.5 + Math.random() * 4.5;
        particles.push({
          x: anaarX + (Math.random() - 0.5) * 4,
          y: anaarY,
          vx: Math.cos(spreadAngle) * speed,
          vy: Math.sin(spreadAngle) * speed,
          alpha: 0.9,
          decay: 0.02 + Math.random() * 0.015,
          color:
            Math.random() > 0.4
              ? "#FEF08A"
              : festiveColors[Math.floor(Math.random() * festiveColors.length)],
          size: 1.8 + Math.random() * 2.2,
          flickerSpeed: 0.3,
          flickerOffset: Math.random() * Math.PI,
          type: "anaar_fountain",
          gravity: 0.14, // Gravitational arc
          drag: 0.98,
        });
      }
    };

    // Launch a live visual Sky Rocket
    const launchSkyRocket = () => {
      if (rockets.length >= 2) return;
      // Launch from side margins (avoiding center content)
      const launchX =
        Math.random() > 0.5
          ? width * (0.05 + Math.random() * 0.2)
          : width * (0.75 + Math.random() * 0.18);
      const targetY = height * (0.15 + Math.random() * 0.25);
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.2;
      const speed = 7.5 + Math.random() * 2.5;

      rockets.push({
        x: launchX,
        y: height - 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        targetY,
        color: festiveColors[Math.floor(Math.random() * festiveColors.length)],
        trail: [],
        exploded: false,
      });
    };

    // Detonate rocket into spectacular multi-colored starburst
    const explodeRocket = (rocket: SkyRocket) => {
      const burstCount = 28 + Math.floor(Math.random() * 14);
      for (let i = 0; i < burstCount; i++) {
        if (particles.length >= maxParticles) break;
        const angle = (Math.PI * 2 * i) / burstCount + (Math.random() - 0.5) * 0.3;
        const speed = 1.5 + Math.random() * 3.8;
        particles.push({
          x: rocket.x,
          y: rocket.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 0.95,
          decay: 0.015 + Math.random() * 0.012,
          color: Math.random() > 0.3 ? rocket.color : "#FEF08A",
          size: 2 + Math.random() * 2.5,
          flickerSpeed: 0.25,
          flickerOffset: Math.random() * Math.PI,
          type: "burst",
          gravity: 0.05,
          drag: 0.97,
        });
      }
    };

    // Interactive pointer sparklers & click pop
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (particles.length >= maxParticles) return;
      const clientX = "touches" in e ? e.touches[0]?.clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0]?.clientY : e.clientY;
      if (clientX === undefined || clientY === undefined) return;

      if (Math.random() > 0.45) {
        particles.push({
          x: clientX + (Math.random() - 0.5) * 8,
          y: clientY + (Math.random() - 0.5) * 8,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5 - 0.5,
          alpha: 0.75,
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

    const handleClick = (e: MouseEvent) => {
      // Don't fire if user clicked on an interactive form control or link
      const target = e.target as HTMLElement | null;
      if (target?.closest("button, a, input, select, textarea, [role='button']")) {
        return;
      }
      // Mini cheerful cracker pop on click
      const burstColor = festiveColors[Math.floor(Math.random() * festiveColors.length)];
      for (let i = 0; i < 12; i++) {
        if (particles.length >= maxParticles) break;
        const angle = (Math.PI * 2 * i) / 12 + (Math.random() - 0.5) * 0.3;
        const speed = 1.2 + Math.random() * 2.2;
        particles.push({
          x: e.clientX,
          y: e.clientY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 0.85,
          decay: 0.025 + Math.random() * 0.015,
          color: Math.random() > 0.3 ? burstColor : "#FFFFFF",
          size: 1.8 + Math.random() * 1.8,
          flickerSpeed: 0.25,
          flickerOffset: Math.random() * Math.PI,
          type: "sparkler",
          gravity: 0.04,
          drag: 0.97,
        });
      }
    };

    window.addEventListener("mousemove", handlePointerMove, { passive: true });
    window.addEventListener("touchmove", handlePointerMove, { passive: true });
    window.addEventListener("click", handleClick, { passive: true });

    let lastEmberSpawn = 0;
    let lastAnaarSpawn = 0;
    let lastRocketLaunch = 0;
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
        ctx.clearRect(0, 0, width, height);
        ctx.globalCompositeOperation = "lighter";

        // 1. Periodically spawn embers
        if (time - lastEmberSpawn > 400) {
          spawnEmber();
          lastEmberSpawn = time;
        }

        // 2. Periodically spawn Anaar fountain sparks
        if (time - lastAnaarSpawn > 80) {
          spawnAnaarFountain();
          lastAnaarSpawn = time;
        }

        // 3. Periodically launch a Sky Rocket (every 3.8 to 5s)
        if (time - lastRocketLaunch > 3800) {
          launchSkyRocket();
          lastRocketLaunch = time;
        }

        // 4. Update and render Sky Rockets
        for (let rIdx = rockets.length - 1; rIdx >= 0; rIdx--) {
          const rocket = rockets[rIdx];
          rocket.x += rocket.vx;
          rocket.y += rocket.vy;
          rocket.vy += 0.04; // Gentle upward deceleration

          // Add trail spark
          rocket.trail.push({
            x: rocket.x + (Math.random() - 0.5) * 3,
            y: rocket.y + 6,
            alpha: 0.8,
            size: 1.5 + Math.random() * 1.5,
          });

          // Draw trail
          for (let tIdx = rocket.trail.length - 1; tIdx >= 0; tIdx--) {
            const t = rocket.trail[tIdx];
            t.alpha -= 0.05;
            t.y += 0.5;
            if (t.alpha <= 0) {
              rocket.trail.splice(tIdx, 1);
              continue;
            }
            ctx.fillStyle = "#F59E0B";
            ctx.globalAlpha = t.alpha;
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.size, 0, Math.PI * 2);
            ctx.fill();
          }

          // Draw Rocket Body (Red cylinder with Gold nosecone and stabilizer stick)
          ctx.save();
          ctx.translate(rocket.x, rocket.y);
          const angle = Math.atan2(rocket.vy, rocket.vx) + Math.PI / 2;
          ctx.rotate(angle);
          ctx.globalAlpha = 0.95;

          // Wooden stick
          ctx.strokeStyle = "#78350F";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, 16);
          ctx.stroke();

          // Red rocket body
          ctx.fillStyle = "#DC2626";
          ctx.fillRect(-2, -8, 4, 10);

          // Golden nosecone
          ctx.fillStyle = "#FBBF24";
          ctx.beginPath();
          ctx.moveTo(0, -14);
          ctx.lineTo(3, -8);
          ctx.lineTo(-3, -8);
          ctx.closePath();
          ctx.fill();

          // Burning fuse sparks at bottom
          ctx.fillStyle = "#FEF08A";
          ctx.beginPath();
          ctx.arc(0, 2, 2.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();

          // Check if rocket reached apex
          if (rocket.y <= rocket.targetY || rocket.vy >= -1) {
            explodeRocket(rocket);
            rockets.splice(rIdx, 1);
          }
        }

        // 5. Update & draw particles
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

          const flicker = Math.sin(time * 0.005 * p.flickerSpeed + p.flickerOffset);
          const currentAlpha = Math.max(0, Math.min(1, p.alpha * (0.8 + flicker * 0.2)));

          ctx.fillStyle = p.color;
          ctx.globalAlpha = currentAlpha;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();

          // 4-point star cross-glint on bright firecracker particles
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
      window.removeEventListener("click", handleClick);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isEnabled]);

  return (
    <>
      {/* 1. Fullscreen Non-Intrusive Canvas (Live Rockets, Anaar Fountain Sparks & Golden Embers) */}
      {isEnabled && (
        <canvas
          ref={canvasRef}
          className="fixed inset-0 pointer-events-none z-20 w-full h-full mix-blend-screen"
          style={{ opacity: 0.88 }}
          aria-hidden="true"
        />
      )}

      {/* 2. Visual Animated Moving Diyas & Firecrackers Layer */}
      {isEnabled && (
        <div className="fixed inset-0 pointer-events-none z-25 overflow-hidden" aria-hidden="true">
          {/* Diya 1: Left Margin Gentle Wave Drifter */}
          <div className="absolute top-[28%] -left-1 sm:left-4 animate-diya-drift-left opacity-90 drop-shadow-[0_4px_16px_rgba(245,158,11,0.6)]">
            <DiyaSvg className="w-8 h-8 sm:w-10 sm:h-10 transform -rotate-6" glowIntensity={1.2} />
          </div>

          {/* Diya 2: Right Margin Gentle Wave Drifter */}
          <div className="absolute top-[48%] -right-1 sm:right-4 animate-diya-drift-right opacity-90 drop-shadow-[0_4px_16px_rgba(245,158,11,0.6)]">
            <DiyaSvg className="w-8 h-8 sm:w-10 sm:h-10 transform rotate-6" glowIntensity={1.2} />
          </div>

          {/* Diya 3: Ambient Corner Diya at Bottom Left */}
          <div className="absolute bottom-4 left-3 sm:left-6 animate-diya-subtle-sway opacity-95 drop-shadow-[0_4px_20px_rgba(245,158,11,0.7)]">
            <DiyaSvg className="w-9 h-9 sm:w-11 sm:h-11" glowIntensity={1.3} />
          </div>

          {/* Firecracker 1: Animated Spinning Chakri (Ground Spinner) at Bottom Left */}
          <div className="absolute bottom-4 left-16 sm:left-24 animate-chakri-bob opacity-95 drop-shadow-[0_0_16px_rgba(245,158,11,0.75)]">
            <ChakriFirecracker className="w-10 h-10 sm:w-12 sm:h-12" />
          </div>

          {/* Firecracker 2: Animated Anaar (Flowerpot Fountain) at Bottom Right */}
          <div className="absolute bottom-3 right-28 sm:right-36 animate-anaar-pulse opacity-95 drop-shadow-[0_0_18px_rgba(245,158,11,0.75)]">
            <AnaarFirecracker className="w-10 h-11 sm:w-12 sm:h-14" />
          </div>

          {/* Firecracker 3: Animated Phuljhadi (Handheld Sparkler) at Left Side */}
          <div className="absolute top-[65%] -left-1 sm:left-4 animate-phuljhadi-float opacity-90 drop-shadow-[0_0_14px_rgba(251,191,36,0.85)]">
            <PhuljhadiSparkler className="w-7 h-16 sm:w-9 sm:h-20 transform rotate-12" />
          </div>
        </div>
      )}

      {/* 3. Subtle Floating Toggle Button to Enable / Disable Celebration */}
      <div className="fixed bottom-4 right-20 sm:right-24 z-40 select-none pointer-events-auto">
        <button
          type="button"
          onClick={toggleEnabled}
          className={cn(
            "p-2 sm:px-3 sm:py-1.5 rounded-full border backdrop-blur-md text-[11px] font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5",
            isEnabled
              ? "bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-200 border-amber-400/50"
              : "bg-stone-500/15 hover:bg-stone-500/25 text-stone-600 dark:text-stone-400 border-stone-300 dark:border-stone-700",
          )}
          title={isEnabled ? "Disable Diwali Celebration Glow" : "Enable Diwali Celebration Glow"}
        >
          <span className="text-sm">🪔</span>
          <span className="hidden sm:inline">
            {isEnabled ? "Diwali Celebration" : "Diwali Off"}
          </span>
        </button>
      </div>

      {/* Inlined CSS animations for living flame flicker, rapid chakri spin & weightless floating */}
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

        @keyframes chakriSpinFast {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animate-chakri-spin {
          animation: chakriSpinFast 0.32s linear infinite;
        }

        @keyframes chakriBob {
          0%, 100% {
            transform: translateY(0px) scale(1);
          }
          50% {
            transform: translateY(-4px) scale(1.03);
          }
        }

        .animate-chakri-bob {
          animation: chakriBob 2.5s ease-in-out infinite;
        }

        @keyframes anaarPulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.02);
          }
        }

        .animate-anaar-pulse {
          animation: anaarPulse 1.8s ease-in-out infinite;
        }

        @keyframes phuljhadiSparks {
          0%, 100% {
            transform: scale(1) rotate(0deg);
            opacity: 0.95;
          }
          25% {
            transform: scale(1.2) rotate(25deg);
            opacity: 1;
          }
          50% {
            transform: scale(0.9) rotate(-15deg);
            opacity: 0.85;
          }
          75% {
            transform: scale(1.25) rotate(40deg);
            opacity: 1;
          }
        }

        .animate-phuljhadi-sparks {
          animation: phuljhadiSparks 0.22s ease-in-out infinite;
        }

        @keyframes phuljhadiFloat {
          0%, 100% {
            transform: translateY(0px) rotate(12deg);
          }
          50% {
            transform: translateY(-14px) rotate(6deg);
          }
        }

        .animate-phuljhadi-float {
          animation: phuljhadiFloat 5.2s ease-in-out infinite;
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

        .animate-diya-drift-left {
          animation: diyaDriftLeft 6.5s ease-in-out infinite;
        }

        .animate-diya-drift-right {
          animation: diyaDriftRight 7.2s ease-in-out infinite;
        }

        .animate-diya-subtle-sway {
          animation: diyaSubtleSway 4.8s ease-in-out infinite;
        }
      `}</style>
    </>
  );
});
