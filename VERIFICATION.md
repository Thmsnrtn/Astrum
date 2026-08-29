# VERIFICATION — what is proven where

Astrum's verification has three tiers. Everything in tiers 1–2 runs on
every push (see `.github/workflows/test.yml`); tier 3 is the honest
boundary: things only a physical device can prove, kept feature-detected
and fail-safe so the app degrades gracefully wherever they are absent.

## Tier 1 — unit & property tests (`npx vitest run`)

~385 tests across 33 files. The load-bearing ones:

- **Engines**: ephemeris vs Swiss Ephemeris; Hermetic Lots (sect reversal,
  Fortune+Spirit=2·Asc, Paulus/Valens); zodiacal releasing (Valens table
  summing 211, 360-day years, loosing of the bond at exactly 211 months,
  peaks from Fortune); profections (birthday turn); heliacal risings
  (catalogue RA/Dec recovery proves every star latitude; Sirius anchors at
  Cairo/London latitudes); geomancy (shield derivation, the four modes of
  perfection, company); weighted dignity (bounds cover 0–30 gaplessly per
  sign, sect flips, reception truth-table, almuten rankings).
- **Sync**: merge core idempotent/commutative/convergent over 50 seeded
  3-device simulations; tombstone semantics incl. the pure-deletion
  regression; corrupt-peer drills; engine integration over an in-memory
  folder.
- **Data safety**: export→import round trip byte-identical; merge-import
  LWW + tombstones; migration backfills.
- **Architecture guard** (`src/architecture.test.js`): nothing imports
  App.jsx but main.jsx; foundation layers never import screens; the
  import graph is acyclic. The 6,500-line hub cannot silently re-form.
- **Roots regression** (`src/engine/roots.test.js`): every fix from the
  Aug 2026 primary-source audit pinned — firdaria years belong to
  planets not positions (the night-chart bug), VoC has no phantom orb
  cap and both doctrines hold (hellenistic void ⇒ lilly void, swept
  hourly over a lunar month), besiegement survives 0° Aries, exaltation
  degrees use the ordinal convention, Lilly combustion orbs, mansion
  windows are coherent for all 28 stations, clean-window moments
  re-verified against the engine's own checks. Plus data integrity for
  the enrichment tables: 28 Picatrix IV.9 mansion talismans, 36
  Picatrix II.11 decan images/significations, the five corrected
  mansion elect/avoid fields.
- **Fallback envelope** (`src/engine/fallback.test.js`): the Meeus
  approximation's worst-case error per body vs Swiss Ephemeris is a
  measured, tested contract over 1950–2100 (Sun 0.007° … Venus 3.53°);
  sunrise geometry by property; the app's own ASC/MC/houses within 0.2°
  of Swiss over a 400-point random sweep.
- **Kameas** (`src/data/kamea.test.js`): all seven planetary squares
  proven true magic squares cell by cell (orders 3–9, planet totals
  45…3321).

## Tier 2 — browser E2E (`bash e2e/run.sh`, Playwright Chromium)

- `smoke.mjs` — all 34 nav rooms open with zero pageerrors AND zero
  error-boundary cards (the boundary check catches breakage that
  pageerror monitoring cannot see).
- `offline.mjs` — service worker installs, precaches, and the app fully
  mounts with the server dead; storage-health card renders.
- `sync.mjs` — the real File System Access transport over an OPFS
  directory: a planted peer envelope folds in, its tombstone deletes,
  our snapshot is written, second pass is a no-op.
- `ux.mjs` — first-run welcome seeds and persists the profile; switching
  the tint preset actually recolors computed styles; grouped nav; tab
  persistence across reload.
- `roots.mjs` — the primary-source material renders where practice
  happens: the mansion talisman block with its next-window card and
  commit button, both decan translation witnesses plus signification,
  the almanac day-detail "could be made today" line, the grown SRS
  daily card, and the VoC doctrine toggle persisting across reload.

## Tier 3 — on-device (iPad / Mac), the honest boundary

These paths are feature-detected in code and cannot be exercised in CI.
Checklist for a physical-device pass, in order:

1. **Bootstrap** `npm run cap:bootstrap` (generates `ios/`), open Xcode.
2. **Capabilities**: Signing & Capabilities → +iCloud → check *iCloud
   Documents* → container `iCloud.com.astrum.app`. Push Notifications not
   required (local notifications only).
3. **Info.plist**: add `NSUbiquitousContainers` →
   `iCloud.com.astrum.app` with `NSUbiquitousContainerIsDocumentScopePublic
   = YES`, `NSUbiquitousContainerName = Astrum`,
   `SupportedFolderLevels = Any` (makes `astrum-sync/` visible in Files).
4. **Sync plugin**: copy `native/ios/ICloudFolderPlugin.swift` into
   `ios/App/App/`, add to the Xcode target. Capacitor auto-registers
   `CAPBridgedPlugin` classes.
5. **Verify on device**: local notifications fire (hour changes, VoC,
   observances, vigil windows); `astrum-autobackup-<day>.json` rotates in
   the app's Documents after backgrounding; camera capture lands in the
   photo vault; the drum and hour bell sound; wake lock holds the screen
   in Altar Mode and a running Rite; the Sync card shows "iCloud (this
   iPad)" and a record created on the iPad appears on the Mac (Tauri
   build with `tauri-plugin-fs` + `$HOME/Library/Mobile Documents/**`
   scope, or a Chromium browser pointed at the iCloud folder).
6. **Corruption drill on device**: truncate one peer file in
   Files → Astrum → astrum-sync; the next sync must report the skip and
   leave local data intact.

Photos do not sync in this phase (deliberate; the Sync card says so) —
move them with Export or capture per device.
