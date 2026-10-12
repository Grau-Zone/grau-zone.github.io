import { useEffect, useRef, type CSSProperties, type MutableRefObject } from "react";
import { cn } from "@/lib/utils";
import { CSS_EASE_OUT, pingScales, safeAnimate } from "./motion";
import { useReducedMotionSafe } from "./hooks";

interface PingTiming {
  /** Jede Aenderung loest erneut aus; falsy = nichts. */
  play: number | boolean;
  scale?: number;
  /** Startskala (Standard 1) */
  fromScale?: number;
  /** Startdeckkraft (Standard .7) */
  fromOpacity?: number;
  count?: number;
  /** Sekunden zwischen den Ringen */
  gap?: number;
  /** Sekunden */
  duration?: number;
}

function usePingRings(els: MutableRefObject<(Element | null)[]>, t: Required<PingTiming>, reduced: boolean) {
  const { play, scale, fromScale, fromOpacity, count, gap, duration } = t;
  useEffect(() => {
    if (!play) return;
    const [s0, s1] = pingScales(fromScale, scale, reduced);
    const anims: (Animation | null)[] = [];
    for (let k = 0; k < count; k++) {
      anims.push(
        safeAnimate(
          els.current[k],
          [
            { transform: `scale(${s0})`, opacity: fromOpacity },
            { transform: `scale(${s1})`, opacity: 0 },
          ],
          { duration: duration * 1000, delay: k * gap * 1000, easing: CSS_EASE_OUT, fill: "none" },
        ),
      );
    }
    return () => anims.forEach((a) => a?.cancel());
    // nur bei Aenderung von play ausloesen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play, reduced]);
}

export interface PingProps extends PingTiming {
  color: string;
  /** Durchmesser in px */
  size?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Ortungs-Ring (HTML, 1.5px). Standardmaessig im Elternelement zentriert
 * (absolute inset-0 m-auto); per className anders platzierbar.
 * Reduzierte Bewegung: Ring waechst hoechstens auf scale 1.15 und blendet aus.
 */
export function Ping({
  play,
  color,
  size = 12,
  scale = 3.2,
  fromScale = 1,
  fromOpacity = 0.7,
  count = 1,
  gap = 0.3,
  duration = 0.9,
  className,
  style,
}: PingProps) {
  const reduced = useReducedMotionSafe();
  const els = useRef<(HTMLSpanElement | null)[]>([]);
  usePingRings(els, { play, scale, fromScale, fromOpacity, count, gap, duration }, reduced);
  return (
    <>
      {Array.from({ length: count }, (_, k) => (
        <span
          key={k}
          ref={(n) => {
            els.current[k] = n;
          }}
          aria-hidden="true"
          className={cn("fx-deco pointer-events-none absolute inset-0 m-auto rounded-full", className)}
          style={{ width: size, height: size, border: `1.5px solid ${color}`, opacity: 0, ...style }}
        />
      ))}
    </>
  );
}

export interface SvgPingProps extends PingTiming {
  cx: number;
  cy: number;
  r: number;
  color: string;
  strokeWidth?: number;
}

/** SVG-Gegenstueck zu Ping (gleiches Verhalten bei reduzierter Bewegung). */
export function SvgPing({
  cx,
  cy,
  r,
  color,
  play,
  scale = 3.2,
  fromScale = 1,
  fromOpacity = 0.7,
  count = 1,
  gap = 0.3,
  duration = 0.9,
  strokeWidth = 1.5,
}: SvgPingProps) {
  const reduced = useReducedMotionSafe();
  const els = useRef<(SVGCircleElement | null)[]>([]);
  usePingRings(els, { play, scale, fromScale, fromOpacity, count, gap, duration }, reduced);
  return (
    <g aria-hidden="true" className="fx-deco" pointerEvents="none">
      {Array.from({ length: count }, (_, k) => (
        <circle
          key={k}
          ref={(n) => {
            els.current[k] = n;
          }}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
          style={{ opacity: 0, transformBox: "fill-box", transformOrigin: "center" }}
        />
      ))}
    </g>
  );
}
