// Shared launcher: uses the environment's preinstalled Chromium when
// present (dev container), falls back to Playwright's own (CI).
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
const PREINSTALLED = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
export function launch() {
  return chromium.launch(existsSync(PREINSTALLED) ? { executablePath: PREINSTALLED } : {});
}
