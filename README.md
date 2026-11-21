# Namaj Shikkha — নামাজ শিক্ষা

An offline-first Islamic prayer companion for the web: accurate prayer times,
a live Qibla compass, a step-by-step salah guide, duas, a tasbih counter, the
99 Names of Allah, and a Hijri calendar — in **Bengali and English**.

Built as a single installable PWA. No account, no tracking, no ads, no network
required after the first load.

```bash
npm install
npm start          # http://localhost:5173
npm test           # 112 tests
```

---

## Why it exists

This app combines the two feature sets that dominate Bengali and global
prayer-app listings:

| Feature | Source app A (Namaj Shikkha) | Source app B (Prayer Times / Ibadah) | This app |
|---|---|---|---|
| Step-by-step salah guide | ✅ | — | ✅ |
| Wudu guide | ✅ | — | ✅ |
| Prayer times | ✅ | ✅ | ✅ (offline, computed) |
| Multiple calculation methods | — | ✅ | ✅ 15 methods |
| Qibla compass | ✅ | ✅ | ✅ |
| Tasbih counter | — | ✅ | ✅ |
| Duas | ✅ | ✅ | ✅ 14, sourced |
| 99 Names of Allah | — | ✅ | ✅ |
| Hijri / Ramadan calendar | ✅ | ✅ | ✅ |
| Bengali interface | ✅ | partial | ✅ |
| Works fully offline | partial | partial | ✅ |
| No ads, no tracking | ❌ | ❌ | ✅ |

**A note on those two app listings.** This project deliberately does **not**
copy their logos, screenshots, audio recordings, compiled translations, or any
other asset — those are copyrighted. What it reproduces is the *feature set*,
implemented independently: our own code, our own layout, and texts drawn from
the Qur'an and the authentic hadith collections.

---

## Features

### Prayer times — computed on the device
No API, no key, no server. Times come from a solar-position algorithm
(implemented from the standard Meeus/PrayTimes equations) using your
coordinates:

- **15 calculation methods** — MWL, ISNA, Egypt, Umm al-Qura, Karachi,
  Tehran, Jafari, Gulf, Kuwait, Qatar, Singapore, Turkey, France, Russia,
  Moonsighting.
- **Asr madhab** — Shafi/Maliki/Hanbali (×1 shadow) or Hanafi (×2).
- **High-latitude rules** — middle of the night, angle-based, one-seventh.
  Fajr and Isha remain correct where the sun never reaches the twilight angle.
- **Extras** — Imsak, midnight, last third of the night, and an optional
  per-prayer minute offset so you can match your local mosque exactly.
- **DST-aware** by city when the browser supports IANA time zones.

### Qibla
Great-circle bearing to the Kaaba plus haversine distance. Uses
`webkitCompassHeading` on iOS and `deviceorientation` alpha on Android, with
exponential smoothing so the needle does not jitter. Requests sensor
permission on the user gesture, as iOS 13+ requires.

### Salah guide
Ten wudu steps and eleven prayer steps, each with Arabic, transliteration,
and meaning in both languages. Texts are cited to Qur'an and hadith in
`src/data/salah.json`.

### Everything else
Tasbih counter with haptics and persisted rounds · 14 duas with sources ·
99 Names of Allah with search · Hijri calendar with notable dates ·
Ramadan countdown with Suhoor/Iftar · light/dark/system themes ·
Bengali/English switching.

---

## Architecture

Deliberately dependency-free at runtime: plain ES modules, no framework, no
build step, no bundler. `npm install` only fetches test tooling. The app you
serve is exactly the source you read.

```
index.html                  app shell
manifest.webmanifest        PWA metadata
sw.js                       offline cache (versioned)
server.mjs                  zero-dependency static server
src/
  main.js                   bootstrap, router, theme, i18n wiring
  state.js                  persisted settings + observers
  services.js               settings → core glue
  core/
    prayer-times.js         solar position, 15 methods, high-latitude rules
    qibla.js                bearing, distance, compass maths
    hijri.js                Gregorian ⇄ Hijri (tabular)
    tasbih.js               pure counter logic
    storage.js              defensive localStorage wrapper
    i18n.js                 bn/en dictionary
    location.js             geolocation + built-in city list
  ui/dom.js                 tiny DOM helpers, escaping, countdown
  views/                    home · qibla · salah · duas · tasbih · more
  data/                     salah.json · duas.json · names99.json
tests/                      112 tests across 6 files
scripts/                    content validation, SW manifest check, icons
```

### Design decisions

**Calculate, don't fetch.** Prayer-time APIs are the usual single point of
failure in apps like this — they rate-limit, go down, or return wrong data for
a city. Computing locally means the app works on a plane, in a basement, and
in a village with no signal, and never sends your coordinates anywhere.

**Keep the maths pure.** `core/` has no DOM access at all, so every algorithm
is directly unit-testable — which is why the prayer engine has 40 tests.

**Escaping everywhere.** All interpolation into markup goes through `esc()`,
so a crafted city name or search query cannot inject HTML.

---

## Testing

```bash
npm test                 # all 112 tests
npm run lint:content     # religious content integrity
node scripts/check-sw-manifest.mjs   # precache list vs filesystem
```

The suite covers four kinds of risk:

1. **Astronomical correctness** — Dhaka midsummer sunrise/sunset are asserted
   against published timetables to the exact minute (`05:12` / `18:48` on
   21 June, `06:36` / `17:16` on 21 December). Solar declination is checked
   at both solstices and the equinox; day length is verified at the equator.
2. **Invariants** — prayer ordering, symmetry of sunrise/sunset about solar
   noon, madhab and method monotonicity, timezone shifting, and high-latitude
   behaviour including the fact that Fajr and Isha legitimately cross midnight
   in Oslo in June.
3. **Content integrity** — every step and dua must have a title in both
   languages, Arabic text must actually contain Arabic script, anything with
   Arabic must have a transliteration and meaning, every dua must cite a
   source, and there must be exactly 99 names numbered 1–99 with no gaps.
4. **Render smoke tests** — all 11 screens are mounted in a DOM
   (via `linkedom`) in both languages and must produce real content. This is
   what catches blank-screen bugs, which pure unit tests cannot see.

CI runs the suite on Node 20 and 22 plus both integrity checks.

---

## Content accuracy

The religious content is standard and widely transmitted, but **timings and
texts should be confirmed with a qualified scholar or your local mosque**
before relying on them for worship. Regional practice genuinely differs:

- Calculation methods differ by a few minutes by design. Pick the one your
  mosque uses in Settings.
- The Hijri calendar is the *tabular* (arithmetic) one. It can differ by a day
  from local moon sighting, which is why the app labels it as such rather than
  presenting it as authoritative.

Found an error? Corrections to content are the highest-priority kind of bug
here — please open an issue with the source reference.

---

## Browser support

Requires ES modules, `import` attributes for JSON, and CSS nesting-free modern
CSS (`color-mix`). Effectively Chrome/Edge 123+, Safari 17.2+, Firefox 138+.
The compass needs a magnetometer; the app degrades to showing the bearing and
distance without one.

## License

MIT — see [LICENSE](./LICENSE).
