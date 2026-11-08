import { useEffect, useState, memo, useRef } from "react";
import { cn } from "@/lib/utils";

interface DivineRamParivarSequenceProps {
  isActive: boolean;
  onComplete?: () => void;
  className?: string;
}

/**
 * Synthesizes an authentic Indian Temple Bell (मन्दिर की घण्टा / Ghanti) "तांग..." sound
 * using the Web Audio API with realistic bronze inharmonic overtones and resonant decay.
 */
function playTempleBellSound() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;

    // Bronze Temple Bell Inharmonic Overtones:
    // Strike chime + Fundamental (D5 ~587Hz) + Minor 3rd + 5th + Octave + Upper Chimes
    const bellPartials = [
      { freq: 587.33, gain: 0.65, decay: 3.8 }, // Fundamental (तांग...)
      { freq: 704.8, gain: 0.45, decay: 3.0 }, // Tierce
      { freq: 880.0, gain: 0.35, decay: 2.5 }, // Quint
      { freq: 1174.66, gain: 0.25, decay: 2.0 }, // Nominal octave
      { freq: 1760.0, gain: 0.16, decay: 1.4 }, // High resonance
      { freq: 2420.0, gain: 0.12, decay: 1.0 }, // Metallic strike chime
    ];

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.75, now);
    masterGain.connect(ctx.destination);

    bellPartials.forEach(({ freq, gain, decay }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      // Slight pitch relaxation on strike
      osc.frequency.exponentialRampToValueAtTime(freq * 0.996, now + decay);

      // Fast strike attack (3ms) and long ringing resonance
      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.linearRampToValueAtTime(gain, now + 0.003);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + decay);

      osc.connect(gainNode);
      gainNode.connect(masterGain);

      osc.start(now);
      osc.stop(now + decay);
    });
  } catch {
    // Autoplay audio policy gracefully caught
  }
}

/**
 * DivineRamParivarSequence:
 * Choreographed 15-second divine cinematic sequence:
 *
 * 1. (0.0s - 3.8s):
 *    - Bhagwan Shri Ram, Mata Sita & Lakshman ji stand majestically in the sanctum in serene darbar formation.
 *
 * 2. (3.8s - 7.2s):
 *    - They raise their right hands in Abhaya Mudra to bless everyone.
 *    - Luminous divine halo rings (Prabhamandal) appear and radiate behind their heads.
 *
 * 3. (7.2s - 10.5s):
 *    - Shri Hanuman ji appears like magic at their lotus feet in bent & pranam mudra (anjali mudra)
 *      with a burst of golden light, sparkle, and flower petals.
 *
 * 4. (10.5s - 14.8s):
 *    - Authentic temple bell chime ("तांग...") rings.
 *    - "शुभ दीपावली" and tagline "आप सभी पर प्रभु श्री राम का आशीर्वाद सदैव बना रहे" appear.
 *
 * 5. (15.0s):
 *    - Banner auto-collapses and lifts up into the hanging notch.
 */
export const DivineRamParivarSequence = memo(function DivineRamParivarSequence({
  isActive,
  onComplete,
  className,
}: DivineRamParivarSequenceProps) {
  // Phase:
  // 0: Standing in serene majesty (0.0s - 3.8s)
  // 1: Raising hands in blessing + halo rings appear (3.8s - 7.2s)
  // 2: Hanuman ji appears like magic in bent pranam mudra (7.2s - 10.5s)
  // 3: "Shubh Deepawali" & Tagline + Temple bell chime (10.5s - 15.0s)
  const [phase, setPhase] = useState<0 | 1 | 2 | 3>(0);
  const bellPlayedRef = useRef(false);

  useEffect(() => {
    if (!isActive) {
      setPhase(0);
      bellPlayedRef.current = false;
      return;
    }

    setPhase(0);
    bellPlayedRef.current = false;

    // 3.8s: Raise hands to bless + halo rings appear
    const t1 = setTimeout(() => {
      setPhase(1);
    }, 3800);

    // 7.2s: Hanuman ji appears like magic in bent pranam mudra
    const t2 = setTimeout(() => {
      setPhase(2);
    }, 7200);

    // 10.5s: "Shubh Deepawali" + Tagline + Temple bell "तांग" sound
    const t3 = setTimeout(() => {
      setPhase(3);
      if (!bellPlayedRef.current) {
        bellPlayedRef.current = true;
        playTempleBellSound();
      }
    }, 10500);

    // 15.0s: Auto-collapse banner to hanging notch
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
      {/* 1. Divine Ayodhya Sanctum Ambient Backdrop */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Warm sanctum lighting glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-600/30 via-rose-950/45 to-black/95" />

        {/* Golden Arch / Mandir Toran Backdrop */}
        <svg
          viewBox="0 0 600 380"
          className="w-full h-full opacity-30 object-cover"
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

        {/* Ambient Divine Halo Sunburst behind Bhagwan Ram */}
        <div
          className={cn(
            "absolute top-8 left-1/2 -translate-x-1/2 w-60 h-60 rounded-full bg-gradient-to-r from-amber-300 via-amber-500 to-amber-200 blur-2xl transition-all duration-1000",
            phase >= 1 ? "opacity-80 scale-125" : "opacity-35 scale-95",
          )}
        />

        {/* Dynamic Divine Halo Rings appearing behind heads during blessing phase */}
        {phase >= 1 && (
          <>
            {/* Bhagwan Ram's Crown Halo Ring */}
            <div
              className="absolute top-10 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full border-2 border-amber-300/60 animate-spin pointer-events-none"
              style={{ animationDuration: "20s" }}
            >
              <div className="w-full h-full border border-dashed border-amber-200/50 rounded-full animate-pulse" />
            </div>
            {/* Expanding Blessing Rings */}
            <div className="absolute top-16 left-1/2 -translate-x-1/2 w-36 h-36 rounded-full border border-amber-300/70 animate-ping pointer-events-none" />
          </>
        )}

        {/* Celestial Flower Petal Shower during Hanuman ji appearance & Deepavali celebration */}
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

      {/* 2. Left & Right Swaying Temple Bells with Dynamic Acoustic Rings */}
      <div
        className={cn(
          "absolute top-3 left-4 sm:left-6 w-7 h-10 transition-transform origin-top z-20 cursor-pointer",
          phase === 3 ? "animate-bell-ring-fast" : "animate-bell-sway",
        )}
        onClick={playTempleBellSound}
        title="तांग! Mandir Bell (Click to ring)"
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
          "absolute top-3 right-4 sm:right-6 w-7 h-10 transition-transform origin-top z-20 cursor-pointer",
          phase === 3 ? "animate-bell-ring-fast" : "animate-bell-sway-delayed",
        )}
        onClick={playTempleBellSound}
        title="तांग! Mandir Bell (Click to ring)"
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

      {/* 3. The Divine Stage Area */}
      <div className="relative z-10 w-full h-[330px] sm:h-[370px] flex items-end justify-center pb-3 px-2">
        <div className="relative w-full max-w-[540px] h-[310px] sm:h-[350px] mx-auto flex items-end justify-center overflow-hidden">
          {/* ================= STAGE 1: RAM JI, LAKSHMAN JI & SITA MATA STANDING SERENELY (0.0s - 3.8s) ================= */}
          <div
            className={cn(
              "absolute inset-0 flex items-end justify-center transition-opacity duration-1000",
              phase === 0 ? "opacity-100" : "opacity-0 pointer-events-none",
            )}
          >
            <img
              src="/images/diwali/ram-parivar-walking.jpg"
              alt="Bhagwan Shri Ram, Mata Sita and Lakshman ji standing gracefully in the sanctum"
              className="max-h-[295px] sm:max-h-[335px] w-auto max-w-full object-contain rounded-lg drop-shadow-[0_8px_24px_rgba(0,0,0,0.95)]"
              loading="eager"
            />
          </div>

          {/* ================= STAGE 2: RAISE HANDS TO BLESS EVERYONE + HALO RINGS APPEAR (3.8s - 7.2s) ================= */}
          <div
            className={cn(
              "absolute inset-0 flex items-end justify-center transition-all duration-1000",
              phase === 1
                ? "opacity-100 scale-100 drop-shadow-[0_0_36px_rgba(245,158,11,0.9)]"
                : "opacity-0 scale-98 pointer-events-none",
            )}
          >
            <img
              src="/images/diwali/ram-parivar-standing-blessing.jpg"
              alt="Bhagwan Shri Ram raising his right hand in Abhaya Mudra blessing with Mata Sita and Lakshman ji"
              className="max-h-[295px] sm:max-h-[335px] w-auto max-w-full object-contain rounded-lg"
              loading="eager"
            />

            {/* Glowing Golden Aura at Raised Hands */}
            <div className="absolute top-[26%] left-1/2 -translate-x-1/2 pointer-events-none flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-2 border-amber-300/80 animate-ping" />
              <div className="absolute w-24 h-24 rounded-full border border-amber-400/50 animate-ping delay-200" />
            </div>
          </div>

          {/* ================= STAGE 3: HANUMAN JI APPEARS LIKE MAGIC IN BENT & PRANAM MUDRA (7.2s - 15.0s) ================= */}
          <div
            className={cn(
              "absolute inset-0 flex items-end justify-center transition-all duration-1000",
              phase >= 2
                ? "opacity-100 scale-100 drop-shadow-[0_0_42px_rgba(251,191,36,0.95)]"
                : "opacity-0 scale-95 pointer-events-none",
            )}
          >
            <img
              src="/images/diwali/ram-parivar-hanuman-kneeling.jpg"
              alt="Shri Ram Darbar with Shri Hanuman ji kneeling at Prabhu Ram's lotus feet with folded hands in devout prayer"
              className="max-h-[295px] sm:max-h-[335px] w-auto max-w-full object-contain rounded-lg"
              loading="eager"
            />

            {/* Magical Lightburst Materialization at Lotus Feet when Hanuman ji appears */}
            {phase === 2 && (
              <div className="absolute bottom-6 left-[32%] -translate-x-1/2 pointer-events-none flex flex-col items-center animate-magic-bloom">
                <span className="text-2xl animate-spin" style={{ animationDuration: "2s" }}>
                  ✨
                </span>
                <div className="w-20 h-20 rounded-full bg-radial from-amber-300/90 via-amber-500/50 to-transparent blur-sm animate-ping" />
                <span className="text-amber-300 text-lg font-bold drop-shadow-md animate-bounce -mt-8">
                  🙏
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. STAGE 4: "शुभ दीपावली" & TAGLINE BANNER (10.5s - 14.8s) with Temple Bell "तांग" */}
      {phase === 3 && (
        <div className="absolute inset-x-0 top-3 z-30 flex flex-col items-center pointer-events-none animate-deepavali-banner-unfurl">
          <div className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-700/95 via-rose-800/98 to-amber-700/95 border-2 border-amber-300 shadow-[0_0_36px_rgba(251,191,36,1)] backdrop-blur-md flex items-center gap-3">
            <span
              className="text-amber-200 text-xl animate-spin"
              style={{ animationDuration: "3.5s" }}
            >
              🪔
            </span>
            <div className="flex flex-col items-center text-center">
              <span className="font-serif text-2xl sm:text-3xl md:text-4xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-200 to-amber-400 drop-shadow-[0_2px_16px_rgba(245,158,11,1)]">
                शुभ दीपावली
              </span>
              <span className="text-xs sm:text-sm font-bold text-amber-100 tracking-wide mt-0.5 drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]">
                आप सभी पर प्रभु श्री राम का आशीर्वाद सदैव बना रहे
              </span>
            </div>
            <span
              className="text-amber-200 text-xl animate-spin"
              style={{ animationDuration: "3.5s" }}
            >
              🪔
            </span>
          </div>
        </div>
      )}

      {/* Embedded 60 FPS Keyframe Animations */}
      <style>{`
        /* 1. Magical Divine Lightburst when Hanuman ji appears at lotus feet */
        @keyframes magicBloom {
          0% {
            transform: scale(0.2);
            opacity: 0;
          }
          50% {
            transform: scale(1.4);
            opacity: 1;
          }
          100% {
            transform: scale(1.0);
            opacity: 0.9;
          }
        }

        .animate-magic-bloom {
          animation: magicBloom 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* 2. Deepavali Banner Unfurl */
        @keyframes deepavaliBannerUnfurl {
          0% {
            transform: scale(0.5) translateY(-30px);
            opacity: 0;
          }
          60% {
            transform: scale(1.06) translateY(2px);
            opacity: 1;
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }

        .animate-deepavali-banner-unfurl {
          animation: deepavaliBannerUnfurl 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* 3. Fast Temple Bell Ringing during celebration */
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

        /* 4. Flower Petals raining down gently */
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
