// ═══════════════════════════════════════════════════════════════════════
// NOTIFY — one reschedule() interface, three delivery backends
// ═══════════════════════════════════════════════════════════════════════
//  • Capacitor iOS: @capacitor/local-notifications — true scheduled delivery
//    even when the app is closed. iOS caps ~64 pending, so plans are ranked
//    by priority and trimmed to 60.
//  • Tauri desktop: @tauri-apps/plugin-notification fired from an in-app
//    timer — the app lives in the tray, so timers survive.
//  • Web PWA: Notification API from the open page. No push server, so
//    nothing fires with the tab closed — the settings UI says so honestly.
// reschedule() is cancel-all-then-schedule: idempotent by construction.

const isCapacitor = () => typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.();
const isTauri = () => typeof window !== "undefined" && !!window.__TAURI_INTERNALS__;

export async function ensurePermission() {
  try {
    if (isCapacitor()) {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const r = await LocalNotifications.requestPermissions();
      return r.display === "granted";
    }
    if (isTauri()) {
      const { isPermissionGranted, requestPermission } = await import("@tauri-apps/plugin-notification");
      if (await isPermissionGranted()) return true;
      return (await requestPermission()) === "granted";
    }
    if (typeof Notification !== "undefined") {
      if (Notification.permission === "granted") return true;
      return (await Notification.requestPermission()) === "granted";
    }
  } catch {}
  return false;
}

// ── In-page timers (web + Tauri) ────────────────────────────────────────
let webTimers = [];
function clearWebTimers() { webTimers.forEach(clearTimeout); webTimers = []; }

async function fireNow(plan) {
  try {
    if (isTauri()) {
      const { sendNotification } = await import("@tauri-apps/plugin-notification");
      sendNotification({ title: plan.title, body: plan.body });
      return;
    }
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(plan.title, { body: plan.body, tag: plan.id });
    }
  } catch {}
}

export async function reschedule(plans) {
  if (isCapacitor()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const pending = await LocalNotifications.getPending();
      if (pending.notifications?.length) await LocalNotifications.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) });
      // iOS pending cap: keep the 60 most important, soonest first within priority
      const chosen = [...plans].sort((a, b) => (a.priority - b.priority) || (a.at - b.at)).slice(0, 60);
      if (chosen.length) {
        await LocalNotifications.schedule({
          notifications: chosen.map((p, i) => ({
            id: (Date.now() % 100000000) + i, // ints required
            title: p.title, body: p.body,
            schedule: { at: p.at },
          })),
        });
      }
      return { backend: "capacitor", scheduled: chosen.length };
    } catch { /* fall through to timers */ }
  }
  // Web/Tauri: arm timers for the next 12 hours (replan interval refreshes them)
  clearWebTimers();
  const soon = plans.filter(p => p.at.getTime() - Date.now() < 12 * 3600000 && p.at.getTime() > Date.now());
  soon.forEach(p => { webTimers.push(setTimeout(() => fireNow(p), p.at.getTime() - Date.now())); });
  return { backend: isTauri() ? "tauri" : "web", scheduled: soon.length };
}
