import { useEffect, useState, memo, useRef } from "react";
import { cn } from "@/lib/utils";

interface DivineRamParivarSequenceProps {
  isActive: boolean;
  onComplete?: () => void;
  className?: string;
}

/**
 * Synthesizes an authentic Indian Temple Bell (मन्दिर का महा-घण्टा / Bronze Ghanta) "तांग..." sound
 * played inside a stone temple sanctum (Garbha-Griha).
 *
 * Models:
 * 1. Heavy Clapper Strike Transient (metallic "ट्-क्लिं" impact tap)
 * 2. Ashtadhatu Bronze Partials:
 *    - Deep Hum tone (sub-bass drone resonating in stone garbha-griha)
 *    - Prime strike tone with twin beating for natural 1.5Hz bronze pulsation ("तांग-ॐ...")
 *    - Sacred Tierce (minor 3rd), Quint (5th), Nominal (octave), Decime, and shimmering overtones
 * 3. Stone Temple Sanctum Reverb:
 *    - ConvolverNode with a synthetic stone hall impulse response + multi-tap reflections
 *      mimicking high stone arches, dome acoustics, and lingering sacred reverberation.
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

    // Master bus
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.72, now);
    masterGain.connect(ctx.destination);

    // Stone Temple Sanctum Reverb via synthetic impulse response
    let reverbInput: GainNode = masterGain;
    try {
      const sampleRate = ctx.sampleRate;
      const reverbDuration = 3.6;
      const reverbLength = Math.floor(sampleRate * reverbDuration);
      const impulse = ctx.createBuffer(2, reverbLength, sampleRate);
      const leftChannel = impulse.getChannelData(0);
      const rightChannel = impulse.getChannelData(1);

      for (let i = 0; i < reverbLength; i++) {
        const t = i / sampleRate;
        // Stone hall exponential decay with high frequency damping
        const decayEnv = Math.exp(-t * 2.2);
        const stoneDamping = Math.exp(-t * 3.8);
        leftChannel[i] = (Math.random() * 2 - 1) * decayEnv * (0.35 + 0.65 * stoneDamping);
        rightChannel[i] = (Math.random() * 2 - 1) * decayEnv * (0.35 + 0.65 * stoneDamping);
      }

      const convolver = ctx.createConvolver();
      convolver.buffer = impulse;

      const reverbGain = ctx.createGain();
      reverbGain.gain.setValueAtTime(0.42, now);
      convolver.connect(reverbGain);
      reverbGain.connect(masterGain);

      // Dedicated send to reverb
      const sendNode = ctx.createGain();
      sendNode.gain.setValueAtTime(0.75, now);
      sendNode.connect(convolver);
      sendNode.connect(masterGain);
      reverbInput = sendNode;
    } catch {
      // Graceful fallback to direct master bus if convolver unavailable
      reverbInput = masterGain;
    }

    // Secondary Mandir Stone Arch Delay (for guaranteed natural slapback echo)
    const delay1 = ctx.createDelay();
    delay1.delayTime.setValueAtTime(0.065, now);
    const delay1Gain = ctx.createGain();
    delay1Gain.gain.setValueAtTime(0.25, now);
    const delayFilter = ctx.createBiquadFilter();
    delayFilter.type = "lowpass";
    delayFilter.frequency.setValueAtTime(1800, now);

    delay1.connect(delayFilter);
    delayFilter.connect(delay1Gain);
    delay1Gain.connect(masterGain);

    // 1. Heavy Clapper Strike Transient (initial metallic "ट्-क्लिं" impact)
    const strikeOsc1 = ctx.createOscillator();
    const strikeOsc2 = ctx.createOscillator();
    const strikeGain = ctx.createGain();

    strikeOsc1.type = "triangle";
    strikeOsc1.frequency.setValueAtTime(2650, now);
    strikeOsc2.type = "sine";
    strikeOsc2.frequency.setValueAtTime(3800, now);

    strikeGain.gain.setValueAtTime(0.001, now);
    strikeGain.gain.linearRampToValueAtTime(0.35, now + 0.0015);
    strikeGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

    strikeOsc1.connect(strikeGain);
    strikeOsc2.connect(strikeGain);
    strikeGain.connect(reverbInput);
    strikeGain.connect(delay1);

    strikeOsc1.start(now);
    strikeOsc2.start(now);
    strikeOsc1.stop(now + 0.05);
    strikeOsc2.stop(now + 0.05);

    // 2. Authentic Indian Ashtadhatu Bronze Temple Bell Harmonics
    // Fundamental ~392Hz (G4 - auspicious temple ghanta pitch)
    const F0 = 392.0;
    const bellPartials = [
      // Deep Hum Tone (sub-bass drone resonating in stone garbha-griha)
      { freq: F0 * 0.5, gain: 0.65, attack: 0.005, decay: 5.8 },
      // Prime Strike Tone with slight beating twin for bronze pulsation ("तांग-ॐ...")
      { freq: F0 * 1.0, gain: 0.85, attack: 0.002, decay: 5.2 },
      { freq: F0 * 1.0038, gain: 0.55, attack: 0.003, decay: 4.8 }, // 1.5Hz natural beating
      // Sacred Tierce (Minor Third - characteristic Indian temple bell mood)
      { freq: F0 * 1.1892, gain: 0.6, attack: 0.002, decay: 4.5 },
      // Quint (Fifth)
      { freq: F0 * 1.4983, gain: 0.45, attack: 0.002, decay: 3.8 },
      // Nominal (Octave - clear, singing "ting")
      { freq: F0 * 2.0, gain: 0.5, attack: 0.001, decay: 3.4 },
      // Decime & Superials (Upper bronze chime resonance)
      { freq: F0 * 2.76, gain: 0.28, attack: 0.001, decay: 2.4 },
      { freq: F0 * 3.0, gain: 0.25, attack: 0.001, decay: 2.0 },
      { freq: F0 * 4.07, gain: 0.18, attack: 0.001, decay: 1.5 },
      { freq: F0 * 5.42, gain: 0.12, attack: 0.001, decay: 1.0 },
    ];

    bellPartials.forEach(({ freq, gain, attack, decay }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      // Subtle downward micro-pitch glide on strike (physical bell elasticity)
      osc.frequency.exponentialRampToValueAtTime(freq * 0.997, now + decay);

      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.linearRampToValueAtTime(gain, now + attack);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + decay);

      osc.connect(gainNode);
      gainNode.connect(reverbInput);
      gainNode.connect(delay1);

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
        "relative w-full aspect-[16/9.5] sm:aspect-[16/9] min-h-[260px] max-h-[380px] overflow-hidden rounded-xl sm:rounded-2xl bg-black select-none",
        className,
      )}
    >
      {/* 1. Divine Stage Area — Ram Darbar's Full Seamless Sanctum Background */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        {/* ================= STAGE 1: RAM JI, LAKSHMAN JI & SITA MATA STANDING SERENELY (0.0s - 3.8s) ================= */}
        <div
          className={cn(
            "absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out",
            phase === 0 ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none",
          )}
        >
          <img
            src="/images/diwali/ram-parivar-walking.jpg"
            alt="Bhagwan Shri Ram, Mata Sita and Lakshman ji standing gracefully in the sanctum"
            className="w-full h-full object-cover object-center"
            loading="eager"
          />
        </div>

        {/* ================= STAGE 2: RAISE HANDS TO BLESS EVERYONE + HALO RINGS APPEAR (3.8s - 7.2s) ================= */}
        <div
          className={cn(
            "absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out",
            phase === 1 ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none",
          )}
        >
          <img
            src="/images/diwali/ram-parivar-standing-blessing.jpg"
            alt="Bhagwan Shri Ram raising his right hand in Abhaya Mudra blessing with Mata Sita and Lakshman ji"
            className="w-full h-full object-cover object-center drop-shadow-[0_0_28px_rgba(245,158,11,0.5)]"
            loading="eager"
          />

          {/* Golden Divine Halo Ring directly radiating behind Bhagwan Ram's Crown */}
          <div
            className="absolute top-[18%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-44 h-44 rounded-full border-2 border-amber-300/70 animate-spin pointer-events-none"
            style={{ animationDuration: "20s" }}
          >
            <div className="w-full h-full border border-dashed border-amber-200/50 rounded-full animate-pulse" />
          </div>

          {/* Expanding Radiant Sunburst Rays */}
          <div className="absolute top-[18%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-amber-300/80 animate-ping pointer-events-none" />

          {/* Glowing Golden Aura at Raised Blessing Hands */}
          <div className="absolute top-[28%] left-[50%] -translate-x-1/2 pointer-events-none flex items-center justify-center">
            <div className="w-14 h-14 rounded-full border-2 border-amber-300/80 animate-ping" />
            <div className="absolute w-20 h-20 rounded-full border border-amber-400/50 animate-ping delay-200" />
          </div>
        </div>

        {/* ================= STAGE 3: HANUMAN JI APPEARS LIKE MAGIC IN BENT & PRANAM MUDRA (7.2s - 15.0s) ================= */}
        <div
          className={cn(
            "absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out",
            phase >= 2 ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none",
          )}
        >
          <img
            src="/images/diwali/ram-parivar-hanuman-kneeling.jpg"
            alt="Shri Ram Darbar with Shri Hanuman ji kneeling at Prabhu Ram's lotus feet with folded hands in devout prayer"
            className="w-full h-full object-cover object-center drop-shadow-[0_0_36px_rgba(251,191,36,0.6)]"
            loading="eager"
          />
        </div>
      </div>

      {/* 2. Celestial Flower Petal Shower during Hanuman ji appearance & Deepavali celebration */}
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

      {/* 3. Left & Right Swaying Temple Bells with Dynamic Acoustic Rings */}
      <div
        className={cn(
          "absolute top-3 left-4 sm:left-6 w-7 h-10 transition-transform origin-top z-30 cursor-pointer",
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
          "absolute top-3 right-4 sm:right-6 w-7 h-10 transition-transform origin-top z-30 cursor-pointer",
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

      {/* 4. STAGE 4: "शुभ दीपावली" & TAGLINE BANNER (10.5s - 14.8s) with Temple Bell "तांग" */}
      {phase === 3 && (
        <div className="absolute inset-x-0 top-3 z-35 flex flex-col items-center pointer-events-none animate-deepavali-banner-unfurl">
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
        /* 1. Deepavali Banner Unfurl */
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
