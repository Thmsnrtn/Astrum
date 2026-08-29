// ═══════════════════════════════════════════════════════════════════════
// SW UPDATE — "a new sky is available"
// ═══════════════════════════════════════════════════════════════════════
// Watches the service-worker registration for a newly-installed worker
// waiting to take over, and lets the app show a reload toast instead of
// leaving the practitioner on a stale build until a hard refresh.

export function watchForUpdate(onUpdate) {
  if (!("serviceWorker" in navigator)) return () => {};
  let cancelled = false;
  navigator.serviceWorker.getRegistration().then(reg => {
    if (!reg || cancelled) return;
    const check = () => {
      if (reg.waiting && navigator.serviceWorker.controller) onUpdate(() => {
        reg.waiting.postMessage("SKIP_WAITING");
        navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true });
      });
    };
    check();
    reg.addEventListener("updatefound", () => {
      const nw = reg.installing;
      nw?.addEventListener("statechange", () => { if (nw.state === "installed") check(); });
    });
  }).catch(() => {});
  return () => { cancelled = true; };
}
