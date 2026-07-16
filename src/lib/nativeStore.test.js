// nativeStore is native-only; on web (and in Node tests, where Capacitor is
// absent) every entry point must be a safe no-op so the verified web/durable
// paths are never affected. The stable-id hardening is pure and tested here.
import { describe, it, expect } from "vitest";
import { nativeAvailable, nativeWriteSnapshot, nativeReadSnapshot, requestSnapshot, flushSnapshot } from "./nativeStore.js";
import { stableId } from "./notify.js";

describe("nativeStore no-ops off Capacitor", () => {
  it("nativeAvailable is false without a native Capacitor runtime", () => {
    expect(nativeAvailable()).toBe(false);
  });
  it("write/read/flush resolve harmlessly and never throw", async () => {
    expect(await nativeWriteSnapshot({ astrum_x: "1" })).toBe(false);
    expect(await nativeReadSnapshot()).toBe(null);
    expect(() => requestSnapshot(() => ({}))).not.toThrow();
    await expect(flushSnapshot()).resolves.toBeUndefined();
  });
});

describe("stableId", () => {
  it("is deterministic and in the 31-bit int range", () => {
    const a = stableId("hour_1699999999999");
    expect(a).toBe(stableId("hour_1699999999999"));
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(2000000000);
  });
  it("separates distinct plan ids", () => {
    expect(stableId("voc_on_1")).not.toBe(stableId("voc_off_1"));
    expect(stableId("brief_a")).not.toBe(stableId("brief_b"));
  });
});
