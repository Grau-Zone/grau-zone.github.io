import { forwardRef, type CSSProperties, type ReactNode } from "react";
import { motion, type HTMLMotionProps, type Variants } from "framer-motion";
import { DUR, EASE_OUT, STAGGER, VIEWPORT_ONCE } from "./motion";
import { useIsMobile, useReducedMotionSafe } from "./hooks";

type Tag = keyof JSX.IntrinsicElements;
type Margin = string;

// motion[tag] liefert fuer jeden HTML-Tag eine gecachte Komponente.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const motionTag = (as: Tag): any => (motion as any)[as] ?? motion.div;

type BaseProps = Omit<
  HTMLMotionProps<"div">,
  "initial" | "animate" | "whileInView" | "viewport" | "transition" | "variants" | "children" | "style"
>;

export interface RevealProps extends BaseProps {
  as?: Tag;
  y?: number;
  x?: number;
  blur?: boolean;
  delay?: number;
  duration?: number;
  amount?: number;
  margin?: Margin;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/**
 * Einmaliges Entree beim Sichtkontakt. Endzustand ist die normale Darstellung.
 * Reduzierte Bewegung (sanfte Stufe): nur opacity, gleiche Dauer und Kurve,
 * ohne Versatz und ohne Blur.
 */
export const Reveal = forwardRef<HTMLElement, RevealProps>(function Reveal(
  {
    as = "div",
    y = 16,
    x = 0,
    blur = false,
    delay = 0,
    duration = DUR.reveal,
    amount = 0.2,
    margin = VIEWPORT_ONCE.margin,
    className,
    style,
    children,
    ...rest
  },
  ref,
) {
  const reduced = useReducedMotionSafe();
  const mobile = useIsMobile();
  const Comp = motionTag(as);
  const useBlur = blur && !mobile;

  const initial = reduced
    ? { opacity: 0 }
    : {
        opacity: 0,
        transform: `translate3d(${x}px,${y}px,0)`,
        ...(useBlur ? { filter: "blur(6px)" } : {}),
      };
  // reduce: transform/filter "none" ohne Dauer. framer setzt initial nur beim
  // Mount; wechselt die OS-Einstellung danach live, raeumt das einen schon
  // gesetzten Versatz bzw. Blur ab, ohne die Kinder neu aufzubauen.
  const shown = reduced
    ? { opacity: 1, transform: "none", ...(blur ? { filter: "none" } : {}) }
    : {
        opacity: 1,
        transform: "translate3d(0px,0px,0)",
        ...(useBlur ? { filter: "blur(0px)" } : {}),
      };
  const transition = reduced
    ? { duration, delay, ease: EASE_OUT, transform: { duration: 0 }, filter: { duration: 0 } }
    : { duration, delay, ease: EASE_OUT };

  return (
    <Comp
      ref={ref}
      data-fx-reveal=""
      className={className}
      style={style}
      initial={initial}
      whileInView={shown}
      viewport={{ once: true, amount, margin }}
      transition={transition}
      {...rest}
    >
      {children}
    </Comp>
  );
});

export interface RevealGroupProps extends BaseProps {
  as?: Tag;
  stagger?: number;
  delayChildren?: number;
  amount?: number;
  margin?: Margin;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/** Container fuer gestaffelte RevealItems (Varianten 'hidden' und 'shown'). */
export const RevealGroup = forwardRef<HTMLElement, RevealGroupProps>(function RevealGroup(
  {
    as = "div",
    stagger = STAGGER,
    delayChildren = 0,
    amount = 0.2,
    margin = VIEWPORT_ONCE.margin,
    className,
    style,
    children,
    ...rest
  },
  ref,
) {
  const Comp = motionTag(as);
  const variants: Variants = {
    hidden: {},
    shown: {
      transition: { staggerChildren: stagger, delayChildren },
    },
  };
  return (
    <Comp
      ref={ref}
      className={className}
      style={style}
      variants={variants}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount, margin }}
      {...rest}
    >
      {children}
    </Comp>
  );
});

export interface RevealItemProps extends BaseProps {
  as?: Tag;
  y?: number;
  x?: number;
  duration?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export const RevealItem = forwardRef<HTMLElement, RevealItemProps>(function RevealItem(
  { as = "div", y = 16, x = 0, duration = DUR.reveal, className, style, children, ...rest },
  ref,
) {
  const reduced = useReducedMotionSafe();
  const Comp = motionTag(as);
  const variants: Variants = reduced
    ? {
        hidden: { opacity: 0 },
        // transform "none" ohne Dauer: siehe Reveal (Live-Wechsel der Einstellung)
        shown: { opacity: 1, transform: "none", transition: { duration, ease: EASE_OUT, transform: { duration: 0 } } },
      }
    : {
        hidden: { opacity: 0, transform: `translate3d(${x}px,${y}px,0)` },
        shown: {
          opacity: 1,
          transform: "translate3d(0px,0px,0)",
          transition: { duration, ease: EASE_OUT },
        },
      };
  return (
    <Comp ref={ref} data-fx-reveal="" className={className} style={style} variants={variants} {...rest}>
      {children}
    </Comp>
  );
});
