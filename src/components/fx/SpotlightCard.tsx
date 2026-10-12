import { forwardRef, useCallback, useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { motion, useSpring, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { CSS_EASE_IN_OUT, SPRING, safeAnimate, withAlpha } from "./motion";
import { useFinePointer, useInViewOnce, useReducedMotionSafe } from "./hooks";

export interface SpotlightCardProps extends Omit<HTMLMotionProps<"div">, "children" | "style"> {
  as?: keyof JSX.IntrinsicElements;
  color?: string;
  intensity?: number;
  radius?: number;
  edge?: boolean;
  /** maximale Neigung in Grad (0 = aus) */
  tilt?: number;
  /** Anheben in px beim Hover (0 = aus) */
  lift?: number;
  scanOnEnter?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

const RING_MASK: CSSProperties = {
  padding: 1,
  WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
  WebkitMaskComposite: "xor",
  mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
  maskComposite: "exclude",
};

/**
 * Karte mit Licht unter dem Zeiger (und Kantenlicht), optional Tilt und
 * Lift. Nur bei feinem Zeiger ohne Reduktion; auf Touch laeuft einmal ein
 * Scan-Band beim ersten Sichtkontakt.
 * Regel: Entree-Animationen auf einen aeusseren Wrapper legen, nie auf die
 * SpotlightCard selbst (sie besitzt transform fuer Tilt/Lift).
 */
export const SpotlightCard = forwardRef<HTMLElement, SpotlightCardProps>(function SpotlightCard(
  {
    as = "div",
    color = "#4B6EFF",
    intensity = 0.14,
    radius = 210,
    edge = true,
    tilt = 0,
    lift = 0,
    scanOnEnter = true,
    className,
    style,
    children,
    ...motionProps
  },
  forwarded,
) {
  const reduced = useReducedMotionSafe();
  const fine = useFinePointer();
  const interactive = fine && !reduced;

  const cardRef = useRef<HTMLElement | null>(null);
  const spotRef = useRef<HTMLDivElement | null>(null);
  const edgeWrapRef = useRef<HTMLDivElement | null>(null);
  const edgeDotRef = useRef<HTMLDivElement | null>(null);
  const scanRef = useRef<HTMLDivElement | null>(null);

  const setRef = useCallback(
    (node: HTMLElement | null) => {
      cardRef.current = node;
      if (typeof forwarded === "function") forwarded(node);
      else if (forwarded) forwarded.current = node;
    },
    [forwarded],
  );

  const rotateX = useSpring(0, SPRING.tilt);
  const rotateY = useSpring(0, SPRING.tilt);
  const y = useSpring(0, SPRING.tilt);

  // Zeiger: nur style.transform der beiden Lichtebenen schreiben
  useEffect(() => {
    const card = cardRef.current;
    if (!card || !interactive) return;
    let rect: DOMRect | null = null;
    let raf = 0;
    let px = 0;
    let py = 0;

    const show = (on: boolean) => {
      for (const el of [spotRef.current, edgeWrapRef.current]) {
        if (!el) continue;
        el.style.transition = `opacity ${on ? 200 : 300}ms ease`;
        el.style.opacity = on ? "1" : "0";
      }
    };
    const write = () => {
      raf = 0;
      if (!rect) return;
      const x = px - rect.left;
      const yy = py - rect.top;
      const t = `translate3d(${x - radius}px,${yy - radius}px,0)`;
      if (spotRef.current) spotRef.current.style.transform = t;
      if (edgeDotRef.current) edgeDotRef.current.style.transform = t;
      if (tilt > 0) {
        const nx = x / rect.width - 0.5;
        const ny = yy / rect.height - 0.5;
        rotateY.set(nx * 2 * tilt);
        rotateX.set(-ny * 2 * tilt);
      }
    };
    const onEnter = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      rect = card.getBoundingClientRect();
      px = e.clientX;
      py = e.clientY;
      write();
      show(true);
      if (lift > 0) y.set(-lift);
    };
    const onMove = (e: PointerEvent) => {
      if (!rect) rect = card.getBoundingClientRect();
      px = e.clientX;
      py = e.clientY;
      if (!raf) raf = requestAnimationFrame(write);
    };
    const onLeave = () => {
      rect = null;
      show(false);
      rotateX.set(0);
      rotateY.set(0);
      y.set(0);
    };
    const invalidate = () => {
      rect = null;
    };
    card.addEventListener("pointerenter", onEnter, { passive: true });
    card.addEventListener("pointermove", onMove, { passive: true });
    card.addEventListener("pointerleave", onLeave, { passive: true });
    window.addEventListener("scroll", invalidate, { passive: true });
    window.addEventListener("resize", invalidate, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      card.removeEventListener("pointerenter", onEnter);
      card.removeEventListener("pointermove", onMove);
      card.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", invalidate);
      window.removeEventListener("resize", invalidate);
    };
  }, [interactive, radius, tilt, lift, rotateX, rotateY, y]);

  // Touch: einmaliges Scan-Band beim ersten Sichtkontakt
  const inView = useInViewOnce(cardRef, { amount: 0.4 });
  const scannedRef = useRef(false);
  useEffect(() => {
    if (!inView || interactive || reduced || !scanOnEnter || scannedRef.current) return;
    scannedRef.current = true;
    safeAnimate(scanRef.current, [{ transform: "translateY(-100%)" }, { transform: "translateY(250%)" }], {
      duration: 1100,
      easing: CSS_EASE_IN_OUT,
    });
  }, [inView, interactive, reduced, scanOnEnter]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Comp = ((motion as any)[as] ?? motion.div) as typeof motion.div;
  const size = radius * 2;
  const tiltOn = interactive && tilt > 0;
  const liftOn = interactive && lift > 0;
  const motionStyle = {
    ...style,
    ...(tiltOn ? { rotateX, rotateY, transformPerspective: 1000 } : {}),
    ...(liftOn ? { y } : {}),
  };

  return (
    <Comp
      ref={setRef as never}
      className={cn("relative isolate", className)}
      style={motionStyle}
      {...motionProps}
    >
      <div
        aria-hidden="true"
        className="fx-deco pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
        style={{ zIndex: -1 }}
      >
        {interactive ? (
          <>
            <div
              ref={spotRef}
              className="absolute left-0 top-0 rounded-full"
              style={{
                width: size,
                height: size,
                opacity: 0,
                background: `radial-gradient(circle, ${withAlpha(color, intensity)}, transparent 65%)`,
                willChange: "transform",
              }}
            />
            {edge ? (
              <div
                ref={edgeWrapRef}
                className="absolute inset-0 rounded-[inherit]"
                style={{ ...RING_MASK, opacity: 0 }}
              >
                <div
                  ref={edgeDotRef}
                  className="absolute left-0 top-0 rounded-full"
                  style={{
                    width: size,
                    height: size,
                    background: `radial-gradient(circle, ${withAlpha(color, 0xaa / 255)}, transparent 65%)`,
                  }}
                />
              </div>
            ) : null}
          </>
        ) : scanOnEnter && !reduced ? (
          <div
            ref={scanRef}
            className="absolute left-0 right-0 top-0"
            style={{
              height: "40%",
              transform: "translateY(-100%)",
              background: `linear-gradient(180deg, transparent, ${withAlpha(color, 0.1)}, transparent)`,
            }}
          />
        ) : null}
      </div>
      {children}
    </Comp>
  );
});
