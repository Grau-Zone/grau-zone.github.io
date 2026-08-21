import { motion, AnimatePresence } from "framer-motion";

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

export const CAPACITIES: Capacity[] = [
  {
    key: "sw",
    tag: "Switching",
    title: "Wechselfähigkeit",
    keyQuestion: "Können wir den Anbieter wechseln?",
    color: "#4B6EFF",
    colorBg: "rgba(75,110,255,0.08)",
    colorBorder: "rgba(75,110,255,0.25)",
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
    color: "#A855F7",
    colorBg: "rgba(168,85,247,0.08)",
    colorBorder: "rgba(168,85,247,0.25)",
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
    color: "#00C4A0",
    colorBg: "rgba(0,196,160,0.08)",
    colorBorder: "rgba(0,196,160,0.25)",
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
    color: "#FF9F2E",
    colorBg: "rgba(255,159,46,0.08)",
    colorBorder: "rgba(255,159,46,0.25)",
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
  return `M ${pts.join(" L ")} Z`;
}

function anchorFor(angle: number): "start" | "middle" | "end" {
  if (angle === 0) return "start";
  if (angle === 180) return "end";
  return "middle"; // top / bottom
}

// ─── Main Component ────────────────────────────────────────────────────────────
interface CapacityRadarProps {
  values?: number[];        // 4 values 0..1, defaults to baseline
  color?: string;
  activeIndex?: number;     // highlight one axis (others dimmed)
  size?: number;
  showSweep?: boolean;
}

const CapacityRadar = ({ values, color = "#4B6EFF", activeIndex, size = 440 }: CapacityRadarProps) => {
  const vals = values ?? BASELINE_VALUES;
  const points = buildPolygon(vals);
  const uid = `cr-${activeIndex ?? "x"}`;
  const hasHighlight = typeof activeIndex === "number";

  return (
    <div style={{ width: size, maxWidth: "100%", aspectRatio: `${VB_W} / ${VB_H}` }}>
      <svg
        viewBox={`${VB_X} ${VB_Y} ${VB_W} ${VB_H}`}
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
        {AXES.map((ax, i) => {
          const end = polar(ax.angle, MAX_R);
          const dim = hasHighlight && i !== activeIndex;
          return (
            <line
              key={ax.label}
              x1={CX}
              y1={CY}
              x2={end.x}
              y2={end.y}
              stroke={dim ? "rgba(139,164,255,0.06)" : "rgba(139,164,255,0.14)"}
              strokeWidth="1"
            />
          );
        })}

        {/* Profile polygon */}
        <AnimatePresence mode="wait">
          <motion.polygon
            key={`poly-${color}`}
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

        {/* Axis endpoint dots + labels */}
        {AXES.map((ax, i) => {
          const labelPt = polar(ax.angle, MAX_R + 14);
          const dotPt = polar(ax.angle, MAX_R * vals[i]);
          const pct = Math.round(vals[i] * 100);
          const anchor = anchorFor(ax.angle);
          const dim = hasHighlight && i !== activeIndex;
          const labelColor = dim ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.85)";

          // badge offsets, outward (toward the label); flips inward only near 100% so it never overlaps the outer label
          const nearMax = vals[i] > 0.85;
          const bx = ax.angle === 0 ? (nearMax ? -12 : 12) : ax.angle === 180 ? (nearMax ? 12 : -12) : 0;
          const by = ax.angle === -90 ? (nearMax ? 16 : -12) : ax.angle === 90 ? (nearMax ? -8 : 18) : 4;
          const badgeAnchor = ax.angle === 0 ? (nearMax ? "end" : "start") : ax.angle === 180 ? (nearMax ? "start" : "end") : "middle";

          return (
            <g key={ax.label} style={{ transition: "opacity 0.3s" }}>
              {/* Axis label */}
              <text
                x={labelPt.x}
                y={labelPt.y}
                textAnchor={anchor}
                dominantBaseline="middle"
                fill={labelColor}
                fontSize="18"
                fontFamily="Space Grotesk, sans-serif"
                fontWeight={dim ? 500 : 600}
              >
                {ax.label}
              </text>

              {/* Value dot */}
              <circle
                cx={dotPt.x}
                cy={dotPt.y}
                r={dim ? 3.5 : 5}
                fill={color}
                filter={`url(#dot-glow-${uid})`}
                opacity={dim ? 0.45 : 1}
              />
              {/* % badge */}
              <text
                x={dotPt.x + bx}
                y={dotPt.y + by}
                textAnchor={badgeAnchor}
                fill={color}
                fontSize="14"
                fontFamily="Space Grotesk, sans-serif"
                fontWeight="600"
                opacity={dim ? 0.6 : 1}
              >
                {pct}%
              </text>
            </g>
          );
        })}

        {/* Center */}
        <circle cx={CX} cy={CY} r={3} fill="rgba(139,164,255,0.5)" />
      </svg>
    </div>
  );
};

export default CapacityRadar;
