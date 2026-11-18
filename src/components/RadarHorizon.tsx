// Radar-Horizont: ein halber Radar als Schlussklammer hinter "Über das Projekt".
//
// Rein dekorativ (aria-hidden, fx-deco, pointer-events:none). Fuenf Boegen, sieben Achsen und
// eine Randskala mit Teilstrichen zeichnen sich scroll-gekoppelt (pathLength ueber
// MotionValues, kein React-State pro Frame); vier Echos blitzen in langsamer Folge.
// Der Sweep-Keil ist ein HTML-Div mit conic-gradient, auf den Halbkreis geclippt, und laeuft
// als CSS-Schleife (fx-loop), die per usePauseOffscreen ausserhalb des Viewports, bei
// verstecktem Tab und bei gedruecktem Pause-Knopf (usePausedAll, html[data-fx-paused]) steht.
// Linienfarbe: Mint auf dunklem Grund (Standard), HSG-Gruen auf weissem Grund (tone="green").
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
  SvgBlip,
  useInViewOnce,
  useIsMobile,
  usePauseOffscreen,
  useReducedMotionSafe,
} from "@/components/fx";

const TONES = {
  mint: { stroke: "rgba(111,214,154,0.62)", wedge: "111,214,154", blip: "#6fd69a" },
  green: { stroke: "rgba(0,128,47,0.6)", wedge: "0,128,47", blip: "#00802f" },
} as const;

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

/** Randskala ausserhalb des aeusseren Bogens: alle 3° ein Teilstrich, alle 15° ein langer. */
const TICKS = (() => {
  let d = "";
  for (let deg = 0; deg <= 180; deg += 3) {
    const a = (deg * Math.PI) / 180;
    const long = deg % 15 === 0;
    const r0 = R_MAX + 14;
    const r1 = R_MAX + (long ? 52 : 32);
    d += `M ${(CX + Math.cos(a) * r0).toFixed(1)} ${(CY - Math.sin(a) * r0).toFixed(1)} L ${(CX + Math.cos(a) * r1).toFixed(1)} ${(CY - Math.sin(a) * r1).toFixed(1)} `;
  }
  return d;
})();

/** Echos: Radius als Anteil von R_MAX, Winkel wie die Achsen, Verzoegerung in Sekunden. */
const BLIPS = [
  { r: 0.58, deg: 48, delay: 1 },
  { r: 0.82, deg: 112, delay: 4.5 },
  { r: 0.38, deg: 146, delay: 8 },
  { r: 0.92, deg: 23, delay: 11 },
].map((b) => {
  const a = (b.deg * Math.PI) / 180;
  return { cx: CX + Math.cos(a) * R_MAX * b.r, cy: CY - Math.sin(a) * R_MAX * b.r, delay: b.delay };
});
const BLIP_PERIOD = 14;

// Die Achsen folgen nach den Boegen (Bogen 4 endet bei p = 0.9), die Skala zuletzt.
const arcRange = (i: number): [number, number] => [0.1 * i, 0.5 + 0.1 * i];
const axisRange = (i: number): [number, number] => [0.55 + 0.03 * i, 0.8 + 0.03 * i];
const TICK_RANGE: [number, number] = [0.6, 1];

// Sanfte Stufe: zeitgesteuertes Zeichnen in derselben Reihenfolge (Boegen von
// innen nach aussen, dann die Achsen, dann die Skala), zusammen unter 2.5 s.
const arcDelay = (i: number) => 0.12 * i;
const axisDelay = (i: number) => 0.7 + 0.06 * i;
const TICK_DELAY = 1.1;

function DrawPath({
  d,
  progress,
  range,
  strokeWidth,
  stroke,
}: {
  d: string;
  progress: MotionValue<number>;
  range: [number, number];
  strokeWidth: number;
  stroke: string;
}) {
  const pathLength = useTransform(progress, range, [0, 1], { clamp: true });
  return (
    <motion.path
      d={d}
      fill="none"
      stroke={stroke}
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
  stroke,
}: {
  d: string;
  play: boolean;
  delay: number;
  strokeWidth: number;
  stroke: string;
}) {
  return (
    <motion.path
      d={d}
      fill="none"
      stroke={stroke}
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
  /** mint (Standard) auf dunklem Grund, green auf weissem Grund */
  tone?: keyof typeof TONES;
}

const RadarHorizon = ({ targetRef, className, tone = "mint" }: RadarHorizonProps) => {
  const reduced = useReducedMotionSafe();
  const mobile = useIsMobile();
  const rootRef = useRef<HTMLDivElement | null>(null);
  usePauseOffscreen(rootRef);
  const inView = useInViewOnce(rootRef, { amount: 0.05 });
  const t = TONES[tone];

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
        "opacity-[0.28] md:opacity-[0.36]",
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
                <DrawOnce key={d} d={d} play={inView} delay={arcDelay(i)} strokeWidth={strokeWidth} stroke={t.stroke} />
              ))}
              {AXES.map((d, i) => (
                <DrawOnce key={d} d={d} play={inView} delay={axisDelay(i)} strokeWidth={strokeWidth} stroke={t.stroke} />
              ))}
              <DrawOnce d={TICKS} play={inView} delay={TICK_DELAY} strokeWidth={strokeWidth} stroke={t.stroke} />
            </>
          ) : (
            <>
              {ARCS.map((d, i) => (
                <DrawPath key={d} d={d} progress={scrollYProgress} range={arcRange(i)} strokeWidth={strokeWidth} stroke={t.stroke} />
              ))}
              {AXES.map((d, i) => (
                <DrawPath key={d} d={d} progress={scrollYProgress} range={axisRange(i)} strokeWidth={strokeWidth} stroke={t.stroke} />
              ))}
              <DrawPath d={TICKS} progress={scrollYProgress} range={TICK_RANGE} strokeWidth={strokeWidth} stroke={t.stroke} />
            </>
          )}

          {/* Echos: blitzen reihum (fx-loop, pausieren mit dem Horizont) */}
          {BLIPS.map((b, i) => (
            <SvgBlip key={i} cx={b.cx} cy={b.cy} r={mobile ? 16 : 8} color={t.blip} period={BLIP_PERIOD} delay={b.delay} />
          ))}
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
                background: `conic-gradient(from 0deg, rgba(${t.wedge},0.55) 0deg, rgba(${t.wedge},0) 26deg, rgba(${t.wedge},0) 334deg, rgba(${t.wedge},0.55) 360deg)`,
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
