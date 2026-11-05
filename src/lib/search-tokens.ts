/**
 * Search Token & Variant Generator.
 *
 * Handles Indian business search realities:
 * 1. Multi-word searches (e.g. "Dileep Mahawar", "R K Stones", "Dev Narayan")
 * 2. Phonetic / spelling variants common in Indian transcription:
 *    - 'v' <-> 'w' (e.g. "Mahavar" <-> "Mahawar", "Shravan" <-> "Shrawan")
 *    - Double letter variations (e.g. "dillep" <-> "dileep" <-> "dilip")
 *    - 'ee' <-> 'i' (e.g. "Dileep" <-> "Dilip", "Meet" <-> "Mit")
 *    - 'oo' <-> 'u' (e.g. "Kumar" <-> "Koomar")
 */
import { sanitizeSearch } from "@/lib/zod";

export function generateSearchTokens(query: string): string[] {
  const clean = query.trim().toLowerCase();
  if (!clean) return [];

  const rawTokens = clean.split(/\s+/).filter(Boolean);
  const resultSet = new Set<string>();

  for (const raw of rawTokens) {
    const t = sanitizeSearch(raw).toLowerCase();
    if (t.length < 2) continue;
    resultSet.add(t);

    // 1. v <-> w interchange
    if (t.includes("v")) resultSet.add(t.replace(/v/g, "w"));
    if (t.includes("w")) resultSet.add(t.replace(/w/g, "v"));

    // 2. double-letter collapse (dillep -> dilep, dilleep -> dileep)
    const collapsed = t.replace(/(.)\1+/g, "$1");
    if (collapsed.length >= 2) resultSet.add(collapsed);

    // 3. ee <-> i interchange
    if (t.includes("ee")) resultSet.add(t.replace(/ee/g, "i"));
    if (t.includes("i")) resultSet.add(t.replace(/i/g, "ee"));

    // 4. Common Indian name spelling mappings
    if (t === "dillep" || t === "dilep" || t === "dilip" || t === "dileep") {
      resultSet.add("dileep");
      resultSet.add("dilip");
      resultSet.add("dillep");
    }
  }

  // Also include the full query with v <-> w swapped if multi-word
  if (rawTokens.length > 1) {
    const fullSafe = sanitizeSearch(clean).toLowerCase();
    if (fullSafe) {
      resultSet.add(fullSafe);
      if (fullSafe.includes("v")) resultSet.add(fullSafe.replace(/v/g, "w"));
      if (fullSafe.includes("w")) resultSet.add(fullSafe.replace(/w/g, "v"));
    }
  }

  return Array.from(resultSet).filter((token) => token.length >= 2);
}
