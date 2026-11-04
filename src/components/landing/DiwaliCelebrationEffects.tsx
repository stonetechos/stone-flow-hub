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
        className="absolute -top-3 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-amber-500/35 blur-md pointer-events-none animate-pulse"
        style={{ opacity: 0.75 * glowIntensity }}
      />

      <svg
        viewBox="0 0 64 64"
        className="w-full h-full drop-shadow-[0_2px_12px_rgba(245,158,11,0.7)] overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="diyaFlameAura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.9" />
            <stop offset="45%" stopColor="#F59E0B" stopOpacity="0.55" />
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
        <circle cx="32" cy="18" r="17" fill="url(#diyaFlameAura)" />

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
    <div
      className={cn(
        "relative inline-block select-none pointer-events-none animate-chakri-bob",
        className,
      )}
    >
      {/* Outer ambient whirling glow */}
      <div className="absolute -inset-3 rounded-full bg-amber-500/30 blur-md pointer-events-none animate-pulse" />

      {/* Orbiting Spark Trail Ring */}
      <div
        className="absolute -inset-2.5 rounded-full border border-dashed border-amber-300/70 animate-spin pointer-events-none"
        style={{ animationDuration: "0.8s" }}
      />

      <svg
        viewBox="0 0 100 100"
        className="w-full h-full animate-chakri-spin drop-shadow-[0_0_16px_rgba(245,158,11,0.9)] overflow-visible"
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
    <div
      className={cn(
        "relative inline-block select-none pointer-events-none animate-anaar-pulse",
        className,
      )}
    >
      {/* Intense apex glow aura */}
      <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-amber-400/50 blur-lg pointer-events-none animate-pulse" />

      {/* SVG Conical Flowerpot Body */}
      <svg
        viewBox="0 0 60 70"
        className="w-full h-full drop-shadow-[0_4px_16px_rgba(245,158,11,0.75)] overflow-visible"
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
          opacity="0.8"
          className="animate-ping"
          style={{ animationDuration: "0.8s" }}
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
    <div
      className={cn(
        "relative inline-block select-none pointer-events-none animate-phuljhadi-float",
        className,
      )}
    >
      {/* Sizzling light aura */}
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-amber-400/45 blur-md animate-pulse" />

      <svg
        viewBox="0 0 40 90"
        className="w-full h-full drop-shadow-[0_0_14px_rgba(251,191,36,0.95)] overflow-visible"
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
        <circle cx="20" cy="18" r="7.5" fill="#FBBF24" opacity="0.85" />

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
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <line
            x1="28"
            y1="10"
            x2="36"
            y2="5"
            stroke="#FDE047"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <line
            x1="32"
            y1="18"
            x2="40"
            y2="18"
            stroke="#F59E0B"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <line
            x1="28"
            y1="26"
            x2="36"
            y2="31"
            stroke="#FFF"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <line
            x1="12"
            y1="10"
            x2="4"
            y2="5"
            stroke="#FDE047"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <line
            x1="8"
            y1="18"
            x2="0"
            y2="18"
            stroke="#F59E0B"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <line
            x1="12"
            y1="26"
            x2="4"
            y2="31"
            stroke="#FFF"
            strokeWidth="1.6"
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
  type: "ember" | "burst" | "sparkler" | "anaar_fountain" | "willow";
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
  burstType: "standard" | "willow" | "ring" | "multi";
  trail: { x: number; y: number; alpha: number; size: number }[];
  exploded: boolean;
}

export const DiwaliCelebrationEffects = memo(function DiwaliCelebrationEffects() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Read initial preference from localStorage so user preference persists
  const [isEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const stored = localStorage.getItem("stos_diwali_celebration");
      return stored !== null ? stored === "true" : true;
    } catch {
      return true;
    }
  });

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
    window.addEventListener("orientationchange", handleResize);

    const particles: Particle[] = [];
    const rockets: SkyRocket[] = [];
    const maxParticles = 360; // High particle cap for rich festive atmosphere while maintaining 60 FPS

    const festiveColors = [
      "#FBBF24", // Golden amber
      "#F59E0B", // Deep warm gold
      "#FEF08A", // Radiant champagne
      "#EF4444", // Auspicious vermillion
      "#10B981", // Emerald sparkle
      "#EC4899", // Rose gold / Pink
      "#38BDF8", // Sky blue spark
      "#A855F7", // Royal purple spark
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
        vx: (Math.random() - 0.5) * 1.0,
        vy: -(0.8 + Math.random() * 1.6),
        alpha: 0.45 + Math.random() * 0.45,
        decay: 0.003 + Math.random() * 0.004,
        color: festiveColors[Math.floor(Math.random() * festiveColors.length)],
        size: 1.6 + Math.random() * 2.2,
        flickerSpeed: 0.09 + Math.random() * 0.14,
        flickerOffset: Math.random() * Math.PI * 2,
        type: "ember",
        gravity: -0.005,
        drag: 0.995,
      });
    };

    // Spawn high-velocity golden spark from Anaar flowerpots (both left & right sides)
    const spawnAnaarFountain = (side: "left" | "right") => {
      if (particles.length >= maxParticles - 10) return;
      const isMobile = width < 640;
      let anaarX: number;
      if (side === "left") {
        anaarX = isMobile ? 42 : width > 768 ? 130 : 90;
      } else {
        anaarX = isMobile ? width - 42 : width > 768 ? width - 130 : width - 90;
      }
      const anaarY = isMobile ? height - 60 : height - 48;

      // Double spark emission per burst
      for (let i = 0; i < 3; i++) {
        const spreadAngle = -Math.PI / 2 + (Math.random() - 0.5) * 0.55;
        const speed = 4.2 + Math.random() * 5.5;
        particles.push({
          x: anaarX + (Math.random() - 0.5) * 6,
          y: anaarY,
          vx: Math.cos(spreadAngle) * speed,
          vy: Math.sin(spreadAngle) * speed,
          alpha: 0.95,
          decay: 0.016 + Math.random() * 0.014,
          color:
            Math.random() > 0.35
              ? "#FEF08A"
              : festiveColors[Math.floor(Math.random() * festiveColors.length)],
          size: 2.0 + Math.random() * 2.5,
          flickerSpeed: 0.35,
          flickerOffset: Math.random() * Math.PI,
          type: "anaar_fountain",
          gravity: 0.13, // Gravitational arc
          drag: 0.98,
        });
      }
    };

    // Launch a live visual Sky Rocket
    const launchSkyRocket = (forcedSide?: "left" | "right" | "center") => {
      if (rockets.length >= 4) return;
      let launchX: number;
      if (forcedSide === "left") {
        launchX = width * (0.06 + Math.random() * 0.22);
      } else if (forcedSide === "right") {
        launchX = width * (0.72 + Math.random() * 0.22);
      } else {
        launchX =
          Math.random() > 0.5
            ? width * (0.05 + Math.random() * 0.25)
            : width * (0.7 + Math.random() * 0.25);
      }
      const targetY = height * (0.12 + Math.random() * 0.28);
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.22;
      const speed = 8.5 + Math.random() * 3.2;

      const burstTypes: ("standard" | "willow" | "ring" | "multi")[] = [
        "standard",
        "willow",
        "ring",
        "multi",
      ];
      const burstType = burstTypes[Math.floor(Math.random() * burstTypes.length)];

      rockets.push({
        x: launchX,
        y: height - 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        targetY,
        color: festiveColors[Math.floor(Math.random() * festiveColors.length)],
        burstType,
        trail: [],
        exploded: false,
      });
    };

    // Detonate rocket into spectacular multi-colored starburst
    const explodeRocket = (rocket: SkyRocket) => {
      const isWillow = rocket.burstType === "willow";
      const isRing = rocket.burstType === "ring";
      const isMulti = rocket.burstType === "multi";

      const burstCount = isWillow ? 48 : isRing ? 42 : isMulti ? 54 : 38;

      for (let i = 0; i < burstCount; i++) {
        if (particles.length >= maxParticles) break;
        const angle = (Math.PI * 2 * i) / burstCount + (Math.random() - 0.5) * 0.25;
        let speed = 2.0 + Math.random() * 4.2;
        if (isRing) speed = 3.6 + Math.random() * 0.8;

        let pColor = rocket.color;
        if (isMulti) {
          pColor = festiveColors[Math.floor(Math.random() * festiveColors.length)];
        } else if (isWillow) {
          pColor = Math.random() > 0.4 ? "#FBBF24" : "#FEF08A";
        } else if (Math.random() > 0.6) {
          pColor = "#FFFFFF";
        }

        particles.push({
          x: rocket.x,
          y: rocket.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 0.98,
          decay: isWillow ? 0.008 + Math.random() * 0.008 : 0.014 + Math.random() * 0.012,
          color: pColor,
          size: isWillow ? 2.4 + Math.random() * 2.2 : 2.2 + Math.random() * 2.8,
          flickerSpeed: 0.3,
          flickerOffset: Math.random() * Math.PI,
          type: isWillow ? "willow" : "burst",
          gravity: isWillow ? 0.035 : 0.055,
          drag: isWillow ? 0.975 : 0.965,
        });
      }
    };

    // Interactive pointer sparklers & click pop
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (particles.length >= maxParticles) return;
      const clientX = "touches" in e ? e.touches[0]?.clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0]?.clientY : e.clientY;
      if (clientX === undefined || clientY === undefined) return;

      if (Math.random() > 0.35) {
        particles.push({
          x: clientX + (Math.random() - 0.5) * 10,
          y: clientY + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 1.8,
          vy: (Math.random() - 0.5) * 1.8 - 0.6,
          alpha: 0.85,
          decay: 0.025 + Math.random() * 0.02,
          color: festiveColors[Math.floor(Math.random() * festiveColors.length)],
          size: 1.8 + Math.random() * 2.2,
          flickerSpeed: 0.35,
          flickerOffset: Math.random() * Math.PI,
          type: "sparkler",
          gravity: 0.03,
          drag: 0.98,
        });
      }
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("button, a, input, select, textarea, [role='button']")) {
        return;
      }
      // Cheerful multi-colored firecracker burst on click
      const burstColor = festiveColors[Math.floor(Math.random() * festiveColors.length)];
      for (let i = 0; i < 22; i++) {
        if (particles.length >= maxParticles) break;
        const angle = (Math.PI * 2 * i) / 22 + (Math.random() - 0.5) * 0.3;
        const speed = 1.6 + Math.random() * 3.2;
        particles.push({
          x: e.clientX,
          y: e.clientY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 0.95,
          decay: 0.02 + Math.random() * 0.015,
          color: Math.random() > 0.4 ? burstColor : "#FFFFFF",
          size: 2.2 + Math.random() * 2.2,
          flickerSpeed: 0.3,
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
    for (let i = 0; i < 25; i++) {
      spawnEmber(Math.random() * width, Math.random() * height);
    }

    const render = (time: number) => {
      if (isTabVisible) {
        ctx.clearRect(0, 0, width, height);
        ctx.globalCompositeOperation = "lighter";

        // 1. Periodically spawn warm floating golden embers
        if (time - lastEmberSpawn > 250) {
          spawnEmber();
          lastEmberSpawn = time;
        }

        // 2. Periodically spawn Anaar fountain sparks (alternating left & right)
        if (time - lastAnaarSpawn > 60) {
          spawnAnaarFountain("left");
          spawnAnaarFountain("right");
          lastAnaarSpawn = time;
        }

        // 3. Sky Rockets: Launched every 1.4 to 1.8 seconds for continuous fireworks!
        if (time - lastRocketLaunch > 1400) {
          launchSkyRocket();
          // 30% chance for dual celebratory rockets from opposite sides
          if (Math.random() > 0.68) {
            launchSkyRocket(Math.random() > 0.5 ? "right" : "left");
          }
          lastRocketLaunch = time;
        }

        // 4. Update and render Sky Rockets
        for (let rIdx = rockets.length - 1; rIdx >= 0; rIdx--) {
          const rocket = rockets[rIdx];
          rocket.x += rocket.vx;
          rocket.y += rocket.vy;
          rocket.vy += 0.045; // Gentle upward deceleration

          // Add radiant trail spark
          rocket.trail.push({
            x: rocket.x + (Math.random() - 0.5) * 4,
            y: rocket.y + 6,
            alpha: 0.9,
            size: 1.8 + Math.random() * 1.8,
          });

          // Draw trail
          for (let tIdx = rocket.trail.length - 1; tIdx >= 0; tIdx--) {
            const t = rocket.trail[tIdx];
            t.alpha -= 0.055;
            t.y += 0.6;
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
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, 18);
          ctx.stroke();

          // Red rocket body
          ctx.fillStyle = "#DC2626";
          ctx.fillRect(-2.5, -9, 5, 11);

          // Golden nosecone
          ctx.fillStyle = "#FBBF24";
          ctx.beginPath();
          ctx.moveTo(0, -16);
          ctx.lineTo(3.5, -9);
          ctx.lineTo(-3.5, -9);
          ctx.closePath();
          ctx.fill();

          // Burning fuse sparks at bottom
          ctx.fillStyle = "#FEF08A";
          ctx.beginPath();
          ctx.arc(0, 2, 3, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();

          // Check if rocket reached apex
          if (rocket.y <= rocket.targetY || rocket.vy >= -0.8) {
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
          if (p.size > 2.0 && currentAlpha > 0.4) {
            ctx.lineWidth = 0.9;
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
      window.removeEventListener("orientationchange", handleResize);
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("click", handleClick);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isEnabled]);

  return (
    <>
      {/* 1. Fullscreen Canvas Layer: Live Sky Rockets, Anaar Fountain Showers, & Golden Embers */}
      {isEnabled && (
        <canvas
          ref={canvasRef}
          className="fixed inset-0 pointer-events-none z-20 w-full h-full mix-blend-screen"
          style={{ opacity: 0.94 }}
          aria-hidden="true"
        />
      )}

      {/* 2. Visual Animated Diyas & Live Firecrackers Layer — Fully Responsive Across All Screens */}
      {isEnabled && (
        <div
          className="fixed inset-0 pointer-events-none z-25 overflow-hidden w-full h-full max-w-[100vw]"
          aria-hidden="true"
        >
          {/* ================= TOP HEADER DIYAS ================= */}
          {/* Top Left Diya */}
          <div className="absolute top-2.5 sm:top-4 left-3 sm:left-6 animate-diya-subtle-sway opacity-95 drop-shadow-[0_4px_18px_rgba(245,158,11,0.7)]">
            <DiyaSvg className="w-7 h-7 sm:w-9 sm:h-9 md:w-11 md:h-11" glowIntensity={1.3} />
          </div>

          {/* Top Right Diya */}
          <div className="absolute top-2.5 sm:top-4 right-3 sm:right-6 animate-diya-subtle-sway opacity-95 drop-shadow-[0_4px_18px_rgba(245,158,11,0.7)]">
            <DiyaSvg className="w-7 h-7 sm:w-9 sm:h-9 md:w-11 md:h-11" glowIntensity={1.3} />
          </div>

          {/* Top Center-Left Floating Diya (Desktop & Tablet) */}
          <div className="hidden md:block absolute top-3 left-[28%] animate-diya-drift-left opacity-90 drop-shadow-[0_4px_16px_rgba(245,158,11,0.6)]">
            <DiyaSvg className="w-8 h-8 lg:w-9 lg:h-9" glowIntensity={1.2} />
          </div>

          {/* Top Center-Right Floating Diya (Desktop & Tablet) */}
          <div className="hidden md:block absolute top-3 right-[28%] animate-diya-drift-right opacity-90 drop-shadow-[0_4px_16px_rgba(245,158,11,0.6)]">
            <DiyaSvg className="w-8 h-8 lg:w-9 lg:h-9" glowIntensity={1.2} />
          </div>

          {/* ================= LEFT FLANK FLOATING DIYAS ================= */}
          {/* Left Diya 1 (Upper) */}
          <div className="absolute top-[18%] left-1.5 sm:left-4 animate-diya-drift-left opacity-95 drop-shadow-[0_4px_18px_rgba(245,158,11,0.7)]">
            <DiyaSvg
              className="w-7 h-7 sm:w-9 sm:h-9 md:w-11 md:h-11 transform -rotate-6"
              glowIntensity={1.25}
            />
          </div>

          {/* Left Diya 2 (Mid-Upper) */}
          <div className="absolute top-[38%] left-1.5 sm:left-4 animate-diya-drift-right opacity-95 drop-shadow-[0_4px_18px_rgba(245,158,11,0.7)]">
            <DiyaSvg
              className="w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 transform rotate-3"
              glowIntensity={1.2}
            />
          </div>

          {/* Left Diya 3 (Mid-Lower) */}
          <div className="absolute top-[58%] left-1.5 sm:left-4 animate-diya-drift-left opacity-95 drop-shadow-[0_4px_18px_rgba(245,158,11,0.7)]">
            <DiyaSvg
              className="w-7 h-7 sm:w-9 sm:h-9 md:w-11 md:h-11 transform -rotate-4"
              glowIntensity={1.25}
            />
          </div>

          {/* Left Diya 4 (Lower) */}
          <div className="absolute top-[76%] left-1.5 sm:left-4 animate-diya-subtle-sway opacity-95 drop-shadow-[0_4px_18px_rgba(245,158,11,0.7)]">
            <DiyaSvg
              className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 transform rotate-6"
              glowIntensity={1.2}
            />
          </div>

          {/* ================= RIGHT FLANK FLOATING DIYAS ================= */}
          {/* Right Diya 1 (Upper) */}
          <div className="absolute top-[22%] right-1.5 sm:right-4 animate-diya-drift-right opacity-95 drop-shadow-[0_4px_18px_rgba(245,158,11,0.7)]">
            <DiyaSvg
              className="w-7 h-7 sm:w-9 sm:h-9 md:w-11 md:h-11 transform rotate-6"
              glowIntensity={1.25}
            />
          </div>

          {/* Right Diya 2 (Mid-Upper) */}
          <div className="absolute top-[42%] right-1.5 sm:right-4 animate-diya-drift-left opacity-95 drop-shadow-[0_4px_18px_rgba(245,158,11,0.7)]">
            <DiyaSvg
              className="w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 transform -rotate-3"
              glowIntensity={1.2}
            />
          </div>

          {/* Right Diya 3 (Mid-Lower) */}
          <div className="absolute top-[62%] right-1.5 sm:right-4 animate-diya-drift-right opacity-95 drop-shadow-[0_4px_18px_rgba(245,158,11,0.7)]">
            <DiyaSvg
              className="w-7 h-7 sm:w-9 sm:h-9 md:w-11 md:h-11 transform rotate-4"
              glowIntensity={1.25}
            />
          </div>

          {/* Right Diya 4 (Lower) */}
          <div className="absolute top-[80%] right-1.5 sm:right-4 animate-diya-subtle-sway opacity-95 drop-shadow-[0_4px_18px_rgba(245,158,11,0.7)]">
            <DiyaSvg
              className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 transform -rotate-6"
              glowIntensity={1.2}
            />
          </div>

          {/* ================= BOTTOM CORNER CEREMONIAL DIYAS ================= */}
          {/* Bottom Left Corner Diya (Raised safely above mobile bottom bar) */}
          <div className="absolute bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] sm:bottom-4 left-3 sm:left-6 animate-diya-subtle-sway opacity-95 drop-shadow-[0_6px_22px_rgba(245,158,11,0.85)]">
            <DiyaSvg className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12" glowIntensity={1.4} />
          </div>

          {/* Bottom Right Corner Diya */}
          <div className="absolute bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] sm:bottom-4 right-3 sm:right-6 animate-diya-subtle-sway opacity-95 drop-shadow-[0_6px_22px_rgba(245,158,11,0.85)]">
            <DiyaSvg className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12" glowIntensity={1.4} />
          </div>

          {/* ================= LIVE FIRECRACKERS (CHAKRI, ANAAR, PHULJHADI) ================= */}
          {/* Left Anaar Flowerpot Fountain */}
          <div className="absolute bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] sm:bottom-3 left-14 sm:left-24 drop-shadow-[0_4px_18px_rgba(245,158,11,0.8)]">
            <AnaarFirecracker className="w-9 h-11 sm:w-12 sm:h-14 md:w-14 md:h-16" />
          </div>

          {/* Right Anaar Flowerpot Fountain */}
          <div className="absolute bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] sm:bottom-3 right-14 sm:right-24 drop-shadow-[0_4px_18px_rgba(245,158,11,0.8)]">
            <AnaarFirecracker className="w-9 h-11 sm:w-12 sm:h-14 md:w-14 md:h-16" />
          </div>

          {/* Left Whirling Ground Chakri */}
          <div className="hidden sm:block absolute bottom-14 left-4 md:left-8 drop-shadow-[0_0_20px_rgba(245,158,11,0.85)]">
            <ChakriFirecracker className="w-10 h-10 md:w-12 md:h-12" />
          </div>

          {/* Right Whirling Ground Chakri */}
          <div className="hidden sm:block absolute bottom-14 right-4 md:right-8 drop-shadow-[0_0_20px_rgba(245,158,11,0.85)]">
            <ChakriFirecracker className="w-10 h-10 md:w-12 md:h-12" />
          </div>

          {/* Left Sizzling Phuljhadi Sparkler */}
          <div className="absolute top-[48%] left-1.5 sm:left-4 drop-shadow-[0_0_16px_rgba(251,191,36,0.9)]">
            <PhuljhadiSparkler className="w-6 h-14 sm:w-8 sm:h-16 md:w-9 md:h-18" />
          </div>

          {/* Right Sizzling Phuljhadi Sparkler */}
          <div className="absolute top-[48%] right-1.5 sm:right-4 drop-shadow-[0_0_16px_rgba(251,191,36,0.9)]">
            <PhuljhadiSparkler className="w-6 h-14 sm:w-8 sm:h-16 md:w-9 md:h-18" />
          </div>
        </div>
      )}

      {/* Inlined CSS animations for living flame flicker, rapid chakri spin & weightless floating */}
      <style>{`
        @keyframes flameFlicker {
          0%, 100% {
            transform: scale(1) rotate(0deg);
            opacity: 0.95;
          }
          20% {
            transform: scaleY(1.14) scaleX(0.93) rotate(-2deg);
            opacity: 1;
          }
          40% {
            transform: scaleY(0.90) scaleX(1.06) rotate(1.8deg);
            opacity: 0.88;
          }
          60% {
            transform: scaleY(1.10) scaleX(0.95) rotate(-1.2deg);
            opacity: 0.98;
          }
          80% {
            transform: scaleY(0.95) scaleX(1.03) rotate(1.2deg);
            opacity: 0.92;
          }
        }

        .diya-flame-flicker {
          animation: flameFlicker 1.3s ease-in-out infinite alternate;
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
          animation: chakriSpinFast 0.28s linear infinite;
        }

        @keyframes chakriBob {
          0%, 100% {
            transform: translateY(0px) scale(1);
          }
          50% {
            transform: translateY(-5px) scale(1.04);
          }
        }

        .animate-chakri-bob {
          animation: chakriBob 2.2s ease-in-out infinite;
        }

        @keyframes anaarPulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.03);
          }
        }

        .animate-anaar-pulse {
          animation: anaarPulse 1.6s ease-in-out infinite;
        }

        @keyframes phuljhadiSparks {
          0%, 100% {
            transform: scale(1) rotate(0deg);
            opacity: 0.95;
          }
          25% {
            transform: scale(1.25) rotate(25deg);
            opacity: 1;
          }
          50% {
            transform: scale(0.88) rotate(-15deg);
            opacity: 0.85;
          }
          75% {
            transform: scale(1.3) rotate(40deg);
            opacity: 1;
          }
        }

        .animate-phuljhadi-sparks {
          animation: phuljhadiSparks 0.20s ease-in-out infinite;
        }

        @keyframes phuljhadiFloat {
          0%, 100% {
            transform: translateY(0px) rotate(12deg);
          }
          50% {
            transform: translateY(-16px) rotate(5deg);
          }
        }

        .animate-phuljhadi-float {
          animation: phuljhadiFloat 4.8s ease-in-out infinite;
        }

        @keyframes diyaDriftLeft {
          0%, 100% {
            transform: translateY(0px) rotate(-4deg);
          }
          50% {
            transform: translateY(-24px) rotate(4deg);
          }
        }

        @keyframes diyaDriftRight {
          0%, 100% {
            transform: translateY(-18px) rotate(4deg);
          }
          50% {
            transform: translateY(14px) rotate(-4deg);
          }
        }

        @keyframes diyaSubtleSway {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-10px) rotate(2deg);
          }
        }

        .animate-diya-drift-left {
          animation: diyaDriftLeft 6.0s ease-in-out infinite;
        }

        .animate-diya-drift-right {
          animation: diyaDriftRight 6.8s ease-in-out infinite;
        }

        .animate-diya-subtle-sway {
          animation: diyaSubtleSway 4.5s ease-in-out infinite;
        }
      `}</style>
    </>
  );
});
