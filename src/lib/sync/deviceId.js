// Persistent per-device identity + lamport counter for deterministic sync
// tie-breaks. Both live in localStorage and are NEVER synced (each device's
// own file carries them in its envelope header instead).

export function getDeviceId() {
  try {
    let id = localStorage.getItem("astrum_device_id");
    if (!id) {
      id = `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      localStorage.setItem("astrum_device_id", id);
    }
    return id;
  } catch { return "dev_unknown"; }
}

export function bumpLamport() {
  try {
    const n = (parseInt(localStorage.getItem("astrum_lamport") || "0", 10) || 0) + 1;
    localStorage.setItem("astrum_lamport", String(n));
    return n;
  } catch { return 0; }
}

export function getLamport() {
  try { return parseInt(localStorage.getItem("astrum_lamport") || "0", 10) || 0; }
  catch { return 0; }
}
