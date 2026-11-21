# Publishing to the Google Play Store

The app is a PWA, so the Play version is a **Trusted Web Activity (TWA)**: a thin
Android wrapper that opens the hosted site full-screen (no browser bar), with
offline support from the service worker. Everything below is prepared in this
repo; the steps marked 👤 need your own accounts/keys and cannot be done for you.

## 0. What is already done

| Requirement | Where |
|---|---|
| Installable PWA manifest (id, maskable icon, shortcuts, screenshots) | `manifest.webmanifest` |
| Offline service worker with auto-versioning | `sw.js`, `npm run stamp` |
| Privacy policy (bn + en), linked from About | `privacy.html` |
| Digital Asset Links template | `.well-known/assetlinks.json` |
| Bubblewrap/TWA config (package id, location delegation) | `twa-manifest.json` |
| Hosting headers (Netlify / Cloudflare Pages) | `_headers` |
| Store text (bn + en), feature graphic, 5 screenshots | `store/` |
| Keystore files git-ignored | `.gitignore` |

## 1. 👤 Host it over HTTPS on a domain you control

The site must be served from the **root of a domain** (TWA verification needs
`https://DOMAIN/.well-known/assetlinks.json`). A GitHub Pages *project* page
(`user.github.io/repo/`) will **not** work; use a custom domain, a
`user.github.io` repo, or Netlify / Cloudflare Pages / Vercel.

Deploy the repo root as-is (no build step). Then confirm:
`https://DOMAIN/manifest.webmanifest`, `/privacy.html` and `/.well-known/assetlinks.json` load.

## 2. 👤 Fill in the placeholders

Search for `REPLACE_WITH`:
- `privacy.html` → your contact email
- `twa-manifest.json` → `host` and the three URLs (your domain)
- `.well-known/assetlinks.json` → fingerprint (step 5)

Optional: change `packageId` (`com.namajshikkha.app`). It is permanent once published.

## 3. 👤 Build the Android App Bundle

Easiest: **[PWABuilder](https://www.pwabuilder.com)** → enter your URL → *Package for stores* → Android.
CLI alternative (needs JDK 17 + Android SDK, Bubblewrap installs them for you):

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest=https://DOMAIN/manifest.webmanifest   # or reuse twa-manifest.json
bubblewrap build        # → app-release-bundle.aab + signed apk
```

Keep `android.keystore` and its passwords somewhere safe and **backed up** — but
if you enrol in *Play App Signing* (default for new apps) Google holds the final
key and you can recover an upload key.

## 4. 👤 Create the Play Console app

1. Developer account (one-time registration fee). New *personal* accounts may need a
   closed test with a minimum number of testers for some days before production
   access — check the current rule in Play Console → *Dashboard*.
2. *Create app* → Free, App, language Bengali (bn-BD) + English.
3. Upload `app-release-bundle.aab` to an *Internal testing* track first.
4. Store listing: paste from `store/listing.md`, upload `store/feature-graphic.png`
   and `store/screenshots/*`, icon `assets/icon-512.png`.
5. Privacy policy URL: `https://DOMAIN/privacy.html`.

## 5. 👤 Link the app to the site (removes the browser bar)

Play Console → *Setup → App signing* → copy the **SHA-256 certificate fingerprint**
of the *app signing key*. Put it in `.well-known/assetlinks.json`, redeploy, and
verify with Google's Digital Asset Links tester. Without this the app opens with a
Chrome address bar.

## 6. Answers for the Play Console forms

**Data safety** — the app collects and shares **no** user data.
- Collects/shares data: **No**.
- Location: used on-device only to compute prayer times; never sent off the device
  (Play treats on-device-only processing as *not collected*).
- Data is encrypted in transit: Yes (HTTPS). Users can request deletion: n/a (nothing stored remotely).

**Content rating** — questionnaire: no violence, no user-generated content, no
purchases, no ads. Expect *Everyone*.

**Ads** — No ads. **Target audience** — 13+ / general (do not target children).

**Permissions** — the TWA requests only *location* (when the user taps "Use my
location") through Chrome's permission delegation (`locationDelegation` in
`twa-manifest.json`). Motion sensors need no permission on Android.

**App category** — Lifestyle. **Religious content** — fine; keep the disclaimer in the listing.

## 7. Releasing updates

```bash
# edit code …
npm run stamp          # refreshes the service-worker cache version
npm run verify         # tests + content lint + SW checks
# deploy the site: users get web changes immediately, no store update needed.
```
Only rebuild/upload a new `.aab` (bump `appVersionCode` in `twa-manifest.json`)
when the *Android wrapper* changes (icon, name, package settings, target SDK).
Google requires periodically raising the target API level — rebuilding with the
latest Bubblewrap/PWABuilder handles it.

## 8. Ideas that need a native wrapper (not possible in a pure TWA)

- **Adhan notifications / alarms at prayer time** — a TWA cannot schedule exact
  local alarms. If you want this, wrap the same web app with **Capacitor** and use
  `@capacitor/local-notifications` (schedule the next ~7 days from `timesFor()`).
- Home-screen prayer-time widget, audio adhan playing in the background.

These are the most-requested features in this app category, so they are the
natural "v2" once the TWA is live.
