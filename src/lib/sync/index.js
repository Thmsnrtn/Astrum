// Transport resolution: the first available transport for this platform.
// iPad → iCloud plugin; Mac desktop → Tauri fs into the iCloud container;
// Chromium browser → File System Access folder the user picked once.
import { capacitorICloudTransport } from "./transport/capacitorICloud.js";
import { tauriFsTransport } from "./transport/tauriFs.js";
import { webFsTransport } from "./transport/webFsAccess.js";

export { syncNow, startAutoSync, buildSyncEnvelope } from "./engine.js";
export { getDeviceId } from "./deviceId.js";

export async function resolveTransport() {
  return (await capacitorICloudTransport())
      || (await tauriFsTransport())
      || (await webFsTransport());
}
