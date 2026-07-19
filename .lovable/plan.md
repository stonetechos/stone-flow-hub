## Plan: Apply VIE Phase 1 migration

Apply the provided SQL exactly as written via the migration tool, then let the auto-regeneration update `src/integrations/supabase/types.ts`.

### Steps

1. Submit the SQL verbatim through `supabase--migration` (no edits to enums, table shape, indexes, RLS, or policies).
2. After approval + execution, the platform regenerates `src/integrations/supabase/types.ts` automatically — no manual code edits.
3. Report back:
   - Whether the SQL was applied exactly as provided (expected: yes, unmodified).
   - Any linter warnings surfaced post-migration.
   - Confirmation that `types.ts` now includes `vie_actions`, `vie_execution_mode`, and `vie_action_status`.

### Notes / caveats

- The migration assumes `public.has_staff_access(uuid)` already exists (it does, per prior AI-authorization work). If it were missing, the policies would fail — will surface as an error rather than silently patched.
- No GRANT statements are included in the provided SQL. Per project rules, public-schema tables normally need explicit GRANTs for the Data API. Since you asked for the SQL to be applied **exactly as written**, I will not add them. If Data API access to `vie_actions` fails at runtime, the follow-up fix is a small grants-only migration (`GRANT SELECT, INSERT, UPDATE ON public.vie_actions TO authenticated; GRANT ALL ON public.vie_actions TO service_role;`) — flagging now so it's expected, not a surprise.
- No application code changes in this task.
