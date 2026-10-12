// Imperative Einmal-Effekte der Ergebnisseite (Filterwechsel, Kopieren,
// Neuaufbau von Vergleichsgruppen). Alle Animationen laufen mit fill
// 'backwards' auf den Endzustand im DOM zu; ohne Animation gilt allein das DOM.
// Bewusst unabhaengig von ResultVisuals (kein Importzyklus).

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { CSS_EASE_OUT, safeAnimate, useInViewOnce, useReducedMotionSafe } from "../fx";

/** Ein Animationsschritt; strukturell identisch zu RevealStep (ResultVisuals). */
export type FxStep = {
  el: Element | null | undefined;
  keyframes: Keyframe[];
  /** Millisekunden */
  duration: number;
  /** Millisekunden */
  delay?: number;
  easing?: string;
};

/**
 * Darf jetzt eine Animation angelegt werden? Gleiche Logik wie canRunReveal
 * in ResultVisuals, hier bewusst dupliziert (kein Import von dort).
 */
export function canRunFx(): boolean {
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

/** Bewegende Eigenschaften, die bei reduzierter Bewegung nie animiert werden. */
const MOTION = ["transform", "translate", "rotate", "scale"];
/** Keyframe-Schluessel ohne eigene Wirkung. */
const META = new Set(["offset", "easing", "composite"]);

/**
 * Sicherheitsnetz der sanften Stufe: entfernt jede Transformation aus den
 * Keyframes und verwirft Schritte, die danach nichts mehr bewirken.
 */
export function stripMotion(steps: FxStep[]): FxStep[] {
  const out: FxStep[] = [];
  for (const s of steps) {
    const keyframes = s.keyframes.map((k) => {
      const c: Keyframe = { ...k };
      for (const p of MOTION) delete (c as Record<string, unknown>)[p];
      return c;
    });
    if (keyframes.some((k) => Object.keys(k).some((p) => !META.has(p)))) out.push({ ...s, keyframes });
  }
  return out;
}

/**
 * Spielt Schritte sofort ab (fill 'backwards'). Bei reduced werden alle
 * Transformationen entfernt. Gibt die angelegten Animationen zurueck; der
 * Aufrufer cancelt alte Animationen selbst.
 */
export function playSteps(steps: FxStep[], reduced: boolean): Animation[] {
  if (!canRunFx()) return [];
  const out: Animation[] = [];
  for (const s of reduced ? stripMotion(steps) : steps) {
    const a = safeAnimate(s.el, s.keyframes, {
      duration: s.duration,
      delay: s.delay ?? 0,
      easing: s.easing ?? CSS_EASE_OUT,
      fill: "backwards",
    });
    if (a) out.push(a);
  }
  return out;
}

/**
 * Neuaufbau von Vergleichsgruppen nach einem Filterwechsel: Elemente mit
 * data-rfx-group, deren Schluessel neu hinzugekommen ist, bekommen die
 * Schritte aus build. Ausscheidende Gruppen (AnimatePresence) tragen alte
 * Schluessel und werden ignoriert. Erst nach dem ersten Sichtkontakt aktiv;
 * das Entree selbst bleibt Sache von useRevealOnce.
 */
export function useGroupRegrow(
  svgRef: RefObject<Element | null>,
  compareKey: string,
  build: (group: Element, reduced: boolean) => FxStep[],
): void {
  const reduced = useReducedMotionSafe();
  const seen = useInViewOnce(svgRef, { amount: 0, margin: "0px" });
  const prevKeysRef = useRef<Set<string> | null>(null);
  const animsRef = useRef<Animation[]>([]);
  const buildRef = useRef(build);
  buildRef.current = build;
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;
  const seenRef = useRef(seen);
  seenRef.current = seen;

  useLayoutEffect(() => {
    const host = svgRef.current;
    const now = new Set(
      Array.from(host?.querySelectorAll("[data-rfx-group]") ?? []).map((e) => e.getAttribute("data-rfx-group") ?? ""),
    );
    const prev = prevKeysRef.current;
    prevKeysRef.current = now;
    if (!prev || !seenRef.current || !host) return;
    const fresh = Array.from(host.querySelectorAll("[data-rfx-group]")).filter((g) => {
      const k = g.getAttribute("data-rfx-group") ?? "";
      return now.has(k) && !prev.has(k);
    });
    animsRef.current.forEach((a) => a.cancel());
    const red = reducedRef.current;
    animsRef.current = fresh.flatMap((g) => playSteps(buildRef.current(g, red), red));
  }, [compareKey, svgRef]);

  useEffect(() => {
    const onPrint = () => {
      animsRef.current.forEach((a) => {
        try {
          a.finish();
        } catch {
          a.cancel();
        }
      });
    };
    if (typeof window !== "undefined") window.addEventListener("beforeprint", onPrint);
    return () => {
      if (typeof window !== "undefined") window.removeEventListener("beforeprint", onPrint);
      animsRef.current.forEach((a) => a.cancel());
      animsRef.current = [];
    };
  }, []);
}

/**
 * Gemeinsamer Bauplan fuer den Neuaufbau einer Vergleichsgruppe in beiden
 * Matrizen: Raute blendet ein, Rahmen waechst aus dem Median (nutzt die
 * vorhandenen Styles transformBox view-box / transformOrigin am Median),
 * danach die Beschriftung.
 */
export function matrixRegrowSteps(group: Element, reduced: boolean): FxStep[] {
  return [
    {
      el: group.querySelector('[data-mx="diamond"]'),
      keyframes: [{ opacity: 0 }, { opacity: 1 }],
      duration: 160,
      delay: 0,
    },
    {
      el: group.querySelector('[data-mx="frame"]'),
      keyframes: reduced
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [{ transform: "scale(0.6)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }],
      duration: 320,
      delay: 80,
      easing: CSS_EASE_OUT,
    },
    {
      el: group.querySelector('[data-mx="tag"]'),
      keyframes: [{ opacity: 0 }, { opacity: 1 }],
      duration: 160,
      delay: 240,
    },
  ];
}
