import { useEffect, useMemo, useRef, type RefObject } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import {
  DUR,
  EASE_IN_OUT,
  EASE_OUT,
  useIsMobile,
  useMediaQuery,
  usePauseOffscreen,
  useReducedMotionSafe,
} from "@/components/fx";
import { useSeen } from "./landing-a/useSeen";
import "./landing-a/landing-a.css";

export interface LayerStackItem {
  id: string;
  number: string;
}

export interface LayerStack3DProps {
  /** Reihenfolge von unten nach oben (Infra, Modell, Daten). */
  layers: LayerStackItem[];
  /** Hervorgehobene Ebene (offen oder unter dem Zeiger). */
  active: string | null;
  /** Element, dessen Scrollposition die Explosion steuert (Sektionskopf). */
  explodeTarget: RefObject<HTMLElement | null>;
  /** Antippen einer Ebene auf dem Handy (oeffnet das Akkordeon). */
  onSelect?: (id: string) => void;
  className?: string;
}

/* ---------- Geometrie: isometrische Linienzeichnung ---------- */

const ROT = (-40 * Math.PI) / 180;
const COS = Math.cos(ROT);
const SIN = Math.sin(ROT);
/** rotateX(58deg): Stauchung der Flaeche und Projektion der Z-Achse auf Bildschirm-Y */
const SQUASH = Math.cos((58 * Math.PI) / 180);
const Z_TO_Y = Math.sin((58 * Math.PI) / 180);

const GREEN = "#00802f";

const SIZES = {
  large: { w: 400, h: 420, half: 90, gapMin: 6, gapMax: 64, lift: 28, reducedGap: 46, div: 6 },
  compact: { w: 340, h: 280, half: 74, gapMin: 4, gapMax: 28, lift: 12, reducedGap: 22, div: 5 },
} as const;

type SizeSpec = (typeof SIZES)[keyof typeof SIZES];

const ACTIVE_SPRING = { stiffness: 220, damping: 24 };

/** Punkt der Ebene (u, v) auf den Bildschirm, Ursprung in der Mitte der Ebene. */
function proj(u: number, v: number): [number, number] {
  return [u * COS - v * SIN, (u * SIN + v * COS) * SQUASH];
}
const f1 = (n: number) => n.toFixed(1);
const pt = (p: [number, number]) => `${f1(p[0])} ${f1(p[1])}`;

function buildGeometry(half: number, div: number) {
  const left = proj(-half, -half);
  const top = proj(half, -half);
  const right = proj(half, half);
  const bottom = proj(-half, half);
  const outline = `M${pt(left)}L${pt(top)}L${pt(right)}L${pt(bottom)}Z`;
  let grid = "";
  for (let k = 1; k < div; k++) {
    const t = -half + (2 * half * k) / div;
    grid += `M${pt(proj(t, -half))}L${pt(proj(t, half))}M${pt(proj(-half, t))}L${pt(proj(half, t))}`;
  }
  const cross = `M${pt(proj(-7, 0))}L${pt(proj(7, 0))}M${pt(proj(0, -7))}L${pt(proj(0, 7))}`;
  // Radarscheibe auf dem Boden: drei Ringe, drei Achsen (wie im Radar), Sweep
  const rings = [0.55, 1, 1.58].map((k) => half * k);
  const R = rings[2];
  const axes = [-90, 30, 150]
    .map((deg) => {
      const a = (deg * Math.PI) / 180;
      return `M0 0L${f1(R * Math.cos(a))} ${f1(R * Math.sin(a) * SQUASH)}`;
    })
    .join("");
  const a0 = (-34 * Math.PI) / 180;
  const sweepWedge = `M0 0L${f1(R * Math.cos(a0))} ${f1(R * Math.sin(a0))}A${f1(R)} ${f1(R)} 0 0 1 ${f1(R)} 0Z`;
  return { outline, grid, cross, rings, R, axes, sweepWedge, corners: [left, top, right, bottom], labelAt: right };
}

/**
 * Dekorativer Schichtstapel der drei Bereiche als feine gruene Linienzeichnung.
 * Die Explosion haengt am Scroll (nur MotionValues, kein React-State pro Bild), die aktive Ebene
 * hebt sich ab und bekommt Rand und Lichtstrahl. Auf der Bodenscheibe laeuft ein Radar-Strahl
 * (Schleife mit Pause-Knopf, offscreen und Tab-Wechsel). Handy: einmaliges Auseinanderfahren bei
 * Sichtkontakt, Ebenen antippbar.
 * Reduziert (sanfte Stufe): Stapel steht im Endzustand (auseinander, ohne Scroll-Kopplung, Feder
 * und Anheben); die aktive Ebene, ihr Strahl und der Rand blenden per opacity um (DUR.fade),
 * die Scan-Ebene steht ueber der obersten Ebene und leuchtet bei Sichtkontakt einmal auf,
 * der Radar-Strahl steht.
 */
export default function LayerStack3D({ layers, active, explodeTarget, onSelect, className }: LayerStack3DProps) {
  const reduced = useReducedMotionSafe();
  const isMobile = useIsMobile();
  const isLarge = useMediaQuery("(min-width: 62rem)");
  const size: SizeSpec = isLarge ? SIZES.large : SIZES.compact;
  const scrollCoupled = !reduced && !isMobile;
  const geo = useMemo(() => buildGeometry(size.half, size.div), [size.half, size.div]);

  const [hostRef, inView] = useSeen<HTMLDivElement>({ threshold: 0.5, rootMargin: "0px" });
  usePauseOffscreen(hostRef);

  // Abstand zwischen den Ebenen (latcht: steigt nur).
  const gap = useMotionValue<number>(reduced ? size.reducedGap : size.gapMin);
  const scan = useMotionValue(0);
  // 1 = Scan-Ebene steht fest ueber der obersten Ebene (reduce), 0 = faehrt hoch
  const scanFixed = useMotionValue(reduced ? 1 : 0);
  const scannedRef = useRef(false);

  const { scrollYProgress } = useScroll({
    target: explodeTarget as RefObject<HTMLElement>,
    offset: ["start end", "center center"],
  });

  const runScan = () => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    scan.set(0);
    animate(scan, 1, { duration: 1.2, ease: EASE_IN_OUT });
  };

  const applyProgress = (p: number) => {
    if (!scrollCoupled) return;
    const clamped = Math.max(0, Math.min(1, p));
    const next = size.gapMin + (size.gapMax - size.gapMin) * clamped;
    if (next > gap.get()) gap.set(next);
    if (clamped >= 0.95) runScan();
  };

  useMotionValueEvent(scrollYProgress, "change", applyProgress);

  // Modus- oder Groessenwechsel: Ausgangslage neu setzen.
  useEffect(() => {
    scanFixed.jump(reduced ? 1 : 0);
    if (reduced) {
      gap.jump(size.reducedGap);
      scan.jump(0);
      return;
    }
    if (scrollCoupled) {
      gap.jump(size.gapMin);
      applyProgress(scrollYProgress.get());
    }
    // applyProgress liest nur aktuelle Werte
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, scrollCoupled, size.gapMin, size.gapMax, size.reducedGap]);

  // Handy: einmaliges Auseinanderfahren per Feder bei Sichtkontakt.
  const mobileDoneRef = useRef(false);
  useEffect(() => {
    if (reduced || scrollCoupled) return;
    if (mobileDoneRef.current) {
      gap.jump(size.gapMax);
      return;
    }
    if (!inView) {
      gap.jump(size.gapMin);
      return;
    }
    mobileDoneRef.current = true;
    const controls = animate(gap, size.gapMax, {
      type: "spring",
      duration: 0.9,
      bounce: 0.2,
      onComplete: runScan,
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduced, scrollCoupled, size.gapMin, size.gapMax]);

  // reduce: einmaliges Aufleuchten der (stehenden) Scan-Ebene bei Sichtkontakt
  useEffect(() => {
    if (reduced && inView) runScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, inView]);

  const n = layers.length;
  const activeIndex = layers.findIndex((l) => l.id === active);
  const liftTarget = reduced ? 0 : size.lift;

  // Stapel vertikal mittig halten, waehrend er auseinanderfaehrt.
  const lift = useSpring(activeIndex >= 0 ? liftTarget : 0, ACTIVE_SPRING);
  useEffect(() => {
    const target = activeIndex >= 0 ? liftTarget : 0;
    if (reduced) lift.jump(target);
    else lift.set(target);
  }, [activeIndex, liftTarget, reduced, lift]);
  const offsetY = useTransform<number, number>([gap, lift], ([g, l]) => (((n - 1) * g + l) / 2) * Z_TO_Y);

  // Scan-Ebene: von z = 0 bis ueber die oberste Ebene, dann aus.
  // Reduziert steht sie knapp ueber der obersten Ebene, nur die opacity laeuft.
  const scanY = useTransform<number, number>([scan, gap, scanFixed], ([s, g, f]) =>
    -(f ? (n - 1) * g + 8 : s * (n * g + 20)) * Z_TO_Y,
  );
  const scanOpacity = useTransform(scan, [0, 0.08, 0.8, 1], [0, 1, 1, 0]);

  const tappable = isMobile && !!onSelect;
  const cx = size.w / 2;
  const cy = size.h / 2;
  const baseDrop = 10; // Bodenscheibe liegt knapp unter der untersten Ebene

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      data-in={inView}
      className={["fx-deco la-stk", className].filter(Boolean).join(" ")}
      style={{ pointerEvents: tappable ? "auto" : "none", maxWidth: isLarge ? 440 : 320 }}
    >
      <svg viewBox={`0 0 ${size.w} ${size.h}`} focusable="false">
        <g transform={`translate(${cx} ${cy})`}>
          <motion.g style={{ y: offsetY }}>
            {/* Bodenscheibe: das Radar in der Draufsicht, drei Ringe, drei Achsen, Strahl */}
            <g transform={`translate(0 ${baseDrop})`}>
              {geo.rings.map((r, i) => (
                <ellipse
                  key={i}
                  className={i === 1 ? undefined : "la-draw"}
                  pathLength={i === 1 ? undefined : 1}
                  rx={r}
                  ry={r * SQUASH}
                  fill="none"
                  stroke={GREEN}
                  strokeOpacity={i === 2 ? 0.28 : 0.2}
                  strokeWidth={1}
                  strokeDasharray={i === 1 ? "2 5" : undefined}
                  style={{ ["--d" as string]: `${0.1 + i * 0.2}s` }}
                />
              ))}
              <path
                className="la-draw"
                pathLength={1}
                d={geo.axes}
                fill="none"
                stroke={GREEN}
                strokeOpacity={0.22}
                strokeWidth={1}
                style={{ ["--d" as string]: "0.5s" }}
              />
              <g transform={`scale(1 ${SQUASH})`}>
                <g className="la-stk__sweep fx-loop">
                  <path d={geo.sweepWedge} fill={GREEN} fillOpacity={0.1} />
                  <line x1={0} y1={0} x2={geo.R} y2={0} stroke={GREEN} strokeOpacity={0.6} strokeWidth={1.2} />
                </g>
              </g>
              <circle r={2.2} fill={GREEN} />
            </g>

            {/* Lichtstrahlen vom Boden zu den Ebenen */}
            {layers.map((layer, i) => (
              <Beam
                key={`b-${layer.id}`}
                index={i}
                gap={gap}
                active={layer.id === active}
                anyActive={activeIndex >= 0}
                liftPx={liftTarget}
                reduced={reduced}
                baseDrop={baseDrop}
              />
            ))}

            {layers.map((layer, i) => (
              <Plane
                key={layer.id}
                layer={layer}
                index={i}
                gap={gap}
                isActive={layer.id === active}
                anyActive={activeIndex >= 0}
                liftPx={liftTarget}
                reduced={reduced}
                geo={geo}
                showNumber
                onSelect={tappable ? onSelect : undefined}
              />
            ))}

            {/* Scan-Ebene */}
            <motion.g style={{ y: scanY, opacity: scanOpacity }}>
              <path d={geo.outline} fill={GREEN} fillOpacity={0.05} stroke={GREEN} strokeOpacity={0.85} strokeWidth={1.2} />
            </motion.g>
          </motion.g>
        </g>
      </svg>
    </div>
  );
}

/* ---------- gemeinsame Zustandswerte je Ebene ---------- */

function usePlaneState(index: number, gap: MotionValue<number>, isActive: boolean, anyActive: boolean, liftPx: number, reduced: boolean) {
  const opacityTarget = !anyActive || isActive ? 1 : 0.35;
  const glowTarget = isActive ? 1 : 0;

  const lift = useSpring(isActive ? liftPx : 0, ACTIVE_SPRING);
  const springOpacity = useSpring(opacityTarget, ACTIVE_SPRING);
  const springEdge = useSpring(glowTarget, ACTIVE_SPRING);
  const springBeam = useSpring(glowTarget, ACTIVE_SPRING);
  // Sanfte Stufe: dieselben Werte ohne Feder, per Crossfade (DUR.fade)
  const softOpacity = useMotionValue(opacityTarget);
  const softEdge = useMotionValue(glowTarget);
  const softBeam = useMotionValue(glowTarget);

  const opacity = reduced ? softOpacity : springOpacity;
  const edge = reduced ? softEdge : springEdge;
  const beam = reduced ? softBeam : springBeam;

  useEffect(() => {
    // Anheben ist Bewegung: bei reduce ist liftPx 0, die Feder springt
    if (reduced) lift.jump(isActive ? liftPx : 0);
    else lift.set(isActive ? liftPx : 0);

    const pairs: [MotionValue<number>, MotionValue<number>, number][] = [
      [springOpacity, softOpacity, opacityTarget],
      [springEdge, softEdge, glowTarget],
      [springBeam, softBeam, glowTarget],
    ];
    const running: { stop: () => void }[] = [];
    for (const [spring, soft, v] of pairs) {
      if (reduced) {
        spring.jump(v);
        running.push(animate(soft, v, { duration: DUR.fade, ease: EASE_OUT }));
      } else {
        soft.jump(v);
        spring.set(v);
      }
    }
    return () => running.forEach((c) => c.stop());
  }, [isActive, liftPx, reduced, opacityTarget, glowTarget, lift, springOpacity, springEdge, springBeam, softOpacity, softEdge, softBeam]);

  const z = useTransform<number, number>([gap, lift], ([g, l]) => index * g + l);
  const y = useTransform(z, (v) => -v * Z_TO_Y);
  return { opacity, edge, beam, y };
}

interface BeamProps {
  index: number;
  gap: MotionValue<number>;
  active: boolean;
  anyActive: boolean;
  liftPx: number;
  reduced: boolean;
  baseDrop: number;
}

/** Lichtstrahl vom Boden zur Ebene. Steht die Ebene fest (reduce), blendet er nur per opacity. */
function Beam({ index, gap, active, anyActive, liftPx, reduced, baseDrop }: BeamProps) {
  const { beam, y } = usePlaneState(index, gap, active, anyActive, liftPx, reduced);
  return (
    <motion.line
      x1={0}
      x2={0}
      y1={baseDrop}
      y2={y}
      stroke={GREEN}
      strokeWidth={1}
      strokeDasharray="2 4"
      style={{ opacity: beam }}
    />
  );
}

interface PlaneProps {
  layer: LayerStackItem;
  index: number;
  gap: MotionValue<number>;
  isActive: boolean;
  anyActive: boolean;
  liftPx: number;
  reduced: boolean;
  geo: ReturnType<typeof buildGeometry>;
  showNumber: boolean;
  onSelect?: (id: string) => void;
}

function Plane({ layer, index, gap, isActive, anyActive, liftPx, reduced, geo, showNumber, onSelect }: PlaneProps) {
  const { opacity, edge, y } = usePlaneState(index, gap, isActive, anyActive, liftPx, reduced);
  const [lx, ly] = geo.labelAt;
  const delay = `${0.15 + index * 0.25}s`;

  return (
    <motion.g
      onClick={onSelect ? () => onSelect(layer.id) : undefined}
      style={{ y, opacity, cursor: onSelect ? "pointer" : undefined, pointerEvents: onSelect ? "auto" : "none" }}
    >
      {/* Blatt: leicht weiss hinterlegt, damit untere Linien etwas zurueckweichen */}
      <path d={geo.outline} fill="rgba(255,255,255,0.4)" stroke="none" />
      <path
        className="la-draw"
        pathLength={1}
        d={geo.grid}
        fill="none"
        stroke={GREEN}
        strokeOpacity={0.2}
        strokeWidth={1}
        style={{ ["--d" as string]: delay }}
      />
      <path
        className="la-draw"
        pathLength={1}
        d={geo.outline}
        fill="none"
        stroke={GREEN}
        strokeOpacity={0.6}
        strokeWidth={1}
        strokeLinejoin="round"
        style={{ ["--d" as string]: delay }}
      />
      {geo.corners.map((c, k) => (
        <circle key={k} cx={c[0]} cy={c[1]} r={2} fill="#fff" stroke={GREEN} strokeOpacity={0.6} strokeWidth={1} />
      ))}
      <path d={geo.cross} fill="none" stroke={GREEN} strokeOpacity={0.5} strokeWidth={1} />

      {/* aktive Ebene: voller Rand und leichte Fuellung (gestapelt, nur opacity) */}
      <motion.g style={{ opacity: edge }}>
        <path d={geo.outline} fill={GREEN} fillOpacity={0.07} stroke={GREEN} strokeWidth={1.6} strokeLinejoin="round" />
        {geo.corners.map((c, k) => (
          <circle key={k} cx={c[0]} cy={c[1]} r={3} fill={GREEN} />
        ))}
      </motion.g>

      {/* Fuehrungslinie mit Nummer */}
      {showNumber ? (
        <g>
          <line x1={lx + 6} y1={ly} x2={lx + 22} y2={ly} stroke={GREEN} strokeOpacity={0.5} strokeWidth={1} />
          <text className="la-stk__no" data-on={isActive} x={lx + 27} y={ly + 4}>
            {layer.number}
          </text>
        </g>
      ) : null}

      {/* Trefferflaeche fuer das Antippen (Handy) */}
      {onSelect ? <path d={geo.outline} fill="rgba(0,0,0,0.001)" /> : null}
    </motion.g>
  );
}
