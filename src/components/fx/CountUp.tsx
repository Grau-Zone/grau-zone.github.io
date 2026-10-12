import { useEffect, useLayoutEffect, useRef, type CSSProperties, type RefObject } from "react";
import { animate } from "framer-motion";
import { cn } from "@/lib/utils";
import { CSS_EASE_OUT, DUR, EASE_OUT, safeAnimate } from "./motion";
import { useInViewOnce, useReducedMotionSafe } from "./hooks";
import { SlotText } from "./SlotText";

export interface Countable {
  prefix: string;
  n: number;
  decimals: number;
  grouped: boolean;
  suffix: string;
}

const COUNTABLE_RE = /^([+~−-]?)(\d{1,3}(?:\.\d{3})+|\d+)(,\d+)?(.*)$/s;

/** Formatiert eine Zahl im Stil des Originalstrings (de-DE). */
export function formatCountable(c: Omit<Countable, "n">, n: number): string {
  return (
    c.prefix +
    n.toLocaleString("de-DE", {
      minimumFractionDigits: c.decimals,
      maximumFractionDigits: c.decimals,
      useGrouping: c.grouped,
    }) +
    c.suffix
  );
}

/**
 * Zerlegt einen Kennzahl-String ('8,5 Mio. €', '100.000 GPUs', '+9,3%') in
 * zaehlbare Teile. null, wenn das Suffix eine Ziffer enthaelt (Bereiche,
 * Daten) oder die Rueckformatierung nicht exakt den Originalstring ergibt.
 */
export function parseCountable(value: string): Countable | null {
  if (typeof value !== "string") return null;
  const m = COUNTABLE_RE.exec(value);
  if (!m) return null;
  const [, prefix, intPart, decPart, suffix] = m;
  if (/\d/.test(suffix)) return null;
  const grouped = intPart.includes(".");
  const decimals = decPart ? decPart.length - 1 : 0;
  const n = Number(intPart.replace(/\./g, "") + (decPart ? "." + decPart.slice(1) : ""));
  if (!Number.isFinite(n)) return null;
  const c: Countable = { prefix, n, decimals, grouped, suffix };
  try {
    if (formatCountable(c, n) !== value) return null;
  } catch {
    return null;
  }
  return c;
}

export interface UseCountUpOptions {
  from?: number;
  /** Sekunden */
  duration?: number;
  /** Sekunden */
  delay?: number;
  play: boolean;
  onDone?: () => void;
}

/**
 * Zaehlt ref.current.textContent von `from` auf `value` (endet zeichengleich
 * auf value). Bei nicht zaehlbarem Wert passiert nichts. Laeuft auch bei
 * reduzierter Bewegung (sanfte Stufe: Zaehlen ist erlaubt).
 */
export function useCountUp(
  ref: RefObject<HTMLElement | null>,
  value: string,
  { from = 0, duration = DUR.count, delay = 0, play, onDone }: UseCountUpOptions,
): void {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const playedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!play) return;
    const el = ref.current;
    if (!el) return;
    const c = parseCountable(value);
    if (!c) return;
    if (playedFor.current === value) return;
    playedFor.current = value;
    const factor = Math.pow(10, c.decimals);
    const fmt = (v: number) => formatCountable(c, Math.round(v * factor) / factor);
    el.textContent = fmt(from);
    let completed = false;
    const controls = animate(from, c.n, {
      duration,
      delay,
      ease: EASE_OUT,
      onUpdate: (v) => {
        el.textContent = fmt(v);
      },
      onComplete: () => {
        completed = true;
        el.textContent = value;
        onDoneRef.current?.();
      },
    });
    const onPrint = () => {
      controls.stop();
      el.textContent = value;
    };
    window.addEventListener("beforeprint", onPrint);
    return () => {
      if (!completed) playedFor.current = null;
      controls.stop();
      window.removeEventListener("beforeprint", onPrint);
      el.textContent = value;
    };
  }, [play, value, from, duration, delay, ref]);
}

export interface CountUpProps {
  value: string;
  /** Sekunden */
  duration?: number;
  /** Sekunden */
  delay?: number;
  from?: number;
  start?: "inView" | "mount" | boolean;
  settle?: boolean;
  /**
   * Zeigt vor dem Start den Startwert statt des Endwerts (verhindert ein
   * Aufblitzen des Endwerts). Greift nur, wenn die Zahl beim Mount ausserhalb
   * des Viewports liegt.
   */
  prime?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Zaehlende Kennzahl mit reservierter Breite. Der Endwert steht immer im DOM
 * (sr-only), die sichtbare Zahl ist aria-hidden. Zaehlt auch bei reduzierter
 * Bewegung; nur der Settle-Puls (scale) entfaellt dann.
 */
export function CountUp({
  value,
  duration = DUR.count,
  delay = 0,
  from = 0,
  start = "inView",
  settle = true,
  prime = true,
  className,
  style,
}: CountUpProps) {
  const reduced = useReducedMotionSafe();
  const hostRef = useRef<HTMLSpanElement | null>(null);
  const countRef = useRef<HTMLSpanElement | null>(null);
  const inView = useInViewOnce(hostRef, { amount: 0.6 });
  const play = start === "inView" ? inView : start === "mount" ? true : !!start;
  const startedRef = useRef(false);
  if (play) startedRef.current = true;

  // Vor dem Start den Startwert zeigen; beim Drucken immer den Endwert.
  // Nur, wenn die Zahl beim Rendern ausserhalb des Viewports liegt: Steht sie
  // schon im Bild, der Start-Trigger feuert aber (noch) nicht, bliebe sonst
  // sichtbar '0%' stehen. Dann bleibt der Endwert, bis das Zaehlen beginnt.
  useLayoutEffect(() => {
    const el = countRef.current;
    if (!el || !prime || startedRef.current) return;
    if (typeof IntersectionObserver === "undefined" && start === "inView") return;
    const c = parseCountable(value);
    if (!c) return;
    if (window.matchMedia?.("print").matches) return;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    if (rect.bottom > 0 && rect.top < vh) return;
    el.textContent = formatCountable(c, from);
    const onPrint = () => {
      el.textContent = value;
    };
    window.addEventListener("beforeprint", onPrint);
    return () => window.removeEventListener("beforeprint", onPrint);
    // nur beim ersten Rendern bzw. bei neuem Wert
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useCountUp(countRef, value, {
    from,
    duration,
    delay,
    play,
    // Settle-Puls ist eine Skalierung: bei reduzierter Bewegung aus
    onDone: settle && !reduced
      ? () => {
          safeAnimate(countRef.current, [{ transform: "scale(1.04)" }, { transform: "scale(1)" }], {
            duration: 200,
            easing: CSS_EASE_OUT,
          });
        }
      : undefined,
  });

  return (
    <span ref={hostRef} className={cn("relative inline-grid", className)} style={style}>
      <span className="sr-only">{value}</span>
      <span aria-hidden="true" className="tabular-nums" style={{ gridArea: "1 / 1", visibility: "hidden" }}>
        {value}
      </span>
      <span ref={countRef} aria-hidden="true" className="tabular-nums" style={{ gridArea: "1 / 1" }}>
        {value}
      </span>
    </span>
  );
}

export interface AnimatedValueProps {
  value: string;
  play?: boolean;
  /** Sekunden */
  delay?: number;
  className?: string;
  style?: CSSProperties;
}

/** Zaehlbar -> CountUp, sonst SlotText. */
export function AnimatedValue({ value, play, delay = 0, className, style }: AnimatedValueProps) {
  if (parseCountable(value)) {
    return (
      <CountUp value={value} start={play === undefined ? "inView" : play} delay={delay} className={className} style={style} />
    );
  }
  return <SlotText value={value} trigger="inView" play={play} delay={delay} className={className} style={style} />;
}
