// ═══════════════════════════════════════════════════════════════════════
// ARCHITECTURE GUARD — the circular hub must never re-form
// ═══════════════════════════════════════════════════════════════════════
// App.jsx spent its first year as a 6,500-line hub that every screen and
// lib imported back from, making code-splitting impossible. These tests
// keep the de-cycled architecture honest: App.jsx is a leaf (only main.jsx
// imports it), the foundation layers never reach upward into screens, and
// the relative-import graph is acyclic.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";

const SRC = resolve(__dirname);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(js|jsx)$/.test(name) && !/\.test\./.test(name)) out.push(p);
  }
  return out;
}

const files = walk(SRC);
const IMPORT_RE = /(?:import\s[^"']*|import\()\s*["'](\.{1,2}\/[^"']+)["']/g;

function importsOf(file) {
  const txt = readFileSync(file, "utf8");
  const out = [];
  let m;
  while ((m = IMPORT_RE.exec(txt))) {
    let target = resolve(dirname(file), m[1]);
    if (!/\.(js|jsx)$/.test(target)) {
      // resolve extensionless (none in this codebase, but be safe)
      if (files.includes(target + ".js")) target = target + ".js";
      else if (files.includes(target + ".jsx")) target = target + ".jsx";
    }
    out.push(target);
  }
  return out;
}

const graph = new Map(files.map(f => [f, importsOf(f).filter(t => files.includes(t))]));
const rel = f => f.slice(SRC.length + 1);

describe("the de-cycled architecture holds", () => {
  it("nothing imports App.jsx except main.jsx", () => {
    const offenders = files.filter(f =>
      !/main\.jsx$/.test(f) && graph.get(f).some(t => /App\.jsx$/.test(t)));
    expect(offenders.map(rel)).toEqual([]);
  });

  it("foundation layers (engine, lib, data, ai, ui) never import screens or App", () => {
    const offenders = [];
    for (const f of files) {
      if (!/\/(engine|lib|data|ai|ui)\//.test(f)) continue;
      for (const t of graph.get(f)) {
        if (/\/screens\//.test(t) || /App\.jsx$/.test(t)) offenders.push(`${rel(f)} → ${rel(t)}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the import graph is acyclic", () => {
    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = new Map(files.map(f => [f, WHITE]));
    const stack = [];
    let cycle = null;
    const dfs = f => {
      color.set(f, GRAY); stack.push(f);
      for (const t of graph.get(f) || []) {
        if (color.get(t) === GRAY) { cycle = [...stack.slice(stack.indexOf(t)), t].map(rel); return true; }
        if (color.get(t) === WHITE && dfs(t)) return true;
      }
      color.set(f, BLACK); stack.pop();
      return false;
    };
    for (const f of files) if (color.get(f) === WHITE && dfs(f)) break;
    expect(cycle).toBeNull();
  });
});
