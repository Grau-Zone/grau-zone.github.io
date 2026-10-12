import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import {
  animate,
  motion,
  useMotionTemplate,
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
  useInViewOnce,
  useIsMobile,
  useMediaQuery,
  useReducedMotionSafe,
  withAlpha,
} from "@/components/fx";

export interface LayerStackItem {
  id: string;
  number: string;
  color: string;
  icon: ReactNode;
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

/** Projektion der Z-Achse auf die Bildschirm-Y-Achse bei rotateX(58deg). */
const Z_TO_Y = Math.sin((58 * Math.PI) / 180);

const SIZES = {
  large: { plane: 220, height: 360, gapMin: 6, gapMax: 70, lift: 36, reducedGap: 50, grid: 22 },
  compact: { plane: 150, height: 170, gapMin: 4, gapMax: 22, lift: 18, reducedGap: 22, grid: 15 },
} as const;

const ACTIVE_SPRING = { stiffness: 220, damping: 24 };
const SCAN_COLOR = "#8BA4FF";

/**
 * Dekorativer 3D-Schichtstapel der drei Bereiche. Die Explosion haengt am
 * Scroll (nur MotionValues, kein React-State pro Frame), die aktive Ebene
 * hebt sich ab. Handy: einmaliges Auseinanderfahren bei Sichtkontakt.
 * Reduziert (sanfte Stufe): Stapel steht im Endzustand (auseinander, ohne
 * Scroll-Kopplung, Feder und Anheben); die aktive Ebene, ihr Lichtstrahl und
 * der Rand blenden per opacity (DUR.fade) um, die Scan-Ebene steht ueber der
 * obersten Ebene und leuchtet bei Sichtkontakt einmal per opacity auf.
 */
export default function LayerStack3D({ layers, active, explodeTarget, onSelect, className }: LayerStack3DProps) {
  const reduced = useReducedMotionSafe();
  const isMobile = useIsMobile();
  const isLarge = useMediaQuery("(min-width: 1024px)");
  const size = isLarge ? SIZES.large : SIZES.compact;
  const scrollCoupled = !reduced && !isMobile;

  const hostRef = useRef<HTMLDivElement | null>(null);
  const inView = useInViewOnce(hostRef, { amount: 0.5 });

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
  const wrapperTransform = useMotionTemplate`translateY(${offsetY}px) rotateX(58deg) rotateZ(-40deg)`;

  // Scan-Ebene: von translateZ(0) bis ueber die oberste Ebene, dann aus.
  // Reduziert steht sie knapp ueber der obersten Ebene, nur die opacity laeuft.
  const scanZ = useTransform<number, number>([scan, gap, scanFixed], ([s, g, f]) =>
    f ? (n - 1) * g + 8 : s * (n * g + 20),
  );
  const scanTransform = useMotionTemplate`translateZ(${scanZ}px)`;
  const scanOpacity = useTransform(scan, [0, 0.08, 0.8, 1], [0, 1, 1, 0]);

  const tappable = isMobile && !!onSelect;

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className={["fx-deco relative mx-auto w-full select-none", className].filter(Boolean).join(" ")}
      style={{
        height: size.height,
        maxWidth: isLarge ? 380 : 320,
        perspective: 1400,
        pointerEvents: tappable ? "auto" : "none",
      }}
    >
      <motion.div
        className="absolute left-1/2 top-1/2"
        style={{
          width: size.plane,
          height: size.plane,
          marginLeft: -size.plane / 2,
          marginTop: -size.plane / 2,
          transformStyle: "preserve-3d",
          transform: wrapperTransform,
        }}
      >
        {/* Sockel */}
        <div
          className="absolute inset-0 rounded-[18px]"
          style={{
            transform: "translateZ(-8px) scale(1.12)",
            background: "radial-gradient(closest-side, rgba(139,164,255,0.16), rgba(139,164,255,0.04) 70%, transparent)",
            border: "1px dashed rgba(139,164,255,0.18)",
          }}
        />

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
            grid={size.grid}
            planeSize={size.plane}
            onSelect={tappable ? onSelect : undefined}
          />
        ))}

        <motion.div
          className="pointer-events-none absolute inset-0 rounded-[18px]"
          style={{
            transform: scanTransform,
            opacity: scanOpacity,
            background: withAlpha(SCAN_COLOR, 0.06),
            border: `1px solid ${withAlpha(SCAN_COLOR, 0.5)}`,
            boxShadow: `0 0 24px ${withAlpha(SCAN_COLOR, 0.25)}`,
          }}
        />
      </motion.div>
    </div>
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
  grid: number;
  planeSize: number;
  onSelect?: (id: string) => void;
}

function Plane({ layer, index, gap, isActive, anyActive, liftPx, reduced, grid, planeSize, onSelect }: PlaneProps) {
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
  }, [
    isActive,
    liftPx,
    reduced,
    opacityTarget,
    glowTarget,
    lift,
    springOpacity,
    springEdge,
    springBeam,
    softOpacity,
    softEdge,
    softBeam,
  ]);

  const z = useTransform<number, number>([gap, lift], ([g, l]) => index * g + l);
  const planeTransform = useMotionTemplate`translateZ(${z}px)`;

  // Lichtstrahl vom Sockel (z = 0) zur Ebene, als 1-px-Linie entlang Z.
  // Reduziert steht die Ebene fest (z konstant), der Strahl blendet nur per opacity.
  const BEAM_MAX = 400;
  const beamScale = useTransform(z, (v) => Math.max(0, v) / BEAM_MAX);
  const beamTransform = useMotionTemplate`rotateX(-90deg) scaleY(${beamScale})`;

  const c = layer.color;
  const surface = [
    `repeating-linear-gradient(0deg, ${withAlpha(c, 0.14)} 0 1px, transparent 1px ${grid}px)`,
    `repeating-linear-gradient(90deg, ${withAlpha(c, 0.14)} 0 1px, transparent 1px ${grid}px)`,
    `linear-gradient(${withAlpha(c, 0x14 / 255)}, ${withAlpha(c, 0x14 / 255)})`,
  ].join(", ");

  const small = planeSize < 200;

  return (
    <>
      <motion.div
        className="pointer-events-none absolute"
        style={{
          left: "50%",
          bottom: "50%",
          width: 1,
          height: BEAM_MAX,
          marginLeft: -0.5,
          transformOrigin: "50% 100%",
          transform: beamTransform,
          opacity: beam,
          background: `linear-gradient(to top, ${withAlpha(c, 0.05)}, ${withAlpha(c, 0.9)})`,
        }}
      />
      <motion.div
        className="absolute inset-0 rounded-[18px]"
        onClick={onSelect ? () => onSelect(layer.id) : undefined}
        style={{
          transform: planeTransform,
          opacity,
          background: surface,
          border: `1px solid ${withAlpha(c, 0x66 / 255)}`,
          boxShadow: `inset 0 0 ${small ? 18 : 28}px ${withAlpha(c, 0.22)}`,
          cursor: onSelect ? "pointer" : undefined,
          pointerEvents: onSelect ? "auto" : "none",
        }}
      >
        {/* volle Randdeckkraft + Glow der aktiven Ebene (gestapelt, nur opacity) */}
        <motion.div
          className="pointer-events-none absolute -inset-px rounded-[18px]"
          style={{
            opacity: edge,
            border: `1px solid ${c}`,
            boxShadow: `0 0 26px ${withAlpha(c, 0.35)}, inset 0 0 22px ${withAlpha(c, 0.18)}`,
          }}
        />
        <div
          className="absolute flex items-center justify-center"
          style={{
            left: small ? 12 : 18,
            top: small ? 12 : 18,
            color: c,
            transform: small ? "scale(0.85)" : undefined,
            transformOrigin: "0 0",
          }}
        >
          {layer.icon}
        </div>
        <span
          className="absolute"
          style={{
            right: small ? 12 : 18,
            bottom: small ? 10 : 14,
            color: withAlpha(c, 0.85),
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: small ? 13 : 16,
            letterSpacing: "0.08em",
          }}
        >
          {layer.number}
        </span>
      </motion.div>
    </>
  );
}
