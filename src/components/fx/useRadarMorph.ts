import { useEffect, useRef, useState } from "react";
import { animate, motionValue, useMotionValue, type MotionValue, type Transition } from "framer-motion";
import { DUR, EASE_IN_OUT, SPRING } from "./motion";
import { useReducedMotionSafe } from "./hooks";

export interface Point {
  x: number;
  y: number;
}

export interface RadarMorph {
  /** ein MotionValue je Achse (0..1) */
  values: MotionValue<number>[];
  /** projizierte Ecken als MotionValues */
  vertices: { x: MotionValue<number>; y: MotionValue<number> }[];
  /** 'x,y x,y …' fuer <polygon points> */
  points: MotionValue<string>;
  /** 'M x y L … Z' fuer <path d> */
  d: MotionValue<string>;
  /**
   * Sanfte Stufe (reduzierte Bewegung): Statt zu federn springt die Form, und
   * fade laeuft in DUR.fade (0.3 s) von 0 auf 1. Wer crossfaden will, zeichnet
   * die alte Form (prevPoints/prevD/prevVertices) mit opacity 1 - fade und die
   * neue (points/d/vertices) mit opacity fade. Ohne Reduktion bleibt fade
   * immer 1 (alte Ebene unsichtbar). Wer das ignoriert, bekommt einen Sprung.
   */
  fade: MotionValue<number>;
  /** 1 - fade, fuer die alte Ebene */
  fadeOut: MotionValue<number>;
  /** Form vor dem letzten Wechsel (nur bei reduzierter Bewegung verschieden) */
  prevPoints: MotionValue<string>;
  prevD: MotionValue<string>;
  prevVertices: { x: MotionValue<number>; y: MotionValue<number> }[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Federnder Polygon-Morph fuer Radare. Die Achsenzahl wird beim ersten
 * Rendern festgelegt. Bei neuen Werten federt jede Achse mit Versatz
 * i * axisDelay auf ihr Ziel; Schnellklicks werden umgelenkt.
 * Reduzierte Bewegung: kein Morph, sondern Crossfade (siehe RadarMorph.fade).
 */
export function useRadarMorph(
  values: number[],
  project: (axis: number, v: number) => Point,
  { transition = SPRING.morph as Transition, axisDelay = 0.04 }: { transition?: Transition; axisDelay?: number } = {},
): RadarMorph {
  const reduced = useReducedMotionSafe();
  const projectRef = useRef(project);
  projectRef.current = project;

  const [morph] = useState<RadarMorph>(() => {
    const vals = values.map((v) => motionValue(v));
    const verts = values.map((v, i) => {
      const p = project(i, v);
      return { x: motionValue(p.x), y: motionValue(p.y) };
    });
    const pts = verts.map((v) => [v.x.get(), v.y.get()] as const);
    const ptsStr = pts.map(([x, y]) => `${r2(x)},${r2(y)}`).join(" ");
    const dStr = pts.map(([x, y], i) => `${i ? "L" : "M"}${r2(x)} ${r2(y)}`).join(" ") + " Z";
    const fade = motionValue(1);
    const fadeOut = motionValue(0);
    fade.on("change", (v) => fadeOut.set(1 - v));
    return {
      values: vals,
      vertices: verts,
      points: motionValue(ptsStr),
      d: motionValue(dStr),
      fade,
      fadeOut,
      prevPoints: motionValue(ptsStr),
      prevD: motionValue(dStr),
      prevVertices: verts.map((v) => ({ x: motionValue(v.x.get()), y: motionValue(v.y.get()) })),
    };
  });

  // Werte -> Ecken -> points/d
  useEffect(() => {
    const sync = () => {
      let pts = "";
      let d = "";
      morph.values.forEach((mv, i) => {
        const p = projectRef.current(i, mv.get());
        morph.vertices[i].x.set(p.x);
        morph.vertices[i].y.set(p.y);
        pts += `${i ? " " : ""}${r2(p.x)},${r2(p.y)}`;
        d += `${i ? " L" : "M"}${r2(p.x)} ${r2(p.y)}`;
      });
      morph.points.set(pts);
      morph.d.set(d + " Z");
    };
    const unsubs = morph.values.map((mv) => mv.on("change", sync));
    sync();
    return () => unsubs.forEach((u) => u());
  }, [morph]);

  // Laufende Federn nicht stoppen: animate() uebernimmt die aktuelle
  // Geschwindigkeit, Schnellklicks werden so umgelenkt statt abgebrochen.
  const key = values.join("|");
  useEffect(() => {
    if (reduced) {
      const changed = morph.values.some((mv, i) => mv.get() !== (values[i] ?? 0));
      if (!changed) return;
      // alte Form festhalten, dann springen und ueberblenden
      morph.prevPoints.set(morph.points.get());
      morph.prevD.set(morph.d.get());
      morph.vertices.forEach((v, i) => {
        morph.prevVertices[i].x.set(v.x.get());
        morph.prevVertices[i].y.set(v.y.get());
      });
      morph.values.forEach((mv, i) => {
        mv.stop();
        mv.set(values[i] ?? 0);
      });
      morph.fade.set(0);
      // kein Stopp im Cleanup: ein neuer Wechsel uebernimmt die Animation,
      // ein Abbruch (StrictMode) liesse fade sonst bei 0 haengen
      animate(morph.fade, 1, { duration: DUR.fade, ease: EASE_IN_OUT });
      return;
    }
    morph.fade.stop();
    morph.fade.set(1);
    morph.values.forEach((mv, i) => {
      const target = values[i] ?? 0;
      animate(mv, target, { ...transition, delay: i * axisDelay });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reduced]);

  useEffect(
    () => () => {
      morph.values.forEach((mv) => mv.stop());
      morph.fade.stop();
    },
    [morph],
  );

  return morph;
}

/**
 * Farbe als MotionValue, die weich auf neue Werte ueberblendet. Farbwechsel
 * sind auch bei reduzierter Bewegung erlaubt (sanfte Stufe).
 */
export function useAnimatedColor(color: string, { duration = 0.4 }: { duration?: number } = {}): MotionValue<string> {
  const mv = useMotionValue(color);
  useEffect(() => {
    const c = animate(mv, color, { duration, ease: EASE_IN_OUT });
    return () => c.stop();
  }, [color, duration, mv]);
  return mv;
}
