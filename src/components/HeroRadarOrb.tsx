import { useCallback, useEffect, useId, useRef, useState, type RefObject } from "react";
import { motion, useSpring, useTransform, type MotionValue } from "framer-motion";
import {
  CSS_EASE_IN_OUT,
  EASE_OUT,
  RadarSweep,
  SPRING,
  SvgBlip,
  safeAnimate,
  sweepDelay,
  useFinePointer,
  useInViewOnce,
  useIsMobile,
  usePausedAll,
  useReducedMotionSafe,
  withAlpha,
} from "@/components/fx";

// Live-Radar im Hero: Ringe zeichnen sich beim Hineinscrollen, der Keil
// tastet ab, jede Polygonecke blitzt, wenn der Strahl sie ueberstreicht, und
// pro Umdrehung schaltet das Bild auf den naechsten Zukunftspfad (S1 -> S2 -> S3).
//
// Reduzierte Bewegung (sanfte Stufe): Ringe und Achsen zeichnen sich weiterhin,
// der Orb blendet nur ein (ohne Skalierung), der Strahl steht und atmet per
// opacity (RadarSweep), die Ecken blenden per opacity (SvgBlip). Kein Tilt,
// kein Kippen/keine Parallaxe beim Scrollen (nur das Ausblenden bleibt), kein
// automatischer Pfadwechsel: das Bild bleibt auf S3.
// Pause-Knopf: Sweep und Blips stehen (fx-loop), der Pfadzyklus ebenfalls.

const PERIOD = 6;

const PATHS = [
  { label: "S1", color: "#FF3D57", s: 0.4 },
  { label: "S2", color: "#FF9F2E", s: 0.7 },
  { label: "S3", color: "#00C4A0", s: 1 },
] as const;
const START_PATH = 2; // S3, das bisherige Bild

/** Radien von innen nach aussen (Reihenfolge des Draw-in). */
const RINGS = [35, 65, 100, 140];
const AXES = [-90, -30, 30, 90, 150, 210];
const POLY_POINTS = "200,75 307,160 274,285 126,285 93,160";
/** Ecken mit ihrem Winkel ab 12 Uhr im Uhrzeigersinn (fuer sweepDelay). */
const VERTICES = [
  { x: 200, y: 75, theta: 0 },
  { x: 307, y: 160, theta: 69.5 },
  { x: 274, y: 285, theta: 139 },
  { x: 126, y: 285, theta: 221 },
  { x: 93, y: 160, theta: 290.5 },
];

const clampHalf = (v: number) => Math.max(-0.5, Math.min(0.5, v));

export interface HeroRadarOrbProps {
  /** Hero-Section: Flaeche fuer den Tilt. */
  heroRef: RefObject<HTMLElement>;
  /** Scroll-Fortschritt des Hero (useScroll mit offset ['start start','end start']). */
  progress: MotionValue<number>;
}

const HeroRadarOrb = ({ heroRef, progress }: HeroRadarOrbProps) => {
  const reduced = useReducedMotionSafe();
  const fine = useFinePointer();
  const mobile = useIsMobile();

  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const orbGradId = `orbGrad-${uid}`;
  const coreGradId = `coreGrad-${uid}`;
  const glowId = `glow-hero-${uid}`;

  // ── Pfad-Zyklus: ein Render pro Umdrehung ───────────────────
  // Laeuft nie bei reduzierter Bewegung (RadarSweep feuert dann kein
  // onIteration) und nie bei angehaltenen Animationen (Pause-Knopf). Der
  // pausierte Sweep feuert ohnehin nicht; die Pruefung haelt den Zyklus auch
  // dann an, wenn eine Iteration genau beim Umschalten eintrifft.
  const pausedAll = usePausedAll();
  const holdRef = useRef(false);
  holdRef.current = reduced || pausedAll;
  const [pathIdx, setPathIdx] = useState<number>(START_PATH);
  const next = useCallback(() => {
    if (holdRef.current) return;
    setPathIdx((i) => (i + 1) % PATHS.length);
  }, []);
  const path = reduced ? PATHS[START_PATH] : PATHS[pathIdx];

  // ── Draw-in der Ringe und Achsen ────────────────────────────
  const discRef = useRef<HTMLDivElement | null>(null);
  const ringRefs = useRef<(SVGCircleElement | null)[]>([]);
  const axisRefs = useRef<(SVGLineElement | null)[]>([]);
  const inView = useInViewOnce(discRef, { amount: 0.3 });

  // Zeichnen (stroke-dashoffset) ist auch bei reduzierter Bewegung erlaubt.
  useEffect(() => {
    const anims: Animation[] = [];
    const draw = (el: Element | null, duration: number, delay: number) => {
      const a = safeAnimate(
        el,
        [
          { strokeDasharray: "1 1", strokeDashoffset: 1 },
          { strokeDasharray: "1 1", strokeDashoffset: 0 },
        ],
        { duration, delay, easing: CSS_EASE_IN_OUT, fill: "backwards" },
      );
      if (a) anims.push(a);
    };
    RINGS.forEach((_, i) => draw(ringRefs.current[i], 900, i * 90));
    const axesStart = 900;
    AXES.forEach((_, i) => draw(axisRefs.current[i], 500, axesStart + i * 40));
    // Bis zum Hineinscrollen stehen die Animationen am Anfang (unsichtbar),
    // der Endzustand bleibt im DOM.
    if (!inView) anims.forEach((a) => a.pause());
    const onPrint = () =>
      anims.forEach((a) => {
        try {
          a.finish();
        } catch {
          /* ignorieren */
        }
      });
    window.addEventListener("beforeprint", onPrint);
    return () => {
      window.removeEventListener("beforeprint", onPrint);
      anims.forEach((a) => a.cancel());
    };
  }, [inView]);

  // ── Tilt (nur feiner Zeiger, ohne Reduktion, nicht auf dem Handy) ──
  const tiltOn = fine && !reduced && !mobile;
  const px = useSpring(0, SPRING.tilt);
  const py = useSpring(0, SPRING.tilt);

  useEffect(() => {
    const host = heroRef.current;
    if (!host || !tiltOn) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      const r = host.getBoundingClientRect();
      if (!r.width || !r.height) return;
      px.set(clampHalf((e.clientX - r.left) / r.width - 0.5));
      py.set(clampHalf((e.clientY - r.top) / r.height - 0.5));
    };
    const onLeave = () => {
      px.set(0);
      py.set(0);
    };
    host.addEventListener("pointermove", onMove, { passive: true });
    host.addEventListener("pointerleave", onLeave, { passive: true });
    return () => {
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      px.set(0);
      py.set(0);
    };
  }, [heroRef, tiltOn, px, py]);

  // ── Scroll-Out: Desktop kippt in den Boden, Handy nur Parallaxe ──
  // Reduziert: kein Kippen, Schrumpfen oder Verschieben; das Ausblenden
  // (Opacity-Kopplung an den Scroll) bleibt auf dem Desktop erhalten.
  const scrollDesk = !reduced && !mobile;
  const scrollFade = !mobile;
  const scrollMobile = !reduced && mobile;
  const rotateX = useTransform([py, progress], ([y, p]: number[]) => (tiltOn ? -y * 8 : 0) + (scrollDesk ? p * 35 : 0));
  const rotateY = useTransform(px, (x) => (tiltOn ? x * 10 : 0));
  const discScale = useTransform(progress, (p) => (scrollDesk ? 1 - 0.12 * p : 1));
  const outOpacity = useTransform(progress, (p) => (scrollFade ? 1 - 0.65 * p : 1));
  const outY = useTransform(progress, (p) => (scrollMobile ? -60 * p : 0));

  // Kein fx-float: Der Orb lebt durch Sweep und Pfadwechsel; im Hero laufen
  // sonst zu viele Dauerschleifen gleichzeitig (hoechstens zwei).

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1 }}
      transition={{ duration: 1, ease: EASE_OUT, delay: 0.25 }}
      className="relative flex items-center justify-center"
    >
      <div className="relative flex w-full items-center justify-center">
        <motion.div
          className="relative flex w-full items-center justify-center"
          style={{ opacity: outOpacity, y: outY }}
        >
          {/* Outer glow ring */}
          <div
            aria-hidden="true"
            className="absolute rounded-full pointer-events-none"
            style={{
              width: "110%",
              height: "110%",
              background: "radial-gradient(circle, rgba(75,110,255,0.12) 0%, transparent 70%)",
            }}
          />

          {/* Radar container */}
          <div ref={discRef} className="relative w-full max-w-md aspect-square" style={{ perspective: "1100px" }}>
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                rotateX,
                rotateY,
                scale: discScale,
                transformStyle: "preserve-3d",
                background: "radial-gradient(circle, rgba(15,20,50,0.9) 0%, rgba(5,6,18,0.6) 100%)",
                border: "1px solid rgba(75,110,255,0.15)",
                boxShadow: "0 0 80px rgba(75,110,255,0.15), inset 0 0 60px rgba(5,6,18,0.5)",
              }}
            >
              {/* (a) Ringe und Achsen */}
              <svg
                viewBox="0 0 400 400"
                className="absolute inset-0 w-full h-full"
                fill="none"
                aria-hidden="true"
                style={{ transform: "translateZ(0)" }}
              >
                <defs>
                  <radialGradient id={orbGradId} cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#c8d4ff" stopOpacity="0.18" />
                    <stop offset="40%" stopColor="#4B6EFF" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#4B6EFF" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id={coreGradId} cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#dce6ff" stopOpacity="0.9" />
                    <stop offset="60%" stopColor="#8ba4ff" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#4B6EFF" stopOpacity="0" />
                  </radialGradient>
                  <filter id={glowId}>
                    <feGaussianBlur stdDeviation="8" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Outer glow */}
                <circle cx="200" cy="200" r="180" fill={`url(#${orbGradId})`} />

                {/* Radar rings (Strich startet auf 12 Uhr) */}
                {RINGS.map((r, i) => (
                  <circle
                    key={r}
                    ref={(el) => {
                      ringRefs.current[i] = el;
                    }}
                    cx="200"
                    cy="200"
                    r={r}
                    pathLength={1}
                    transform="rotate(-90 200 200)"
                    stroke="rgba(139,164,255,0.12)"
                    strokeWidth="1"
                    fill={r === 35 ? `url(#${coreGradId})` : "none"}
                  />
                ))}

                {/* Axis lines */}
                {AXES.map((angle, i) => {
                  const rad = (angle * Math.PI) / 180;
                  return (
                    <line
                      key={angle}
                      ref={(el) => {
                        axisRefs.current[i] = el;
                      }}
                      x1={200}
                      y1={200}
                      x2={200 + 140 * Math.cos(rad)}
                      y2={200 + 140 * Math.sin(rad)}
                      pathLength={1}
                      stroke="rgba(139,164,255,0.08)"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Center dot */}
                <circle cx="200" cy="200" r="4" fill="#4B6EFF" filter={`url(#${glowId})`} />
              </svg>

              {/* (b) Abtastender Keil, einziger Container mit overflow-hidden */}
              <RadarSweep
                color="#4B6EFF"
                period={PERIOD}
                trail={60}
                intensity={0.2}
                onIteration={next}
                style={{ transform: "translateZ(1px)" }}
              />

              {/* (c) Polygon des aktiven Pfads */}
              <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none"
                style={{
                  transform: `translateZ(40px) scale(${path.s})`,
                  transformOrigin: "50% 50%",
                  transition: reduced ? undefined : "transform 900ms var(--ease-out)",
                }}
              >
                <svg viewBox="0 0 400 400" className="absolute inset-0 w-full h-full overflow-visible" fill="none">
                  {/* Schein als breiter, halbtransparenter Strich statt feGaussianBlur:
                      Das Polygon wechselt bei jeder Umdrehung die Farbe, ein Filter
                      muesste dabei (und bei jedem Blip-Frame) neu gerastert werden. */}
                  <polygon
                    points={POLY_POINTS}
                    vectorEffect="non-scaling-stroke"
                    style={{
                      fill: "none",
                      stroke: path.color,
                      strokeWidth: 6,
                      strokeOpacity: 0.2,
                      strokeLinejoin: "round",
                      transition: "stroke 600ms var(--ease-out)",
                    }}
                  />
                  <polygon
                    points={POLY_POINTS}
                    vectorEffect="non-scaling-stroke"
                    style={{
                      fill: withAlpha(path.color, 0.07),
                      stroke: withAlpha(path.color, 0.3),
                      strokeWidth: 1,
                      transition: "fill 600ms var(--ease-out), stroke 600ms var(--ease-out)",
                    }}
                  />
                  {VERTICES.map((v) => (
                    <SvgBlip
                      key={v.theta}
                      cx={v.x}
                      cy={v.y}
                      r={3}
                      color={path.color}
                      delay={sweepDelay(v.theta, PERIOD)}
                      period={PERIOD}
                    />
                  ))}
                </svg>
              </div>

              {/* (d) Scenario labels floating */}
              <div
                className="absolute inset-x-0 bottom-6 flex justify-center pointer-events-none"
                style={{ transform: "translateZ(70px)" }}
              >
                <div className="text-center">
                  <div
                    className="text-xs font-semibold tracking-widest uppercase mb-1"
                    style={{ color: "rgba(139,164,255,0.6)", fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    Sovereignty Radar
                  </div>
                  <div className="flex gap-3 justify-center">
                    {PATHS.map(({ label, color }) => {
                      const active = label === path.label;
                      return (
                        <span
                          key={label}
                          className="relative isolate text-[10px] font-bold px-2 py-0.5 rounded"
                          style={{ background: `${color}22`, color, fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          {/* Aktiv: Alpha 22 -> 55 plus Schein, als Ebene per opacity */}
                          <span
                            aria-hidden="true"
                            className="absolute inset-0 -z-10 rounded"
                            style={{
                              background: `${color}3B`,
                              boxShadow: `0 0 12px ${color}`,
                              opacity: active ? 1 : 0,
                              transition: "opacity 300ms var(--ease-out)",
                            }}
                          />
                          {label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default HeroRadarOrb;
