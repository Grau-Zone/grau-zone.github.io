// Radar der vier organisationalen Faehigkeiten (Startseite). Redesign: feine Linienzeichnung im
// Look des Reportings. Vier Kreisringe, vier Achsen und eine Randteilung wie im Hero-Radar, das
// Profil als gruene Linie mit zartem Schleier, Wertpunkte mit Ring in der Farbe des Grundes,
// Prozentwerte als Zahlen. Auf Weiss in Tinte und HSG-Gruen; steht der Radar in einem Abschnitt
// mit rx-deep, schalten die Linien ueber die --rv-* Variablen auf Hellgruen um (dann color auf
// Mint setzen). Beim ersten Sichtkontakt zeichnen sich Ringe und Achsen einmal (Strichlaenge),
// Endzustand ist die volle Zeichnung. Keine Schleife.
import { useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { motion, useMotionValue, useTransform, type MotionValue, type Transition } from "framer-motion";
import {
  CSS_EASE_IN_OUT,
  CSS_EASE_OUT,
  EASE_IN_OUT,
  SvgPing,
  safeAnimate,
  useAnimatedColor,
  useRadarMorph,
  useReducedMotionSafe,
} from "@/components/fx";
import { canRunFx } from "./resultfx/play";
import { RvTokens, V } from "./resultfx/tokens";

// ─── Config ───────────────────────────────────────────────────────────────────
const CX = 220;
const CY = 220;
const MAX_R = 165;
const RINGS = 4;
// viewBox is fitted tightly around the rings + outside labels so the net fills the box:
// PAD_SIDE leaves room for the long side-labels, PAD_VERT for the top/bottom labels
const PAD_SIDE = 178;
const PAD_VERT = 34;
const VB_X = CX - MAX_R - PAD_SIDE;
const VB_Y = CY - MAX_R - PAD_VERT;
const VB_W = 2 * (MAX_R + PAD_SIDE);
const VB_H = 2 * (MAX_R + PAD_VERT);

// 4 capacity axes evenly spaced: top, right, bottom, left
export const AXES = [
  { label: "Switching", sublabel: "Anbieter ersetzen", angle: -90 },
  { label: "Internalization", sublabel: "selbst betreiben", angle: 0 },
  { label: "Multi-Sourcing", sublabel: "parallel beziehen", angle: 90 },
  { label: "Negotiation", sublabel: "Konditionen beeinflussen", angle: 180 },
];

// ─── Capacity definitions (single source of truth for the org part) ─────────────
export interface Capacity {
  key: "sw" | "in" | "ms" | "ne";
  tag: string;        // canonical (English) name, shown on the tab + axis
  title: string;      // German title
  keyQuestion: string;
  color: string;
  colorBg: string;
  colorBorder: string;
  definition: string;  // exactly one definition per capacity
  drivers: string[];   // "Relevante Einflussfaktoren"
  actions: string[];   // "Beispiele organisationaler Maßnahmen" (4)
}

// Redesign: alle vier Faehigkeiten tragen die eine Akzentfarbe (HSG-Gruen). Die Unterscheidung
// tragen Name, Reihenfolge und Position, nicht der Farbton.
export const CAPACITIES: Capacity[] = [
  {
    key: "sw",
    tag: "Switching",
    title: "Wechselfähigkeit",
    keyQuestion: "Können wir den Anbieter wechseln?",
    color: "#00802f",
    colorBg: "rgba(0,128,47,0.08)",
    colorBorder: "rgba(0,128,47,0.25)",
    definition:
      "Fähigkeit einer Organisation, einen bestehenden Anbieter innerhalb vertretbarer Zeit, Kosten und Risiken durch einen anderen Anbieter zu ersetzen.",
    drivers: [
      "Technische Entkopplung",
      "Datenportabilität",
      "Vertragliche Flexibilität",
      "Verfügbarkeit alternativer Anbieter",
    ],
    actions: [
      "Abstraktionsschicht einziehen statt anbieterspezifischer Bindung",
      "Daten und Konfigurationen exportierbar halten",
      "Exit-Klauseln, Fristen und Datenrückgabe vertraglich sichern",
      "Migrationsfähigkeit regelmäßig testen (Shadow-/Fallback-Setup)",
    ],
  },
  {
    key: "in",
    tag: "Internalization",
    title: "Internalisierungsfähigkeit",
    keyQuestion: "Können wir es selbst betreiben?",
    color: "#00802f",
    colorBg: "rgba(0,128,47,0.08)",
    colorBorder: "rgba(0,128,47,0.25)",
    definition:
      "Fähigkeit einer Organisation, eine extern bezogene digitale Leistung bei Bedarf intern bereitzustellen.",
    drivers: [
      "Interne technische Kompetenz",
      "Kontrolle über Daten",
      "Dokumentierte Architektur",
      "Verfügbare Ressourcen und Budget",
    ],
    actions: [
      "Interne technische Kernkompetenz aufbauen und halten",
      "Architektur und Datenflüsse vollständig dokumentieren",
      "Kritische Funktionen mit Eigenbetriebs-Option designen",
      "Ressourcen, Budget und Know-how für Insourcing einplanen",
    ],
  },
  {
    key: "ms",
    tag: "Multi-Sourcing",
    title: "Multi-Sourcing-Fähigkeit",
    keyQuestion: "Können wir mehrere Anbieter parallel nutzen?",
    color: "#00802f",
    colorBg: "rgba(0,128,47,0.08)",
    colorBorder: "rgba(0,128,47,0.25)",
    definition:
      "Fähigkeit einer Organisation, eine digitale Leistung auf mehrere Anbieter zu verteilen oder zwischen mehreren Anbietern zu verlagern.",
    drivers: [
      "Modulare Architektur",
      "Standardisierte Schnittstellen",
      "Datenharmonisierung über Anbieter hinweg",
      "Integrations- und Orchestrierungskompetenz",
    ],
    actions: [
      "Modular und schnittstellenstandardisiert bauen",
      "Daten über Anbieter hinweg harmonisieren",
      "Orchestrierung und Routing zwischen Anbietern aufbauen",
      "Zweiten Anbieter aktiv betreiben, nicht nur vertraglich vorhalten",
    ],
  },
  {
    key: "ne",
    tag: "Negotiation",
    title: "Verhandlungsfähigkeit",
    keyQuestion: "Können wir Konditionen beeinflussen?",
    color: "#00802f",
    colorBg: "rgba(0,128,47,0.08)",
    colorBorder: "rgba(0,128,47,0.25)",
    definition:
      "Fähigkeit einer Organisation, gegenüber einem Anbieter vorteilhafte Vertrags- und Leistungsbedingungen auszuhandeln.",
    drivers: [
      "Verfügbarkeit alternativer Anbieter",
      "Vertragliche Flexibilität",
      "Strategische Bedeutung für den Anbieter",
      "Interne Vertrags- und Beschaffungskompetenz",
    ],
    actions: [
      "Glaubhafte Alternativen zu bestehenden Anbietern aufbauen",
      "Audit-, Konsultations- und Widerspruchsrechte verhandeln",
      "Datenrechte und Jurisdiktion vertraglich absichern",
      "Lock-in-Klauseln und versteckte Kosten begrenzen",
    ],
  },
];

// Realistic "European organisation today" baseline profile [sw, in, ms, ne]
// Order matches AXES / CAPACITIES: [Switching, Internalization, Multi-Sourcing, Negotiation]
export const BASELINE_VALUES: [number, number, number, number] = [0.2, 0.3, 0.25, 0.4];

// ─── Sovereignty result levels (used by the assessment) ─────────────────────────
export interface Level {
  max: number;
  tag: string;
  title: string;
  color: string;
  colorBg: string;
  colorBorder: string;
  description: string;
}

export const LEVELS: Level[] = [
  {
    max: 0.4,
    tag: "Stufe 1",
    title: "Abhängig",
    color: "#FF3D57",
    colorBg: "rgba(255,61,87,0.08)",
    colorBorder: "rgba(255,61,87,0.25)",
    description:
      "Ihre Organisation ist bei kritischen digitalen Funktionen stark von einzelnen Anbietern abhängig. Der Handlungsspielraum ist gering. Einseitige Entscheidungen des Anbieters lassen sich kaum abwehren.",
  },
  {
    max: 0.7,
    tag: "Stufe 2",
    title: "Teilsouverän",
    color: "#FF9F2E",
    colorBg: "rgba(255,159,46,0.08)",
    colorBorder: "rgba(255,159,46,0.25)",
    description:
      "Ihre Organisation hat in einzelnen Fähigkeiten Handlungsspielraum, bleibt in anderen aber verwundbar. Der Handlungsspielraum hält, solange er nicht ernsthaft getestet wird.",
  },
  {
    max: 1.01,
    tag: "Stufe 3",
    title: "Souverän",
    color: "#00C4A0",
    colorBg: "rgba(0,196,160,0.08)",
    colorBorder: "rgba(0,196,160,0.25)",
    description:
      "Ihre Organisation behält bei kritischen digitalen Abhängigkeiten Handlungsspielraum. Wechsel, interne Bereitstellung, Verteilung auf mehrere Anbieter und Verhandlung sind realistische Optionen.",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function polar(angleDeg: number, r: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

/** Randteilung wie im Hero-Radar: alle 5 Grad ein Strich, alle 15 Grad ein langer; um die vier
 *  Achsen herum frei, damit die Namen der Faehigkeiten Platz haben. */
const RIM_TICKS = (() => {
  let d = "";
  for (let k = 0; k < 72; k++) {
    const ang = k * 5;
    const m = ang % 90;
    if (m < 20 || m > 70) continue;
    const a = ((ang - 90) * Math.PI) / 180;
    const r0 = MAX_R + 7;
    const r1 = r0 + (ang % 15 === 0 ? 10 : 5);
    d += `M ${(CX + r0 * Math.cos(a)).toFixed(2)} ${(CY + r0 * Math.sin(a)).toFixed(2)} L ${(CX + r1 * Math.cos(a)).toFixed(2)} ${(CY + r1 * Math.sin(a)).toFixed(2)} `;
  }
  return d;
})();

/**
 * Einmaliges Zeichnen von Ringen, Achsen und Randteilung beim ersten Sichtkontakt. Die Elemente
 * stehen immer voll gezeichnet im DOM; die Animationen (WAAPI, fill 'backwards', bis zum
 * Sichtkontakt pausiert) laufen nur, wenn WAAPI und IntersectionObserver da sind und der Tab
 * sichtbar ist. Zeichnen per Strichlaenge ist auch in der sanften Stufe erlaubt, es gibt keine
 * Transformation. Im Druck steht sofort der Endzustand.
 */
function useRadarDraw(svgRef: RefObject<SVGSVGElement | null>) {
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg || !canRunFx()) return;
    const anims: Animation[] = [];
    const add = (el: Element, keyframes: Keyframe[], duration: number, delay: number, easing = CSS_EASE_OUT) => {
      const a = safeAnimate(el, keyframes, { duration, delay, easing, fill: "backwards" });
      if (a) {
        a.pause();
        anims.push(a);
      }
    };
    const draw: Keyframe[] = [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }];
    svg.querySelectorAll('[data-cr-draw="ring"]').forEach((el, i) => add(el, draw, 1100, 120 + i * 150));
    svg.querySelectorAll('[data-cr-draw="spoke"]').forEach((el, i) => add(el, draw, 800, 60 + i * 70));
    svg.querySelectorAll('[data-cr-draw="fade"]').forEach((el) => add(el, [{ opacity: 0 }, { opacity: 1 }], 700, 650));
    if (!anims.length) return;
    let played = false;
    const play = () => {
      if (played) return;
      played = true;
      anims.forEach((a) => a.play());
    };
    const io =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (es) => {
              if (es.some((e) => e.isIntersecting)) {
                play();
                io?.disconnect();
              }
            },
            { threshold: 0.25 },
          )
        : null;
    io?.observe(svg);
    const onPrint = () => {
      played = true;
      anims.forEach((a) => {
        try {
          a.finish();
        } catch {
          a.cancel();
        }
      });
    };
    window.addEventListener("beforeprint", onPrint);
    return () => {
      io?.disconnect();
      window.removeEventListener("beforeprint", onPrint);
      anims.forEach((a) => a.cancel());
    };
  }, [svgRef]);
}

function anchorFor(angle: number): "start" | "middle" | "end" {
  if (angle === 0) return "start";
  if (angle === 180) return "end";
  return "middle"; // top / bottom
}

/** Projektion Achse/Wert -> SVG-Koordinate (stabil, fuer useRadarMorph). */
const projectAxis = (i: number, v: number) => polar(AXES[i].angle, MAX_R * v);

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Gummiband-Feder fuer den Polygon-Morph. */
const MORPH_SPRING: Transition = { type: "spring", duration: 0.7, bounce: 0.25 };

const PING_DELAY_MS = 700;
/** Pings hoechstens 1 pro 6 s je Achse. */
const PING_MIN_GAP_MS = 6000;

// badge offsets, outward (toward the label); flips inward only near 100% so it never overlaps the outer label
function badgeOffset(angle: number, target: number) {
  const nearMax = target > 0.85;
  const bx = angle === 0 ? (nearMax ? -12 : 12) : angle === 180 ? (nearMax ? 12 : -12) : 0;
  const by = angle === -90 ? (nearMax ? 16 : -12) : angle === 90 ? (nearMax ? -8 : 18) : 4;
  const anchor: "start" | "middle" | "end" =
    angle === 0 ? (nearMax ? "end" : "start") : angle === 180 ? (nearMax ? "start" : "end") : "middle";
  return { bx, by, anchor };
}

/** Dimmen per opacity (auch in der sanften Stufe erlaubt). */
const OPACITY_FADE = `opacity 200ms ${CSS_EASE_IN_OUT}`;

// ─── % badge (eigene Komponente, damit die Hooks je Achse stabil bleiben) ──────
interface BadgeProps {
  index: number;
  angle: number;
  target: number;
  value: MotionValue<number>;
  vx: MotionValue<number>;
  vy: MotionValue<number>;
  fill: MotionValue<string>;
  dim: boolean;
}

const RadarBadge = ({ index, angle, target, value, vx, vy, fill, dim }: BadgeProps) => {
  const { bx, by, anchor: badgeAnchor } = badgeOffset(angle, target);

  const bxMv = useMotionValue(bx);
  const byMv = useMotionValue(by);
  useEffect(() => {
    bxMv.set(bx);
    byMv.set(by);
  }, [bx, by, bxMv, byMv]);

  const x = useTransform([vx, bxMv], ([a, b]: number[]) => a + b);
  const y = useTransform([vy, byMv], ([a, b]: number[]) => a + b);
  // Die Anzeige bleibt zwischen Start- und Zielwert: Das Polygon darf federn,
  // das Badge zeigt nie einen Zwischenwert jenseits davon (kein 82 % / 18 %).
  // Start = bisher angezeigter Wert, also auch bei Schnellklicks mit Restschwung.
  const range = useRef({ lo: target, hi: target });
  useLayoutEffect(() => {
    const { lo, hi } = range.current;
    const from = clamp(value.get(), lo, hi);
    range.current = { lo: Math.min(from, target), hi: Math.max(from, target) };
  }, [target, value]);

  // framer schreibt textContent direkt, ohne React-Render; der Endtext ist exakt
  const label = useTransform(value, (v) => {
    const { lo, hi } = range.current;
    return `${Math.round(clamp(v, lo, hi) * 100)}%`;
  });

  return (
    <motion.text
      data-cr-badge={index}
      data-dx={bx}
      data-dy={by}
      x={x}
      y={y}
      textAnchor={badgeAnchor}
      fill={fill}
      fontSize="15"
      fontFamily="inherit"
      fontWeight="600"
      style={{ opacity: dim ? 0.6 : 1, transition: OPACITY_FADE, fontVariantNumeric: "tabular-nums" }}
    >
      {label}
    </motion.text>
  );
};

// ─── Alte Ecke (nur sanfte Stufe): Punkt + Badge der vorigen Form ──────────────
// Zeigt die von useRadarMorph festgehaltene alte Ecke statisch; die ganze alte
// Ebene blendet ueber morph.fadeOut aus.
interface PrevVertexProps {
  angle: number;
  vx: MotionValue<number>;
  vy: MotionValue<number>;
  fill: MotionValue<string>;
  dim: boolean;
}

/** Achsen liegen auf 0/90/180/270 Grad: Abstand zum Zentrum = |dx| + |dy|. */
const readVertex = (vx: MotionValue<number>, vy: MotionValue<number>) => {
  const x = vx.get();
  const y = vy.get();
  return { x, y, v: (Math.abs(x - CX) + Math.abs(y - CY)) / MAX_R };
};

const PrevVertex = ({ angle, vx, vy, fill, dim }: PrevVertexProps) => {
  const [pt, setPt] = useState(() => readVertex(vx, vy));
  useEffect(() => {
    const sync = () => setPt(readVertex(vx, vy));
    const ux = vx.on("change", sync);
    const uy = vy.on("change", sync);
    sync();
    return () => {
      ux();
      uy();
    };
  }, [vx, vy]);
  const { bx, by, anchor } = badgeOffset(angle, pt.v);
  return (
    <>
      <motion.circle
        cx={pt.x}
        cy={pt.y}
        r={5}
        fill={fill}
        stroke={V.ground}
        strokeWidth={2}
        style={{ opacity: dim ? 0.45 : 1, scale: dim ? 0.7 : 1, transformBox: "fill-box", transformOrigin: "center" }}
      />
      <motion.text
        x={pt.x + bx}
        y={pt.y + by}
        textAnchor={anchor}
        fill={fill}
        fontSize="15"
        fontFamily="inherit"
        fontWeight="600"
        style={{ opacity: dim ? 0.6 : 1, fontVariantNumeric: "tabular-nums" }}
      >
        {`${Math.round(pt.v * 100)}%`}
      </motion.text>
    </>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
interface CapacityRadarProps {
  values?: number[];        // 4 values 0..1, defaults to baseline
  color?: string;
  activeIndex?: number;     // highlight one axis (others dimmed)
  size?: number;
  showSweep?: boolean;
}

const CapacityRadar = ({ values, color = "#00802f", activeIndex, size = 440 }: CapacityRadarProps) => {
  const vals = values ?? BASELINE_VALUES;
  // SVG-defs-IDs haengen nie vom Zustand ab
  const uid = `cr-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const hasHighlight = typeof activeIndex === "number";
  const reduced = useReducedMotionSafe();

  const morph = useRadarMorph(vals, projectAxis, { transition: MORPH_SPRING });
  const colorMv = useAnimatedColor(color);

  // ── Druck: Endzustand sofort ──
  // Eine Feder kommt vor dem Druck-Snapshot nicht an, und framer schreibt
  // SVG-Attribute erst im naechsten Frame. Deshalb springen die Werte aufs Ziel,
  // und Polygon, Punkte und Badges werden synchron gesetzt. Kommt das Ziel erst
  // waehrend des Drucks (OrgSovereignty schaltet per beforeprint scharf), zieht
  // der Layout-Effekt im selben Commit nach.
  const svgRef = useRef<SVGSVGElement | null>(null);
  useRadarDraw(svgRef);
  const printingRef = useRef(false);
  const snapRef = useRef<() => void>(() => {});
  useLayoutEffect(() => {
    const snap = () => {
      morph.values.forEach((mv, i) => mv.jump(vals[i] ?? 0));
      // Sanfte Stufe: ein laufender Crossfade endet sofort auf der neuen Form
      morph.fade.jump(1);
      const svg = svgRef.current;
      if (!svg) return;
      svg.querySelectorAll<SVGElement>("[data-cr-fade]").forEach((el) => (el.style.opacity = "1"));
      svg.querySelectorAll<SVGElement>("[data-cr-prev]").forEach((el) => {
        el.style.opacity = "0";
        el.style.visibility = "hidden";
      });
      const pts = morph.points.get();
      svg.querySelectorAll("[data-cr-poly]").forEach((el) => el.setAttribute("points", pts));
      svg.querySelectorAll<SVGElement>("[data-cr-dot]").forEach((el) => {
        const i = Number(el.dataset.crDot);
        const dim = hasHighlight && i !== activeIndex;
        el.setAttribute("cx", String(morph.vertices[i].x.get()));
        el.setAttribute("cy", String(morph.vertices[i].y.get()));
        el.style.opacity = dim ? "0.45" : "1";
        el.style.transform = `scale(${dim ? 0.7 : 1})`;
      });
      svg.querySelectorAll<SVGElement>("[data-cr-badge]").forEach((el) => {
        const i = Number(el.dataset.crBadge);
        const dim = hasHighlight && i !== activeIndex;
        el.setAttribute("x", String(morph.vertices[i].x.get() + Number(el.dataset.dx)));
        el.setAttribute("y", String(morph.vertices[i].y.get() + Number(el.dataset.dy)));
        el.style.opacity = dim ? "0.6" : "1";
        el.textContent = `${Math.round((vals[i] ?? 0) * 100)}%`;
      });
    };
    snapRef.current = snap;
    if (printingRef.current) snap();
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const before = () => {
      printingRef.current = true;
      snapRef.current();
    };
    const after = () => {
      printingRef.current = false;
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);

  // ── Sanfte Stufe: aktive Achse der vorigen Form (fuer die alte Crossfade-Ebene) ──
  // Wird beim Rendern nachgefuehrt, idempotent (StrictMode rendert doppelt).
  const valsKey = vals.join("|");
  const fadeFrom = useRef({ key: valsKey, active: activeIndex, prevActive: activeIndex });
  if (fadeFrom.current.key !== valsKey) {
    fadeFrom.current = { key: valsKey, active: activeIndex, prevActive: fadeFrom.current.active };
  } else {
    fadeFrom.current.active = activeIndex;
  }
  const prevActiveIdx = fadeFrom.current.prevActive;
  // Ausgeblendete alte Ebene ganz verbergen (keine doppelten Werte fuer Suche/Kopieren)
  const prevVisibility = useTransform(morph.fadeOut, (v) => (v > 0.001 ? "visible" : "hidden"));

  // ── Ortung am Wertpunkt: nur bei Wechsel von activeIndex, nie beim ersten Rendern ──
  // Die Mittellinie (Achsen-Laser) ist auf Wunsch von Adrian entfernt (12.10.2026).
  // Der Ping kommt aus SvgPing (bei reduzierter Bewegung hoechstens scale 1.15).
  const prevActive = useRef(activeIndex);
  const [pingShot, setPingShot] = useState<{ n: number; axis: number }>({ n: 0, axis: 0 });
  const lastPing = useRef<number[]>([]);

  useEffect(() => {
    const prev = prevActive.current;
    prevActive.current = activeIndex;
    if (prev === activeIndex || typeof activeIndex !== "number") return;

    const axis = activeIndex;
    const t = window.setTimeout(() => {
      const now = performance.now();
      const last = lastPing.current[axis];
      if (last !== undefined && now - last < PING_MIN_GAP_MS) return;
      lastPing.current[axis] = now;
      setPingShot((p) => ({ n: p.n + 1, axis }));
    }, PING_DELAY_MS);

    return () => {
      window.clearTimeout(t);
    };
  }, [activeIndex]);

  const pingPt = polar(AXES[pingShot.axis].angle, MAX_R * (vals[pingShot.axis] ?? 0));

  return (
    <div style={{ width: size, maxWidth: "100%", aspectRatio: `${VB_W} / ${VB_H}` }}>
      <RvTokens />
      <svg
        ref={svgRef}
        viewBox={`${VB_X} ${VB_Y} ${VB_W} ${VB_H}`}
        width="100%"
        height="100%"
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id={`poly-fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <motion.stop offset="0%" stopColor={colorMv} stopOpacity="0.22" />
            <motion.stop offset="100%" stopColor={colorMv} stopOpacity="0.04" />
          </linearGradient>
        </defs>

        {/* Ringe: vier Kreise, der aeussere kraeftiger; die Werte liegen auf 25/50/75/100 % */}
        {Array.from({ length: RINGS }).map((_, i) => (
          <circle
            key={i}
            data-cr-draw="ring"
            cx={CX}
            cy={CY}
            r={(MAX_R * (i + 1)) / RINGS}
            pathLength={1}
            strokeDasharray="1 1"
            strokeDashoffset={0}
            fill="none"
            stroke={i === RINGS - 1 ? V.line2 : V.line}
            strokeWidth="1"
          />
        ))}

        {/* Randteilung (Deko) */}
        <path data-cr-draw="fade" aria-hidden="true" className="fx-deco" d={RIM_TICKS} fill="none" stroke={V.line2} strokeWidth="1" strokeLinecap="round" />

        {/* Axis lines */}
        {AXES.map((ax, i) => {
          const end = polar(ax.angle, MAX_R);
          const dim = hasHighlight && i !== activeIndex;
          return (
            <line
              key={ax.label}
              data-cr-draw="spoke"
              x1={CX}
              y1={CY}
              x2={end.x}
              y2={end.y}
              pathLength={1}
              strokeDasharray="1 1"
              strokeDashoffset={0}
              stroke={dim ? V.faint : V.line2}
              strokeWidth="1"
            />
          );
        })}

        {/* Sanfte Stufe: alte Form (Polygon, Punkte, Badges) blendet aus, die neue ein */}
        {reduced ? (
          <motion.g
            data-cr-prev=""
            aria-hidden="true"
            pointerEvents="none"
            style={{ opacity: morph.fadeOut, visibility: prevVisibility }}
          >
            <motion.polygon
              points={morph.prevPoints}
              fill={`url(#poly-fill-${uid})`}
              stroke={colorMv}
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            {AXES.map((ax, i) => (
              <PrevVertex
                key={ax.label}
                angle={ax.angle}
                vx={morph.prevVertices[i].x}
                vy={morph.prevVertices[i].y}
                fill={colorMv}
                dim={typeof prevActiveIdx === "number" && i !== prevActiveIdx}
              />
            ))}
          </motion.g>
        ) : null}

        <motion.g data-cr-fade="" style={{ opacity: morph.fade }}>
          {/* Profile polygon: ein einziger Knoten, morpht per MotionValue (kein Remount) */}
          <motion.polygon
            data-cr-poly=""
            points={morph.points}
            fill={`url(#poly-fill-${uid})`}
            stroke={colorMv}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </motion.g>

        {/* Axis endpoint dots + labels */}
        {AXES.map((ax, i) => {
          const labelPt = polar(ax.angle, MAX_R + 14);
          const anchor = anchorFor(ax.angle);
          const dim = hasHighlight && i !== activeIndex;
          const fade = OPACITY_FADE;

          return (
            <g key={ax.label}>
              {/* Axis label */}
              <text
                x={labelPt.x}
                y={labelPt.y}
                textAnchor={anchor}
                dominantBaseline="middle"
                fill={V.ink}
                fontSize="18"
                fontFamily="inherit"
                fontWeight={dim ? 400 : 500}
                letterSpacing="-0.01em"
                style={{ opacity: dim ? 0.7 : 1, transition: fade }}
              >
                {ax.label}
              </text>

              {/* Wertpunkt + Badge: blenden in der sanften Stufe mit der neuen Form ein */}
              <motion.g data-cr-fade="" style={{ opacity: morph.fade }}>
                {/* Value dot (sanfte Stufe: Groesse springt, opacity gleitet) */}
                <motion.circle
                  data-cr-dot={i}
                  cx={morph.vertices[i].x}
                  cy={morph.vertices[i].y}
                  r={5}
                  fill={colorMv}
                  stroke={V.ground}
                  strokeWidth={2}
                  initial={false}
                  animate={{ scale: dim ? 0.7 : 1, opacity: dim ? 0.45 : 1 }}
                  transition={
                    reduced
                      ? { duration: 0.2, ease: EASE_IN_OUT, scale: { duration: 0 } }
                      : { duration: 0.2, ease: EASE_IN_OUT }
                  }
                  style={{ transformBox: "fill-box", transformOrigin: "center" }}
                />
                {/* % badge */}
                <RadarBadge
                  index={i}
                  angle={ax.angle}
                  target={vals[i] ?? 0}
                  value={morph.values[i]}
                  vx={morph.vertices[i].x}
                  vy={morph.vertices[i].y}
                  fill={colorMv}
                  dim={dim}
                />
              </motion.g>
            </g>
          );
        })}

        {/* Ortung am Wertpunkt der aktiven Achse */}
        <SvgPing
          cx={pingPt.x}
          cy={pingPt.y}
          r={5}
          color={color}
          play={pingShot.n}
          scale={3.6}
          duration={0.7}
        />

        {/* Center */}
        <circle cx={CX} cy={CY} r={3} fill={V.line2} />
      </svg>
    </div>
  );
};

export default CapacityRadar;
