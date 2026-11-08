import { useEffect, useState, memo } from "react";
import { cn } from "@/lib/utils";

interface DivineRamParivarSequenceProps {
  isActive: boolean;
  onComplete?: () => void;
  className?: string;
}

/**
 * DivineRamParivarSequence:
 * Choreographed 15-second divine cinematic sequence:
 * 1. (0s - 3.5s): Ram ji followed by Sita ma and Lakshman ji walking forward smiling towards us.
 * 2. (3.5s - 7.0s): Affix classical Ram Darbar positions & raise hands in Abhay Mudra blessing.
 * 3. (7.0s - 10.8s): Shri Hanuman ji enters and bends down on one knee with folded hands in puja.
 * 4. (10.8s - 14.8s): "Shubh Deepawali" ringing celebration with swinging temple bells and golden radiance.
 * 5. (15.0s): Sequence concludes and banner auto-collapses to the hanging notch.
 */
export const DivineRamParivarSequence = memo(function DivineRamParivarSequence({
  isActive,
  onComplete,
  className,
}: DivineRamParivarSequenceProps) {
  // Current phase:
  // 0: Walking entrance towards viewer (0 - 3.5s)
  // 1: Positions affixed & Abhaya Mudra blessing (3.5 - 7.0s)
  // 2: Hanuman ji enters & kneels on one knee in devout puja (7.0 - 10.8s)
  // 3: "Shubh Deepawali" divine ringing celebration (10.8 - 15.0s)
  const [phase, setPhase] = useState<0 | 1 | 2 | 3>(0);

  useEffect(() => {
    if (!isActive) {
      setPhase(0);
      return;
    }

    setPhase(0);

    // Phase 1 at 3.5s: Affix positions and raise hands in blessing
    const t1 = setTimeout(() => {
      setPhase(1);
    }, 3500);

    // Phase 2 at 7.0s: Hanuman ji enters and kneels on one knee with folded hands
    const t2 = setTimeout(() => {
      setPhase(2);
    }, 7000);

    // Phase 3 at 10.8s: "Shubh Deepawali" ringing celebration
    const t3 = setTimeout(() => {
      setPhase(3);
    }, 10800);

    // Phase 4 at 15.0s: Conclude and auto-collapse
    const t4 = setTimeout(() => {
      onComplete?.();
    }, 15000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [isActive, onComplete]);

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-xl bg-gradient-to-b from-[#180307] via-[#2a0610] to-[#100205] border-2 border-amber-500/70 shadow-[0_12px_36px_rgba(0,0,0,0.85),0_0_24px_rgba(245,158,11,0.35)] select-none",
        className,
      )}
      style={{ minHeight: "360px" }}
    >
      {/* 1. Divine Ayodhya Sanctum Backdrop with Golden Temple Arch & Radiant Halo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Soft background sanctum illumination */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-600/30 via-rose-950/45 to-black/95" />

        {/* Golden Arch / Mandir Toran */}
        <svg
          viewBox="0 0 600 380"
          className="w-full h-full opacity-35 object-cover"
          aria-hidden="true"
        >
          <path
            d="M30 380 L30 140 C30 60 150 20 300 20 C450 20 570 60 570 140 L570 380"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="3"
          />
          <path
            d="M50 380 L50 145 C50 75 160 38 300 38 C440 38 550 75 550 145 L550 380"
            fill="none"
            stroke="#FEF08A"
            strokeWidth="1"
            strokeDasharray="6,6"
          />
        </svg>

        {/* Ambient Divine Sunburst Halo behind Bhagwan Ram */}
        <div
          className={cn(
            "absolute top-8 left-1/2 -translate-x-1/2 w-52 h-52 rounded-full bg-gradient-to-r from-amber-300 via-amber-500 to-amber-200 blur-2xl transition-all duration-1000",
            phase >= 1 ? "opacity-80 scale-125" : "opacity-45 scale-100",
          )}
        />

        {/* Rotating Golden Prabhamandal Rays during blessing & ringing phases */}
        {phase >= 1 && (
          <div
            className="absolute top-10 left-1/2 -translate-x-1/2 w-64 h-64 border-2 border-amber-300/40 rounded-full animate-spin pointer-events-none"
            style={{ animationDuration: "20s" }}
          >
            <div className="w-full h-full border border-dashed border-amber-400/35 rounded-full" />
          </div>
        )}

        {/* Flower Petal Shower during Hanuman ji puja & Deepavali celebration */}
        {phase >= 2 && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-25">
            <span className="petal petal-1">🌸</span>
            <span className="petal petal-2">🌼</span>
            <span className="petal petal-3">🌺</span>
            <span className="petal petal-4">🌸</span>
            <span className="petal petal-5">🌼</span>
            <span className="petal petal-6">🌺</span>
          </div>
        )}
      </div>

      {/* 2. Left & Right Swaying Temple Bells with Dynamic Sound Resonance */}
      <div
        className={cn(
          "absolute top-3 left-4 sm:left-6 w-7 h-10 transition-transform origin-top z-20",
          phase === 3 ? "animate-bell-ring-fast" : "animate-bell-sway",
        )}
      >
        <svg
          viewBox="0 0 32 40"
          className="w-full h-full drop-shadow-[0_2px_10px_rgba(245,158,11,0.85)]"
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
        {phase === 3 && (
          <div className="absolute -inset-3 rounded-full border border-amber-300 animate-ping opacity-75" />
        )}
      </div>
      <div
        className={cn(
          "absolute top-3 right-4 sm:right-6 w-7 h-10 transition-transform origin-top z-20",
          phase === 3 ? "animate-bell-ring-fast" : "animate-bell-sway-delayed",
        )}
      >
        <svg
          viewBox="0 0 32 40"
          className="w-full h-full drop-shadow-[0_2px_10px_rgba(245,158,11,0.85)]"
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
        {phase === 3 && (
          <div className="absolute -inset-3 rounded-full border border-amber-300 animate-ping opacity-75" />
        )}
      </div>

      {/* 3. The Divine Stage Area — Walking Entrance, Position Affixing, Blessing & Hanuman ji Puja */}
      <div className="relative z-10 w-full h-[330px] sm:h-[370px] flex items-end justify-center pb-3 px-2">
        <div className="relative w-full max-w-[440px] h-[310px] sm:h-[350px] mx-auto flex items-end justify-center">
          {/* Phase 0 (0 - 3.5s): Prabhu Shri Ram, Mata Sita & Lakshman ji walking forward towards us */}
          <img
            src="/images/diwali/ram-parivar-walking.jpg"
            alt="Bhagwan Shri Ram walking forward towards the viewer with Mata Sita and Lakshman ji"
            className={cn(
              "absolute bottom-0 max-h-[295px] sm:max-h-[335px] w-auto max-w-full object-contain rounded-lg drop-shadow-[0_8px_24px_rgba(0,0,0,0.95)] transition-all duration-1000 ease-out",
              phase === 0
                ? "opacity-100 scale-100 animate-divine-walk"
                : "opacity-0 scale-105 pointer-events-none",
            )}
            loading="eager"
          />

          {/* Phase 1 (3.5 - 7.0s): Affixing positions & raising right hand in Abhaya Mudra to bless everyone */}
          <img
            src="/images/diwali/ram-parivar-standing-blessing.jpg"
            alt="Bhagwan Shri Ram raising his right hand in Abhaya Mudra blessing everyone with Mata Sita and Lakshman ji"
            className={cn(
              "absolute bottom-0 max-h-[295px] sm:max-h-[335px] w-auto max-w-full object-contain rounded-lg drop-shadow-[0_8px_24px_rgba(0,0,0,0.95)] transition-all duration-1000 ease-out",
              phase === 1
                ? "opacity-100 scale-100 drop-shadow-[0_0_32px_rgba(245,158,11,0.85)]"
                : "opacity-0 pointer-events-none",
            )}
            loading="eager"
          />

          {/* Phase 2 & 3 (7.0 - 15.0s): Shri Hanuman ji arrives and kneels on one knee with folded hands in devout puja */}
          <img
            src="/images/diwali/ram-parivar-blessing.jpg"
            alt="Shri Ram Darbar with Shri Hanuman ji kneeling at Prabhu Ram's lotus feet in devout prayer"
            className={cn(
              "absolute bottom-0 max-h-[295px] sm:max-h-[335px] w-auto max-w-full object-contain rounded-lg drop-shadow-[0_8px_24px_rgba(0,0,0,0.95)] transition-all duration-1000 ease-out",
              phase >= 2
                ? "opacity-100 scale-100 drop-shadow-[0_0_40px_rgba(251,191,36,0.95)]"
                : "opacity-0 pointer-events-none",
            )}
            loading="eager"
          />

          {/* Phase 0 Footstep Lotus Ripples appearing as they step forward */}
          {phase === 0 && (
            <div className="absolute bottom-2 inset-x-0 flex justify-center gap-12 pointer-events-none">
              <span className="text-sm animate-ping opacity-75">🪷</span>
              <span className="text-sm animate-ping opacity-90 delay-300">🪷</span>
              <span className="text-sm animate-ping opacity-75 delay-150">🪷</span>
            </div>
          )}

          {/* Phase 1: Radiant Golden Abhaya Mudra Blessing Wave from Divine Hands */}
          {phase === 1 && (
            <div
              className="absolute top-[28%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-radial from-white via-amber-300 to-transparent blur-xs animate-pulse pointer-events-none"
              style={{ animationDuration: "1.2s" }}
            >
              {/* Expanding Divine Blessing Rays */}
              <div className="absolute inset-0 flex items-center justify-center text-amber-200 text-base animate-ping">
                ✨
              </div>
              <div className="absolute -inset-4 rounded-full border border-amber-300/60 animate-ping opacity-60" />
            </div>
          )}

          {/* Phase 2: Shri Hanuman ji Kneeling on One Knee in Devout Puja Aura */}
          {phase >= 2 && (
            <div
              className="absolute bottom-[10%] left-[34%] -translate-x-1/2 w-24 h-24 rounded-full bg-radial from-amber-400/50 via-orange-500/25 to-transparent blur-md animate-pulse pointer-events-none"
              style={{ animationDuration: "1.5s" }}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-amber-300 text-sm font-bold drop-shadow-md">
                🙏
              </div>
              <div className="absolute -inset-2 rounded-full border border-amber-400/40 animate-ping opacity-50" />
            </div>
          )}
        </div>
      </div>

      {/* 4. Phase 3 Divine "Shubh Deepawali" Ringing Crest & Lightburst */}
      {phase === 3 && (
        <div className="absolute inset-x-0 top-3 z-30 flex flex-col items-center pointer-events-none animate-deepavali-burst">
          <div className="px-5 py-1.5 rounded-full bg-gradient-to-r from-amber-600/95 via-rose-700/98 to-amber-600/95 border-2 border-amber-300 shadow-[0_0_30px_rgba(251,191,36,1)] backdrop-blur-md flex items-center gap-2">
            <span
              className="text-amber-200 text-base animate-spin"
              style={{ animationDuration: "4s" }}
            >
              🪔
            </span>
            <span className="font-serif text-2xl sm:text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-200 to-amber-400 drop-shadow-[0_2px_14px_rgba(245,158,11,1)]">
              शुभ दीपावली
            </span>
            <span
              className="text-amber-200 text-base animate-spin"
              style={{ animationDuration: "4s" }}
            >
              🪔
            </span>
          </div>
          <div className="text-[11px] sm:text-xs font-bold text-amber-100 tracking-widest uppercase mt-1 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
            ॥ Happy Diwali and a Happy New Year ॥
          </div>
        </div>
      )}

      {/* 5. Progressive Divine Captions throughout the 15-second sequence */}
      <div className="absolute bottom-1.5 inset-x-0 z-20 text-center px-4">
        <div className="inline-block px-3 py-1 rounded-full bg-black/80 border border-amber-500/50 backdrop-blur-md transition-all duration-500 shadow-md">
          {phase === 0 && (
            <span className="text-[10.5px] sm:text-xs font-medium text-amber-200 tracking-wide flex items-center gap-1.5">
              <span>🚶‍♂️</span>
              <span>प्रभु श्री राम, माता सीता एवं लक्ष्मण जी का दिव्य आगमन...</span>
            </span>
          )}
          {phase === 1 && (
            <span className="text-[10.5px] sm:text-xs font-bold text-amber-300 tracking-wide flex items-center gap-1.5 animate-pulse">
              <span>✋</span>
              <span>श्री राम परिवार का अभय वरदान एवं सर्वमंगल दिव्य आशीर्वाद</span>
            </span>
          )}
          {phase === 2 && (
            <span className="text-[10.5px] sm:text-xs font-bold text-amber-200 tracking-wide flex items-center gap-1.5">
              <span>🙏</span>
              <span>हनुमान जी द्वारा श्री चरणों में करबद्ध एक-जानु पावन वंदन</span>
            </span>
          )}
          {phase === 3 && (
            <span className="text-[10.5px] sm:text-xs font-black text-amber-100 tracking-wider flex items-center gap-1.5">
              <span>🔔</span>
              <span>दीपोत्सव महापर्व की हार्दिक मंगलकामनाएं · जय श्री राम!</span>
            </span>
          )}
        </div>
      </div>

      {/* Embedded CSS for divine walking gait, petal shower & deepavali burst */}
      <style>{`
        @keyframes divineWalk {
          0% {
            transform: scale(0.88) translateY(16px);
            opacity: 0.85;
          }
          25% {
            transform: scale(0.92) translateY(6px);
            opacity: 0.92;
          }
          50% {
            transform: scale(0.95) translateY(10px);
            opacity: 0.96;
          }
          75% {
            transform: scale(0.98) translateY(3px);
            opacity: 0.99;
          }
          100% {
            transform: scale(1.0) translateY(0px);
            opacity: 1;
          }
        }

        .animate-divine-walk {
          animation: divineWalk 3.5s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }

        @keyframes bellRingFast {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(18deg); }
          40% { transform: rotate(-18deg); }
          60% { transform: rotate(12deg); }
          80% { transform: rotate(-12deg); }
        }

        .animate-bell-ring-fast {
          animation: bellRingFast 0.45s ease-in-out infinite;
        }

        @keyframes deepavaliBurst {
          0% {
            transform: scale(0.6) translateY(-20px);
            opacity: 0;
          }
          50% {
            transform: scale(1.08) translateY(0);
            opacity: 1;
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }

        .animate-deepavali-burst {
          animation: deepavaliBurst 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* Flower Petals raining down gently */
        .petal {
          position: absolute;
          font-size: 14px;
          opacity: 0.85;
          animation: petalFall 3.8s linear infinite;
        }
        .petal-1 { left: 15%; animation-delay: 0s; }
        .petal-2 { left: 30%; animation-delay: 1.2s; }
        .petal-3 { left: 50%; animation-delay: 0.6s; }
        .petal-4 { left: 68%; animation-delay: 2.1s; }
        .petal-5 { left: 82%; animation-delay: 0.9s; }
        .petal-6 { left: 42%; animation-delay: 1.8s; }

        @keyframes petalFall {
          0% {
            top: -20px;
            transform: translateX(0) rotate(0deg);
            opacity: 0;
          }
          15% {
            opacity: 0.9;
          }
          85% {
            opacity: 0.9;
          }
          100% {
            top: 100%;
            transform: translateX(35px) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
});
