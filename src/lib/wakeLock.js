// ═══════════════════════════════════════════════════════════════════════
// WAKE LOCK — the altar does not sleep
// ═══════════════════════════════════════════════════════════════════════
// Altar Mode and a running Rite are useless if the iPad dims at 30 seconds.
// Screen Wake Lock API (Safari 16.4+), feature-detected, re-acquired when
// the tab becomes visible again (the OS releases locks on hide).
// useWakeLock(active) is the whole interface.

import { useEffect } from "react";

export function useWakeLock(active) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock = null, released = false;
    const acquire = async () => {
      try { lock = await navigator.wakeLock.request("screen"); } catch { /* low battery, etc. */ }
    };
    const onVisible = () => { if (document.visibilityState === "visible" && !released) acquire(); };
    acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisible);
      try { lock?.release(); } catch {}
    };
  }, [active]);
}
