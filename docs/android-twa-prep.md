# Stone Tech OS — Android TWA / Bubblewrap Prep (Phase G.10B)

Companion to the "PWA (Phase G.10A)" section in `docs/ARCHITECTURE.md`. This
document tracks the decisions and artifacts needed before running
Bubblewrap, so that phase doesn't have to re-derive them. No `.aab` has
been generated — this is preparation only.

## Decisions made

- **Package name (permanent once published):** `in.vedoravision.stonetechos.app`
- **Publishing developer account:** Vedora Vision (Google Play Console
  developer profile set up separately; package name mirrors this).
- **Source manifest:** `https://erp.stonetech.in/manifest.json` (live,
  verified — see docs/ARCHITECTURE.md PWA section for what's in it).

## Manifest readiness — verified against current Google TWA requirements

Checked against the official quick-start guide
(https://developer.chrome.com/docs/android/trusted-web-activity/quick-start/)
and Android Developers TWA guide. All present and correct as of the live
production manifest:

| Requirement                                 | Status                                                                                                                                                |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name` / `short_name`                       | ✅ "Stone Tech OS" (short_name is 13 chars; Android truncates around ~12 on some launchers — cosmetic only, not blocking)                             |
| `start_url` / `scope`                       | ✅ both `/`                                                                                                                                           |
| `display`                                   | ✅ `standalone`                                                                                                                                       |
| `theme_color` / `background_color`          | ✅ `#0d9488` / `#06090D`                                                                                                                              |
| `orientation`                               | ✅ `any`                                                                                                                                              |
| Icons 192 + 512, `any` + `maskable` purpose | ✅ present, served from `/icons/*`                                                                                                                    |
| Maskable safe zone                          | ✅ verified mathematically at build time — mark sits within ~150px radius of center on the 512px canvas, inside the required ≤204.8px (80%) safe zone |
| Served over HTTPS                           | ✅                                                                                                                                                    |

`bubblewrap init --manifest=https://erp.stonetech.in/manifest.json --packageId=in.vedoravision.stonetechos.app` can run against this today without any manifest changes.

## Digital Asset Links — required, not yet creatable

A Trusted Web Activity only hides the browser UI (true full-screen native
feel) if Digital Asset Links verification passes. Without it, Android
silently falls back to a Custom Tab (address bar visible) — not broken,
just not the polished look.

Blocked on two values that don't exist yet:

1. This package name (now decided, see above).
2. The **SHA-256 certificate fingerprint** of the signing key — only
   generated when `bubblewrap init` creates (or you supply) a keystore.

**Do this on your own machine, not in a cloud sandbox** — the signing
keystore is the one credential that can never be regenerated or recovered
if lost; losing it means you can never ship an update to this app again.
Keep the `.jks`/`.keystore` file and its password somewhere durable
(password manager + backed-up file), outside any temporary environment.

Once you have the fingerprint, `bubblewrap init` generates
`assetlinks.json` for you automatically. For reference, the shape is:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "in.vedoravision.stonetechos.app",
      "sha256_cert_fingerprints": ["<from your keystore, after bubblewrap init>"]
    }
  }
]
```

That file then needs to be uploaded to
`https://erp.stonetech.in/.well-known/assetlinks.json` (a deploy step —
add it under `public/.well-known/assetlinks.json` in this repo once the
real fingerprint exists, same static-asset mechanism as `manifest.json`).

## Time-sensitive note for the actual build step

Google Play requires new apps to target API 36 (Android 16) by
**August 31, 2026** (https://developer.android.com/google/play/requirements/target-sdk).
Confirm whatever Android Gradle template Bubblewrap generates targets that
level (or higher) when you get to `bubblewrap build` — not a manifest
concern, but worth checking before submission.

## Explicitly not done in this phase

- No `bubblewrap init` run (would generate a signing keystore — must
  happen on a machine you control, not this sandbox).
- No `.aab` generated.
- No `assetlinks.json` file created (placeholder above is documentation
  only, not deployed).
- No Play Console app entry created (developer profile ≠ app listing —
  those are separate steps).
