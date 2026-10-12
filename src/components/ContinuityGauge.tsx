// Tacho fuer "Kontinuitaet bei Anbieterstoerungen" (0..1): Praezisions-Rundinstrument.
// Kodierung (unveraendert): Halbkreis mit drei Zonen (Grenzen 1/3, 2/3), Nadel = eigener
// Wert (Spitze exakt bei point(value, R - 10), Winkel clamp01(value) * 180), duenne Boegen =
// mittlere Haelfte der Vergleichsgruppen (A durchgezogen, B gestrichelt), Raute = ihr Median.
// Material (alles aria-hidden, fx-deco, ohne Text und Zahl): Zifferblatt-Verlauf, Rille,
// Glanz auf dem Zonenband, Gravur (verfeinert nur die vorhandenen Teilungen 0/50/100 %),
// konische Nadel mit Gegengewicht und Nabe.
//
// Entree als Messlauf (useRevealOnce, ResultVisuals.tsx; WAAPI mit fill 'backwards'):
//   0-0,9 s   Skala: Zonen zeichnen sich in einer Fahrt, Gravur und Skalentexte mit.
//   ab 0,95 s Gruppen: Raute zuerst, Bogen waechst aus dem Median (Deko-Halbboegen,
//             bei B per Maske gleich gestrichelt), danach der echte Bogen und der Buchstabe.
//   1,3-2,3 s Nadel schlaegt ohne Ueberschwingen aus, Phosphorspur deckungsgleich
//             dahinter, die Zahl zaehlt synchron.
//   2,3 s     Zonentreffer leuchtet kurz, Ping an der Nadelspitze.
// Das Markup zeigt immer den Endzustand; Spur, Halbboegen und Zonentreffer enden unsichtbar.
// Druck und verstecktes Tab: Endzustand. Bei Reduktion (sanfte Stufe): keine Drehung,
// die Nadel steht auf dem Wert und blendet zur Ankunft ein, Spur und Skala zeichnen sich,
// die Zahl zaehlt, der Ping waechst hoechstens auf 1.15.
// Filterwechsel: nur neue Vergleichsgruppen bauen sich aus der Raute neu auf
// (useGroupRegrow); Nadel und Zahl bleiben stehen. Keine Dauerschleife.
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Quant } from "../data/benchmarkCore";
import { CSS_EASE_IN_OUT, CSS_EASE_OUT, EASE_OUT, SvgPing } from "./fx";
import { useGroupRegrow, useSvgUid, useValueCount, type FxStep } from "./resultfx";
import { quantKey, useRevealOnce, type RevealStep } from "./ResultVisuals";

const W = 320, H = 206, CX = 160, CY = 172, R = 128;
const ZONES = [
  { from: 0, to: 1 / 3, color: "rgba(207,107,107,0.55)" },
  { from: 1 / 3, to: 2 / 3, color: "rgba(217,165,89,0.55)" },
  { from: 2 / 3, to: 1, color: "rgba(108,194,181,0.6)" },
];
/** Deckende Zonenfarben fuer den kurzen Zonentreffer bei Ankunft (Deko). */
const ZONE_HIT = ["rgb(207,107,107)", "rgb(217,165,89)", "rgb(108,194,181)"];
const LABEL = "rgba(214,230,245,0.55)";
const PLATE = "#0a0d1a";

/** Zeitplan des Entrees (ms). */
const ZONE_MS = 300;
const SCALE_END = 900;
const CMP_START = 950;
const CMP_STEP = 100;
const NEEDLE_DELAY = 1300;
const NEEDLE_DUR = 1000;
const ARRIVAL = NEEDLE_DELAY + NEEDLE_DUR;
/** Nachleuchten der Spur nach der Ankunft. */
const TRAIL_FADE = 500;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

// Wert 0..1 auf den Halbkreis: 0 links, 1 rechts, ueber oben.
const point = (v: number, r: number) => {
  const a = Math.PI * (1 - clamp01(v));
  return { x: CX + r * Math.cos(a), y: CY - r * Math.sin(a) };
};
const arc = (from: number, to: number, r: number) => {
  const a = point(from, r), b = point(to, r);
  return `M ${a.x} ${a.y} A ${r} ${r} 0 0 1 ${b.x} ${b.y}`;
};

// Gravur auf dem Zonenband: Radiallinien alle 5 %, von links nach rechts.
// Lang bei 0/50/100 % (die beschrifteten Teilungen), mittel alle 10 %, sonst kurz.
const ENGRAVE_D = Array.from({ length: 21 }, (_, i) => {
  const v = i / 20;
  const r1 = i % 10 === 0 ? 119 : i % 2 === 0 ? 126 : 131;
  const a = point(v, r1), b = point(v, 137);
  return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
}).join(" ");
// Zeichenmaske der Gravur: ein durchgehender Bogen ueber das Band (unten kurz
// verlaengert, damit die waagrechten Teilungen bei 0 und 100 % ganz abgedeckt sind).
// Mehrere Unterpfade setzen das Strichmuster im Browser je Unterpfad zurueck; ueber
// die Maske laeuft die Gravur verlaesslich als eine Fahrt von links nach rechts.
const ENGRAVE_MASK_D = `M ${CX - R} ${CY + 12} L ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY} L ${CX + R} ${CY + 12}`;

/** Bogen waechst aus dem Median: zeichnen, kurz stehen, ausblenden (endet unsichtbar).
 *  Der erste, sehr kurze Abschnitt blendet nur ein, damit vor dem Start kein Linienende
 *  (runde Kappe einer Strichlaenge 0) sichtbar ist. */
const HALF_KF: Keyframe[] = [
  { strokeDashoffset: 1, opacity: 0, offset: 0 },
  { strokeDashoffset: 1, opacity: 1, offset: 0.01, easing: CSS_EASE_OUT },
  { strokeDashoffset: 0, opacity: 1, offset: 0.6, easing: "ease" },
  { strokeDashoffset: 0, opacity: 0, offset: 1 },
];
const FADE_IN: Keyframe[] = [{ opacity: 0 }, { opacity: 1 }];

const gq = (root: Element, sel: string) => Array.from(root.querySelectorAll(`[data-gc="${sel}"]`));

/** Aufbau einer Vergleichsgruppe aus der Raute (Entree und Filterwechsel). */
function groupSteps(g: Element, t0: number, t: { dia: number; half: number; arc: number; arcDur: number; diaDur: number }): FxStep[] {
  const steps: FxStep[] = [];
  gq(g, "cmp-dia").forEach((el) => steps.push({ el, keyframes: FADE_IN, duration: t.diaDur, delay: t0 + t.dia }));
  gq(g, "half").forEach((el) => steps.push({ el, keyframes: HALF_KF, duration: 650, delay: t0 + t.half, easing: "linear" }));
  [...gq(g, "cmp-arc"), ...gq(g, "cmp-tag")].forEach((el) =>
    steps.push({ el, keyframes: FADE_IN, duration: t.arcDur, delay: t0 + t.arc }));
  return steps;
}

export type GaugeCompare = { q: Quant; tag?: string };

export default function ContinuityGauge({
  value, compare = [], ariaLabel,
}: {
  value: number | null;
  compare?: GaugeCompare[];
  ariaLabel?: string;
}) {
  const uid = useSvgUid();
  const svgRef = useRef<SVGSVGElement>(null);
  const textRef = useRef<SVGTextElement>(null);
  const angle = value !== null ? clamp01(value) * 180 : 0;
  const label = value !== null ? `${Math.round(value * 100)} %` : "";
  const needleTip = value !== null ? point(value, R - 10) : null;
  const trailD = value !== null && value > 0.005 ? arc(0, value, R) : null;
  const hitZone = value !== null ? Math.min(2, Math.floor(clamp01(value) * 3)) : 0;
  const compareKey = compare.map((c) => `${c.tag ?? ""}|${quantKey(c.q)}`).join("/");

  const played = useRevealOnce(svgRef, (host, reduced) => {
    const q = (sel: string) => gq(host, sel);
    const steps: RevealStep[] = [];
    const draw: Keyframe[] = [{ strokeDasharray: "1 1", strokeDashoffset: 1 }, { strokeDasharray: "1 1", strokeDashoffset: 0 }];
    // 1. Skala: Zonen nacheinander in einer durchgehenden Fahrt, Gravur und Texte mit
    q("zone").forEach((el, i) => steps.push({
      el, duration: ZONE_MS, delay: i * ZONE_MS, easing: "linear", keyframes: draw,
    }));
    q("engrave-mask").forEach((el) => steps.push({
      el, duration: SCALE_END, delay: 0, easing: "linear", keyframes: draw,
    }));
    q("lab").forEach((el) => steps.push({
      el, duration: 200, delay: Number(el.getAttribute("data-at") ?? 0) * SCALE_END, keyframes: FADE_IN,
    }));
    // 2. Gruppen: Raute zuerst, Bogen waechst aus dem Median, dann echter Bogen und Buchstabe
    Array.from(host.querySelectorAll("[data-rfx-group]")).forEach((g, i) => {
      steps.push(...groupSteps(g, CMP_START + i * CMP_STEP, { dia: 0, diaDur: 180, half: 50, arc: 300, arcDur: 220 }));
    });
    // 3. Nadel: von 0 auf den Wert, ohne Ueberschwingen.
    // Sanfte Stufe: die Nadel steht schon auf dem Wert und blendet zur Ankunft ein.
    q("needle").forEach((el) => steps.push(reduced
      ? { el, duration: 300, delay: ARRIVAL - 300, keyframes: FADE_IN }
      : {
        el, duration: NEEDLE_DUR, delay: NEEDLE_DELAY, easing: CSS_EASE_OUT,
        keyframes: [{ transform: "rotate(0deg)" }, { transform: `rotate(${angle}deg)` }],
      }));
    // Phosphorspur: gleiche Kurve wie die Nadel; Bogenlaenge proportional zum Winkel,
    // also deckungsgleich mit der Nadel. Zeichnen ist auch in der sanften Stufe erlaubt.
    q("trail-path").forEach((el) => steps.push({
      el, duration: NEEDLE_DUR, delay: NEEDLE_DELAY, easing: CSS_EASE_OUT,
      keyframes: [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }],
    }));
    q("trail").forEach((el) => steps.push({
      el, duration: NEEDLE_DUR + TRAIL_FADE, delay: NEEDLE_DELAY, easing: "linear",
      keyframes: [
        { opacity: 0, offset: 0 },
        { opacity: 1, offset: 0.004 },
        { opacity: 1, offset: NEEDLE_DUR / (NEEDLE_DUR + TRAIL_FADE) },
        { opacity: 0, offset: 1 },
      ],
    }));
    // 4. Zonentreffer bei Ankunft (endet unsichtbar)
    q("zonehit").forEach((el) => steps.push({
      el, duration: 900, delay: ARRIVAL, easing: CSS_EASE_IN_OUT,
      keyframes: [{ opacity: 0 }, { opacity: 0.45, offset: 0.3 }, { opacity: 0 }],
    }));
    return steps;
  }, {
    amount: 0.4,
    // Filterwechsel vor dem Entree: Schritte fuer die neuen Vergleichsgruppen neu anlegen
    rebuildKey: compareKey,
  });

  // Filterwechsel nach dem Entree: nur die neuen Gruppen bauen sich aus der Raute auf.
  useGroupRegrow(svgRef, compareKey, (g) =>
    groupSteps(g, 0, { dia: 0, diaDur: 160, half: 40, arc: 260, arcDur: 200 }));

  // Prozentzahl zaehlt synchron zur Nadel (gleicher Start, gleiche Kurve) von 0 %
  // und endet zeichengleich auf `label`. Bis zum Sichtkontakt steht der Endtext im
  // DOM (useValueCount); Druck und verstecktes Tab: Endtext.
  useValueCount(textRef, {
    hostRef: svgRef, enabled: value !== null, from: 0, to: value ?? 0,
    format: (v) => `${Math.round(v * 100)} %`, final: label,
    delayMs: NEEDLE_DELAY, durMs: NEEDLE_DUR, ease: EASE_OUT,
  });

  // Ping an der Nadelspitze bei Ankunft (einmalig, Deko)
  const [ping, setPing] = useState(0);
  useEffect(() => {
    if (!played || !needleTip) return;
    const id = window.setTimeout(() => setPing(1), ARRIVAL);
    return () => window.clearTimeout(id);
    // nur beim Start des Entrees
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [played]);

  const deco = { "aria-hidden": true, className: "fx-deco", pointerEvents: "none" } as const;

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" style={{ maxWidth: 420 }}
      role={ariaLabel ? "img" : undefined} aria-label={ariaLabel}>
      <defs>
        <radialGradient id={`${uid}dial`} gradientUnits="userSpaceOnUse" cx={CX} cy={CY} r={R}>
          <stop offset="0" stopColor="rgb(139,164,255)" stopOpacity="0.08" />
          <stop offset="1" stopColor="rgb(139,164,255)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}gl`} gradientUnits="userSpaceOnUse" x1={CX} y1={CY - R - 9} x2={CX} y2={CY}>
          <stop offset="0" stopColor="#fff" stopOpacity="0.14" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id={`${uid}em`} maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
          <path data-gc="engrave-mask" d={ENGRAVE_MASK_D} pathLength={1} fill="none" stroke="#fff" strokeWidth="22" />
        </mask>
      </defs>

      {/* Zifferblatt und Rille (Deko) */}
      <path {...deco} d={`M ${CX - (R - 9)} ${CY} A ${R - 9} ${R - 9} 0 0 1 ${CX + (R - 9)} ${CY} Z`} fill={`url(#${uid}dial)`} />
      <path {...deco} d={arc(0, 1, R)} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="24" />

      {ZONES.map((z) => (
        <path key={z.from} data-gc="zone" d={arc(z.from, z.to, R)} pathLength={1} fill="none" stroke={z.color} strokeWidth="18" />
      ))}

      {/* Glanz und Gravur auf dem Zonenband (Deko) */}
      <path {...deco} d={arc(0, 1, R)} fill="none" stroke={`url(#${uid}gl)`} strokeWidth="18" />
      <path {...deco} data-gc="engrave" d={ENGRAVE_D} mask={`url(#${uid}em)`} fill="none"
        stroke="rgba(7,10,21,0.55)" strokeWidth="1.2" />

      {/* Skala */}
      <text data-gc="lab" data-at="0" x={CX - R} y={CY + 22} textAnchor="middle" fontFamily="'Geist','Inter',sans-serif" fontSize="11" fill={LABEL}>0 %</text>
      <text data-gc="lab" data-at="0.5" x={CX} y={CY - R - 16} textAnchor="middle" fontFamily="'Geist','Inter',sans-serif" fontSize="11" fill={LABEL}>50 %</text>
      <text data-gc="lab" data-at="1" x={CX + R} y={CY + 22} textAnchor="middle" fontFamily="'Geist','Inter',sans-serif" fontSize="11" fill={LABEL}>100 %</text>

      {needleTip && (
        <>
          {/* Phosphorspur hinter der Nadel (Deko, endet unsichtbar) */}
          {trailD && (
            <g data-gc="trail" {...deco} style={{ opacity: 0 }}>
              <path data-gc="trail-path" d={trailD} pathLength={1} strokeDasharray="1 1" strokeDashoffset={0}
                fill="none" strokeLinecap="round" stroke="rgba(255,255,255,0.18)" strokeWidth="9" />
              <path data-gc="trail-path" d={trailD} pathLength={1} strokeDasharray="1 1" strokeDashoffset={0}
                fill="none" strokeLinecap="round" stroke="rgba(255,255,255,0.85)" strokeWidth="3" />
            </g>
          )}
          {/* Zonentreffer: die getroffene Zone leuchtet bei Ankunft kurz auf (Deko, endet unsichtbar) */}
          <path {...deco} data-gc="zonehit" d={arc(ZONES[hitZone].from, ZONES[hitZone].to, R)} fill="none"
            stroke={ZONE_HIT[hitZone]} strokeWidth="18" style={{ opacity: 0 }} />

          {/* Nadel = eigener Wert. Waagrecht nach links gezeichnet und um den Wert
              gedreht: Spitze geometrisch identisch zu point(value, R - 10). */}
          <g data-gc="needle" style={{ transformBox: "view-box", transformOrigin: `${CX}px ${CY}px`, transform: `rotate(${angle}deg)` }}>
            <polygon points={`${CX},${CY - 3.4} ${CX - (R - 10)},${CY - 0.6} ${CX - (R - 10)},${CY + 0.6} ${CX},${CY + 3.4}`} fill="#fff" />
            <polygon points={`${CX},${CY - 2} ${CX + 10},${CY - 1.2} ${CX + 10},${CY + 1.2} ${CX},${CY + 2}`} fill="rgba(255,255,255,0.5)" />
            <circle cx={CX} cy={CY} r={9} fill={PLATE} stroke="rgba(255,255,255,0.55)" strokeWidth="1.2" />
            <circle cx={CX} cy={CY} r={4} fill="#fff" />
          </g>
          <SvgPing cx={needleTip.x} cy={needleTip.y} r={4} color="#fff" play={ping} scale={3.5} duration={0.7} />
          <text key={label} ref={textRef} x={CX} y={CY + 28} textAnchor="middle" fontFamily="'Space Grotesk', sans-serif" fontSize="22"
            fontWeight="600" fill="#fff" letterSpacing="-0.01em" style={{ fontVariantNumeric: "tabular-nums" }}>
            {label}
          </text>
        </>
      )}
      {/* Vergleichsgruppen innen, nach der Nadel gezeichnet: Bogen = mittlere Haelfte, Raute = Median.
          Bei einem Filterwechsel bauen sich nur sie neu auf (key je Gruppe), die Nadel bleibt stehen. */}
      <AnimatePresence initial={false}>
        {compare.map((c, i) => {
          const key = `${c.tag ?? ""}|${quantKey(c.q)}`;
          const r = R - 26 - i * 12;
          const m = point(c.q.p50, r), s = 6;
          const lab = point(c.q.p25, r);
          const bandD = arc(c.q.p25, Math.max(c.q.p75, c.q.p25 + 0.005), r);
          const dash = i === 1 ? "6 5" : undefined;
          const halfMask = dash ? `${uid}hm${i}${key.replace(/[^a-zA-Z0-9_-]/g, "_")}` : undefined;
          const halfProps = {
            ...deco, "data-gc": "half", pathLength: 1, strokeDasharray: "1 1", strokeDashoffset: 0,
            stroke: "#fff", strokeWidth: 4, strokeLinecap: "round", fill: "none", style: { opacity: 0 },
          } as const;
          return (
            <motion.g key={key} data-rfx-group={key}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.25, delay: i * 0.08, ease: EASE_OUT }}>
              {/* Unterlage: dunkle Fassung des Bogens (Deko, gleiche Spanne) */}
              <path data-gc="cmp-arc" aria-hidden="true" d={bandD} fill="none" stroke={PLATE} strokeWidth="7" strokeLinecap="round" />
              <path data-gc="cmp-arc" d={bandD} fill="none" stroke="rgba(255,255,255,0.75)"
                strokeWidth="4" strokeLinecap="round" strokeDasharray={dash} />
              {/* Bogen waechst aus dem Median nach beiden Seiten (Deko, endet unsichtbar).
                  Gestrichelte Gruppe: Maske mit exakt der Geometrie des echten Bogens (gleicher
                  Pfad, Breite, Kappen, Strichmuster), damit B auch im Aufbau nie durchgezogen wirkt. */}
              {halfMask && (
                <mask id={halfMask} maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
                  <path d={bandD} fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeDasharray={dash} />
                </mask>
              )}
              <g aria-hidden="true" mask={halfMask ? `url(#${halfMask})` : undefined}>
                {c.q.p75 - c.q.p50 >= 0.005 && <path {...halfProps} d={arc(c.q.p50, c.q.p75, r)} />}
                {c.q.p50 - c.q.p25 >= 0.005 && <path {...halfProps} d={`M ${m.x} ${m.y} A ${r} ${r} 0 0 0 ${lab.x} ${lab.y}`} />}
              </g>
              {/* Raute wie in den Matrizen; nach der Nadel gezeichnet und dunkel gefuellt,
                  damit sie auch sichtbar bleibt, wenn die Nadel genau auf dem Median steht */}
              <polygon data-gc="cmp-dia" points={`${m.x},${m.y - s} ${m.x + s},${m.y} ${m.x},${m.y + s} ${m.x - s},${m.y}`}
                fill={PLATE} stroke="#fff" strokeWidth="1.6" />
              {c.tag && (
                <text data-gc="cmp-tag" x={lab.x - 8} y={lab.y + 4} textAnchor="end" fontFamily="'Space Grotesk', sans-serif" fontSize="11"
                  fontWeight="600" fill="#fff" stroke="#070a15" strokeWidth="4" strokeLinejoin="round" paintOrder="stroke">
                  {c.tag}
                </text>
              )}
            </motion.g>
          );
        })}
      </AnimatePresence>

    </svg>
  );
}
