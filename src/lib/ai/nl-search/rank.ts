/**
 * Natural Language Search — result ranking.
 *
 * Phase G.9B.1, Task 4. Pure, deterministic scoring over results already
 * produced by resolve.ts — never fetches anything itself and never
 * changes what a result *is*, only what order it's presented in. Reuses
 * `listMyFavorites()` as the "frequently accessed" signal per the audit
 * finding that no other per-record frequency tracking exists.
 */
import { listMyFavorites } from "@/lib/favorites/api";
import type { NlResultItem, NlStructuredIntent } from "./types";

const EXACT_MATCH_BOOST = 50;
const PARTIAL_MATCH_BOOST = 15;
const FAVORITE_BOOST = 20;
const HAS_SUBTITLE_BOOST = 2;

function textScore(title: string, needle: string | undefined): number {
  if (!needle) return 0;
  const t = title.toLowerCase();
  const n = needle.toLowerCase().trim();
  if (!n) return 0;
  if (t === n) return EXACT_MATCH_BOOST;
  if (t.includes(n) || n.includes(t)) return PARTIAL_MATCH_BOOST;
  return 0;
}

/** Ranks and sorts results in place of resolve.ts's un-scored output.
 *  Results that already carry a nonzero `rank` (e.g. insight-backed
 *  results, which are pre-sorted by the Insight Registry's own priority
 *  normalization, or a single "navigate" result) keep their relative
 *  lead over freshly-scored list-API results, since a higher base rank
 *  only adds on top. */
export async function rankResults(
  items: NlResultItem[],
  intent: NlStructuredIntent,
): Promise<NlResultItem[]> {
  if (items.length === 0) return items;

  const favorites = await listMyFavorites().catch(() => []);
  const favoriteIds = new Set(favorites.map((f) => `${f.entity_type}:${f.entity_id}`));

  const needle = intent.searchText ?? intent.identifier;
  const scored = items.map((item) => {
    let score = item.rank;
    score += textScore(item.title, needle);
    if (favoriteIds.has(`${item.entityType}:${item.id}`)) score += FAVORITE_BOOST;
    if (item.subtitle) score += HAS_SUBTITLE_BOOST;
    return { ...item, rank: score };
  });

  scored.sort((a, b) => b.rank - a.rank);
  return scored;
}
