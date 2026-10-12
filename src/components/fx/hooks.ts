import { useEffect, useRef, useState, type MutableRefObject, type RefObject } from "react";
import { useInView } from "framer-motion";
import { VIEWPORT_ONCE } from "./motion";
import { usePausedAll } from "./pause";

type InViewMargin = NonNullable<Parameters<typeof useInView>[1]>["margin"];

/**
 * prefers-reduced-motion als boolean. Reagiert live auf das Umschalten im
 * Betriebssystem (framers useReducedMotion liest den Wert nur beim Mount).
 * Der erste Render ist korrekt, weil useMediaQuery synchron initialisiert.
 *
 * true bedeutet die SANFTE STUFE, nicht "alles aus": erlaubt bleiben
 * opacity-Uebergaenge (normale Dauern aus motion.ts), Farbe, Linien zeichnen
 * (pathLength/stroke-dashoffset), clip-path-Wipes, Zaehlen/Decode, Pings bis
 * scale 1.15 und Opacity-Schleifen mit Periode >= 2 s (Klasse fx-loop fx-soft).
 * Aus sind translate/rotate/scale als Bewegung, 3D, Parallaxe,
 * Scroll-Transformationen, Federn/Morphs, drehende Sweeps, Partikel-Drift,
 * Pfad-Wanderer und alle zeigergekoppelten Effekte.
 */
export function useReducedMotionSafe(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

function matches(query: string): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  try {
    return window.matchMedia(query).matches;
  } catch {
    return false;
  }
}

/** Reagiert live auf Media-Query-Aenderungen. */
export function useMediaQuery(query: string): boolean {
  const [value, setValue] = useState(() => matches(query));
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(query);
    const onChange = () => setValue(mql.matches);
    onChange();
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }
    mql.addListener?.(onChange);
    return () => mql.removeListener?.(onChange);
  }, [query]);
  return value;
}

/** Maus/Trackpad: nur hier laufen Tilt, Magnet, Spotlight und Hover-Effekte. */
export function useFinePointer(): boolean {
  return useMediaQuery("(hover: hover) and (pointer: fine)");
}

export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}

export type MotionTier = "off" | "lite" | "full";

function isLowEndDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  if (typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 4) return true;
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4) return true;
  if (nav.connection?.saveData) return true;
  return false;
}

/**
 * off  = reduzierte Bewegung (sanfte Stufe, siehe useReducedMotionSafe; der
 *        Name bleibt aus Kompatibilitaet)
 * lite = Touch, <= 4 Kerne, <= 4 GB oder Datensparmodus
 * full = alles andere
 */
export function useMotionTier(): MotionTier {
  const reduced = useReducedMotionSafe();
  const coarse = useMediaQuery("(pointer: coarse)");
  const [lowEnd] = useState(isLowEndDevice);
  if (reduced) return "off";
  if (coarse || lowEnd) return "lite";
  return "full";
}

/** Einmaliges inView mit dem Standard-Rand der Seite. */
export function useInViewOnce(
  ref: RefObject<Element | null>,
  { amount = 0.35, margin = VIEWPORT_ONCE.margin as InViewMargin }: { amount?: number; margin?: InViewMargin | string } = {},
): boolean {
  return useInView(ref, { once: true, amount, margin: margin as InViewMargin });
}

function setSmil(el: Element, active: boolean) {
  const svgs: SVGSVGElement[] = [];
  if (typeof SVGSVGElement !== "undefined" && el instanceof SVGSVGElement) svgs.push(el);
  el.querySelectorAll?.("svg[data-smil]").forEach((s) => svgs.push(s as SVGSVGElement));
  for (const s of svgs) {
    try {
      if (active) s.unpauseAnimations?.();
      else s.pauseAnimations?.();
    } catch {
      /* ignorieren */
    }
  }
}

/**
 * Pausiert alle .fx-loop-Animationen unterhalb von ref, solange das Element
 * nicht (nahe) im Viewport ist, der Tab versteckt ist oder der globale
 * Pause-Knopf (usePausedAll) gedrueckt ist. Schreibt data-paused direkt ins
 * DOM, ohne React-State, pausiert SMIL in svg[data-smil] und meldet jeden
 * Wechsel ueber onChange(active). Bis zum ersten Observer-Callback gilt
 * paused. Das zurueckgegebene ref ist true, solange Schleifen laufen duerfen
 * (fuer rAF-Schleifen: bei false per cancelAnimationFrame beenden).
 */
export function usePauseOffscreen(
  ref: RefObject<Element | null>,
  { rootMargin = "150px", onChange }: { rootMargin?: string; onChange?: (active: boolean) => void } = {},
): MutableRefObject<boolean> {
  const activeRef = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const pausedAll = usePausedAll();
  const pausedAllRef = useRef(pausedAll);
  pausedAllRef.current = pausedAll;
  const applyRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const el = ref.current as (HTMLElement | SVGElement) | null;
    if (!el) return;
    let visible = false;
    let last: boolean | null = null;

    const apply = () => {
      const hidden = typeof document !== "undefined" && document.visibilityState === "hidden";
      const active = visible && !hidden && !pausedAllRef.current;
      if (active === last) return;
      last = active;
      activeRef.current = active;
      if (el.dataset) el.dataset.paused = active ? "false" : "true";
      setSmil(el, active);
      onChangeRef.current?.(active);
    };
    applyRef.current = apply;

    if (typeof IntersectionObserver === "undefined") {
      visible = true;
      apply();
      return () => {
        applyRef.current = null;
      };
    }

    // bis zum ersten Callback: pausiert
    if (el.dataset) el.dataset.paused = "true";
    activeRef.current = false;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible = e.isIntersecting;
        apply();
      },
      { rootMargin },
    );
    io.observe(el);
    document.addEventListener("visibilitychange", apply);
    return () => {
      applyRef.current = null;
      io.disconnect();
      document.removeEventListener("visibilitychange", apply);
    };
  }, [ref, rootMargin]);

  // Pause-Knopf: sofort neu bewerten
  useEffect(() => {
    applyRef.current?.();
  }, [pausedAll]);

  return activeRef;
}

/** Setzt document.documentElement.dataset[name], solange die Komponente lebt. */
export function useHtmlFlag(name: string, value: string): void {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const ds = document.documentElement.dataset;
    ds[name] = value;
    return () => {
      if (ds[name] === value) delete ds[name];
    };
  }, [name, value]);
}

/** Vor dem Drucken laufen alle WAAPI/CSS-Animationen auf ihren Endzustand. */
export function usePrintFinish(): void {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const finish = () => {
      try {
        const anims = typeof document.getAnimations === "function" ? document.getAnimations() : [];
        anims.forEach((a) => {
          try {
            a.finish();
          } catch {
            // Endlosschleifen lassen sich nicht beenden; im Druck schaltet CSS sie ab.
          }
        });
      } catch {
        /* ignorieren */
      }
    };
    window.addEventListener("beforeprint", finish);
    return () => window.removeEventListener("beforeprint", finish);
  }, []);
}
