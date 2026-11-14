# Astrum for the Mac: Instrument & Edition

*Revision 2 · design direction · 30 October 2026*

> **What changed.** This revision answers all 45 jury findings: 2 critical, 28 major and 15 minor. Everything the jury praised is kept. Appendix A maps each finding to the section that resolves it.

**Frame**
- **Baseline:** macOS 26 Tahoe on a 14-inch MacBook Pro, on version 26.1 or later. The Liquid Glass Clear/Tinted appearance setting shipped in 26.1 (System Settings ▸ Appearance), so it is baseline and native chrome follows it automatically. Every macOS 27 behaviour is a gated enhancement.
- **Host:** an Xcode AppKit/SwiftUI app that hosts the existing Vite/React bundle in WKWebView. Tauri stays only for the web and Linux builds (§4.1).
- **Spine:** *The Instrument*.
- **Grafts:**
  - from *Temple & Library*: provenance, the reading edition, the Library, the native inspector, Open Beside, the Lilly Square;
  - from *Living Sky*: the sentence-first voice, the Horizon figure, Moments;
  - from *The Practice*: `intentionId`, judgment from anywhere, the capture details, the Planetary Seasons strip.

> **The fixture.** One dated fixture produces every value in this document.
> - **Moment and place:** **Fri 30 Oct 2026, 12:14 EDT, New York (40°43′ N, 74°00′ W).** Each wireframe states its own minute on that day; flows move forward from it.
> - **Engine path:** sky values come from the repo's engine at commit `af49b1d` through its Meeus fallback, because Swiss Ephemeris does not load where this was written. The wireframes show the display precision of the normal Swiss Ephemeris state. On his Mac some values may shift by up to 1′ of arc or 1 minute of time. For example, the engine gives sunrise as 07:24:57, while the −0.833° reference solution gives 07:24:06 (§7, Ephemeris line).
> - **Time zone:** US daylight saving ends Sun 1 Nov at 02:00. Times before then are EDT, times after are EST. The app follows his locale and his 12/24-hour setting.
> - **Record values** such as hit rates, past castings and allies are *example* values. Library titles appear as [placeholders], because the content is copyrighted.
>
> **Record state at 12:14 (example):**
> - **Workings:** a Jupiter working cast Fri 23 Oct at 11:00 in the hour of Jupiter (Moon waxing in Pisces), awaiting judgment.
> - **Questions:** "The letter", asked Tue 27 Oct, awaiting judgment.
> - **Athanor:** a chamomile tincture (Sun), begun Wed 21 Oct, now on day 9 and shaken daily in the hour of the Sun.
> - **Court:** Grandmother (Ancestor), last offering Sun 18 Oct.
> - **Vigil:** a standing Vigil on Al-Thurayya (mansion 3). Its next clean entry is Sat 21 Nov 22:02, which enters its 14-day horizon on Sat 7 Nov.
> - **Study:** 3 cards due; Rune Soup lesson 4 has 14 min left.
> - **Talisman:** at 11:58–12:05 he created and committed the talisman *Venus for concord* (§8.2).
> - **Later today:** he captures an omen at 12:21 (§8.4) and asks the horary question *The lease* at 14:32:07 (§8.3).
>
> **Sky facts (engine):**
> - **The day:** sunrise 07:25, sunset 17:54; Saturday's sunset is 17:53. Day hours are 52.4 min, night hours 67.7 min. It is the day of Venus.
> - **The hour at 12:14:** the hour of Mars (the 6th hour of the day, 11:47–12:39). Then the Sun 12:39–13:32, Venus 13:32–14:24, Mercury 14:24–15:17.
> - **The Moon:** 8°34′ Cancer, waning 74%, mansion 8 (Al-Nathrah). She squares Saturn at 12:40, trines Mercury Sat 03:22 and squares Venus Sat 19:32. She is then void Sat 19:32 – Sun 00:11 and enters Leo.
>
> **Ahead:**
> - Sun 1 Nov: Last Quarter 15:18; clocks go back at 02:00.
> - Mon 2 Nov: full alignment, Scorpio II, 05:06:30, 19 s.
> - Wed 4 Nov 02:14 – Thu 5 Nov 09:40: void (31 h 26 min).
> - Sat 7 Nov 04:51: the Sun at 15° Scorpio (cross-quarter).
> - Mon 9 Nov 02:21: New Moon.
> - Fri 13 Nov 13:55: Mercury stations direct.
> - Sat 14 Nov 12:13: Venus stations direct.
> - Tue 17 Nov 06:40: First Quarter.
> - Sun 22 Nov 02:35: the Sun enters Sagittarius.
> - Tue 24 Nov 10:01: Full Moon.
> - Thu 3 Dec 20:15: Venus enters Scorpio.
> - Wed 23 Dec 20:21: Full Moon.
>
> Venus's season therefore runs **Sat 14 Nov 12:13 – Thu 3 Dec 20:15**.

---

## 1. The thesis

Astrum on the Mac is one calibrated instrument of the present sky and one honest edition of everything he reads, set inside the Mac's own grammar.

- **The instrument** covers the hour, the Moon, the windows and the work owed. Each fact is defined once, in one wording table (§2.3), and drawn the same way at four distances:
  - a glyph in the menu bar;
  - a widget on the desktop;
  - the Altar on its own full-screen Space;
  - the study window, with sidebar, content and inspector.
- **The edition** covers the canon, his collections, his lessons and his own pages. It is set in New York on quiet paper, every claim says where it came from, and nothing copyrighted leaves the Mac without his consent.

Liquid Glass is used only on the native chrome that floats above. The content is exact ink: true unequal hours, arc-minutes in tabular figures, the doctrine named, the ephemeris named. Nothing moves faster than the minute unless an alignment is seconds away.

The Operator's Loop runs through everything:
- one **Commit** makes a window visible on every surface;
- one **Judge** closes it from wherever he is;
- his own record speaks beside the next decision, weighted only as much as its sample size allows.

The engines are corrected before any pixel is drawn, so the face never states something the sky does not.

---

## 2. Design principles

1. **Truth before glass.** A built-in instrument must be correct before it can be beautiful. Phase 0a (§14) closes every defect still open at `af49b1d` that would make a practitioner stop trusting the face in the first week. Every illustrative window here was re-run through the engine under the corrected rules (§7, Find a Time).
2. **One fact, one wording, four distances.** Every atom has exactly one wording per rendering, published in `facts.v1` (§2.3). AstrumKit (Swift) and `@astrum/facts` (web) both render from that table, and golden tests compare their strings and glyph order. Within a surface, the current hour is stated once as the primary fact. The ribbon's highlighted cell is the only secondary mark of it.
3. **The present is sacred.**
   - Today, the Altar, the widgets, the menu bar and notifications always show *now*.
   - Only Sky and Calendar travel in time. They show a *Not now* token, and ⌘T returns them.
   - Selecting something fills the inspector at that thing's moment; it never moves global time.
4. **Glass is the crystal, not the dial.**
   - Regular Liquid Glass belongs to native chrome only.
   - There is exactly one Clear instance (§9.1).
   - There is never glass on glass, and no `backdrop-filter` anywhere.
   - Dials, pages and lists sit on opaque materials.
5. **Exactness is the ornament; depth is folded, never cut.** Every subject has four depths: a sentence, a figure, a table and the source. Each view shows the first two, and the other two are one gesture away. Every engine output survives. §3.5 lists, room by room, where every labelled section of today's screens goes.
6. **Still until the sky moves.** There is one stillness rule: minute precision everywhere. Seconds appear only in the Fractal Regulator and in the last 2 minutes before a committed alignment.
   - At rest, the only changes are the minute digits, the now-needle stepping once a minute, and the Moon's terminator, redrawn once a minute and imperceptibly.
   - At the hour, the new ruler draws on and the ribbon advances one cell.
   - Sound is off by default.
7. **Cite everything, copy nothing, and send nothing without consent.**
   - Every gloss, materia line, canon passage and Oracle answer carries a provenance chip.
   - His folders are read in place and never copied, modified or synced.
   - The record holds only *opaque* references to library material. Titles and quotes are resolved on this Mac at display time (§11.3).
8. **Honour the practice as it is practised.**
   - Horary is asked, not elected, and the astrologer judges before the Oracle speaks.
   - Offerings and contacts are never scored; petitions may be judged one by one.
   - A deployed sigil is veiled and left to be forgotten.
   - There are no streaks, closing rings, toasts, confetti, deltas or finance idioms. The feature is called Vigil, never "watchlist".
9. **Native where it touches the system; web where it draws the sky.** The JS engines compute. Swift draws every system surface and every form sheet. React draws the instruments and pages in the content column.
10. **Never slower than today.** The commonest questions get faster, not slower:
    - "how good is now?" is the first row of every Find a Time and an optional Sky complication;
    - choosing a window happens in a full content column, not a sheet;
    - his configured Oracle engine works without per-session ceremony.

### 2.1 Settled decisions

| Question | Decision | Why |
|---|---|---|
| Host | **An Xcode AppKit/SwiftUI host with the React bundle as its content.** Tauri is kept only for the web and Linux builds. | App Intents need Xcode's metadata extraction. Widget and control extensions must be embedded and signed inside-out. The native split must parent WKWebView, PDFView and AVPlayerView side by side. Doing this under Tauri means a parallel Xcode project plus re-signing anyway. |
| Free Personal Team | **v1 needs no profile-backed entitlement.** It uses a Team-ID-prefixed app group (`TEAMID.com.astrum.shared`), sandboxes only the widget extension, and has no Time Sensitive notifications. | Free provisioning profiles expire after 7 days (Apple DTS). On macOS 15 and later, a Team-ID-prefixed group avoids the container prompt without a registered `group.` identifier (DTS, forum thread 763826). |
| The dedicated desktop | **The Altar in system full screen** is its own Space. Astrum never uses **Dock ▸ Assign To**. A windowed variant is optional. | Assign To pins *every* Astrum window to that desktop. |
| Spaces | **Eight noun spaces:** Today, Sky, Calendar, Charts, Works, Court, Record, Library. | A chart list is a traditional astrologer's first reflex, and the Court is a set of relationships, not history. |
| Sidebar | **Fixed rows**, with disclosure he controls and that persists. Views within a space are a **toolbar segmented control**, as in Calendar.app. Nothing in the sidebar appears, disappears or collapses by itself. | Spatial memory is what a sidebar is for. |
| Inspector | **All native SwiftUI** (AstrumKit), from engine JSON. | One technology per surface, true vibrancy, and shared with the widgets. |
| Sheets | **SwiftUI form sheets** for New Question, Commit, Log, Response and Judge note. **Detail pages** open inside the main webview with a native Back button. | A second WKWebView per sheet costs a cold JS context and hundreds of milliseconds. |
| Find a Time | **A mode of the Calendar content column.** Selecting a result fills the inspector and highlights the day. The only sheet is the Commit confirmation. | Choosing a window is the most important decision in the app. |
| Record store | **Mirror first.** localStorage/IndexedDB remains the web layer's working store, written through to a native SQLite read model plus an inbox. The sync engine and its wire format do not change. SQLite becomes the source of truth only once the iPad client reads the same schema (§4.2). | This protects merge, tombstones and the iPad record that drive the hit-rate statistics. |
| No place set | **A labelled approximation, kept.** The window and inspector show hours from 06:00, labelled *Approximate · Set Your Place*, as the engine does today. That approximation is also the polar fallback. The menu bar, widgets, notifications, Find a Time and the Altar refuse instead: "Set your place to see the hour". | Glanceable surfaces must be right or silent. Reference surfaces may approximate, as long as they say so. |
| Altar background | **Wash** by default. **Sky** places every text group on an opaque platter tinted by the sky, and it is the one Clear-glass instance. The full sky otherwise appears only inside the Horizon figure. | Text must stay legible in all six twilight stages (§9.2). |
| Oracle engine | **His configured engine is the default.** Per-session consent covers only library passages and record scopes he has not pre-approved. Foundation Models handles small tasks only (§7, The Oracle). | The on-device model has a context window of about 4,096 tokens and limited reasoning. |
| Scope of v1 | **7 widget kinds, 4 controls, 48 custom symbols.** | First-party apps ship 2–5 widgets, and every kind multiplies QA. |

### 2.2 Glossary: every user-visible noun

| Term | Meaning | Never confused with |
|---|---|---|
| **Today** | The face for the present planetary day | — |
| **Now · Ahead · Atlas · Moments** | Sky's four views. Atlas holds the reference pages: Planets, Decans, Fixed Stars, Moon & Mansions, Fractal, Cycles. Moments lists committed windows, hinges and pinned moments. | — |
| **Find a Time** | Calendar's search mode for windows | — |
| **Vigil** | A standing watch that searches on every replan and tells him when a window qualifies | never "watchlist" |
| **Testimonies** | The three scales (Significator · Moon · Moment) that grade a moment | not rings |
| **Planetary Seasons** | Per-planet stretches when a planet is dignified, direct and free of the beams | the Work's Season |
| **The Work's Season** | The Athanor's alchemical season (`alchemicalSeason`) | Planetary Seasons |
| **Election Quality** | Calendar layer: one planet's electional quality across days | — |
| **Up Next** | The time-ordered list of what is his to do or know | — |
| **Altar** | The glanceable face, shown in the window or in full screen on its own Space | there is no "Observatory" |
| **Night** | The red presentation used on the Altar and in the Rite after astronomical dusk | Dusk |
| **Paper · Dusk · Lamp** | Reading themes | Night |
| **Rite** | The running ritual companion window | — |
| **Workings · Talismans · Sigils · Athanor** | Kinds of work under Works | — |
| **Stage track** | The row of dated stages at the head of every work | — |
| **Commit · Judge · Seal · Release** | Commit a window · judge a result · seal a rite · release a sigil unjudged | — |
| **Court** | Relationships, in six kinds, logged as Offering, Contact, Petition and Response | — |
| **Journal · Pages · Results** | Record's three views | — |
| **Results by Condition** | His hit rates by planet, hour, phase, mansion, void, grade band and ally, with *n* | not "vitals" |
| **Findings** | Statistical patterns stated in plain sentences, shown only when *n* ≥ 5 and two factors agree | reader Highlights |
| **Highlights & Notes** | His marks in books and lessons | Findings |
| **Book of Results** | His printable export | — |
| **Canon** | The verified sources inside Astrum, organised by source | his Library collections |
| **Collections** | His folders: Rune Soup, Alchemy & Herbalism, and any he adds | — |
| **Materia** | One card per plant, mineral, metal, resin, oil or stone | — |
| **Study** | Path, Topics, Primers and Cards (formerly Learn) | Rune Soup's *The Foundations Course* |
| **Open Beside** | Two sources side by side in one window | — |
| **Oracle** | The grounded AI, with modes Ask · Read the Sky · Judge · Draft · Tutor · Correlate · Plan | — |
| **Canon · Library · Record · Oracle · Unsourced · Modern** | The provenance chips | — |

### 2.3 `facts.v1`: the wording table

Every string below is a template from `facts.v1`. Each example in this document is generated from the fixture through this table. The golden tests render every atom in every form in en-GB and en-US, in AstrumKit and in `@astrum/facts`, and fail on any difference.

**Formats**
- **Clock:** `HH:mm` (24 h) or `h:mm a` (12 h), following his locale. Seconds never appear, except `mm:ss` in the Regulator and in the last 2 minutes before a committed alignment.
- **Rounding:**
  - **Instants** (hour boundaries, sunrise, perfections, ingresses, hinges) round to the nearest minute.
  - **Windows offered for work** round *inward*: the start rounds up and the end rounds down, so the window shown is always inside the true one. Mon 16 Nov's true hour of Venus, 04:23:37–05:34:16, shows as `04:24–05:34`.
- **Day prefix:**
  - none within the current planetary day;
  - the weekday within the next six days (`Sat 19:32`);
  - the date beyond that (`Mon 16 Nov 04:24`);
  - the year only outside the current year.
- **Ranges:** `04:24–05:34`, with an unspaced en dash, when both ends are bare times; `Sat 19:32 – Sun 00:11` otherwise.
- **Durations:** `25 min` · `1 h 10 min` · `4 h 39 min` · `17 days`. `19 s` is used only for alignments.
- **Relative:** `in 25 min` · `in 2 h 14 min` · `tomorrow at 04:24` · `in 17 days`. While a window is open: `open · 41 min left`.
- **Degrees:** `17°38′`, with true prime marks. Signs are named in rows (`Cancer`) and shown as glyphs in tiles (`♋`).
- **Ordinals:** `6th hour of the day` and `11th hour of the night`, everywhere. VoiceOver reads the same words.
- **Planetary day:**
  - The page title reads `Day of Venus`.
  - Before sunrise, the title reads `Night of Thursday · Friday 30 October`, and the day line and Up Next follow the planetary day.
- **Grade words:** Disqualified · Marginal · Acceptable · Good · Excellent · Talismanic (the engine's bands, at 45 · 60 · 75 · 90). The score (`82`) appears only as secondary ink, in the instrument and in result lists.

**Atoms × renderings**

| Atom | Row (lists, menus, notification bodies) | Timed row (Up Next, Within 48 Hours) | Tile (complication, widget) | Instrument |
|---|---|---|---|---|
| Hour | `Hour of Mars · ends 12:39 · then the Sun` | never used for the current hour | ruler glyph · `25 min` · `then ☉ 12:39` | `Hour of Mars` / `25 min left` / `6th hour of the day · ends 12:39 · then the Sun` |
| Vowel | `Vowel Η → Ο · ay → oh` when the day and hour rulers differ; `Vowel Η · ay` when they are the same | — | `Η → Ο` | as the row |
| Moon | `Moon 8°34′ Cancer · waning 74% · mansion 8` | `12:40 ☽□♄ Moon squares Saturn` | disc · `8° ♋ · waning` · `Mansion 8 · Al-Nathrah` · `□ ♄ 12:40` | adds the Moon's Itinerary |
| Void | `Void Sat 19:32 – Sun 00:11 · then Leo` | `Sat 19:32 ◌ Void until Sun 00:11 · then Leo` | `Void Sat 19:32` (upcoming) · `Void until 00:11` (current) | `Void of course · 4 h 39 min · ends 00:11 as she enters Leo` |
| Window | `Venus for concord · Mon 16 Nov 04:24–05:34 · Excellent` | `Mon 16 Nov 04:24 ◆ Venus for concord · Excellent` | Testimonies · `Excellent` · `♀ Mon 16 Nov 04:24` · `in 17 days` | adds score, cautions and the record line |
| Step | `Shake the chamomile tincture · hour of the Sun, 12:39` | `12:39 ☉ Athanor · shake the chamomile tincture · day 9` | `Step 3 of 7 · Shake · hour of the Sun 12:39 · day 9` | the step page |
| Alignment | `Full alignment · Scorpio II · Mon 2 Nov 05:06 · 19 s` | `Mon 05:06 ✶ Full alignment · Scorpio II · 19 s` | `✶ Scorpio II · Mon 05:06` | the Regulator, with `mm:ss` in the last 2 min |
| Observance | `Samhain · offering to the Beloved Dead · Sat 17:53, at sunset` | `Sat 17:53 ✦ Samhain · offering to the Beloved Dead, at sunset` | `✦ Samhain · Sat 17:53` | the Court page |
| Judgment | `Jupiter working · cast Fri 23 Oct · 7 days` | — | as the row, plus Hit · Partial · Miss | — |
| Card · Continue | `Study · 3 cards due` · `[Course] · Lesson 4 · 14 min left` | — | `3 due` · `Lesson 4 · 14 min left` | — |
| Testimonies | `Significator 92% · Moon 72% · Moment 76%` (the weighted share passing), with `· broken: [reason]` if a critical criterion fails | — | three scales | three scales and the criteria list |
| Record line | `Your record: Venus talismans 3 of 4 · +2 (n = 4)`; below *n* = 3, `Your record: not yet known (n = 2)` | — | `+2 · n = 4` | a dot with a confidence whisker |
| Stamp | `Fri 30 Oct 12:21 · Hour of Mars · Moon 8°39′ Cancer · mansion 8 · waning 74%` | — | `12:21 · ♂ · ☽ 8°39′ ♋ · mansion 8 · waning` | — |
| Ephemeris | `Ephemeris: Swiss Ephemeris · exact`, `Moshier · within 1″`, or `Meeus · approximate` | — | — | the Sources pane |

**Glyph rendering (menu bar only):** the hour ruler's template image. A hollow-Moon badge is added while the Moon is void, and a dot while a committed window is within 60 minutes. A Rite template image with `3/9` shows during a Rite, and an alignment image with `01:42` during an alignment's last 2 minutes (§5.2).

---

## 3. Information architecture

### 3.1 The eight spaces

| ⌘ | Space | Answers | Toolbar views | Sidebar children (fixed; disclosure is his) |
|---|---|---|---|---|
| 1 | **Today** | What is the hour, and what is mine to do? | — | — |
| 2 | **Sky** | What are the heavens doing at any moment? | Now · Ahead · Atlas · Moments | — |
| 3 | **Calendar** | When should I act? | Day · Week · Month · Year, plus the **Find a Time** mode | His Vigils (rows he creates) |
| 4 | **Charts** | Whose chart, and which question? | Wheel \| Square | My Chart · People · Questions · Saved |
| 5 | **Works** | What is in progress? | — | Awaiting Judgment · Workings · Talismans · Sigils · Athanor |
| 6 | **Court** | Who am I in relationship with? | — | Ancestors · Planetary Intelligences · Saints & Holy Dead · Genii Loci · Daimones & Familiars · Other (each can be hidden) |
| 7 | **Record** | What happened? | Journal · Pages · Results | — |
| 8 | **Library** | What is known, and what do I own? | Grid \| List; Aa in reading views | Reading Now · Rune Soup · Alchemy & Herbalism · *(added collections)* · Canon · Materia · Study · Highlights & Notes |

### 3.2 Sidebar and toolbar

- **The sidebar** is a native floating glass pane in Music scale: 220 pt wide (adjustable from 200 to 280), 28 pt rows, 16 pt symbols and semibold selection. Each row has its own symbol; there are no emoji and no duplicates.
- **Disclosure** is user-controlled and persisted per row, as in Finder and Mail. Nothing expands, collapses or reorders when he navigates, and no row ever comes or goes because time passed.
  - The default is only **Library** expanded, which gives 16 rows.
  - With everything expanded there are 32 rows, and the list scrolls.
- **Views inside a space** are a toolbar segmented control, as in Calendar.app's Day/Week/Month/Year. ⌘⌥← / ⌘⌥→ step through the segments.
- **Moments** is a fixed Sky view. Its *content* lists committed windows, the next lunation hinge, Birth Sky and moments pinned with ⌘D. Choosing one is navigation: it opens Sky ▸ Now at that moment, with the time control showing it.
- **Badges** count only things awaiting his action:
  - Works: castings awaiting judgment;
  - Calendar: windows a Vigil found that are not yet committed;
  - Court: observances today.
- **Calendar layers** are set in a toolbar **Layers** popover with checkboxes, and every layer is mirrored in View ▸ Layers.
- **Housekeeping:** rows can be reordered and hidden. The sidebar collapses automatically below a 1100 pt window and toggles with ⌃⌘S.

### 3.3 The inspector (⌥⌘I, native, edge-to-edge glass, 320 pt)

| Pane | ⌥⌘ | Contents |
|---|---|---|
| **Sky** | 1 | Conditions at the selected item's moment (cast time, window start, capture time, or now). In order: the hour (as the facts row), with the vowel line; the day ruler; the Moon (sign, degree, phase, mansion, next aspect, void); the Sun's face; planets with their flags first; aspects, with an **Antiscia** row when one is active; stars in orb; lots; and Testimonies when the item is a window. It ends with the **Ephemeris line** and the button **Show Sky at This Moment**, which opens a second window. |
| **Record** | 2 | His record under these conditions, always with *n*; linked items; **Omens near** (now wired through `omensNear`); his natal amplification when the moment touches his chart. |
| **Sources** | 3 | Every provenance chip on the page, resolved: Canon (chapter, table, edition); Library (resolved on this Mac only); Record (entries and *n*); Oracle (engine, and exactly what was sent); Unsourced (the reason); Ephemeris (engine and expected accuracy). |
| **Oracle** | 4 | One grounded Oracle, built with `buildOracleContext` and `groundingForAsync` on every call. It carries a persistent engine badge. In Charts ▸ Questions, **Judge** mode shows engine facts only until his verdict and timing are saved (§8.3). **Window ▸ Oracle** opens the same conversation in a window. |
| *Materia* | — | Contextual: shown when a plant, mineral, metal, resin, oil or stone is selected. |
| *Notes* | — | Contextual: shown in lessons and books. |

**Default pane and visibility:**
- The inspector is closed by default on Today and the Altar.
- It is open by default on Sky, Calendar, Charts, Works and reading views.
- In **Charts ▸ Questions** it opens on **Sky**.
- Below 1200 pt of window width it overlays the content instead of narrowing it.

### 3.4 Objects and the Loop

Every casting carries an **`intentionId`**. An intention, its election, its talisman, its sigil, its pages and its check-in therefore share one family and one stage track. The stage track is a plain row of dated stages. There is no Loop glyph to complete, and statistics update silently.

| Kind | Stages | Judged? |
|---|---|---|
| Working | Intent → Elect → Prepare → Rite → Deploy → Judge, or **Abandoned** | Hit · Partial · Miss · Later |
| Talisman | Intent → Elect → Design → Consecrate → Deploy → Judge, or **Abandoned** | Yes |
| Athanor operation | Intent → Elect → Steps (each with its window) → Complete → Judge (the template's own question), or **Abandoned** | Yes. The Completed & Abandoned list is kept. |
| Sigil | Created → Charged → Deployed (*veiled*) → Fulfilled · Judged · **Released unjudged** | Only when he chooses. Released sigils are recorded as *unknown* and left out of statistics. |
| Question (horary or geomancy) | Asked → Judged by him → Outcome | "Was it so?" Hit · Partial · Miss · Later |
| Court act | Offering · Contact · Petition · Response | **Offerings and contacts are never scored.** A **petition** may be judged, but only on its own, and never rolled into a spirit's "hit rate". |
| Committed window | Belongs to its parent's Elect stage | Through the parent |

Abandoned is a terminal stage. It is recorded with an optional note, excluded from hit rates, and counted separately in Results.

### 3.5 All 34 rooms, mapped

The **Survives as** column is generated from every labelled section in every screen (`grep` over `src/screens/*.jsx` for the label styles). A CI test fails if a label is added to a screen without being mapped here.

| # | Room today | New home | Form | Survives as (today's labelled sections → new place) |
|---|---|---|---|---|
| 1 | Sky | **Sky ▸ Now** | View: astrolabe figure plus complications | *Planetary Hour* → Hour complication, with the **vowel line**. *Live Positions* → Planets complication and inspector rows. *Moon* and *Moon Void of Course* → Moon complication and the void grammar. *Fixed Star in Orb* → Stars in Orb. *Arabic Lots* → Lots complication. ***Antiscia Active*** → the antiscia toggle on the Aspects page and the inspector's Antiscia row. *The Celestial State* → Today's sentence. *Cazimi* → the Sun-relation zone. The AI gloss → Oracle *Read the Sky*. |
| 2 | Altar | **The Altar** (⌃⌘A), windowed or full screen | Presentation | Giant hour → ruler hero. Moon disc → Volvelle. Observances → Within 48 Hours. Hour bell → Hour Bell control. Enter Rite → **Begin Rite**. |
| 3 | Aspects | **Aspects page** (from the Planets complication) | Detail page | *Live Planetary Aspects* → Constellation \| Table (the 7×7 grid), plus an **antiscia toggle**. The Moon's aspects → the Itinerary. |
| 4 | Decans | **Sky ▸ Atlas ▸ Decans** | Atlas page | *Classical Tradition · 36 Faces*, *All 36 Faces*, *The Image of the Face*, *Signification* → the page. ***Your Natal Faces*** → a section at the top. *Active Fractal Levels* → a link to Atlas ▸ Fractal. |
| 5 | Fractal | **Sky ▸ Atlas ▸ Fractal** | Atlas page | *Fractal Timing* → the Regulator. ***Coherence*** → the Regulator's coherence row. *L2 Windows This Decan* and *Upcoming Full Alignments* → the Ruler list, a Find a Time template and a Calendar layer. ***Sound now · one breath · one face*** → the vowel line at L4. ***Entry/Absolute mode*** → Settings ▸ Doctrine ▸ Fractal mode. |
| 6 | Planets | **Sky ▸ Atlas ▸ Planets** | Atlas page; planet popover | *Domains*, *Classical Ritual Preparation*, *Ingress Countdown*, *Natal Position*, the Orphic hymn → page sections. ***Sacred Vowel — Hermetic Tradition*** → the page, the popover and the Rite. Materia → Library ▸ Materia, with chips. |
| 7 | Stars | **Sky ▸ Atlas ▸ Fixed Stars** | Atlas page | *Stellar Magic*, *Currently Active*, *Appearances*, *Magic* → the page. *Thebit's Window* → a Find a Time template. ***HERB · STONE*** → Materia entries, linked from each star. |
| 8 | Ephemeris | **Sky ▸ Ahead** | View | *Ephemeris* (graphic) → Graph. *Sign Ingresses*, *Retrograde Stations*, *Eclipse Calendar* → List, plus the Sky Events layer. |
| 9 | Mansions | **Sky ▸ Atlas ▸ Moon & Mansions** | Atlas page | *For · Elect · Avoid*, *Next Mansion Entries*, the Picatrix IV.9 talismans → the page, the Mansion template and the Volvelle's mansion ring. |
| 10 | Lunar Cycle | **Moon Volvelle** and **Lunation page** | Merge | *The Monthly Rhythm*, *The Coming Turns* → the Volvelle's hinges and the Lunations layer. *Set an Intention for This Lunation* → an Intention entry linked to Works. |
| 11 | Cycles | **Sky ▸ Atlas ▸ Cycles** | Atlas page | *Jupiter–Saturn Conjunction Cycle*, *Uranus · Neptune · Pluto · Great Mutation*, *Upcoming Ingresses* → the page and Calendar ▸ Year. The AI macro model → an Oracle mode on the page. |
| 12 | Natal | **Charts ▸ My Chart** | Document with tabs | *Natal Chart* → Wheel \| Square. *Natal Positions*, *Angles & Nodes*, *Houses* → Positions. ***Declinations*** → a **Declinations tab** with Parallels & Contra-Parallels. *Secondary Progressions*, *Solar Arc Directions* → Directions. *Current Time Lords*, *Period Timeline* → Time Lords. *Solar Return*, *Next Lunar Return* → Returns. *Arabic Lots* → Lots. *Midpoints* → Midpoints. ***Natal Decan Signatures*** → Atlas ▸ Decans ▸ Your Natal Faces. *Synastry Aspects*, *People Library* → Charts ▸ People. |
| 13 | Transits | **Charts ▸ My Chart ▸ Transits** | Tab | *Transit Hit List* → runs automatically over 30, 90 and 365 days. Also the To My Chart filter in Ahead and a Today row on the day a transit is exact. |
| 14 | Lots | **One Lots component** | Merge | *Sect*, *Rite* → the Sky complication and My Chart ▸ Lots. The formula (Paulus/Valens) → Doctrine. |
| 15 | Chapters | **Charts ▸ My Chart ▸ Time Lords** | Tab | *The Major Periods*, *Valens · Anthologies IV* → profections, zodiacal releasing (with peaks and the loosing of the bond) and firdaria. The Time Lords layer → Year view. |
| 16 | Horary | **Charts ▸ Questions** | Document; SwiftUI New Question sheet | *Cast the Question*, *The Question*, *The Matter Belongs To* → the sheet. ***Considerations Before Judgment*** → the full list from *Christian Astrology* (§8.3). *Testimonies*, *Perfection* → the document. |
| 17 | Geomancy | **Charts ▸ Questions**, Method: Geomancy | Document | *The Shield*, *The Twelve Houses*, *Perfection*, *Ars Geomantica · Agrippa · Greer* → the document. The Mothers are entered by hand by default. |
| 18 | Elections | **Calendar ▸ Find a Time**, Vigils, Planetary Seasons | Merge | The live score → the **Now row** and the Testimonies complication. *Intent · Planet · Domain · Horizon · Target* → template and criteria. *Moon Aspects* → the Itinerary. *Your Record* → the record line. *Picatrix — The Named Elections* → templates. *Dorotheus · Bonatti · Lilly* theory → Canon per source. The Vigil sub-tab → Vigils. The season report → an Oracle reading on Planetary Seasons. |
| 19 | Calendar | **Calendar ▸ Month** | View | *Election Calendar* → the Election Quality layer, plus Commit. |
| 20 | Almanac | **Almanac layers**, the month header, **File ▸ Print Almanac…** | Layer | *The Liturgical Calendar*, *Planetary Hours*, timing letters → layers, print, and the Letters layer. "Could be made today" → an Up Next row with **Elect It**. |
| 21 | Work | **Works ▸ Workings** | Plan editor | *Working Parameters*, *Generated Plan* (→ Oracle *Draft*, accepted line by line), *Timeline*, *Ritual Preparation*, *Orphic Hymn*, *Talisman Workshop* → the Sigil Canvas. *℞ Retrograde Warning* → a named caution. *Natal Amplification* → the inspector's Record pane. *Notes / Constraints* → plan notes. |
| 22 | Rite | **The Rite window** (⌘R) | Window | *New Rite*, *The Rite in Progress*, *The Working Planet* → the Rite. ***Working With (optional)*** → a Court link in the Rite header. |
| 23 | Talisman | **Works ▸ Talismans** | Object with stage track | *What is this talisman for?*, *Under Which Sphere* → Intent. *Elect the Moment* → Find a Time. ***Or: work this present moment*** → the **Now row** and **Work Now**. *The Figure* → the Sigil Canvas. *Consecration* → the Rite. *Seal the Record* → Seal, with photos. |
| 24 | Athanor | **Works ▸ Athanor** | Lab bench | *Operation*, *Ruling Planet*, *Name the Work* → the New Operation sheet. *Process Timeline*, *Windows Opening* → steps with windows. *Lab Notebook* → the notebook, with **photos** ("colour is data"). *The Timing Doctrine* → Canon ▸ The Art, linked. *Ora et Labora · The Slow Fire* → the Work's Season. ***Completed & Abandoned*** → kept as a list. Safety, apparatus and study-only paths → the **safety-first header** (§7). The library chamber → the bench's **Library** tab. |
| 25 | Sigils | **Works ▸ Sigils** | Gallery plus Sigil Canvas | *Sigil Workshop*, *New Sigil*, *Intention*, *Planet*, *Draw Your Sigil* → the Canvas. Lifecycle → **veiled** once deployed. |
| 26 | Spirit Court | **Court** | Space | *Welcome to the Court*, *New Member of the Court* → New Member sheet (six kinds). *Tend the Relationship* → the log (Offering · Contact · Petition · Response). *Coming Observances* → Today and the Feasts layer. *Preferred offerings* → the member page. ***Seed a Sphere's Court (Agrippa)*** and ***Release from the Court*** → kept as commands. *Extradimensional Diplomacy* → Study ▸ Topics. |
| 27 | Omens | **Record ▸ Journal**, filter Dreams & Omens | Filter plus Quick Capture | *Call and Response* → **Omens near** in the inspector. |
| 28 | Journal | **Record ▸ Journal** | View | *Practice Journal*, *Record & Reflect* → the timeline, plus **Before Sleep** at his wind-down time. |
| 29 | Grimoire | **Record ▸ Pages** | Notes-like editor | *Personal Grimoire*, *Book of Shadows*, title · category · planet · tags · body → Pages. Pages marked *For the Oracle* replace the Knowledge Base. |
| 30 | Review | **Record ▸ Results** and **Works ▸ Awaiting Judgment** | View | *The Operator's Loop* → the stage track and Awaiting Judgment. *Time to Result* → Results by Condition. ***Your Most-Recurring Correspondence*** → a **Finding**. *Note Only* → Judge ▸ Note. The photo strip → photos on castings. |
| 31 | Recall | **Toolbar search** (⌥⌘F) | Command | *Search Your Own Record* → scopes Everything · Record · Canon · Library. Also Open Quickly and Spotlight. |
| 32 | Learn | **Library ▸ Study** | View | *Magical Education* → the Path (9 modules). The ***45-topic Topics Library*** → Topics. ***Primers*** → Primers. The daily card → Cards and an Up Next row. The tutor → Oracle *Tutor*. |
| 33 | Planner | **Oracle**, mode *Plan* | Merge | *AI Working Planner* → Plan, grounded in the sky and the record. Library material is included only with consent. |
| 34 | Profile | **Settings** (⌘,), toolbar tabs | Window | *Identity*, *Practitioner Profile*, *Experience Level*, *Magical Tradition(s)* → Practice. *Natal Chart Data* → Charts. *AI Engine*, *Anthropic API Key* → Oracle. *Ambient Practice* (Briefing at, Hour Alerts For) → Notifications. *Doctrine · Void of Course* → Doctrine. ***Ephemeris Engine*** → **Doctrine ▸ Ephemeris**, with its status and a **Test**, mirrored in the inspector's Sky pane. *Intake — Timing Letters* → Calendar ▸ Letters. *Knowledge Base* → Pages. *Feed Sources* → Library. *Backup & Restore*, *Sync*, *Choose Sync Folder*, *Storage Health* → Sync & Backup. *Visual Tint* → removed. |

**Also placed**
- **Doctrine:**
  - house system, and Lilly's five-degree rule (on by default);
  - triplicity scheme (Dorothean, Ptolemaic, Lilly);
  - bounds (Egyptian, Ptolemaic);
  - mansion zodiac and source;
  - void school (Lilly, Hellenistic *kenodromia*, modern), with the other school's span ghosted;
  - orbs (moieties, or a fixed working orb);
  - the body-contact rule (§7);
  - sunrise definition, as a numeric altitude;
  - Lot formulas; Fractal mode; Ephemeris.
- **Retired:** the hamburger drawer, the floating six-action button, the ⌘K four-mode palette and the scrolling AstralLiveBar (§13).

---

## 4. The main window

### 4.1 The shell contract and the host

| Surface | Technology | Notes |
|---|---|---|
| Window frame, unified toolbar, time-control capsule, segmented controls, search field | **Native** AppKit (`NSToolbar`, `NSGlassEffectView`) | No custom title bar. **Automatic window tabbing is disabled**, which frees ⌘T. |
| Sidebar | **Native** split-view sidebar, SwiftUI `List`, custom symbols | Fixed rows with persisted disclosure |
| Inspector and all its panes | **Native** SwiftUI (AstrumKit) | Drawn from engine JSON: `skyTimeline`, the selection context and the Oracle stream |
| Form sheets: New Question, Commit, Log Offering/Contact/Petition, Response, Judge note, New Member, New Operation | **Native** SwiftUI from engine JSON | No web content in sheets |
| Content column | **Web**: WKWebView running the React bundle | Instruments, pages and detail pages (with a native Back button) |
| PDF reader | **Native** PDFKit `PDFView` | A native child of the content split |
| Lesson video | **Native** AVKit `AVPlayerView` | The top pane of a native split, with the transcript webview below |
| Open Beside | **Native** split of WKWebView and PDFView | Proved in the shell spike. Fallback: a Reader window beside the main window. |
| Planet popover | **Native** SwiftUI popover | Anchored to a rectangle the web layer reports |
| Quick Capture | **Native** non-activating `NSPanel`, kept warm | §5.4 |
| Rite window | Web content with a **native** floating glass transport | §5.4 |
| Menu-bar extra | **Native** `NSStatusItem` with `NSMenu` and a SwiftUI header | |
| Widgets and Controls | **WidgetKit** and **ControlWidget** in one sandboxed extension | §6 |
| Notifications | **Native** `UNUserNotificationCenter` plus an in-process scheduler | §5.3 |
| App Intents, Spotlight, Focus filter | **Swift** | Requires the Xcode build |
| Keep-awake, idle and Space detection, haptics, accessibility bridge | **Native** services | |

**The host.** An Xcode project lives under `apple/` in the repo. It builds the Vite bundle into the app's resources and serves it from a custom scheme (`astrum-app://`).
- **Engines:** they run in one **Web Worker**, which is created once and never per view.
- **A secondary webview:** if one is ever unavoidable, there is one, pre-warmed, sharing the same `WKProcessPool` and `WKWebsiteDataStore`.

**The key-view loop.** There is no public API for moving focus out of a WKWebView. The web layer therefore detects focus edges:
- **Tab** on the last focusable control posts `focusExit:next`, and the host calls `makeFirstResponder` on the inspector's first control.
- **Shift-Tab** from the inspector's first control makes the webview first responder and calls `focusLast()`.
- The sidebar ↔ content boundary works the same way.
- The accessibility children order is set explicitly, so VoiceOver crosses in the same order.

The shell spike has three tests: Tab out of the last web control into the inspector, Shift-Tab back, and VoiceOver crossing both boundaries.

**The origin change.** The webview's origin changes from `tauri://localhost` to `astrum-app://`, so web storage does not carry over. First run imports a `backup.js` export from the current Tauri build and keeps a dated pre-migration backup (§11.1).

### 4.2 Data: mirror first

1. **The working store stays.** localStorage and IndexedDB, through `storage.js`, remain the web layer's working store. None of the 44 synchronous `loadJSON` call sites change.
2. **A native write-through mirror.** Every `saveJSON` and photo write posts `{key, value, rev}` to the host through a `WKScriptMessageHandler`. The host writes it to `~/Library/Application Support/Astrum/record.sqlite` (WAL mode) as a **read model**.
   - The web layer also posts its **projections**: `skyTimeline`, Up Next, awaiting judgments, committed windows, steps and Vigils. Swift stores them; it never computes the record's logic.
   - The read model feeds the widgets, intents, notifications, Spotlight and the inspector.
3. **An inbox for native writes.** Widget buttons, notification actions, Controls, App Intents and Quick Capture append rows to an **inbox** in the shared container: `{id, kind, payload, createdAt, device}`.
   - The web layer ingests them on launch, on wake, and on a Darwin notification from the host.
   - It applies them **through the normal store functions**, so merge, tombstones and sync behave exactly as they do today, and then acknowledges them.
   - Undo is an inbox row that reverts by id.
4. **Sync is frozen.** `merge.js`, `tombstones.js` and the wire format stay as they are, with the format version pinned by a test.
   - The Tauri file transport is replaced by `macHostFs`, which has the same interface and the same format.
   - The iPad (Capacitor) keeps `capacitorICloud` unchanged.
5. **A golden cross-device test.** A Mac record (web store → mirror → inbox writes) and an iPad JSON snapshot carry interleaved edits, deletions and tombstones. They are round-tripped through `merge.js` in both directions. The test asserts:
   - identical `computeStats` and elective-memory outputs;
   - no resurrected tombstone;
   - no duplicate inbox application.
6. **Switching later.** SQLite becomes the source of truth only in Phase 8, once the iPad client reads the same schema from a shared schema package. Both clients migrate together, behind a `backup.js` snapshot.

**The library stores** are separate and never join the record (§11.3):
- `Library/library.sqlite` holds collections, citations, highlights, notes and passage cards;
- `Library/index.sqlite` holds the FTS5 index, OCR text, transcript timings and thumbnails.

**Photos** are stored in Application Support and referenced by id. The record's photo references sync as they do today.

### 4.3 Anatomy on a 14-inch MacBook Pro

- **Screen:** 1512 × 982 pt at the default "looks like" setting. In full screen the notch band takes about 37 pt, leaving **1512 × 945 pt**.
- **Window:** opens at 1360 × 860 on a work desktop. Zoom fills the visible frame. The minimum is 900 × 600.
- **State restoration:** the window restores frame, space, column widths, selection, inspector pane, disclosure, scroll position and Altar state "as if never quit".
- **Toolbar:** 52 pt, unified, native glass, monochrome symbols, at most three groups. Every toolbar item has a menu twin. **The title is static**: the space's name, plus the date on Today. There is never a dynamic subtitle or countdown.
- **Columns at 1512 pt:** sidebar 220 + content 972 + inspector 320; with the inspector closed, content is 1292. Below 1200 pt the inspector overlays the content, and below 1100 pt the sidebar collapses.
- **Content grid:**
  - 8 pt base, 24 pt outer margins, 16 pt gutters;
  - opaque platters with an 18 pt radius and 12 pt padding;
  - rows of 28 pt (one line), 36 pt (Up Next) or 44 pt (two lines).
- **Separation** comes from space and platter tone, never from drawn lines. Lines appear only under Increase Contrast or Show Borders, and inside figures, which are drawings.
- **Scroll edges:** a hard edge sits under pinned headers (the calendar weekday row, ephemeris columns, the aspect table); elsewhere the edge is soft. If native edge effects do not see WKWebView scrolling, content starts below the toolbar and nothing fakes a blur.
- **Window states:**
  - Inactive windows lose vibrancy natively.
  - The **Altar** presentation hides the sidebar and inspector.
  - ⌃⌘F enters system full screen.
  - **Night** applies after astronomical dusk on the Altar and in the Rite.
  - Light and dark follow the system.

**Toolbar by space**

| Space | Title | Centre | Trailing | Prominent action (at most one) |
|---|---|---|---|---|
| Today | Today · *Friday 30 October* | — | Search, Inspector, More | **Capture** |
| Sky | Sky | Now \| Ahead \| Atlas \| Moments · time control `‹ Fri 30 Oct · 12:14 › Now` · Astrolabe \| Horizon \| Wheel | Search, Inspector, More | — |
| Calendar | November 2026 | `‹ Today ›` · Day \| Week \| Month \| Year · Layers | Search, Inspector, More | **Find a Time**, which becomes **Done** in that mode |
| Charts | *Chart or question name* | Wheel \| Square | Inspector, More | **New Question** |
| Works | *Object name* | — | Inspector, More | Follows the earliest stage he can act on now: **Find a Time** (Intent), **Open Sigil Canvas** (Design), **Begin Rite** (while the window is open), **Judge** (when due) |
| Court | Court | — | Search, Inspector, More | **Log ▾** (Offering · Contact · Petition · Response) |
| Record | Record | Journal \| Pages \| Results · entry-type filter | Search, Inspector, More | **New Entry** |
| Library | *Collection or book* | Grid \| List (shelves); Aa (reader) | Search in Collection, Inspector, More | **Cite in [Work]**, only when the book was opened from a work |

### 4.4 Wireframes (1512 pt wide; one character ≈ 13 pt)

Legend:
- `◆` committed window · `◇` candidate · `◌` void · `┄` closed season (dashed outline) · `▮` quality · `⊣` broken testimony.
- `[ ]` is a button, `▸`/`▾` a disclosure, `(i)` the inspector toggle.
- Planet and sign glyphs are Unicode stand-ins for Astrum Symbols. Figures are schematic; values come from the fixture.

**W1 · Today**: Fri 30 Oct, 12:14. The inspector is closed. Five regions.

```
+------------------------------------------------------------------------------------------------------+
| o o o  [▤]  Today                                                  [ Search       ]  (i)  (+ Capture) |
|             Friday 30 October                                                                        |
+--------------+---------------------------------------------------------------------------------------+
| Today        | (1) Day of Venus                                           Sunrise 07:25 · Sunset 17:54|
| Sky          |     A Venus day under a waning Moon in her own sign. She squares Saturn at 12:40,      |
| Calendar   ▸ |     then goes void tomorrow at 19:32.                         Lord of the Year ♃ · ex. |
| Charts     ▸ |                                                                                       |
| Works    ▸ 2 | (2)+-- Hour -----------------+ (3)+-- Moon ---------------+ (4) Up Next                 |
| Court      ▸ |   |   .- 24-hour ring -.      |   |      .-------.          | 12:39 ☉ Athanor · shake the |
| Record       |   |  /         ♂        \     |   |    /    :::::  \        |   chamomile tincture · day 9|
| Library    ▾ |   | |   hour progress    |    |   |   |    :::::::  |       |              [Mark Done]    |
|  Reading Now |   |  \                  /     |   |    \    :::::  /        | 12:40 ☽□♄ Moon squares      |
|  Rune Soup   |   |   '----------------'      |   |      '-------'          |   Saturn · hold new starts  |
|  Alchemy & H.|   | Hour of Mars              |   | Moon 8°34′ Cancer ·     | Sat 17:53 ✦ Samhain ·       |
|  Canon       |   | 25 min left               |   | waning 74% · mansion 8  |   offering to the Beloved   |
|  Materia     |   | 6th hour of the day ·     |   | □ ♄ 12:40 · △ ☿ Sat     |   Dead, at sunset   [Plan]  |
|  Study       |   | ends 12:39 · then the Sun |   | 03:22 · then □ ♀, void  | Sat 19:32 ◌ Void until Sun  |
|  Highlights &|   | Vowel Η → Ο · ay → oh     |   | Sat 19:32 – Sun 00:11   |   00:11 · then Leo          |
|   Notes      |   +---------------------------+   +-------------------------+ Sun 02:00 Clocks go back an |
|              |                                                               |   hour; the hours do not move|
|              |                                                               | Mon 05:06 ✶ Full alignment ·|
|              |                                                               |   Scorpio II · 19 s  [Plan] |
|              |                                                               | Mon 16 Nov 04:24 ◆ Venus for|
|              |                                                               |   concord · Excellent     › |
|              |                                                               | Study · 3 cards due ·       |
|              |                                                               |   Lesson 4 · 14 min left  › |
|              |                                                               | Awaiting Judgment           |
|              |                                                               | ♃ Jupiter working · cast Fri|
|              |                                                               |   23 Oct · 7 days (example) |
|              |                                                               | [Hit] [Partial] [Miss] [Later]|
|              |                                                               | ? The letter · asked Tue    |
|              |                                                               |   27 Oct (example)        › |
|              | (5) ♀  ☿  ☽  ♄  ♃ [♂] ☉  ♀  ☿  ☽  ♄  ♃ ‖ ♂   ☉   ♀   ☿   ☽   ♄   ♃   ♂   ☉   ♀   ☿   ☽ |
|              |     07:25 ·· day hours 52.4 min ·· 17:54 ····· night hours 67.7 min ····· 07:26     |
+--------------+---------------------------------------------------------------------------------------+
```

Notes:
- **The ribbon.** Each cell is as wide as its real hour. Faint equal clock-hour ticks run underneath, so the 1 Nov clock change shifts the ticks and not the hours.
  - The day's items are pinned in their cells: the bell ▾, the step ▴, the offering ✦, and the void as a dotted outline.
  - The highlighted cell is the only secondary mark of the current hour. The page title never repeats it, and Up Next never lists it.
- **The sentence** comes from `composeBriefing`. It is deterministic, never AI, and can be turned off.
- **Up Next rows** end in a verb, and advisories have no button. Swiping a row left, or its context menu, offers **Snooze to the Next Hour of [Planet]** or **Skip**.
- **Before Sleep** appears at his wind-down time (default 21:00): "What did you do today? ⌘N".

**W2 · Sky ▸ Now**: Fri 30 Oct, 12:14. Mars is selected by clicking its bead. The inspector shows Mars at its moment, which is now; global time does not move.

```
+------------------------------------------------------------------------------------------------------+
| o o o [▤] Sky [Now|Ahead|Atlas|Moments] ( ‹ Fri 30 Oct · 12:14 › Now ) [Astrolabe|Horizon|Wheel] (i)|
+--------------+-------------------------------------------------------------+-------------------------+
| Today        |                     MC                         Hour         |Sky Record Sources Oracle|
| Sky          |         .------------+------------.            ♂  25 min    | ♂ Mars                  |
| Calendar   ▸ |     .-'   ·   ☿ ☉    |    ♀   ·    '-.         6th hour of  | 17°38′ Leo · peregrine  |
| Charts     ▸ |   /    ·  rete: ecliptic · Behenians \         the day ·    |  (bound of ♄, face of ♃;|
| Works    ▸ 2 |  |   plate 40°43′ N · almucantars     |        then ☉ 12:39 |  none of the five)      |
| Court      ▸ | ASC ---------- horizon ----------- DSC         Η → Ο        | direct · out of sect ·  |
| Record       |  |  ♄    unequal-hour lines below    ☽ |       ------------- |  free of the beams      |
| Library    ▸ |   \     the horizon · ☉ nadir ◦      /        Moon ◑        | Dignity   ○──────── 0   |
|              |     '-.                          .-'          8°34′ ♋ ·    | Vowel Ο · oh            |
|              |         '------------+------------'           mansion 8     | ----------------------- |
|              |                      IC          600 pt       □ ♄ 12:40     | Your record (example)   |
|              |   Lens: [Sky ▾] Sky · My Chart · Both        ------------- |  Hours of Mars 2 of 5   |
|              |                                              Face ♏ I · ♂   |  · −1 (n = 5)           |
|              |                                              Planets        | Mars in Leo: not yet    |
|              |                                               ℞ ☿ ♀ ♄       |  known (n = 1)          |
|              |                                              Stars ☿ on     | ----------------------- |
|              |                                               Zubeneschamali| Ephemeris: Swiss        |
|              |                                              Testimonies    |  Ephemeris · sunrise    |
|              |                                               ♀ concord now:|  −0.833° (Doctrine)     |
|              |                                               Disqualified ·| [Show Sky at This Moment]|
|              |                                               ♀ ℞ · ◆ 16 Nov| Ask About Mars    ⌥⌘4   |
|              |  ♀ ☿ ☽ ♄ ♃ [♂] ☉ ♀ ☿ ☽ ♄ ♃ ‖ ♂ ☉ ♀ ☿ ☽ ♄ ♃ ♂ ☉ ♀ ☿ ☽                   |                         |
|              |  ☽ □♄ 12:40 → △☿ Sat 03:22 → □♀ Sat 19:32 → ◌ 4 h 39 min → ♌ Sun 00:11 |                         |
+--------------+-------------------------------------------------------------+-------------------------+
```

Notes:
- **The default face is fixed in v1:** Hour, Moon, Face, Planets, Stars in Orb, plus one optional complication. Here that complication is **Testimonies for a pinned intent**, which answers "how good is now for this intent?".
- **Selection** in the figure is shape-based: a 1.5 pt label-ink ring and heavier glyph weight, never the accent hue.
- **Moving time:** drag the rete, scroll horizontally over the astrolabe or the ribbon, type into the capsule, or press ⌘← / ⌘→ (one hour at this scale). Away from now, the capsule shows `+20 d 2 h` and a *Not now* token, and ⌘T returns.
- **The astrolabe is drawn as a true astrolabe.** Its unequal-hour lines lie *below* the horizon. By day they are read with the Sun's **nadir marker** ◦; by night, with the Sun itself. The horizon almucantar is the Doctrine sunrise altitude (−0.833°).
- **The last line is the Moon's Itinerary**: her applying aspects until she leaves Cancer, ending in the void and the ingress.

**W3 · Calendar ▸ Month**: Fri 30 Oct, 12:14. The Layers popover has Election Quality set to Venus. The inspector shows the committed window.

```
+------------------------------------------------------------------------------------------------------+
| o o o [▤] November 2026  ( ‹ Today › ) [Day|Week|Month|Year] [Layers ▾]   [Search] (i) (Find a Time) |
+--------------+---------------------------------------------------------+----------------------------+
| Today        | ☉ 9° ♏ ··················· 29° ♏ | ♐ 0° ············ 8° ♐ | Mon 16 Nov · Night of Sunday|
| Sky          | LQ 1 · ✶ 2 · ● 9 · ☿D 13 · ♀D 14 · FQ 17 · ☉→♐ 22 · ○ 24 | Venus for concord      ◆   |
| Calendar   ▾ | Sun      Mon      Tue      Wed      Thu      Fri      Sat  | 04:24–05:34 · 1 h 10 min   |
|  Al-Thurayya | 1 ☉      2 ☽      3 ♂      4 ☿      5 ♃      6 ♀      7 ♄  | Hour of Venus · 11th hour  |
| Charts     ▸ | ◌→00:11  ✶ 05:06  →03:21   ◌ 02:14 ·31 h· →09:40   ✦ 04:51 |  of the night              |
| Works    ▸ 2 | LQ 15:18 ◌ 20:41→                                         | Testimonies     Excellent  |
| Court      ▸ | DST ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ Venus closed: retrograde ┄┄┄┄┄┄┄┄┄┄┄┄┄ |  Significator ▬▬▬▬▬▬ 92%   |
| Record       | 8 ☉      9 ☽      10 ♂     11 ☿     12 ♃     13 ♀     14 ♄ |  Moon         ▬▬▬▬▭▭ 72%   |
| Library    ▸ |          ● 02:21                            ☿D        ♀D   |  Moment       ▬▬▬▬▬▭ 76%   |
|              | ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄   ▮  |  82 (secondary)            |
|              | 15 ☉     16 ☽     17 ♂     18 ☿     19 ♃     20 ♀     21 ♄ | Venus rising in her house, |
|              | ▮▮▮      ◆ 04:24  FQ 06:40 ▮▮▮      ▮▮▮      ☽☌♄ 14:55 ▮▮▮ |  on Spica; the Moon waxing |
|              |          ▮▮▮▮     ▮▮▮               ⚠        ⊣ ▮▮     ▮▮▮ |  in Aquarius, her next     |
|              | 22 ☉     23 ☽     24 ♂     25 ☿     26 ♃     27 ♀     28 ♄ |  aspect a trine to Venus   |
|              | ☉→♐ 02:35         ○ 10:01                            ◌    |  (Tue 03:41)               |
|              | ▮▮▮      ▮▮       ▮▮       ▮▮▮      ▮▮       ▮▮       ▮▮   | Cautions: none             |
|              | 29 ☉     30 ☽                                             | Your record: Venus         |
|              | ▮▮▮      ▮▮                                               |  talismans 3 of 4 · +2     |
|              |                                                           |  (n = 4) (example)         |
|              | ┄ closed season (dashed) · ▮ quality · ◆ committed ·      | Reminders Sun 21:00 ·      |
|              |   ⊣ broken testimony · ⚠ named caution                   |  Mon 03:24 · alarm in      |
|              |                                                           |  Calendar ✓                |
|              |                                                           | Alternatives       ⇧⌘F     |
+--------------+---------------------------------------------------------+----------------------------+
```

Notes:
- **Closed season.** Venus's closed days wear a **dashed outline**, and the popover gives the reason: "retrograde until Sat 14 Nov 12:13".
- **The long void** of 4–5 Nov (31 h 26 min) spans two cells.
- **Fri 20 Nov** shows the Moon running onto Saturn's body (perfect 14:55). Under the default Lilly school the body-contact rule breaks the Moon testimony for that day's hour of Venus (§7), shown as `⊣`.
- **Daylight saving** ends Sun 1 Nov: the clock shifts, the unequal hours do not.

**W3b · Calendar ▸ Find a Time**: Fri 30 Oct, 12:04, before he commits. The mode replaces the month grid in the content column. Selecting a result fills the inspector with that moment's Sky and highlights its day in a mini-month.

```
+------------------------------------------------------------------------------------------------------+
| o o o [▤] Find a Time   Template [Talisman ▾] Planet [♀ Venus ▾] Intent [concord]       (i)  (Done) |
|                         Range [Venus's next season ▾]  Rank by My Record [ ]   Doctrine: Lilly · moieties|
+--------------+---------------------------------------------------------+----------------------------+
| Today        | Planetary Seasons  ♀ ┄┄┄┄┄┄┄ retrograde to Sat 14 Nov 12:13 | Sky · Mon 16 Nov 04:24      |
| Sky          |                     ▬▬▬▬▬▬▬▬▬ in her house to Thu 3 Dec 20:15| Night of Sunday            |
| Calendar   ▾ | ------------------------------------------------------- | Hour of Venus · 11th hour  |
|  Al-Thurayya | Now · Fri 30 Oct 12:04 · Disqualified                    |  of the night · ends 05:34 |
| Charts     ▸ |   Venus retrograde and under the beams (critical)        | Asc 25°48′ Libra           |
| Works    ▸ 2 | ------------------------------------------------------- | ♀ 23°31′ Libra · in her    |
| Court      ▸ | > ◇ Mon 16 Nov 04:24–05:34 · Excellent · 82              |  house · direct · 1st      |
| Record       |     no cautions · Venus rising, on Spica · ☽ next △ ♀    |  (2°09′ above the Asc,     |
| Library    ▸ |   ◇ Sun 15 Nov 20:10–21:19 · Excellent · 84              |  within five degrees)      |
|              |     ⚠ the Moon meets Saturn first (sextile, 20:26)       | ☽ 11°56′ Aquarius · waxing |
|              |   ◇ Thu 19 Nov 02:04–03:15 · Excellent · 83              |  40% · mansion 25          |
|              |     ⚠ the Moon averse to Venus                           | ♄ ℞ in his fall · 6th      |
|              |   ◇ Sat 21 Nov 03:17–04:27 · Excellent · 87              |  (cadent)                  |
|              |     ⚠ the Moon applies to Venus by opposition            | Stars ♀ on Spica           |
|              |   ◇ Thu 19 Nov 14:57–15:45 · Excellent · 80   3 cautions ▸| Testimonies 92 · 72 · 76%  |
|              |   + 14 more · Not offered (31) ▸                         | Ephemeris: Swiss Ephemeris |
|              | ------------------------------------------------------- | [Show Sky at This Moment]  |
|              |  N  M  T  W  T  F  S    ◇ marks the selected result      |                            |
|              |  15 [16] 17 18 19 20 21                                  |                            |
|              | [Keep as Vigil]                       [Commit…  ⌘↩]      |                            |
+--------------+---------------------------------------------------------+----------------------------+
```

Notes:
- **Ordering:** by grade, then by the number of named cautions, then by time. The score is secondary ink, so Sat 21 Nov's 87 does not outrank a window with no cautions.
- **The Now row** is always first, which is today's "Or: work this present moment". When now qualifies, it carries **Work Now**.
- **Not offered** lists the windows the template rejects, each with its reason. For example: "Sun 22 Nov 07:41 · Venus in the 11th, not angular".
- **The result set persists** as a Vigil draft until he discards it. **Show Sky at This Moment** opens a second window and keeps this list.
- **Commit…** opens the one SwiftUI sheet in this flow.

**W4 · Charts ▸ Questions**: the question was cast Fri 30 Oct at 14:32:07 and is shown here at 14:41, after he saved his judgment.
- **Engine output:** Regiomontanus houses and Lilly's moieties (the proposed Doctrine default). The full considerations from *Christian Astrology* are the Phase 0a engine (§14).
- **The inspector** opened on **Sky**, its default pane in Questions. **Judge** stayed locked to engine facts until he saved.

```
+------------------------------------------------------------------------------------------------------+
| o o o [▤] The lease   Fri 30 Oct 14:32:07 · New York     [Wheel|Square]        (i) (New Question)   |
+--------------+-------------------------------------------------------------+-------------------------+
| Charts     ▾ | Will the lease be renewed?                     Horary · 4th | Sky Record Sources Oracle|
|  My Chart    | Moment: when the question was understood (Lilly) · Edit ›   | Fri 30 Oct 14:32:07      |
|  People      | ----------------------------------------------------------- | Hour of Mercury · 9th   |
|  Questions   | Before judgment                Radical · 1 caution          |  hour of the day        |
|  Saved       | ✓ Ascendant 16°28′ Aquarius: neither early nor late          | Asc 16°28′ ♒ · MC 5°03′ ♐|
| Works    ▸ 2 | ✓ Moon not in late degrees                                   | ☽ 9°58′ ♋ · mansion 8    |
| Court      ▸ | ✓ Moon not void: △ ☿ perfects Sat 03:22 (12 h 50 min)        | ♂ 17°41′ ♌ · 7th         |
| Record       | ✓ Moon clear of the Burnt Path                               | ☉ 7°21′ ♏ · peregrine ·  |
| Library    ▸ | ✓ Saturn in neither the 1st nor the 7th (he is in the 2nd)   |  9th                     |
|              | ✓ The Ascendant's lord not combust                           | Ephemeris: Swiss         |
|              | ✓ The hour agrees: Mercury and Saturn rule the air           |  Ephemeris               |
|              |   triplicity                              [Canon · Lilly]   | ----------------------- |
|              | ⚠ The 7th is afflicted: Mars 1°13′ inside the Descendant;   | Oracle · Judge           |
|              |   its lord the Sun peregrine, applying to Mars's square.    |  Facts first. Reading    |
|              |   Lilly warns the astrologer's judgment may not satisfy.    |  appears below your      |
|              |                                           [Canon · Lilly]   |  saved judgment.         |
|              | ----------------------------------------------------------- |  Engine: Claude          |
|              |   .--- wheel ---.   Querent   ♄ lord of ♒ · 8°50′ ♈ ℞ ·      |                         |
|              |  /  significators \           in his fall · 2nd             |                         |
|              | |   lit; the rest  |  With    ☽ 9°58′ ♋ · her house · 5th    |                         |
|              |  \     dimmed     /  Quesited ☿ lord of the 4th (5°03′ ♊) ·   |                         |
|              |   '--------------'            18°12′ ♏ ℞ · own bound · under|                         |
|              |                               the beams, combust in ~1 day  |                         |
|              | Perfection  ♄ ··· ☿ : no aspect (140°)                       |                         |
|              |             ☽ ──sep □♄ 1°08′──▶ △ ☿ Sat 03:22 : translation  |                         |
|              |             of light (8°14′; moieties 9°30′; outside a fixed 6°)|                         |
|              | Your judgment  Conditional — through a third party           |                         |
|              |                Timing: weeks                     saved ✓ ⌘S   |                         |
+--------------+-------------------------------------------------------------+-------------------------+
```

Notes:
- **Edge styles** are distinct and reuse the Moon's Itinerary grammar: prohibition (a bar), translation (an arc through a third planet, as here), collection (a converging fork) and frustration (a struck line).
- **A chart that is not radical** gets a caution naming its reason. The document never offers to cast a geomantic shield instead.

**W5 · Works ▸ Talismans ▸ Venus for concord**: Fri 30 Oct, 12:14, nine minutes after Commit.

```
+------------------------------------------------------------------------------------------------------+
| o o o [▤] Venus for concord   Talisman                           (i) (...)  (Open Sigil Canvas)     |
+--------------+---------------------------------------------------------+----------------------------+
| Works      ▾ | Intent ─── Elect ─── Design ─── Consecrate ─── Deploy ─── Judge | Sky at window start      |
|  Awaiting  2 |  ● 30 Oct  ● 30 Oct  ◐ now      ○ 16 Nov       ○          ○ 7 Dec  | Mon 16 Nov 04:24      |
|  Workings    | -------------------------------------------------------- | Hour of Venus · 11th hour  |
|  Talismans   | Window  Mon 16 Nov · 04:24–05:34 · in 17 days  [Change…] |  of the night · Night of   |
|  Sigils      |         Excellent · Significator 92% · Moon 72% ·        |  Sunday                    |
|  Athanor     |         Moment 76% · reminders Sun 21:00, Mon 03:24      | Vowel Η · ay               |
| Court      ▸ | -------------------------------------------------------- | ☽ 11°56′ Aquarius · waxing |
| Record       | Design                        | Materia                  |  40% · mansion 25          |
| Library    ▸ | +------------------------+    | ☐ Copper plate   [Canon] | ♀ 23°31′ Libra · in her    |
|              | | kamea of Venus, 7 × 7  |    | ☐ Rose, myrtle   [Canon] |  house · on Spica · rising |
|              | | seal of Hagiel         |    | ☐ Vervain  [Library · on |  -----------------------   |
|              | +------------------------+    |   this Mac · 12 ›]       | Your record (example)      |
|              | Photos  [+ drag, paste, iPhone] |                        |  Venus talismans 3 of 4 ·  |
|              | -------------------------------------------------------- |  +2 (n = 4)                |
|              | Plan · 9 steps                        [Draft with the Oracle]|                        |
|              | 1  Purify and dress the space                             |                            |
|              | 2  Kindle rose and myrtle                                 |                            |
|              | 3  Orphic Hymn to Aphrodite              [Canon · Taylor] |                            |
|              | 4  Intone the vowel Η                                     |                            |
|              | 5  Call the intelligence by the seal   Working with: Hagiel|                           |
|              | Record · 1 entry (the intention) · omens near: none yet   |                            |
+--------------+---------------------------------------------------------+----------------------------+
```

The prominent action follows the earliest stage he can act on now. The window is committed, so Design is current and the action is **Open Sigil Canvas**.

**W6 · Court**: Fri 30 Oct, 12:14.

```
+------------------------------------------------------------------------------------------------------+
| o o o [▤] Court                                                     [Search] (i) (...)  (Log ▾)     |
+--------------+------------------------------+-------------------------------------------------------+
| Court      ▾ | Coming                        | Grandmother                                  Ancestor |
|  Ancestors   |  ✦ Samhain · offering to the  | ------------------------------------------------------ |
|  Planetary   |    Beloved Dead · Sat 17:53,  | Next  Samhain · Sat 31 Oct 17:53, at sunset · clear of |
|   Intellig.  |    at sunset                  |       the void that begins at 19:32  [Find a Time] [Remind]|
|  Saints &    | Ancestors                     | Also  Sat 7 Nov 04:51 · the Sun at 15° Scorpio, the    |
|   Holy Dead  |  The Beloved Dead             |       astronomical cross-quarter                       |
|  Genii Loci  |  Grandmother · 12 days        | ------------------------------------------------------ |
|  Daimones &  | Planetary Intelligences       | Log                                                    |
|   Familiars  |  Hagiel · intelligence of ♀   |  Offering  Sun 18 Oct · water, bread, a candle          |
|  Other       | Genii Loci                    |    Response  a dream of her kitchen that night          |
| Record       |  [the river] · 9 days         |  Contact   Thu 22 Oct · at the grave · notes ›           |
| Library    ▸ | Daimones & Familiars          |  Petition  Sun 4 Oct · help with the move ·             |
|              |  [daimon] · 3 days            |    judge when you choose            [Judge…]            |
|              |                               | Lessons and pages that mention the dead ›              |
|              | [Seed a Sphere's Court…]      | More ▾  Release from the Court…                        |
+--------------+------------------------------+-------------------------------------------------------+
```

Offerings and contacts record a **response**, as free text plus optional tags (warmth, dream, sign, silence), and are never scored. A **petition** can be judged on its own, with its own check-in if he wants one. It is reported per petition and never as a spirit's hit rate.

**W7 · Record ▸ Journal**: Fri 30 Oct, 12:30, grouped by lunation (View ▸ Group by Lunation).

```
+------------------------------------------------------------------------------------------------------+
| o o o [▤] Record [Journal|Pages|Results] [All · Dream · Omen · Sign · Offering · Lab note · Working]   |
|                                                                     [Search] (i)  (New Entry)       |
+--------------+-------------------------------------------------------------+-------------------------+
| ...          | This lunation · from the New Moon of 10 Oct                  |Sky Record Sources Oracle|
| Record       | Fri 30 Oct 12:21  ◉ Omen                                     | Fri 30 Oct 12:21        |
| Library    ▸ |   Hawk on the fence, facing east              [photo ▢]     | Hour of Mars · 6th hour |
|              |   12:21 · ♂ · ☽ 8°39′ ♋ · mansion 8 · waning                 |  of the day             |
|              | Thu 29 Oct 06:40  ◐ Dream  (written 07:55)                   | Moon 8°39′ Cancer ·     |
|              |   Night of Wednesday · Hour of Saturn · …                    |  waning 74% · mansion 8 |
|              | Fri 23 Oct 11:00  ♃ Working · Jupiter · awaiting judgment     | ----------------------- |
|              | Sun 18 Oct 18:10  ✦ Offering · Grandmother · response noted   | Omens near              |
|              | Previous lunation ▸                                          |  ♀ Venus for concord ·  |
|              |                                                              |  committed today [Link] |
+--------------+-------------------------------------------------------------+-------------------------+
```

**W8 · Library ▸ Alchemy & Herbalism** (List view).

```
+------------------------------------------------------------------------------------------------------+
| o o o [▤] Alchemy & Herbalism    [Grid|List]  [Shelf: All ▾]          [Search in Collection] (i)    |
+--------------+--------------------------------------------------------------------------+-----------+
| Library    ▾ | [n] items · [n] shelves · indexed 61% · OCR paused (on battery)  Details › |Notes Sources|
|  Reading Now | Title                    Author Year  Kind   Length  Progress Text state  | [An herbal]|
|  Rune Soup   | [An herbal] (scan)       […]    1652  PDF    412 pp  p. 214   Scanned,    | p. 214/412|
|  Alchemy &   |                                                      OCR'd · low ⓘ   | Highlights 3|
|   Herbalism  | [A spagyrics manual]     […]    1979  PDF    188 pp  —        Searchable  | Cited in 1 |
|  Canon       | [A grimoire]             […]    —     DjVu   —       —        Open With…  |  work ›   |
|  Materia     | [A materia medica]       […]    1931  EPUB   —       12%      Searchable  | Show in   |
|  Study       | [A treatise]  ▸ Editions (3)                                   Needs OCR   |  Finder   |
|  Highlights &| [A book]                 […]    —     MOBI   —       —        Open With…  |           |
|   Notes      | [Page images, 96]        —      —     Folder 96 pp  —         Needs OCR   |           |
+--------------+--------------------------------------------------------------------------+-----------+
```

**W9 · The Altar**: system full screen at 1512 × 945, on its own Space. Fri 30 Oct, 07:31, with the Wash background.

```
+------------------------------------------------------------------------------------------------------+
|  Day of Venus · Friday 30 October · New York                          Sunrise 07:25 · Sunset 17:54    |
|                                                                                                      |
|      .--- 24-hour ring ---.             .--- mansions ---.          Within 48 Hours                    |
|     /                      \           /      :::::::     \         12:40 ☽□♄ Moon squares Saturn      |
|    |          ♀             |         |      :::::::::     |        Sat 17:53 ✦ Samhain · offering to  |
|    |   Hour of Venus        |         |       :::::::      |          the Beloved Dead, at sunset      |
|    |   Display L · 64 pt    |          \                  /         Sat 19:32 ◌ Void until Sun 00:11 · |
|     \  46 min · Display M  /             '--------------'             then Leo                         |
|       '------------------'           Moon 5°43′ Cancer · waning 76%   Sun 02:00 Clocks go back an hour;  |
|   1st hour of the day · ends 08:17     · mansion 8                     the hours do not move            |
|   · then Mercury                     Not void · next □ ♄ 12:40                                        |
|   Vowel Η · ay                                                                                        |
|                                                                                                      |
|   “Heavenly, illustrious, laughter-loving queen, sea-born, night-loving…”  [Canon · Orphic Hymn, Taylor]|
|                                                                                                      |
|  [♀] ☿  ☽  ♄  ♃  ♂  ☉  ♀  ☿  ☽  ♄  ♃ ‖ ♂  ☉  ♀  ☿  ☽  ♄  ♃  ♂  ☉  ♀  ☿  ☽                        |
|                         ( Begin Rite )  ( Leave Altar )   ← native floating controls, on pointer move|
+------------------------------------------------------------------------------------------------------+
```

The hero is the ruler, not a timer. The glyph and **Hour of Venus** are set at Display L, and the remaining minutes at Display M. Seconds never appear.

**W10 · Library ▸ Rune Soup ▸ Lesson Player**: Fri 30 Oct, 20:30.

```
+------------------------------------------------------------------------------------------------------+
| o o o [▤] [Course] · Lesson 4                       [▶ Now Playing]        [Search in Lesson] (i)   |
+---------------------+------------------------------------------------------------+------------------+
| [Course]          ▾ | +--------------------------------------------------------+ | Notes Sources    |
|  1 [lesson]       ✓ | |                 AVPlayerView · 16:9                    | | Oracle           |
|  2 [lesson]       ✓ | |                                                        | | ---------------- |
|  3 [lesson]       ✓ | |   ──●────────────|──────|────────────  21:40 / 36:00  | | Lesson notes ›   |
| >4 [lesson]   14 min| +--------------------------------------------------------+ | Transcript:      |
|  5 [lesson]         | Transcript · from the lesson's .md (aligned 0.93)          | the lesson's .md |
|  Earlier Editions ▸ |   … [sentence] …                                            | (matches the     |
|                     | ▌ … [current sentence, lit] …                               |  audio)          |
|                     |   … [sentence] …                    [Return to Playback]    | Highlights 2     |
+---------------------+------------------------------------------------------------+------------------+
```

The transcript header reads either *from the lesson's .md (aligned 0.93)* or *Machine transcript · on this Mac*. A lesson whose `.md` is notes rather than a transcript shows **Lesson Notes** beside the video instead (§7).

**S1 · The Rite window**: Mon 16 Nov, 04:35. The window is 440 × 680, resizable, with Keep on Top optional.

```
+------------------------------------------+
| Venus for concord           3 of 9       |
| Working with: Hagiel ›                   |
| ♀ Hour of Venus · 59 min left in window  |
| [=================>..................]   |   ← the window's time, not the step's
|                                          |
|   Kindle rose and myrtle.                |   rubric · New York italic, secondary ink
|                                          |
|   “Heavenly, illustrious, laughter-      |   spoken · New York 22/34
|    loving queen…”      [Canon · Taylor]  |
|                                          |
|   Next: Intone the vowel Η               |
| ( ◁ )   ( ▶ breath · drum )   ( ▷ )  (Seal)|  ← native floating glass transport
+------------------------------------------+
```

**S2 · Quick Capture**: Fri 30 Oct, 12:21. A 440 × 132 native panel.

```
+----------------------------------------------------------+
|  Omen ▾   Hawk on the fence, facing east_          [▢]   |
|  12:21 · ♂ · ☽ 8°39′ ♋ · mansion 8 · waning      When? ▸ |
+----------------------------------------------------------+
```

---

## 5. The dedicated desktop, the menu-bar extra, and notifications

### 5.1 The Altar on its own Space

**Setup is two steps.**
1. Choose **Window ▸ New Altar Window**, or press ⌃⌘A in an existing window.
2. Press ⌃⌘F, or click the green button.

macOS gives the full-screen Altar its own Space, reached with a three-finger swipe or ⌃→. Astrum never asks for **Dock ▸ Assign To**, and onboarding explains why in one sentence. In full screen the Dock hides natively.

**Two windows, two roles.** The full-screen Altar window lives on the Altar Space and an ordinary main window on his work desktop.
- Deep links from widgets and notifications open in the main window on the active Space.
- Inside the Altar, clicking an item opens it **in a popover in place**. **Open in Astrum** sends it to the work-desktop window.
- Modifier keys and Space-switching gestures never take him out of the Altar.
- **Leave Altar** is a floating control and a menu item (⌃⌘A).
- Whether a click switches Spaces before Astrum can respond is verified in the shell spike (§15).

**What it shows (W9):**
- the day line;
- the ruler hero (glyph and *Hour of Venus* at Display L, minutes at Display M);
- the ordinal and vowel lines;
- the Moon Volvelle;
- **Within 48 Hours**, strictly 48 hours: committed windows with their Testimonies, Vigil finds, observances, voids, alignments and the clock change;
- the hour ruler's Orphic hymn with its Canon chip;
- the full Hour Ribbon.

The face is always current when he swipes in, and nothing loads.

**Behaviour**
- **Idle:** after 2 min the pointer hides and the controls recede. Moving the pointer reveals **Begin Rite** and **Leave Altar**.
- **Idle return is on by default.** If the Altar window has left its presentation, it returns after 2 min idle while its Space is active, with a 0.6 s crossfade.
- **At rest:** the minute changes; at the hour, the new ruler draws on, the ribbon advances, and the bell rings once if he has chosen it.
- **Brightness** follows the real sky in the content only. At astronomical dusk Astrum offers **Night** (§9.5).
- **Keep-awake** is a native power assertion. It is held only while the Altar is frontmost, on power, within hours he sets (or "until sunrise").
- **A Rite** begun here takes over the face.

**Background (View ▸ Altar Background)**
- **Wash** (default): low chroma, with its luminance clamped so that every text token meets 4.5:1 (§9.2).
- **Sky**: the full computed sky. Every text group sits on an opaque **platter tinted by the sky** (`--mat-platter-on-sky`), at 4.8:1 or better for secondary text in all six twilight stages. The floating controls are the product's single Clear-glass instance, with a 35% dim in daylight.
- **Black.**

**Windowed variant (optional).** **Window ▸ Arrange as Desktop Face** sets the window to 1112 × 945 at the left edge, leaving a 400 pt column for *complementary* widgets, never duplicates of the face.

### 5.2 The menu-bar extra (offered once at setup; off unless he agrees)

**Title**
- **Glyph:** a native `NSStatusItem` showing a **16 pt template image** of the hour ruler, rendered from Astrum Symbols in an 18 pt box. That matches the size of system items inside the 22 pt bar.
- **No Unicode in the title:** every glyph is a template image, never a character.
- **Countdown:** off by default. When it is on, the item reserves a **fixed width** for tabular minutes (`25 min`), so the bar never reflows; when it is off, the width is natural. The title is never coloured and never scrolls.

**States, in priority order**
1. **Rite running:** the Rite template image and `3/9`.
2. **A committed window within 60 min:** the current ruler's glyph with a small dot badge, plus `10 min` if the countdown is on.
3. **A committed alignment in its last 2 min:** the alignment image and `01:42`. This is the only place the T−2 min and T−10 s stages appear.
4. **Otherwise:** the hour ruler.
5. **The void is a modifier, never a replacement.** While the Moon is void, a small hollow-Moon badge sits at the glyph's lower right in every state. During the 31-hour void of 4–5 Nov the bar still shows the hour.

**Click.** A native menu, not a popover. It is shown here at 12:14:

```
+-------------------------------------------------------+
| [mini Hour Dial] [Moon disc] [next six hour cells]     |  ← SwiftUI header, 300 × 120 pt
| Hour of Mars · ends 12:39 · then the Sun               |
| Moon 8°34′ Cancer · waning 74% · mansion 8             |
| Void Sat 19:32 – Sun 00:11 · then Leo                  |
| Venus for concord · Mon 16 Nov 04:24–05:34 · Excellent |
| Shake the chamomile tincture · hour of the Sun, 12:39  |
| ------------------------------------------------------ |
| Capture…                                   ⌃⌥⌘O        |
| Ask a Question…                                        |
| Begin Rite…                                            |
| ✓ Ring the Hour Bell                                   |
| ------------------------------------------------------ |
| Enter Altar · Open Astrum · Settings… · Quit Astrum    |
+-------------------------------------------------------+
```

- **During a Rite** the menu becomes Next Step · Previous Step · Pause Pacer · Seal….
- **Mirrors:** every item also exists in the Dock menu and inside the app, because macOS hides extras when the menu bar is full.
- **Persistence:** Astrum runs as a login item. Closing the window keeps the extra, the scheduler and the Vigils running.
- **While Record is locked with Touch ID,** the window and record rows read *Locked*.

**The Dock tile** is off by default. When it is on, it shows only a badge counting castings awaiting judgment over the standard Icon Composer icon. That icon follows Tahoe's Dark, Clear and Tinted icon styles, so there is no custom tile.

**Control Center controls** (each can be dragged into the menu bar):
- **Capture**: a button with the eye symbol.
- **Hour Bell**: a toggle (bell / bell.slash). Its value shows the next bell (`♀ 13:32`).
- **Begin Rite**: a button.
- **Ask**: a button that opens Window ▸ Oracle on the present moment.

### 5.3 Notifications

**Voice**
- Short title-case titles, with no app name and no closing punctuation.
- One sentence-case body made of facts rows.
- Actions do the work; none merely opens the app.
- No repeats, no "you missed", no streaks.
- Bodies are composed when they are scheduled, so they carry real content even when the app is closed.
- While the Mac is locked, or while Record is locked, previews are generic: "A window opens in 1 hour".

**Delivery**
- **The in-process scheduler** runs inside the login item. While it runs it posts the Hours, rings the bells, and replans every 15 min, on wake and on record change.
- **Pending notifications are a 12-hour backstop** for when the app is not running. This keeps them well below the system's pending limit even with all seven planets' Hours on.
- **When Astrum is frontmost** the banner is suppressed and the page updates in place. **The bell still rings in-app.**
- **No Time Sensitive in v1.** Committed windows use Active notifications plus the menu-bar state. For windows outside his waking hours, Commit offers **Add an Alarm in Calendar…**: an EventKit event with an alert and a neutral title ("Astrum window"), so his iPhone can wake him.
- **Action path:** `UNUserNotificationCenterDelegate` receives the action response and writes an inbox row. For Judge that row is `{castingId, verdict}`; for Commit it is `{candidateId}`; for Mark Done it is `{stepId}`. The host then signals the webview, which applies the row through the store (§4.2). Log Offering opens the SwiftUI response sheet.
- **Undo:** a verdict given from a banner shows **Recorded Partial · Undo** for 10 minutes in Today and in the menu-bar menu. It asks for an optional note the next time the app opens.

| Thread | When | Level | Example (title / body) | Actions |
|---|---|---|---|---|
| **Day** | Sunrise (07:25), when the planetary day begins | Passive | *Day of Venus* / Moon 5°43′ Cancer · waning 76% · mansion 8 · □ Saturn 12:40 · Void Sat 19:32 – Sun 00:11 · then Leo · shake the chamomile tincture · hour of the Sun, 12:39 · 2 await judgment. | Mute Hours Today |
| **Hours** (opt-in per planet) | Hour boundary | Active, in-process | *Hour of Venus* / Begins 13:32 for 52 min · the Moon has left Saturn. | Begin Rite · Mute Hours Today |
| **Moon** | Void begins and ends, a watched mansion, hinges | Passive | *Full Moon in Gemini* / Tue 24 Nov 10:01 · 2 workings await judgment. | Judge Now |
| **Windows** | A committed window: the evening before (at his wind-down time), T−1 h and the opening | Active | *Venus Window in 1 Hour* / Copper plate, rose and myrtle, the seal of Hagiel. | Begin Rite at 04:24 · Reschedule… |
| **Vigils** | A Vigil finds a window | Active | *Vigil Found a Window* / Al-Thurayya · Sat 21 Nov 22:02 · Excellent. | Commit · Show Alternatives · Not This One |
| **Alignments** | A committed alignment: T−24 h and T−10 min. T−2 min and T−10 s appear in the menu bar only. | Active | *Full Alignment in 10 Minutes* / Scorpio II at 05:06, for 19 s. | Show Countdown |
| **Work** | Athanor step windows, consecrations | Active | *Shake the Tincture* / Hour of the Sun, 12:39–13:32 · day 9 in the vessel. For a hazardous step the body opens with its safety line. | Mark Done · Reschedule… |
| **Court** | Feasts at their true moment | Passive (Active if he chooses) | *Samhain* / Offering to the Beloved Dead at sunset, 17:53 · clear of the void that begins at 19:32. | Log Offering · Remind After Sunset |
| **Judgment** | Check-ins (cadence per kind) | Passive | *Judge the Jupiter Working* / Cast Fri 23 Oct in the hour of Jupiter, the Moon waxing in Pisces. | Hit · Partial · Miss · Later |
| **Questions** | Check-ins | Passive | *Was the Lease Answer True?* / You judged on 30 Oct: conditional, through a third party, within weeks. | Hit · Partial · Miss · Later |
| **Petitions** (optional, per petition) | The check-in he set | Passive | *Petition to Grandmother* / Help with the move · asked Sun 4 Oct. | Judge… · Later |
| *Sigils* | **Never** | — | Deployed sigils never notify. | — |

**Threads and relevance:**
- `threadIdentifier` is set per object, so a talisman's notifications stack together.
- `relevanceScore` by thread: Windows 1.0, Alignments 0.9, Vigils 0.8, Court 0.6, Work 0.5, Judgment, Questions and Petitions 0.4, Moon 0.3, Hours 0.2, Day 0.1.

### 5.4 Window behaviours per window

| Window | Spaces collection behaviour | Why |
|---|---|---|
| Main windows and the Altar window | Default (managed) | Each stays on its Space; full screen gives the Altar its own. |
| Quick Capture panel | `canJoinAllSpaces` + `fullScreenAuxiliary`; non-activating | Appears over any app and any full-screen Space without activating Astrum. |
| Rite window | `moveToActiveSpace` + `fullScreenAuxiliary` | Opens on whichever desktop he is on when the window opens. |
| Settings, Oracle, Reader, Sky at This Moment | Default | — |

---

## 6. The widget suite (v1: seven kinds, four controls)

**Rules for every widget**
- **One instrument, one purpose:** each widget is a size of an instrument that already exists in the window.
- **Rendering modes:** each must read in full colour, in vibrant monochrome (the desktop while another app is active), and in the accented Clear and Tinted looks. Glyphs, fill versus hollow, and the four textures (§9.4) carry all the meaning. Every texture is checked in each mode.
- **Background:** `containerBackground` is the Today wash for the entry's moment, so the system can replace it with glass. Widgets never draw glass of their own.
- **Layout:** text at 11 pt or larger, 16 pt margins (11 pt when tight), `ContainerRelativeShape` corners.
- **Stillness:**
  - Countdowns use `SystemFormatStyle.Timer` with `maxPrecision: .seconds(60)` (macOS 15 and later), so they update by the minute and never show seconds.
  - Progress uses `ProgressView(timerInterval:)`.
  - Timeline entries fall only at hinges: hour boundaries, void start and end, ingresses, window open and close, step due. That is about 30–60 a day.
  - The golden test reads the system's minute string back from a widget snapshot. If it ever differs from the facts template, per-minute entries carry our own string.
- **Taps:** each tap deep-links with `widgetURL` (`astrum://…`). A widget has at most one control, except Awaiting Judgment.
- **Privacy:** while Record is locked, record rows are `privacySensitive` and redacted. Deployed sigils never appear.

**The data path, with no profile-backed entitlement**
1. The main app is **not sandboxed**. Only the widget extension is sandboxed, which WidgetKit requires.
2. The app writes `skyTimeline` (7 days) and the record projections into a **Team-ID-prefixed app group container**, `TEAMID.com.astrum.shared`. On macOS 15 and later this avoids the container prompt without a registered `group.` identifier or a provisioning profile (DTS, forum thread 763826).
3. Widget and Control intents append to the **inbox** in the same container (§4.2).
4. **If the shared container fails** on the free team, the extension runs **the same JS engine bundle** (the Meeus path, without WASM) in **JavaScriptCore**. Hours, the Moon and the void then compute from one engine, never a Swift port. Record rows show "Open Astrum to update".

**The $99 decision.** v1 needs none of the following. Paying for the Apple Developer Program would unlock exactly:
1. provisioning profiles that last a year, so any profile-backed capability stops needing a weekly re-sign;
2. the **Time Sensitive** notification entitlement, so committed windows can break through Focus;
3. iCloud container entitlements, for native sync to the iPad (today's sync folder works without them);
4. Developer ID signing and notarization, so Astrum opens on his other Macs without Gatekeeper overrides, plus TestFlight builds for the iPad;
5. registered `group.` app groups shared with an iOS build.

| # | Family · Kind | Exact contents | Notes |
|---|---|---|---|
| 1 | **Small · Hour** | A ring that fills through the current unequal hour. **Inside the ring:** the ruler glyph (32 pt) over `25 min`. **Footer only:** `then ☉ 12:39`. While the Moon is void, a hollow-Moon badge sits on the glyph. | Opens Today. Fits within 138 pt. |
| 2 | **Small · Moon** | The disc with its true terminator, drawn as a precomputed path. `8° ♋ · waning`, `Mansion 8 · Al-Nathrah`, and the next event (`□ ♄ 12:40`, or `Void Sat 19:32`). The disc turns hollow while void. | Opens Sky ▸ Now with the Moon selected, at now |
| 3 | **Small · Next Window** | Configurable: the next committed window, a chosen Vigil, or an Athanor operation. Testimonies as three short scales; the grade word; `♀ Mon 16 Nov 04:24`; and relative time (`in 17 days` → `in 2 h 14 min` → `open · 41 min left`). For an operation: `Step 3 of 7 · Shake · hour of the Sun 12:39 · day 9`. | One parameter |
| 4 | **Medium · Up Next** | Left: a mini Hour Dial (glyph and minutes). Right: four timed rows. Advisories appear in secondary ink with no control. | Each row deep-links |
| 5 | **Medium · Awaiting Judgment** (interactive) | One casting at a time: kind glyph, title, `cast Fri 23 Oct · 7 days`, and a stamp chip. **Hit · Partial · Miss** are App Intents written to the inbox. After a tap, the widget shows **Recorded Partial · Undo** for 10 minutes, and Undo reverts through the inbox. Footer: `1 more`. | Sigils never appear here |
| 6 | **Large · Today** | The day line, the Hour Dial, the Moon disc and line, the **current half-day of the ribbon as 12 cells**, with a tick marking the other half, and five Up Next rows. | Cells are at least 24 pt wide |
| 7 | **Extra Large · Altar** | Left: a large Hour Dial with `6th hour of the day · ends 12:39 · then the Sun`. Centre: the Moon Volvelle with its 28-mansion ring. Right: Within 48 Hours. Bottom: the ribbon. One toggle: Hour Bell. | |

**Controls** come from the same extension: Capture · Hour Bell · Begin Rite · Ask (§5.2).

**Deferred:**
- Deferred to v1.1 or later: The Seven, Election Quality, Hours, Moon's Itinerary, Athanor, Reading Now, Daily Card, Almanac Week.
- Day Liturgy (Extra Large Portrait) is gated on macOS 27.
- **Never a widget:** Fractal L4, a second hand, or a deployed sigil.

---

## 7. Signature components

**`facts.v1` and the complication grammar.**
- **Atoms:** Hour, Vowel, Moon, Void, Window, Step, Alignment, Observance, Judgment, Card, Continue, Testimonies, Record line, Stamp and Ephemeris are each defined once (§2.3).
- **Four renderings:** glyph, row (with its timed variant), tile and instrument.
- **One fixture generator** (`fixtures/2026-10-30-nyc.json`) produces every value in this document and in the golden tests.

**The time control** (internal name: *Crown*). A native glass capsule, `‹ date · time › Now`, shown only in Sky and Calendar.
- **Input:** type into it, use the arrows, press ⌘← / ⌘→ (text fields keep those keys), drag the rete, or scroll horizontally over scrubbable figures only.
- **At speed** it steps in whole units: hour, then day, then lunation.
- **While dragging,** the web layer owns the instant and the native label updates at no more than 15 Hz.
- **A trackpad haptic** marks each hour boundary as the rete passes it, and only on the trackpad.

**The Hour Ribbon and the Hour Dial.**
- **The ribbon** has 24 cells, each as wide as its real hour, over graded civil, nautical and astronomical twilight.
  - A **gilt** now-needle steps once a minute. It is always Gilt, whatever his system accent, and never red.
  - Faint equal clock-hour ticks run underneath, after the astrolabe's conversion scale.
  - The day's items are pinned in their cells.
- **Interaction:**
  - **Hover** shows start, end and duration.
  - **Click selects the hour**, and the inspector shows that hour's conditions.
  - **Double-click** or **Ring the Bell for This Hour** in the context menu arms the bell. The bell glyph on the cell is its toggle.
  - Dragging a Works step onto a cell schedules it, with a trackpad haptic.
- **The dial** is a 24-hour ring with noon at the top and the Sun bead, an inner ring that fills through the current hour, and the ruler glyph at the centre.
- **Data:** `planetaryHoursForDay(date, lat, lon)` gives the explicit start and end of all 24 hours, plus `twilightTimes`.

**The Sky figure** (Astrolabe · Horizon · Wheel).
- **Astrolabe, drawn as a true astrolabe:**
  - The plate for 40°43′ N carries the horizon, almucantars, the meridian, and the unequal-hour lines **below the horizon**.
  - By day the hour is read where the Sun's **nadir marker** crosses those lines; by night, where the Sun does.
  - The horizon almucantar is the Doctrine sunrise altitude (−0.833° by default).
  - The rete carries the ecliptic and pointers for the 15 Behenian stars, and the planets are glyph beads.
  - **Golden test:** the bead's crossing time must equal the ribbon boundary within ±30 s.
- **Horizon:** true altitude and azimuth on a fixed angular scale centred on south, with drag to pan. The full sky is drawn only here. Holding ⌥ reveals the hidden sky.
- **Wheel:** the chart of the moment, in the Doctrine house system.

**The Moon Volvelle and the Moon's Itinerary.**
- **Volvelle:** the true terminator inside rings for the lunation hinges, the 28 mansions (nature shown by fill weight) and the zodiac with both luminaries.
- **Itinerary:** her applying aspects as capsules that swell toward perfection, ending in the void and the ingress. The horary perfection line reuses the same grammar.

**Planets and the dignity scale.**
- **Rows** run in Chaldean order: glyph, sign and degree, and the dignity scale.
- **The dignity scale** weights domicile 5 · exaltation 4 · triplicity 3 · bound 2 · face 1 to the right. Detriment and fall extend to the left with a **135° hatch**, which appears only on this scale.
- **Peregrine means none of the five,** computed across all five with `essentialScore` from `reception.js`. Mercury in his own bound is not peregrine.
- **The Sun-relation zone is drawn by shape, never by opacity:**
  - cazimi: the glyph inside a small solid disc;
  - combust: the glyph struck by three short rays;
  - under the beams: one short ray tick beside the glyph;
  - free: nothing.
  
  A planet in the Sun's light keeps its glyph, drawn in `--label-2` ink.
- **Wording** is traditional: "in her house", "in his fall".

**Testimonies**, which replace the Three Rings.
- **Form:** three straight scales built like the dignity scale, labelled **Significator · Moon · Moment**.
  - Right of zero is the weight of criteria *for*; left is the weight *against*, drawn as open segments.
  - The label states the weighted share for: `Moon 72%`.
  - A failed critical criterion is a **struck end-cap** and a true gap with square ends, plus the word `broken` and its reason where space allows.
- **Criteria by scale:**
  - **Significator:** dignity, direct, combustion, minor dignities, malefic affliction, angularity in the Doctrine house system with Lilly's five degrees, reception, stars.
  - **Moon:** void, Burnt Path, besiegement, application, next aspect, speed, phase, sign relation, mansion, and **beholds the significator** (new).
  - **Moment:** day or hour, the Ascendant's lord, the Moon joining that lord, and **no malefic in the rising sign** (new).
- **Named cautions:**
  - *the Moon averse to [significator]*;
  - *[malefic] in the rising sign*;
  - *the Moon applies to [significator] by square or opposition*;
  - *the Moon meets [malefic] first*;
  - *a waning Moon for a work of increase*;
  - *after she leaves [sign] she meets [malefic]'s body*, when the other void school would count it.
- **The body-contact rule** (Doctrine):

| Void school | The Moon "runs onto a malefic's body" when | Effect |
|---|---|---|
| Lilly (default) | the conjunction perfects before she leaves her sign. With moieties on, she must also be within their sum (Moon 6° + Saturn 5°, or + Mars 3°30′). | Breaks the Moon testimony. The grade can be **Good** at most, until she separates. |
| Hellenistic (*kenodromia*) | it perfects within her next 30°, across the sign line | Same |
| Modern | it is within 8° in the same sign | Same |
| Any school | a contact that this school ignores but another counts | Named as a caution, with no effect on the score |

- **Grades:** the engine's words. **Relaxing the day never caps the grade. Relaxing any other rule caps it at Good, and the relaxed rule is named.**
- **The record line:** elective memory is **shrunk**. The adjustment is weighted by confidence (a beta prior toward his baseline), capped at ±15, never crosses a grade line, never overrides a critical failure, and is always shown with *n*.

**Find a Time and one Commit.** Find a Time is a mode of the Calendar content column (W3b).
- **Above the results:**
  - the template and its criteria;
  - the range (14–90 days, or *the planet's next season*);
  - *Rank by My Record*;
  - the active Doctrine;
  - the **Planetary Seasons** strip, so an empty result always has a reason.
- **Results:** the **Now** row comes first, then the ranked windows (W3b ordering). Selecting one fills the inspector and highlights the day.
- **Commit** (⌘↩) opens the SwiftUI confirmation sheet: window, grade, cautions, reminders, and *Add an Alarm in Calendar* when the window falls outside his waking hours. It writes one election casting with an `electionWindow`, linked by `intentionId`, so every surface sees it, talisman windows included.
- **Keep as Vigil** turns the result set into a standing watch.

| Template | Required | Weighted, or relaxed and shown | Sources |
|---|---|---|---|
| Planetary election | Significator dignified, direct and free of combustion; the Moon not void | The engine's criteria plus the two new ones; the day may be relaxed | [Canon · Dorotheus, Sahl, Lilly] |
| **Talisman** | Planetary election, plus the significator **angular** and the significator's **hour** | A waning Moon is a caution for works of increase | [Canon · Picatrix, Agrippa] |
| Picatrix named elections | As catalogued | — | [Canon · Picatrix] |
| Mansion window | The Moon in the mansion, clean | — | [Canon · Picatrix IV.9] |
| Behenian / Thebit | The Moon joins the star, clean | — | [Canon · Thebit, Agrippa] |
| Fractal alignment | A full alignment | — | [Modern · Astrum] |
| Lunation hinge | The hinge | — | — |
| **Gathering (Culpeper)** | The ruler **in its own sign and angular**; **the ruler's hour** (or **the hour of Jupiter**, which the 1652 Epistle allows); **the Moon applying to the ruler by a good aspect**; **the Moon not in the houses of her enemies** | If no window qualifies, fall back in Culpeper's order: the Moon applying to a planet of the ruler's triplicity, then the Moon with a fixed star of its nature. Each step is named and caps the grade at Good. The day is optional. | [Canon · Culpeper, *English Physitian* (1652), Epistle; Culpeper's directions for gathering] |
| **Begin the Work (Junius)** | The ruler dignified and angular; Saturn's squares avoided; a good Sun–Moon aspect | The ruler's day and hour [Canon · Agrippa I.29]; a waning Moon to solve, a waxing Moon to coagulate [Modern · Bartlett]; the day may be relaxed | [Canon · Junius ch. 6] |
| Court observance | The feast's true moment (sunset, or the Sun's degree); the Moon not void | — | His practice |

**Re-run on the fixture's engine positions**

| Window | Revision 1 | Corrected |
|---|---|---|
| **Sun 22 Nov 07:41–08:28** (shown as 07:40 in revision 1) | "Gathering", Excellent | **Not offered for Gathering.** Venus is in the 11th by whole sign and by Regiomontanus, so not angular. The Moon in Taurus is averse to Venus and cannot apply to her; her next aspect is the opposition to Mercury. Sunday is shown as a relaxed day. As a plain planetary election it grades Excellent (81), with the caution *the Moon averse to Venus*. |
| **Thu 19 Nov 14:57–15:45** | "Excellent · free of the malefics" | **Lilly: Excellent (80), with three cautions:** the Moon averse to Venus; Saturn retrograde in his fall in the rising sign; after she leaves Pisces the Moon meets Saturn's body (perfect Fri 20 Nov 14:55). **Hellenistic: Good**, capped because the body contact lies within 30°. |
| The season's Gathering hours | — | **Tue 24 Nov 21:20–22:31**: the hour of Venus. Venus is in the 4th, 1°31′ before the IC, by Lilly's five degrees. The Moon in Gemini next trines Venus (Wed 23:31). Caution: Mars in the rising sign. **Wed 25 Nov 09:20–10:06**: the hour of Jupiter. Venus is culminating, 1°49′ before the MC, and the Moon in Gemini next trines Venus. Both grade Excellent. |

**The stage track.** A plain row of dated stages heads every work (§3.4), including **Abandoned**. There is no Loop glyph, no closing glint and no toast.

**Judge, Response and Release.**
- **Judge** is one control everywhere: Hit · Partial · Miss · Later. Keys 1 / 2 / 3 / L work when the row has focus, with Undo. A check draws on (0.35 s) and the row leaves.
- **Response** belongs to the Court: free text plus tags, never scored.
- **Release** belongs to sigils: it records *unknown* and leaves the sigil out of statistics.

**Results by Condition and Findings** (Record ▸ Results).
- **Results by Condition:** each factor (planet, hour ruler, phase, mansion, void, grade band, ally, time to result) is a dot with a confidence whisker against his overall rate. Below *n* = 3 the dot is hollow and reads `not yet known`.
- **Findings:** a plain sentence, shown only when *n* ≥ 5 and two factors agree. **Your most-recurring correspondence** is always a Finding: the planet, mansion or material that recurs most across his hits, with *n*. Any Finding can become a Study card.
- There are no lines over time and no deltas.
- **Export Book of Results…** follows the library privacy rule (§11.3).

**Planet popover** (native glass), from any glyph anywhere.
- **Planets:** the dignity scale, motion, the Sun relation, the next station or ingress, the **vowel** (`Ο · oh`, Omicron), materia with chips, and the hymn's first line in New York.
- **Stars:** nature, contacts, rising and culmination at his place, and **herb and stone** as Materia links.
- **Mansions:** nature, the Picatrix talisman, the next clean window, and his record there.
- Each popover ends with **Open in Atlas**, **Read in Canon** or **Open in Materia**.

**Detail pages.** Detail opens *inside the main webview* with a native Back button (⌘[) and never in a sheet. A page has a day strip, the figure, a one-sentence summary, **About** in New York, and **Elect It · Open in Atlas · Read in Canon · Ask**. Honest empty states name the reason and the reopening date.

**Provenance chips and the Sources pane.** Each chip is a symbol plus a word:
- **Canon** (checkmark.seal): verified, with chapter and edition;
- **Library** (books.vertical): his own file, resolved on this Mac only, cited but not vouched for;
- **Record** (book.closed): with *n*;
- **Oracle** (text.bubble): interpretation, naming the engine;
- **Unsourced** (dashed questionmark.circle, italic);
- **Modern**: attested only in 20th-century sources, such as Venus's ylang ylang, patchouli and vetiver in `planets.js`.

**Canon is organised by source.** Picatrix, Agrippa, Lilly, Culpeper, Junius and the rest each have a contents page that deep-links to their Atlas pages, Find a Time templates and operations. Every Atlas page and template carries **Read in Canon**.

**The Ephemeris line** appears in the inspector's Sky pane and in Sources: `Swiss Ephemeris · exact`, `Moshier · within 1″`, or `Meeus · approximate`.
- **In approximate mode** every value is shown at the precision its fidelity test proves, with an `≈` and a dotted underline. The initial targets are Sun times and hour boundaries to the minute, the Moon to 6′, and planets to the degree.
- **Doctrine** states the sunrise definition as a number: by default, the Sun's upper limb at −0.833° (standard refraction).
- **The fidelity test** compares sunrise, sunset and positions against a reference. It asserts ±10 s for Swiss Ephemeris and ±60 s for Meeus; today's Meeus sunrise is 51 s early against the reference.

**The Oracle** (inspector pane and **Window ▸ Oracle**).
- **The engine is his configured one.** Today that is Claude, set in Settings ▸ Oracle. A persistent badge always names the engine.
- **Pre-approved scopes** are set once in Settings ▸ Oracle ▸ What the Oracle May Read: Sky, Journal, Castings, Court, and Pages marked *For the Oracle*.
- **Per-session consent** is asked only for **library passages**, because they are copyrighted, and for record scopes he has not pre-approved. The **Quote Card** shows exactly what will be sent.
- **Foundation Models (On this Mac)** takes small tasks only: the *Read the Sky* gloss, the house suggestion in New Question, and drafting a card.
  - Each task has a token budget (prompt ≤ 2,500, response ≤ 600) and is checked against `contextSize` before it runs.
  - On overflow it hands off to his configured engine, with a visible note. Grounding is never silently truncated.
- **The long modes** (Judge, Correlate, Plan, Tutor, Draft) use his configured engine. Claude or WebLLM is offered when that engine is On this Mac.
- **Answers** give facts first, then a labelled interpretation, with a chip on every claim. Nothing is saved without Save.

**Quick Capture.**
- **The panel** is warm and native. It appears in about 0.1 s over any app or full-screen Space without activating Astrum.
- **The stamp** records the sky when the panel opens.
- **Kind:** the default is the last kind used, or **Dream** before sunrise plus one hour. Typing "d " or "s " first sets the kind.
- **Photos** can be added by drag, paste (⌘V) or **Import from iPhone ▸ Take Photo** (Continuity Camera).
- **When? ▸** recomputes the stamp for a dream written later, and both times are kept.
- **Return** saves; the panel draws closed in 0.25 s and focus returns to the previous app.

**The Rite.**
- **Window:** a MiniPlayer-like companion (S1), or the Altar's face.
- **Steps** are the working's own, set as liturgy: spoken lines in New York 22/34, rubrics in secondary-ink italic.
- **The header** has an optional **Working with: [Court member]** link.
- **The live strip** shows the window's remaining time and its Testimonies.
- **Practice aids:** breath pacer, drum, the hymn and the vowel at their steps.
- **The transport** is native glass: back · play/pause · forward · Seal.
- **Seal (⌘↩)** captures the conditions as the seal glyph draws on (0.6 s), with an optional sound. There is no haptic, because the seal is pressed from the keyboard.

**Reader, Lesson Player and citations.**
- **Reader:**
  - PDFKit for PDFs, with Live Text on scans and highlights stored as page plus quads;
  - epub.js for DRM-free EPUB, and Markdown;
  - New York 17/27, with running heads and folios;
  - themes **Paper · Dusk · Lamp**.
- **Lesson Player:** AVKit. During the **Align** stage, each lesson is transcribed with SpeechAnalyzer and its `.md` is compared with the machine text.
  - **Above the threshold (0.85):** the `.md` is the transcript. It is aligned, its current sentence is lit, and clicking a sentence seeks to it. It exports as WebVTT captions.
  - **Below:** the `.md` appears as **Lesson Notes** beside the video, and the transcript is *Machine transcript · on this Mac* for seek, search and captions.
  - **Chapter ticks** come from the headings only when the headings anchor to the audio.
  - **Picture in Picture** keeps playing when he navigates away, if the AVPlayerView can be kept alive. The fallback is a **Now Playing** mini-player in the toolbar, together with the system Now Playing controls and the media keys.
- **Selection actions:** **Cite in… · Copy with Citation · Add to Pages · Make a Card · Ask About This Passage**.
- **Citations are opaque in the record** (§11.3). A citation reopens the file in place, and files are never written to.

**The Collection Shelf.**
- **Grid:** first-page thumbnails made locally, or typographic New York covers. Art is never scraped.
- **List:** Finder-like columns, including **Text state**: Searchable · Scanned, OCR'd (with a confidence note) · Needs OCR · Open With….
- **Grouping:** shelves come from subfolders. **Editions** groups duplicates, and `_previous` folds into Earlier Editions.
- **Show in Finder** is available on every item.

**The Materia card.** One card per plant, mineral, metal, resin, oil or stone, including the Behenian stars' herbs and stones. In order:
1. **Cautions first,** quoted from sources.
   - A **data-driven toxicity flag**, sourced and chipped, sits on every entry and blocks every ingestion template. It is set on, among others, *Atropa*, *Datura*, *Hyoscyamus*, *Aconitum*, *Digitalis*, *Conium*, *Veratrum*, comfrey, rue, wormwood, black hellebore and mandrake.
   - A test fails if any flagged entry is reachable from an ingestion template.
2. Names and Latin binomials.
3. Rulers by provenance: Canon · Astrum table (*Unsourced* or *Modern*) · his library ("4 books agree · 1 differs ›").
4. Uses in the Athanor and in workings; his record; ranked passages, resolved on this Mac.
5. Actions: **Find a Gathering Time · Use in Operation · Add to Working**.

Astrum never generates a dose.

**The Athanor bench.**
- **The header puts safety first:**
  - the operation's `safety` lines from `operations.js` (for example "COPPER ONLY…" and the acetate path's flammable ketone spirit);
  - then the **apparatus** list;
  - then *Season & Tide*.
  
  Each hazardous step repeats its safety line on the step and in its notification.
- **Study-only paths stay study-only.** `STUDY_ONLY_PATHS` (lead, mercury, antimony, oil of vitriol, aurum potabile) live in Canon ▸ The Art. They can never become templates or **Use in Operation** targets, and a test enforces this.
- **Statuses:** Active · Completed · **Abandoned**, with a *Completed & Abandoned* list.
- **The Library tab** is a filtered view of Canon ▸ The Art plus his collections, matched to the operation.
- **Photos** go in the lab notebook ("colour is data").
- **The Work's Season** is an optional Sky complication.

**Sigils, veiled.**
- Once a sigil is **Deployed**, the gallery shows a sealed placeholder bearing only the date.
- **A deployed sigil never surfaces:** not in widgets, notifications, Spotlight, Up Next, Open Quickly or search results. Showing it takes ⌥-clicking **Show Veiled** and confirming.
- **There are no automatic check-ins.** He judges when he chooses. If he wants, he can set a long blind interval, after which a quiet row reads only "A veiled working may be judged".
- **Retire** offers **Judge** or **Release Unjudged**.

**The Court.**
- **Six kinds:** Ancestor, Planetary Intelligence, Saint/Holy Dead, Genius Loci, Daimon/Familiar, Other. Each kind is a sidebar group, and he can hide any of them.
- **Four log kinds:** Offering · Contact · Petition · Response.
- **Petitions** may carry their own check-in and judgment, reported per petition.
- **Feasts** fall at their true moments: by fixed date, or astronomically (the cross-quarter Sun at 15° of a fixed sign).
- **Kept commands:** **Seed a Sphere's Court (Agrippa)** and **Release from the Court**, which archives the member with a final note rather than deleting it.

**The month header** (*Almanac* in print). The month's tympanum, after the *Très Riches Heures*: the Sun's degrees aligned to the day numbers, lunation hinges, ingresses, stations, eclipses and feasts.

**The Fractal Regulator.**
- **Sub-dials:** four, after a regulator watch face: decan (~10.1 d), L2 (~6.76 h), L3 (~11.3 min) and L4 (~18.8 s), with a **Coherence** row.
- **The vowel line at L4:** *Sound now · one breath · one face*.
- **Full alignment:** at one, the dials close like an iris. The next is Mon 2 Nov 05:06 EST, Scorpio II, 19 s.
- **Entry/Absolute mode** lives in Doctrine.
- This is the one place seconds tick.

**The Lilly Square.** View ▸ Chart Style ▸ Wheel | Square, in My Chart and Questions, drawn in hairlines.

**Open Beside.** ⌥-click, or **Open Beside**, places a book or lesson next to the operation or working in a native two-pane split. The fallback is a Reader window beside the main one.

---

## 8. Key flows

### 8.1 The morning (Fri 30 Oct)

1. **Before sunrise:** Today's title reads *Night of Thursday · Friday 30 October*.
2. **07:25, sunrise.** The planetary day begins, and the passive Day notification arrives (§5.3).
3. **07:31, the Altar.** He swipes to the Altar (W9). The face is already current:
   - *Hour of Venus*, 46 min left, the 1st hour of the day, ending 08:17, then Mercury;
   - the Moon at 5°43′ Cancer, not void;
   - Within 48 Hours: the Saturn square at 12:40, Samhain at Saturday's sunset (17:53), the void from 19:32, and the clock change.
   - The hymn to Aphrodite carries its Canon chip.
4. **Back to work.** He swipes to his work desktop, where the main window is on Today, and reads the five regions in about five seconds.
5. **Awaiting Judgment.** He presses ↓ to the Jupiter working, then 2 (Partial), and adds one line. A check draws on and the row leaves. *Recorded Partial · Undo* stays available for 10 minutes. Results update silently.
6. **Study row.** Return opens the card as a detail page. Space reveals the answer, and 1–4 grades it.
7. **Court row.** He clicks **Plan** on Samhain. The Court page opens with Sat 31 Oct, sunset 17:53, clear of the void at 19:32, already proposed.
8. **The bell.** He double-clicks the 13:32 Venus cell on the ribbon to ring the bell for the hour of Venus. The bell glyph appears on the cell.
9. **The menu bar** shows the Venus template glyph. After 08:17 it shows Mercury.

### 8.2 An election window, then the working under it

1. **Fri 30 Oct, 11:58: Intent.** In Works ▸ Talismans he presses ⌘N and creates *Venus for concord* in the SwiftUI sheet. The sheet suggests Venus from her domains and creates the `intentionId`.
2. **11:59: Find a Time (⇧⌘F).** Calendar switches to Find a Time with the Talisman template for Venus (W3b).
   - The **Now** row reads *Disqualified · Venus retrograde and under the beams*.
   - The Planetary Seasons strip reads "retrograde to Sat 14 Nov 12:13 · in her house to Thu 3 Dec 20:15".
   - He sets the range to *Venus's next season*.
   - The first result is **Mon 16 Nov 04:24–05:34 · Excellent · no cautions**: Venus rising in her own sign, 2°09′ above the Ascendant and on Spica; the Moon waxing in Aquarius, her next aspect a trine to Venus.
   - He ⌘-clicks **Show Sky at This Moment** to study the astrolabe for that hour in a second window. The result list stays.
3. **12:05: Commit (⌘↩).** The confirmation sheet shows the window, *Excellent*, *no cautions* and the record line. The window falls outside his waking hours, so the reminders are *the evening before at 21:00* and *1 hour before (03:24)*, and he ticks **Add an Alarm in Calendar**.
   - One election casting with its `electionWindow` is written, linked by `intentionId`.
   - The stage track reads Elect ● 30 Oct.
   - The window appears at once in Calendar, in Sky ▸ Moments, in Up Next, in the menu bar and in the Next Window widget.
4. **Design (now).** **Open Sigil Canvas** is the prominent action (W5). He draws the kamea of Venus (7 × 7) and the seal of Hagiel. The materia checklist links each Materia card, and the plan is drafted with the Oracle (Claude) and accepted line by line.
5. **Sun 15 Nov, 21:00 (Active).** *Venus Window at 04:24* / Mon 16 Nov 04:24–05:34 · 11th hour of the night · Venus rising in her house, on Spica; the Moon waxing in Aquarius, her next aspect a trine to Venus. Actions: Show Checklist · Reschedule….
6. **Mon 16 Nov, 03:20.** His Calendar alarm wakes him.
7. **03:24 (Active).** *Venus Window in 1 Hour* / Copper plate, rose and myrtle, the seal of Hagiel. The action **Begin Rite at 04:24** arms the Rite.
8. **04:14.** The menu bar shows the Sun's glyph (the 22nd hour) with a dot, and `10 min` because he turned the countdown on. On the Altar, Within 48 Hours becomes the window and its Testimonies.
9. **04:24.** The Rite opens on whichever desktop he is on (S1). The strip reads *♀ Hour of Venus · 70 min left in window*, and the header reads *Working with: Hagiel*.
   - The steps advance as liturgy: the hymn to Aphrodite at step 3, the vowel Η at step 4.
   - Space starts the pacer or the drum, and the menu bar shows the Rite image with `3/9`.
10. **05:29.** Five minutes before the close, one soft tone sounds if he has enabled it, and the remaining time moves from secondary to primary ink. It never turns red.
11. **Seal (⌘↩).** The seal glyph draws on as the conditions are captured. He drags in a photo of the finished talisman. The casting links to the talisman, its sigil and its page. The stage track reads Consecrate ● Mon 16 Nov → Deploy, and the check-in is set for **Mon 7 Dec** (21 days).
12. **Mon 7 Dec (Passive).** *Judge the Venus Talisman* / Consecrated Mon 16 Nov in the hour of Venus, the Moon waxing in Aquarius. Hit · Partial · Miss · Later. Venus's record line updates: shrunk, capped and shown with *n*.

### 8.3 Asking a horary question (Fri 30 Oct, 14:32:07)

1. **The question comes.** He is in another app. He opens Spotlight and types his Quick Key **hq**, or uses menu bar ▸ Ask a Question…, or ⌥⌘N.
2. **The New Question sheet** (SwiftUI, 520 pt) stamps the moment it opened as the **moment of understanding** (Lilly) and records that choice. Time and place can be edited. "For my sister…" turns the chart to the derived house.
3. **He types** *Will the lease be renewed?* Foundation Models suggests the **4th** (land, dwellings), and he confirms. Method: Horary. ⌘↩ casts.
4. **The document opens on the facts** (W4), with the inspector on Sky.
   - **Before judgment:** all considerations pass, and the hour agrees (Mercury and Saturn both rule the air triplicity). Then the caution: **the 7th is afflicted**. Mars is 1°13′ inside the Descendant, and the 7th's lord, the Sun, is peregrine and applying to Mars's square. Lilly warns that the astrologer's judgment may not satisfy. The chart is **Radical · 1 caution**.
   - **Significators:**
     - Saturn, lord of Aquarius, at 8°50′ Aries, retrograde in his fall in the 2nd;
     - the Moon in her own house in the 5th;
     - Mercury, lord of the 4th (cusp 5°03′ Gemini), at 18°12′ Scorpio, retrograde, in his own bound (so not peregrine), under the beams and combust in about a day.
   - **Perfection:** Saturn and Mercury have no aspect. The Moon separates from Saturn's square (1°08′) and applies by trine to Mercury, perfecting Sat 03:22, 12 h 50 min away. This is **translation of light** under moieties (9°30′). Under a fixed 6° orb it would be missed, and Doctrine shows which applies.
   - **Reception and the almuten** sit one disclosure deeper.
5. **His judgment first.** The Oracle pane shows engine facts only. He enters *Conditional — through a third party*, with the timing *weeks*, and saves (⌘S).
6. **Then the Oracle.** **Judge** unlocks and its reading appears *below* his saved judgment. The reading draws on Lilly's considerations [Canon] and his past 4th-house questions [Record · n], and carries the badge *Claude*. The Oracle never writes to the record.
7. **Check-ins** are set for 3 days and for his predicted timing. Results by Condition will show his horary accuracy by Moon condition and by radicality.

### 8.4 Capturing an omen in under three seconds (Fri 30 Oct, 12:21)

1. **t = 0.0 s.** A hawk lands on the fence. He presses **⌃⌥⌘O** (checked for conflicts at setup, and reassignable), or the Capture control, or Spotlight's **om**.
2. **t ≈ 0.1 s.** The panel (S2) appears over whatever he was doing. Astrum does not activate, the cursor is already in the field, and the stamp reads `12:21 · ♂ · ☽ 8°39′ ♋ · mansion 8 · waning`.
3. **t ≈ 2.5 s.** He types *Hawk on the fence, facing east* and presses Return. The panel draws closed with no sound, focus returns, and the entry is saved with its full conditions and place. A photo could have been pasted in first.
4. **Later.** In Record ▸ Journal (W7), the inspector offers *Omens near: Venus for concord · committed today* [Link]. Linking is never required at capture.
5. **A dream written later.** Before sunrise plus one hour the panel defaults to Dream. "When? ▸ 06:40" recomputes the stamp to *Night of Wednesday · Thu 29 Oct 06:40 · Hour of Saturn*, and both times are kept.

### 8.5 A Rune Soup lesson, and asking the Oracle about a passage (Fri 30 Oct, 20:30)

1. **Continue.** Today ▸ Study reads `[Course] · Lesson 4 · 14 min left`, and Return opens the Lesson Player (W10). The sidebar folds away, leaving the course outline, the player above the transcript, and the inspector.
2. **The video plays in place** from `<course library folder>` through the folder bookmark. For this lesson the Align stage matched its `.md` to the audio at 0.93, so the `.md` is the transcript, with the current sentence held a third of the way down. Scrolling by hand pauses the follow and shows *Return to Playback*.
3. **He asks about two sentences** on feeding the dead, using **Ask About This Passage** (⌥⌘4). The video pauses.
4. **The Quote Card:** "[Course] · Lesson 4 · 21:40–23:12 · 92 s of transcript".
   - **Engine:** *Claude*, from Settings. Because this is a library passage, the card asks **Allow for this session?**
   - **Include Sky** and **Include My Record: Court & Offerings** are both pre-approved.
   - Once allowed, a persistent token reads *Sending library text to Claude* until the session ends.
5. **The answer** carries chips:
   - **[▶ 22:05]**, which seeks the video;
   - **[Canon]**;
   - **[Record · Court · Grandmother · last offering 12 days ago]**;
   - **[Oracle]** on its interpretive sentences.
6. **Actions:**
   - **Save as Note at 22:05** stores the note in the Library store. His Court page gains an opaque link that shows *[Library citation · on this Mac]* anywhere else.
   - **Make a Card** stores the card in the Library store; the Study deck references it by id.
   - **Plan an Offering** opens the Court page with Find a Time set to the Court template, which proposes *Sat 31 Oct, sunset 17:53, clear of the void at 19:32*.
7. **Leaving the lesson** (⌘1) keeps it playing in Picture in Picture where available, or in the toolbar's **Now Playing** mini-player. At 90% the lesson counts as watched. His notes are searchable in the Library scope and never sync or export.

### 8.6 A plant in Alchemy & Herbalism, while planning an Athanor operation (Fri 30 Oct, 21:15)

1. **New Operation.** Works ▸ Athanor ▸ New Operation…, with the template *Spagyric Tincture*, planet Venus and dried vervain from his summer harvest.
   - **The header opens with Safety:** "Burn the marc outdoors — the smoke is real." · "Never denatured alcohol or methanol if the elixir is to be taken."
   - **Then the apparatus**, and *Venus's season opens Sat 14 Nov*.
   - **The sources line** reads "Albertus III · Junius 9 · Bartlett 5 — **you own 2 of 3**". Each source is a link into his file.
2. **Step 1** says to choose the herb by its ruler. Chips offer Venus's herbs: Rose · Myrtle · Vervain · Yarrow · Strawberry.
3. **Vervain.** He clicks it, and the inspector shows its **Materia** card: cautions first (quoted from 2 sources, with no toxicity flag), *Verbena officinalis*, ruler ♀ with chips, *Used In*, *Your Record*, and 27 passages in 9 volumes, resolved on this Mac.
4. **Open Beside.** He ⌥-clicks a passage in a scanned herbal. The operation stays on the left and his PDF opens on the right at p. 214, in the native PDF view, with the OCR'd term highlighted. ↑ ↓ step through the book's other mentions.
5. **Cite in Step 1.** He selects the paragraph and cites it. The step's notebook gains a **citation card** that stores only the collection id, the file fingerprint, the page with its quads, and a hash of the quote. The title and text are resolved from the Library store when the card is shown, and the PDF is untouched.
6. **Find a Time** opens with the step's template, *Begin the Work (Junius)*. It reports honestly:
   - "On Venus's own day, only the Friday-night hour Sat 21 Nov 03:17 is angular, and there the Moon applies to Venus by opposition."
   - With the day relaxed, Mon 16 Nov 04:24 is *already committed to Venus for concord*.
   - **Sun 29 Nov 20:07–21:19 · Excellent (89):** the hour of Venus, with Venus in the 4th and in her house. The Moon is waning (to solve [Modern · Bartlett]); she joins Jupiter (Mon 02:55), then sextiles Venus (Mon 05:34), and Saturn's squares are avoided. Caution: after she leaves Leo she meets Mars's body, which the Hellenistic school would count.
   - He commits it.
7. **Later steps** follow their `dueRules`: daily agitation in the hours of Venus, and filtering at the first Full Moon at least seven days into the steep, **Wed 23 Dec 20:21**. Every step appears on the Athanor layer, in Up Next, and in a Next Window widget configured for this operation. Lab notes (⌘N, type Lab note) take photos.

---

## 9. Visual system

### 9.1 Materials: where glass may and may not appear

**Glass may appear (native only, Regular variant):**
- the toolbar and its items;
- the sidebar;
- the inspector;
- menus, context menus and popovers;
- sheets (with a dimming layer when modal);
- the Quick Capture panel and the Rite transport;
- AVKit's controls;
- the menu-bar menu;
- Control Center controls;
- the system's Clear and Tinted widget backgrounds.

All of these follow the **Liquid Glass Clear/Tinted** setting from macOS 26.1. **Tinted** is tested on the toolbar, sidebar and inspector over the wash. Widget rendering modes are a separate checklist (§6).

**The single Clear instance:** the Altar's floating controls when its background is *Sky*, with a 35% dim in daylight.

**Glass may not appear** in anything the web layer draws. That includes dials, tiles, platters, the ribbon, calendar cells, charts, reader pages, transcripts, cards, lists, widget content and notification content.
- There is no glass on glass and no `backdrop-filter`.
- **The class names stay, as opaque platters.** `.card`, `.chip` and the `.glass-*` tiers (85 uses of `className="card"` in the repo) are re-implemented in Phase 1 as opaque platter tokens, so no legacy room breaks.
- There is no in-app glass or tint setting.

**Fallback:** the web and iPad builds without native chrome, and Reduce Transparency, use solid `--mat-chrome-fallback`.

### 9.2 Base palettes (contrast measured)

| Token | Dark | Light | Use |
|---|---|---|---|
| window | #0B0D12 | #F6F4EF | Content background |
| platter | #141821 | #FFFFFF | Opaque platter |
| raised | #1B2030 | #FBFAF7 | Nested and hover |
| paper / ink | #16140F / #E8E2D4 (14.3:1) | #FBF8F1 / #23201B (15.3:1) | Reading views |
| ink-2 | #ABA393 (7.4:1) | #625A4E (6.4:1) | Rubrics, running heads |
| label | #EDEFF3 (15.4:1 on platter) | #1D1D1F (16.8:1 on platter; 15.3:1 on window) | Body |
| label-2 | #A4A9B4 (7.5:1 platter; 6.9:1 raised) | #66666B (5.7:1 platter; 5.2:1 window; 5.5:1 raised) | Secondary |
| label-3 | #82889A (5.0:1) | **#7A7A80** (4.3:1 platter; 3.9:1 window) | Placeholders and disabled only |
| **Gilt** | #E8CF98 (11.7:1 on platter) | #85651A (5.4:1 on white; 4.9:1 on window) | Content-semantic: the now-needle and "window open now". **Always Gilt**, whatever the system accent. |
| accent | `controlAccentColor`, pushed by the shell for **both** appearances; Gilt when the accent is Multicolor | same | Native-style controls, text selection and focus outlines outside figures. **Never inside figures.** |

**Sky wash** (Today, Sky, the Altar). A low-chroma gradient (OKLCH C ≤ 0.06) keyed to the Sun's altitude at his place, in six stages: day · golden · civil · nautical · astronomical · night.
- **The luminance is clamped:** the light keyframes never fall below L 0.935. Measured across every keyframe, `label-2` is at least **4.61:1** in light and **5.86:1** in dark, and the void stroke at least 3.35:1 and 3.31:1.
- **The hour bloom**, a radial glow of the ruler's colour, appears **in dark appearance only** (6% by day, 8% by night). It is omitted in light, where it would cost text contrast.
- **Void** halves the bloom.
- **The wash repaints** on a 60 s tick and at hinges.
- **The CI gate** measures every text token over every keyframe combined with every planet's bloom, and fails the build below 4.5:1. Anything that fails moves onto a platter.

### 9.3 Per-planet palette (hue is atmosphere; the glyph is identity)

| Planet (Chaldean order) | Anchor | Dark | Light | Contrast on platter, dark / light |
|---|---|---|---|---|
| ♄ Saturn | lead / umber | #9C9284 | **#5C4A32** | 6.4 / 8.5 |
| ♃ Jupiter | sapphire | #4F7FF2 | #1D44A8 | 4.8 / 8.6 |
| ♂ Mars | iron | #EC5A3C | #A3241A | 5.2 / 7.4 |
| ☉ Sun | saffron | #FF9A2E | #B26F00 | 8.4 / 4.1 |
| ♀ Venus | verdigris | #35C2A0 | #0A7D6E | 7.9 / 5.0 |
| ☿ Mercury | quicksilver violet | #CBA8FF | #8A5CD0 | 9.0 / 4.6 |
| ☽ Moon | argent | #D3E0EC | #2F5F84 | 13.2 / 6.8 |

**Validation** (OKLab ΔE × 100, under normal vision and Machado deutan, protan and tritan simulation, run today against every semantic token and the eight system accents):
- **Chaldean neighbours** (side by side on the ribbon): at least **10.5** apart in light and **11.7** in dark, in all four vision modes.
- **Light Saturn** moved from #6E655A to **#5C4A32**. It is now 10.4 from `label-2` (9.8–11.4 under simulation) and 11.8 from Gilt. Previously it was 2.7 from `label-2`.
- **Remaining low pairs, all non-neighbours:**
  - light Saturn–Mars 3.5 (protan);
  - light Jupiter–Moon 3.6 (tritan);
  - dark Saturn–Venus 5.5 (deutan);
  - light Venus–`label-2` 1.6 (deutan; 9.8 under normal vision).
  
  These pairs are why every planet mark carries its glyph and planet hues are never used for text.
- **Gilt** stays at least **5.0** from every planet in light and 8.4 in dark, in every mode.
- **System accents collide with planet hues.** In dark under normal vision: Blue–Jupiter 4.0, Red–Mars 4.9, Orange–Sun 5.6, Graphite–Saturn 3.4. Under simulation, light Red–Sun is 2.7. So:
  - **selection and focus inside figures are drawn by shape** (an outline ring plus heavier weight), never in accent hue;
  - **selected native rows render planet glyphs as on-accent template images**;
  - the content-semantic colours are always Gilt.
- **Planet tints** are opaque: `color-mix(in oklab, planet 14%, platter)`. Each planet's glyph on its own tinted cell measures at least 3.4:1 in light and 4.0:1 in dark.
  - Reduce Transparency does not change them, because nothing in them is translucent.
  - **Increase Contrast** adds a 1 px planet-hue outline to the cell and switches to the variants with L* ±10.

### 9.4 Semantic states: shape first, luminance second, never hue for good or bad

Every state has its **own texture**, and words are added wherever space allows:

| State | Shape and texture | Ink |
|---|---|---|
| Dignified (domicile, exaltation) | Solid bead; solid segments to the right; "in her house", "exalted" | label |
| Minor dignity | Shorter solid segments | label |
| Debilitated (detriment, fall) | Segments to the left with a **135° hatch**, on the dignity scale only; "in his fall" | label-2 |
| Peregrine | An open ring on the zero line | label-2 |
| **Void of course** | A **hairline outline with sparse dots** (never hatched); the hollow Moon; the span named in words; the other school's span as a dotted ghost | stroke `--state-void`: #767C8C / **#7C7C82**, at least 3.8:1 on window, platter and raised; Increase Contrast #9A9FAD / #5E5E64; Night #B3261A (3.2:1) |
| Retrograde / stationary | ℞ suffix, reversed arrow, dashed trail / a short bar and "stationary" | label-2 |
| Sun relation | cazimi: inside a disc · combust: three ray strokes · under the beams: one ray tick | label-2; **never opacity** |
| Windows | ◇ candidate · ◆ committed · Testimonies scales | label; Gilt only for "open now" |
| **Broken testimony** | A **true gap with square end caps** and a struck end-cap; "broken" | label |
| **Closed season** | A **dashed outline**; "closed" and the reason | label-3 (3.9:1) |
| Verdicts | ● Hit · ◐ Partial · ○ Miss · ◌ Open | label; never green or red |
| Caution (materia, horary, elections) | exclamationmark.triangle plus a sentence; shape only, **no fill** | label |
| Selection and focus in figures | A 1.5 pt outline ring in label ink plus weight | never accent hue |
| Destructive | System red, only in native alerts and destructive menu items | never in figures |

Under **Differentiate Without Color**, compact marks gain words: "℞", "void", "closed", "fall", "broken".

### 9.5 The Night presentation (the Altar and the Rite, after astronomical dusk; opt-in)

Monochrome red on black, chosen to minimise green and blue so dark adaptation is protected. **All text is at least 4.5:1, and hierarchy comes from weight.**
- primary text **#FF2D1F** (5.65:1), semibold;
- secondary text **#E83020** (4.87:1), regular;
- display glyphs of 24 pt and larger may dim to #B02A1E (3.2:1);
- the void stroke is #B3261A (3.2:1);
- hairlines are #5A1810 and purely decorative.

Planet hues, the wash and the accent all collapse to the primary red. Opacity never dims anything.

### 9.6 Type scale (system families only; nothing bundled)

| Role | Face | Size / line | Weight |
|---|---|---|---|
| Large Title | SF Pro (`system-ui`) | 26/32 | Bold |
| Title 1 · 2 · 3 | SF Pro | 22/26 · 17/22 · 15/20 | Regular (Semibold when emphasised) |
| Headline · Body | SF Pro | 13/16 | Bold · Regular |
| Callout · Subheadline · Footnote | SF Pro | 12/15 · 11/14 · 10/13 | Regular |
| Display L · M · S (instrument numerals) | SF Pro, tabular | 64/68 · 44/48 · 28/32 | Medium |
| Reading (adjustable 14–24) | New York (`ui-serif`) | 17/27 | Regular |
| Transcript · card front | New York | 15/22 | Regular |
| Liturgy | New York | 22/34 | Regular |
| Rubric · quotation · margin note | New York italic | 15/22 · 15/23 · 12/16 | Regular |
| Reading-view title | New York | 34/40 | Medium |
| Ephemeris columns | SF Mono (`ui-monospace`) | 12/16 | Regular |

**Rules**
- SF Pro is used in the utility spaces. New York is used only for reading, liturgy, hymns, canon, transcripts and card fronts.
- Sentence case. No tracked capitals and no light weights.
- **Tabular figures only on live numbers** (the `.num` class); old-style figures in New York prose; `text-wrap: pretty`; hanging punctuation.
- **Size floors:** 10 pt in the app and 11 pt in widgets. Floors survive every Text Size step through `max(10px, …)`.
- **The legacy shim.** Inside `[data-legacy]` rooms, a build-time transform clamps every `fontSize` literal and every `T()`/`L()` helper result to at least 10 px. CSS removes letter-spacing and text-transform. This covers about 681 inline sizes under 10 px today.
- **The margin column** appears in reading views whenever the content width is 900 pt or more, which includes the default 972 pt layout.

### 9.7 Spacing and grid

- **Base:** a 4 pt scale of 2 · 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64.
- **Grid:** 24 pt outer margins and 16 pt gutters.
- **Platters:** 12 pt padding.
- **Rows:** 28, 36 or 44 pt.
- **Hit targets:** at least 28 pt in content and 24 pt in the inspector.
- **Reading measure:** 620 pt, about 68 characters.

### 9.8 Concentric radii (radius = parent radius − actual inset)

- **Platters** use 18 pt; **tiles and cells** nested in them at the 12 pt inset use **18 − 12 = 6 pt**.
- **Controls** use 5–6 pt rounded rectangles. Capsules are reserved for the one prominent action, the time control and the Rite transport.
- **Content never hugs the window corner.** The 24 pt margins exceed the window radius, so only native chrome is concentric with the window, and the system draws it. The shell still writes the real window radius into `--r-window` for the Altar's floating controls.
- **Widgets** use `ContainerRelativeShape`.

### 9.9 Custom glyphs ("Astrum Symbols", 48 in v1)

- **The set:**
  - 7 planets and 2 nodes;
  - 12 signs;
  - 5 Ptolemaic aspects;
  - the Lot of Fortune;
  - 6 states: retrograde, stationary, under the beams, cazimi, void Moon, peregrine ring;
  - 4 verdict marks;
  - 4 space symbols: Sky (astrolabe), Charts (square chart), Works (alembic), Court (offering bowl);
  - 4 domain objects: talisman, sigil, athanor, Vigil lantern;
  - 3 menu-bar modifiers: void badge, window dot, Rite.
- **Built on** SF Symbols 7 templates, with Regular, Ultralight and Black masters, so all weights and scales interpolate.
- **Animation:** Draw On guide points let the new ruler draw itself at the hour and the seal draw on at Seal. Variable Draw drives the hour ring.
- **Accessibility:** every symbol has an accessibility label.
- **Template images** for the menu bar are rendered from the same masters. **No Unicode glyph appears in any title, menu or notification.**
- **On the web,** SVG twins are exported from the same masters. Any Unicode fallback carries U+FE0E, and no emoji are used anywhere.
- **Generic symbols** are stock SF Symbols: sun.horizon (Today), calendar, book.closed, books.vertical, leaf (Materia), graduationcap (Study), eye (Omen), moon.zzz (Dream), bell / bell.slash, flame (Begin Rite), text.bubble, quote.bubble, pin, exclamationmark.triangle.

### 9.10 Motion (springs, tied to real events)

**The stillness rule:** minute precision everywhere. Seconds appear only in the Fractal Regulator and in the last 2 minutes before a committed alignment. At rest, the only changes are the minute digits, the now-needle stepping once a minute, and the terminator.

| Motion | Curve | Duration |
|---|---|---|
| Navigation and layout | Spring, bounce 0 | 0.4 s perceptual (0.5 s run) |
| Confirmation (Testimonies fill at Commit) | Spring, bounce 0.15 | 0.35 s perceptual (0.6 s run) |
| The hour turns: the ruler draws off and on, the ribbon advances one cell | Spring, bounce 0 | 0.6 s and 0.5 s |
| Seal draws on | Spring, bounce 0 | 0.6 s |
| Hour bloom crossfade (dark only) | Ease | 90 s |
| Void opens (dots fade in) | Ease | 1.2 s |
| Judgment recorded | Spring | 0.35 s |
| Capture panel closes | Spring | 0.25 s |
| Rite steps | Smooth | 0.45 s |
| Breath pacer | Sine in-out, repeating | Set by the pacer |

- Every animation can be interrupted and keeps its velocity.
- Nothing flashes more than three times a second.
- **Reduce Motion:** crossfades only, a still rete until scrubbed, instant glyphs, and a counted number in place of the pacer.

### 9.11 Sound and haptics

- **Silent by default.** Sound always follows system volume and Focus.
- **The Hour Bell** is one struck bell, under 1.5 s, played **by the in-process scheduler**, including when Astrum is frontmost. A notification sound is used only for the backstop. Optional tuned bells descend in Chaldean order.
- **Windows** have a distinct two-note figure. **Seal** has an optional soft tone.
- **The Rite's drum and breath tones** are explicit playback with their own volume.
- **Haptics** belong only to trackpad actions: rete hour detents and drag-to-schedule. Nothing pressed on the keyboard promises a haptic.
- There are no interface clicks, and sound never carries information alone.

### 9.12 Anti-kitsch list

Never: parchment textures, blackletter, wax seals, candle flicker, page curls, starfields, nebulae, glows, sparkles, confetti, streaks, rings to close, deltas, lines of "performance", tickers, price-style rows, health-app idioms, seconds that tick at rest, or the word "watchlist".

---

## 10. Keyboard, commands, Spotlight and Shortcuts

**Menus**, in this order: Astrum · File · Edit · Format (in the Pages editor only) · View · Go · Sky · Work · Window · Help.
- Items are disabled, never hidden, and Option alternates are provided.
- Every toolbar item has a menu twin.
- Every assignment below was audited against Finder, Notes, Calendar, Safari, Preview and Mail.

| Command | Shortcut | Note |
|---|---|---|
| Today · Sky · Calendar · Charts · Works · Court · Record · Library | ⌘1 – ⌘8 | Go |
| Now | **⌘T** | Sky and Calendar, as in Calendar.app. Automatic window tabbing is disabled, so ⌘T is not New Tab. Show Fonts stays in Format ▸ Font. |
| Previous / Next unit | ⌘← / ⌘→ | Text fields keep these keys. |
| Previous / Next view in a space | ⌥⌘← / ⌥⌘→ | Segmented control |
| Go to Date… | ⇧⌘T | As in Calendar |
| Back / Forward | ⌘[ / ⌘] | Yield to indent and outdent while text in the Pages editor has focus; Go menu ▸ Back / Forward always works. |
| Open Quickly | ⇧⌘O | Replaces ⌘K. Results from locked scopes require unlocking. |
| Find in this content | ⌘F, ⌘G / ⇧⌘G | |
| Search Astrum (the toolbar field) | ⌥⌘F | Scopes: Everything · Record · Canon · Library |
| Copy with Citation | ⌥⇧⌘C | |
| Show / Hide Sidebar | ⌃⌘S | |
| Show / Hide Inspector | ⌥⌘I | |
| Inspector panes: Sky · Record · Sources · Oracle | ⌥⌘1 – ⌥⌘4 | Xcode's precedent |
| **Enter / Leave Altar** | **⌃⌘A** | Leaves ⌥⌘A (Deselect All) to lists |
| Enter Full Screen | ⌃⌘F | System |
| New (in context) · New Chart… · New Question | ⌘N · ⇧⌘N · ⌥⌘N | |
| Capture (global) | ⌃⌥⌘O | Checked for conflicts at setup; reassignable |
| Find a Time… | ⇧⌘F | |
| Commit · Seal · Save in sheets | ⌘↩ | |
| Begin Rite | ⌘R | |
| Pin This Moment | ⌘D | Sky only |
| Print (the Almanac, in Calendar) | ⌘P | |
| Highlight (reader) | ⌃⌘H | Preview's shortcut |
| Settings | ⌘, | |
| Export Book of Results…, Add Collection…, New Vigil… | Menu only | |

**Keys inside content**
- **Lists:** ↑ ↓ move, Space opens Quick Look of the stamp, Return opens, ⌥-click opens beside.
- **Judgment rows:** 1 Hit · 2 Partial · 3 Miss · L Later, only while the row has focus.
- **Astrolabe:** arrow keys move from planet to planet; Return opens the popover.
- **Ribbon:** ← → move between hours; Return selects; B toggles the bell.
- **Rite:** Space toggles breath or drum, ← → step, B rings the bell, ⌘↩ seals, and Esc pauses and asks before abandoning.
- **Player:** Space · J K L · ← → 10 s · ⌘F through the transcript.

**Context menus** on every glyph, moment and object: Ask About This · Find a Time for This · Show Sky at This Moment · Show in Calendar · Open in Atlas · Read in Canon · Open in New Window · Open Beside · Cite in… · Copy with Citation · Copy Link.

**The router.** `astrum://` deep links replace `setTab`, for example:
- `astrum://sky?at=2026-11-16T04:24-05:00`
- `astrum://works/<id>`
- `astrum://charts/question/<id>`
- `astrum://court/<memberId>`
- `astrum://library/<collectionId>/<fingerprint>?page=214` or `?t=1325`
- `astrum://materia/verbena-officinalis`

**App Intents** (Spotlight Actions, Shortcuts, Siri) need Xcode's metadata extraction, which is one reason for the Xcode host.
- Capture an Omen (runs in the background, with a text parameter);
- What Is the Planetary Hour (a snippet with a Ring Bell toggle, at most 340 pt tall);
- Next Hour of [Planet];
- Cast a Horary Now;
- Find a Time for [Intent] (a snippet with Testimonies and Commit);
- Judge [Working] (background);
- Log Offering to [Member] (background; records a response);
- Begin Rite;
- Open [Space];
- Continue Lesson;
- Search My Library.

Suggested Quick Keys are **om**, **hq** and **hr**.

**Spotlight indexing** covers only entries, pages, workings, questions and Court members, locally, through `IndexedEntity`.
- Library text is indexed only if he opts in, collection by collection.
- **While a Touch ID lock is on,** locked entities are removed from the index.
- Deployed sigils are never indexed.

**Focus.** A *Temple* Focus filter lets only the Windows, Rite and Court threads through, and narrows Today to the current working.

---

## 11. First run and the library import

### 11.1 First run (about two minutes; every step can be skipped and revisited in Settings)

1. **Welcome.** One sentence, and the Icon Composer icon: a gilt astrolabe rete on night lapis, with no baked-in highlights.
2. **Place.** Core Location or a typed place. Until a place is set, reference surfaces show hours labelled *Approximate · Set Your Place*, and glanceable surfaces say "Set your place to see the hour".
3. **Nativity** (optional). It is entered once and lives in Charts ▸ My Chart.
4. **Doctrine.** The defaults are shown with their names, each changeable:
   - house system, with the five-degree rule;
   - void school, orbs and body contact;
   - triplicity and bounds;
   - sunrise altitude;
   - ephemeris, with a **Test** button.
5. **Notifications.** He chooses threads. The defaults are Day (passive), Windows, Vigils, Judgment and Court. Hours are off, and the wind-down time defaults to 21:00.
6. **The menu-bar extra**, offered once.
7. **The Altar.** "Open an Altar in full screen now? It becomes its own desktop; swipe to it any time." One line explains why Astrum does not use Dock ▸ Assign To.
8. **Library** (§11.2).
9. **Migration from the current build.** The Tauri build exports through `backup.js` into a dated pre-migration backup, shown in Finder. The Xcode host imports it into its web store, and the mirror then fills `record.sqlite`. A summary follows: "1,214 entries, 86 castings, 4 Court members moved; backup kept here".

### 11.2 The library import

**Add Collection…** (File menu, Library ▸ +, or first run)
1. **Choose the folder.** The open panel starts at the home folder. Access is kept as a **file bookmark** (security-scoped if the app is ever sandboxed). Nothing is copied.
2. **Detect.** Astrum identifies the kind of collection: *Course library* (video plus Markdown), *Book library* (PDF, EPUB and scans) or *Mixed*. It shows counts and sections before indexing anything, and he names the collection.
3. **Index in visible, resumable stages.** Progress shows in the collection header and in Settings ▸ Library.
   - **Catalogue:** the file tree, kinds, durations, page counts and `.md` headings.
   - **Read:** text from Markdown, EPUB and searchable PDFs, into FTS5.
   - **Recognise:** on-device Vision OCR, but only on power, only when idle, and paused when the Mac is hot. It records confidence per book and never writes into his PDFs.
   - **Align (course libraries):** SpeechAnalyzer transcribes each lesson, and each `.md` is **scored** against the machine text. It becomes the transcript if the score is above threshold, and Lesson Notes otherwise. Headings become chapters only when they anchor to the audio. This runs lazily: on first open, then in an idle queue across all 653 videos.
   - **Thumbnails:** made locally.

**Rune Soup** (`<course library folder>`, 219 GB)
- **Structure:** a course library. RSPM Courses, The Foundations Course and Bonus Member Material become shelves of courses, with lessons as episodes. The 4 EPUBs become Books. `_previous` folds into **Earlier Editions** on each lesson.
- **Links:** Study modules (The Dead, Building Your Posse, The Stellar Tradition and so on) link to the matching lessons by on-device topic match. He can correct any link.

**Alchemy & Herbalism** (his Desktop folder)
- **Desktop permission:** before the open panel appears, one line explains that macOS will ask to let Astrum read his Desktop folder.
- **iCloud placeholders:** if Desktop & Documents in iCloud with Optimise Storage has left dataless placeholders, Astrum says how many ("142 items are in iCloud only"). He can choose **Index Local Files Only** (the default) or **Keep Downloaded…**, which explains the Finder setting.
- **Shelves and editions:** shelves come from subfolders, and **Editions** groups duplicate scans and translations. He can confirm or split each group.
- **Formats:** DjVu, MOBI/AZW3, CHM and CBR are listed honestly with **Open With…**. A DRM-protected EPUB shows "Unavailable · Open in Books". A folder of page images can be treated as one book.
- **Early-modern type** (long s, blackletter, Latin) is flagged "OCR confidence low", with **Search Page Images** as the fallback.
- **Athanor sources** are matched to his files ("you own 2 of 3").

**More folders.** Each one becomes its own collection and its own sidebar row under Library, through the same flow. A collection can be renamed, reordered, paused, re-located if it moves (via its bookmark and content hash), or removed. Removing a collection deletes only Astrum's index, never his files. A missing folder shows *Folder Not Found* with **Locate…**.

### 11.3 The library privacy model

The repository is public and the content is copyrighted. **The record never contains library text, titles or paths.**

1. **Opaque references.**
   - A citation in the record holds only:
     - `collectionId`;
     - the **file fingerprint**: SHA-256 of the first MiB plus the file size;
     - the **locator**: `{page, quads}`, `{cfi}` or `{t}`;
     - `quoteHash`: SHA-256 of the normalised quote.
   - Cited in [Work] links, Oracle notes, Court links and Study references are opaque ids in the same way.
2. **Resolution at display time.** Title, page label and quote come from `Library/library.sqlite` only when shown, on this Mac. Anywhere they cannot be resolved (the iPad, an export, another Mac) the citation renders as **[Library citation · on this Mac]**.
3. **The Library store holds the material.** Notes on passages, highlights, and cards made from passages live there. The Study deck references library cards by id, and they resolve only here.
4. **Exports and sync.** The sync serializer, `backup.js` and Book of Results render the placeholder.
   - An export sheet offers **Include library titles and quotes in this export**. It is off by default, applies to that one export only, and warns that the material is copyrighted.
   - The sync serializer refuses any citation object that carries `title`, `quote`, `text` or `path`.
5. **Guardrails from the first commit.**
   - Library stores are excluded from git, backups, AstrumSync, logs and crash reports, and from Spotlight unless he opts in.
   - **A CI test** builds 8-gram shingles and titles from a synthetic library fixture. It creates citations, notes and cards from that fixture, runs the sync payload, the backup export and the Book of Results export, and **fails if any 8-gram or title appears**.
6. **The Oracle.** A passage leaves the Mac only through the Quote Card's per-session consent, with a visible indicator.
7. **Locks.** A Touch ID Library lock hides Reading Now, the shelves and the Library rows in search until he unlocks.

---

## 12. Accessibility

- **Native first.** Chrome inherits Reduce Transparency, Increase Contrast, Reduce Motion and Show Borders. WebKit has no `prefers-reduced-transparency`, so the shell watches the accessibility display options and pushes `data-reduce-transparency`, `data-increase-contrast`, `data-differentiate-without-color`, `data-reduce-motion` and `data-show-borders` onto the web root. It also pushes **both** accent values.
- **Never colour alone.** Every planet mark carries its glyph. Every state has its own texture (§9.4), and verdicts are ● ◐ ○ ◌. Differentiate Without Color adds words. Monochrome and tinted widgets lose nothing.
- **Contrast, measured and gated:**
  - **Text:** body at least 4.5:1 (§9.2); placeholders and disabled text are `label-3`, at 3.9:1 or better. Night text is at least 4.5:1.
  - **Graphics:** every **non-text token** is at least 3:1 on window, platter, raised and Night, including the void stroke, `label-3` used as a stroke, the closed-season dash, the now-needle and the planet tints.
  - **The CI gate** computes every pair and fails the build below its floor.
  - **Increase Contrast** switches to label-strength secondary text, 1.5 pt hatching, a stronger void stroke (#5E5E64 / #9A9FAD), 1 px platter borders and the variant planet hues.
- **Text size.** macOS has no Dynamic Type, so Settings ▸ Text Size (five steps) scales every web token through `--text-scale`, never below the floors. ⌘+ / ⌘− work in every reading view.
- **Focus.**
  - Web content draws a 3 px **outline** in the accent at 55% with a 1 px offset. It follows each element's own shape, never reshapes it, and never replaces its shadow or border.
  - Inside figures, focus and selection are shape-based.
  - **The key-view loop** crosses native and web boundaries by edge detection plus `makeFirstResponder` (§4.1), and it is tested.
  - Every drag has a keyboard alternative.
- **VoiceOver.** Every instrument has a structured equivalent:
  - the astrolabe has a Planets rotor ("Mars, 17 degrees 38 minutes Leo, peregrine, direct, out of sect, ruler of this hour");
  - the ribbon reads as 24 hours ("Hour of Mars, 6th hour of the day, 11:47 to 12:39, current, 25 minutes left");
  - Testimonies read as three shares plus the criteria list and any break;
  - each calendar cell reads as one sentence;
  - the void reads as "Void of course, Saturday 7:32 PM to Sunday 12:11 AM, then the Moon enters Leo";
  - transcripts are read with timestamps.
  
  Greek, Arabic and Latin names carry language tags. Hour changes are announced only if he opts in.
- **Motion and sound.** Reduce Motion gives crossfades only, and nothing flashes more than three times a second. The bell always comes with a visual. Lessons are captioned, and the breath pacer is visual.
- **Media and reading.** OCR makes scanned books readable by VoiceOver. Paper, Dusk and Lamp themes are offered, and playback runs from 0.75× to 2×.
- **Trust.** Optional Touch ID locks protect Record and Library. While a lock is on:
  - widgets and menu rows are redacted (`privacySensitive`);
  - locked entities leave the Spotlight index;
  - Open Quickly results from locked scopes require unlocking;
  - notification previews are generic.
  
  Times follow his locale and his 12/24-hour setting.

---

## 13. What we cut or demote, and why

**Cut**
- **The phone-era shell:** the 430 px phone column, the Overlay hidden-title chrome and the 480 pt minimum width. A Mac app owns its window, and the system draws its frame.
- **The scrolling AstralLiveBar** (`ticker-scroll`). It is a crawl idiom, ignores Reduce Motion and is set in 8.5 px type. Its facts move to Up Next, the menu bar and the Altar.
- **The old navigation:** the hamburger drawer, the floating six-action button and the ⌘K four-mode palette. They are replaced by the sidebar, complete menus, Open Quickly, search, Control Center and Spotlight.
- **Every CSS glass tier and specular rim**, though the class names live on as opaque platters (§9.1).
- **The non-Apple type habits:** Georgia as the interface face, tracked capitals, emoji, the six duplicated glyph pairs, the in-app tint setting, and font sizes under 10 px (clamped by the legacy shim until each room is redesigned).
- **The Three Rings.** On an Apple platform they read as Fitness rings. They are replaced by the **Testimonies** scales.
- **Seconds at rest:** the 96 pt mm:ss Altar countdown, `Text(timerInterval:)` in widgets, and the dynamic toolbar subtitle.
- **An auto-collapsing sidebar and dynamic Moments rows.**
- **Find a Time as a modal sheet,** and web content inside sheets.
- **A forced verdict on retiring a sigil,** and every surface that put deployed sigils back in view.
- **Time Sensitive notifications in v1,** and every profile-backed entitlement.
- **A Swift port of the engine** as the widget fallback.
- **A custom Dock tile.**
- **Names:** "Observatory", "Record Vitals", statistical "Highlights", the "Desk" noun, and "Night" as a reading theme.
- **Duplicates collapsed:**

| Before | After |
|---|---|
| 7 time-finding scanners and 4 commit buttons | **1 Find a Time and 1 Commit** |
| 2 step-throughs | **1 Rite** |
| 5 planet pickers | **1** |
| 3 AI chats and about 13 AI buttons | **1 Oracle** |
| Solar Return computed twice; Lots in three places; birth data in two | **One each** |
| The planetary hour shown six times on one screen | **Once per surface, plus the ribbon cell** |

- **Rejected from the concepts:**
  - the auto-wallpaper painter;
  - sky thumbnails on notifications;
  - live sky miniatures in the sidebar;
  - `backdrop-filter` platters;
  - the Loop glint and the "Counted." toast;
  - verb-named spaces;
  - "Cast the shield instead";
  - the cinnabar rubric colour;
  - the daily drop cap;
  - "The channel is open";
  - Dock ▸ Assign To.
- **Every finance shape**, and the word "watchlist". The module is renamed `vigil.js`.

**Demoted** (kept, folded behind one gesture)
- **Customize Face** → Phase 9. v1 ships one fixed face each for Today, Sky ▸ Now and the Altar.
- **The 7×7 aspect grid** → the Table view of the Aspects page.
- **Cycles and the Great Mutation** → Atlas ▸ Cycles and Calendar ▸ Year.
- **Fractal L4 seconds** → the Regulator and the last 2 minutes before an alignment.
- **The AI sky gloss and the season report** → Oracle modes, on demand.
- **Elections theory** → Canon, by source.
- **The 0–100 score** → secondary ink.
- **Fractal, the Work's Season, Lots and Testimonies for a pinned intent** → optional complications.
- **Backup warnings** → a Settings badge and one quiet notification.
- **The menu-bar countdown** → optional, off by default.
- **Later phases:** widgets beyond seven, the Places map, tuned bells.

---

## 14. Build order

Every phase ships something he can feel on his Mac. Weeks are approximate and assume one person.

| Phase | Weeks | What he can feel |
|---|---|---|
| **0a · Truth** | 1–3 | His current Astrum tells the truth: local sunrise, honest elections and full horary considerations. |
| **0b · Signing and widget gate** (in parallel) | 1–2, then an 8-day run | A signed Xcode-host build with a Small Hour widget on his desktop for eight days, built with no profile-backed entitlement. |
| **1 · The window** | 4–9 | Astrum opens as a real Mac app, with Today as its face and Sky ▸ Now. Every legacy room still works and is legible. |
| **2 · The Loop** | 10–14 | Find a Time in the Calendar, Commit, the Rite, Judge with Undo, and the Journal: electing and judging are faster than today. |
| **3 · Glance and capture** | 15–18 | The hour in the menu bar, a three-second omen with a photo, a verdict from a banner, and the Altar on its own desktop. |
| **4 · Widgets and controls** | 19–21 | Astrum on every desktop and in Control Center; first App Intents and Spotlight. |
| **5 · Charts, Court and the bench** | 22–26 | Questions with Lilly's considerations, the Lilly Square, the six-kind Court with petitions, the Athanor bench with safety first, and veiled sigils. |
| **6 · The Library** | 27–34 | He watches a lesson and cites a page from his own herbal inside an operation, and nothing copyrighted leaves the Mac. |
| **7 · Depth and intelligence** | 35–39 | His Oracle with the Quote Card, Foundation Models for small tasks, Findings, and the full Sources and Doctrine panes. |
| **8 · The record store** | after 39, with the iPad client | SQLite becomes the source of truth on both devices together; iPad and web follow from the same tokens. |
| **9 · Finish** | ongoing | The Horizon figure, Customize Face, deferred widgets, tuned bells, Places. |

**Phase 0a · Truth.** These are the fixes still open at `af49b1d`. That commit already fixed the 1–24 hour number, the labelled 06:00 approximation without a place, and the midnight-counted hours in the election scorer.
- **The sky and its display:**
  - local sunrise and sunset on Sky, which still shows UTC today;
  - `planetaryHoursForDay`, `twilightTimes`, `vocSpans`, `horizontalCoords`, the Moon's bright-limb angle, and the **`skyTimeline`** serializer;
  - the Ephemeris line and the fidelity test.
- **Elections:**
  - `mbad` gains the Moon's conjunction with a malefic's body, with the **body-contact rule** keyed to the void school and moieties;
  - the two new criteria (*beholds the significator*, *no malefic in the rising sign*) and the named cautions;
  - angularity in the Doctrine house system, with Lilly's five degrees;
  - `getDignity`'s peregrine test across all five dignities, using `essentialScore`;
  - the **elective-memory shrink**;
  - the Talisman, Gathering (Culpeper) and Begin the Work templates;
  - schedules and the Almanac filtered on `links.electionWindow`, so talisman windows become visible.
- **Horary:** the full *Christian Astrology* considerations in `horary.js`, each with Canon chips. That includes the hour-ruler agreement, the Moon in late degrees, Saturn in the 1st, the Ascendant's lord combust, an afflicted 7th or its lord, and Lilly's exceptions for a void Moon in Taurus, Cancer, Sagittarius and Pisces. Orbs follow Doctrine (moieties or a fixed working orb).
- **Wiring:**
  - **OraclePanel grounding** in `App.jsx`;
  - **`omensNear`** wired into the inspector;
  - `intentionId` on castings, and Abandoned as a terminal stage;
  - the sigil **Release Unjudged** path, which records *unknown* without asking.
- **`facts.v1`:** the wording table, the fixture generator and the golden tests.
- **Library guardrails:** git and log exclusions, plus the n-gram CI test.
- **Materia and the Athanor:** the toxicity flag, with the study-only test.

**Phase 0b · Signing and widget gate**, run in parallel from week 1:
1. An Xcode host skeleton signed with his Personal Team, with no provisioning profile.
2. A sandboxed widget extension (Small Hour) and one Control.
3. The Team-ID-prefixed app group; an Active notification.
4. The JavaScriptCore engine fallback.
5. Install it, and confirm it still launches and renders after **eight days**.

**Phase 1 · The window**
- **The Xcode host:** fixed-row sidebar, toolbar segmented views, the native inspector (Sky and Record panes), menus, the toolbar-tab Settings window, state restoration, and disabled window tabbing.
- **The Worker migration** for every engine and scan.
- **The native write-through mirror and inbox** (§4.2).
- **Legacy compatibility:** `.card`, `.chip` and `.glass-*` re-implemented as opaque platters; the **`[data-legacy]` shim**, which clamps font sizes to 10 px or more and removes tracking and capitals.
- **Redesigned rooms:** **Today** and **Sky ▸ Now**, the planet popover, and detail pages.
- **Fidelity tests:** resize, the key-view loop and VoiceOver crossing the boundary, light/dark switching at the same moment, SF metrics at 13 pt.
- The Tauri backup import.

**Phase 2 · The Loop**, redesigned in order of how often he uses each part:
- **Find a Time** as a Calendar mode, with the Now row and the **SwiftUI Commit sheet**;
- Testimonies; Calendar Month and Year; Planetary Seasons; Vigils;
- **Works** objects with stage tracks; the **Rite** window with its Court link;
- Judge everywhere with Undo;
- **Record ▸ Journal and Results**.

**Phase 3 · Glance and capture**
- The menu-bar extra, with template images and the void badge.
- The login item and the **in-process scheduler**, with a 12-hour pending backstop.
- Notifications with threads, the delegate-to-inbox path, and Calendar alarms.
- **Quick Capture** with photos.
- **The Altar**: windowed and full screen, with idle return, Night and keep-awake.

**Phase 4 · Widgets and controls**
- The seven widget kinds and four controls.
- App Intents: Capture, What Hour, Judge, Cast Horary, Begin Rite.
- Spotlight and Quick Keys.

**Phase 5 · Charts, Court and the bench**
- **Charts:** Questions (with the considerations from Phase 0a), geomancy, the Lilly Square, My Chart tabs including Declinations, People.
- **Court:** six kinds, four log kinds, petitions, Seed and Release.
- **Athanor:** the bench with safety first, its Library tab, photos, and the Completed & Abandoned list.
- **Sigils:** the veil.
- The Almanac in print.

**Phase 6 · The Library**
- Collections, import and bookmarks; Desktop permission and iCloud handling.
- FTS5, OCR, and Align with transcript scoring.
- The Reader, the Lesson Player (with the Now Playing fallback) and the Shelf.
- **Opaque citations**, Materia, Open Beside and the Library search scope.

**Phase 7 · Depth and intelligence**
- The Oracle engine policy, the Quote Card and consent.
- Foundation Models for small tasks, within a token budget.
- Window ▸ Oracle; the full Sources pane; Findings; the complete Doctrine pane.
- Opt-in library indexing in Spotlight; the Temple Focus filter.

**Phase 8 · The record store.** The shared schema package; the iPad client on the same schema; SQLite as the source of truth on both; migration through `backup.js`.

**Phase 9 · Finish.** The Horizon figure, Customize Face, the deferred widgets, Day Liturgy if macOS 27 supports it on the Mac, tuned bells, and the Places map.

---

## 15. Open questions

1. **The free Personal Team.** On his Mac, does the Team-ID-prefixed app group work for the widget extension without a profile, and does the build still launch after eight days? If not, is the JavaScriptCore fallback enough, or does he choose the $99 programme for exactly the list in §6?
2. **Activation across Spaces.** When the Altar is full screen, does a widget or notification click switch Spaces before Astrum can route it to the work-desktop window?
3. **WKWebView and native chrome.** Do macOS 26 scroll-edge effects engage over WKWebView scrolling? If not, content starts below the toolbar.
4. **The window corner radius** on macOS 26, to seed `--r-window`.
5. **OCR and alignment.** Are Vision's document recognition and SpeechAnalyzer's word timings as capable on macOS 26 as documented? What threshold separates a `.md` transcript from lesson notes on a sample of his 696 files (0.85 is the starting value)?
6. **Picture in Picture.** Can an AVPlayerView be kept alive and its PiP started programmatically on macOS when he navigates away, or does the Now Playing mini-player carry it?
7. **Foundation Models.** Is Apple Intelligence enabled on his Mac in his language? Does `contextSize` report about 4,096 tokens there?
8. **His place.** Where does he live and work, and does he travel? That decides whether a Places list ships in v1.
9. **Doctrine defaults.** Which defaults should ship for the void school, orbs (this design proposes moieties for horary), triplicity scheme, bounds, house system and five-degree rule, mansion zodiac and sunrise altitude?
10. **The ring-break cap.** Should a broken Moon testimony cap the grade at Good, or only break the scale and name the reason?
11. **Culpeper's "houses of her enemies".** Should the default be the signs of Saturn and Mars, or her detriment and fall? Should the 1652 Epistle's "let Sol be angular" join the Gathering template, or stay only in Canon?
12. **Petitions.** Should petitions carry an optional check-in by default, or only when he adds one?
13. **Sigil blind interval.** Should there be any default interval, or none at all (the current design)?
14. **The Alchemy folder.** What is its exact name and path? Is Desktop & Documents in iCloud on? What is the mix of DjVu, MOBI and DRM'd EPUB, and how many scanned pages need OCR, which sizes the queue?
15. **Pre-approved Oracle scopes.** Which record scopes may Claude read without asking each session? Should Claude be allowed on the Altar at all?
16. **Provenance curation.** Who tags each correspondence row (especially planetary oils and stones) as Canon, Unsourced or Modern, and against which editions?
17. **Waking for night windows.** Is a Calendar alarm on his iPhone an acceptable way to be woken for windows like Mon 16 Nov 04:24, or does that argue for paying for the Time Sensitive entitlement?
18. **The Court as a space.** Revisit after a month of use. If he visits it mainly through Today rows and feasts, it could fold into Record.
19. **macOS 27 features** stay gated until verified on his machine: Extra Large Portrait on the Mac, the edge-to-edge sidebar, Show Borders, the uniform toolbar.

---

## Appendix A · Jury findings and where they are resolved

| Severity | Finding | Resolution |
|---|---|---|
| Critical | Library text leaks into the synced and exported record | Opaque citations, display-time resolution, placeholders in exports, passage cards in the Library store, an n-gram CI test (§11.3) |
| Critical | The SQLite migration ignores sync and the iPad | Mirror first, wire format frozen, golden cross-device test, switch only in Phase 8 (§4.2) |
| Major | Phase 1 deletes CSS that legacy rooms need | Class names re-implemented as opaque platters; the `[data-legacy]` shim; redesign by frequency of use; Find a Time and Commit in Phase 2 (§9.1, §9.6, §14) |
| Major | Phase 0 overloaded and out of date | Rebased on `af49b1d`; split into 0a and 0b; Worker migration moved to Phase 1; the no-place rule decided (§2.1, §14) |
| Major | Free team and the widget data path | No profile-backed entitlements; Team-ID group; sandboxed extension only; no Time Sensitive; JavaScriptCore fallback; the $99 list (§2.1, §6) |
| Major | "The design is identical on either host" | Xcode host committed; focus tests in the spike (§4.1) |
| Major | Auto-collapsing sidebar | Fixed rows, persisted disclosure, toolbar segmented views, Moments as a fixed view (§3.2) |
| Major | Three Rings read as Activity rings | Testimonies scales; traditional labels; weighted shares; struck end-caps (§7) |
| Major | Seconds-ticking countdowns | One stillness rule; the ruler as Altar hero; widget minute precision; no dynamic subtitle (§2, §5.1, §6, §9.10) |
| Major | One fact, many wordings | `facts.v1` table; every example regenerated; the ribbon cell as the only secondary hour mark (§2.3) |
| Major | Lost everyday features | Now row; the Testimonies complication; photos; Abandoned; the Rite's Court link; ephemeris status (§3.4, §4.4, §7) |
| Major | Lost engine outputs | The *Survives as* column, with every item the jury named placed (§3.5) |
| Major | Court shrunk | Six kinds; four log kinds; petitions; Seed and Release kept (§3.4, §7) |
| Major | The sigil lifecycle fights forgetting | Veiled; never surfaced; no automatic check-ins; Release Unjudged (§7) |
| Major | The Oracle shown before his judgment | Inspector defaults to Sky in Questions; Judge locked until he saves; his judgment shown first (§3.3, §8.3) |
| Major | Incomplete horary considerations; a fictitious check | Full CA considerations in Phase 0a; the hour test added to the engine; W4 re-run with the 7th caution; timing corrected to 12 h 50 min (§4.4, §8.3, §14) |
| Major | Showcase elections fail their own rules | Culpeper's rules encoded; named cautions; the body-contact table; both windows re-run (§7) |
| Major | Find a Time as a modal sheet | A Calendar mode; a sheet only for Commit; results kept as a Vigil draft; a second window for Sky (§4.4 W3b, §7) |
| Major | Web content in native sheets | SwiftUI form sheets; detail pages in content; at most one pre-warmed shared webview (§2.1, §4.1) |
| Major | Oracle engine, context and consent | His engine by default; narrowed consent; Foundation Models for small tasks with a budget (§7) |
| Major | Planet hues collide with semantic and accent colours | Gilt for content semantics; shape-based selection; on-accent glyphs; light Saturn #5C4A32; the matrix re-run (§9.2, §9.3) |
| Major | One hatch, four meanings | Four textures, tested in every widget mode (§9.4) |
| Major | Contrast claims not met | New void stroke; combustion by shape; `label-3` re-measured; a CI gate (§9.2, §9.4, §12) |
| Major | Reduce Transparency hides ribbon glyphs | Opaque tints left unchanged; an Increase Contrast outline (§9.3, tokens) |
| Major | Altar Sky background illegible | Platters tinted by the sky; a clamped wash; the CI gate (§5.1, §9.2) |
| Major | The focus ring reshapes and erases | An outline, with no radius override; shape-based focus in figures (§12, tokens) |
| Major | Menu-bar size, a lost hour, Unicode | 16 pt template images; the void as a badge; fixed width only with the countdown (§5.2) |
| Major | Transcript alignment assumes verbatim .md | Align-stage scoring; Lesson Notes and a machine transcript; anchored chapters; Now Playing fallback (§7, §11.2) |
| Major | Materia and lab safety | Toxicity flag; safety-first header; study-only paths enforced by test (§7) |
| Major | The ephemeris is never shown | Ephemeris line; approximate precision; numeric sunrise; fidelity test (§7) |
| Minor | Spaces behaviours; Altar exits | Behaviours per window; idle return on; clicks open popovers (§5.1, §5.4) |
| Minor | Storyline contradictions | One fixture; engine grades; Design-stage action; a strict 48-hour list; the redundant drag removed (fixture, §4.4, §8) |
| Minor | Ribbon click arms the bell | Click selects; double-click or the context menu arms; the cell's bell glyph toggles (§7) |
| Minor | Widget density; accidental verdicts | Small Hour simplified; half-day Large; Undo for 10 min (§6) |
| Minor | Name collisions and coined terms | Glossary; Findings, Dusk, Planetary Seasons and Results by Condition; Altar only (§2.2) |
| Minor | Shortcut conflicts | ⌃⌘A for the Altar; window tabbing disabled; Pages editor yields ⌘[ ⌘]; menus audited (§10) |
| Minor | A haptic on a keyboard Seal | Seal is visual; haptics only on the trackpad (§7, §9.11) |
| Minor | Clear/Tinted Liquid Glass is in 26.1 | Treated as baseline; Tinted tested; widget modes kept separate (§9.1) |
| Minor | Civil date and the planetary day | "Night of Thursday" title; Before Sleep at wind-down (§2.3, §4.4) |
| Minor | Scattered reference material | Canon by source; Read in Canon everywhere; Athanor Library tab (§7) |
| Minor | Astrolabe hour arcs | True astrolabe with a nadir marker; the Doctrine almucantar; a ±30 s golden test (§7) |
| Minor | Pending cap and the bell | In-process scheduler; a 12 h backstop; the bell rings in-app; the delegate-to-inbox path (§5.3) |
| Minor | Smaller token defects | Floors; radii from actual insets; caution by shape; no drawn edges; `.num` scope; 900 pt margin threshold; both accents; Night #FF2D1F (tokens, §9) |
| Minor | Settings and the Dock tile | Toolbar-tab Settings with 8 panes; Dock badge only, off by default (§3.5, §5.2) |
| Minor | Touch ID lock gaps | Redaction, Spotlight removal, Open Quickly unlock (§12) |

**Sources consulted today:**
- Apple DTS on free provisioning profiles expiring after 7 days (developer.apple.com/forums/thread/712540).
- Team-ID-prefixed app groups on macOS 15 and later (developer.apple.com/forums/thread/763826).
- `SystemFormatStyle.Timer` and `maxPrecision` (developer.apple.com/documentation/swiftui/systemformatstyle/timer).
- The Foundation Models context window of about 4,096 tokens (developer.apple.com/forums/thread/790736), and `contextSize`.
- macOS Tahoe 26.1's Clear/Tinted Liquid Glass setting (macrumors.com/2025/11/03/apple-releases-macos-tahoe-26-1).
- Culpeper's gathering directions (skyscript.co.uk/decumbiture3.html), checked against the repo's own Canon entry for the 1652 Epistle.
- Positions, grades, voids and hours were produced by the repo engine at `af49b1d` (Meeus path), with the jury's scratchpad scripts and new ones in the same folder. Nothing in the repository was modified.