// ═══════════════════════════════════════════════════════════════════════
// PHOTO STRIP — attach and view photos on any record
// ═══════════════════════════════════════════════════════════════════════
// A reusable strip: thumbnails loaded from the IndexedDB vault, a camera/
// library capture button, tap a photo to view it full-size, long-hold logic
// kept simple (✕ deletes). Owners store only photoIds.

import { useState, useEffect } from "react";
import { F } from "../ui/theme.js";
import { savePhoto, loadPhoto, deletePhoto } from "../lib/photos.js";

export default function PhotoStrip({ photoIds = [], onChange, label = "Photos" }) {
  const [thumbs, setThumbs] = useState({});
  const [view, setView] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      const out = {};
      for (const id of photoIds) { const d = await loadPhoto(id); if (d) out[id] = d; }
      if (live) setThumbs(out);
    })();
    return () => { live = false; };
  }, [photoIds.join(",")]);

  const add = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const id = await savePhoto(file);
      onChange?.([...photoIds, id]);
    } catch {}
    setBusy(false);
  };

  const remove = async (id) => {
    await deletePhoto(id);
    onChange?.(photoIds.filter(x => x !== id));
    setView(null);
  };

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {photoIds.map(id => thumbs[id] ? (
          <div key={id} style={{ position: "relative" }}>
            <img src={thumbs[id]} onClick={() => setView(id)} alt="" style={{ width: 54, height: 54, objectFit: "cover", borderRadius: 9, border: "1px solid rgba(var(--tint-rgb),0.25)", cursor: "pointer", display: "block" }} />
          </div>
        ) : <div key={id} style={{ width: 54, height: 54, borderRadius: 9, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(var(--tint-rgb),0.1)" }} />)}
        <label style={{ width: 54, height: 54, borderRadius: 9, background: "rgba(var(--tint-rgb),0.08)", border: "1px dashed rgba(var(--tint-rgb),0.35)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontFamily: F, fontSize: 18, color: "rgba(var(--tint-rgb),0.7)" }}>
          {busy ? "…" : "+"}
          <input type="file" accept="image/*" capture="environment" onChange={add} style={{ display: "none" }} />
        </label>
        <span style={{ fontFamily: F, fontSize: 8, color: "rgba(var(--tint-rgb),0.35)", letterSpacing: 1.5, textTransform: "uppercase" }}>{label}</span>
      </div>
      {view && thumbs[view] && (
        <div onClick={() => setView(null)} style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.92)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <img src={thumbs[view]} alt="" style={{ maxWidth: "94%", maxHeight: "84%", borderRadius: 12, border: "1px solid rgba(var(--tint-rgb),0.3)" }} />
          <button onClick={e => { e.stopPropagation(); remove(view); }} style={{ marginTop: 14, padding: "8px 18px", borderRadius: 10, background: "rgba(180,80,60,0.15)", border: "1px solid rgba(180,80,60,0.4)", fontFamily: F, fontSize: 9, color: "#D28060", letterSpacing: 2, textTransform: "uppercase", cursor: "pointer" }}>✕ Remove from the vault</button>
        </div>
      )}
    </div>
  );
}
