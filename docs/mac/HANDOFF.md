# Astrum for Mac — handoff to a session on the Mac

This brief is for a Claude Code session running **on the owner's MacBook**, in a
checkout of this repository on branch `claude/occult-app-direction-968fn9`. The
plan was made in a cloud session that could not reach the Mac. Read this first,
then the documents it points to. You can build, sign and run here; the cloud
session could not.

## The goal

Turn Astrum into a native macOS app that sits among Apple's own apps (Finder,
Notes, Calendar, Weather): a SwiftUI shell with real Liquid Glass chrome, a
menu-bar hour, a Sky panel on its own desktop, widgets, notifications that
arrive after quitting, and a native Library that reads the owner's large local
collections in place. The existing React app and its engines keep running
inside the shell, unchanged, so the web app and iPad keep one codebase.

"Stock app" means a first-party macOS app, **not** the Stocks app.

## Read these, in this order

| File | What it is |
|---|---|
| [`architecture.md`](architecture.md) | The recommendation: what lives where, the four first-week tests and their fallbacks, roadmap, free-Apple-ID limits, risks |
| [`architecture-visual-layer.md`](architecture-visual-layer.md) | How the glass, tokens and system settings cross the native/web seam |
| [`architecture-library.md`](architecture-library.md) | The Library engine: bookmarks, indexing (FTS5), PDFKit/Vision/AVKit, privacy fences |
| [`design.md`](design.md) | "Instrument & Edition", the full design spec (spaces, wireframes W1–W10, the `facts.v1` wording table, components, flows, visual system, build order in §14) |
| [`design-tokens.css`](design-tokens.css) | The design tokens (light-dark, per-planet palette, type scale, materials). Source for both the web stylesheet and the native asset catalog |
| [`prototype.html`](prototype.html) | The interactive prototype of the design. It is artifact-page content, so wrap it to view locally (below). Shelf names are placeholders here |

To view the prototype: `printf '<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><body>' > /tmp/p.html && cat docs/mac/prototype.html >> /tmp/p.html && open /tmp/p.html`, then try `#today`, `#sky`, `#find`, `#altar`, `#desktop`, `#library`.

Where the design and architecture documents disagree, `design.md` wins on
anything the user sees; `architecture.md` wins on how it is built.

## Decided by the owner

- **macOS 26 Tahoe or later**, on a 14-inch MacBook Pro.
- **Free Apple ID** (Personal Team) in Xcode; no paid developer program.
- **Mac first**; iPad and web follow later.
- He asked for the whole app to be built on his Mac. Treat that as yes to a
  native Swift shell (roughly 8–10k lines of Swift over all phases) unless he
  says otherwise. The fallback is Tauri 2.12's built-in Liquid Glass window.

## Still open — ask him when the work reaches them

1. **Place for the hours:** Location Services (recommended), a fixed place, or birthplace (today's behaviour).
2. **Library excerpts to cloud AI:** never (recommended), per collection, or no library grounding.
3. **Sky panel when unfocused:** system frosted look (recommended), always-vivid material, or a private API.
4. **Lesson transcripts:** transcribe the course videos on-device always, only lessons opened, or never.
5. **iCloud placeholders:** the mixed library's Alchemy and Herbalism folders are iCloud-only. He can turn on Keep Downloaded, or move the folder out of Desktop.
6. **Desktop binding:** whole app on its own desktop (recommended), only the Sky panel, or all desktops.

The library folder paths are **not** in this repository. Ask him for them
(a course library of about 219 GB of `.md` + `.mp4`, and a mixed library of
PDFs, audio, EPUBs and scans on his Desktop).

## Hard rules

- **This repository is public (AGPL).** Library content is copyrighted and
  personal. Never commit, bundle, sync, export or log library text, titles,
  paths, thumbnails or transcripts. The practice record holds only opaque
  references (`design.md` §11.3). Add guardrails before indexing anything:
  `.gitignore` entries for any local index or cache, a CI check that fails if
  library-derived files appear, and a sync/export filter for library-local keys.
- No library excerpt goes to a cloud model by default.
- Back up the existing practice record before any test that touches storage
  (Test 3). The old Tauri app stays usable side by side until the switch.
- Commit to `claude/occult-app-direction-968fn9`. Do not open a pull request
  unless asked.

## Where things stand

Done and pushed (CI green, run #18 at `4c82047`):

- Planetary hours, sect and ingresses correct at any place and device time
  zone (`src/engine/astro.js`: `placeWeekday`, `polarHours`, `sunAltitude`,
  `placeFrom`, `nextIngress`); hour-model versioning for old records
  (`HOUR_MODEL = 2`); 490 unit tests across eight device time zones, ESLint
  `no-undef`, six E2E suites.
- Tauri build fixed: crate and npm sides pinned to the same minors
  (`tauri ~2.12`, plugins `~2.7`/`~2.8`), `Cargo.lock` committed.
- Today's app: `src-tauri/` (identifier `com.astrum.app`, `frontendDist ../dist`,
  dev server on port 3000). `npm run build`, `npm test`, `npm run lint`,
  `npm run tauri:dev`, `npm run tauri:build`.

Not started: anything in Swift, any Xcode project, the Library.

## Phase 0 — do this first (about 1.5–2 weeks)

**Setup check.** Xcode 26 installed and signed into his Apple ID (Xcode ▸
Settings ▸ Accounts). `xcodebuild -version`, `node -v`, `npm ci`, `npm test`,
`npm run tauri:build` all pass. Report anything that fails before going on.

**Repair today's Tauri app** so he has a working instrument throughout:
closing the window hides it instead of quitting; a simple menu-bar hour
appears (tray icon with the current ruler and minutes left); confirm the hours
show correctly for his place.

**The four tests** (`architecture.md` › Keeping the risk small). Build the
smallest thing that answers each, on his Mac:

1. **Crash test.** A SwiftUI `NavigationSplitView` shell hosting one long-lived
   `WKWebView` that loads the built `dist/`. Release build; resize, first paint,
   full screen, desktop switches, a 30-minute soak.
2. **Free-account widget.** A WidgetKit extension signed with the Personal
   Team, sharing data through a Team-ID-prefixed App Group (not `group.`).
   It appears in the gallery and reads data with no prompt, after a reboot and
   a rebuild.
3. **Record continuity.** After a backup, the native app sees the existing
   practice record without moving it (same identity, same origin as the Tauri
   webview's storage).
4. **Background behaviour.** With the window closed: the sky keeps computing,
   `UNUserNotificationCenter` notifications arrive with the app quit, and a
   local `.mp4` plays in place through AVKit.

Follow the fallback table in `architecture.md` for any test that fails, and
tell him the result of each test plainly before starting Phase 1.

## After Phase 0

Follow the roadmap in `architecture.md` and the build order in `design.md`
§14: Phase 1 the native window and menu-bar extra; Phase 2 widgets and
notifications; Phase 3 the course library; Phase 4 the mixed library; then
native depth. Things that need him at the keyboard: approving the Desktop
folder prompt, adding widgets from the gallery, and possibly approving the
first launch in System Settings ▸ Privacy & Security.

## Smaller engine work still queued (web side, any time)

From the earlier review, not yet built: full Lilly considerations in horary;
the election body-contact rule; angularity with the house system and Lilly's
five degrees; the peregrine test; shrinking elective memory toward the
baseline; Oracle grounding and "omens near"; the `facts.v1` table in code;
a materia toxicity flag.
