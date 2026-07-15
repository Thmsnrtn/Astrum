# Astrum

A personal instrument for the practicing astrologer, magician, and alchemist.
One React codebase, packaged three ways: PWA (GitHub Pages), macOS desktop
(Tauri 2), and iOS (Capacitor 8). All data lives locally on the device — no
backend, no accounts.

## What it does

**Timing** — live sky with planetary hours (true unequal hours by location),
dignities, decans, fixed stars, the 28 lunar mansions, aspects, void-of-course
Moon, electional scanning and scoring, transits, progressions, firdaria-style
time lords, and macro cycles. Positions come from the **Swiss Ephemeris
compiled to WASM** (arc-second precision, true precessed star places), with
the original Meeus engine as an automatic fallback while the module loads.

**Working** — ritual builder with tradition-aware steps, sigil workshop (Rose
Cross, kamea, Agrippa spirit/intelligence seals, freehand), a talisman
workshop chaining election → figure → consecration → record, horary charts
with Lilly's considerations and significators, and the Athanor: long-running
spagyric operations whose steps are scheduled to planetary days/hours and
lunar phases.

**The Operator's Loop** — every working, sigil, talisman, election, horary,
and operation produces a *casting record* with the full sky at cast time.
Outcomes are judged in the Review screen (hit / partial / miss), which
computes hit-rates by planet, hour, moon phase, mansion, VoC, and election
score — and can send your own dataset to the AI for correlation analysis.
The magic is falsifiable.

**Ambient practice** — optional notifications for hour changes, VoC
boundaries, committed election windows, athanor steps, and a morning
briefing. True scheduled delivery on iOS; timer-based on desktop; page-open
only on the web.

**AI features** (optional) — oracle, planner, tutor, ritual generator,
journal reflection, horary judgment, results review. Uses your own Anthropic
API key (Profile → API Key), called directly from the client.

## Development

```bash
npm install
npm run dev          # web dev server (copies Swiss Ephemeris WASM to public/)
npm test             # vitest — ephemeris reference values, scheduler, athanor
npm run build        # web build (GITHUB_PAGES=true for the /Astrum/ base)
npm run tauri:dev    # macOS desktop
npm run cap:ios      # iOS (build + sync + open Xcode)
```

The Swiss Ephemeris binaries (~12.6 MB wasm + data) are copied from
`node_modules/swisseph-wasm` into `public/wasm/` by a pre-build hook — they
are not committed. Swiss Ephemeris is AGPL; this repo stays public.

## Per-phase smoke checklist

After touching a subsystem, verify on the web build at minimum:

1. `npm test` — 26 reference tests must pass.
2. `npm run build && npx vite preview` — walk every sidebar tab; console
   must stay clean.
3. Profile → Ephemeris Engine shows **✓ Swiss** after a few seconds.
4. Profile → Backup: Export All, then Import into a fresh browser profile —
   identical data everywhere.
5. Cast something (sigil, election commit, horary, talisman, athanor step)
   → it appears in Review with hour + mansion recorded.
6. On iOS/Tauri: enable Ambient Practice, background the app, confirm a
   scheduled notification arrives (iOS) and the auto-backup file exists in
   Documents (iOS).

## Data & backups

Everything lives in `localStorage` under `astrum_*` keys. **Export regularly**
(Profile → Backup & Restore) — iOS can evict web storage under pressure. The
iOS app also writes `astrum-autobackup.json` to Documents whenever it is
backgrounded. Imports merge by entry id (local data always wins) or replace
outright.
