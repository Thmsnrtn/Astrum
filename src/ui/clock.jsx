// ═══════════════════════════════════════════════════════════════════════
// CLOCK — two cadences instead of one 200 ms firehose
// ═══════════════════════════════════════════════════════════════════════
// The old root ticked every 200 ms and recomputed the entire ephemeris on
// each render, handing every child a fresh object identity 5× a second.
// Split:
//   · useAstroNow — the ASTRONOMY cadence. Recomputes eph/hour/fractal only
//     when a 30-second bucket turns (the Moon moves 0.0046° per 30 s —
//     invisible at the app's 0.1° display precision) or when the Swiss
//     Ephemeris finishes loading. Object identities are stable between
//     buckets, so React.memo and useMemo downstream finally hold.
//   · ClockProvider/useClock — the WALL-CLOCK cadence: a 1 Hz Date for the
//     few leaves that render seconds (header clock, Altar face, fractal
//     windows). Subscribing there re-renders only those leaves.

import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { getPlanetaryHour, getPlanetaryHourUnequal, calcFractal } from "../engine/astro.js";
import { computeEphemeris } from "../engine/chart.js";
import { onSwephReady } from "../engine/sweph.js";
import { getVoCMode } from "../lib/prefs.js";

const ClockContext = createContext(new Date());

export function ClockProvider({ children }) {
  const [t, setT] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return <ClockContext.Provider value={t}>{children}</ClockContext.Provider>;
}

export function useClock() { return useContext(ClockContext); }

const BUCKET_MS = 30000;

export function useAstroNow(location, fractalMode) {
  const [bucket, setBucket] = useState(() => Math.floor(Date.now() / BUCKET_MS));
  const [engineGen, setEngineGen] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      const n = Math.floor(Date.now() / BUCKET_MS);
      setBucket(b => (n === b ? b : n));
    }, 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => { onSwephReady(() => setEngineGen(g => g + 1)); }, []);
  // Practice-preference changes (e.g. the VoC doctrine toggle) recompute
  // the bucket immediately instead of waiting up to 30 s.
  useEffect(() => {
    const bump = () => setEngineGen(g => g + 1);
    window.addEventListener("astrum-prefs", bump);
    return () => window.removeEventListener("astrum-prefs", bump);
  }, []);

  return useMemo(() => {
    const now = new Date();
    const hour = location
      ? getPlanetaryHourUnequal(now, location.lat, location.lon)
      : getPlanetaryHour(now);
    const eph = computeEphemeris(now, location, { vocMode: getVoCMode() });
    const fractal = calcFractal(now, fractalMode);
    return { now, eph, hour, fractal };
  }, [bucket, engineGen, location?.lat, location?.lon, fractalMode]);
}
