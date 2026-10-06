// Vergleichsband: Verteilung einer Vergleichsgruppe auf einer Skala, optional mit
// dem eigenen Wert. Fuer die Ergebnisseite.
//
//   Band   = mittlere Haelfte (p25 bis p75), als Flaeche in der Farbe der Faehigkeit
//   Strich = Median, in Textfarbe
//   Punkt  = eigener Wert, kraeftig in der Farbe, mit Ring in Hintergrundfarbe
//
// Die Zahlen stehen im Tooltip und im aria-label, nicht auf dem Band. Tooltip:
// Maus, Fokus oder Tippen oeffnet, Escape oder Verlassen schliesst.
import { useState } from "react";
import type { Quant } from "../data/benchmarkCore";

const SURFACE = "#0a0d1a";

interface ComparisonBandProps {
  min: number;
  max: number;
  ticks?: number[];
  q: Quant | null;
  own?: number | null;
  color: string;
  /** Zeilen fuer Tooltip und Screenreader, z. B. ["Ihr Wert: 4,5", "Median: 4,0"]. */
  describe: string[];
  label?: string;
  /** Beschriftung der Skalenenden unter dem Band, z. B. ["1", "7"]. */
  scale?: [string, string];
}

const ComparisonBand = ({ min, max, ticks = [], q, own = null, color, describe, label, scale }: ComparisonBandProps) => {
  const [open, setOpen] = useState(false);
  const [focusVisible, setFocusVisible] = useState(false);
  const frac = (v: number) => (Math.max(min, Math.min(max, v)) - min) / (max - min);
  const x = (v: number) => `${frac(v) * 100}%`;
  const w = (a: number, b: number) => `max(3px, ${((b - a) / (max - min)) * 100}%)`;

  // Tooltip am Rand nicht ueber den Bildschirm hinausschieben.
  const anchor = own ?? q?.p50 ?? (min + max) / 2;
  const f = frac(anchor);
  const tipShift = f < 0.2 ? "0%" : f > 0.8 ? "-100%" : "-50%";

  return (
    <div
      role="img"
      aria-label={[label, ...describe].filter(Boolean).join(". ")}
      tabIndex={0}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={(e) => { setOpen(true); setFocusVisible(e.currentTarget.matches(":focus-visible")); }}
      onBlur={() => { setOpen(false); setFocusVisible(false); }}
      onClick={() => setOpen(true)}
      onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
      style={{
        position: "relative", height: scale ? "40px" : "26px", cursor: "default", borderRadius: "6px",
        outline: focusVisible ? "2px solid rgba(139,164,255,0.8)" : "none", outlineOffset: "3px",
      }}
    >
      {scale && (
        <div style={{ position: "absolute", left: 0, right: 0, top: "26px", display: "flex", justifyContent: "space-between", fontFamily: "Inter, sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.55)" }}>
          <span>{scale[0]}</span><span>{scale[1]}</span>
        </div>
      )}
      {/* Grundlinie und Skalenstriche, zurueckhaltend */}
      <div style={{ position: "absolute", left: 0, right: 0, top: "12.5px", height: "1px", background: "rgba(255,255,255,0.12)" }} />
      {ticks.map((t) => (
        <div key={t} style={{ position: "absolute", left: x(t), top: "9px", width: "1px", height: "8px", background: "rgba(255,255,255,0.12)" }} />
      ))}

      {q && (
        <>
          <div
            style={{
              position: "absolute", left: x(q.p25), width: w(q.p25, q.p75),
              top: "7px", height: "12px", borderRadius: "4px",
              background: color, opacity: 0.45,
            }}
          />
          <div style={{ position: "absolute", left: x(q.p50), top: "4px", width: "2px", height: "18px", marginLeft: "-1px", borderRadius: "1px", background: "rgba(255,255,255,0.9)" }} />
        </>
      )}

      {own !== null && (
        <div
          style={{
            position: "absolute", left: x(own), top: "7px", width: "12px", height: "12px", marginLeft: "-6px",
            borderRadius: "50%", background: color, boxShadow: `0 0 0 2px ${SURFACE}`,
          }}
        />
      )}

      {open && describe.length > 0 && (
        <div
          role="presentation"
          style={{
            position: "absolute", bottom: "30px", left: x(anchor),
            transform: `translateX(${tipShift})`, zIndex: 5, pointerEvents: "none",
            background: "rgba(14,20,36,0.97)", border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: "8px", padding: "7px 10px", maxWidth: "min(300px, 80vw)",
            fontFamily: "Inter, sans-serif", fontSize: "12px", lineHeight: 1.5, color: "rgba(255,255,255,0.88)",
            boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
          }}
        >
          {describe.map((d) => <div key={d} style={{ whiteSpace: "nowrap" }}>{d}</div>)}
        </div>
      )}
    </div>
  );
};

export default ComparisonBand;
