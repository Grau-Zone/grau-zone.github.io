import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotionSafe } from "./hooks";

const BAR_BG = "linear-gradient(90deg, #00802f, #00802f 78%, transparent)";

function supportsScrollTimeline(): boolean {
  try {
    return typeof CSS !== "undefined" && typeof CSS.supports === "function" && CSS.supports("animation-timeline: scroll()");
  } catch {
    return false;
  }
}

const Head = () => (
  <span
    className="absolute right-0 top-1/2 block rounded-full"
    style={{
      width: 6,
      height: 6,
      marginTop: -3,
      marginRight: -3,
      background: "#00802f",
      boxShadow: "0 0 0 3px rgba(0,128,47,0.16)",
    }}
  />
);

/**
 * Lesefortschritt der Seite als 2-px-Leiste mit Kopf. Mit CSS
 * Scroll-Timeline ganz ohne JS, sonst framer useScroll + Feder. Bleibt auch
 * bei reduzierter Bewegung, da sie nur die Position abbildet.
 */
export function ScrollProgress({ className }: { className?: string }) {
  return supportsScrollTimeline() ? <CssProgress className={className} /> : <JsProgress className={className} />;
}

function CssProgress({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("fx-deco pointer-events-none relative h-[2px] overflow-x-clip", className)}
    >
      <div className="fx-scroll-progress absolute inset-0" style={{ background: BAR_BG }} />
      <div className="fx-scroll-progress__head absolute inset-0">
        <Head />
      </div>
    </div>
  );
}

function JsProgress({ className }: { className?: string }) {
  const reduced = useReducedMotionSafe();
  const { scrollYProgress } = useScroll();
  const spring = useSpring(scrollYProgress, { stiffness: 400, damping: 40, restDelta: 0.001 });
  const scaleX = reduced ? scrollYProgress : spring;
  const headX = useTransform(scaleX, (v) => `${(v - 1) * 100}%`);
  return (
    <div
      aria-hidden="true"
      className={cn("fx-deco pointer-events-none relative h-[2px] overflow-x-clip", className)}
    >
      <motion.div className="absolute inset-0" style={{ background: BAR_BG, scaleX, originX: 0 }} />
      <motion.div className="absolute inset-0" style={{ x: headX }}>
        <Head />
      </motion.div>
    </div>
  );
}
