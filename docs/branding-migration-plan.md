# Vedora Vision Rebrand — Migration Plan (not yet executed)

Scope: rename product from **Stone Tech OS** → **Vedora Vision**. No code changes are made by this document; it is a checklist for the future rebrand PR.

## 1. Web app metadata & titles

- `src/routes/__root.tsx` — `<title>`, `description`, `og:*`, `twitter:*`, `apple-mobile-web-app-title`, `theme-color` (verify vs new palette).
- `src/routes/auth.tsx` — wordmark and headings (lines ~114, 152, 159, 185, 326, 413, 623, 637).
- `src/routes/index.tsx` — head() title/description if present.
- All per-route `head()` entries under `src/routes/**` referencing "Stone Tech OS".
- `src/components/vendor-portal/VendorShell.tsx` — vendor portal wordmark (lines 40, 88).
- `src/components/layout/AppShell.tsx` — sidebar / topbar brand (verify).

## 2. Runtime branding (PDFs, emails, company profile)

- `src/lib/branding/index.ts` — `DEFAULT_BRANDING` constant (product name, tagline, colors).
- `src/lib/pdf/generator.ts` — header/footer text fallbacks when company profile is empty.
- `src/lib/documents/engine.ts` — email subject/body templates that include product name.
- `src/lib/email-templates/**` — transactional + auth email templates (from name, footer, wordmark image URL).
- Seed / defaults for `public.company_profiles` row (only if the tenant has not customised).

## 3. PWA & icons

- `public/manifest.json` — `name`, `short_name`, `description`, `theme_color`, `background_color`.
- `public/sw.js` — cache prefix (`stone-tech-os-*` → `vedora-vision-*`), push notification default title, offline fallback title.
- `public/offline.html` — heading, copy, favicon reference.
- `public/icons/*` — replace `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `favicon.ico`, maskable variants.
- `scripts/pwa/icon-source.svg` + `scripts/pwa/generate_icons.py` — regenerate from new source.

## 4. Native (Capacitor + Android)

- `capacitor.config.ts` — `appId` (decide: keep `in.vedoravision.stonetechos.app` or migrate to new id — migrating breaks existing installs), `appName`.
- `android/app/src/main/res/values/strings.xml` — `app_name`, `title_activity_main`.
- `android/app/src/main/AndroidManifest.xml` — `android:label` refs (if hardcoded).
- `android/app/src/main/res/mipmap-*` + `drawable-*` — replace launcher icon foreground/background and splash resources.
- `android/app/build.gradle` — `applicationId` (only if app id changes; requires new Play Store listing).

## 5. Docs & repo metadata

- `README.md`, `AGENTS.md`, `docs/**` — product name references.
- `package.json` — `name` field if it embeds product name.
- `wrangler.jsonc` — Worker `name` (only if you want to rename the Cloudflare Worker; changes the default hostname).

## 6. Open questions to resolve before execution

- Final legal product name and short name (character limits: PWA `short_name` ≤ 12, Android `app_name` ≤ 30).
- New primary/secondary brand colors (drive `theme_color`, manifest, `src/lib/branding`, `src/styles.css` token overrides).
- New logo set (SVG master + PNG exports at 192/512/1024 + monochrome for email + favicon).
- New splash screen artwork for Android 12+ splash API.
- Keep existing `appId` `in.vedoravision.stonetechos.app` or migrate (migration = new app in stores, users must reinstall).
- Whether to change the Lovable publish slug (`stone-flow-hub.lovable.app`) and/or attach a custom domain (`app.vedoravision.in`?).

Execute this plan in a single PR so meta, PWA cache, and native artifacts flip together and returning users pick up the new brand on next SW activation.
