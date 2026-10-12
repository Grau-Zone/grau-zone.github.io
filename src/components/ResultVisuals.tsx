// Zwei Visualisierungen für die Ergebnisseite des Self-Assessments:
//  1) Souveränitäts-Matrix: FTC (x) gegen CTO (y), Punktfarbe = Outcome
//  2) Wirkkette: die vier Modellspalten als Stufen, schwächste markiert
//
// Dazu die Einblend-Mechanik der Ergebnisseite (useRevealOnce, useMatrixReveal):
// Jede Grafik wird immer im Endzustand gerendert. Effekte sind WAAPI-Animationen
// mit fill 'backwards' (bis zum Sichtkontakt pausiert auf ihrem Startbild) oder
// zusaetzliche aria-hidden Deko-Ebenen. Im Druck, ohne IntersectionObserver/WAAPI
// und im versteckten Tab entsteht gar keine Animation, es bleibt beim Endzustand
// im DOM. Bei reduzierter Bewegung laeuft die sanfte Stufe (fxsoft.md): nur
// opacity, Zeichnen (stroke-dashoffset) und clip-path-Wipes, keine Transformation.
//
// Takt der Matrizen (MATRIX_T, gilt auch fuer die Transparenz-Matrix ueber
// useMatrixReveal): (1) Skala: Achsen zeichnen sich vom Ursprung, Raster,
// Lineale und Ecken erscheinen, Mittelkreuz waechst. (2) Gruppe aus der Raute:
// zuerst der Median (Raute), dann waechst der Rahmen der mittleren Haelfte aus
// ihr, zuletzt der Buchstabe. (3) Ortung: Hilfslinien zeichnen sich, die
// Beschriftung zaehlt synchron vom Ursprung, ein Fadenkreuz rastet ein, Ping.
// Alle Instrumenten-Teile sind aria-hidden Deko ohne Text und Zahl; Positionen,
// Skalen, Teilung bei 0.5 und Rundungen sind unveraendert.
// Einzige Dauerschleife: der Radarstrahl hinter der Souveraenitaets-Matrix samt
// Ortungsring am eigenen Punkt (beide HTML in einer Deko-Ebene unter dem svg,
// fx-contained, laufen auch bei reduce). Er startet erst nach dem Entree,
// pausiert ueber usePauseOffscreen am Wrapper (Pause-Knopf, offscreen,
// verstecktes Tab) und ist im Druck unsichtbar (fx-deco).
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Lang } from "../data/instrument";
import { UI, pick } from "../data/surveyUi";
import { quadrantKey, type QuadKey } from "../data/scoring";
import type { Quant } from "../data/benchmarkCore";
import {
  Blip, CSS_EASE_IN_OUT, CSS_EASE_OUT, EASE_IN_OUT, EASE_OUT, RadarSweep, SvgPing, safeAnimate, sweepDelay,
  useInViewOnce, usePauseOffscreen, useReducedMotionSafe,
} from "./fx";
import {
  MATRIX_T, MatrixAxesDraw, MatrixInstrument, MatrixPlate, MatrixReticle, instrumentSteps, matrixRegrowSteps,
  useGroupRegrow, useSvgUid, useValueCount,
} from "./resultfx";

const AXIS = "rgba(190,210,230,0.30)";
const LABEL = "rgba(214,230,245,0.55)";
/** Helle Deko-Kopien (Mittelkreuz, Hilfslinien) beim Einblenden. */
const AXIS_BRIGHT = "rgba(214,230,245,0.8)";

// ─── Einblend-Mechanik ───────────────────────────────────────────────────────
export type RevealStep = {
  el: Element | null | undefined;
  keyframes: Keyframe[];
  /** Millisekunden */
  duration: number;
  /** Millisekunden */
  delay?: number;
  easing?: string;
};

/**
 * Sichtkontakt-Schwelle der Ergebnisseite: erster sichtbarer Pixel, ohne
 * Rand-Abschlag. Gilt fuer useRevealOnce und fuer die Reveal-Karten der
 * Ergebnisseite (<Reveal {...RESULT_VIEW}>), damit Karte und Werte-Entree
 * gemeinsam starten und auch Karten, die hoeher als der Viewport sind, sicher
 * einblenden (eine Flaechen-Schwelle wie 0.2 wird dort nie erreicht).
 */
export const RESULT_VIEW = { amount: 0, margin: "0px" } as const;

/** Bewegende Eigenschaften, die bei reduzierter Bewegung nie animiert werden. */
const MOTION_PROPS = ["transform", "translate", "rotate", "scale"] as const;
/** Keyframe-Schluessel ohne eigene Wirkung. */
const META_PROPS = new Set(["offset", "easing", "composite"]);

/**
 * Sicherheitsnetz der sanften Stufe: entfernt jede Transformation aus den
 * Schritten. Schritte, die danach nichts mehr animieren, entfallen (das
 * Element steht dann sofort im Endzustand).
 */
function softSteps(steps: RevealStep[]): RevealStep[] {
  const out: RevealStep[] = [];
  for (const s of steps) {
    const keyframes = s.keyframes.map((k) => {
      const c: Keyframe = { ...k };
      for (const p of MOTION_PROPS) delete (c as Record<string, unknown>)[p];
      return c;
    });
    if (keyframes.some((k) => Object.keys(k).some((p) => !META_PROPS.has(p)))) out.push({ ...s, keyframes });
  }
  return out;
}

/** Darf jetzt ueberhaupt eine Einblend-Animation vorbereitet werden? */
export function canRunReveal(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  if (typeof IntersectionObserver === "undefined") return false;
  if (typeof Element === "undefined" || typeof (Element.prototype as { animate?: unknown }).animate !== "function") return false;
  if (document.visibilityState === "hidden") return false;
  try {
    if (window.matchMedia?.("print").matches) return false;
  } catch {
    /* ignorieren */
  }
  return true;
}

/**
 * Einmaliges Entree beim ersten Sichtkontakt (amount). Die Schritte werden beim
 * Rendern als pausierte WAAPI-Animationen mit fill 'backwards' angelegt (das
 * verhindert ein Aufblitzen des Endzustands) und beim Sichtkontakt gestartet.
 * Danach und ohne Animation gilt allein das DOM, also der Endzustand.
 * rebuildKey: aendert er sich vor dem Start, werden die Schritte neu angelegt.
 * prime: optionaler Eingriff fuer Text (z. B. Startwert eines Zaehlers), liefert
 * die Wiederherstellung zurueck.
 * build erhaelt reduced: bei reduzierter Bewegung liefert er die sanfte Variante
 * (opacity, Zeichnen, clip-path statt Bewegung). Zusaetzlich werden dann alle
 * Transformationen entfernt (softSteps). Start, Zeitpunkt und Endzustand bleiben gleich.
 * Rueckgabe: true, sobald das Entree gestartet ist (ein setState, diskret).
 */
export function useRevealOnce(
  hostRef: RefObject<Element | null>,
  build: (host: Element, reduced: boolean) => RevealStep[],
  { amount = 0.4, rebuildKey = "", prime }: {
    amount?: number;
    rebuildKey?: string;
    prime?: (host: Element) => (() => void) | void;
  } = {},
): boolean {
  const reduced = useReducedMotionSafe();
  // Werte duerfen nie auf ihrem Startbild warten, waehrend sie schon im Bild sind:
  // Start beim ersten sichtbaren Pixel, ohne den Rand-Abschlag der Startseite.
  // amount bleibt als Option erhalten, wird hier aber bewusst nicht mehr genutzt.
  void amount;
  const inView = useInViewOnce(hostRef, RESULT_VIEW);
  const buildRef = useRef(build);
  buildRef.current = build;
  const primeRef = useRef(prime);
  primeRef.current = prime;
  const animsRef = useRef<Animation[]>([]);
  const restoreRef = useRef<(() => void) | null>(null);
  const playedRef = useRef(false);
  const [played, setPlayed] = useState(false);

  useLayoutEffect(() => {
    if (playedRef.current || !canRunReveal()) return;
    const host = hostRef.current;
    if (!host) return;
    const anims: Animation[] = [];
    const built = buildRef.current(host, reduced);
    for (const s of reduced ? softSteps(built) : built) {
      const a = safeAnimate(s.el, s.keyframes, {
        duration: s.duration,
        delay: s.delay ?? 0,
        easing: s.easing ?? CSS_EASE_OUT,
        fill: "backwards",
      });
      if (a) {
        a.pause();
        anims.push(a);
      }
    }
    if (!anims.length) return;
    animsRef.current = anims;
    restoreRef.current = primeRef.current?.(host) || null;
    return () => {
      if (playedRef.current) return;
      anims.forEach((a) => a.cancel());
      restoreRef.current?.();
      restoreRef.current = null;
      animsRef.current = [];
    };
  }, [reduced, rebuildKey, hostRef]);

  useEffect(() => {
    if (!inView || playedRef.current) return;
    // Der erste Sichtkontakt verbraucht das Entree, auch wenn keines vorbereitet
    // war (z. B. Mount im versteckten Tab, Druck): Ein spaeterer Neuaufbau
    // (rebuildKey, reduced) legt danach keine pausierten Schritte mehr an, die
    // dieser Effekt nie starten wuerde. Es bleibt beim Endzustand im DOM;
    // played bleibt false (kein Zaehler/Ping ohne Entree).
    playedRef.current = true;
    const anims = animsRef.current;
    if (!anims.length) return;
    if (document.visibilityState === "hidden") {
      anims.forEach((a) => a.cancel());
      restoreRef.current?.();
      restoreRef.current = null;
      animsRef.current = [];
      return;
    }
    anims.forEach((a) => a.play());
    setPlayed(true);
  }, [inView]);

  // Druck: sofort Endzustand, danach kein Entree mehr.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPrint = () => {
      animsRef.current.forEach((a) => {
        try {
          a.finish();
        } catch {
          a.cancel();
        }
      });
      animsRef.current = [];
      restoreRef.current?.();
      restoreRef.current = null;
      playedRef.current = true;
    };
    window.addEventListener("beforeprint", onPrint);
    return () => window.removeEventListener("beforeprint", onPrint);
  }, []);

  return played;
}

const all = (host: Element, sel: string) => Array.from(host.querySelectorAll(`[data-mx="${sel}"]`));

/** Sanfte Stufe: helle Deko-Kopie blendet auf und wieder aus (statt zu wachsen). */
const FLASH_FADE: Keyframe[] = [
  { opacity: 0, offset: 0, easing: CSS_EASE_IN_OUT },
  { opacity: 1, offset: 0.4, easing: "ease-out" },
  { opacity: 0, offset: 1 },
];

/** Zeichnen und wieder ausblenden (Hilfslinien, Mittelkreuz). */
const DRAW_THEN_FADE = (from: Keyframe, to: Keyframe): Keyframe[] => [
  { ...from, opacity: 1, offset: 0, easing: CSS_EASE_IN_OUT },
  { ...to, opacity: 1, offset: 0.625, easing: "ease-out" },
  { ...to, opacity: 0, offset: 1 },
];

function matrixSteps(host: Element, reduced: boolean): RevealStep[] {
  const T = MATRIX_T;
  // (0) Skala: Grundplatte, Raster, Lineale, Ecken, Achsen, Achsentitel,
  //     Fadenkreuz am eigenen Punkt (alles Deko, Zeiten aus MATRIX_T).
  const steps: RevealStep[] = [...instrumentSteps(host, reduced)];
  // (1) Mittelkreuz: helle Kopien wachsen aus der Mitte und blenden aus
  //     (sanfte Stufe: blenden nur auf und wieder aus).
  all(host, "cross-v").forEach((el) =>
    steps.push({ el, keyframes: reduced ? FLASH_FADE : DRAW_THEN_FADE({ transform: "scaleY(0)" }, { transform: "scaleY(1)" }), duration: 800, delay: T.cross, easing: "linear" }));
  all(host, "cross-h").forEach((el) =>
    steps.push({ el, keyframes: reduced ? FLASH_FADE : DRAW_THEN_FADE({ transform: "scaleX(0)" }, { transform: "scaleX(1)" }), duration: 800, delay: T.cross, easing: "linear" }));
  // (2) Betonte Flaeche und Beschriftungen
  all(host, "quad-fill").forEach((el) =>
    steps.push({ el, keyframes: [{ opacity: 0 }, { opacity: 1 }], duration: 400, delay: T.quadFill }));
  all(host, "quad-label").forEach((el, i) =>
    steps.push({ el, keyframes: [{ opacity: 0 }, { opacity: 1 }], duration: 400, delay: T.quadLabel + i * T.quadLabelStep }));
  // (3) Gruppe aus dem Median: zuerst dreht die Raute ein, dann waechst der
  //     Rahmen der mittleren Haelfte aus ihr, zuletzt der Buchstabe
  //     (sanfte Stufe: alles blendet nur ein).
  all(host, "diamond").forEach((el, i) =>
    steps.push({ el, keyframes: reduced ? [{ opacity: 0 }, { opacity: 1 }] : [{ transform: "rotate(45deg)", opacity: 0 }, { transform: "rotate(0deg)", opacity: 1 }], duration: 300, delay: T.diamond + i * T.groupStep }));
  all(host, "frame").forEach((el, i) =>
    steps.push({ el, keyframes: reduced ? [{ opacity: 0 }, { opacity: 1 }] : [{ transform: "scale(0.6)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], duration: 450, delay: T.frame + i * T.groupStep }));
  all(host, "tag").forEach((el, i) =>
    steps.push({ el, keyframes: [{ opacity: 0 }, { opacity: 1 }], duration: 300, delay: T.tag + i * T.groupStep }));
  // (4) Ortung: helle Kopie der Hilfslinien zeichnet sich von der Achse zum Punkt
  all(host, "guide").forEach((el) =>
    steps.push({ el, keyframes: DRAW_THEN_FADE({ strokeDashoffset: 1 }, { strokeDashoffset: 0 }), duration: T.guideDur, delay: T.guide, easing: "linear" }));
  // (5) Eigener Quadrant leuchtet einmal von der Punktposition aus auf (Ende unsichtbar)
  all(host, "glow").forEach((el) =>
    steps.push({ el, keyframes: [{ opacity: 0 }, { opacity: 0.22 }, { opacity: 0 }], duration: 1100, delay: T.glow, easing: CSS_EASE_IN_OUT }));
  return steps;
}

/** Mindestabstand zwischen zwei Pings am selben Punkt (ms). */
const PING_GAP = 6000;

/**
 * Entree der Matrizen (Souveraenitaet, Transparenz). Liefert den Zaehler fuer
 * den Deko-Ping am eigenen Punkt: MATRIX_T.ping nach dem Start (nach dem
 * Einrasten des Fadenkreuzes) und erneut nach einem Filterwechsel
 * (compareKey), hoechstens einmal je 6 s.
 */
export function useMatrixReveal(
  svgRef: RefObject<SVGSVGElement | null>,
  { compareKey, hasPoint }: { compareKey: string; hasPoint: boolean },
): number {
  const played = useRevealOnce(svgRef, matrixSteps, { amount: 0.4, rebuildKey: compareKey });
  const [ping, setPing] = useState(0);
  const lastPing = useRef(-Infinity);
  const prevKey = useRef(compareKey);

  useEffect(() => {
    if (!played || !hasPoint) return;
    const id = window.setTimeout(() => {
      lastPing.current = performance.now();
      setPing((n) => n + 1);
    }, MATRIX_T.ping);
    return () => window.clearTimeout(id);
  }, [played, hasPoint]);

  useEffect(() => {
    if (prevKey.current === compareKey) return;
    prevKey.current = compareKey;
    if (!played || !hasPoint) return;
    const now = performance.now();
    if (now - lastPing.current < PING_GAP) return;
    lastPing.current = now;
    setPing((n) => n + 1);
  }, [compareKey, played, hasPoint]);

  return ping;
}

/** Schluessel einer Vergleichsgruppe aus Tag und Werten (Crossfade bei Filterwechsel). */
export const quantKey = (q: Quant | null | undefined) => (q ? `${q.p25}:${q.p50}:${q.p75}` : "-");

/** Crossfade der Vergleichsgruppen bei Filterwechsel (200 ms, nur Deckkraft; auch bei Reduktion). */
export const GROUP_FADE = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2, ease: EASE_OUT },
} as const;

// Lange Quadranten-Beschriftungen auf hoechstens zwei moeglichst gleich lange
// Zeilen umbrechen, damit sie im Quadranten bleiben.
function wrap2(label: string, maxChars = 15): string[] {
  if (label.length <= maxChars) return [label];
  const words = label.split(" ");
  if (words.length < 2) return [label];
  let best = 1, bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ").length;
    const b = words.slice(i).join(" ").length;
    if (Math.abs(a - b) < bestDiff) { bestDiff = Math.abs(a - b); best = i; }
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

// Quadranten der Matrix in Worten und Farben, fuer die Ergebnisseite.
export const QUAD_VIEW: Record<QuadKey, { name: { en: string; de: string }; desc: { en: string; de: string }; color: string }> = {
  sovereign: { name: UI.quadSovereign, desc: UI.quadDesc.sovereign, color: "#6cc2b5" },
  exit:      { name: UI.quadExit,      desc: UI.quadDesc.exit,      color: "#6b9bd8" },
  settled:   { name: UI.quadSettled,   desc: UI.quadDesc.settled,   color: "#d9a559" },
  exposed:   { name: UI.quadExposed,   desc: UI.quadDesc.exposed,   color: "#cf87a5" },
};

// Farbskala: rot → gelb → grün, für 0..1
export function scoreColor(v: number): string {
  const hue = 4 + 128 * Math.max(0, Math.min(1, v)); // 4° rot bis 132° grün
  return `hsl(${hue}, 62%, 55%)`;
}

// ─── 1 · Souveränitäts-Matrix ────────────────────────────────────────────────
// Vergleichsgruppe in der Matrix: Raute = Median je Achse, Rahmen = mittlere Haelfte.
export type MatrixCompare = { ftc: Quant; cto: Quant; tag?: string };

/** Instrumenten-Teilung der Matrix (normiert 0..1, nur Deko ohne Zahlen). */
const MX_GRID = [0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9];
const MX_MAJOR = [0, 0.25, 0.5, 0.75, 1];
const MX_MINOR = Array.from({ length: 21 }, (_, i) => i / 20).filter((v) => !MX_MAJOR.includes(v));

export function SovereigntyMatrix({
  ftc, cto, cont, lang, compare = [], quadShares, emptyHint = true, ariaLabel,
}: {
  ftc: number | null; cto: number | null; cont: number | null; lang: Lang;
  compare?: MatrixCompare[];
  /** Anteile je Quadrant in Prozent (nur "Alle", ab 10 Teilnahmen); null = unter der Mindestzahl. */
  quadShares?: Record<QuadKey, number | null>;
  /** Ohne eigenen Punkt keinen Hinweis "nicht beantwortet" zeigen. */
  emptyHint?: boolean;
  /** Beschreibung fuer Screenreader. */
  ariaLabel?: string;
}) {
  const W = 420, H = 420, P = 46;           // Plotfläche
  const x = (v: number) => P + v * (W - 2 * P);
  const y = (v: number) => H - P - v * (H - 2 * P);
  const has = ftc !== null && cto !== null;

  const quads: { key: QuadKey; qx: number; qy: number; label: string; strong?: boolean }[] = [
    { key: "sovereign", qx: 0.75, qy: 0.75, label: pick(UI.quadSovereign, lang), strong: true },
    { key: "exit", qx: 0.75, qy: 0.25, label: pick(UI.quadExit, lang) },
    { key: "settled", qx: 0.25, qy: 0.75, label: pick(UI.quadSettled, lang) },
    { key: "exposed", qx: 0.25, qy: 0.25, label: pick(UI.quadExposed, lang) },
  ];

  const groupKey = (c: MatrixCompare) => `${c.tag ?? ""}|${quantKey(c.ftc)}|${quantKey(c.cto)}`;
  const compareKey = compare.map(groupKey).join("/");
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const uid = useSvgUid();
  const ping = useMatrixReveal(svgRef, { compareKey, hasPoint: has });
  // Nach dem Entree: neue Vergleichsgruppen wachsen Raute -> Rahmen -> Buchstabe.
  useGroupRegrow(svgRef, compareKey, matrixRegrowSteps);
  const ownQuad = has ? quads.find((q) => q.key === quadrantKey(ftc, cto)) : undefined;
  const pointColor = cont !== null ? scoreColor(cont) : "rgba(139,164,255,0.85)";

  // Radarstrahl (einzige Dauerschleife der Seite): startet erst nach dem Entree,
  // pausiert ueber den Wrapper (Pause-Knopf, offscreen, verstecktes Tab).
  usePauseOffscreen(wrapRef);
  const seen = useInViewOnce(wrapRef, RESULT_VIEW);
  const [sweepOn, setSweepOn] = useState(false);
  useEffect(() => {
    if (!seen || !canRunReveal()) return;
    const id = window.setTimeout(() => setSweepOn(true), MATRIX_T.sweepStart);
    return () => window.clearTimeout(id);
  }, [seen]);

  // Eigene Position: die Beschriftung zaehlt vom Achsenursprung, synchron zu den
  // Hilfslinien. Der Endtext steht immer im DOM (zeichengleich wie bisher).
  const px = has ? x(ftc!) : 0;
  const py = has ? y(cto!) : 0;
  const xs = has ? `${Math.round(ftc! * 100)}%` : "";
  const ys = has ? `${Math.round(cto! * 100)}%` : "";
  const xRef = useRef<SVGTSpanElement>(null);
  const yRef = useRef<SVGTSpanElement>(null);
  useValueCount(xRef, {
    hostRef: svgRef, from: 0, to: ftc ?? 0, format: (v) => `${Math.round(v * 100)}%`, final: xs,
    delayMs: MATRIX_T.count, durMs: MATRIX_T.countDur, ease: EASE_IN_OUT, enabled: has,
  });
  useValueCount(yRef, {
    hostRef: svgRef, from: 0, to: cto ?? 0, format: (v) => `${Math.round(v * 100)}%`, final: ys,
    delayMs: MATRIX_T.count, durMs: MATRIX_T.countDur, ease: EASE_IN_OUT, enabled: has,
  });
  // Winkel des Punkts um die Feldmitte, ab 12 Uhr im Uhrzeigersinn (Ortungsring).
  const theta = ((Math.atan2(px - x(0.5), -(py - y(0.5))) * 180) / Math.PI + 360) % 360;

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%", maxWidth: 460 }}>
      {/* Deko: Radarstrahl hinter dem Plotfeld (fx-contained, im Druck weg). Sein
          Kreis deckt die Diagonale des Feldes; das svg liegt darueber, alle
          Datenmarken bleiben oben. Der Ortungsring am eigenen Punkt ist ein
          HTML-Blip in derselben Ebene (opacity/transform auf HTML laufen auf dem
          Compositor, CSS-Schleifen auf SVG-Kindern nicht); der Kern liegt unter
          dem Punkt, sichtbar ist nur der Ring. */}
      <div aria-hidden="true" className="fx-deco"
        style={{
          position: "absolute", left: `${(P / W) * 100}%`, top: `${(P / H) * 100}%`,
          width: `${((W - 2 * P) / W) * 100}%`, height: `${((H - 2 * P) / H) * 100}%`,
          pointerEvents: "none", opacity: sweepOn ? 1 : 0,
          transition: "opacity 1200ms cubic-bezier(0.23,1,0.32,1)",
        }}>
        <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
          {sweepOn && (
            <RadarSweep color="rgba(139,164,255,0.55)" period={8} trail={70} intensity={0.12} style={{ inset: "-20.71%" }} />
          )}
        </div>
        {/* Gleiche Position wie der Punkt: x(ftc), y(cto) als Anteil der Plotflaeche. */}
        {sweepOn && has && (
          <Blip x={ftc! * 100} y={(1 - cto!) * 100} size={6} color={pointColor} period={8} delay={sweepDelay(theta, 8)} />
        )}
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" style={{ position: "relative" }}
        role={ariaLabel ? "img" : undefined} aria-label={ariaLabel}>
        <MatrixPlate W={W} H={H} P={P} />
        <defs>
          {/* Souveraener Quadrant: Licht aus der Ecke oben rechts (mittlere Deckkraft wie bisher) */}
          <radialGradient id={`${uid}sv`} gradientUnits="userSpaceOnUse" cx={x(1)} cy={y(1)} r={(W - 2 * P) * 0.62}>
            <stop offset="0" stopColor="rgba(108,194,181,0.14)" />
            <stop offset="0.6" stopColor="rgba(108,194,181,0.06)" />
            <stop offset="1" stopColor="rgba(108,194,181,0.025)" />
          </radialGradient>
          {ownQuad && (
            <radialGradient id={`${uid}og`} gradientUnits="userSpaceOnUse" cx={px} cy={py} r={170}>
              <stop offset="0" stopColor={QUAD_VIEW[ownQuad.key].color} stopOpacity={1} />
              <stop offset="1" stopColor={QUAD_VIEW[ownQuad.key].color} stopOpacity={0} />
            </radialGradient>
          )}
          {/* Lichthof unter dem eigenen Punkt (gleiche Farbe, gleiche Mitte) */}
          {has && (
            <radialGradient id={`${uid}pg`}>
              <stop offset="0" stopColor={pointColor} stopOpacity={0.42} />
              <stop offset="1" stopColor={pointColor} stopOpacity={0} />
            </radialGradient>
          )}
          {/* Rahmen der mittleren Haelfte: Glas mit Licht von oben */}
          <linearGradient id={`${uid}fr`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(255,255,255,0.075)" />
            <stop offset="1" stopColor="rgba(255,255,255,0.03)" />
          </linearGradient>
        </defs>
        {/* Quadrantenfüllung: nur der "souveräne" leicht betont */}
        <rect data-mx="quad-fill" x={x(0.5)} y={y(1)} width={(W - 2 * P) / 2} height={(H - 2 * P) / 2}
          fill={`url(#${uid}sv)`} />
        {/* Deko: eigener Quadrant leuchtet beim Entree einmal von der Punktposition aus auf (sonst unsichtbar) */}
        {ownQuad && (
          <rect data-mx="glow" aria-hidden="true" className="fx-deco" pointerEvents="none"
            x={x(ownQuad.qx - 0.25)} y={y(ownQuad.qy + 0.25)} width={(W - 2 * P) / 2} height={(H - 2 * P) / 2}
            fill={`url(#${uid}og)`} style={{ opacity: 0 }} />
        )}
        {/* Rahmen + Instrument (Achsen zeichnen sich, Raster, Lineale, Ecken) + Mittelkreuz */}
        <rect x={P} y={P} width={W - 2 * P} height={H - 2 * P} fill="none" stroke={AXIS} strokeWidth="1" />
        <MatrixAxesDraw W={W} H={H} P={P} />
        <MatrixInstrument W={W} H={H} P={P} xGrid={MX_GRID} yGrid={MX_GRID}
          xMajor={MX_MAJOR} yMajor={MX_MAJOR} xMinor={MX_MINOR} yMinor={MX_MINOR} />
        <line x1={x(0.5)} y1={P} x2={x(0.5)} y2={H - P} stroke={AXIS} strokeWidth="1" strokeDasharray="3 5" />
        <line x1={P} y1={y(0.5)} x2={W - P} y2={y(0.5)} stroke={AXIS} strokeWidth="1" strokeDasharray="3 5" />
        <MatrixCross x={x(0.5)} y={y(0.5)} top={P} bottom={H - P} left={P} right={W - P} />

        {quads.map((q, qi) => {
          const lines = wrap2(q.label);
          const dy0 = -((lines.length - 1) * 15) / 2; // Block vertikal zentrieren
          const share = quadShares ? quadShares[q.key] : null;
          return (
            <text key={q.label} data-mx="quad-label" x={x(q.qx)} y={y(q.qy) + dy0} textAnchor="middle"
              fontFamily="'Share Tech Mono', monospace" fontSize="12.5" letterSpacing="1"
              fill={q.strong ? "rgba(108,194,181,0.75)" : "rgba(214,230,245,0.32)"}
              style={{ textTransform: "uppercase" }}>
              {lines.map((ln, i) => (
                <tspan key={i} x={x(q.qx)} dy={i === 0 ? 0 : 15}>{ln}</tspan>
              ))}
              {quadShares && (share === null ? (
                <tspan x={x(q.qx)} dy={20} fontFamily="'Space Grotesk', sans-serif" fontSize="15"
                  letterSpacing="0" fill="rgba(255,255,255,0.75)">
                  {"–"}
                </tspan>
              ) : (
                <ShareTspan key={`${q.key}:${share}`} n={share} i={qi} x={x(q.qx)} />
              ))}
            </text>
          );
        })}

        {/* Vergleichsgruppen: Rahmen = mittlere Haelfte auf beiden Achsen, Raute = Median.
            Bei einem Filterwechsel Crossfade (key je Gruppe), nie Zwischenwerte;
            neue Gruppen wachsen aus ihrer Raute (useGroupRegrow). */}
        <AnimatePresence initial={false}>
          {compare.map((c, i) => {
            const cx = x(c.ftc.p50), cy = y(c.cto.p50), s = 7;
            return (
              <motion.g key={groupKey(c)} data-rfx-group={groupKey(c)} {...GROUP_FADE}>
                <rect
                  data-mx="frame"
                  x={x(c.ftc.p25)} y={y(c.cto.p75)}
                  width={Math.max(2, x(c.ftc.p75) - x(c.ftc.p25))} height={Math.max(2, y(c.cto.p25) - y(c.cto.p75))}
                  rx={3} fill={`url(#${uid}fr)`} stroke="rgba(255,255,255,0.55)" strokeWidth="1.2"
                  strokeDasharray={i === 1 ? "5 4" : undefined}
                  style={{ transformBox: "view-box", transformOrigin: `${cx}px ${cy}px` }}
                />
                <polygon
                  data-mx="diamond"
                  points={`${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`}
                  fill="#0a0d1a" stroke="#fff" strokeWidth="1.6"
                  style={{ transformBox: "fill-box", transformOrigin: "center" }}
                />
                {/* Erste Gruppe links, zweite rechts beschriften: liegen beide Rauten
                    aufeinander, bleiben so trotzdem beide Buchstaben lesbar. */}
                {c.tag && (
                  <text data-mx="tag" x={i === 0 ? cx - s - 5 : cx + s + 5} y={cy + 4} textAnchor={i === 0 ? "end" : "start"}
                    fontFamily="'Space Grotesk', sans-serif" fontSize="12"
                    fontWeight="600" fill="#fff" stroke="#070a15" strokeWidth="4" strokeLinejoin="round" paintOrder="stroke">
                    {c.tag}
                  </text>
                )}
              </motion.g>
            );
          })}
        </AnimatePresence>

        {/* Achsenbeschriftung */}
        <text data-mx="axis-label" x={W / 2} y={H - 12} textAnchor="middle" fontFamily="'Geist','Inter',sans-serif"
          fontSize="13" fill={LABEL}>
          Reconfiguration Discretion →
        </text>
        <text data-mx="axis-label" x={14} y={H / 2} textAnchor="middle" fontFamily="'Geist','Inter',sans-serif"
          fontSize="13" fill={LABEL} transform={`rotate(-90 14 ${H / 2})`}>
          Operational Control →
        </text>

        {has && (
          <>
            {/* Hilfslinien zur Position */}
            <line x1={px} y1={H - P} x2={px} y2={py} stroke={AXIS} strokeWidth="1" strokeDasharray="2 4" />
            <line x1={P} y1={py} x2={px} y2={py} stroke={AXIS} strokeWidth="1" strokeDasharray="2 4" />
            <GuideDraw fromX={px} fromY={H - P} toX={px} toY={py} />
            <GuideDraw fromX={P} fromY={py} toX={px} toY={py} />
            {/* Deko: Fadenkreuz rastet einmal ein und endet unsichtbar */}
            <MatrixReticle cx={px} cy={py} color={pointColor} />
            {/* Deko: weicher Lichthof unter dem Punkt (statisch, im Druck weg) */}
            <circle aria-hidden="true" className="fx-deco" pointerEvents="none" cx={px} cy={py} r={20} fill={`url(#${uid}pg)`} />
            {/* (Ortungsring beim Ueberstreichen: HTML-Blip in der Strahl-Ebene, s. o.) */}
            {/* Deko-Ping am Punkt (aria-hidden, im Druck weg; bei Reduktion hoechstens scale 1.15) */}
            <SvgPing cx={px} cy={py} r={7} color={pointColor} play={ping}
              count={2} gap={0.35} scale={4} duration={0.9} />
            {/* Bewusst statisch: der Datenpunkt darf nicht davon abhaengen, dass eine
                Animation laeuft (reduzierte Bewegung, gedrosselte Tabs, Druckansicht). */}
            <circle
              cx={px} cy={py} r={7}
              fill={pointColor}
              fillOpacity={0.9} stroke="#fff" strokeWidth="1.4"
            />
            {/* Dunkler Rand um die Zahl: der Punkt kann auf einer Quadranten-
                beschriftung landen, ohne Rand ueberlagern sich beide unleserlich. */}
            <text x={px} y={py - 15} textAnchor="middle"
              fontFamily="'Space Grotesk', sans-serif" fontSize="12.5" fontWeight="600" fill="#fff"
              stroke="#070a15" strokeWidth="4" strokeLinejoin="round" paintOrder="stroke"
              style={{ fontVariantNumeric: "tabular-nums" }}>
              <tspan ref={xRef} key={xs}>{xs}</tspan>{" / "}<tspan ref={yRef} key={ys}>{ys}</tspan>
            </text>
          </>
        )}
        {!has && emptyHint && (
          <text x={W / 2} y={H / 2} textAnchor="middle" fontFamily="'Geist','Inter',sans-serif"
            fontSize="13" fontStyle="italic" fill="rgba(214,230,245,0.4)">
            {pick(UI.notAnswered, lang)}
          </text>
        )}
      </svg>
    </div>
  );
}

/**
 * Anteil eines Quadranten (Zahl). Zaehlt beim ersten Sichtkontakt der Matrix
 * von 0 hoch; nach einem Filterwechsel (Remount, svg traegt data-rfx-seen)
 * nicht erneut. Endtext zeichengleich wie bisher (z. B. "23 %").
 * Host ueber closest("svg") statt ueber den Ref der Matrix: Im Layout-Effekt
 * dieses Kindes ist der Ref des Eltern-svg beim ersten Mount noch nicht gesetzt.
 */
function ShareTspan({ n, i, x }: { n: number; i: number; x: number }) {
  const ref = useRef<SVGTSpanElement>(null);
  const final = `${n} %`;
  useValueCount(ref, {
    hostClosest: "svg", from: 0, to: n, format: (v) => `${Math.round(v)} %`, final,
    delayMs: MATRIX_T.shares + i * 40, durMs: MATRIX_T.sharesDur,
  });
  return (
    <tspan ref={ref} key={final} x={x} dy={20} fontFamily="'Space Grotesk', sans-serif" fontSize="15"
      letterSpacing="0" fill="rgba(255,255,255,0.75)">
      {final}
    </tspan>
  );
}

/** Deko: helle Kopien des Mittelkreuzes, die beim Entree aus der Mitte wachsen (sonst unsichtbar). */
export function MatrixCross({ x, y, top, bottom, left, right }: {
  x: number; y: number; top: number; bottom: number; left: number; right: number;
}) {
  const style = { opacity: 0, transformBox: "fill-box", transformOrigin: "center" } as const;
  return (
    <g aria-hidden="true" className="fx-deco" pointerEvents="none">
      <line data-mx="cross-v" x1={x} y1={top} x2={x} y2={bottom} stroke={AXIS_BRIGHT} strokeWidth="1" style={style} />
      <line data-mx="cross-h" x1={left} y1={y} x2={right} y2={y} stroke={AXIS_BRIGHT} strokeWidth="1" style={style} />
    </g>
  );
}

/** Deko: helle, durchgezogene Hilfslinie, die sich beim Entree zeichnet (sonst unsichtbar). */
export function GuideDraw({ fromX, fromY, toX, toY }: { fromX: number; fromY: number; toX: number; toY: number }) {
  return (
    <path data-mx="guide" aria-hidden="true" className="fx-deco" pointerEvents="none"
      d={`M ${fromX} ${fromY} L ${toX} ${toY}`} pathLength={1} strokeDasharray="1 1" strokeDashoffset={0}
      fill="none" stroke={AXIS_BRIGHT} strokeWidth="1.2" strokeLinecap="round" style={{ opacity: 0 }} />
  );
}

// ─── 2 · Wirkkette ───────────────────────────────────────────────────────────
export function CausalChain({
  steps, lang,
}: {
  steps: { key: string; label: string; value: number | null; color: string }[];
  lang: Lang;
}) {
  const reduced = useReducedMotionSafe();
  const withValues = steps.filter((s) => s.value !== null);
  const min = withValues.length ? Math.min(...withValues.map((s) => s.value!)) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {steps.map((s, i) => {
        const has = s.value !== null;
        const weakest = has && min !== null && Math.abs(s.value! - min) < 1e-9;
        return (
          <div key={s.key}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "5px" }}>
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", color: "rgba(255,255,255,0.35)", minWidth: "18px" }}>
                {i + 1}
              </span>
              <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "14px", color: "rgba(255,255,255,0.85)", flex: 1 }}>
                {s.label}
              </span>
              {weakest && (
                <span style={{
                  fontFamily: "Inter, sans-serif", fontSize: "10.5px", padding: "2px 8px", borderRadius: "5px",
                  background: "rgba(217,165,89,0.18)", color: "#d9a559", whiteSpace: "nowrap",
                }}>
                  {pick(UI.chainWeakest, lang)}
                </span>
              )}
              <span style={{
                fontFamily: has ? "Space Grotesk, sans-serif" : "Inter, sans-serif",
                fontSize: has ? "15px" : "12px", fontWeight: 600,
                fontStyle: has ? "normal" : "italic",
                color: has ? s.color : "rgba(255,255,255,0.4)", minWidth: "46px", textAlign: "right",
              }}>
                {has ? `${Math.round(s.value! * 100)}%` : "—"}
              </span>
            </div>
            <div style={{ height: "9px", borderRadius: "5px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
              {has && (
                // Breite steht fest im DOM; animiert wird nur scaleX (Compositor statt Layout).
                // Sanfte Stufe: der Balken wird per clip-path von links aufgedeckt, ohne Bewegung.
                <motion.div
                  initial={reduced ? { clipPath: "inset(0 100% 0 0)" } : { scaleX: 0 }}
                  animate={reduced ? { clipPath: "inset(0 0% 0 0)" } : { scaleX: 1 }}
                  transition={{ duration: 0.8, delay: i * 0.08, ease: EASE_OUT }}
                  style={{
                    height: "100%", width: `${s.value! * 100}%`, transformOrigin: "left center",
                    borderRadius: "5px", background: s.color,
                    boxShadow: weakest ? "0 0 14px rgba(217,165,89,0.55)" : undefined,
                    outline: weakest ? "1px solid rgba(217,165,89,0.7)" : undefined,
                  }}
                />
              )}
            </div>
            {/* Verbindungspfeil zwischen den Stufen */}
            {i < steps.length - 1 && (
              <div style={{ textAlign: "center", color: "rgba(255,255,255,0.22)", fontSize: "12px", lineHeight: 1, marginTop: "3px" }}>↓</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
