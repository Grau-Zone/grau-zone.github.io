// Vergleichsband: Verteilung einer Vergleichsgruppe auf einer Skala, optional mit
// dem eigenen Wert. Fuer die Ergebnisseite.
//
//   Band   = mittlere Haelfte (p25 bis p75), als Flaeche in der Farbe der Faehigkeit
//   Strich = Median, in Textfarbe
//   Punkt  = eigener Wert, kraeftig in der Farbe, mit Ring in Hintergrundfarbe
//
// Material (aria-hidden; Rille und Lineal bleiben im Druck, der Rest ist fx-deco): Rille statt Grundlinie, Messlineal
// mit Feinstrichen an den Mittelpunkten der vorhandenen Teilung (ohne Beschriftung),
// Glaskapsel-Band mit rein vertikalem Verlauf (horizontal gleichfoermig, damit keine
// Dichte am Median behauptet wird). Hover/Fokus/Tippen hebt nur vorhandene Marken hervor.
//
// Die Zahlen stehen im Tooltip und im aria-label, nicht auf dem Band. Tooltip:
// Maus, Fokus oder Tippen oeffnet, Escape oder Verlassen schliesst.
//
// Entree (nur mit revealDelay), Fahrplan BAND_T:
//   revealMode 'enter': Lineal wird abgetastet (Clip-Wipe, Abtastkopf) -> Median
//   erscheint -> Band waechst aus dem Median -> Punkt wird geortet (ohne
//   Ueberschwingen), Zielklammern greifen zu und verblassen, Ping.
//   revealMode 'remeasure' (Filterwechsel): nur Median einblenden, Band aus dem
//   Median aufdecken, kleiner Ping; Punkt, Lineal und Skala bleiben stehen.
// Positionen und Breiten stehen immer fest im DOM; animiert werden nur transform,
// opacity und clip-path (useRevealOnce, ResultVisuals.tsx, fill 'backwards').
// Bei Reduktion (sanfte Stufe): Lineal per clip-path, Band per clip-path aus dem
// Median, Median/Punkt/Klammern blenden ein, Ring ohne Wachstum, kein Abtastkopf.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Quant } from "../data/benchmarkCore";
import { CSS_EASE_IN_OUT, CSS_EASE_OUT, safeAnimate, useReducedMotionSafe, withAlpha } from "./fx";
import { BAND_T } from "./resultfx";
import { useRevealOnce, type RevealStep } from "./ResultVisuals";

const SURFACE = "#0a0d1a";
/** Tooltip: Einblenden in ms; Ausblenden mit rund 60 % davon. */
const TIP_IN = 140;
const TIP_OUT = 90;

// Modulweit: Ist schon ein Tooltip offen (oder gerade erst zu), oeffnen weitere ohne Transition.
let tipsOpen = 0;
let lastTipClose = -Infinity;
const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

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
  /** Entree beim ersten Sichtkontakt, Verzoegerung in Sekunden. Ohne Angabe kein Entree. */
  revealDelay?: number;
  /**
   * 'enter' (Standard): volles Entree mit Abtasten des Lineals und Ortung des Punkts.
   * 'remeasure': Neuvermessung nach Filterwechsel, nur Median, Band und Ping.
   * Wirkt nur zusammen mit revealDelay.
   */
  revealMode?: "enter" | "remeasure";
}

const ComparisonBand = ({ min, max, ticks = [], q, own = null, color, describe, label, scale, revealDelay, revealMode = "enter" }: ComparisonBandProps) => {
  const [open, setOpen] = useState(false);
  const [focusVisible, setFocusVisible] = useState(false);
  const frac = (v: number) => (Math.max(min, Math.min(max, v)) - min) / (max - min);
  const x = (v: number) => `${frac(v) * 100}%`;
  const w = (a: number, b: number) => `max(3px, ${((b - a) / (max - min)) * 100}%)`;

  // Tooltip am Rand nicht ueber den Bildschirm hinausschieben.
  const anchor = own ?? q?.p50 ?? (min + max) / 2;
  const f = frac(anchor);
  const tipShift = f < 0.2 ? "0%" : f > 0.8 ? "-100%" : "-50%";
  const tipOrigin = f < 0.2 ? "left bottom" : f > 0.8 ? "right bottom" : "center bottom";

  // ─── Entree ────────────────────────────────────────────────────────────────
  const rootRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const medianRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const pingRef = useRef<HTMLSpanElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const scaleARef = useRef<HTMLSpanElement>(null);
  const scaleBRef = useRef<HTMLSpanElement>(null);
  // Das Band waechst aus dem Median heraus.
  const originPct = q && q.p75 > q.p25 ? ((q.p50 - q.p25) / (q.p75 - q.p25)) * 100 : 50;
  const bandOrigin = `${originPct}%`;
  const showHead = revealDelay !== undefined && revealMode === "enter";

  useRevealOnce(rootRef, (host, reduced) => {
    if (revealDelay === undefined) return [];
    const d = revealDelay * 1000;
    const o = Math.max(0, Math.min(100, originPct));
    // Band aus dem Median aufdecken (ohne Bewegung): sanfte Stufe und Neuvermessung.
    const bandClip: Keyframe[] = [{ clipPath: `inset(0 ${100 - o}% 0 ${o}%)` }, { clipPath: "inset(0 0% 0 0%)" }];
    const steps: RevealStep[] = [];

    if (revealMode === "remeasure") {
      // Neuvermessung: Punkt, Lineal und Skala bleiben stehen.
      const re = BAND_T.re;
      if (q) {
        steps.push(
          { el: medianRef.current, duration: re.medianDur, delay: d + re.median,
            keyframes: [{ opacity: 0 }, { opacity: 1 }] },
          { el: bandRef.current, duration: re.bandDur, delay: d + re.band, keyframes: bandClip },
        );
      }
      if (own !== null) {
        steps.push({ el: pingRef.current, duration: re.pingDur, delay: d + re.ping,
          keyframes: reduced
            ? [{ opacity: 0.55 }, { opacity: 0 }]
            : [{ transform: "scale(1)", opacity: 0.55 }, { transform: "scale(2)", opacity: 0 }] });
      }
      return steps;
    }

    // 1) Skala abtasten: Lineal per Clip-Wipe, Skalenzahlen beim Ueberstreichen.
    steps.push(
      { el: rulerRef.current, duration: BAND_T.scanDur, delay: d, easing: "linear",
        keyframes: [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)" }] },
      { el: scaleARef.current, duration: 200, delay: d, keyframes: [{ opacity: 0 }, { opacity: 1 }] },
      { el: scaleBRef.current, duration: 200, delay: d + BAND_T.scanDur - 60, keyframes: [{ opacity: 0 }, { opacity: 1 }] },
    );
    if (!reduced) {
      // Abtastkopf (nur normale Stufe; bei Reduktion traegt der Clip-Wipe das Abtasten).
      steps.push(
        { el: layerRef.current, duration: BAND_T.scanDur, delay: d, easing: "linear",
          keyframes: [{ transform: "translateX(-100%)" }, { transform: "translateX(0%)" }] },
        { el: headRef.current, duration: BAND_T.scanDur + 100, delay: d, easing: "linear",
          keyframes: [{ opacity: 0 }, { opacity: 1, offset: 0.05 }, { opacity: 1, offset: 0.85 }, { opacity: 0 }] },
      );
    }

    // 2) Gruppe: Median zuerst, das Band waechst daraus.
    if (q) {
      steps.push(
        { el: medianRef.current, duration: BAND_T.medianDur, delay: d + BAND_T.median,
          keyframes: reduced
            ? [{ opacity: 0 }, { opacity: 1 }]
            : [{ opacity: 0, transform: "scaleY(0.4)" }, { opacity: 1, transform: "scaleY(1)" }] },
        { el: bandRef.current, duration: BAND_T.bandDur, delay: d + BAND_T.band,
          easing: reduced ? CSS_EASE_OUT : CSS_EASE_IN_OUT,
          keyframes: reduced ? bandClip : [{ transform: "scaleX(0.02)" }, { transform: "scaleX(1)" }] },
      );
    }

    // 3) Eigener Wert: Punkt an Ort und Stelle (nie ueber 1), Klammern, Ping.
    if (own !== null) {
      steps.push({ el: dotRef.current, duration: BAND_T.dotDur, delay: d + BAND_T.dot, easing: CSS_EASE_OUT,
        keyframes: reduced
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [{ opacity: 0, transform: "scale(0.5)" }, { opacity: 1, transform: "scale(1)" }] });
      for (const s of [-1, 1]) {
        steps.push({ el: host.querySelector(`[data-cb-lock="${s}"]`), duration: BAND_T.lockDur, delay: d + BAND_T.lock,
          easing: "linear",
          keyframes: [
            { opacity: 0, transform: `translateX(${s * 6}px)`, offset: 0, easing: CSS_EASE_OUT },
            { opacity: 1, transform: "translateX(0px)", offset: 0.5, easing: "ease" },
            { opacity: 0, transform: "translateX(0px)", offset: 1 },
          ] });
      }
      steps.push({ el: pingRef.current, duration: BAND_T.pingDur, delay: d + BAND_T.ping,
        keyframes: reduced
          ? [{ opacity: 0.7 }, { opacity: 0 }]
          : [{ transform: "scale(1)", opacity: 0.7 }, { transform: "scale(2.6)", opacity: 0 }] });
    }
    return steps;
  }, { amount: 0.6 });

  // ─── Tooltip ───────────────────────────────────────────────────────────────
  // Gemountet, solange offen oder beim Ausblenden; geschlossen ist er nicht im DOM
  // (sonst verbreitert der unsichtbare Kasten auf schmalen Bildschirmen die Seite).
  const reduced = useReducedMotionSafe();
  const [tipMounted, setTipMounted] = useState(false);
  const tipRef = useRef<HTMLDivElement>(null);
  const tipAnim = useRef<Animation | null>(null);
  const closedTransform = `translateX(${tipShift}) translateY(4px) scale(0.97)`;
  const openTransform = `translateX(${tipShift}) translateY(0px) scale(1)`;

  // Zaehlt modulweit offene Tooltips und merkt sich beim Oeffnen, ob schon einer offen war.
  const countedRef = useRef(false);
  const instantRef = useRef(false);
  useLayoutEffect(() => {
    if (open && !countedRef.current) {
      instantRef.current = tipsOpen > 0 || now() - lastTipClose < 300;
      tipsOpen++;
      countedRef.current = true;
    } else if (!open && countedRef.current) {
      tipsOpen = Math.max(0, tipsOpen - 1);
      lastTipClose = now();
      countedRef.current = false;
    }
  }, [open]);
  useEffect(() => () => {
    if (!countedRef.current) return;
    tipsOpen = Math.max(0, tipsOpen - 1);
    lastTipClose = now();
    countedRef.current = false;
  }, []);

  useLayoutEffect(() => {
    if (open && !tipMounted) {
      setTipMounted(true);
      return;
    }
    const el = tipRef.current;
    if (!el) return;
    tipAnim.current?.cancel();
    tipAnim.current = null;
    if (open) {
      // Schon ein Tooltip offen (oder eben geschlossen): ohne Transition.
      if (instantRef.current) return;
      tipAnim.current = safeAnimate(el,
        reduced
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [{ opacity: 0, transform: closedTransform }, { opacity: 1, transform: openTransform }],
        { duration: TIP_IN, easing: CSS_EASE_OUT });
      return;
    }
    if (!tipMounted) return;
    const a = safeAnimate(el,
      reduced
        ? [{ opacity: 1 }, { opacity: 0 }]
        : [{ opacity: 1, transform: openTransform }, { opacity: 0, transform: closedTransform }],
      { duration: TIP_OUT, easing: CSS_EASE_OUT, fill: "forwards" });
    if (!a) {
      setTipMounted(false);
      return;
    }
    tipAnim.current = a;
    a.onfinish = () => {
      if (tipAnim.current === a) setTipMounted(false);
    };
    // nur bei Oeffnen/Schliessen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tipMounted]);

  return (
    <div
      ref={rootRef}
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
          <span ref={scaleARef}>{scale[0]}</span><span ref={scaleBRef}>{scale[1]}</span>
        </div>
      )}
      {/* Rille (statt Grundlinie, gleiche Mitte bei 13 px); bleibt auch im Druck */}
      <div aria-hidden="true" style={{
        position: "absolute", left: 0, right: 0, top: "11px", height: "4px", borderRadius: "2px",
        background: "rgba(255,255,255,0.045)", boxShadow: "inset 0 1px 1px rgba(0,0,0,0.45)", pointerEvents: "none",
      }} />
      {/* Messlineal: vorhandene Skalenstriche, Enden betont, Feinstriche an den Mittelpunkten (ohne Beschriftung) */}
      <div ref={rulerRef} aria-hidden="true" style={{
        position: "absolute", left: 0, right: 0, top: 0, height: "26px", pointerEvents: "none",
        opacity: open ? 1 : 0.8, transition: "opacity 200ms ease",
      }}>
        {ticks.slice(0, -1).map((t, i) => (
          <div key={`m${t}`} className="fx-deco" style={{ position: "absolute", left: x((t + ticks[i + 1]) / 2), top: "10.5px", width: "1px", height: "5px", background: "rgba(255,255,255,0.07)" }} />
        ))}
        {ticks.map((t, i) => {
          const end = i === 0 || i === ticks.length - 1;
          return (
            <div key={t} style={{
              position: "absolute", left: x(t), top: end ? "8px" : "9px", width: "1px", height: end ? "10px" : "8px",
              background: end ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.16)",
            }} />
          );
        })}
      </div>
      {/* Deko: Abtastkopf beim Entree (endet unsichtbar) */}
      {showHead && (
        <div aria-hidden="true" className="fx-deco" style={{ position: "absolute", left: 0, right: 0, top: 0, height: "26px", overflow: "hidden", pointerEvents: "none" }}>
          <div ref={layerRef} style={{ position: "absolute", inset: 0 }}>
            <div ref={headRef} style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "44px", opacity: 0 }}>
              <span style={{ position: "absolute", right: 0, top: "2px", bottom: "2px", width: "2px", borderRadius: "1px", background: withAlpha(color, 0.95) }} />
              <span style={{ position: "absolute", right: "2px", top: "7px", height: "12px", width: "42px", background: `linear-gradient(90deg, transparent, ${withAlpha(color, 0.28)})` }} />
            </div>
          </div>
        </div>
      )}

      {q && (
        <>
          <div
            ref={bandRef}
            style={{
              position: "absolute", left: x(q.p25), width: w(q.p25, q.p75),
              top: "7px", height: "12px", borderRadius: "4px",
              // Glaskapsel: Verlauf nur vertikal, horizontal gleichfoermig.
              background: `linear-gradient(180deg, ${withAlpha(color, 0.62)}, ${withAlpha(color, 0.36)})`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.22), inset 0 0 0 1px ${withAlpha(color, 0.5)}, 0 0 12px ${withAlpha(color, 0.2)}`,
              transformOrigin: `${bandOrigin} 50%`,
            }}
          >
            {/* Deko: Hover-Glanz, gleichmaessig ueber das ganze Band */}
            <span aria-hidden="true" className="fx-deco" style={{
              position: "absolute", inset: 0, borderRadius: "inherit", background: "rgba(255,255,255,0.10)",
              opacity: open ? 1 : 0, transition: "opacity 160ms ease", pointerEvents: "none",
            }} />
          </div>
          <div ref={medianRef} style={{
            position: "absolute", left: x(q.p50), top: "4px", width: "2px", height: "18px", marginLeft: "-1px", borderRadius: "1px",
            background: "rgba(255,255,255,0.95)", boxShadow: "0 0 0 1px rgba(10,13,26,0.55), 0 0 6px rgba(255,255,255,0.4)",
          }}>
            {/* Deko: Hover-Leuchten am Strich */}
            <span aria-hidden="true" className="fx-deco" style={{
              position: "absolute", inset: "-2px -3px", borderRadius: "3px", boxShadow: "0 0 10px rgba(255,255,255,0.5)",
              opacity: open ? 1 : 0, transition: "opacity 160ms ease", pointerEvents: "none",
            }} />
          </div>
        </>
      )}

      {own !== null && (
        <>
          <div
            ref={dotRef}
            style={{
              position: "absolute", left: x(own), top: "7px", width: "12px", height: "12px", marginLeft: "-6px",
              borderRadius: "50%",
              background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.55) 0, ${color} 45%, ${color} 100%)`,
              boxShadow: `0 0 0 2px ${SURFACE}, 0 0 10px ${withAlpha(color, 0.5)}`,
            }}
          >
            {/* Deko: Hover-Halo um den Punkt */}
            <span aria-hidden="true" className="fx-deco" style={{
              position: "absolute", inset: "-4px", borderRadius: "50%", border: `1px solid ${color}`,
              opacity: open ? 1 : 0, transition: "opacity 160ms ease", pointerEvents: "none",
            }} />
            {/* Deko: Ortungsring beim Entree (sonst unsichtbar) */}
            <span ref={pingRef} aria-hidden="true" className="fx-deco"
              style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1.5px solid ${color}`, opacity: 0, pointerEvents: "none" }} />
          </div>
          {/* Deko: Zielklammern der Ortung (enden unsichtbar), max. 13 px Ueberstand */}
          {([-1, 1] as const).map((s) => (
            <span key={s} aria-hidden="true" className="fx-deco" data-cb-lock={String(s)} style={{
              position: "absolute", top: "4px", height: "18px", width: "4px", left: x(own),
              marginLeft: s < 0 ? "-13px" : "9px",
              borderTop: `1.5px solid ${color}`, borderBottom: `1.5px solid ${color}`,
              ...(s < 0 ? { borderLeft: `1.5px solid ${color}` } : { borderRight: `1.5px solid ${color}` }),
              opacity: 0, pointerEvents: "none",
            }} />
          ))}
        </>
      )}

      {tipMounted && describe.length > 0 && (
        <div
          ref={tipRef}
          role="presentation"
          aria-hidden={open ? undefined : true}
          style={{
            position: "absolute", bottom: "30px", left: x(anchor),
            transform: openTransform, transformOrigin: tipOrigin, zIndex: 5, pointerEvents: "none",
            background: "linear-gradient(180deg, rgba(20,27,48,0.97), rgba(12,17,32,0.97))", border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: "8px", padding: "7px 10px", maxWidth: "min(300px, 80vw)",
            fontFamily: "Inter, sans-serif", fontSize: "12px", lineHeight: 1.5, color: "rgba(255,255,255,0.88)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 10px 28px rgba(0,0,0,0.45)",
          }}
        >
          {describe.map((d) => <div key={d} style={{ whiteSpace: "nowrap" }}>{d}</div>)}
        </div>
      )}
    </div>
  );
};

export default ComparisonBand;
