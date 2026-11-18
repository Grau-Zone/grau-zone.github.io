// Radar der drei Pfade: feine gruene Linienzeichnung auf weissem Grund.
//
// Aufbau: Randskala mit Teilstrichen, vier Entfernungsringe, drei Speichen, der Rahmen
// des Wertebereichs (aeusseres Dreieck) und die drei Pfade als ineinanderliegende
// Konturen. Der gewaehlte Pfad ist kraeftig und gefuellt, die beiden anderen bleiben
// als feine Spur stehen. Die Linienart unterscheidet die Pfade ohne Farbe
// (Pfad 1 gepunktet, Pfad 2 gestrichelt, Pfad 3 durchgezogen).
//
// Geschichte: Ein Fortschrittswert p (0..1) baut das Radar auf. Skala, Ringe und Speichen
// zeichnen sich, danach wachsen die Pfade nacheinander aus der Mitte. p kommt entweder vom
// Scrollen (Prop progress, ab 900 px) oder laeuft einmalig zeitgesteuert, sobald das Radar
// erfasst wird (acquired). Reduzierte Bewegung: Linien zeichnen sich, die Pfade blenden
// ueber, nichts waechst oder wandert. Der Suchstrahl und die Echos (fx-loop, fx-contained)
// pausieren offscreen und ueber den Pause-Knopf, siehe SovereigntyRadarSection.
import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform, type MotionValue } from "framer-motion";
import { RadarSweep, SvgBlip, SvgPing, sweepDelay, useIsMobile, useReducedMotionSafe } from "@/components/fx";

// ─── Daten (unveraendert) ─────────────────────────────────────────────────────
// 3 axes evenly spaced from the top (-90°)
const AXES = [
  { label: "Cloud und Infrastruktur", sublabel: "Rechenzentren und Betrieb", angle: -90 },
  { label: "KI-Modelle", sublabel: "Modelle und Anbieter", angle: 30 },
  { label: "Daten", sublabel: "Daten und Schnittstellen", angle: 150 },
];

export const SCENARIOS = [
  {
    id: 0,
    tag: "Pfad 1",
    title: "Tiefe Abhängigkeit",
    subtitle: "Europa verliert Gestaltungsmacht",
    values: [0.15, 0.10, 0.20],
    color: "#FF3D57",
    colorBg: "rgba(255,61,87,0.08)",
    colorBorder: "rgba(255,61,87,0.25)",
    description:
      "US-Hyperscaler dominieren die Infrastruktur, während chinesische Open-Source-KI-Modelle die Anwendungsschicht durchdringen. Europäische Unternehmen verlieren die strategische Handlungsfähigkeit durch Vendor-Lock-in und politische Abhängigkeiten.",
    stats: [
      { label: "Cloud-Anteil US-Hyperscaler", value: "85%" },
      { label: "Wechselkosten (Ø Unternehmen)", value: "8,5 Mio. €" },
      { label: "Europäischer Marktanteil", value: "15%" },
    ],
  },
  {
    id: 1,
    tag: "Pfad 2",
    title: "Hybride Kontrolle",
    subtitle: "Regulatorische Anforderungen bei fortbestehenden Abhängigkeiten",
    values: [0.55, 0.40, 0.65],
    color: "#FF9F2E",
    colorBg: "rgba(255,159,46,0.08)",
    colorBorder: "rgba(255,159,46,0.25)",
    description:
      "Europäische Anbieter und regulatorische Rahmenbedingungen entwickeln sich weiter. Gleichzeitig bestehen Abhängigkeiten von globalen Cloud-, Plattform- und KI-Anbietern fort.",
    stats: [
      { label: "Sovereign Cloud IaaS (2030)", value: "40+ Mrd. €" },
      { label: "STACKIT Jahresumsatz", value: "1,9 Mrd. €" },
      { label: "OVHcloud Wachstum YoY", value: "+9,3%" },
    ],
  },
  {
    id: 2,
    tag: "Pfad 3",
    title: "Strategische Souveränität",
    subtitle: "Wahlfreiheit ohne Abschottung",
    values: [0.80, 0.75, 0.85],
    color: "#00C4A0",
    colorBg: "rgba(0,196,160,0.08)",
    colorBorder: "rgba(0,196,160,0.25)",
    description:
      "Europa baut eigene Infrastruktur, auditierte KI-Modelle und interoperable Datenarchitekturen auf. US-Hyperscaler werden nicht ersetzt, chinesische Modelle nicht verboten. Organisationen haben die Wahl und können den Anbieter jederzeit wechseln.",
    stats: [
      { label: "Mistral AI Valuation", value: "13,8 Mrd. $" },
      { label: "EuroHPC AI Factories", value: "19 Standorte" },
      { label: "STACKIT GPU-Kapazität", value: "100.000 GPUs" },
    ],
  },
];

/** Linienart je Pfad (strokeDasharray): ersetzt die frueheren Pfadfarben. */
export const TRACE_DASH: (string | undefined)[] = ["1 5.5", "9 6", undefined];

// ─── Geometrie ────────────────────────────────────────────────────────────────
const CX = 380;
const CY = 290;
const R = 200; // Wert 1.0
const BEZEL = 214; // Randring der Skala
const RINGS = 4;
const FULL = { x: 0, y: 0, w: 760, h: 540 };
const COMPACT = { x: CX - 232, y: CY - 240, w: 464, h: 480 };
/** Unter dieser verfuegbaren Breite (px) wechselt das Radar in die schmale Fassung. */
const NARROW_BELOW = 600;

const GREEN = "#00802f";
const GREEN_INK = "#006a27";
const INK = "#0c1310";

/** Sweep-Periode (s); die Echos blitzen, wenn der Strahl ihre Achse trifft. */
const SWEEP_PERIOD = 8;
/** Achsenwinkel ab 12 Uhr im Uhrzeigersinn (-90° -> 0°, 30° -> 120°, 150° -> 240°). */
const AXIS_THETA = AXES.map((ax) => (((ax.angle + 90) % 360) + 360) % 360);

const r2 = (n: number) => Math.round(n * 100) / 100;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

function polar(angleDeg: number, r: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

const FRAME_POINTS = AXES.map((ax) => {
  const p = polar(ax.angle, R);
  return `${r2(p.x)},${r2(p.y)}`;
}).join(" ");

/** Teilstriche ausserhalb des Randrings: 60 Stueck, jeder fuenfte laenger. */
const TICKS = (() => {
  let d = "";
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
    const r1 = BEZEL + 6;
    const r2_ = BEZEL + (i % 5 === 0 ? 18 : 11);
    d += `M${r2(CX + Math.cos(a) * r1)} ${r2(CY + Math.sin(a) * r1)}L${r2(CX + Math.cos(a) * r2_)} ${r2(CY + Math.sin(a) * r2_)}`;
  }
  return d;
})();

// ─── Zeitplan der Geschichte (Anteile von p) ──────────────────────────────────
const T_BEZEL: [number, number] = [0, 0.14];
const T_TICKS: [number, number] = [0.04, 0.3];
const T_RING = (k: number): [number, number] => [0.06 + 0.04 * k, 0.2 + 0.04 * k];
const T_SPOKE: [number, number] = [0.22, 0.34];
const T_FRAME: [number, number] = [0.3, 0.42];
const T_LABELS: [number, number] = [0.3, 0.44];
const T_SWEEP: [number, number] = [0.36, 0.5];
/** Pfad 1, 2, 3 wachsen nacheinander. */
const T_TRACE: [number, number][] = [
  [0.4, 0.6],
  [0.54, 0.76],
  [0.7, 0.94],
];

const win = (range: [number, number], ease: (t: number) => number = (t) => t) => (v: number) =>
  ease(clamp01((v - range[0]) / (range[1] - range[0])));

// ─── Bausteine ────────────────────────────────────────────────────────────────
/** Kreis als Pfad (oben beginnend, im Uhrzeigersinn): pathLength wirkt nur sicher auf path. */
const circleD = (r: number) =>
  `M${CX} ${CY - r}A${r} ${r} 0 1 1 ${CX} ${CY + r}A${r} ${r} 0 1 1 ${CX} ${CY - r}`;
const lineD = (x1: number, y1: number, x2: number, y2: number) => `M${r2(x1)} ${r2(y1)}L${r2(x2)} ${r2(y2)}`;

/** Zeichnet einen Pfad per pathLength, gesteuert vom Fortschritt p. */
function DrawPath({
  p,
  range,
  d,
  stroke,
  strokeOpacity,
  strokeWidth = 1,
  style,
}: {
  p: MotionValue<number>;
  range: [number, number];
  d: string;
  stroke: string;
  strokeOpacity?: number;
  strokeWidth?: number;
  style?: React.CSSProperties;
}) {
  const pathLength = useTransform(p, win(range));
  return (
    <motion.path
      d={d}
      fill="none"
      stroke={stroke}
      strokeOpacity={strokeOpacity}
      strokeWidth={strokeWidth}
      strokeLinecap="butt"
      style={{ ...style, pathLength }}
    />
  );
}

/** Linie, die nur ueber ihre Deckkraft einblendet (gepunktete Linien vertragen kein pathLength). */
function FadeLine({
  p,
  range,
  x1,
  y1,
  x2,
  y2,
  ...rest
}: { p: MotionValue<number>; range: [number, number]; x1: number; y1: number; x2: number; y2: number } & Record<string, unknown>) {
  const opacity = useTransform(p, win(range));
  return <motion.line x1={x1} y1={y1} x2={x2} y2={y2} {...rest} style={{ opacity }} />;
}

function Vertex({
  g,
  axis,
  value,
  active,
  focused,
  withBlip,
}: {
  g: MotionValue<number>;
  axis: number;
  value: number;
  active: boolean;
  focused: boolean;
  withBlip: boolean;
}) {
  const cx = useTransform(g, (gv) => r2(polar(AXES[axis].angle, R * value * gv).x));
  const cy = useTransform(g, (gv) => r2(polar(AXES[axis].angle, R * value * gv).y));
  return (
    <>
      {focused ? (
        <motion.circle cx={cx} cy={cy} r={11} fill="none" stroke={GREEN} strokeWidth={1.2} strokeOpacity={0.45} />
      ) : null}
      <motion.circle
        cx={cx}
        cy={cy}
        r={active ? 5.2 : 3.6}
        fill={active ? GREEN : "#fff"}
        stroke={GREEN}
        strokeWidth={active ? 0 : 1.2}
        strokeOpacity={active ? 1 : 0.55}
        style={{ transition: "fill 0.35s, stroke-opacity 0.35s" }}
      />
      {withBlip ? (
        <g style={{ opacity: active ? 1 : 0, transition: "opacity 0.35s" }}>
          <SvgBlip cx={cx} cy={cy} r={5.2} color={GREEN} period={SWEEP_PERIOD} delay={sweepDelay(AXIS_THETA[axis], SWEEP_PERIOD)} />
        </g>
      ) : null}
    </>
  );
}

/** Eine Kontur (ein Pfad). Waechst aus der Mitte; reduziert blendet sie nur ueber. */
function Trace({
  index,
  values,
  active,
  reduced,
  p,
  focusAxis,
  showSweep,
  dim,
}: {
  index: number;
  values: number[];
  active: boolean;
  reduced: boolean;
  p: MotionValue<number>;
  focusAxis: number | null;
  showSweep: boolean;
  dim?: boolean;
}) {
  const range = T_TRACE[index] ?? T_TRACE[2];
  const g = useTransform(p, (v) => (reduced ? 1 : win(range, easeOut)(v)));
  const opacity = useTransform(p, (v) => clamp01((v - range[0]) / (reduced ? range[1] - range[0] : 0.05)));
  const points = useTransform(g, (gv) =>
    AXES.map((ax, k) => {
      const q = polar(ax.angle, R * (values[k] ?? 0) * gv);
      return `${r2(q.x)},${r2(q.y)}`;
    }).join(" "),
  );
  const dash = TRACE_DASH[index];
  return (
    <motion.g style={{ opacity }}>
      <motion.polygon
        points={points}
        fill={active ? "rgba(0,128,47,0.1)" : "rgba(0,128,47,0)"}
        stroke={GREEN}
        strokeLinejoin="round"
        strokeLinecap={dash && dash.startsWith("1 ") ? "round" : "butt"}
        strokeDasharray={dash}
        strokeWidth={active ? 2.2 : 1.2}
        strokeOpacity={active ? 1 : dim ? 0.3 : 0.5}
        style={{ transition: "fill 0.4s, stroke-width 0.4s, stroke-opacity 0.4s" }}
      />
      {AXES.map((ax, k) => (
        <Vertex
          key={ax.label}
          g={g}
          axis={k}
          value={values[k] ?? 0}
          active={active}
          focused={focusAxis === k && active}
          withBlip={showSweep}
        />
      ))}
    </motion.g>
  );
}

// ─── Hauptkomponente ──────────────────────────────────────────────────────────
interface RadarVisualProps {
  activeScenario?: number;
  customValues?: [number, number, number];
  customColor?: string;
  size?: number;
  showSweep?: boolean;
  /** false -> true startet die zeitgesteuerte Erfassung (wird von progress uebersteuert). */
  acquired?: boolean;
  /** Jede Aenderung loest Schockwelle und Ringpuls aus. */
  changeKey?: number;
  /** Scroll-Fortschritt 0..1: dann baut er das Radar auf, statt der Zeitsteuerung. */
  progress?: MotionValue<number>;
  /** Achse, die gerade hervorgehoben wird (Hover auf einem Bereich). */
  focusAxis?: number | null;
  onFocusAxis?: (axis: number | null) => void;
}

const RadarVisual = ({
  activeScenario = 0,
  customValues,
  customColor,
  size = 440,
  showSweep = true,
  acquired = true,
  changeKey = 0,
  progress,
  focusAxis = null,
  onFocusAxis,
}: RadarVisualProps) => {
  const reduced = useReducedMotionSafe();
  // Schmal (Handy oder enge Spalte): Ziffern am Rand und Beschriftung als Liste darunter.
  // Gemessen wird der verfuegbare Platz des Elternelements, nicht das Radar selbst.
  const mobile = useIsMobile();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const parent = rootRef.current?.parentElement;
    if (!parent || typeof ResizeObserver === "undefined") return;
    const measure = () => setNarrow(parent.clientWidth < NARROW_BELOW);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);
  const compact = mobile || narrow;
  const vb = compact ? COMPACT : FULL;
  const color = customColor ?? GREEN;

  // ─── Fortschritt p ──────────────────────────────────────────────────────────
  const p = useMotionValue(progress ? progress.get() : acquired ? 1 : 0);

  useEffect(() => {
    if (!progress) return;
    p.set(progress.get());
    return progress.on("change", (v) => p.set(v));
  }, [progress, p]);

  useEffect(() => {
    // Zeitgesteuerter Aufbau, sobald das Radar erfasst ist und kein Scroll-Fortschritt steuert.
    // Zustandsbasiert (p < 1): ein abgebrochener Lauf (Strict Mode, Wechsel von Scroll auf Zeit
    // unter 900 px) setzt vom aktuellen Stand aus fort.
    if (progress || !acquired || p.get() >= 1) return;
    const c = animate(p, 1, { duration: reduced ? 2.4 : 3.6, ease: "easeInOut" });
    return () => c.stop();
    // acquired schaltet einmal um
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acquired, progress]);

  // Im Druck steht das fertige Radar.
  useEffect(() => {
    const done = () => p.set(1);
    window.addEventListener("beforeprint", done);
    return () => window.removeEventListener("beforeprint", done);
  }, [p]);

  const labelsOpacity = useTransform(p, win(T_LABELS));
  const sweepOpacity = useTransform(p, win(T_SWEEP));
  const frameOpacity = useTransform(p, win(T_FRAME));

  const showSweepFx = showSweep && (acquired || !!progress);
  const sweepBox = {
    left: `${((CX - BEZEL - vb.x) / vb.w) * 100}%`,
    top: `${((CY - BEZEL - vb.y) / vb.h) * 100}%`,
    width: `${((BEZEL * 2) / vb.w) * 100}%`,
    height: `${((BEZEL * 2) / vb.h) * 100}%`,
    right: "auto",
    bottom: "auto",
  } as const;

  const hover = (axis: number | null) => (onFocusAxis ? () => onFocusAxis(axis) : undefined);

  // Spuren: Pfad 3 zuerst, damit die kleineren Konturen oben liegen (feste Reihenfolge,
  // damit keine DOM-Knoten umziehen und die Echo-Schleifen nicht neu starten).
  const order = [2, 1, 0];

  return (
    <div ref={rootRef} style={{ width: `min(100%, ${size}px, max(20rem, calc((100svh - ${compact ? "24rem" : "13rem"}) * ${vb.w / vb.h})))` }}>
      <div style={{ position: "relative", width: "100%", aspectRatio: `${vb.w} / ${vb.h}` }}>
        <svg viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} width="100%" height="100%" style={{ display: "block", overflow: "visible" }}>
          {/* Randring und Teilstriche */}
          <DrawPath p={p} range={T_BEZEL} d={circleD(BEZEL)} stroke={INK} strokeOpacity={0.3} />
          <DrawPath p={p} range={T_TICKS} d={TICKS} stroke={INK} strokeOpacity={0.4} />

          {/* Entfernungsringe */}
          {Array.from({ length: RINGS }).map((_, i) => (
            <DrawPath
              key={i}
              p={p}
              range={T_RING(i)}
              d={circleD((R * (i + 1)) / RINGS)}
              stroke={GREEN}
              strokeOpacity={i === RINGS - 1 ? 0.5 : 0.26}
            />
          ))}

          {/* Speichen: drei Achsen, dazu feine Gegenlinien */}
          {AXES.map((ax, i) => {
            const end = polar(ax.angle, BEZEL);
            const back = polar(ax.angle + 180, BEZEL);
            const on = focusAxis === i;
            return (
              <g key={ax.label}>
                <FadeLine p={p} range={T_SPOKE} x1={CX} y1={CY} x2={back.x} y2={back.y} stroke={INK} strokeOpacity={0.14} strokeWidth={1} strokeDasharray="2 5" strokeLinecap="round" />
                <DrawPath
                  p={p}
                  range={T_SPOKE}
                  d={lineD(CX, CY, end.x, end.y)}
                  stroke={on ? GREEN : INK}
                  strokeOpacity={on ? 1 : 0.3}
                  strokeWidth={on ? 1.8 : 1}
                  style={{ transition: "stroke 0.3s, stroke-opacity 0.3s, stroke-width 0.3s" }}
                />
              </g>
            );
          })}

          {/* Rahmen des Wertebereichs: das aeussere Dreieck */}
          <motion.polygon points={FRAME_POINTS} fill="none" stroke={GREEN} strokeOpacity={0.55} strokeWidth={1} strokeDasharray="1 4" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: frameOpacity }} />

          {/* Die drei Pfade */}
          {order.map((i) => (
            <Trace
              key={`${i}-${reduced}-${customValues && i === activeScenario ? customValues.join() : ""}`}
              index={i}
              values={customValues && i === activeScenario ? customValues : SCENARIOS[i].values}
              active={i === activeScenario}
              reduced={reduced}
              p={p}
              focusAxis={focusAxis}
              showSweep={showSweepFx}
              dim={focusAxis !== null}
            />
          ))}

          {/* Schockwelle beim Wechsel; reduziert ohne Wachstum, nur Aufleuchten */}
          <SvgPing cx={CX} cy={CY} r={BEZEL} color={color} play={changeKey} fromScale={reduced ? 1 : 0.06} scale={1} fromOpacity={0.5} duration={1.1} />

          {/* Mitte */}
          <circle cx={CX} cy={CY} r={2.6} fill={INK} />
          <path d={`M${CX - 8} ${CY}H${CX + 8}M${CX} ${CY - 8}V${CY + 8}`} stroke={INK} strokeOpacity={0.5} strokeWidth={1} />

          {/* Achsenenden und Beschriftung */}
          <motion.g style={{ opacity: labelsOpacity }}>
            {AXES.map((ax, i) => {
              const end = polar(ax.angle, BEZEL);
              const on = focusAxis === i;
              const handlers = onFocusAxis
                ? { onMouseEnter: hover(i), onMouseLeave: hover(null) }
                : {};
              if (compact) {
                return (
                  <g key={ax.label} {...handlers}>
                    <circle cx={end.x} cy={end.y} r={14} fill="#fff" stroke={GREEN} strokeWidth={on ? 2 : 1.2} />
                    <text x={end.x} y={end.y + 5} textAnchor="middle" fontFamily="Switzer, 'Helvetica Neue', Helvetica, Arial, sans-serif" fontSize={15} fontWeight={600} fill={on ? GREEN_INK : INK}>
                      {i + 1}
                    </text>
                  </g>
                );
              }
              const lab = polar(ax.angle, BEZEL + 24);
              const anchor = i === 0 ? "middle" : i === 1 ? "start" : "end";
              const lx = i === 0 ? lab.x : lab.x + (i === 1 ? 12 : -12);
              const ly = i === 0 ? CY - BEZEL - 40 : lab.y;
              return (
                <g key={ax.label} {...handlers}>
                  <circle cx={end.x} cy={end.y} r={on ? 6 : 4.5} fill={on ? GREEN : "#fff"} stroke={GREEN} strokeWidth={1.4} style={{ transition: "fill 0.3s" }} />
                  {/* Treffflaeche fuer den Zeiger */}
                  <rect x={anchor === "end" ? lx - 190 : anchor === "middle" ? lx - 110 : lx - 6} y={ly - 24} width={anchor === "middle" ? 220 : 196} height={64} fill="transparent" />
                  <text x={lx} y={ly} textAnchor={anchor} fontFamily="Switzer, 'Helvetica Neue', Helvetica, Arial, sans-serif" fontSize={17.5} fontWeight={600} fill={on ? GREEN_INK : INK} style={{ transition: "fill 0.3s" }}>
                    {ax.label}
                  </text>
                  <text x={lx} y={ly + 20} textAnchor={anchor} fontFamily="Switzer, 'Helvetica Neue', Helvetica, Arial, sans-serif" fontSize={13.5} fill="#4f5d56">
                    {ax.sublabel}
                  </text>
                </g>
              );
            })}
          </motion.g>
        </svg>

        {/* Suchstrahl als HTML-Ueberlagerung (CSS, Compositor); Schleife mit fx-loop */}
        {showSweepFx ? (
          <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ opacity: sweepOpacity }}>
            <RadarSweep color={color} period={SWEEP_PERIOD} trail={46} intensity={0.2} style={sweepBox} />
          </motion.div>
        ) : null}
      </div>

      {/* Schmal: Achsenbeschriftung als Liste unter dem Radar (die Ziffern stehen am Rand) */}
      {compact ? (
        <ol className="rx-rows mt-6 list-none p-0">
          {AXES.map((ax, i) => (
            <li key={ax.label} className="rx-row flex items-baseline gap-3 py-3">
              <span aria-hidden="true" className="inline-flex h-6 w-6 flex-none items-center justify-center self-center rounded-full text-[0.8125rem] font-semibold text-green ring-1 ring-green">
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="font-semibold text-ink">{ax.label}</span>{" "}
                <span className="whitespace-nowrap text-[0.9375rem] text-muted-foreground">{ax.sublabel}</span>
              </span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
};

export default RadarVisual;
