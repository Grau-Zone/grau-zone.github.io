import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { cn } from "@/lib/utils";
import { useIsMobile, useReducedMotionSafe } from "./hooks";

type ScrollOffset = NonNullable<NonNullable<Parameters<typeof useScroll>[0]>["offset"]>;

export interface ScrollWordsProps {
  text: string;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  style?: CSSProperties;
  /** Wort (ohne Satzzeichen) -> Farbe */
  highlight?: Record<string, string>;
  offset?: [string, string];
  mobileOffset?: [string, string];
  /** Deckkraft ungelesener Woerter */
  min?: number;
  scanLine?: boolean;
}

const stripPunct = (w: string) => w.replace(/[.,;:!?„“”"'«»()[\]–—-]/g, "");

function Word({
  word,
  progress,
  range,
  min,
  color,
}: {
  word: string;
  progress: MotionValue<number>;
  range: [number, number];
  min: number;
  color?: string;
}) {
  const opacity = useTransform(progress, range, [min, 1]);
  return (
    <motion.span data-fx-reveal="" style={{ opacity, color }}>
      {word}
    </motion.span>
  );
}

/**
 * Absatz, dessen Woerter sich beim Scrollen nacheinander aufhellen.
 * Reduzierte Bewegung (sanfte Stufe): Die Opacity-Kopplung an den Scroll
 * bleibt (erlaubt), die mitwandernde Scanlinie (Transform) entfaellt.
 */
export function ScrollWords(props: ScrollWordsProps) {
  const reduced = useReducedMotionSafe();
  return <ScrollWordsAnimated {...props} scanLine={reduced ? false : props.scanLine} />;
}

function ScrollWordsAnimated({
  text,
  as = "p",
  className,
  style,
  highlight,
  offset = ["start 0.85", "end 0.5"],
  mobileOffset = ["start 0.9", "end 0.6"],
  min = 0.2,
  scanLine = true,
}: ScrollWordsProps) {
  const mobile = useIsMobile();
  const ref = useRef<HTMLElement | null>(null);
  const heightRef = useRef(0);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: (mobile ? mobileOffset : offset) as unknown as ScrollOffset,
  });
  const lineY = useTransform(scrollYProgress, (p) => p * heightRef.current);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    heightRef.current = el.offsetHeight;
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      heightRef.current = el.offsetHeight;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const tokens = useMemo(() => text.split(/(\s+)/), [text]);
  const n = Math.max(1, tokens.filter((t) => t !== "" && !/^\s+$/.test(t)).length);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Comp = as as any;
  let wi = 0;

  return (
    <Comp ref={ref} className={cn("relative", className)} style={style}>
      {tokens.map((tok, i) => {
        if (tok === "" || /^\s+$/.test(tok)) return tok;
        const start = (wi / n) * 0.8;
        wi++;
        return (
          <Word
            key={i}
            word={tok}
            progress={scrollYProgress}
            range={[start, start + 0.2]}
            min={min}
            color={highlight?.[stripPunct(tok)]}
          />
        );
      })}
      {scanLine ? (
        <motion.span
          aria-hidden="true"
          className="fx-deco pointer-events-none absolute left-0 right-0 top-0 block h-px"
          style={{
            y: lineY,
            background: "linear-gradient(90deg, transparent, rgba(139,164,255,0.45), transparent)",
          }}
        />
      ) : null}
    </Comp>
  );
}
