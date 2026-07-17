// ═══════════════════════════════════════════════════════════════════════
// PHOTO VAULT — the visual record
// ═══════════════════════════════════════════════════════════════════════
// Talismans, altar layouts, and Athanor stages — spagyrics is a visual art;
// the colour changes ARE the data. Photos are downscaled to ~1280px JPEG and
// stored ONLY in IndexedDB (never localStorage — a single photo would blow
// the 5 MB quota that guards the practice record). Records keep photoIds;
// the blobs live in the vault.

import { idbSet, idbGet, idbDelete, idbKeys } from "./durable.js";

const PREFIX = "astrum_photo_";
export const photoKey = id => `${PREFIX}${id}`;
export const isPhotoKey = k => typeof k === "string" && k.startsWith(PREFIX);

export function newPhotoId() { return `ph_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

// Downscale an image File/Blob to maxDim and return a JPEG data URL.
export function downscaleImage(file, maxDim = 1280, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch (e) { URL.revokeObjectURL(url); reject(e); }
    };
    img.onerror = e => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

// Store a photo file; returns the new photo id.
export async function savePhoto(file, maxDim = 1280) {
  const id = newPhotoId();
  const dataUrl = await downscaleImage(file, maxDim);
  await idbSet(photoKey(id), dataUrl);
  return id;
}

export async function loadPhoto(id) {
  try { return (await idbGet(photoKey(id))) || null; } catch { return null; }
}

export async function deletePhoto(id) {
  try { await idbDelete(photoKey(id)); } catch {}
}

// All stored photo ids (for vault maintenance / orphan sweeps).
export async function listPhotoIds() {
  try { return (await idbKeys()).filter(isPhotoKey).map(k => k.slice(PREFIX.length)); }
  catch { return []; }
}
