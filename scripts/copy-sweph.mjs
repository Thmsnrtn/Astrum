// Copies the Swiss Ephemeris WASM + data files from node_modules into
// public/wasm/ so they ship with every build (web, Tauri, Capacitor).
// Runs automatically via the predev/prebuild npm hooks — the binaries stay
// out of git.
import { mkdirSync, copyFileSync } from "fs";
import { fileURLToPath } from "url";

const src = fileURLToPath(new URL("../node_modules/swisseph-wasm/wasm/", import.meta.url));
const dst = fileURLToPath(new URL("../public/wasm/", import.meta.url));

mkdirSync(dst, { recursive: true });
for (const f of ["swisseph.wasm", "swisseph.data"]) {
  copyFileSync(src + f, dst + f);
}
console.log("[copy-sweph] Swiss Ephemeris assets copied to public/wasm/");
