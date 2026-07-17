import { describe, it, expect } from "vitest";
import { photoKey, isPhotoKey, newPhotoId } from "./photos.js";

describe("photo vault keys", () => {
  it("namespaces photo keys away from the astrum_ record stores", () => {
    const id = newPhotoId();
    expect(photoKey(id)).toBe(`astrum_photo_${id}`);
    expect(isPhotoKey(photoKey(id))).toBe(true);
    expect(isPhotoKey("astrum_castings")).toBe(false);
    expect(isPhotoKey(null)).toBe(false);
  });
  it("ids are unique across rapid generation", () => {
    const ids = new Set(Array.from({ length: 50 }, () => newPhotoId()));
    expect(ids.size).toBe(50);
  });
});
