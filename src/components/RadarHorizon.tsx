// Radar-Horizont: ein halber Radar als Schlussklammer hinter "Über das Projekt".
//
// Rein dekorativ (aria-hidden, fx-deco, pointer-events:none). Die Boegen und
// Achsen zeichnen sich scroll-gekoppelt (pathLength ueber MotionValues, kein
// React-State pro Frame). Der Sweep-Keil ist ein HTML-Div mit conic-gradient,
// auf den Halbkreis geclippt, und laeuft als CSS-Schleife (fx-loop), die per
// usePauseOffscreen ausserhalb des Viewports, bei verstecktem Tab und bei
// gedruecktem Pause-Knopf (usePausedAll, html[data-fx-paused]) steht.
// Handy: breiter, blasser, ohne Sweep.
// Reduzierte Bewegung (sanfte Stufe): keine Scroll-Kopplung. Die Linien
// zeichnen sich einmal zeitgesteuert, sobald der Horizont ins Bild kommt.
// Der Keil schwenkt weiter (fx-contained: begrenzte Radar-Bewegung, Entscheid
// Adrian 12.10.2026); Pause-Knopf und offscreen halten ihn an.
import { useRef, type RefObject } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  DUR,
  EASE_IN_OUT,
  useInViewOnce,
  useIsMobile,
  usePauseOffscreen,
  useReducedMotionSafe,
} from "@/components/fx";

const STROKE = "rgba(139,164,255,0.5)";

// viewBox 2200 x 1100, Mittelpunkt knapp ueber der Unterkante, damit die
// waagrechten Achsen nicht zur Haelfte abgeschnitten werden.
const VB_W = 2200;
const VB_H = 1100;
const CX = VB_W / 2;
const CY = VB_H - 2;
const R_MAX = 1080;

const ARC_RADII = [1, 2, 3, 4, 5].map((k) => (R_MAX / 5) * k);
// sieben Radialachsen: 0°, 30°, ... 180° (0° = rechts, gegen den Uhrzeigersinn nach oben)
const AXIS_ANGLES = [0, 30, 60, 90, 120, 150, 180];

const arcPath = (r: number) => `M ${CX - r} ${CY} A ${r} ${r} 0 0 1 ${CX + r} ${CY}`;
const axisPath = (deg: number) => {
  const a = (deg * Math.PI) / 180;
  const x = CX + Math.cos(a) * R_MAX;
  const y = CY - Math.sin(a) * R_MAX;
  return `M ${CX} ${CY} L ${x.toFixed(1)} ${y.toFixed(1)}`;
};

const ARCS = ARC_RADII.map(arcPath);
const AXES = AXIS_ANGLES.map(axisPath);

// Die Achsen folgen nach den Boegen (Bogen 4 endet bei p = 0.9).
const arcRange = (i: number): [number, number] => [0.1 * i, 0.5 + 0.1 * i];
const axisRange = (i: number): [number, number] => [0.55 + 0.03 * i, 0.8 + 0.03 * i];

// Sanfte Stufe: zeitgesteuertes Zeichnen in derselben Reihenfolge (Boegen von
// innen nach aussen, dann die Achsen), zusammen unter 2.5 s.
const arcDelay = (i: number) => 0.12 * i;
const axisDelay = (i: number) => 0.7 + 0.06 * i;

function DrawPath({
  d,
  progress,
  range,
  strokeWidth,
}: {
  d: string;
  progress: MotionValue<number>;
  range: [number, number];
  strokeWidth: number;
}) {
  const pathLength = useTransform(progress, range, [0, 1], { clamp: true });
  return (
    <motion.path
      d={d}
      fill="none"
      stroke={STROKE}
      strokeWidth={strokeWidth}
      strokeLinecap="butt"
      style={{ pathLength }}
    />
  );
}

/** Sanfte Stufe: einmaliges Zeichnen per pathLength, ohne Scroll-Kopplung. */
function DrawOnce({
  d,
  play,
  delay,
  strokeWidth,
}: {
  d: string;
  play: boolean;
  delay: number;
  strokeWidth: number;
}) {
  return (
    <motion.path
      d={d}
      fill="none"
      stroke={STROKE}
      strokeWidth={strokeWidth}
      strokeLinecap="butt"
      initial={{ pathLength: 0 }}
      animate={play ? { pathLength: 1 } : undefined}
      transition={{ duration: DUR.draw * 1.4, delay, ease: EASE_IN_OUT }}
    />
  );
}

export interface RadarHorizonProps {
  /** Die Section, deren Scrollfortschritt das Zeichnen steuert. */
  targetRef: RefObject<HTMLElement | null>;
  className?: string;
}

const RadarHorizon = ({ targetRef, className }: RadarHorizonProps) => {
  const reduced = useReducedMotionSafe();
  const mobile = useIsMobile();
  const rootRef = useRef<HTMLDivElement | null>(null);
  usePauseOffscreen(rootRef);
  const inView = useInViewOnce(rootRef, { amount: 0.05 });

  const { scrollYProgress } = useScroll({
    target: targetRef as RefObject<HTMLElement>,
    offset: ["start end", "end end"],
  });

  // ~1 px auf dem Bildschirm: Desktop ca. 2000 px / 2200 Einheiten, Handy ca. 700 px.
  const strokeWidth = mobile ? 3 : 1.2;
  const sweep = !mobile;

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className={cn(
        "fx-deco pointer-events-none absolute inset-0 overflow-hidden select-none",
        "opacity-[0.12] md:opacity-[0.16]",
        className,
      )}
    >
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 aspect-[2/1] w-[180vw] md:w-[min(140vw,2200px)]">
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="xMidYMax meet"
          fill="none"
        >
          {reduced ? (
            <>
              {ARCS.map((d, i) => (
                <DrawOnce key={d} d={d} play={inView} delay={arcDelay(i)} strokeWidth={strokeWidth} />
              ))}
              {AXES.map((d, i) => (
                <DrawOnce key={d} d={d} play={inView} delay={axisDelay(i)} strokeWidth={strokeWidth} />
              ))}
            </>
          ) : (
            <>
              {ARCS.map((d, i) => (
                <DrawPath key={d} d={d} progress={scrollYProgress} range={arcRange(i)} strokeWidth={strokeWidth} />
              ))}
              {AXES.map((d, i) => (
                <DrawPath key={d} d={d} progress={scrollYProgress} range={axisRange(i)} strokeWidth={strokeWidth} />
              ))}
            </>
          )}
        </svg>

        {sweep ? (
          // Halbkreis-Clip: horizontaler Radius 50 % der Breite, vertikaler 100 % der Hoehe.
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ borderRadius: "50% 50% 0 0 / 100% 100% 0 0" }}
          >
            {/* Keil schwenkt hin und her, auch in der sanften Stufe (fx-contained:
                begrenzte Radar-Bewegung, Entscheid Adrian 12.10.2026). */}
            <div
              className="fx-loop fx-contained absolute left-0 top-0 w-full"
              style={{
                height: "200%",
                background:
                  "conic-gradient(from 0deg, rgba(139,164,255,0.55) 0deg, rgba(139,164,255,0) 26deg, rgba(139,164,255,0) 334deg, rgba(139,164,255,0.55) 360deg)",
                transform: "rotate(-90deg)",
                animation: "fx-horizon-sweep 14s ease-in-out infinite alternate",
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default RadarHorizon;
