import { motion } from "framer-motion";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import {
  EASE_OUT,
  RadarSweep,
  SvgBlip,
  SvgPing,
  safeAnimate,
  sweepDelay,
  useAnimatedColor,
  useIsMobile,
  useRadarMorph,
  useReducedMotionSafe,
} from "@/components/fx";

// ─── Config ───────────────────────────────────────────────────────────────────
const CX = 220;
const CY = 220;
const MAX_R = 165;
const RINGS = 4;

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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function polar(angleDeg: number, r: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function buildRingPath(fraction: number): string {
  const pts = AXES.map((ax) => {
    const { x, y } = polar(ax.angle, MAX_R * fraction);
    return `${x},${y}`;
  });
  return `M ${pts[0]} L ${pts[1]} L ${pts[2]} Z`;
}

/** Projektion fuer useRadarMorph: Achse i, Wert v (0..1) -> Punkt in der viewBox. */
const project = (i: number, v: number) => polar(AXES[i].angle, MAX_R * v);

/** Startform vor der Erfassung: ein Punkt im Zentrum. */
const SEED = [0.02, 0.02, 0.02];

/** Sweep-Periode (s); die Blips blitzen, wenn der Strahl ihre Achse trifft. */
const SWEEP_PERIOD = 8;
/** Achsenwinkel ab 12 Uhr im Uhrzeigersinn (-90° -> 0°, 30° -> 120°, 150° -> 240°). */
const AXIS_THETA = AXES.map((ax) => (((ax.angle + 90) % 360) + 360) % 360);

// Erfassungs-Choreografie (Sekunden)
const RING_DRAW = 0.6;
const RING_STAGGER = 0.1;
const AXES_DELAY = (RINGS - 1) * RING_STAGGER + RING_DRAW; // 0.9
const AXES_DRAW = 0.5;
const MORPH_START_MS = 1300;

const RING_STROKE = "rgb(139,164,255)";
const RING_OPACITY = 0.18;

// ─── Main Component ────────────────────────────────────────────────────────────
interface RadarVisualProps {
  activeScenario?: number;
  customValues?: [number, number, number];
  customColor?: string;
  size?: number;
  showSweep?: boolean;
  /** false -> true startet die Erfassung (Ringe, Achsen, Polygon aus dem Zentrum). */
  acquired?: boolean;
  /** Jede Aenderung loest Geisterspur, Schockwelle und Re-Scan aus. */
  changeKey?: number;
}

const RadarVisual = ({
  activeScenario = 0,
  customValues,
  customColor,
  size = 440,
  showSweep = true,
  acquired = true,
  changeKey = 0,
}: RadarVisualProps) => {
  const scenario = SCENARIOS[activeScenario];
  const values = customValues ?? scenario.values;
  const color = customColor ?? scenario.color;

  const reduced = useReducedMotionSafe();
  const mobile = useIsMobile();

  // Stabile defs-IDs, unabhaengig vom Szenario
  const uid = `rv${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const glowId = `${uid}-glow`;
  const dotGlowId = `${uid}-dot-glow`;
  const fillId = `${uid}-fill`;

  // Erfassung: nur choreografieren, wenn das Radar unerfasst begonnen hat.
  // Sanfte Stufe (reduzierte Bewegung): Ringe und Achsen zeichnen sich
  // ebenfalls, das Polygon federt nicht aus dem Zentrum, sondern blendet
  // ueber (useRadarMorph-Crossfade).
  const [startedHidden] = useState(() => !acquired);
  const [drawn, setDrawn] = useState(() => acquired);
  useEffect(() => {
    if (!acquired || drawn) return;
    const t = window.setTimeout(() => setDrawn(true), MORPH_START_MS);
    return () => window.clearTimeout(t);
  }, [acquired, drawn]);

  const live = acquired && drawn;
  const morph = useRadarMorph(live ? values : SEED, project);
  const colorMv = useAnimatedColor(color);

  // ─── Wechsel: Geisterspur + Re-Scan ─────────────────────────────────────────
  const ghostRef = useRef<SVGPolygonElement | null>(null);
  const ringRefs = useRef<(SVGPathElement | null)[]>([]);
  const prevKey = useRef(changeKey);
  const ghostAnim = useRef<Animation | null>(null);
  const ringAnims = useRef<(Animation | null)[]>([]);

  // Layout-Effekt: laeuft vor den Effekten von useRadarMorph/useAnimatedColor,
  // liest also noch die alte Form und die alte Farbe. Beides sind reine
  // Opacity-Verlaeufe und laufen auch in der sanften Stufe.
  useLayoutEffect(() => {
    if (prevKey.current === changeKey) return;
    prevKey.current = changeKey;
    if (!live) return;

    const ghost = ghostRef.current;
    if (ghost) {
      ghost.setAttribute("points", morph.points.get());
      ghost.setAttribute("stroke", colorMv.get());
      ghostAnim.current?.cancel();
      ghostAnim.current = safeAnimate(ghost, [{ opacity: 0.6 }, { opacity: 0 }], {
        duration: 1400,
        easing: "linear",
        fill: "none",
      });
    }

    ringAnims.current.forEach((a) => a?.cancel());
    ringAnims.current = ringRefs.current.map((el, i) =>
      safeAnimate(el, [{ opacity: RING_OPACITY }, { opacity: 0.45 }, { opacity: RING_OPACITY }], {
        duration: 700,
        delay: i * 60,
        easing: "ease-in-out",
        fill: "none",
      }),
    );
  }, [changeKey, live, morph, colorMv]);

  useEffect(
    () => () => {
      ghostAnim.current?.cancel();
      ringAnims.current.forEach((a) => a?.cancel());
    },
    [],
  );

  const setRingRef = useCallback(
    (i: number) => (el: SVGPathElement | null) => {
      ringRefs.current[i] = el;
    },
    [],
  );

  const choreograph = startedHidden;
  // Sweep und Blips sind fx-loop: pausieren offscreen (data-paused eines
  // Vorfahren) und ueber den Pause-Knopf. Bei reduce steht der Strahl und
  // atmet, die Blips blenden nur (fx-soft, siehe RadarSweep/SvgBlip).
  const showSweepFx = showSweep && acquired;

  return (
    <div style={{ position: "relative", width: size, maxWidth: "100%", aspectRatio: "1 / 1" }}>
      <svg
        viewBox={`0 0 ${CX * 2} ${CY * 2}`}
        width="100%"
        height="100%"
        style={{ overflow: "visible", display: "block" }}
      >
        <defs>
          <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={dotGlowId} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <motion.stop offset="0%" stopColor={colorMv} stopOpacity="0.25" />
            <motion.stop offset="100%" stopColor={colorMv} stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Ring backgrounds (innen nach aussen) */}
        {Array.from({ length: RINGS }).map((_, i) => (
          <motion.path
            key={i}
            ref={setRingRef(i)}
            d={buildRingPath((i + 1) / RINGS)}
            fill="none"
            stroke={RING_STROKE}
            strokeWidth="1"
            style={{ opacity: RING_OPACITY }}
            initial={choreograph ? { pathLength: 0 } : false}
            animate={{ pathLength: acquired ? 1 : 0 }}
            transition={{ duration: RING_DRAW, delay: i * RING_STAGGER, ease: EASE_OUT }}
          />
        ))}

        {/* Axis lines */}
        {AXES.map((ax) => {
          const end = polar(ax.angle, MAX_R);
          return (
            <motion.line
              key={ax.label}
              x1={CX} y1={CY}
              x2={end.x} y2={end.y}
              stroke="rgba(139,164,255,0.12)"
              strokeWidth="1"
              initial={choreograph ? { pathLength: 0 } : false}
              animate={{ pathLength: acquired ? 1 : 0 }}
              transition={{ duration: AXES_DRAW, delay: AXES_DELAY, ease: EASE_OUT }}
            />
          );
        })}

        {/* Geisterspur der vorherigen Form (nur opacity, auch bei reduce) */}
        <polygon
          ref={ghostRef}
          aria-hidden="true"
          className="fx-deco"
          fill="none"
          strokeWidth="1.5"
          strokeDasharray="3 5"
          pointerEvents="none"
          style={{ opacity: 0 }}
        />

        {/* Sanfte Stufe: alte Form blendet aus, waehrend die neue einblendet
            (useRadarMorph springt bei reduce statt zu federn) */}
        {reduced ? (
          <g aria-hidden="true" pointerEvents="none">
            {mobile ? (
              <motion.polygon
                points={morph.prevPoints}
                fill="none"
                stroke={colorMv}
                strokeWidth="6"
                strokeOpacity="0.2"
                strokeLinejoin="round"
                style={{ opacity: morph.fadeOut }}
              />
            ) : null}
            <motion.polygon
              points={morph.prevPoints}
              fill={`url(#${fillId})`}
              stroke={colorMv}
              strokeWidth="1.5"
              filter={mobile ? undefined : `url(#${glowId})`}
              style={{ opacity: morph.fadeOut }}
            />
          </g>
        ) : null}

        {/* Unterlage statt Blur-Glow auf dem Handy */}
        {mobile ? (
          <motion.polygon
            points={morph.points}
            fill="none"
            stroke={colorMv}
            strokeWidth="6"
            strokeOpacity="0.2"
            strokeLinejoin="round"
            style={{ opacity: morph.fade }}
          />
        ) : null}

        {/* Scenario polygon */}
        <motion.polygon
          points={morph.points}
          fill={`url(#${fillId})`}
          stroke={colorMv}
          strokeWidth="1.5"
          filter={mobile ? undefined : `url(#${glowId})`}
          style={{ opacity: morph.fade }}
        />

        {/* Schockwelle bei jedem Wechsel; bei reduce ohne Wachstum: der
            Aussenring leuchtet nur per opacity auf */}
        <SvgPing
          cx={CX}
          cy={CY}
          r={MAX_R}
          color={color}
          play={changeKey}
          fromScale={reduced ? 1 : 0.05}
          scale={1}
          fromOpacity={0.45}
          duration={1}
        />

        {/* Blips an den Wertpunkten, synchron zum Sweep (gleicher Mount-Zeitpunkt;
            bis das Polygon steht, nur unsichtbar) */}
        {showSweepFx ? (
          <motion.g
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: live ? 1 : 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
          >
            <motion.g style={{ opacity: morph.fade }}>
              {morph.vertices.map((v, i) => (
                <SvgBlip
                  key={AXES[i].label}
                  cx={v.x}
                  cy={v.y}
                  r={5}
                  color={color}
                  period={SWEEP_PERIOD}
                  delay={sweepDelay(AXIS_THETA[i], SWEEP_PERIOD)}
                />
              ))}
            </motion.g>
          </motion.g>
        ) : null}

        {/* Axis endpoint dots + labels */}
        {AXES.map((ax, i) => {
          const labelPt = polar(ax.angle, MAX_R + 32);

          // Adjust text anchor based on axis position
          let anchor: "start" | "middle" | "end" = "middle";
          if (ax.angle === -90) anchor = "middle";
          else if (ax.angle === 30) anchor = "start";
          else if (ax.angle === 150) anchor = "end";

          return (
            <g key={ax.label}>
              {/* Axis label */}
              <text
                x={labelPt.x}
                y={labelPt.y}
                textAnchor={anchor}
                dominantBaseline="middle"
                fill="rgba(255,255,255,0.55)"
                fontSize="11"
                fontFamily="Space Grotesk, sans-serif"
                fontWeight="500"
              >
                {ax.label}
              </text>
              <text
                x={labelPt.x}
                y={labelPt.y + 14}
                textAnchor={anchor}
                dominantBaseline="middle"
                fill="rgba(255,255,255,0.5)"
                fontSize="8.5"
                fontFamily="Inter, sans-serif"
              >
                {ax.sublabel}
              </text>

              {/* Value dot (bei reduce: alter Punkt blendet aus, neuer ein) */}
              {reduced ? (
                <motion.circle
                  aria-hidden="true"
                  cx={morph.prevVertices[i].x}
                  cy={morph.prevVertices[i].y}
                  r={5}
                  fill={colorMv}
                  filter={mobile ? undefined : `url(#${dotGlowId})`}
                  style={{ opacity: morph.fadeOut }}
                />
              ) : null}
              <motion.g style={{ opacity: morph.fade }}>
                <motion.circle
                  cx={morph.vertices[i].x}
                  cy={morph.vertices[i].y}
                  r={5}
                  fill={colorMv}
                  filter={mobile ? undefined : `url(#${dotGlowId})`}
                  initial={choreograph ? { opacity: 0 } : false}
                  animate={{ opacity: live ? 1 : 0 }}
                  transition={{ duration: 0.3, ease: EASE_OUT }}
                />
              </motion.g>
            </g>
          );
        })}

        {/* Center */}
        <circle cx={CX} cy={CY} r={3} fill="rgba(139,164,255,0.5)" />
      </svg>

      {/* Dauer-Sweep als HTML-Overlay (CSS, Compositor); MAX_R 165 / 440 = 37.5 % */}
      {showSweepFx ? (
        <RadarSweep
          color={color}
          period={SWEEP_PERIOD}
          trail={50}
          intensity={0.14}
          style={{ left: "12.5%", top: "12.5%", width: "75%", height: "75%", right: "auto", bottom: "auto" }}
        />
      ) : null}
    </div>
  );
};

export default RadarVisual;
