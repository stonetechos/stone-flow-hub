import { useEffect, useState, memo } from "react";
import { cn } from "@/lib/utils";

interface DivineRamParivarSequenceProps {
  isActive: boolean;
  onComplete?: () => void;
  className?: string;
}

/**
 * DivineRamParivarSequence:
 * Choreographed 15-second divine cinematic video sequence:
 *
 * Act 1 (0.0s - 4.5s):
 *   - Prabhu Shri Ram, Mata Sita & Lakshman ji perform a majestic runway model walk
 *     advancing continuously forward from distance towards the viewer (scale 0.72 -> 1.0)
 *     with rhythmic left-right footstep cadence, hip sway, vertical bobbing, and lotus ripples.
 *
 * Act 2 (4.5s - 7.0s):
 *   - The walking gait decelerates to a complete, dignified stop.
 *   - Prabhu Ram, Mata Sita & Lakshman ji raise their hands in divine Abhaya Mudra to bless everyone.
 *   - Radiant golden blessing rays and rotating Prabhamandal halos illuminate their crowns and palms.
 *
 * Act 3 (7.0s - 10.5s):
 *   - Shri Hanuman ji comes walking in from the left side of the sanctum floor.
 *   - He halts at Prabhu Shri Ram's lotus feet, smoothly bends down onto one knee (ek-janu),
 *     and folds his palms together in devout prayer (Anjali Mudra / Pranam).
 *   - A celestial shower of marigold and lotus petals cascades down around them.
 *
 * Act 4 (10.5s - 14.8s):
 *   - A grand royal "शुभ दीपावली" celebration banner unfurls across the video with ringing temple bells.
 *
 * Act 5 (15.0s):
 *   - Banner smoothly lifts itself up into the hanging notch at the top.
 */
export const DivineRamParivarSequence = memo(function DivineRamParivarSequence({
  isActive,
  onComplete,
  className,
}: DivineRamParivarSequenceProps) {
  // 0: Model walk forward (0.0s - 4.5s)
  // 1: Stop & raise hands to bless in Abhaya Mudra (4.5s - 7.0s)
  // 2: Hanuman ji walks from left, bends on one knee & folds hands in Pranam (7.0s - 10.5s)
  // 3: "Shubh Deepawali" video celebration banner unfurls with ringing bells (10.5s - 15.0s)
  const [phase, setPhase] = useState<0 | 1 | 2 | 3>(0);

  // Sub-step for Hanuman ji entering (0 = offscreen, 1 = walking, 2 = kneeling with folded hands)
  const [hanumanStep, setHanumanStep] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    if (!isActive) {
      setPhase(0);
      setHanumanStep(0);
      return;
    }

    setPhase(0);
    setHanumanStep(0);

    // 4.5s: Come to stop and raise hands in blessing
    const t1 = setTimeout(() => {
      setPhase(1);
    }, 4500);

    // 7.0s: Hanuman ji enters walking from the left
    const t2 = setTimeout(() => {
      setPhase(2);
      setHanumanStep(1); // Walking from left
    }, 7000);

    // 8.8s: Hanuman ji bends down onto one knee and folds palms in pranam
    const t2b = setTimeout(() => {
      setHanumanStep(2); // Kneeling with folded hands
    }, 8800);

    // 10.5s: "Shubh Deepawali" grand video banner unfurls with ringing bells
    const t3 = setTimeout(() => {
      setPhase(3);
    }, 10500);

    // 15.0s: Complete sequence and auto-collapse to top notch
    const t4 = setTimeout(() => {
      onComplete?.();
    }, 15000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t2b);
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

        {/* Ambient Divine Prabhamandal Sunburst behind Bhagwan Ram */}
        <div
          className={cn(
            "absolute top-8 left-1/2 -translate-x-1/2 w-60 h-60 rounded-full bg-gradient-to-r from-amber-300 via-amber-500 to-amber-200 blur-2xl transition-all duration-1000",
            phase >= 1 ? "opacity-75 scale-125" : "opacity-35 scale-95",
          )}
        />

        {/* Rotating Sacred Sunburst Prabhamandal Rays during blessing & Deepavali */}
        {phase >= 1 && (
          <div
            className="absolute top-8 left-1/2 -translate-x-1/2 w-64 h-64 border-2 border-amber-300/40 rounded-full animate-spin pointer-events-none"
            style={{ animationDuration: "24s" }}
          >
            <div className="w-full h-full border border-dashed border-amber-400/35 rounded-full" />
          </div>
        )}

        {/* Celestial Flower Petal Shower during Hanuman ji puja & Deepavali celebration */}
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

      {/* 2. Left & Right Swaying Temple Bells with Dynamic Resonance */}
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

      {/* 3. The Divine Stage Area — Choreographed Runway Walk, Stop, Blessing & Hanuman Ji Puja */}
      <div className="relative z-10 w-full h-[330px] sm:h-[370px] flex items-end justify-center pb-3 px-2">
        <div className="relative w-full max-w-[540px] h-[310px] sm:h-[350px] mx-auto flex items-end justify-center overflow-hidden">
          {/* ================= ACT 1: RUNWAY MODEL WALK FORWARD (0.0s - 4.5s) ================= */}
          <div
            className={cn(
              "absolute inset-0 flex items-end justify-center transition-opacity duration-700",
              phase === 0 ? "opacity-100" : "opacity-0 pointer-events-none",
            )}
          >
            <img
              src="/images/diwali/ram-parivar-walking.jpg"
              alt="Bhagwan Shri Ram walking forward towards the camera like a model with Mata Sita and Lakshman ji"
              className="max-h-[295px] sm:max-h-[335px] w-auto max-w-full object-contain rounded-lg drop-shadow-[0_8px_24px_rgba(0,0,0,0.95)] animate-runway-model-walk"
              loading="eager"
            />

            {/* Dynamic Lotus Footsteps Appearing Under Their Stride */}
            <div className="absolute bottom-2 inset-x-0 flex justify-center gap-10 pointer-events-none">
              <span
                className="text-base animate-ping opacity-80"
                style={{ animationDuration: "1.4s" }}
              >
                🪷
              </span>
              <span
                className="text-base animate-ping opacity-90 delay-300"
                style={{ animationDuration: "1.4s" }}
              >
                🪷
              </span>
              <span
                className="text-base animate-ping opacity-80 delay-150"
                style={{ animationDuration: "1.4s" }}
              >
                🪷
              </span>
            </div>
          </div>

          {/* ================= ACT 2: STOP & RAISE HANDS IN ABHAYA MUDRA BLESSING (4.5s - 7.0s) ================= */}
          <div
            className={cn(
              "absolute inset-0 flex items-end justify-center transition-opacity duration-700",
              phase === 1 ? "opacity-100" : "opacity-0 pointer-events-none",
            )}
          >
            <img
              src="/images/diwali/ram-parivar-standing-blessing.jpg"
              alt="Bhagwan Shri Ram standing in position, raising his right hand in Abhaya Mudra blessing with Mata Sita and Lakshman ji"
              className="max-h-[295px] sm:max-h-[335px] w-auto max-w-full object-contain rounded-lg drop-shadow-[0_0_36px_rgba(245,158,11,0.85)] animate-blessing-ignite"
              loading="eager"
            />

            {/* Divine Blessing Rays & Rings Emanating from Palms */}
            <div className="absolute top-[26%] left-1/2 -translate-x-1/2 pointer-events-none flex items-center justify-center">
              <div className="w-14 h-14 rounded-full border-2 border-amber-300/80 animate-ping" />
              <div className="absolute w-20 h-20 rounded-full border border-amber-400/50 animate-ping delay-200" />
            </div>
          </div>

          {/* ================= ACT 3 & 4: HANUMAN JI WALKS FROM LEFT, KNEELS IN PRANAM (7.0s - 15.0s) ================= */}
          {/* Base scene: Standing Parivar blessing */}
          <div
            className={cn(
              "absolute inset-0 flex items-end justify-center transition-opacity duration-500",
              phase >= 2 && hanumanStep === 1 ? "opacity-100" : "opacity-0 pointer-events-none",
            )}
          >
            <img
              src="/images/diwali/ram-parivar-standing-blessing.jpg"
              alt="Shri Ram Parivar awaiting Shri Hanuman ji"
              className="max-h-[295px] sm:max-h-[335px] w-auto max-w-full object-contain rounded-lg drop-shadow-[0_0_30px_rgba(245,158,11,0.7)]"
              loading="eager"
            />

            {/* Dynamic Animated Actor: Shri Hanuman ji actively walking in from the left side */}
            <div
              className="absolute bottom-2 left-2 sm:left-4 z-20 pointer-events-none animate-hanuman-enter-walk"
              style={{ width: "130px", height: "180px" }}
            >
              <img
                src="/images/diwali/hanuman-walking.jpg"
                alt="Shri Hanuman ji walking in gracefully from the left carrying golden gada"
                className="w-full h-full object-contain drop-shadow-[0_4px_16px_rgba(245,158,11,0.9)] rounded-lg"
              />
            </div>
          </div>

          {/* Locked Classical Darbar: Hanuman ji kneeling on one knee with folded palms in Pranam */}
          <div
            className={cn(
              "absolute inset-0 flex items-end justify-center transition-all duration-700",
              phase >= 2 && hanumanStep === 2
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

            {/* Devotional Anjali Mudra Aura at Lotus Feet */}
            <div className="absolute bottom-6 left-[32%] -translate-x-1/2 pointer-events-none flex flex-col items-center">
              <span className="text-amber-300 text-lg font-bold drop-shadow-md animate-bounce">
                🙏
              </span>
              <div className="w-12 h-12 rounded-full border border-amber-400/60 animate-ping opacity-60" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. ACT 4: Grand Royal "Shubh Deepawali" Video Banner & Ringing Lightburst */}
      {phase === 3 && (
        <div className="absolute inset-x-0 top-3 z-30 flex flex-col items-center pointer-events-none animate-deepavali-banner-unfurl">
          <div className="px-6 py-2 rounded-2xl bg-gradient-to-r from-amber-700/95 via-rose-800/98 to-amber-700/95 border-2 border-amber-300 shadow-[0_0_36px_rgba(251,191,36,1)] backdrop-blur-md flex items-center gap-2.5">
            <span
              className="text-amber-200 text-lg animate-spin"
              style={{ animationDuration: "3.5s" }}
            >
              🪔
            </span>
            <div className="flex flex-col items-center">
              <span className="font-serif text-2xl sm:text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-200 to-amber-400 drop-shadow-[0_2px_16px_rgba(245,158,11,1)]">
                शुभ दीपावली
              </span>
              <span className="text-[10.5px] sm:text-xs font-bold text-amber-100 tracking-widest uppercase -mt-0.5 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                ॥ Happy Diwali and a Happy New Year ॥
              </span>
            </div>
            <span
              className="text-amber-200 text-lg animate-spin"
              style={{ animationDuration: "3.5s" }}
            >
              🪔
            </span>
          </div>
        </div>
      )}

      {/* 5. Progressive Narrative Caption describing each divine act */}
      <div className="absolute bottom-1.5 inset-x-0 z-20 text-center px-4">
        <div className="inline-block px-3.5 py-1 rounded-full bg-black/85 border border-amber-500/60 backdrop-blur-md transition-all duration-500 shadow-md">
          {phase === 0 && (
            <span className="text-[10.5px] sm:text-xs font-medium text-amber-200 tracking-wide flex items-center gap-1.5 animate-pulse">
              <span>🚶‍♂️</span>
              <span>
                प्रभु श्री राम, माता सीता एवं लक्ष्मण जी का दिव्य आगमन (Runway Model Walk)...
              </span>
            </span>
          )}
          {phase === 1 && (
            <span className="text-[10.5px] sm:text-xs font-bold text-amber-300 tracking-wide flex items-center gap-1.5 animate-pulse">
              <span>✋</span>
              <span>विराजमान होकर श्री राम परिवार द्वारा दिव्य अभय वरदान एवं आशीर्वाद</span>
            </span>
          )}
          {phase === 2 && (
            <span className="text-[10.5px] sm:text-xs font-bold text-amber-200 tracking-wide flex items-center gap-1.5">
              <span>🙏</span>
              <span>
                {hanumanStep === 1
                  ? "श्री हनुमान जी का बाईं ओर से पावन आगमन..."
                  : "श्री चरणों में एक-जानु बैठकर करबद्ध पावन वंदन (प्रणाम)"}
              </span>
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

      {/* Embedded 60 FPS Keyframe Animations */}
      <style>{`
        /* 1. Continuous Runway Model Walk Forward towards the viewer (scale 0.72 to 1.0 with cadence) */
        @keyframes runwayModelWalk {
          0% {
            transform: scale(0.72) translateY(24px) rotate(0deg);
          }
          15% {
            transform: scale(0.78) translateY(14px) rotate(-1.2deg);
          }
          30% {
            transform: scale(0.84) translateY(20px) rotate(1.2deg);
          }
          45% {
            transform: scale(0.90) translateY(10px) rotate(-1.0deg);
          }
          60% {
            transform: scale(0.95) translateY(16px) rotate(1.0deg);
          }
          75% {
            transform: scale(0.98) translateY(6px) rotate(-0.6deg);
          }
          90% {
            transform: scale(1.0) translateY(2px) rotate(0.4deg);
          }
          100% {
            transform: scale(1.0) translateY(0px) rotate(0deg);
          }
        }

        .animate-runway-model-walk {
          animation: runwayModelWalk 4.5s cubic-bezier(0.2, 0.8, 0.4, 1) forwards;
        }

        /* 2. Blessing Pose Ignition */
        @keyframes blessingIgnite {
          0% {
            transform: scale(0.97);
            filter: brightness(0.95);
          }
          50% {
            transform: scale(1.02);
            filter: brightness(1.15);
          }
          100% {
            transform: scale(1.0);
            filter: brightness(1.05);
          }
        }

        .animate-blessing-ignite {
          animation: blessingIgnite 1.2s ease-out forwards;
        }

        /* 3. Shri Hanuman Ji Walking in from Left Edge to Prabhu Ram's Lotus Feet */
        @keyframes hanumanEnterWalk {
          0% {
            transform: translateX(-160px) translateY(12px) rotate(-2deg);
            opacity: 0;
          }
          20% {
            transform: translateX(-90px) translateY(2px) rotate(1deg);
            opacity: 1;
          }
          45% {
            transform: translateX(-40px) translateY(8px) rotate(-1.5deg);
            opacity: 1;
          }
          70% {
            transform: translateX(10px) translateY(2px) rotate(1deg);
            opacity: 1;
          }
          90% {
            transform: translateX(45px) translateY(6px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateX(60px) translateY(10px) rotate(0deg);
            opacity: 0.95;
          }
        }

        .animate-hanuman-enter-walk {
          animation: hanumanEnterWalk 1.8s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }

        /* 4. Grand Deepavali Video Banner Unfurl */
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

        /* 5. Fast Temple Bell Ringing during celebration */
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

        /* 6. Flower Petals raining down gently */
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
