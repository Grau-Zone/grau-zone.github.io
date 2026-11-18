// Refined Digital Sovereignty Model (v13): "Two distinct ways to retain
// discretion under provider dependence".
//
// 4 Spalten: Response Capabilities → Mechanisms → Digital Sovereignty → Outcome.
// Zwei Pfade: blau = dependency-reducing (Exit), grün = control-preserving.
// Grün ist geteilt in A (selbst-durchsetzend, durchgezogen) und B (gewährt,
// gestrichelt: braucht Anbieter, Vertrag oder Regulierung).
// Das × zwischen Sovereignty und Outcome ist eine Interaktion, keine Addition.
//
// Optik: Hellgrün und Blau als feine Linien auf tiefem Grün (Abschnitt .rx-deep), Knoten
// als Ringe mit Kern, Beschriftungen mit Haarrand, damit keine Kante durch den Text läuft.
// Blau bleibt der Exit-Pfad (Lead-Text: "Blau ist der Exit-Pfad"), Mint der Kontroll-Pfad.
//
// Bewegung: Beim ersten Sichtkontakt zeichnet sich die Schrittachse (Spaltenköpfe, Ringe
// auf der Achse), die Knoten erscheinen auf einen Schlag (Entscheid Adrian 12.10.2026),
// danach fliesst Strom (SMIL-Signalpunkte, pausiert
// ausserhalb des Viewports und über den Pause-Knopf). Hover/Fokus auf einen
// C1-Knoten schickt einen Kometen über die Kette bis zum Outcome; die Schrittachse zeigt,
// durch welche Schritte die hervorgehobene Kette läuft.
// Reduziert (sanfte Stufe): Der Aufbau läuft per opacity, Zeichnen und clip-path,
// ohne Skalieren, Drehen oder Federn. Statt wandernder Signalpunkte leuchten die
// Kanten per SMIL-Opacity-Puls auf (Periode 3.4 s). Kein Komet, keine Wischgeste.
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, type Transition, type Variants } from "framer-motion";
import {
  CSS_EASE_IN_OUT,
  EASE_IN_OUT,
  EASE_OUT,
  SvgPing,
  safeAnimate,
  useFinePointer,
  useInViewOnce,
  useIsMobile,
  usePauseOffscreen,
  useReducedMotionSafe,
} from "@/components/fx";

// ─── Types ───────────────────────────────────────────────────────────────────
type Point = { x: number; y: number };
type NodeLabel = string | string[];
type EdgeKind = "dr" | "cp" | "granted" | "join" | "corr";
type Edge = [string, string, EdgeKind];

// ─── Pfade / Farbwelt ────────────────────────────────────────────────────────
// color: auf tiefem Grün (Diagramm); ink: dieselbe Farbfamilie dunkel genug für weissen Grund (Popup).
const PATHS: Record<string, { color: string; ink: string; colorDim: string; title: string }> = {
  dr:   { color: "#7fb0ea", ink: "#1d5aa6", colorDim: "rgba(127,176,234,0.28)", title: "Dependency-Reducing · Exit-Pfad" },
  cp:   { color: "#6fd69a", ink: "#006a27", colorDim: "rgba(111,214,154,0.28)", title: "Control-Preserving · Kontroll-Pfad" },
  join: { color: "#e9f3ed", ink: "#0c1310", colorDim: "rgba(233,243,237,0.28)", title: "Outcome" },
};

const SANS = "Switzer, 'Helvetica Neue', Helvetica, Arial, sans-serif";
const DEEP = "#06301d";
const ON_DEEP = "#e9f3ed";
const ON_DEEP_MUTE = "#a9c7b5";

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
  dr: "#7fb0ea",
  cp: "#6fd69a",
  granted: "#6fd69a",
  join: "#e9f3ed",
  corr: "rgba(233,243,237,0.6)",
};

// Handy: Signalpunkte nur auf den 6 Hauptkanten rechts vom C1-Fächer
// (ab ALT → FTC; die Korrelation trägt ohnehin keinen Punkt).
const MAIN_EDGE_FROM = 7;

// ─── Layout ──────────────────────────────────────────────────────────────────
const MO_VB_W = 2000;
const MO_VB_H = 1180;
const GROUP_BRACKET_X = 150;
/** Höhe der Schrittachse unter den Spaltenköpfen. */
const HEAD_AXIS_Y = 140;

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

const EDGE_D: string[] = MO_EDGES.map(([a, b, kind]) =>
  kind === "corr" ? moCorrCurve(MO_POSITIONS[a], MO_POSITIONS[b]) : moCurve(MO_POSITIONS[a], MO_POSITIONS[b])
);

// Kausale Kette ab einem Knoten bis CONT (ohne Korrelation), als Kanten-Indizes.
function chainFrom(id: string): number[] {
  const out: number[] = [];
  let cur = id;
  for (let guard = 0; guard < 8 && cur !== "CONT"; guard++) {
    const i = MO_EDGES.findIndex(([a, , kind]) => a === cur && kind !== "corr");
    if (i < 0) break;
    out.push(i);
    cur = MO_EDGES[i][1];
  }
  return out;
}

// ─── Aufbau-Zeitplan (Sekunden; seit 12.10.2026 mit Faktor 0, also auf einen Schlag) ──
const BUILD_TOTAL = 2.6;
const NODE_STAGGER = 0.06;
const COLUMN_OFFSET: Record<string, number> = { C1: 0, C2: 0.45, C3: 0.8 };
const X_OFFSET = 1.05;
const CONT_OFFSET = 1.25;
const EDGE_AFTER_SOURCE = 0.35;
const EDGE_DRAW = 0.6;
const LABEL_AFTER_NODE = 0.15;

const NODE_DELAY: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  const count: Record<string, number> = {};
  for (const n of MO_NODES) {
    if (n.id === "X") out[n.id] = X_OFFSET;
    else if (n.id === "CONT") out[n.id] = CONT_OFFSET;
    else {
      const k = count[n.column] ?? 0;
      count[n.column] = k + 1;
      out[n.id] = (COLUMN_OFFSET[n.column] ?? 0) + k * NODE_STAGGER;
    }
  }
  return out;
})();
const EDGE_DELAY: number[] = MO_EDGES.map(([a]) => NODE_DELAY[a] + EDGE_AFTER_SOURCE);
// Ankunft des letzten Strichs (X → CONT) am Outcome.
const ARRIVE = Math.max(...EDGE_DELAY) + EDGE_DRAW;
const BUILT_AT = BUILD_TOTAL - 0.1;

const GROUP_DELAY: Record<string, number> = Object.fromEntries(
  GROUPS.map((g) => [g.id, Math.min(...MO_NODES.filter((n) => n.group === g.id).map((n) => NODE_DELAY[n.id]))])
);

const COMET_POINTS = 24;
const COMET_SEGMENT_MS = 450;
const COMET_REPEAT_MS = 2200;

const FILL_CENTER: React.CSSProperties = { transformBox: "fill-box", transformOrigin: "center" };

function isFocusVisible(el: Element): boolean {
  try {
    return el.matches(":focus-visible");
  } catch {
    return true;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────
// Optionale Score-Einfaerbung: Knoten-ID -> 0..1, null = erhoben aber unbeantwortet.
// Knoten, die nicht im Objekt stehen, erhebt das Instrument nicht und bleiben grau.
export type NodeScores = Record<string, number | null>;

type DiagramProps = {
  scores?: NodeScores;
  /** Wird einmal aufgerufen, sobald der Aufbau steht (reduziert: sofort). */
  onBuilt?: () => void;
};

const SovereigntyModelDiagram = ({ scores, onBuilt }: DiagramProps = {}) => {
  const scored = !!scores;
  const scoreOf = (id: string): number | null | undefined => (scores ? scores[id] : undefined);
  const scoreColor = (v: number) => `hsl(${4 + 128 * Math.max(0, Math.min(1, v))}, 62%, 55%)`;
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null);

  const reduced = useReducedMotionSafe();
  const finePointer = useFinePointer();
  const isMobile = useIsMobile();

  // IDs für defs: stabil, nie vom Zustand abhängig.
  const uid = useId().replace(/:/g, "");
  const edgeId = (i: number) => `${uid}-mo-edge-path-${i}`;
  const maskId = (i: number) => `${uid}-mo-edge-mask-${i}`;
  const titleId = `${uid}-mo-popup-title`;

  const cardRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const inView = useInViewOnce(cardRef, { amount: 0.15 });

  // ── Aufbau ────────────────────────────────────────────────────────────────
  // Läuft auch bei reduzierter Bewegung (sanfte Stufe: nur opacity, Zeichnen,
  // clip-path); einmalig, deshalb auch bei gedrücktem Pause-Knopf.
  const go = inView;
  const [built, setBuilt] = useState(false);
  const isBuilt = built;
  const [outcomePing, setOutcomePing] = useState(0);
  // Zeitfaktor fuer alle Aufbau-Verzoegerungen und -Dauern. Entscheid Adrian
  // (12.10.2026): kein gestaffelter Aufbau mehr, das Diagramm erscheint auf einen
  // Schlag. 0 heisst: alles gleichzeitig, uebrig bleibt ein kurzes Einblenden.
  const kRef = useRef(0);
  const tk = kRef.current;

  useEffect(() => {
    if (!inView || built) return;
    const f = kRef.current;
    const t1 = window.setTimeout(() => setOutcomePing((p) => p + 1), ARRIVE * f * 1000);
    const t2 = window.setTimeout(() => setBuilt(true), BUILT_AT * f * 1000);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
    // built absichtlich nicht in den Abhängigkeiten: einmaliger Ablauf
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  const onBuiltRef = useRef(onBuilt);
  onBuiltRef.current = onBuilt;
  const builtFired = useRef(false);
  useEffect(() => {
    if (!isBuilt || builtFired.current) return;
    builtFired.current = true;
    onBuiltRef.current?.();
  }, [isBuilt]);

  /**
   * Varianten-Props für ein Aufbau-Element. Läuft auch reduziert; Aufrufer mit
   * scale/rotate geben dort eine Opacity- oder Zeichen-Variante mit.
   */
  const rv = (hidden: Record<string, unknown>, shown: Record<string, unknown>, transition: Transition) => ({
    initial: "hidden" as const,
    animate: go ? "shown" : "hidden",
    variants: { hidden, shown: { ...shown, transition } } as Variants,
  });

  // ── Hover-Highlighting ───────────────────────────────────────────────────
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

  // ── Komet (Kettenreaktion) ───────────────────────────────────────────────
  // Alles über refs und WAAPI, kein State pro Frame.
  const edgeRefs = useRef<(SVGPathElement | null)[]>([]);
  const edgePoints = useRef<(Point[] | null)[]>([]);
  const cometRef = useRef<SVGGElement | null>(null);
  const cometParts = useRef<(SVGCircleElement | null)[]>([]);
  const haloWrapRef = useRef<SVGGElement | null>(null);
  const comet = useRef<{ token: number; timer: number | null; anims: Animation[] }>({
    token: 0,
    timer: null,
    anims: [],
  });
  const cometEnabled = finePointer && !reduced;

  // 24 Stützpunkte je Kante, einmal beim Mount (die Geometrie ist fest).
  useEffect(() => {
    edgePoints.current = edgeRefs.current.map((p) => {
      if (!p || typeof p.getTotalLength !== "function" || typeof p.getPointAtLength !== "function") return null;
      try {
        const len = p.getTotalLength();
        return Array.from({ length: COMET_POINTS }, (_, j) => {
          const q = p.getPointAtLength((len * j) / (COMET_POINTS - 1));
          return { x: q.x, y: q.y };
        });
      } catch {
        return null;
      }
    });
  }, []);

  const stopComet = useCallback(() => {
    const c = comet.current;
    c.token++;
    if (c.timer !== null) window.clearTimeout(c.timer);
    c.timer = null;
    c.anims.forEach((a) => a.cancel());
    c.anims = [];
    if (cometRef.current) cometRef.current.style.opacity = "0";
  }, []);

  // Pausiert SMIL offscreen und beendet eine laufende Kometenschleife, sobald das
  // SVG den Viewport verlässt oder der Tab verborgen ist (z. B. Fokus bleibt auf
  // einem Knoten, während weitergescrollt wird).
  const svgActive = usePauseOffscreen(svgRef, {
    onChange: (active) => {
      if (!active) stopComet();
    },
  });

  const startComet = (id: string) => {
    stopComet();
    if (!cometEnabled || !isBuilt || !svgActive.current) return;
    const node = MO_NODE_BY_ID[id];
    if (!node || node.column !== "C1") return;
    const edges = chainFrom(id);
    if (!edges.length) return;
    const c = comet.current;
    const token = c.token;
    const color = PATHS[node.path].color;
    cometParts.current.forEach((el) => el?.setAttribute("fill", color));

    const run = () => {
      if (c.token !== token) return;
      c.timer = window.setTimeout(run, COMET_REPEAT_MS);
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      const g = cometRef.current;
      if (!g) return;
      c.anims.forEach((a) => a.cancel());
      c.anims = [];
      g.style.opacity = "1";
      let seg = 0;
      const step = () => {
        if (c.token !== token) return;
        if (seg >= edges.length) {
          // Ankunft am Outcome: Halo flackert einmal.
          const flick = safeAnimate(
            haloWrapRef.current,
            [{ transform: "scale(1)" }, { transform: "scale(1.35)" }, { transform: "scale(1)" }],
            { duration: 500, easing: CSS_EASE_IN_OUT },
          );
          if (flick) c.anims.push(flick);
          return;
        }
        const pts = edgePoints.current[edges[seg]];
        if (!pts) return;
        const frames = pts.map((p) => ({ transform: `translate(${p.x}px, ${p.y}px)` }));
        const last = seg === edges.length - 1;
        // Reihenfolge der Teile: [Schweif 2, Schweif 1, Kopf]
        const parts = cometParts.current;
        const delays = [120, 60, 0];
        let head: Animation | null = null;
        parts.forEach((el, pi) => {
          const a = safeAnimate(el, frames, {
            duration: COMET_SEGMENT_MS,
            delay: delays[pi] ?? 0,
            easing: CSS_EASE_IN_OUT,
            fill: "both",
          });
          if (!a) return;
          c.anims.push(a);
          if (pi === parts.length - 1) head = a;
          // Nach dem letzten Segment verschwindet der Komet mit dem letzten Schweif.
          if (last && pi === 0) {
            a.finished
              .then(() => {
                if (c.token === token && cometRef.current) cometRef.current.style.opacity = "0";
              })
              .catch(() => {});
          }
        });
        seg++;
        const h = head as Animation | null;
        if (!h) return;
        h.finished.then(step).catch(() => {});
      };
      step();
    };
    run();
  };

  useEffect(() => stopComet, [stopComet]);

  // ── Popup / Fokus ────────────────────────────────────────────────────────
  const openerRef = useRef<SVGGElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const [popupOrigin, setPopupOrigin] = useState<Point>({ x: 0, y: 0 });
  const [clickPing, setClickPing] = useState<{ id: string; n: number }>({ id: "CONT", n: 0 });

  const openNode = (id: string, el: SVGGElement) => {
    stopComet();
    openerRef.current = el;
    const hit = el.querySelector("[data-mo-hit]") ?? el;
    let origin: Point = { x: 0, y: 0 };
    try {
      const r = hit.getBoundingClientRect();
      if (typeof window !== "undefined" && r.width > 0) {
        origin = { x: r.left + r.width / 2 - window.innerWidth / 2, y: r.top + r.height / 2 - window.innerHeight / 2 };
      }
    } catch {
      /* ignorieren */
    }
    setPopupOrigin(origin);
    setClickPing((p) => ({ id, n: p.n + 1 }));
    setActiveNodeId(id);
  };

  const closePopup = useCallback(() => {
    setActiveNodeId(null);
    const el = openerRef.current;
    if (el && typeof el.focus === "function") {
      try {
        el.focus({ preventScroll: true });
      } catch {
        el.focus();
      }
    }
  }, []);

  useEffect(() => {
    if (!activeNodeId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closePopup();
      }
    };
    document.addEventListener("keydown", onKey);
    const raf = window.requestAnimationFrame(() => {
      try {
        closeBtnRef.current?.focus({ preventScroll: true });
      } catch {
        closeBtnRef.current?.focus();
      }
    });
    return () => {
      document.removeEventListener("keydown", onKey);
      window.cancelAnimationFrame(raf);
    };
  }, [activeNodeId, closePopup]);

  // Fokusfalle: im Dialog ist der Schliessen-Knopf das einzige Ziel.
  const onDialogKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      closeBtnRef.current?.focus();
    }
  };

  // Reduziert: Einblenden statt Feder-Flug; die Inhalte blenden gestaffelt ein.
  const cardVariants: Variants = reduced
    ? {
        hidden: { opacity: 0 },
        shown: {
          opacity: 1,
          transition: { duration: 0.2, ease: EASE_OUT, staggerChildren: 0.04, delayChildren: 0.06 },
        },
        exit: { opacity: 0, transition: { duration: 0.15, ease: EASE_OUT } },
      }
    : {
        hidden: (o: Point) => ({ opacity: 0, x: o.x, y: o.y, scale: 0.5 }),
        shown: {
          opacity: 1,
          x: 0,
          y: 0,
          scale: 1,
          transition: {
            type: "spring",
            stiffness: 260,
            damping: 24,
            opacity: { duration: 0.2, ease: EASE_OUT },
            staggerChildren: 0.04,
            delayChildren: 0.06,
          },
        },
        exit: { opacity: 0, scale: 0.98, transition: { duration: 0.15, ease: EASE_OUT } },
      };
  const itemVariants: Variants = reduced
    ? {
        hidden: { opacity: 0 },
        shown: { opacity: 1, transition: { duration: 0.3, ease: EASE_OUT } },
      }
    : {
        hidden: { opacity: 0, y: 6 },
        shown: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE_OUT } },
      };

  const clickPingPos = MO_POSITIONS[clickPing.id] ?? MO_POSITIONS.CONT;

  return (
    <>
      {/* Diagram card */}
      {/* Reduziert: nur Einblenden, ohne Anheben */}
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: reduced ? 0 : 14 }}
        animate={go ? { opacity: 1, y: 0 } : { opacity: 0, y: reduced ? 0 : 14 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
        className="relative w-full"
        style={{ borderTop: "1px solid var(--rx-line-deep)", borderBottom: "1px solid var(--rx-line-deep)" }}
      >
        {/* Handy: horizontal scrollbar; Desktop: volle Breite */}
        <div className="overflow-x-auto md:overflow-visible [scrollbar-color:#6fd69a_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-mint/60 [&::-webkit-scrollbar-track]:bg-transparent">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${MO_VB_W} ${MO_VB_H}`}
            preserveAspectRatio="xMidYMid meet"
            className={`w-full h-auto block min-w-[1040px] md:min-w-0${isMobile && inView && !reduced ? " fx-once" : ""}`}
            style={
              isMobile && inView && !reduced
                ? { animation: "fx-swipe-hint 1.8s var(--ease-in-out) 0.6s 1 both" }
                : undefined
            }
          >
            <defs>
              {/* Zeichen-Masken: ein weisser Vollstrich gleicher Geometrie wächst per
                  pathLength; das Strichmuster der Kante bleibt so erhalten. */}
              {!isBuilt &&
                MO_EDGES.map((_, i) => (
                  <mask
                    key={`m-${i}`}
                    id={maskId(i)}
                    maskUnits="userSpaceOnUse"
                    x={0}
                    y={0}
                    width={MO_VB_W}
                    height={MO_VB_H}
                  >
                    <motion.path
                      d={EDGE_D[i]}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth={12}
                      {...rv(
                        { pathLength: 0 },
                        { pathLength: 1 },
                        { duration: EDGE_DRAW * tk, ease: EASE_IN_OUT, delay: EDGE_DELAY[i] * tk },
                      )}
                    />
                  </mask>
                ))}
            </defs>

            {/* Schrittachse: eine Haarlinie unter den Spaltenköpfen, auf der jeder Schritt einen Ring
                trägt. Die Linie zeichnet sich von links, die Ringe füllen sich, sobald die
                hervorgehobene Kette durch den Schritt läuft. */}
            <motion.line
              x1={COLUMNS[0].x - 205}
              y1={HEAD_AXIS_Y}
              x2={COLUMNS[COLUMNS.length - 1].x + 105}
              y2={HEAD_AXIS_Y}
              stroke={ON_DEEP}
              strokeOpacity="0.28"
              strokeWidth="1.5"
              {...rv({ pathLength: 0 }, { pathLength: 1 }, { duration: 1.5, ease: EASE_OUT, delay: 0.15 })}
            />
            {COLUMNS.map((c, ci) => {
              const lit = !!highlightId && MO_NODES.some((n) => n.column === c.id && neighborIds.has(n.id));
              return (
                <motion.g
                  key={`col-${c.id}`}
                  {...rv(
                    { clipPath: "inset(0% 100% 0% 0%)" },
                    { clipPath: "inset(0% 0% 0% 0%)" },
                    { duration: 0.6, ease: EASE_OUT, delay: 0.1 + ci * 0.18 },
                  )}
                >
                  <text
                    x={c.x}
                    y={56}
                    textAnchor="middle"
                    fontFamily={SANS}
                    fontSize="18"
                    fontWeight="600"
                    letterSpacing="3.2"
                    fill={ON_DEEP_MUTE}
                    style={{ textTransform: "uppercase" }}
                  >
                    {c.step}
                  </text>
                  <text
                    x={c.x}
                    y={100}
                    textAnchor="middle"
                    fontFamily={SANS}
                    fontSize="31"
                    fontWeight="500"
                    letterSpacing="-0.6"
                    fill={ON_DEEP}
                  >
                    {c.title}
                  </text>
                  <circle
                    cx={c.x}
                    cy={HEAD_AXIS_Y}
                    r="8"
                    fill={lit ? "#6fd69a" : DEEP}
                    stroke="#6fd69a"
                    strokeWidth="2"
                    style={{ transition: "fill 0.25s" }}
                  />
                </motion.g>
              );
            })}

            {/* Gruppen-Brackets in Spalte 1 (Dependency-Reducing / Control-Preserving A + B) */}
            {GROUPS.map((g) => {
              const color = PATHS[g.path].color;
              const dimmed = highlightId
                ? !MO_NODES.some((n) => n.group === g.id && neighborIds.has(n.id))
                : false;
              const gd = GROUP_DELAY[g.id] * tk;
              const hookDelay = gd + 0.5 * tk;
              return (
                <g key={`grp-${g.id}`} style={{ opacity: dimmed ? 0.3 : 1, transition: "opacity 0.25s" }}>
                  {/* Reduziert: Die Klammer zeichnet sich per pathLength (gestrichelt:
                      blendet ein, weil pathLength das Strichmuster ersetzen würde),
                      die Haken blenden ein. Kein Skalieren. */}
                  <motion.line
                    x1={GROUP_BRACKET_X} y1={g.top} x2={GROUP_BRACKET_X} y2={g.bottom}
                    stroke={color} strokeOpacity="0.6" strokeWidth="1.5"
                    strokeDasharray={g.granted ? "5 5" : undefined}
                    style={reduced ? undefined : { transformBox: "fill-box", originX: 0.5, originY: 0 }}
                    {...(reduced
                      ? g.granted
                        ? rv({ opacity: 0 }, { opacity: 1 }, { duration: 0.5 * tk, ease: EASE_OUT, delay: gd })
                        : rv({ pathLength: 0 }, { pathLength: 1 }, { duration: 0.5 * tk, ease: EASE_IN_OUT, delay: gd })
                      : rv({ scaleY: 0 }, { scaleY: 1 }, { duration: 0.5 * tk, ease: EASE_IN_OUT, delay: gd }))}
                  />
                  <motion.line x1={GROUP_BRACKET_X} y1={g.top} x2={GROUP_BRACKET_X + 16} y2={g.top}
                    stroke={color} strokeOpacity="0.6" strokeWidth="1.5"
                    style={reduced ? undefined : { transformBox: "fill-box", originX: 0, originY: 0.5 }}
                    {...(reduced
                      ? rv({ opacity: 0 }, { opacity: 1 }, { duration: 0.25, ease: EASE_OUT, delay: hookDelay })
                      : rv({ scaleX: 0 }, { scaleX: 1 }, { duration: 0.25, ease: EASE_OUT, delay: hookDelay }))}
                  />
                  <motion.line x1={GROUP_BRACKET_X} y1={g.bottom} x2={GROUP_BRACKET_X + 16} y2={g.bottom}
                    stroke={color} strokeOpacity="0.6" strokeWidth="1.5"
                    style={reduced ? undefined : { transformBox: "fill-box", originX: 0, originY: 0.5 }}
                    {...(reduced
                      ? rv({ opacity: 0 }, { opacity: 1 }, { duration: 0.25, ease: EASE_OUT, delay: hookDelay })
                      : rv({ scaleX: 0 }, { scaleX: 1 }, { duration: 0.25, ease: EASE_OUT, delay: hookDelay }))}
                  />
                  <motion.g {...rv({ opacity: 0 }, { opacity: 1 }, { duration: 0.4, ease: EASE_OUT, delay: gd })}>
                    <text
                      x={GROUP_BRACKET_X} y={g.top - 36}
                      fontFamily={SANS}
                      fontSize="19" fontWeight="600" letterSpacing="1.6"
                      fill={color}
                      style={{ textTransform: "uppercase" }}
                    >
                      {g.title}
                    </text>
                    <text
                      x={GROUP_BRACKET_X} y={g.top - 10}
                      fontFamily={SANS}
                      fontSize="18" fill={ON_DEEP_MUTE}
                    >
                      {g.sub}
                    </text>
                  </motion.g>
                </g>
              );
            })}

            {/* Kanten */}
            {MO_EDGES.map(([a, b, kind], i) => {
              const isCorr = kind === "corr";
              const isGranted = kind === "granted";
              const isSolid = !isCorr && !isGranted;
              const related = !!highlightId && neighborIds.has(a) && neighborIds.has(b);
              const dim = !!highlightId && !related;
              const color = EDGE_COLOR[kind];
              const pulseDelay = (i * 0.31) % 3.4;
              const flowing = related && isSolid && !reduced;
              // Wandernde Lichter laufen auch in der sanften Stufe (kleine Punkte,
              // auf das Diagramm begrenzt; Entscheid Adrian 12.10.2026).
              const showDot = !isCorr && isBuilt && (!isMobile || i >= MAIN_EDGE_FROM);
              // Kanten ohne Licht (Handy, Nebenkanten) leuchten bei reduce per
              // SMIL-Opacity-Puls auf (Periode 3.4 s, pausiert mit dem SVG).
              const showPulse = !isCorr && isBuilt && reduced && !showDot;
              return (
                <g key={`e-${i}`}>
                  <path
                    ref={(el) => {
                      edgeRefs.current[i] = el;
                    }}
                    id={edgeId(i)}
                    d={EDGE_D[i]}
                    fill="none"
                    stroke={color}
                    strokeOpacity={dim ? 0.08 : related ? 1 : isCorr ? 0.5 : isGranted ? 0.6 : 0.7}
                    strokeWidth={related ? 3.2 : isCorr ? 1.5 : 2}
                    strokeDasharray={isGranted ? "7 6" : isCorr ? "2 7" : flowing ? "6 10" : undefined}
                    className={flowing ? "fx-loop fx-dash-flow" : undefined}
                    style={{
                      transition: "stroke-opacity 0.25s",
                      animation: flowing ? "fx-dash-flow 0.8s linear infinite" : undefined,
                    }}
                    mask={!isBuilt ? `url(#${maskId(i)})` : undefined}
                  />
                  {/* Fließendes Signal, nicht auf der Korrelationslinie (kein Kausalpfad).
                      Erst nach dem Aufbau, ohne Blur-Filter: Halo-Kreis + Kern. */}
                  {showDot && (
                    <g aria-hidden="true" className="fx-deco" pointerEvents="none">
                      <animateMotion
                        dur={`${related ? 1.6 : 3.4}s`}
                        repeatCount="indefinite"
                        begin={`-${pulseDelay}s`}
                        keyPoints="0;1"
                        keyTimes="0;1"
                        calcMode="linear"
                      >
                        <mpath href={`#${edgeId(i)}`} />
                      </animateMotion>
                      <animate
                        attributeName="opacity"
                        values={dim ? "0;0" : related ? "0;1;1;1;0" : "0;0.7;0.9;0.7;0"}
                        keyTimes={dim ? "0;1" : "0;0.15;0.5;0.85;1"}
                        dur={`${related ? 1.6 : 3.4}s`}
                        repeatCount="indefinite"
                        begin={`-${pulseDelay}s`}
                      />
                      <circle r={7} fill={color} fillOpacity={0.2} />
                      <circle
                        r={2.5}
                        fill={color}
                        style={{
                          ...FILL_CENTER,
                          transform: related ? "scale(1.4)" : "scale(1)",
                          transition: "transform 0.25s",
                        }}
                      />
                    </g>
                  )}
                  {showPulse && (
                    <path
                      aria-hidden="true"
                      className="fx-deco"
                      pointerEvents="none"
                      d={EDGE_D[i]}
                      fill="none"
                      stroke={color}
                      strokeWidth={related ? 3.2 : 2.6}
                      strokeLinecap="round"
                      strokeDasharray={isGranted ? "7 6" : undefined}
                      opacity={0}
                    >
                      <animate
                        attributeName="opacity"
                        values={dim ? "0;0" : related ? "0;0.85;0" : "0;0.5;0"}
                        keyTimes={dim ? "0;1" : "0;0.5;1"}
                        calcMode={dim ? "linear" : "spline"}
                        keySplines={dim ? undefined : "0.45 0 0.55 1;0.45 0 0.55 1"}
                        dur="3.4s"
                        repeatCount="indefinite"
                        begin={`-${pulseDelay}s`}
                      />
                    </path>
                  )}
                </g>
              );
            })}

            {/* Beschriftung der Korrelation FTC ↔ CTO */}
            <motion.g {...rv({ opacity: 0 }, { opacity: 1 }, { duration: 0.4, ease: EASE_OUT, delay: (EDGE_DELAY[9] + 0.3) * tk })}>
              <text
                x={MO_POSITIONS.FTC.x + 115}
                y={MO_POSITIONS.X.y}
                textAnchor="middle"
                fontFamily={SANS}
                fontSize="18"
                fontStyle="italic"
                fill={ON_DEEP_MUTE}
                stroke={DEEP}
                strokeWidth="7"
                strokeLinejoin="round"
                paintOrder="stroke"
                opacity={highlightId && !(neighborIds.has("FTC") && neighborIds.has("CTO")) ? 0.2 : 1}
                style={{ transition: "opacity 0.25s" }}
              >
                related but distinct
              </text>
            </motion.g>

            {/* Beschriftung der Interaktion × → Outcome */}
            <motion.g {...rv({ opacity: 0 }, { opacity: 1 }, { duration: 0.4, ease: EASE_OUT, delay: (EDGE_DELAY[12] + 0.2) * tk })}>
              <text
                x={(MO_POSITIONS.X.x + MO_POSITIONS.CONT.x) / 2}
                y={MO_POSITIONS.X.y - 48}
                textAnchor="middle"
                fontFamily={SANS}
                fontSize="17"
                fontStyle="italic"
                fill={ON_DEEP_MUTE}
                stroke={DEEP}
                strokeWidth="7"
                strokeLinejoin="round"
                paintOrder="stroke"
              >
                jointly drive continuity
              </text>
            </motion.g>

            {/* Komet: Kopf + zwei Schweifkreise, bewegt per WAAPI (nur feiner Zeiger) */}
            {cometEnabled && (
              <g ref={cometRef} aria-hidden="true" className="fx-deco" pointerEvents="none" style={{ opacity: 0 }}>
                {[
                  { r: 3.4, o: 0.25 },
                  { r: 4.2, o: 0.5 },
                  { r: 5, o: 1 },
                ].map((p, pi) => (
                  <circle
                    key={pi}
                    ref={(el) => {
                      cometParts.current[pi] = el;
                    }}
                    cx={0}
                    cy={0}
                    r={p.r}
                    opacity={p.o}
                    fill="#7fb0ea"
                  />
                ))}
              </g>
            )}

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
              const nd = NODE_DELAY[n.id] * tk;

              // Radien bleiben konstant; aktiv/Hover skaliert per transform.
              const gradR = isOutcome ? 28 : isX ? 20 : 22;
              const gradScale = isActive ? 32 / gradR : 1;
              const coreR = isOutcome ? 9 : 6;
              const coreScale = (isActive || isHover) && !isOutcome ? 1.5 : 1;

              const nodeShown: Record<string, unknown> = isX ? { opacity: 1, scale: 1, rotate: 0 } : { opacity: 1, scale: 1 };
              const nodeHidden: Record<string, unknown> = isX ? { opacity: 0, scale: 0.6, rotate: -90 } : { opacity: 0, scale: 0.6 };
              const nodeTransition: Transition = {
                type: "spring",
                duration: 0.5,
                bounce: isX ? 0.25 : 0.2,
                delay: nd,
                opacity: { duration: 0.25, ease: EASE_OUT, delay: nd },
              };

              return (
                <motion.g
                  key={n.id}
                  {...rv(
                    { opacity: 0 },
                    { opacity: 1 },
                    reduced ? { duration: 0.4, ease: EASE_OUT, delay: nd } : { duration: 0.2, delay: nd },
                  )}
                >
                  <g
                    role="button"
                    tabIndex={0}
                    aria-label={isX ? "Interaktion" : moLabelText(n.label)}
                    className="group/mo"
                    onMouseEnter={() => {
                      setHoverNodeId(n.id);
                      startComet(n.id);
                    }}
                    onMouseLeave={() => {
                      setHoverNodeId(null);
                      stopComet();
                    }}
                    onFocus={(e) => {
                      if (!isFocusVisible(e.currentTarget)) return;
                      setHoverNodeId(n.id);
                      startComet(n.id);
                    }}
                    onBlur={() => {
                      setHoverNodeId((h) => (h === n.id ? null : h));
                      stopComet();
                    }}
                    onClick={(e) => {
                      if (isActive) setActiveNodeId(null);
                      else openNode(n.id, e.currentTarget);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
                        e.preventDefault();
                        openNode(n.id, e.currentTarget);
                      }
                    }}
                    style={{ cursor: "pointer", outline: "none", opacity: isDimmed ? 0.3 : 1, transition: "opacity 0.25s" }}
                  >
                    {/* Aufbau: Knotengrafik skaliert von .6 auf 1 (fill-box, zentriert).
                        Reduziert: keine Feder; der Knoten blendet nur über die äussere
                        Gruppe ein. */}
                    <motion.g
                      style={FILL_CENTER}
                      {...(reduced ? {} : rv(nodeHidden, nodeShown, nodeTransition))}
                    >
                      <circle data-mo-hit="" cx={pos.x} cy={pos.y} r="44" fill="transparent" />

                      {/* Pulsierender Halo nur beim Outcome (CSS fx-halo statt SMIL auf r) */}
                      {isOutcome && (
                        <g ref={haloWrapRef} style={FILL_CENTER}>
                          <circle
                            className="fx-halo"
                            cx={pos.x} cy={pos.y} r="50"
                            fill="none"
                            stroke={path.color}
                            strokeWidth="1.2"
                            opacity={highlightId && !isRelated ? 0.15 : 0.7}
                          />
                        </g>
                      )}

                      <circle
                        cx={pos.x} cy={pos.y}
                        r={gradR}
                        fill={DEEP}
                        fillOpacity={isActive ? 0.9 : 0}
                        stroke={path.color}
                        strokeWidth="1.3"
                        strokeOpacity={isActive || isHover ? 0.95 : 0.45}
                        opacity={scored && scoreOf(n.id) === undefined && !isX ? 0.25 : 1}
                        style={{
                          ...FILL_CENTER,
                          transform: `scale(${gradScale})`,
                          transition: reduced ? undefined : "transform 0.3s cubic-bezier(0.23,1,0.32,1)",
                        }}
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
                            fontFamily={SANS}
                            fontSize="29" fontWeight="500"
                            fill={path.color}
                          >
                            ×
                          </text>
                        </>
                      ) : scored && typeof scoreOf(n.id) === "number" ? null : (
                        <circle
                          cx={pos.x} cy={pos.y}
                          r={coreR}
                          fill={path.color}
                          stroke={isActive ? ON_DEEP : "transparent"}
                          strokeWidth={1.5 / coreScale}
                          style={{
                            ...FILL_CENTER,
                            transform: `scale(${coreScale})`,
                            transition: reduced ? undefined : "transform 160ms cubic-bezier(0.23,1,0.32,1)",
                          }}
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
                          fontFamily={SANS} fontSize="26" fontWeight="600" fill="#ffffff">
                          {Math.round((scoreOf(n.id) as number) * 100)}
                        </text>
                      )}
                    </motion.g>

                    {/* Fokusring: nicht mitskaliert, nur bei Tastaturfokus */}
                    <circle
                      aria-hidden="true"
                      className="pointer-events-none opacity-0 group-focus-visible/mo:opacity-100"
                      cx={pos.x} cy={pos.y} r="31"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2.5"
                      vectorEffect="non-scaling-stroke"
                    />

                    {/* Label: blendet 150 ms nach seinem Knoten ein */}
                    {!isX &&
                      (() => {
                        const lines = moLabelLines(n.label);
                        const fontSize = isOutcome ? 28 : 23.5;
                        const lineHeight = fontSize * 1.18;
                        const labelX = below ? pos.x : pos.x + (scored ? 52 : 32);
                        const anchor = below ? "middle" : "start";
                        const startY = below
                          ? pos.y + (scored ? 84 : 72)
                          : pos.y + 7 - ((lines.length - 1) * lineHeight) / 2;
                        return (
                          <motion.g
                            {...rv(
                              { opacity: 0 },
                              { opacity: 1 },
                              { duration: 0.3, ease: EASE_OUT, delay: nd + LABEL_AFTER_NODE * tk },
                            )}
                          >
                            <text
                              x={labelX}
                              y={startY}
                              fontFamily={SANS}
                              fontSize={fontSize}
                              fontWeight={isOutcome ? 600 : 500}
                              letterSpacing="-0.2"
                              fill={isActive ? "#ffffff" : path.color}
                              stroke={DEEP}
                              strokeWidth="8"
                              strokeLinejoin="round"
                              paintOrder="stroke"
                              opacity={isRelated || !highlightId ? 1 : 0.55}
                              textAnchor={anchor}
                            >
                              {lines.map((line, li) => (
                                <tspan key={li} x={labelX} dy={li === 0 ? 0 : lineHeight}>
                                  {line}
                                </tspan>
                              ))}
                            </text>
                          </motion.g>
                        );
                      })()}
                  </g>
                </motion.g>
              );
            })}

            {/* Ankunft am Outcome: einmaliger Ortungsring */}
            <SvgPing
              cx={MO_POSITIONS.CONT.x}
              cy={MO_POSITIONS.CONT.y}
              r={28}
              color={PATHS.join.color}
              play={outcomePing}
              scale={3}
              fromOpacity={0.6}
              duration={0.9}
            />
            {/* Klick auf einen Knoten */}
            <SvgPing
              cx={clickPingPos.x}
              cy={clickPingPos.y}
              r={22}
              color={PATHS[MO_NODE_BY_ID[clickPing.id]?.path ?? "join"].color}
              play={clickPing.n}
              scale={2.2}
              duration={0.6}
            />
          </svg>
        </div>

        {/* Handy: Verlauf am rechten Rand deutet weiteren Inhalt an */}
        <div
          aria-hidden="true"
          className="fx-deco pointer-events-none absolute right-0 top-0 w-12 md:hidden"
          style={{ bottom: "3.25rem", background: "linear-gradient(90deg, rgba(6,48,29,0), rgba(6,48,29,0.92))" }}
        />

        {/* Legende und Hinweis: eine Zeile unter dem Diagramm, durch eine Haarlinie abgesetzt */}
        <div
          className="pointer-events-none flex flex-wrap items-center justify-between gap-x-8 gap-y-2 px-1 py-4 text-[0.75rem] font-semibold uppercase tracking-[0.12em]"
          style={{ borderTop: "1px solid var(--rx-line-deep)", color: ON_DEEP_MUTE }}
        >
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="flex items-center gap-2.5">
              <svg width="26" height="6" aria-hidden="true"><line x1="0" y1="3" x2="26" y2="3" stroke="#7fb0ea" strokeWidth="2" /></svg>
              dependency-reducing
            </span>
            <span className="flex items-center gap-2.5">
              <svg width="26" height="6" aria-hidden="true"><line x1="0" y1="3" x2="26" y2="3" stroke="#6fd69a" strokeWidth="2" /></svg>
              control-preserving
            </span>
            <span className="flex items-center gap-2.5">
              <svg width="26" height="6" aria-hidden="true"><line x1="0" y1="3" x2="26" y2="3" stroke="#6fd69a" strokeWidth="2" strokeDasharray="5 4" /></svg>
              gewährt
            </span>
            <span className="flex items-center gap-2.5">
              <svg width="26" height="6" aria-hidden="true"><line x1="0" y1="3" x2="26" y2="3" stroke="rgba(233,243,237,0.7)" strokeWidth="1.6" strokeDasharray="2 5" strokeLinecap="round" /></svg>
              korreliert
            </span>
          </div>
          <span className="text-deep-on/80">▸ Klick für Details</span>
        </div>
      </motion.div>

      {/* ─── Popup (kompakt): weisses Blatt auf dem tiefen Grund ───────────────────
          Per Portal an document.body: Der Abschnitt (.rx-deep) bildet einen eigenen
          Stapelkontext, darin läge der Vorhang unter der fixen Navigation. */}
      {typeof document !== "undefined" &&
        createPortal(
      <AnimatePresence>
        {activeNode && activePath && (
          <motion.div
            key="mo-popup-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className="fixed inset-0 z-50 flex items-center justify-center p-5"
            onClick={closePopup}
            style={{ background: "rgba(6, 48, 29, 0.82)" }}
          >
            <motion.div
              key="mo-popup-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              custom={popupOrigin}
              variants={cardVariants}
              initial="hidden"
              animate="shown"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={onDialogKeyDown}
              className="relative max-h-[calc(100svh-2.5rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-background p-7 text-ink sm:p-9"
              style={{ fontFamily: SANS }}
            >
              <button
                ref={closeBtnRef}
                onClick={closePopup}
                className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-border text-[1rem] text-ink transition-colors duration-200 hover:border-green hover:bg-green-soft hover:text-green-ink"
                aria-label="Schließen"
              >
                ✕
              </button>

              {/* Verortung: Spalte · Gruppe */}
              <motion.div variants={itemVariants} className="mb-4 flex items-center gap-3 pr-12">
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: activePath.ink }}
                />
                <span
                  className="text-[0.8125rem] font-semibold uppercase leading-snug tracking-[0.12em]"
                  style={{ color: activePath.ink }}
                >
                  {activeColumn?.title}
                  {activeGroup ? ` · ${activeGroup.title}` : ""}
                </span>
              </motion.div>

              <motion.h3
                id={titleId}
                variants={itemVariants}
                className="mb-4 text-[clamp(1.7rem,3.6vw,2.2rem)] font-medium leading-[1.08] tracking-[-0.03em] text-ink"
              >
                {activeNode.id === "X" ? "Interaktion" : moLabelText(activeNode.label)}
              </motion.h3>

              <motion.p variants={itemVariants} className="mb-6 text-[1.0625rem] leading-[1.6] text-ink/85">
                {activeNode.def}
              </motion.p>

              {/* Direkte Verbindungen (kompakt) */}
              <motion.div
                variants={itemVariants}
                className="grid grid-cols-2 gap-5 border-t border-border pt-5 text-[0.9375rem]"
              >
                <div>
                  <div className="mb-2 text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    ← eingehend
                  </div>
                  {activeEdges.incoming.length === 0 ? (
                    <div className="text-muted-foreground">keine</div>
                  ) : (
                    activeEdges.incoming.map(({ otherId, kind }, idx) => (
                      <div key={`in-${otherId}-${idx}`} className="mb-1.5 leading-snug text-ink">
                        {moLabelText(MO_NODE_BY_ID[otherId]?.label)}
                        {kind === "granted" && <span className="text-muted-foreground"> · gewährt</span>}
                      </div>
                    ))
                  )}
                </div>
                <div>
                  <div className="mb-2 text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    ausgehend →
                  </div>
                  {activeEdges.outgoing.length === 0 ? (
                    <div className="text-muted-foreground">keine</div>
                  ) : (
                    activeEdges.outgoing.map(({ otherId, kind }, idx) => (
                      <div key={`out-${otherId}-${idx}`} className="mb-1.5 leading-snug text-ink">
                        {otherId === "X" ? "× (Interaktion)" : moLabelText(MO_NODE_BY_ID[otherId]?.label)}
                        {kind === "corr" && <span className="text-muted-foreground"> · korreliert</span>}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
          document.body,
        )}
    </>
  );
};

export default SovereigntyModelDiagram;
