import type { CSSProperties } from "react";
import { motion, type MotionValue } from "framer-motion";
import { cn } from "@/lib/utils";

const mix = (pct: number) => `color-mix(in srgb, var(--fx-sweep-color) ${Math.round(pct * 1000) / 10}%, transparent)`;

export interface RadarSweepProps {
  color: string;
  /** Sekunden pro Umdrehung */
  period?: number;
  /** Laenge des Nachleuchtens in Grad */
  trail?: number;
  intensity?: number;
  line?: boolean;
  /** nach jeder vollen Umdrehung */
  onIteration?: () => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * Rotierender Radar-Keil (CSS, Compositor). Start mit der Vorderkante auf
 * 12 Uhr, Drehung im Uhrzeigersinn. Endlosschleife mit fx-loop, pausiert
 * ueber [data-paused=true] eines Vorfahren und ueber den Pause-Knopf
 * (html[data-fx-paused=true]). Farbwechsel gleiten ueber die registrierte
 * Property --fx-sweep-color.
 *
 * Reduzierte Bewegung (sanfte Stufe): Der Strahl dreht weiter (fx-contained,
 * kleine auf die Grafik begrenzte Bewegung, Entscheid Adrian 12.10.2026).
 * onIteration feuert immer; wer davon abhaengige Zyklen bei reduce nicht will
 * (z. B. Hero-Pfadwechsel), haelt sie selbst an.
 */
export function RadarSweep({
  color,
  period = 6,
  trail = 60,
  intensity = 0.22,
  line = true,
  onIteration,
  className,
  style,
}: RadarSweepProps) {
  const t = Math.max(2, trail);
  const background = `conic-gradient(from -${t}deg, transparent 0deg, ${mix(intensity)} ${t - 10}deg, ${mix(0.9)} ${t - 1}deg, transparent ${t}deg)`;

  return (
    <div
      aria-hidden="true"
      className={cn("fx-deco fx-sweep-host pointer-events-none absolute inset-0 overflow-hidden rounded-full", className)}
      style={{ ["--fx-sweep-color" as string]: color, ...style }}
    >
      <div
        // fx-contained: kleine, auf die Grafik begrenzte Drehung. Laeuft auch in der
        // sanften Stufe (Entscheid Adrian 12.10.2026); Pause-Knopf und offscreen halten sie an.
        className="fx-loop fx-contained absolute inset-0"
        style={{
          background,
          animation: `fx-sweep ${period}s linear infinite`,
          willChange: "transform",
        }}
        onAnimationIteration={onIteration ? () => onIteration() : undefined}
      >
        {line ? (
          <div
            className="absolute bottom-1/2 left-1/2 h-1/2"
            style={{
              width: 1.5,
              marginLeft: -0.75,
              background: `linear-gradient(to top, ${mix(0.15)}, var(--fx-sweep-color))`,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

export interface BlipProps {
  /** Prozent der Breite */
  x: number;
  /** Prozent der Hoehe */
  y: number;
  color: string;
  size?: number;
  /** Sekunden, siehe sweepDelay() */
  delay?: number;
  /** Sekunden, gleiche Periode wie der Sweep */
  period?: number;
  className?: string;
}

/**
 * HTML-Punkt mit Ring, blitzt einmal pro Periode auf.
 * Reduzierte Bewegung: unveraendert (fx-contained, siehe RadarSweep).
 */
export function Blip({ x, y, color, size = 6, delay = 0, period = 6, className }: BlipProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("fx-deco pointer-events-none absolute", className)}
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 }}
    >
      <span
        className="fx-loop fx-contained absolute inset-0 rounded-full"
        style={{
          background: color,
          opacity: 0.45,
          animation: `fx-blip-dot ${period}s linear ${delay}s infinite`,
        }}
      />
      <span
        className="fx-loop fx-contained absolute inset-0 rounded-full"
        style={{
          border: `1px solid ${color}`,
          opacity: 0,
          animation: `fx-blip-ring ${period}s ease-out ${delay}s infinite`,
        }}
      />
    </span>
  );
}

export interface SvgBlipProps {
  cx: number | MotionValue<number>;
  cy: number | MotionValue<number>;
  r?: number;
  color: string;
  /** Sekunden, siehe sweepDelay() */
  delay?: number;
  /** Sekunden */
  period?: number;
}

/** SVG-Gegenstueck zu Blip (zwei motion.circle, transform-box fill-box; laeuft auch bei reduce wie Blip). */
export function SvgBlip({ cx, cy, r = 3, color, delay = 0, period = 6 }: SvgBlipProps) {
  const box: CSSProperties = { transformBox: "fill-box", transformOrigin: "center" };
  return (
    <g aria-hidden="true" className="fx-deco" pointerEvents="none">
      <motion.circle
        className="fx-loop fx-contained"
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={1}
        style={{ ...box, opacity: 0, animation: `fx-blip-ring ${period}s ease-out ${delay}s infinite` }}
      />
      <motion.circle
        className="fx-loop fx-contained"
        cx={cx}
        cy={cy}
        r={r}
        fill={color}
        style={{
          ...box,
          opacity: 0.45,
          animation: `fx-blip-dot ${period}s linear ${delay}s infinite`,
        }}
      />
    </g>
  );
}
