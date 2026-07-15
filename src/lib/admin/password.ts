/**
 * Password generation + strength scoring for the admin "set password now"
 * user-creation path (Phase G.11, Section 2).
 *
 * This is a client-side convenience only — the server still validates
 * length/complexity independently in `createUserWithPassword`
 * (see `src/lib/admin/users.functions.ts`). Nothing here talks to Supabase.
 */

const LOWER = "abcdefghjkmnpqrstuvwxyz"; // no i/l/o — visually ambiguous
const UPPER = "ABCDEFGHJKMNPQRSTUVWXYZ";
const DIGITS = "23456789"; // no 0/1 — visually ambiguous
const SYMBOLS = "!@#$%^&*-_=+?";
const ALL = LOWER + UPPER + DIGITS + SYMBOLS;

function randomChar(pool: string): string {
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}

function shuffle(chars: string[]): string[] {
  const arr = [...chars];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Generates a random password guaranteed to contain each character class. */
export function generatePassword(length = 14): string {
  const guaranteed = [
    randomChar(LOWER),
    randomChar(UPPER),
    randomChar(DIGITS),
    randomChar(SYMBOLS),
  ];
  const rest = Array.from({ length: Math.max(length - guaranteed.length, 0) }, () =>
    randomChar(ALL),
  );
  return shuffle([...guaranteed, ...rest]).join("");
}

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: "Very weak" | "Weak" | "Fair" | "Good" | "Strong";
  /** 0-100, for a Progress bar. */
  percent: number;
  /** Semantic tone — feed into the STDL tone helpers, never a raw color class. */
  tone: "danger" | "warning" | "success";
};

/** Lightweight heuristic (length + character-class variety) — not a full zxcvbn. */
export function scorePasswordStrength(password: string): PasswordStrength {
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((re) =>
    re.test(password),
  ).length;

  let points = 0;
  if (password.length >= 8) points += 1;
  if (password.length >= 12) points += 1;
  if (password.length >= 16) points += 1;
  points += Math.max(classes - 1, 0);

  const score = Math.min(4, Math.max(0, Math.round((points / 6) * 4))) as PasswordStrength["score"];

  const byScore: Record<PasswordStrength["score"], Omit<PasswordStrength, "score">> = {
    0: { label: "Very weak", percent: 10, tone: "danger" },
    1: { label: "Weak", percent: 30, tone: "danger" },
    2: { label: "Fair", percent: 55, tone: "warning" },
    3: { label: "Good", percent: 78, tone: "warning" },
    4: { label: "Strong", percent: 100, tone: "success" },
  };

  if (password.length === 0) {
    return { score: 0, label: "Very weak", percent: 0, tone: "danger" };
  }

  return { score, ...byScore[score] };
}

/** Minimum password length enforced client-side to match the server validator. */
export const MIN_PASSWORD_LENGTH = 8;
