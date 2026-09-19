import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchSiteSettings, upsertSiteSetting } from "./api";
import type { SiteSettings } from "./types";
import { SITE_SETTINGS_DEFAULTS } from "./types";

export const SITE_SETTINGS_QUERY_KEY = ["site_settings"] as const;

/** Fetches all site settings. Falls back to defaults while loading. */
export function useSiteSettings() {
  return useQuery({
    queryKey: SITE_SETTINGS_QUERY_KEY,
    queryFn: fetchSiteSettings,
    staleTime: 5 * 60 * 1000, // 5 min — landing page doesn't need live updates
    placeholderData: SITE_SETTINGS_DEFAULTS,
  });
}

/** Returns the parsed settings synchronously (defaults if not yet loaded). */
export function useSiteSettingsValue(): SiteSettings {
  const { data } = useSiteSettings();
  return data ?? SITE_SETTINGS_DEFAULTS;
}

/** Mutation to update a single setting key. */
export function useUpsertSiteSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) =>
      upsertSiteSetting(key, value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SITE_SETTINGS_QUERY_KEY });
    },
  });
}
