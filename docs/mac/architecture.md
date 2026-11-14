# Astrum for Mac: architecture recommendation

## In one paragraph

Astrum becomes a native Mac app. Its shell is SwiftUI, so macOS draws it the way it draws Finder, Notes, Calendar and Weather. That gets you:

- a real Liquid Glass sidebar, toolbar and inspector;
- the current planetary hour live in the menu bar;
- a glass Sky panel resting on its own desktop;
- desktop and Notification Center widgets;
- notifications that arrive even after you quit the app.

Inside that shell, the 34 rooms and every engine keep running as they do today, as web code in one long-lived web view, so the same code still powers the web app and the iPad. The Library is built natively and never leaves the Mac. It holds Rune Soup, Alchemy & Herbalism and any folder you add later. Everything in it is indexed, read and played where it already sits.

By "stock app" we mean the apps that ship with macOS, not the Stocks app. The bar is that Astrum sits among them and doesn't look like a guest.

## What lives where

| Surface | Built with | Why |
|---|---|---|
| Window frame, sidebar, toolbar, inspector, menus, Settings | SwiftUI (NavigationSplitView) | The only way to get system sidebar and toolbar glass, matching corners and automatic accessibility handling |
| The 34 rooms, engines, Oracle, practice record, sync | Your existing React and JS, in one web view | One codebase still serves the web app and the iPad; nothing is rewritten |
| Menu-bar hour ("♃ 42m") | SwiftUI MenuBarExtra | Steady digits, works before the web view boots |
| Sky panel on your dedicated desktop | Native SwiftUI glass, no web view | Always correct, light on memory, unaffected by web view problems |
| Desktop and Notification Center widgets | WidgetKit | Drawn by macOS in its own glass; they keep counting down while Astrum is closed |
| Notifications | UNUserNotificationCenter | Scheduled with the system, so they arrive even after you quit |
| Lesson videos | AVKit | Plays in place with Picture in Picture, Now Playing and media keys |
| PDFs and scans | PDFKit, Vision, Live Text | Opens at the cited page; you can select text on scanned pages |
| Pages, Numbers, spreadsheets, images | Quick Look | Shown inside Astrum, untouched |

## Why a native shell

Tauri 2.12 can put real Liquid Glass behind the whole window, and that would be a big step up from today. But it is one sheet of glass behind a web page:

- no toolbar or sidebar glass;
- the smaller corner radius used by windows without a toolbar;
- the content layer doesn't follow Reduce Transparency, Increase Contrast or macOS 27's glass-strength slider.

Widgets and notifications that survive quitting would still need Swift.

| | Tauri glass window | Native shell |
|---|---|---|
| Sidebar and toolbar glass | No | Yes, drawn by macOS |
| Window corners and traffic lights like Finder | Partly | Yes |
| Follows Reduce Transparency, contrast, glass slider | Window only, via a bridge | Automatically |
| Desktop and Notification Center widgets | Separate Swift extension | Same project |
| Notifications after you quit | Not reliably | Yes |
| Video with Picture in Picture and Now Playing | Unverified in a web view | Yes |
| Swift to maintain | Small | Roughly 8–10k lines by the end |

The menu bar, the Sky panel and the widgets contain no web view. That keeps them clear of the one crash reported for web views inside glass windows on macOS 27, and of any slowdown of a hidden web view.

## Keeping the risk small

### Four tests in the first week, on your Mac

| Test | What it proves |
|---|---|
| 1. Crash test | A release build of the native shell with the web view survives resizing, first paint, full screen, desktop switches and a 30-minute soak |
| 2. Free-account widget | A widget signed with your free Apple ID appears in the gallery and reads Astrum's data with no prompt, after a reboot and a rebuild |
| 3. Record continuity | The native app sees your existing practice record without moving it (after a backup is taken first) |
| 4. Background behaviour | With the window closed, Astrum keeps computing the sky, notifications arrive with the app quit, and your lesson videos play in place |

### If a test fails

| Result | What we build |
|---|---|
| All pass | The full plan below |
| Widget signing fails | The same native app without WidgetKit; the Sky panel and menu bar carry the glance |
| Crash only with the app's own loading scheme | Load from a private local address instead, and move the record once by export and import |
| Crash in every loading mode | The main window drops to a solid, non-glass look; the menu bar, Sky panel and widgets keep full Liquid Glass. Going back to Tauri would not avoid this crash |

### Your practice record stays where it is

Today's app stores its data under its own private web address. The native app keeps the same identity and serves the web code under that same address, so it should see your record with no migration. We still take a full backup first. The old app keeps running side by side for two weeks before it is retired.

### The current app keeps working

In the first phase we also repair today's Tauri app:

- closing the window hides it instead of quitting;
- the planetary hours are correct for wherever you are;
- the build works again;
- a simple menu-bar hour appears.

You have a working instrument the whole way, and a fallback until the switch.

## A day with it

**At login.** Astrum starts quietly. The menu bar shows the hour's glyph and the minutes left. The widgets were already correct, because they hold three days of precomputed sky.

**On your dedicated desktop.** Swipe to the desktop you gave Astrum; the Dock's Assign To setting binds it there. You see:

- the main window, with its glass sidebar of rooms;
- a toolbar showing the room and a calm status line ("Hour of Jupiter · Moon in Cancer · void from 4:31 PM");
- the Oracle in the inspector;
- beside it, the Sky panel resting on your wallpaper: the hour and its countdown, a 12-hour strip, the Moon and mansion, void-of-course, and the next windows.

The old scrolling strip is gone.

**As an election window approaches.**

1. The morning briefing lists it.
2. In the last hour, the menu bar switches to "◈ in 58m".
3. A banner offers Open and Snooze.
4. Clicking it takes you to Astrum's desktop with the casting loaded.

Banners arrive even if you quit Astrum. Nothing can fire while the Mac sleeps; on wake you get one "while you were away" summary.

**A study evening.** Learn › Your Courses mirrors your Rune Soup folder. A lesson plays in its own player window, straight from <course library folder>, with the transcript alongside. Ask the Oracle, and it answers from your library with citations such as *Rune Soup › Foundations › Module 3 @ 12:34*; clicking one seeks the video. In the Athanor, an operation shows "From your shelves": passages from your alchemy PDFs that open at the page.

## Roadmap

| Phase | What you'll feel | Effort |
|---|---|---|
| 0. Foundations and tests | Today's app stops quitting on close, shows correct hours and a menu-bar hour; the four tests settle the path | 1.5–2 weeks |
| 1. Astrum for Mac | Native glass window, menus, Settings, menu-bar hour, Sky panel on its own desktop, launch at login, sync working | 4–5 weeks |
| 2. Glance everywhere | Desktop and Notification Center widgets, notifications that survive quitting, links that jump to the right room | 2–3 weeks |
| 3. Library I: Rune Soup | Courses, lessons playing in place, Recall and Oracle grounded in your library | 3–4 weeks |
| 4. Library II: Alchemy & Herbalism | PDFs at the page, Live Text on scans, background OCR, herbs and metals linked to passages | 3–5 weeks plus background OCR |
| 5. Native depth | Toolbar controls, native Oracle, on-device AI, Spotlight and Shortcuts, at the design studio's pace | Ongoing |
| 6. iPad and the web | The same design adapts to iPad and the browser | Later |

You'd be living in it on your Mac at about week 6–7, with widgets and quit-proof notifications at about week 9–10. Both library collections are fully in after roughly 14–19 weeks of focused work.

## The Library

- **Adding folders.** Library › Add Folder… grants access at runtime and remembers it, even if you rename the folder. A Desktop folder asks for Desktop permission once.
- **What's stored.** Only text is indexed, into a database in Astrum's own Application Support folder. Your files never move, and video is never copied.
- **Copyright safeguards.** Nothing from the Library is ever committed to the public repository, bundled, synced, or included in backups. By default no excerpt is sent to a cloud AI model.

| Material | How it's handled |
|---|---|
| Lesson notes (.md) | Indexed; timestamps let a passage open the video at that moment |
| Lesson videos (.mp4) | Played in place; only duration and progress are stored |
| EPUBs | Indexed by chapter; your course primers link to your own copies |
| PDFs with text | Indexed by page; open at the cited page with the passage highlighted |
| Scanned PDFs | Live Text right away; background OCR for search, paused or run while charging |
| Pages, Numbers, spreadsheets, images | Shown with Quick Look, not indexed |
| Older editions (_previous) | Ranked lower and folded under the current lesson |

Every herb, stone and metal in the planet and ritual rooms shows how many passages in your library mention it. A health card shows what needs OCR, what was skipped and what is offline.

## How the glass is made

- **macOS draws all the glass.** The sidebar, toolbar, inspector, menu bar, widgets and notifications get theirs from the system. The rooms sit on a solid content layer in the studio's palette, following Apple's guidance to keep glass out of content.
- **One set of design tokens, two outputs.** The studio's colours, type sizes and symbols are generated into both the web stylesheet and the native asset catalog, so both sides of the seam match.
- **System settings flow to the web.** macOS passes its live settings (light or dark, accent colour, Reduce Transparency, Increase Contrast, Reduce Motion) to the web layer.
- **Widgets.** They use the system's accented and clear styles, with countdowns that tick on their own.

## What a free Apple ID can and can't do

| Works with a free Apple ID | Not possible without the paid program | Not yet confirmed |
|---|---|---|
| Building and running Astrum on your own Mac | Giving Astrum to other Macs without Gatekeeper warnings | Time Sensitive notifications |
| Widgets sharing data through a team App Group (Test 2 confirms) | Mac App Store and TestFlight | What happens to an installed build after the yearly certificate expires |
| Notifications, menu bar, launch at login, Live Text, OCR, video | iCloud and CloudKit sync (sync stays on your AstrumSync folder) | App Groups for a future iPad widget |
| Privacy permissions that survive rebuilds | "group." style App Groups and push notifications | |

Upkeep: rebuild once a year before the free certificate expires. Its term of about a year is an Apple engineer's observation, not documented. On iPad, a free account means re-installing about weekly.

Some limits apply with any account:

- No public API places a window on a chosen desktop.
- Desktop widgets probably appear on every desktop (unverified).
- Glass looks frosted in windows you aren't using, unless a private API is used.

## Decisions only you can make

1. **Swift in the codebase.** Are you comfortable with roughly 8–10k lines of Swift alongside the JavaScript? If not, the fallback is the Tauri glass window: very native, not indistinguishable.
2. **Desktop binding.** Assign the whole app to its desktop (recommended), keep only the Sky panel there, or put Astrum on all desktops.
3. **Library and cloud AI.** Never send excerpts to the cloud (recommended), allow it per collection, or skip library grounding.
4. **The Alchemy & Herbalism folder.** Where is it, and is iCloud Desktop & Documents on? Moving the folder next to the course library folder avoids the Desktop prompt and iCloud placeholders.
5. **Place for the hours.** Location Services (recommended), a fixed place, or your birthplace as today.
6. **The Sky panel when unfocused.** The system's frosted look (recommended), always-vivid classic material, or a private API that could break.
7. **Lesson transcripts.** If your notes lack timestamps, should Astrum transcribe the 653 videos on-device? Always, only lessons you open, or never.

## Risks and honest limits

- **The crash report.** One report describes macOS 27 release builds crashing when a web view sits inside glass. It's a single report from a different setup, so we test for it in week one and every fallback is ready.
- **Widget signing.** Widget data sharing with a free Apple ID is well supported by Apple's documentation and one working project, but hasn't been tried on your Mac yet.
- **Record continuity.** Seeing your record without a migration is our expectation, not proven. A backup comes first.
- **Native next to web.** The two can feel slightly different until the studio's type and colours land in the rooms.
- **Correct timing.** The planetary-hour, sect and ingress fixes are committed (`af49b1d`, `236655b`, `4c82047`) and pass tests on eight device time zones.
- **Library unknowns.**
  - Old scans in Latin, Greek or blackletter may OCR poorly; page images always stay one click away.
  - The size of the Alchemy & Herbalism collection and its share of scanned pages are unknown until the first scan.
  - Whether your lesson notes carry timestamps is unknown until the first scan.
- **Source quality.** macOS 27 dates and glass details come from press reports, not Apple's own pages.

## Sources

- NSGlassEffectView: https://developer.apple.com/documentation/appkit/nsglasseffectview
- WWDC25 Build an AppKit app with the new design: https://developer.apple.com/videos/play/wwdc2025/310/
- WWDC25 Build a SwiftUI app with the new design: https://developer.apple.com/videos/play/wwdc2025/323/
- WWDC25 Meet Liquid Glass: https://developer.apple.com/videos/play/wwdc2025/219/
- WWDC25 widgets on macOS Tahoe: https://developer.apple.com/videos/play/wwdc2025/278/
- WWDC26 Modernize your AppKit app: https://developer.apple.com/videos/play/wwdc2026/289/
- WWDC26 widgets: https://developer.apple.com/videos/play/wwdc2026/277
- HIG Materials: https://developer.apple.com/design/human-interface-guidelines/materials
- macOS 27 release notes: https://developer.apple.com/documentation/macos-release-notes/macos-27-release-notes
- App Groups entitlement: https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.security.application-groups
- App group container protection (DTS): https://developer.apple.com/forums/thread/721701
- Personal Team signing and expiry (DTS): https://developer.apple.com/forums/thread/705932
- Free-tier capabilities: https://developer.apple.com/help/account/reference/supported-capabilities-macos
- Free Personal Team widgets in practice: https://github.com/Surdeddd/agent-widgets
- Keeping a widget up to date: https://developer.apple.com/documentation/widgetkit/keeping-a-widget-up-to-date
- WKPreferences inactiveSchedulingPolicy: https://developer.apple.com/documentation/webkit/wkpreferences/inactiveschedulingpolicy-swift.enum
- SMAppService: https://developer.apple.com/documentation/servicemanagement/smappservice
- Foundation Models: https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel
- Vision document recognition (WWDC25): https://developer.apple.com/videos/play/wwdc2025/272/
- Tauri Liquid Glass effects: https://github.com/tauri-apps/tauri/pull/14454 and https://crates.io/crates/tauri
- Packaged-build crash report: https://github.com/tauri-apps/window-vibrancy/issues/229
- Inactive glass: https://github.com/tauri-apps/window-vibrancy/issues/208 and https://developer.apple.com/forums/thread/818901
- WebKit CSS refraction (unmerged): https://github.com/WebKit/WebKit/pull/68614
- Space bindings (community notes): https://gist.github.com/0xdevalias/8bc497546d5f036cbaeae5d0e389aa35
- macOS 27 release timing (press): https://www.mactech.com/2026/09/09/macos-27-will-arrive-on-september-14-along-with-other-os-updates/
