VISUAL LAYER: how Liquid Glass surrounds the web content

0. PRINCIPLE
macOS draws every piece of Liquid Glass; Astrum's own code draws none for the chrome. Apple's HIG is explicit: "Don't use Liquid Glass in the content layer." Glass belongs to navigation and controls. So:
- The system glass of NavigationSplitView, the toolbar, the inspector, MenuBarExtra, widgets and notifications frames the content.
- The web rooms sit on an opaque content layer in the studio's palette.
- CSS never imitates glass for chrome. It can't anyway: WebKit's CSS backdrop layers are windowServerAware:NO, so they can't sample the desktop. backdrop-filter:url() refraction is unmerged (WebKit PR #68614). WebKit has no prefers-reduced-transparency.
- The main window is not transparent, which matches Apple's own apps.

1. NATIVE VS WEB
Native (SwiftUI / AppKit):
- window frame and traffic lights;
- sidebar (source list), toolbar with title, subtitle, search and segmented controls, inspector column;
- menus and ⌘ shortcuts, the Settings window;
- MenuBarExtra (title and popover), the Sky panel, widgets and Controls, notifications;
- the app icon;
- Lesson Player (AVPlayerView), PDF Reader (PDFView), Quick Look;
- open and save panels, alerts and confirmation dialogs.

Web (React in WKWebView):
- the 34 rooms' content: SVG wheels, orrery, charts, forms, lists and cards;
- the Oracle chat, until it becomes native in Phase 5;
- in-room tab bars, until the useToolbar() hook lifts them into the native toolbar;
- EPUB and Markdown typesetting, in the script-less ReaderWebView.

2. MAIN WINDOW STRUCTURE
- Window("Astrum", id:"main"), default (titled) style, unified toolbar. Body: NavigationSplitView { SidebarView } detail: { RoomHost }, plus .inspector(isPresented:).
- Built against the Xcode 26+ SDK, the sidebar becomes floating glass with the traffic lights inside it. Toolbar items sit on glass, the window gets the larger corner radius that toolbar windows have, and macOS 27's tighter corners and glass-strength slider apply automatically. The macOS 27 details come from press reports.
- Sidebar rows are Label(room.title, image: room.symbol). Room symbols come from a custom SF Symbols set (.symbolset in the asset catalog) for planets, signs and rooms. The studio supplies the art, and the stock list style supplies the selection highlight.
- RoomHost wraps the app-owned WKWebView in an NSViewRepresentable:
  - drawsBackground is off;
  - underPageBackgroundColor equals the content-surface token for the current appearance, so there is no white flash;
  - the native placeholder shows until shell.ready.
- The web view respects the toolbar's safe area by default: content starts below the toolbar.
- WKWebView is not a SwiftUI ScrollView, so the system scroll-edge effect will most likely not apply. Two enhancements need testing on the device and are unverified:
  - full-height content using WKWebView obscuredContentInsets, plus a CSS top-edge fade the height of --chrome-top-inset;
  - .backgroundExtensionEffect() on the detail column.
- Never do any of these:
  - put an NSGlassEffectView behind the web view (WWDC25 session 310 warns against glass placed behind content as a sibling, and this is the pairing in the window-vibrancy#229 crash);
  - make the window transparent;
  - call the private _setUseSystemAppearance:;
  - use -apple-visual-effect.
- Crash-loop guard: a pending marker is written before the first web load and cleared after about 20 s of stable running. If it is still there at the next launch, start with the glass-free fallback presentation (an opaque window with no floating sidebar) and say so in Settings.

3. GLASS ON NATIVE-ONLY SURFACES
- Sky panel:
  - Window("Sky") with .windowStyle(.plain) and .windowResizability(.contentSize).
  - Content is AstrumSkyKit views inside a GlassEffectContainer with .glassEffect(.regular, in: a rounded or ConcentricRectangle shape). Buttons use .buttonStyle(.glass). .interactive() and NSView.cornerConfiguration only behind #available(macOS 27, *).
  - Level is normal−1; collectionBehavior is [.stationary, .ignoresCycle, .fullScreenAuxiliary]; it does not join all Spaces.
  - The panel is never key, so it shows the system's inactive glass. 'Vivid' swaps in an NSVisualEffectView (.hudWindow, state .active). An opt-in respondsToSelector-guarded _setForceMainAppearance: is offered as an experiment; it is private and reported by one project.
  - 'Pin to Wallpaper' uses .windowLevel(.desktop) and ignores mouse events, so it is display-only.
- MenuBarExtra (.window style): the system popover material. Inside it, plain SwiftUI text and controls; no extra glass stacked on glass.
- The Lesson Player, PDF Reader and Quick Look use the system's own chrome and controls.

4. TOKENS: ONE SOURCE, TWO OUTPUTS, RUNTIME SYSTEM VALUES
- The design studio owns src/ui/tokens.json, with semantic names only:
  - surface.window, surface.content, surface.raised;
  - fill.1–3, label.1–4, separator, accent;
  - planet.<name> and nature.<benefic|malefic|mixed>, each with light, dark and high-contrast values;
  - radius steps;
  - type scale: largeTitle 26, title1 22, title2 17, title3 15, headline 13 bold, body 13, callout 12, subheadline 11, footnote and caption 10. 10pt is the floor; today 685 of 1,234 sizes are below it.
- scripts/export-tokens.mjs generates two outputs:
  - (a) src/ui/tokens.css, custom properties under :root[data-appearance=dark|light] and :root.increase-contrast;
  - (b) apple/Shared/Tokens.xcassets colorsets (Any / Dark / High Contrast) plus Tokens.swift. The app, the Sky panel and the widgets all read these through AstrumSkyKit.
- theme.js keeps its exports but repoints them: F → var(--font-text); GOLD, L, T → token variables. --tint-rgb and --glass-bg stay as dark aliases during migration. alpha(color,a) emits color-mix() to replace the 198 hex-alpha concatenations, which a codemod rewrites room by room.
- System to web at runtime, through the bridge 'appearance' event, sent at launch and on change:
  - colorScheme;
  - the effective accent, NSColor.controlAccentColor converted to sRGB. Astrum may define its own AccentColor, as Notes uses yellow, but the system's choice wins unless he picks Multicolor, so always pass the effective value;
  - reduceTransparency, increaseContrast, reduceMotion.
  JS sets html[data-appearance], html.reduce-transparency, html.increase-contrast and --sys-accent.
- WebKit's -apple-system-* CSS color keywords may expose system label and fill colours directly. That is unverified; the default is the bridged values.
- Type: the web uses system-ui (SF Pro), ui-serif (New York, a good 'temple' display voice), ui-rounded and ui-monospace, with font-variant-numeric: tabular-nums for times. Native uses .system with the matching designs. The same faces appear on both sides of the seam.
- Glyphs: native surfaces use the custom symbol set. The web uses an SVG sprite exported from the same source. Any text glyph is followed by U+FE0E so zodiac signs never render as colour emoji. Menus use text only, because macOS 27 hides menu symbol images by default (release note 170477566).

5. CONTENT-LAYER CSS RULES
- No backdrop-filter on cards, chips or orbs (about 84 blur layers removed). Blur is allowed only on in-page sticky headers and popovers, always with the -webkit- prefix, and is removed under html.reduce-transparency.
- Delete ::-webkit-scrollbar so macOS overlay scrollbars return.
- On control-like elements: user-select:none and cursor:default. Native-looking focus via :focus-visible in the accent, and ::selection in the accent.
- The content pane gets a readable max-width (about 720 px) and container-type:inline-size, so rooms can adopt multi-column layouts later through container queries.
- No infinite animations: the orrery becomes a CSS keyframe animation, and the scrolling strip becomes a static subtitle in the native toolbar. Honour prefers-reduced-motion, and pause the 1 Hz clock while lifecycle.visible is false.
- Context menus: the WKWebView subclass's willOpenMenu removes Reload and Inspect in Release builds and adds native items.

6. LIGHT AND DARK
- By default Astrum follows the system appearance, as Apple's apps do.
- If the studio wants a 'Temple (always dark)' option, it is a single native switch, NSApp.appearance = darkAqua. SwiftUI follows it, and WKWebView's prefers-color-scheme follows the view's effective appearance (expected; verify).
- CSS declares color-scheme: light dark. Planet colours have light variants, because the Moon's #C8DDED and the Sun's #F5C518 disappear on white. The light appearance turns on only after every room passes a contrast check.

7. ACCESSIBILITY
- Reduce Transparency:
  - Native chrome, the Sky panel's glass and NSVisualEffectView all adapt automatically.
  - The web gets the bridged flag (WebKit lacks the media query). It drops any remaining blur and switches to solid surfaces.
- Increase Contrast: native adapts automatically, plus the asset-catalog high-contrast variants. The web uses prefers-contrast: more, which WebKit supports, plus the bridged class.
- Reduce Motion: SwiftUI respects it. The web uses prefers-reduced-motion.
- The macOS 27 glass-strength slider: native glass follows it automatically. The web layer draws no glass, so there is nothing to follow, which is why it must not imitate glass.

8. WIDGETS (WidgetKit)
- SwiftUI only: no web views and no NSViewRepresentable; memory stays well under about 30 MB.
- Backgrounds use .containerBackground(for: .widget) with a token fill, which the system replaces in its clear and tinted styles.
- On the Mac desktop the system renders widgets in accented mode (WWDC25 session 278):
  - glyph groups use .widgetAccentable();
  - images that must keep their colour use .widgetAccentedRenderingMode(.fullColor);
  - the feed carries semantic keys, never colours.
- Countdowns use Text(timerInterval:countsDown:) with .monospacedDigit(). They keep ticking while the extension isn't running.
- Families: systemSmall, systemMedium, systemLarge and systemExtraLarge; systemExtraLargePortrait only behind #available(macOS 27).
- Taps use widgetURL and Link with astrum:// deep links.
- When app windows cover them, desktop widgets recede into the system's muted look. They probably appear on every Space, which is unverified. That is why the Sky panel, not a widget, is the surface anchored to his dedicated desktop.
- Controls (Control Center and the menu bar) use ControlWidget with SF Symbols and system styling.

9. APP ICON
- A layered Liquid Glass icon made in Apple's Icon Composer (.icon, introduced at WWDC25 with Xcode 26; not re-verified this session), with default, dark, clear and tinted renderings. The studio supplies the layers.
- Fallback: the existing icns.

10. NOTIFICATIONS AND MENU BAR
- Banners are drawn by the system. Astrum supplies only text, thread identifiers and action titles.
- The MenuBarExtra title is text of about 7 characters with monospaced digits, so it doesn't jitter and survives the notch.

11. FALLBACK SPEC, if the user declines Swift
- Tauri 2.12.x applies Effect::LiquidGlassRegular + Effect::UnderWindowBackground + a tint at runtime through set_effects. It is applied only after PageLoadEvent::Finished, never in the config.
- html, body and #root are transparent only under html[data-glass=native].
- A glass.pending crash-loop marker starts the next launch in 'vivid' (HudWindow, state Active) after a crash. A Native / Vivid / Opaque setting is available.
- An objc2 NSWorkspace bridge passes Reduce Transparency and Increase Contrast to the web.
- trafficLightPosition, with about 28 pt reserved at the top left, and data-tauri-drag-region with core:window:allow-start-dragging.
- The ceiling: one sheet of glass per window, no toolbar or sidebar glass, the titlebar-only corner radius, and no slider tracking in content.

12. ON-DEVICE VISUAL CHECKS (VERIFICATION.md)
- Glass in light and dark mode, and under Reduce Transparency and Increase Contrast.
- The unfocused look; live resize; first paint.
- The sidebar toggle; full screen.
- Spaces, Stage Manager and 'click wallpaper to reveal desktop' with the Sky panel.
- Multiple displays; notch truncation of the menu-bar title.
- Widgets in the clear and tinted styles.
- No colour-emoji glyphs anywhere.