// ═══════════════════════════════════════════════════════════════════════
// KIT — the shared component vocabulary
// ═══════════════════════════════════════════════════════════════════════
// The design system existed as CSS classes and conventions; screens
// re-implemented it by hand ~90 times. New code builds from these instead.
// All colors ride the tint system (GOLD live binding + --tint-rgb), so
// everything built from the kit themes correctly for free.

import { F, GOLD } from "./theme.js";

export function Screen({ kicker, title, sub, children }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingBottom: 20 }}>
      <div style={{ padding: "16px 18px 8px" }}>
        {kicker && <div style={{ fontFamily: F, fontSize: 9, color: "rgba(var(--tint-rgb),0.55)", letterSpacing: 3.5, textTransform: "uppercase" }}>{kicker}</div>}
        <div style={{ fontFamily: F, fontSize: 20, color: GOLD, lineHeight: 1.2 }}>{title}</div>
        {sub && <div style={{ fontFamily: F, fontSize: 10, color: "rgba(var(--tint-rgb),0.4)", fontStyle: "italic", marginTop: 3, lineHeight: 1.7 }}>{sub}</div>}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 14px" }}>{children}</div>
    </div>
  );
}

export function Card({ children, style }) {
  return <div className="card" style={{ marginBottom: 9, ...style }}>{children}</div>;
}

export function SectionLabel({ children }) {
  return <div style={{ fontFamily: F, fontSize: 8, color: "rgba(var(--tint-rgb),0.45)", letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 7 }}>{children}</div>;
}

export function Button({ children, onClick, disabled, tone = "gold", full = true, style, ...rest }) {
  const colors = {
    gold: { c: GOLD, bg: "rgba(var(--tint-rgb),0.12)", bd: "rgba(var(--tint-rgb),0.35)" },
    green: { c: "#7AB07A", bg: "rgba(122,176,122,0.12)", bd: "rgba(122,176,122,0.35)" },
    red: { c: "#D28060", bg: "rgba(180,80,60,0.1)", bd: "rgba(180,80,60,0.3)" },
    ghost: { c: "rgba(var(--tint-rgb),0.55)", bg: "rgba(0,0,0,0.3)", bd: "rgba(var(--tint-rgb),0.15)" },
  }[tone];
  return (
    <button onClick={onClick} disabled={disabled} {...rest}
      style={{ width: full ? "100%" : undefined, padding: "12px 18px", borderRadius: 11, minHeight: 44,
        background: disabled ? "rgba(0,0,0,0.3)" : colors.bg, border: `1px solid ${disabled ? "rgba(var(--tint-rgb),0.1)" : colors.bd}`,
        fontFamily: F, fontSize: 10, color: disabled ? "rgba(var(--tint-rgb),0.3)" : colors.c,
        letterSpacing: 2.5, textTransform: "uppercase", cursor: disabled ? "default" : "pointer", ...style }}>
      {children}
    </button>
  );
}

export function Chip({ children, color = GOLD, onClick }) {
  return (
    <span onClick={onClick} style={{ fontFamily: F, fontSize: 8.5, color, background: color + "16", border: `1px solid ${color}35`, borderRadius: 8, padding: "3px 9px", letterSpacing: 0.5, cursor: onClick ? "pointer" : "default", display: "inline-block" }}>
      {children}
    </span>
  );
}

export function Field({ value, onChange, placeholder, rows, ...rest }) {
  const style = { width: "100%", background: "rgba(0,0,0,0.45)", border: "1px solid rgba(var(--tint-rgb),0.2)", borderRadius: 10, color: "#C4A870", fontFamily: F, outline: "none", padding: "10px 12px", fontSize: 12, boxSizing: "border-box", resize: "none" };
  return rows
    ? <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} style={style} {...rest} />
    : <input value={value} onChange={onChange} placeholder={placeholder} style={style} {...rest} />;
}

export function PillTabs({ tabs, active, onSelect }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
      {tabs.map(([id, label]) => (
        <button key={id} onClick={() => onSelect(id)} style={{ flex: 1, padding: "9px 0", minHeight: 38, borderRadius: 10, background: active === id ? "rgba(var(--tint-rgb),0.14)" : "rgba(0,0,0,0.3)", border: `1px solid ${active === id ? "rgba(var(--tint-rgb),0.4)" : "rgba(var(--tint-rgb),0.1)"}`, fontFamily: F, fontSize: 9.5, color: active === id ? GOLD : "rgba(var(--tint-rgb),0.4)", letterSpacing: 2, textTransform: "uppercase", cursor: "pointer" }}>{label}</button>
      ))}
    </div>
  );
}
