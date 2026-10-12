import { useEffect, useRef, type ReactNode } from "react";
import { motion, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";
import { SPRING } from "./motion";
import { useFinePointer, useReducedMotionSafe } from "./hooks";

export interface MagneticProps {
  strength?: number;
  /** maximaler Versatz in px */
  max?: number;
  /** Fangbereich ausserhalb des Elements in px */
  padding?: number;
  /** Zusatzversatz fuer ein Kind mit [data-magnet-inner] */
  innerStrength?: number;
  className?: string;
  children?: ReactNode;
}

const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));

/**
 * Zieht sein Kind leicht zum Zeiger. Nur bei feinem Zeiger und ohne
 * Reduktion, sonst ein neutraler Wrapper.
 */
export function Magnetic({
  strength = 0.3,
  max = 10,
  padding = 24,
  innerStrength = 0.15,
  className,
  children,
}: MagneticProps) {
  const reduced = useReducedMotionSafe();
  const fine = useFinePointer();
  const active = fine && !reduced;
  const ref = useRef<HTMLSpanElement | null>(null);
  const x = useSpring(0, SPRING.magnet);
  const y = useSpring(0, SPRING.magnet);
  const ix = useSpring(0, SPRING.magnet);
  const iy = useSpring(0, SPRING.magnet);

  useEffect(() => {
    const el = ref.current;
    if (!el || !active) return;
    const inner = el.querySelector<HTMLElement>("[data-magnet-inner]");
    let rect: DOMRect | null = null;
    let engaged = false;

    const measure = () => {
      const r = el.getBoundingClientRect();
      // aktuellen Versatz herausrechnen, damit das Rect stabil bleibt
      rect = new DOMRect(r.left - x.get(), r.top - y.get(), r.width, r.height);
    };
    const release = () => {
      if (!engaged) return;
      engaged = false;
      x.set(0);
      y.set(0);
      ix.set(0);
      iy.set(0);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      if (!rect) measure();
      const r = rect!;
      const inside =
        e.clientX >= r.left - padding &&
        e.clientX <= r.right + padding &&
        e.clientY >= r.top - padding &&
        e.clientY <= r.bottom + padding;
      if (!inside) {
        release();
        return;
      }
      if (!engaged) {
        engaged = true;
        measure();
      }
      const dx = e.clientX - (rect!.left + rect!.width / 2);
      const dy = e.clientY - (rect!.top + rect!.height / 2);
      x.set(clamp(dx * strength, max));
      y.set(clamp(dy * strength * 1.2, max));
      if (inner) {
        ix.set(clamp(dx * innerStrength, max));
        iy.set(clamp(dy * innerStrength * 1.2, max));
      }
    };
    const invalidate = () => {
      rect = null;
    };
    const writeInner = () => {
      if (inner) inner.style.transform = `translate3d(${ix.get()}px,${iy.get()}px,0)`;
    };
    const unsubX = ix.on("change", writeInner);
    const unsubY = iy.on("change", writeInner);

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", release, { passive: true });
    window.addEventListener("scroll", invalidate, { passive: true });
    window.addEventListener("resize", invalidate, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", release);
      window.removeEventListener("scroll", invalidate);
      window.removeEventListener("resize", invalidate);
      unsubX();
      unsubY();
      x.set(0);
      y.set(0);
      if (inner) inner.style.transform = "";
    };
  }, [active, strength, max, padding, innerStrength, x, y, ix, iy]);

  return (
    <motion.span ref={ref} className={cn("inline-flex", className)} style={active ? { x, y } : undefined}>
      {children}
    </motion.span>
  );
}
