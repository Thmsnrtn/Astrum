THE LIBRARY: native, on-device, any number of collections

Ground rules
- Rune Soup (<course library folder>: 219 GB; 696 .md, 653 .mp4, 4 .epub, plus 2 .pages, 2 .numbers, 1 .xlsx and 1 .jpg) is the first collection.
- Alchemy & Herbalism (a folder on his Desktop; exact path and contents pending) is the second. He can add any folder later.
- Files are indexed where they sit. Only text is indexed.
- Video plays from the original file and documents open from the original file. Nothing is ever copied.
- Nothing is committed to the public repo, bundled, synced, backed up into the practice record, or sent to cloud AI by default.
- Everything below is a Swift package, AstrumLibrary, inside the native host. The web rooms reach it only through bridge commands.
- If the user declines Swift, the same schema and behaviour move into a Rust module in the Tauri build instead. That version uses a Rust-side folder picker, the asset protocol's 206 range responses for video, pdf.js fed by a read_range command, and a small swiftc-built OCR command-line tool.

1. GRANTING ACCESS (at runtime, remembered, read-only)
- Library › Add Folder… opens an NSOpenPanel limited to folders.
- The chosen folder is canonicalized and saved as bookmark data plus its path in ~/Library/Application Support/com.astrum.app/Library/roots.plist, as {id, label, bookmark, path, addedAt, editionRules, allowCloudExcerpts:false}. Bookmarks survive renames, so renaming <course library folder> does not orphan its pins and progress.
- The host is unsandboxed, so that list is the app's own allowlist. Every bridge call carries (collectionId, relPath), and Swift checks that the resolved canonical path stays under the registered root. No absolute path ever crosses into JavaScript. If the host is ever sandboxed, the same file holds security-scoped bookmarks.
- <course library folder> sits directly in the home folder, which macOS privacy protection does not cover, so it needs no prompt.
- A Desktop folder triggers macOS's Desktop permission prompt once, with Astrum's NSDesktopFolderUsageDescription text. Because Astrum is signed with his free Personal Team identity, that grant survives rebuilds. With ad-hoc signing it would not.
- If iCloud Desktop & Documents is on, URLResourceValues.ubiquitousItemDownloadingStatus finds cloud-only placeholders. They are listed as 'in iCloud — Download to index' and are never read implicitly.
- Removing a collection deletes its rows. If a root can't be reached (for example an unplugged drive), the collection is marked offline and nothing is deleted.

2. SCAN AND INVENTORY (at launch, on focus, on Rescan, and later live through FSEvents)
- A background-priority scanner walks the tree with FileManager.enumerator, reading size, modification date, file resource identifier and iCloud status. It skips dot-files such as .DS_Store, and symlinks that point outside the root.
- Each file is classified:
  - indexed: .md, .markdown, .txt, .epub, .pdf, and .doc, .docx, .rtf, .odt, .html, .webarchive through NSAttributedString document reading;
  - played: .mp4, .m4v, .mov, .mp3, .m4a;
  - shown in Quick Look but not indexed: .pages, .numbers, .key, .xlsx, .jpg, .png, .tif;
  - reported only: DRM-protected EPUB or Kindle files, encrypted PDFs, .djvu, and non-DRM .mobi/.azw3 until a later phase.
- Older editions: the default rule for each collection is [/^_previous$/i, /^_old/i, /^archive$/i]. Rune Soup's _previous tree is marked as the previous edition, weighted ×0.7 in ranking, and its hits fold under the current lesson with an 'also in older edition' badge.
- Breadcrumbs come from the folder tree itself, so no course names appear in public code: collection › section ('RSPM Courses', 'The Foundations Course', 'Bonus Member Material') › course › module › lesson. Order comes from leading numbers, 'Lesson N', 'Module N', 'Week N' or roman numerals.
- Each .md is paired with its .mp4, trying these in order:
  1. identical stem;
  2. normalized stem (dropping 'transcript', '-notes', '(1080p)' and punctuation);
  3. same lesson number;
  4. the folder holds exactly one .md and one .mp4;
  5. token Jaccard ≥ 0.6, offered as a suggestion for him to confirm.
  At least 43 .md files have no video (696 − 653).
- The first screen he sees is the Library Health report: counts by status, needs-OCR, skipped, unpaired, iCloud-only, offline and missing. For Alchemy & Herbalism, that report is also how its unknown inventory gets measured.

3. EXTRACTION
- Markdown:
  - YAML front matter becomes metadata, and the heading tree is kept.
  - Timestamps are detected: [hh:]mm:ss at line start, (hh:mm:ss), SRT/VTT cues and speaker labels. When present, chunks carry t0 and t1 so a click seeks the exact moment.
  - Without timestamps, the position is estimated as charOffset/total × duration, with duration read once through AVURLAsset, and shown as '≈'. Exact transcripts via SpeechAnalyzer are optional later (his decision).
- EPUB: ZIPFoundation opens the book. XMLParser reads container.xml, then the OPF (title, creator, date, spine), then nav.xhtml or toc.ncx. Spine documents are stripped to block text. Chunks carry {book, author, chapter, spineHref, blockIndex}. The the course author titles cited in primers.js link to his own copies by fuzzy title match at runtime.
- PDF (expected to be most of Alchemy & Herbalism):
  - PDFKit reads the text layer on cores−1 at background priority.
  - Cleanup: NFKC normalization (which folds ligatures and the long s), de-hyphenation, and removal of running heads and footers that repeat on more than 60% of pages.
  - Each page is classified: text (≥200 characters), image-only (<20), or garbled (low letter and vowel ratios, or more than 1% U+FFFD or private-use glyphs).
  - Each document gets a status: text, partial, image-only, garbled, encrypted or error.
- Other documents: NSAttributedString document reading, the same engine as the built-in textutil.

4. OCR (how the app reaches Live Text-class recognition)
- Interim, available on day one of Phase 4:
  - The PDF Reader lays VisionKit's ImageAnalysisOverlayView over scanned pages, so he can select, copy and look up text on a scan before it has been OCR'd.
  - 'Open in Preview' is always one click away, and Preview has Live Text natively.
- Batch OCR for search and grounding:
  - Image-only and garbled pages are queued for AstrumOCR.xpc, an out-of-process XPC service, so a malformed scan cannot crash the app.
  - It renders each page with PDFKit at about 300 dpi and runs Vision's RecognizeDocumentsRequest (macOS 26: paragraphs, tables, lists), falling back to RecognizeTextRequest and VNRecognizeTextRequest.
  - Settings: .accurate, language correction on, languages taken at runtime from supportedRecognitionLanguages.
  - Confidence is stored per page. Results are keyed by (content hash, page), so a moved or copied PDF is never OCR'd twice.
  - The queue is resumable, low priority and pausable, with 'OCR this book now' and 'OCR all while charging'.
  - Vision's support for Latin, Greek, Hebrew, the long s and blackletter is not confirmed. Low-confidence chunks are down-weighted, and the page image is always one click away.
- Throughput is estimated at 0.5–1.5 s per page, which means hours to days for a large scanned shelf. This is to be measured on his Mac.

5. INDEX AND STORAGE (on the device, outside every path that leaves it)
- The index is ~/Library/Application Support/com.astrum.app/Library/library.sqlite, marked isExcludedFromBackup because it can always be rebuilt. It never lives under ~/Documents, ~/Desktop, the App Group or AstrumSync. Thumbnails go to ~/Library/Caches/com.astrum.app.
- Tables:
  - collections;
  - files (rel_path, kind, size, mtime, inode, content_hash, status, text_status, pages, duration_s, paired_file_id, edition, extractor_ver, missing_since);
  - chunks (ord, heading, text, cite_json, t0, t1, page, page_end, ocr_conf);
  - chunks_fts: FTS5 over (title, heading, body) with tokenize 'porter unicode61 remove_diacritics 2' on NFKC input. This fixes today's ASCII-only tokenizer, which turns 'Lémery' into 'mery';
  - chunk_materia, ocr, progress, pins, and vectors (later).
- Ranking is bm25(4, 2, 1) × edition weight × OCR confidence, with snippet() for result cards.
- SQLite: use the system library if PRAGMA compile_options shows FTS5 (checked in Phase 0; unverified today). Otherwise vendor the public-domain amalgamation built with SQLITE_ENABLE_FTS5.
- Size: about 50 MB for Rune Soup, and under 1 GB even for a library holding 500 MB of text. FTS5 handles the roughly 400k chunks a big PDF library implies. Today's in-memory BM25 would need 0.4–0.8 GB and 19–34 s at 100k chunks.
- Incremental re-index:
  - new file: extract;
  - size or modification date changed: replace that file's chunks in one transaction;
  - same inode and size at a new path: treat as a rename, so pins and progress survive;
  - vanished: set missing_since and purge after 30 days;
  - extractor version bumped: re-extract that format.

6. CHUNKS, CITATIONS AND MATERIA
- Chunks aim for about 1,200 characters (400–1,800), follow headings, overlap by one sentence, and never cross a PDF page boundary.
- cite_json holds {collection, section, course, module, lesson, lessonOrder, edition, book, author, chapter, page, pageLabel, heading, videoRel, t0, t1, tApprox, ocr}.
- Rendered citations look like:
  - [Rune Soup › The Foundations Course › Module 3 › '…' @ 12:34]
  - [Alchemy & Herbalism › Author, Title p. 112]
- Materia linking: scripts/export-lexicon.mjs builds a public phrase lexicon from data/planets.js (herbs, stone, metal, incense, oils), BEHENIAN, METALS and the operation templates. At ingest it is matched against every chunk to fill chunk_materia. Latin binomial synonyms can be added later.

7. READING AND PLAYING IN PLACE (native)
- Lesson Player window:
  - AVPlayer plays the file URL inside <course library folder>. AVFoundation reads the local file directly, so there is no copy and no streaming scheme.
  - AVPlayerView provides Picture in Picture, AirPlay and scrubbing. MPNowPlayingInfoCenter and MPRemoteCommandCenter provide Now Playing and media keys.
  - Progress is saved every 5 s. The transcript scrolls with playback, and clicking a line seeks.
  - Any file AVFoundation can't play falls back to 'Open in QuickTime Player'.
- PDF Reader window: PDFView opens at the cited page and highlights the passage (PDFSelection via findString). It adds Live Text on scanned pages, Open in Preview and Show in Finder.
- EPUB and Markdown: ReaderWebView, a separate WKWebView with allowsContentJavaScript = false and no bridge handler. EPUB chapters stream out of the zip through an astrumbook:// handler and are never extracted to disk. All library content is treated as untrusted.
- Quick Look (QLPreviewView) shows .pages, .numbers, .xlsx and images inside Astrum.

8. HOW IT CONNECTS TO THE REST OF ASTRUM
- Oracle:
  - rag.js stops rebuilding BM25 on every question. The record+canon index is cached and invalidated by astrum_meta stamps.
  - library.search(q, {k:4, perFileMax:2}) is added through the bridge. Tiers are fused by reciprocal rank (k=60) with quotas: record+canon 1,800 characters, library 2,400.
  - The grounding header gets three tiers: Canon, then Library (citations required), then training memory.
  - All three AI call sites are wired: AIScreen.jsx:57, the Oracle panel in App.jsx, and the Learn tutor.
  - The RUNE_PRINCIPLES framing stays.
- Egress gate:
  - Excerpts go only to on-device engines: Apple Foundation Models, WebLLM, or a local provider on a loopback URL.
  - Every other provider receives citation stubs only (title and location), unless that collection's 'allow excerpts in cloud prompts' toggle is on. It is off by default.
  - embeddings.js applies the same loopback rule. NLContextualEmbedding is the native default embedder.
  - The Foundation Models framework is documented as Apple's on-device model. If a future version adds a server route, the gate must treat it as cloud.
- Recall: chips for Record · Canon · Rune Soup · Alchemy & Herbalism · All. Library hits stream in grouped by collection, with Open, Play at t0 and Show in Finder.
- Learn: 'Your Courses' is generated from the folder tree in the existing FOUNDATIONS shape (course › module › lesson, with progress). Each LEARN_TOPIC gets 'From your library'. Nothing about his library is hardcoded.
- Athanor: the LibraryChamber (AthanorScreen.jsx:289) gains 'Your shelves'. Each operation gains 'Related reading', matched by template, author (Urbigerus, Paracelsus, Junius), planet and materia. Lab notes carry pointer-only citations {collectionId, relPath, page|ord}, which are safe inside the synced athanor store.
- Planets, Work, Rite and Talisman rooms: every herb, stone, metal, incense and oil shows a passage count and its top passages, which open the reader.
- Briefing, menu bar and widgets: composeBriefing and planUpcoming take an optional pure 'study' input. The feed's study track carries only the next lesson's title, its collection and astrum://lesson/<fileId>, never library text.

9. FENCES (the repo is public; the content is copyrighted)
- Library keys are never added to STORAGE_KEYS; a unit test enforces this. Library data never enters durable.js astrum/kv.
- isLocalOnlyKey = /^astrum_(lib|photo_|vec_|ring_|sync_dirhandle|device_id|lamport)/ is applied in both directions:
  - in initDurable, which also stops the existing sweep of photos, vectors and the backup ring into localStorage;
  - in buildSyncEnvelope, mergeSnapshot, importAll and exportAll, so peers and imported files can't inject library keys.
- Absolute roots live only in the native roots.plist.
- Pins, progress and annotations are pointer-only, and no synced field holds more than about 200 characters of source text. There is no 'copy passage into the Knowledge Base' action, because that store syncs.
- No library cache is written under ~/Documents or ~/Desktop.
- .gitignore covers media, ebooks, PDFs, SQLite files, *.local.json, Local.xcconfig, DerivedData, backups and *.tgz.
- CI fails on any tracked media, ebook or database file, and on /Users/ or library-folder literals in src/ or apple/.
- e2e fixtures use synthetic public-domain text.

10. FUTURE FOLDERS
Any folder added later goes through the same Add Folder flow: bookmark, scan report, extraction by format, its own edition rules, and its own cloud-excerpt toggle, off by default. It appears as a new Recall chip and Library shelf with no code change. Materia linking applies automatically. A folder on a removable drive goes offline when the drive is unplugged and comes back when it returns.

11. PHASING AND SIZING
- Phase 3, Rune Soup: Markdown, EPUB, video, Recall, Oracle, Learn. The first ingest of an estimated 4–28 MB of text takes under a minute, and the video is read only for metadata.
- Phase 4, Alchemy & Herbalism: PDF, OCR, materia, Athanor, the planet and ritual rooms. Its timing depends on the scanned share.
- Phase 5, later: SpeechAnalyzer transcripts (if he chooses), FSEvents live watching, on-device embeddings.
- Other devices never hold the library. They see pointer-only pins marked 'available on the Mac that holds this library'.