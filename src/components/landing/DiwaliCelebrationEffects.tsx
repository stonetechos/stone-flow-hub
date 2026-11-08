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

/**
 * 5. Auspicious Vedic Swastik (स्वस्तिक) with 4 sacred bindu dots and golden divine glow.
 */
function SwastikSvg({ className }: { className?: string }) {
  return (
    <div className={cn("relative inline-block select-none pointer-events-none", className)}>
      <div className="absolute inset-0 rounded-full bg-amber-500/25 blur-md pointer-events-none animate-pulse" />
      <svg
        viewBox="0 0 64 64"
        className="w-full h-full drop-shadow-[0_0_14px_rgba(245,158,11,0.85)] overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="goldSwastikGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFBEB" />
            <stop offset="30%" stopColor="#FCD34D" />
            <stop offset="70%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
        </defs>
        <g
          fill="none"
          stroke="url(#goldSwastikGrad)"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M32 10 L32 54" />
          <path d="M10 32 L54 32" />
          <path d="M32 10 L50 10" />
          <path d="M54 32 L54 50" />
          <path d="M32 54 L14 54" />
          <path d="M10 32 L10 14" />
        </g>
        <circle cx="21" cy="21" r="2.6" fill="#FBBF24" />
        <circle cx="43" cy="21" r="2.6" fill="#FBBF24" />
        <circle cx="43" cy="43" r="2.6" fill="#FBBF24" />
        <circle cx="21" cy="43" r="2.6" fill="#FBBF24" />
      </svg>
    </div>
  );
}

/**
 * 6. Classic Diwali Sky Rocket with red-gold body, conical nosecone, and sparkling fuse.
 */
function DiwaliRocketSvg({ className, flip = false }: { className?: string; flip?: boolean }) {
  return (
    <div
      className={cn(
        "relative inline-block select-none pointer-events-none animate-rocket-bob",
        className,
      )}
    >
      <svg
        viewBox="0 0 60 70"
        className="w-full h-full drop-shadow-[0_4px_14px_rgba(239,68,68,0.75)] overflow-visible"
        aria-hidden="true"
      >
        {flip ? (
          <>
            <line
              x1="34"
              y1="28"
              x2="46"
              y2="66"
              stroke="#92400E"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M34 38 C32 42 33 46 31 50"
              stroke="#FBBF24"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle
              cx="31"
              cy="50"
              r="2.5"
              fill="#FFFFFF"
              style={{ filter: "drop-shadow(0 0 6px #F59E0B)" }}
            />
            <g transform="rotate(-22 32 25)">
              <rect
                x="26"
                y="16"
                width="12"
                height="24"
                rx="2"
                fill="#DC2626"
                stroke="#F59E0B"
                strokeWidth="1"
              />
              <rect x="26" y="21" width="12" height="4" fill="#FBBF24" />
              <rect x="26" y="30" width="12" height="3" fill="#FBBF24" />
              <polygon
                points="32,4 24,16 40,16"
                fill="#F59E0B"
                stroke="#FEF08A"
                strokeWidth="0.8"
              />
              <circle cx="32" cy="23" r="1.2" fill="#DC2626" />
            </g>
          </>
        ) : (
          <>
            <line
              x1="26"
              y1="28"
              x2="14"
              y2="66"
              stroke="#92400E"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M26 38 C28 42 27 46 29 50"
              stroke="#FBBF24"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle
              cx="29"
              cy="50"
              r="2.5"
              fill="#FFFFFF"
              style={{ filter: "drop-shadow(0 0 6px #F59E0B)" }}
            />
            <g transform="rotate(22 28 25)">
              <rect
                x="22"
                y="16"
                width="12"
                height="24"
                rx="2"
                fill="#DC2626"
                stroke="#F59E0B"
                strokeWidth="1"
              />
              <rect x="22" y="21" width="12" height="4" fill="#FBBF24" />
              <rect x="22" y="30" width="12" height="3" fill="#FBBF24" />
              <polygon
                points="28,4 20,16 36,16"
                fill="#F59E0B"
                stroke="#FEF08A"
                strokeWidth="0.8"
              />
              <circle cx="28" cy="23" r="1.2" fill="#DC2626" />
            </g>
          </>
        )}
      </svg>
    </div>
  );
}

/**
 * 7. Sacred Polished Copper Kalash with Mango Leaves & Animated Dripping Amrit Water.
 */
function CopperKalashWaterSvg({ className }: { className?: string }) {
  return (
    <div className={cn("relative inline-block select-none pointer-events-none", className)}>
      <svg
        viewBox="0 0 60 84"
        className="w-full h-full drop-shadow-[0_4px_16px_rgba(217,119,6,0.75)] overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="copperKalashGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7C2D12" />
            <stop offset="25%" stopColor="#C2410C" />
            <stop offset="50%" stopColor="#FB923C" />
            <stop offset="75%" stopColor="#EA580C" />
            <stop offset="100%" stopColor="#7C2D12" />
          </linearGradient>
          <linearGradient id="mangoLeafGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#15803D" />
            <stop offset="50%" stopColor="#22C55E" />
            <stop offset="100%" stopColor="#14532D" />
          </linearGradient>
          <radialGradient id="amritWaterGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#E0F2FE" />
            <stop offset="60%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#0284C7" />
          </radialGradient>
        </defs>

        {/* Fresh Green Mango Leaves (आम्रपल्लव) on Kalash Rim */}
        <g>
          <path
            d="M30 16 C25 8 20 6 16 10 C16 15 22 18 28 20 Z"
            fill="url(#mangoLeafGrad)"
            stroke="#166534"
            strokeWidth="0.6"
          />
          <path
            d="M30 16 C35 8 40 6 44 10 C44 15 38 18 32 20 Z"
            fill="url(#mangoLeafGrad)"
            stroke="#166534"
            strokeWidth="0.6"
          />
          <path d="M30 15 C28 5 32 5 30 2 C28 5 32 5 30 15 Z" fill="url(#mangoLeafGrad)" />
        </g>

        {/* Coconut / Shriphal on top */}
        <ellipse cx="30" cy="14" rx="7" ry="6" fill="#78350F" stroke="#92400E" strokeWidth="0.8" />
        <path d="M26 12 C28 14 32 14 34 12" stroke="#D97706" strokeWidth="0.6" />

        {/* Flared Copper Neck & Holy Water inside */}
        <ellipse cx="30" cy="20" rx="15" ry="4" fill="#EA580C" stroke="#FDBA74" strokeWidth="0.8" />
        <ellipse cx="30" cy="19" rx="12" ry="2.5" fill="#38BDF8" opacity="0.85" />

        {/* Sacred Kalawa / Mouli Red Thread */}
        <rect x="18" y="22" width="24" height="3" rx="1.5" fill="#DC2626" />
        <line
          x1="20"
          y1="23.5"
          x2="40"
          y2="23.5"
          stroke="#FBBF24"
          strokeWidth="1"
          strokeDasharray="2,2"
        />

        {/* Globular Copper Pot (तांबे का लोटा) */}
        <path
          d="M18 24 C14 30 12 38 16 46 C20 53 40 53 44 46 C48 38 46 30 42 24 Z"
          fill="url(#copperKalashGrad)"
          stroke="#9A3412"
          strokeWidth="1"
        />

        {/* Polished Highlight */}
        <path
          d="M26 26 C23 32 23 40 25 46"
          stroke="#FED7AA"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.75"
        />

        {/* Embossed sacred swastik motif on copper */}
        <path
          d="M30 33 L30 41 M26 37 L34 37 M30 33 L33 33 M34 37 L34 40 M30 41 L27 41 M26 37 L26 34"
          stroke="#FEF08A"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.9"
        />

        {/* Base */}
        <ellipse
          cx="30"
          cy="50"
          rx="10"
          ry="2.5"
          fill="#7C2D12"
          stroke="#9A3412"
          strokeWidth="0.8"
        />

        {/* Animated Dripping Water Drops (अमृत धारा) */}
        <g className="water-drop-1">
          <path
            d="M30 52 C28.5 55 27 58 27 60 C27 62 28.3 64 30 64 C31.7 64 33 62 33 60 C33 58 31.5 55 30 52 Z"
            fill="url(#amritWaterGlow)"
          />
          <ellipse cx="29" cy="59" rx="0.8" ry="1.5" fill="#FFFFFF" opacity="0.9" />
        </g>
        <g className="water-drop-2">
          <path
            d="M30 52 C28.5 55 27 58 27 60 C27 62 28.3 64 30 64 C31.7 64 33 62 33 60 C33 58 31.5 55 30 52 Z"
            fill="url(#amritWaterGlow)"
          />
          <ellipse cx="29" cy="59" rx="0.8" ry="1.5" fill="#FFFFFF" opacity="0.9" />
        </g>

        {/* Water Ripples below */}
        <ellipse
          cx="30"
          cy="74"
          rx="12"
          ry="4"
          fill="none"
          stroke="#38BDF8"
          className="water-ripple-1"
        />
        <ellipse
          cx="30"
          cy="74"
          rx="12"
          ry="4"
          fill="none"
          stroke="#7DD3FC"
          className="water-ripple-2"
        />
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

  const [isBannerMinimized, setIsBannerMinimized] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const stored = localStorage.getItem("stos_diwali_banner_minimized");
      return stored === "true";
    } catch {
      return false;
    }
  });

  // Auto-collapse the full banner to the iPhone 10 style header notch after 15 seconds
  useEffect(() => {
    if (isBannerMinimized) return;
    const timer = setTimeout(() => {
      setIsBannerMinimized(true);
    }, 15000);
    return () => clearTimeout(timer);
  }, [isBannerMinimized]);

  const toggleBanner = () => {
    setIsBannerMinimized((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("stos_diwali_banner_minimized", String(next));
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

      {/* 2. Visual Animated Festive Layer — Strictly Uncluttered & Mobile Safe */}
      {isEnabled && (
        <div
          className="fixed inset-0 pointer-events-none z-30 overflow-hidden w-full h-full max-w-[100vw]"
          aria-hidden="true"
        >
          {/* ================= 1. IPHONE 10 STYLE HEADER NOTCH BANNER (~10 mm / ~38px) ================= */}
          <div
            onClick={toggleBanner}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleBanner();
              }
            }}
            className={cn(
              "fixed top-0 left-1/2 -translate-x-1/2 z-50 h-[36px] sm:h-[38px] w-[310px] sm:w-[380px] md:w-[410px] bg-gradient-to-b from-[#1D050C] via-[#2C0712] to-[#130307] border-b-2 border-x border-amber-500/80 rounded-b-2xl sm:rounded-b-3xl shadow-[0_4px_22px_rgba(0,0,0,0.85),0_0_16px_rgba(245,158,11,0.4)] backdrop-blur-md flex items-center justify-between px-3.5 sm:px-4 cursor-pointer hover:border-amber-400 transition-all duration-500 ease-out group select-none",
              isBannerMinimized
                ? "translate-y-0 opacity-100 pointer-events-auto"
                : "-translate-y-full opacity-0 pointer-events-none",
            )}
            title="Click to view Shri Ram Darbar Diwali blessing"
          >
            {/* Left Auspicious Diya Sparkle */}
            <span className="text-amber-400 text-xs sm:text-sm animate-pulse">🪔</span>

            {/* Apple iPhone 10 notch style center text */}
            <div className="flex items-center gap-1.5 overflow-hidden">
              <span className="font-serif font-bold text-[11px] sm:text-xs md:text-[12.5px] tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 drop-shadow-[0_1px_6px_rgba(245,158,11,0.6)] truncate">
                Happy Diwali and a Happy New Year
              </span>
            </div>

            {/* Right Sparkle & Expand indicator */}
            <div className="flex items-center gap-1 text-amber-300">
              <span className="text-xs animate-pulse">✨</span>
              <span className="text-[10px] opacity-75 group-hover:opacity-100 group-hover:translate-y-0.5 transition-all">
                ▼
              </span>
            </div>
          </div>

          {/* ================= 2. FULL HANGING SHUBH DIPAWAALI & HEAD-TO-TOE RAM DARBAR BANNER ================= */}
          <div
            className={cn(
              "fixed top-0 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1) z-40 max-w-[94vw] w-[540px] sm:w-[600px] lg:w-[640px]",
              isBannerMinimized
                ? "-translate-y-[calc(100%+30px)] opacity-0 pointer-events-none"
                : "translate-y-0 opacity-100 pointer-events-auto",
            )}
          >
            {/* Hanging suspension cords */}
            <div className="w-full flex justify-between px-10 sm:px-16 h-4 sm:h-5">
              <div className="w-1 h-full bg-gradient-to-b from-amber-400 via-amber-600 to-amber-800 shadow-[0_0_6px_rgba(245,158,11,0.6)] relative">
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-gradient-to-br from-amber-200 via-amber-500 to-amber-800 shadow-md" />
              </div>
              <div className="w-1 h-full bg-gradient-to-b from-amber-400 via-amber-600 to-amber-800 shadow-[0_0_6px_rgba(245,158,11,0.6)] relative">
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-gradient-to-br from-amber-200 via-amber-500 to-amber-800 shadow-md" />
              </div>
            </div>

            {/* Banner card */}
            <div className="w-full bg-gradient-to-b from-[#2a0810]/95 via-[#4a0d1a]/98 to-[#2a0810]/95 border-2 border-t-0 border-amber-500/70 rounded-b-2xl sm:rounded-b-3xl shadow-[0_16px_45px_rgba(0,0,0,0.85),0_0_30px_rgba(245,158,11,0.35)] p-3 sm:p-4 md:p-5 backdrop-blur-xl relative overflow-hidden flex flex-col items-center">
              {/* Filigree inner border */}
              <div className="absolute inset-1 sm:inset-1.5 border border-amber-400/35 border-t-0 rounded-b-xl sm:rounded-b-2xl pointer-events-none" />

              {/* Temple bells */}
              <div className="absolute top-2 left-3 sm:left-5 w-5 h-7 sm:w-6 sm:h-8 animate-bell-sway origin-top">
                <svg
                  viewBox="0 0 32 40"
                  className="w-full h-full drop-shadow-[0_2px_8px_rgba(245,158,11,0.6)]"
                >
                  <path
                    d="M16 4 C14 12 8 20 6 28 C6 32 26 32 26 28 C24 20 18 12 16 4 Z"
                    fill="#F59E0B"
                    stroke="#B45309"
                    strokeWidth="1"
                  />
                  <ellipse cx="16" cy="30" rx="10" ry="3" fill="#D97706" />
                  <circle cx="16" cy="35" r="2.5" fill="#FEF08A" />
                </svg>
              </div>
              <div className="absolute top-2 right-3 sm:right-5 w-5 h-7 sm:w-6 sm:h-8 animate-bell-sway-delayed origin-top">
                <svg
                  viewBox="0 0 32 40"
                  className="w-full h-full drop-shadow-[0_2px_8px_rgba(245,158,11,0.6)]"
                >
                  <path
                    d="M16 4 C14 12 8 20 6 28 C6 32 26 32 26 28 C24 20 18 12 16 4 Z"
                    fill="#F59E0B"
                    stroke="#B45309"
                    strokeWidth="1"
                  />
                  <ellipse cx="16" cy="30" rx="10" ry="3" fill="#D97706" />
                  <circle cx="16" cy="35" r="2.5" fill="#FEF08A" />
                </svg>
              </div>

              {/* Divya Shubh Deepavali Header */}
              <div className="text-center mb-2 sm:mb-3 relative z-10 px-6 sm:px-12">
                <div className="text-[10px] sm:text-[11px] uppercase tracking-[2px] font-bold text-amber-300/90 mb-0.5 flex items-center justify-center gap-2">
                  <span>❖</span>
                  <span>दीपोत्सव महापर्व · पावन प्रकाशोत्सव</span>
                  <span>❖</span>
                </div>
                <div className="font-serif text-3xl sm:text-4xl md:text-5xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-b from-white via-amber-200 to-amber-500 drop-shadow-[0_2px_18px_rgba(245,158,11,0.95)]">
                  शुभ दीपावली
                </div>
                <div className="text-xs sm:text-sm text-amber-100/90 font-medium tracking-wide drop-shadow-sm mt-0.5">
                  ॥ प्रभु श्री राम परिवार का दिव्य आशीर्वाद सदा बना रहे ॥
                </div>
              </div>

              {/* Full-Body (Head to Toe) Ram Darbar Artwork Frame — Complete and Uncropped */}
              <div className="w-full flex items-center justify-center rounded-xl overflow-hidden border-2 border-amber-500/70 shadow-[0_8px_24px_rgba(0,0,0,0.7),0_0_20px_rgba(245,158,11,0.35)] relative bg-[#120407] p-1 sm:p-1.5 group">
                <img
                  src="/images/diwali/ram-parivar-blessing.jpg"
                  alt="Shri Ram Darbar Complete Blessing with Hanuman ji"
                  className="max-h-[320px] sm:max-h-[380px] md:max-h-[430px] w-auto max-w-full object-contain rounded-lg drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)] transition-transform duration-500 group-hover:scale-[1.01]"
                  loading="eager"
                />
              </div>

              {/* Graceful Footer Note (Unobstructed, outside the image frame) */}
              <div className="mt-2 text-center">
                <div className="text-[11px] sm:text-xs font-semibold text-amber-200 tracking-wide">
                  श्री राम दरबार दिव्य आशीर्वाद · सुख, शांति, समृद्धि एवं आरोग्यता का पावन वरदान
                </div>
              </div>
            </div>

            {/* Pull Tab / Collapse to Notch Button */}
            <button
              type="button"
              onClick={toggleBanner}
              className="bg-gradient-to-b from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-amber-100 hover:text-white border border-t-0 border-amber-400/60 rounded-b-xl px-4 py-1 text-[11px] font-bold shadow-md cursor-pointer transition-all flex items-center gap-1.5 focus:outline-none"
              title="Collapse to iPhone notch"
            >
              <span>▲</span>
              <span>बैनर समेटें / Collapse to Notch</span>
            </button>
          </div>

          {/* ================= LEFT SIDE PILLAR — STRICTLY ONE BELOW THE OTHER ================= */}
          <div className="absolute top-0 bottom-0 left-2 sm:left-4 md:left-6 w-12 sm:w-14 flex flex-col justify-between items-center py-6 sm:py-8 pointer-events-auto">
            {/* 1. Diya on top */}
            <div
              className="transition-transform hover:scale-110 drop-shadow-[0_4px_16px_rgba(245,158,11,0.8)]"
              title="1. Auspicious Diya (Top)"
            >
              <DiyaSvg className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12" glowIntensity={1.3} />
            </div>

            {/* 2. Swastik */}
            <div className="transition-transform hover:scale-110" title="2. Sacred Vedic Swastik">
              <SwastikSvg className="w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11" />
            </div>

            {/* 3. Rocket */}
            <div className="transition-transform hover:scale-110" title="3. Diwali Sky Rocket">
              <DiwaliRocketSvg className="w-8 h-10 sm:w-10 sm:h-12 md:w-11 md:h-14" />
            </div>

            {/* 4. Chakri in the middle */}
            <div
              className="transition-transform hover:scale-110"
              title="4. Whirling Chakri (Middle)"
            >
              <ChakriFirecracker className="w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12" />
            </div>

            {/* 5. Fuljhari */}
            <div
              className="transition-transform hover:scale-110"
              title="5. Sizzling Fuljhari Sparkler"
            >
              <PhuljhadiSparkler className="w-8 h-12 sm:w-9 sm:h-14 md:w-10 md:h-16" />
            </div>

            {/* 6. Copper Kalash with dripping water at the bottom */}
            <div
              className="transition-transform hover:scale-110"
              title="6. Copper Kalash with Dripping Amrit Jal (Bottom)"
            >
              <CopperKalashWaterSvg className="w-10 h-14 sm:w-12 sm:h-16 md:w-13 md:h-18" />
            </div>
          </div>

          {/* ================= RIGHT SIDE PILLAR — STRICTLY ONE BELOW THE OTHER ================= */}
          <div className="absolute top-0 bottom-0 right-2 sm:right-4 md:right-6 w-12 sm:w-14 flex flex-col justify-between items-center py-6 sm:py-8 pointer-events-auto">
            {/* 1. Diya on top */}
            <div
              className="transition-transform hover:scale-110 drop-shadow-[0_4px_16px_rgba(245,158,11,0.8)]"
              title="1. Auspicious Diya (Top)"
            >
              <DiyaSvg className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12" glowIntensity={1.3} />
            </div>

            {/* 2. Swastik */}
            <div className="transition-transform hover:scale-110" title="2. Sacred Vedic Swastik">
              <SwastikSvg className="w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11" />
            </div>

            {/* 3. Rocket */}
            <div className="transition-transform hover:scale-110" title="3. Diwali Sky Rocket">
              <DiwaliRocketSvg className="w-8 h-10 sm:w-10 sm:h-12 md:w-11 md:h-14" flip />
            </div>

            {/* 4. Chakri in the middle */}
            <div
              className="transition-transform hover:scale-110"
              title="4. Whirling Chakri (Middle)"
            >
              <ChakriFirecracker className="w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12" />
            </div>

            {/* 5. Fuljhari */}
            <div
              className="transition-transform hover:scale-110"
              title="5. Sizzling Fuljhari Sparkler"
            >
              <PhuljhadiSparkler className="w-8 h-12 sm:w-9 sm:h-14 md:w-10 md:h-16" />
            </div>

            {/* 6. Copper Kalash with dripping water at the bottom */}
            <div
              className="transition-transform hover:scale-110"
              title="6. Copper Kalash with Dripping Amrit Jal (Bottom)"
            >
              <CopperKalashWaterSvg className="w-10 h-14 sm:w-12 sm:h-16 md:w-13 md:h-18" />
            </div>
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

        @keyframes rocketBob {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-4px);
          }
        }

        .animate-rocket-bob {
          animation: rocketBob 2.6s ease-in-out infinite;
        }

        @keyframes bellSway {
          0% {
            transform: rotate(-7deg);
          }
          100% {
            transform: rotate(7deg);
          }
        }

        .animate-bell-sway {
          animation: bellSway 3s ease-in-out infinite alternate;
        }

        .animate-bell-sway-delayed {
          animation: bellSway 3s ease-in-out infinite alternate;
          animation-delay: 1.5s;
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

        @keyframes waterDrip {
          0% {
            transform: translateY(0) scaleY(0.6) scaleX(0.9);
            opacity: 0;
          }
          20% {
            transform: translateY(4px) scaleY(1.1) scaleX(0.9);
            opacity: 0.95;
          }
          70% {
            transform: translateY(30px) scaleY(1.4) scaleX(0.7);
            opacity: 1;
          }
          90% {
            transform: translateY(40px) scaleY(0.8) scaleX(1.3);
            opacity: 0.7;
          }
          100% {
            transform: translateY(44px) scaleY(0.3) scaleX(1.8);
            opacity: 0;
          }
        }

        .water-drop-1 {
          animation: waterDrip 2.2s cubic-bezier(0.55, 0.055, 0.675, 0.19) infinite;
          transform-origin: center top;
        }

        .water-drop-2 {
          animation: waterDrip 2.2s cubic-bezier(0.55, 0.055, 0.675, 0.19) infinite;
          animation-delay: 1.1s;
          transform-origin: center top;
        }

        @keyframes waterRipple {
          0% {
            transform: scale(0.2);
            opacity: 0.9;
            stroke-width: 1.5;
          }
          100% {
            transform: scale(2.4);
            opacity: 0;
            stroke-width: 0.4;
          }
        }

        .water-ripple-1 {
          animation: waterRipple 2.2s ease-out infinite;
          transform-origin: 30px 62px;
        }

        .water-ripple-2 {
          animation: waterRipple 2.2s ease-out infinite;
          animation-delay: 1.1s;
          transform-origin: 30px 62px;
        }
      `}</style>
    </>
  );
});
