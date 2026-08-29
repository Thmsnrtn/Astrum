// ═══════════════════════════════════════════════════════════════════════
// TRANSPORT: iCloud ubiquity container (iPad, via custom Capacitor plugin)
// ═══════════════════════════════════════════════════════════════════════
// @capacitor/filesystem cannot reach the iCloud Drive container (Documents
// is iCloud-*backed-up*, not *shared*), so a ~60-line Swift plugin exposes
// list/read/write over FileManager's ubiquity container with
// NSFileCoordinator. The Swift side ships in ios/App/App/
// ICloudFolderPlugin.swift once `cap:bootstrap` has generated the project;
// Xcode needs the iCloud Documents capability + container
// iCloud.com.astrum.app (see VERIFICATION.md). Feature-detected: absent
// plugin → null → sync quietly unavailable on this device.

export async function capacitorICloudTransport() {
  const plug = typeof window !== "undefined" && window.Capacitor?.Plugins?.ICloudFolder;
  if (!plug) return null;
  const sub = "astrum-sync";
  try {
    const { available } = await plug.available();
    if (!available) return null;
  } catch { return null; }
  return {
    name: "icloud",
    available: async () => { try { return (await plug.available()).available; } catch { return false; } },
    list: async () => (await plug.list({ dir: sub })).files || [],
    read: async name => (await plug.read({ dir: sub, name })).text,
    write: async (name, text) => { await plug.write({ dir: sub, name, text }); },
  };
}
