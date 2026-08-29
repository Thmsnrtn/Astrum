// ═══════════════════════════════════════════════════════════════════════
// TRANSPORT: Tauri filesystem (Mac desktop)
// ═══════════════════════════════════════════════════════════════════════
// Reads/writes the iCloud Drive container folder directly:
//   ~/Library/Mobile Documents/iCloud~com~astrum~app/Documents/astrum-sync
// Requires @tauri-apps/plugin-fs (JS) + tauri-plugin-fs (Rust) with a
// capability scope for $HOME/Library/Mobile Documents/** — see
// VERIFICATION.md. Feature-detected: returns null when the plugin is
// absent so the app runs unchanged.

const SYNC_DIR = "Library/Mobile Documents/iCloud~com~astrum~app/Documents/astrum-sync";

export async function tauriFsTransport() {
  if (typeof window === "undefined" || !window.__TAURI_INTERNALS__) return null;
  let fs;
  // Variable specifier so the bundler doesn't try to resolve a plugin that
  // is only installed in the Tauri desktop build.
  const mod = "@tauri-apps/plugin-fs";
  try { fs = await import(/* @vite-ignore */ mod); }
  catch { return null; }
  const { readTextFile, writeTextFile, readDir, mkdir, exists, BaseDirectory } = fs;
  const opts = { baseDir: BaseDirectory.Home };
  const p = name => `${SYNC_DIR}/${name}`;
  try { if (!(await exists(SYNC_DIR, opts))) await mkdir(SYNC_DIR, { ...opts, recursive: true }); }
  catch { return null; }
  return {
    name: "tauri-fs",
    available: async () => { try { return await exists(SYNC_DIR, opts); } catch { return false; } },
    list: async () => (await readDir(SYNC_DIR, opts)).filter(e => !e.isDirectory).map(e => e.name),
    read: async name => readTextFile(p(name), opts),
    write: async (name, text) => {
      await writeTextFile(p(name) + ".tmp", text, opts);
      // fs plugin has no rename in older versions; write-then-write is
      // acceptable for one-writer-per-file. Prefer rename when available.
      try { const { rename } = fs; if (rename) { await rename(p(name) + ".tmp", p(name), opts, opts); return; } } catch {}
      await writeTextFile(p(name), text, opts);
    },
  };
}
