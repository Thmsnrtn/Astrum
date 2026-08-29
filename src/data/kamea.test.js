// ═══════════════════════════════════════════════════════════════════════
// KAMEA VERIFICATION — the magic squares prove themselves
// ═══════════════════════════════════════════════════════════════════════
// A planetary kamea of order n must be a true magic square: the numbers
// 1..n² each exactly once, every row, column, and both main diagonals
// summing to the magic constant n(n²+1)/2. This is not a matter of
// tradition but of arithmetic — a single mistyped cell breaks it, so
// these tests verify every cell of every square. The planet→order map
// (Saturn 3 … Moon 9) is Agrippa II.22's, cross-checked by research.
//
// Magic constants: Saturn 15, Jupiter 34, Mars 65, Sun 111, Venus 175,
// Mercury 260, Moon 369. Kamea sums (whole square) = n²(n²+1)/2, giving
// the traditional "numbers of the planet": Saturn 45, Jupiter 136,
// Mars 325, Sun 666, Venus 1225, Mercury 2080, Moon 3321.

import { describe, it, expect } from "vitest";
import { KAMEA } from "./uiTables.jsx";

const EXPECTED_ORDER = { saturn: 3, jupiter: 4, mars: 5, sun: 6, venus: 7, mercury: 8, moon: 9 };

describe("the planetary kameas are true magic squares", () => {
  for (const [planet, order] of Object.entries(EXPECTED_ORDER)) {
    describe(planet, () => {
      const k = KAMEA[planet];
      const n = order;
      const magic = (n * (n * n + 1)) / 2;

      it(`has Agrippa's order ${n}`, () => {
        expect(k.size).toBe(n);
        expect(k.sq).toHaveLength(n * n);
      });

      it(`contains 1..${n * n} exactly once`, () => {
        expect([...k.sq].sort((a, b) => a - b)).toEqual(Array.from({ length: n * n }, (_, i) => i + 1));
      });

      it(`every row sums to ${magic}`, () => {
        for (let r = 0; r < n; r++) {
          expect(k.sq.slice(r * n, r * n + n).reduce((a, b) => a + b, 0)).toBe(magic);
        }
      });

      it(`every column sums to ${magic}`, () => {
        for (let c = 0; c < n; c++) {
          let s = 0;
          for (let r = 0; r < n; r++) s += k.sq[r * n + c];
          expect(s).toBe(magic);
        }
      });

      it(`both diagonals sum to ${magic}`, () => {
        let d1 = 0, d2 = 0;
        for (let i = 0; i < n; i++) { d1 += k.sq[i * n + i]; d2 += k.sq[i * n + (n - 1 - i)]; }
        expect(d1).toBe(magic);
        expect(d2).toBe(magic);
      });

      it(`the whole square sums to the planet's traditional number`, () => {
        const TOTALS = { saturn: 45, jupiter: 136, mars: 325, sun: 666, venus: 1225, mercury: 2080, moon: 3321 };
        expect(k.sq.reduce((a, b) => a + b, 0)).toBe(TOTALS[planet]);
      });
    });
  }
});
