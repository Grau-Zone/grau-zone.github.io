// Refined Digital Sovereignty Model (v13): "Two distinct ways to retain
// discretion under provider dependence".
//
// 4 Spalten: Response Capabilities → Mechanisms → Digital Sovereignty → Outcome.
// Zwei Pfade: blau = dependency-reducing (Exit), grün = control-preserving.
// Grün ist geteilt in A (selbst-durchsetzend, durchgezogen) und B (gewährt,
// gestrichelt: braucht Anbieter, Vertrag oder Regulierung).
// Das × zwischen Sovereignty und Outcome ist eine Interaktion, keine Addition.
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ───────────────────────────────────────────────────────────────────
type Point = { x: number; y: number };
type NodeLabel = string | string[];
type EdgeKind = "dr" | "cp" | "granted" | "join" | "corr";
type Edge = [string, string, EdgeKind];

// ─── Pfade / Farbwelt ────────────────────────────────────────────────────────
const PATHS: Record<string, { color: string; colorDim: string; title: string }> = {
  dr:   { color: "#6b9bd8", colorDim: "rgba(107,155,216,0.28)", title: "Dependency-Reducing · Exit-Pfad" },
  cp:   { color: "#5cbf8a", colorDim: "rgba(92,191,138,0.28)",  title: "Control-Preserving · Kontroll-Pfad" },
  join: { color: "#6cc2b5", colorDim: "rgba(108,194,181,0.28)", title: "Outcome" },
};

// ─── Spalten ─────────────────────────────────────────────────────────────────
const COLUMNS = [
  { id: "C1", step: "Step 1", title: "Response Capabilities", x: 355 },
  { id: "C2", step: "Step 2", title: "Mechanisms",            x: 1000 },
  { id: "C3", step: "Step 3", title: "Digital Sovereignty",   x: 1445 },
  { id: "C4", step: "Step 4", title: "Outcome",               x: 1860 },
];

// ─── Gruppen in Spalte 1 (die inhaltliche Kernaussage des Modells) ───────────
const GROUPS = [
  { id: "DR",  path: "dr", title: "Dependency-Reducing",
    sub: "Alternativen und Exit-Optionen aufbauen", top: 240, bottom: 510 },
  { id: "CPA", path: "cp", title: "Control-Preserving A · selbst-durchsetzend",
    sub: "wirkt ohne Zustimmung des Anbieters", top: 615, bottom: 780 },
  { id: "CPB", path: "cp", title: "Control-Preserving B · gewährt", granted: true,
    sub: "braucht Anbieter, Vertrag oder Regulierung", top: 885, bottom: 1050 },
];

// ─── Knoten ──────────────────────────────────────────────────────────────────
type ModelNode = {
  id: string;
  label: NodeLabel;
  path: string;
  group?: string;
  column: string;
  x: number;
  y: number;
  labelPos?: "right" | "below";
  granted?: boolean;
  def: string;
};

const MO_NODES: ModelNode[] = [
  // 1) RESPONSE CAPABILITIES: Dependency-Reducing (blau)
  { id: "PSC", label: ["Provider Switching", "Capability"], path: "dr", group: "DR", column: "C1", x: 210, y: 275,
    def: "Den Anbieter durch eine valide Alternative ersetzen können." },
  { id: "IOC", label: ["In-House Operation", "Capability"], path: "dr", group: "DR", column: "C1", x: 210, y: 380,
    def: "Die Funktion intern selbst betreiben können." },
  { id: "MPM", label: ["Multi-Provider", "Management Capability"], path: "dr", group: "DR", column: "C1", x: 210, y: 480,
    def: "Mehrere Anbieter parallel und kontrolliert steuern können." },

  // 1) RESPONSE CAPABILITIES: Control-Preserving A (selbst-durchsetzend)
  { id: "DKC", label: ["Data and Key", "Control Capability"], path: "cp", group: "CPA", column: "C1", x: 210, y: 650,
    def: "Eigene Schlüssel und clientseitige Verschlüsselung. Der Anbieter hält die Daten und kann sie nicht lesen. Die Organisation setzt das ohne Zustimmung des Anbieters durch." },
  { id: "ORB", label: ["Operational Resilience", "and Backup Capability"], path: "cp", group: "CPA", column: "C1", x: 210, y: 750,
    def: "Eigene, exportierte Backups außerhalb des Anbieters. Sie bleiben nutzbar, wenn der Anbieter vollständig ausfällt." },

  // 1) RESPONSE CAPABILITIES: Control-Preserving B (gewährt)
  { id: "AAR", label: ["Administrative Access", "and Rights Capability"], path: "cp", group: "CPB", column: "C1", x: 210, y: 920, granted: true,
    def: "Hybride Form. Die Ausübung (IAM, least privilege) erfolgt einseitig. Den Rahmen dafür definiert der Anbieter über seine Control Plane." },
  { id: "ATR", label: ["Audit and Transparency", "Rights Capability"], path: "cp", group: "CPB", column: "C1", x: 210, y: 1020, granted: true,
    def: "Prüfrechte bestehen nur, soweit Vertrag oder Regulierung sie einräumen. Ein rein gewährtes Recht." },

  // 2) MECHANISMS
  { id: "ALT", label: ["Credible Alternatives /", "Reconfiguration Options"], path: "dr", column: "C2", x: 880, y: 380,
    def: "Mindestens eine tragfähige Alternative. Sie lässt sich in akzeptabler Zeit, zu akzeptablen Kosten und mit vertretbarer Störung aktivieren." },
  { id: "ROC", label: ["Retained Operational", "Control"], path: "cp", column: "C2", x: 880, y: 835,
    def: "Die Organisation behält zentrale Entscheidungsrechte und operative Kontrolle über kritische Aspekte der Funktion." },

  // 3) DIGITAL SOVEREIGNTY
  { id: "FTC", label: ["Reconfiguration", "Discretion", "(Freedom to Change)"], path: "dr", column: "C3", x: 1330, y: 380,
    def: "Anbieter, Konfiguration oder Bezugsweg der Funktion bei Bedarf ändern können." },
  { id: "CTO", label: ["Operational Control", "under Dependence", "(Control to Operate)"], path: "cp", column: "C3", x: 1330, y: 835,
    def: "Die Funktion betreiben, schützen, überwachen und wiederherstellen können, ohne für jede kritische Handlung vom Anbieter abzuhängen." },

  // Interaktion
  { id: "X", label: "×", path: "join", column: "C3", x: 1660, y: 607, labelPos: "below",
    def: "Eine Interaktion, keine Addition. Beide Formen von Discretion wirken gemeinsam auf die Kontinuität." },

  // 4) OUTCOME
  { id: "CONT", label: ["Continuity under", "Provider Disruption"], path: "join", column: "C4", x: 1860, y: 607, labelPos: "below",
    def: "Die kritische digitale Funktion aufrechterhalten oder schnell wiederherstellen, wenn der Anbieter ausfällt oder einseitig handelt." },
];
const MO_NODE_BY_ID: Record<string, ModelNode> = Object.fromEntries(MO_NODES.map((n) => [n.id, n]));

const MO_POSITIONS: Record<string, Point> = Object.fromEntries(
  MO_NODES.map((n) => [n.id, { x: n.x, y: n.y }])
);

const moLabelText = (label: NodeLabel) => (Array.isArray(label) ? label.join(" ") : label);
const moLabelLines = (label: NodeLabel) => (Array.isArray(label) ? label : [label]);

// ─── Kanten ──────────────────────────────────────────────────────────────────
// dr / cp / join = durchgezogen · granted = gestrichelt · corr = gepunktet (Korrelation)
const MO_EDGES: Edge[] = [
  ["PSC", "ALT", "dr"],
  ["IOC", "ALT", "dr"],
  ["MPM", "ALT", "dr"],

  ["DKC", "ROC", "cp"],
  ["ORB", "ROC", "cp"],
  ["AAR", "ROC", "granted"],
  ["ATR", "ROC", "granted"],

  ["ALT", "FTC", "dr"],
  ["ROC", "CTO", "cp"],

  ["FTC", "CTO", "corr"], // "related but distinct": Korrelation, kein Kausalpfad

  ["FTC", "X", "join"],
  ["CTO", "X", "join"],
  ["X", "CONT", "join"],
];

const EDGE_COLOR: Record<EdgeKind, string> = {
  dr: "#6b9bd8",
  cp: "#5cbf8a",
  granted: "#5cbf8a",
  join: "#6cc2b5",
  corr: "rgba(190,210,230,0.55)",
};

// ─── Layout ──────────────────────────────────────────────────────────────────
const MO_VB_W = 2000;
const MO_VB_H = 1180;
const GROUP_BRACKET_X = 150;

// Standard-Kurve links → rechts.
function moCurve(a: Point, b: Point) {
  const midX = (a.x + b.x) / 2;
  const dy = b.y - a.y;
  const bow = Math.abs(dy) < 20 ? 22 : 0;
  return `M ${a.x} ${a.y} C ${midX} ${a.y + bow}, ${midX} ${b.y + bow}, ${b.x} ${b.y}`;
}

// Korrelations-Kurve (FTC ↔ CTO): senkrecht, leicht nach rechts gebogen.
function moCorrCurve(a: Point, b: Point) {
  const midY = (a.y + b.y) / 2;
  return `M ${a.x} ${a.y} Q ${a.x + 95} ${midY}, ${b.x} ${b.y}`;
}

// ─── Liquid glass ────────────────────────────────────────────────────────────
// Ursprünglich die globale Klasse `.liquid-glass-strong`, hier inline, damit die
// Komponente eigenständig ist.
const LIQUID_GLASS: React.CSSProperties = {
  background: "rgba(16, 24, 32, 0.55)",
  backdropFilter: "blur(50px) saturate(135%)",
  WebkitBackdropFilter: "blur(50px) saturate(135%)",
  border: "1px solid rgba(200,220,235,0.07)",
};

// ─── Component ───────────────────────────────────────────────────────────────
// Optionale Score-Einfaerbung: Knoten-ID -> 0..1, null = erhoben aber unbeantwortet.
// Knoten, die nicht im Objekt stehen, erhebt das Instrument nicht und bleiben grau.
export type NodeScores = Record<string, number | null>;

const SovereigntyModelDiagram = ({ scores }: { scores?: NodeScores } = {}) => {
  const scored = !!scores;
  const scoreOf = (id: string): number | null | undefined => (scores ? scores[id] : undefined);
  const scoreColor = (v: number) => `hsl(${4 + 128 * Math.max(0, Math.min(1, v))}, 62%, 55%)`;
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null);

  const highlightId = activeNodeId || hoverNodeId;

  // Transitive Erreichbarkeit (vorwärts + rückwärts) für das Hover-Highlighting.
  const neighborIds = useMemo(() => {
    if (!highlightId) return new Set<string>();
    const s = new Set<string>([highlightId]);
    const walk = (startId: string, dir: "down" | "up") => {
      const queue = [startId];
      while (queue.length) {
        const cur = queue.shift() as string;
        MO_EDGES.forEach(([a, b, kind]) => {
          const bidir = kind === "corr"; // Korrelation zählt in beide Richtungen
          let next: string | null = null;
          if (dir === "down") {
            if (a === cur) next = b;
            else if (bidir && b === cur) next = a;
          } else {
            if (b === cur) next = a;
            else if (bidir && a === cur) next = b;
          }
          if (next && !s.has(next)) {
            s.add(next);
            queue.push(next);
          }
        });
      }
    };
    walk(highlightId, "down");
    walk(highlightId, "up");
    return s;
  }, [highlightId]);

  const activeNode = activeNodeId ? MO_NODE_BY_ID[activeNodeId] : null;
  const activePath = activeNode ? PATHS[activeNode.path] : null;
  const activeGroup = activeNode?.group ? GROUPS.find((g) => g.id === activeNode.group) : null;
  const activeColumn = activeNode ? COLUMNS.find((c) => c.id === activeNode.column) : null;

  // Nur die direkten Kanten, bewusst kompakt gehalten.
  const activeEdges = useMemo(() => {
    const incoming: { otherId: string; kind: EdgeKind }[] = [];
    const outgoing: { otherId: string; kind: EdgeKind }[] = [];
    if (!activeNodeId) return { incoming, outgoing };
    MO_EDGES.forEach(([a, b, kind]) => {
      if (kind === "corr") {
        // Korrelation: auf beiden Seiten als "verbunden" zeigen
        if (a === activeNodeId) outgoing.push({ otherId: b, kind });
        if (b === activeNodeId) outgoing.push({ otherId: a, kind });
        return;
      }
      if (a === activeNodeId) outgoing.push({ otherId: b, kind });
      if (b === activeNodeId) incoming.push({ otherId: a, kind });
    });
    return { incoming, outgoing };
  }, [activeNodeId]);

  return (
    <>
      {/* Diagram card */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full rounded-2xl overflow-hidden"
        style={{
          ...LIQUID_GLASS,
          boxShadow:
            "0 0 60px rgba(80,110,140,0.1), 0 30px 80px rgba(0,0,0,0.5), inset 0 1px 1px rgba(200,220,235,0.08)",
        }}
      >
        <svg
          viewBox={`0 0 ${MO_VB_W} ${MO_VB_H}`}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-auto block"
        >
          <defs>
            <filter id="mo-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {Object.entries(PATHS).map(([key, p]) => (
              <radialGradient key={key} id={`mo-grad-${key}`}>
                <stop offset="0%" stopColor={p.color} stopOpacity="0.9" />
                <stop offset="70%" stopColor={p.color} stopOpacity="0.35" />
                <stop offset="100%" stopColor={p.color} stopOpacity="0" />
              </radialGradient>
            ))}
            {/* Pulsierender Halo für das Outcome */}
            <radialGradient id="mo-grad-out-pulse">
              <stop offset="0%" stopColor="#6cc2b5" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#6cc2b5" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Spaltenköpfe */}
          {COLUMNS.map((c) => (
            <g key={`col-${c.id}`}>
              <text
                x={c.x}
                y={62}
                textAnchor="middle"
                fontFamily="'Share Tech Mono', monospace"
                fontSize="17"
                fontWeight="700"
                letterSpacing="4.5"
                fill="rgba(190,210,230,0.6)"
                style={{ textTransform: "uppercase" }}
              >
                {c.step}
              </text>
              <text
                x={c.x}
                y={100}
                textAnchor="middle"
                fontFamily="'Share Tech Mono', monospace"
                fontSize="24"
                fontWeight="700"
                letterSpacing="3.5"
                fill="rgba(214,230,245,0.92)"
                style={{ textTransform: "uppercase" }}
              >
                {c.title}
              </text>
            </g>
          ))}

          {/* Gruppen-Brackets in Spalte 1 (Dependency-Reducing / Control-Preserving A + B) */}
          {GROUPS.map((g) => {
            const color = PATHS[g.path].color;
            const dimmed = highlightId
              ? !MO_NODES.some((n) => n.group === g.id && neighborIds.has(n.id))
              : false;
            return (
              <g key={`grp-${g.id}`} style={{ opacity: dimmed ? 0.3 : 1, transition: "opacity 0.25s" }}>
                <line
                  x1={GROUP_BRACKET_X} y1={g.top} x2={GROUP_BRACKET_X} y2={g.bottom}
                  stroke={color} strokeOpacity="0.35" strokeWidth="1.5"
                  strokeDasharray={g.granted ? "5 5" : undefined}
                />
                <line x1={GROUP_BRACKET_X} y1={g.top} x2={GROUP_BRACKET_X + 16} y2={g.top}
                  stroke={color} strokeOpacity="0.35" strokeWidth="1.5" />
                <line x1={GROUP_BRACKET_X} y1={g.bottom} x2={GROUP_BRACKET_X + 16} y2={g.bottom}
                  stroke={color} strokeOpacity="0.35" strokeWidth="1.5" />
                <text
                  x={GROUP_BRACKET_X} y={g.top - 34}
                  fontFamily="'Share Tech Mono', monospace"
                  fontSize="18" fontWeight="700" letterSpacing="1.8"
                  fill={color} fillOpacity="0.95"
                  style={{ textTransform: "uppercase" }}
                >
                  {g.title}
                </text>
                <text
                  x={GROUP_BRACKET_X} y={g.top - 10}
                  fontFamily="'Geist','Inter',sans-serif"
                  fontSize="16" fill="rgba(214,230,245,0.55)"
                >
                  {g.sub}
                </text>
              </g>
            );
          })}

          {/* Kanten */}
          {MO_EDGES.map(([a, b, kind], i) => {
            const A = MO_POSITIONS[a];
            const B = MO_POSITIONS[b];
            const isCorr = kind === "corr";
            const isGranted = kind === "granted";
            const related = highlightId && neighborIds.has(a) && neighborIds.has(b);
            const dim = highlightId && !related;
            const pathId = `mo-edge-path-${i}`;
            const d = isCorr ? moCorrCurve(A, B) : moCurve(A, B);
            const color = EDGE_COLOR[kind];
            const pulseDelay = (i * 0.31) % 3.4;
            return (
              <g key={`e-${i}`}>
                <path
                  id={pathId}
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeOpacity={dim ? 0.08 : related ? 0.95 : isCorr ? 0.35 : isGranted ? 0.45 : 0.55}
                  strokeWidth={related ? 2.6 : isCorr ? 1.2 : 1.5}
                  strokeDasharray={isGranted ? "7 6" : isCorr ? "2 7" : undefined}
                  style={{ transition: "stroke-opacity 0.25s, stroke-width 0.25s" }}
                  filter={related ? "url(#mo-glow)" : undefined}
                />
                {/* Fließendes Signal, nicht auf der Korrelationslinie (kein Kausalpfad) */}
                {!isCorr && (
                  <circle
                    r={related ? 3.5 : 2.5}
                    fill={color}
                    opacity={dim ? 0 : related ? 1 : 0.75}
                    filter="url(#mo-glow)"
                    style={{ transition: "opacity 0.25s, r 0.25s" }}
                  >
                    <animateMotion
                      dur={`${related ? 1.6 : 3.4}s`}
                      repeatCount="indefinite"
                      begin={`-${pulseDelay}s`}
                      keyPoints="0;1"
                      keyTimes="0;1"
                      calcMode="linear"
                    >
                      <mpath href={`#${pathId}`} />
                    </animateMotion>
                    <animate
                      attributeName="opacity"
                      values={dim ? "0;0" : related ? "0;1;1;1;0" : "0;0.7;0.9;0.7;0"}
                      keyTimes="0;0.15;0.5;0.85;1"
                      dur={`${related ? 1.6 : 3.4}s`}
                      repeatCount="indefinite"
                      begin={`-${pulseDelay}s`}
                    />
                  </circle>
                )}
              </g>
            );
          })}

          {/* Beschriftung der Korrelation FTC ↔ CTO */}
          <text
            x={MO_POSITIONS.FTC.x + 115}
            y={MO_POSITIONS.X.y}
            textAnchor="middle"
            fontFamily="'Geist','Inter',sans-serif"
            fontSize="16"
            fontStyle="italic"
            fill="rgba(214,230,245,0.55)"
            opacity={highlightId && !(neighborIds.has("FTC") && neighborIds.has("CTO")) ? 0.2 : 1}
            style={{ transition: "opacity 0.25s" }}
          >
            related but distinct
          </text>

          {/* Beschriftung der Interaktion × → Outcome */}
          <text
            x={(MO_POSITIONS.X.x + MO_POSITIONS.CONT.x) / 2}
            y={MO_POSITIONS.X.y - 48}
            textAnchor="middle"
            fontFamily="'Geist','Inter',sans-serif"
            fontSize="15.5"
            fontStyle="italic"
            fill="rgba(214,230,245,0.5)"
          >
            jointly drive continuity
          </text>

          {/* Knoten */}
          {MO_NODES.map((n) => {
            const pos = MO_POSITIONS[n.id];
            const path = PATHS[n.path];
            const isActive = activeNodeId === n.id;
            const isHover = hoverNodeId === n.id;
            const isRelated = highlightId ? neighborIds.has(n.id) : false;
            const isDimmed = highlightId && !isRelated;
            const isOutcome = n.id === "CONT";
            const isX = n.id === "X";
            const below = n.labelPos === "below";

            return (
              <g
                key={n.id}
                onMouseEnter={() => setHoverNodeId(n.id)}
                onMouseLeave={() => setHoverNodeId(null)}
                onClick={() => setActiveNodeId(isActive ? null : n.id)}
                style={{ cursor: "pointer", opacity: isDimmed ? 0.3 : 1, transition: "opacity 0.25s" }}
              >
                <circle cx={pos.x} cy={pos.y} r="44" fill="transparent" />

                {/* Pulsierender Halo nur beim Outcome */}
                {isOutcome && (
                  <circle
                    cx={pos.x} cy={pos.y} r="60"
                    fill="url(#mo-grad-out-pulse)"
                    opacity={highlightId && !isRelated ? 0.15 : 0.7}
                  >
                    <animate attributeName="r" values="50;65;50" dur="3.2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.4;0.75;0.4" dur="3.2s" repeatCount="indefinite" />
                  </circle>
                )}

                <circle
                  cx={pos.x} cy={pos.y}
                  r={isActive ? 32 : isOutcome ? 28 : isX ? 20 : 22}
                  fill={`url(#mo-grad-${n.path})`}
                  opacity={scored && scoreOf(n.id) === undefined && !isX ? 0.25 : 1}
                  style={{ transition: "r 0.3s" }}
                />
                {/* Score-Ring: gefuellter Bogen entsprechend dem eigenen Wert */}
                {scored && !isX && (() => {
                  const v = scoreOf(n.id);
                  if (v === undefined) return null;                    // nicht erhoben
                  const R = isOutcome ? 40 : 34;
                  const c = 2 * Math.PI * R;
                  if (v === null) return (                             // erhoben, unbeantwortet
                    <circle cx={pos.x} cy={pos.y} r={R} fill="none"
                      stroke="rgba(255,255,255,0.28)" strokeWidth="5" strokeDasharray="4 7" />
                  );
                  return (
                    <g transform={`rotate(-90 ${pos.x} ${pos.y})`}>
                      <circle cx={pos.x} cy={pos.y} r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="6" />
                      <circle cx={pos.x} cy={pos.y} r={R} fill="none" stroke={scoreColor(v)} strokeWidth="6"
                        strokeLinecap="round" strokeDasharray={`${c * v} ${c}`} />
                    </g>
                  );
                })()}

                {isX ? (
                  <>
                    <circle
                      cx={pos.x} cy={pos.y} r="21"
                      fill="none"
                      stroke={path.color}
                      strokeOpacity={isActive || isHover ? 1 : 0.75}
                      strokeWidth="1.8"
                    />
                    <text
                      x={pos.x} y={pos.y + 9}
                      textAnchor="middle"
                      fontFamily="'Geist','Inter',sans-serif"
                      fontSize="27" fontWeight="600"
                      fill={path.color}
                    >
                      ×
                    </text>
                  </>
                ) : scored && typeof scoreOf(n.id) === "number" ? null : (
                  <circle
                    cx={pos.x} cy={pos.y}
                    r={isActive || isHover ? 9 : isOutcome ? 9 : 6}
                    fill={path.color}
                    stroke={isActive ? "#ffffff" : "transparent"}
                    strokeWidth="1.5"
                    style={{ transition: "all 0.2s" }}
                  />
                )}

                {/* Gestrichelter Ring markiert "gewährte" Capabilities */}
                {n.granted && !isX && (
                  <circle
                    cx={pos.x} cy={pos.y} r="14"
                    fill="none"
                    stroke={path.color}
                    strokeOpacity="0.75"
                    strokeWidth="1.3"
                    strokeDasharray="4 4"
                  />
                )}

                {/* Score als Zahl */}
                {scored && !isX && typeof scoreOf(n.id) === "number" && (
                  <text x={pos.x} y={pos.y + 9} textAnchor="middle"
                    fontFamily="'Space Grotesk', sans-serif" fontSize="26" fontWeight="700" fill="#ffffff">
                    {Math.round((scoreOf(n.id) as number) * 100)}
                  </text>
                )}

                {/* Label */}
                {!isX &&
                  (() => {
                    const lines = moLabelLines(n.label);
                    const fontSize = isOutcome ? 25 : 21;
                    const lineHeight = fontSize * 1.18;
                    const labelX = below ? pos.x : pos.x + (scored ? 52 : 32);
                    const anchor = below ? "middle" : "start";
                    const startY = below
                      ? pos.y + (scored ? 84 : 72)
                      : pos.y + 7 - ((lines.length - 1) * lineHeight) / 2;
                    return (
                      <text
                        x={labelX}
                        y={startY}
                        fontFamily="'Geist','Inter',sans-serif"
                        fontSize={fontSize}
                        fontWeight={isOutcome ? 600 : 500}
                        fill={isActive ? "#ffffff" : path.color}
                        opacity={isRelated || !highlightId ? 1 : 0.55}
                        textAnchor={anchor}
                      >
                        {lines.map((line, li) => (
                          <tspan key={li} x={labelX} dy={li === 0 ? 0 : lineHeight}>
                            {line}
                          </tspan>
                        ))}
                      </text>
                    );
                  })()}
              </g>
            );
          })}
        </svg>

        {/* Legende (unten links) */}
        <div
          className="absolute bottom-3 left-4 flex items-center gap-4 text-[10px] tracking-[0.2em] uppercase pointer-events-none flex-wrap"
          style={{ fontFamily: "'Share Tech Mono', monospace", color: "rgba(190,210,230,0.55)" }}
        >
          <span className="flex items-center gap-2">
            <svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" stroke="#6b9bd8" strokeWidth="1.8" /></svg>
            dependency-reducing
          </span>
          <span className="flex items-center gap-2">
            <svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" stroke="#5cbf8a" strokeWidth="1.8" /></svg>
            control-preserving
          </span>
          <span className="flex items-center gap-2">
            <svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" stroke="#5cbf8a" strokeWidth="1.6" strokeDasharray="5 4" /></svg>
            gewährt
          </span>
          <span className="flex items-center gap-2">
            <svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" stroke="rgba(190,210,230,0.6)" strokeWidth="1.4" strokeDasharray="2 5" /></svg>
            korreliert
          </span>
        </div>

        {/* Hinweis (unten rechts) */}
        <div
          className="absolute bottom-3 right-4 text-[10px] tracking-[0.25em] uppercase pointer-events-none"
          style={{ fontFamily: "'Share Tech Mono', monospace", color: "rgba(190,210,230,0.3)" }}
        >
          ▸ Klick für Details
        </div>
      </motion.div>

      {/* ─── Popup (kompakt) ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {activeNode && activePath && (
          <motion.div
            key="mo-popup-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            onClick={() => setActiveNodeId(null)}
            style={{
              background: "rgba(4, 8, 12, 0.35)",
              backdropFilter: "blur(2px)",
              WebkitBackdropFilter: "blur(2px)",
            }}
          >
            <motion.div
              key="mo-popup-card"
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-lg w-full rounded-2xl p-7"
              style={{
                ...LIQUID_GLASS,
                boxShadow: `0 30px 90px rgba(0,0,0,0.7), 0 0 80px ${activePath.colorDim}, inset 0 1px 1px rgba(255,255,255,0.1)`,
              }}
            >
              <button
                onClick={() => setActiveNodeId(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.9)",
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: "16px",
                }}
                aria-label="Schließen"
              >
                ✕
              </button>

              {/* Verortung: Spalte · Gruppe */}
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="inline-block w-2 h-2 rounded-full shrink-0"
                  style={{ background: activePath.color, boxShadow: `0 0 10px ${activePath.color}` }}
                />
                <span
                  className="text-[10.5px] tracking-[0.25em] uppercase"
                  style={{ color: activePath.color, fontFamily: "'Share Tech Mono', monospace" }}
                >
                  {activeColumn?.title}
                  {activeGroup ? ` · ${activeGroup.title}` : ""}
                </span>
              </div>

              <h3
                className="text-2xl lg:text-3xl mb-3"
                style={{
                  fontFamily: "'Fraunces Variable', 'Fraunces', serif",
                  fontWeight: 400,
                  lineHeight: 1.1,
                  letterSpacing: "-0.015em",
                  color: "#ffffff",
                }}
              >
                {activeNode.id === "X" ? "Interaktion" : moLabelText(activeNode.label)}
              </h3>

              <p
                className="text-[14px] leading-[1.65] mb-5"
                style={{ fontFamily: "'Geist','Inter',sans-serif", color: "rgba(255,255,255,0.85)" }}
              >
                {activeNode.def}
              </p>

              {/* Direkte Verbindungen (kompakt) */}
              <div
                className="grid grid-cols-2 gap-4 text-[12.5px] pt-4"
                style={{ fontFamily: "'Geist','Inter',sans-serif", borderTop: "1px solid rgba(200,215,225,0.1)" }}
              >
                <div>
                  <div
                    className="text-[9.5px] tracking-[0.2em] uppercase mb-1.5"
                    style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Share Tech Mono', monospace" }}
                  >
                    ← eingehend
                  </div>
                  {activeEdges.incoming.length === 0 ? (
                    <div style={{ color: "rgba(255,255,255,0.35)" }}>keine</div>
                  ) : (
                    activeEdges.incoming.map(({ otherId, kind }, idx) => (
                      <div key={`in-${otherId}-${idx}`} className="mb-1" style={{ color: "rgba(255,255,255,0.85)" }}>
                        {moLabelText(MO_NODE_BY_ID[otherId]?.label)}
                        {kind === "granted" && (
                          <span style={{ color: "rgba(255,255,255,0.45)" }}> · gewährt</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
                <div>
                  <div
                    className="text-[9.5px] tracking-[0.2em] uppercase mb-1.5"
                    style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Share Tech Mono', monospace" }}
                  >
                    ausgehend →
                  </div>
                  {activeEdges.outgoing.length === 0 ? (
                    <div style={{ color: "rgba(255,255,255,0.35)" }}>keine</div>
                  ) : (
                    activeEdges.outgoing.map(({ otherId, kind }, idx) => (
                      <div key={`out-${otherId}-${idx}`} className="mb-1" style={{ color: "rgba(255,255,255,0.85)" }}>
                        {otherId === "X" ? "× (Interaktion)" : moLabelText(MO_NODE_BY_ID[otherId]?.label)}
                        {kind === "corr" && (
                          <span style={{ color: "rgba(255,255,255,0.45)" }}> · korreliert</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SovereigntyModelDiagram;
