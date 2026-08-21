import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef } from "react";

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

function buildPolygon(values: number[]): string {
  return AXES.map((ax, i) => {
    const { x, y } = polar(ax.angle, MAX_R * values[i]);
    return `${x},${y}`;
  }).join(" ");
}

function buildRingPath(fraction: number): string {
  const pts = AXES.map((ax) => {
    const { x, y } = polar(ax.angle, MAX_R * fraction);
    return `${x},${y}`;
  });
  return `M ${pts[0]} L ${pts[1]} L ${pts[2]} Z`;
}

// ─── Sub-components ────────────────────────────────────────────────────────────
const SweepLine = ({ color }: { color: string }) => (
  <motion.g
    style={{ transformOrigin: `${CX}px ${CY}px` }}
    animate={{ rotate: [0, 360] }}
    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
  >
    {/* Trailing sector */}
    <path
      d={`M ${CX} ${CY} L ${CX + MAX_R * Math.cos((-90 * Math.PI) / 180)} ${CY + MAX_R * Math.sin((-90 * Math.PI) / 180)} A ${MAX_R} ${MAX_R} 0 0 1 ${CX + MAX_R * Math.cos((-60 * Math.PI) / 180)} ${CY + MAX_R * Math.sin((-60 * Math.PI) / 180)} Z`}
      fill={color}
      opacity={0.06}
    />
    {/* Scan line */}
    <line
      x1={CX} y1={CY}
      x2={CX + MAX_R * Math.cos((-90 * Math.PI) / 180)}
      y2={CY + MAX_R * Math.sin((-90 * Math.PI) / 180)}
      stroke={color}
      strokeWidth="1.5"
      opacity={0.75}
    />
  </motion.g>
);

// ─── Main Component ────────────────────────────────────────────────────────────
interface RadarVisualProps {
  activeScenario?: number;
  customValues?: [number, number, number];
  customColor?: string;
  size?: number;
  showSweep?: boolean;
}

const RadarVisual = ({ activeScenario = 0, customValues, customColor, size = 440, showSweep = true }: RadarVisualProps) => {
  const scenario = SCENARIOS[activeScenario];
  const values = customValues ?? scenario.values;
  const color = customColor ?? scenario.color;
  const points = buildPolygon(values);
  const uid = customValues ? `rv-custom` : `rv-${activeScenario}`;

  return (
    <div style={{ width: size, height: size, maxWidth: "100%" }}>
      <svg
        viewBox={`0 0 ${CX * 2} ${CY * 2}`}
        width="100%"
        height="100%"
        style={{ overflow: "visible" }}
      >
        <defs>
          <filter id={`glow-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={`dot-glow-${uid}`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id={`poly-fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Ring backgrounds */}
        {Array.from({ length: RINGS }).map((_, i) => (
          <path
            key={i}
            d={buildRingPath((i + 1) / RINGS)}
            fill="none"
            stroke="rgba(139,164,255,0.18)"
            strokeWidth="1"
          />
        ))}

        {/* Axis lines */}
        {AXES.map((ax) => {
          const end = polar(ax.angle, MAX_R);
          return (
            <line
              key={ax.label}
              x1={CX} y1={CY}
              x2={end.x} y2={end.y}
              stroke="rgba(139,164,255,0.12)"
              strokeWidth="1"
            />
          );
        })}

        {/* Scenario polygon */}
        <AnimatePresence mode="wait">
          <motion.polygon
            key={`poly-${activeScenario}`}
            points={points}
            fill={`url(#poly-fill-${uid})`}
            stroke={color}
            strokeWidth="1.5"
            filter={`url(#glow-${uid})`}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: `${CX}px ${CY}px` }}
          />
        </AnimatePresence>

        {/* Rotating sweep */}
        {showSweep && <SweepLine color={color} />}

        {/* Axis endpoint dots + labels */}
        {AXES.map((ax, i) => {
          const labelPt = polar(ax.angle, MAX_R + 32);
          const dotPt = polar(ax.angle, MAX_R * values[i]);

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

              {/* Value dot */}
              <AnimatePresence mode="wait">
                <motion.g key={`dot-${activeScenario}-${i}`}>
                  <motion.circle
                    cx={dotPt.x} cy={dotPt.y} r={5}
                    fill={color}
                    filter={`url(#dot-glow-${uid})`}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.4 }}
                    style={{ transformOrigin: `${dotPt.x}px ${dotPt.y}px` }}
                  />
                </motion.g>
              </AnimatePresence>
            </g>
          );
        })}

        {/* Center */}
        <circle cx={CX} cy={CY} r={3} fill="rgba(139,164,255,0.5)" />
      </svg>
    </div>
  );
};

export default RadarVisual;
