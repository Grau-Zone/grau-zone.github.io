import { useRef, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CSS_EASE_IN_OUT, DUR, EASE_OUT, SPRING } from "./motion";
import { useReducedMotionSafe } from "./hooks";

type Id = string | number;

export interface PillItem<T extends Id = Id> {
  id: T;
  label: string;
  color: string;
  colorBg: string;
  colorBorder: string;
}

export interface SegmentedPillsProps<T extends Id = Id> {
  items: PillItem<T>[];
  value: T;
  onChange: (id: NoInfer<T>) => void;
  /** eindeutig je Instanz; auch Praefix der Tab-IDs */
  layoutId: string;
  panelId: string;
  ariaLabel?: string;
  className?: string;
}

/**
 * Tabs als Pillen mit gleitendem Aktiv-Hintergrund (layoutId).
 * Reduzierte Bewegung (sanfte Stufe): Crossfade alt -> neu statt Feder.
 * role=tablist/tab, Roving tabIndex, Pfeil links/rechts, Home und End.
 */
export function SegmentedPills<T extends Id>({
  items,
  value,
  onChange,
  layoutId,
  panelId,
  ariaLabel,
  className,
}: SegmentedPillsProps<T>) {
  const reduced = useReducedMotionSafe();
  const btns = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    let next = -1;
    if (e.key === "ArrowRight") next = (idx + 1) % items.length;
    else if (e.key === "ArrowLeft") next = (idx - 1 + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(items[next].id);
    btns.current[next]?.focus();
  };

  return (
    <div role="tablist" aria-label={ariaLabel} className={cn("flex flex-wrap gap-3", className)}>
      {items.map((it, i) => {
        const active = it.id === value;
        return (
          <button
            key={String(it.id)}
            ref={(n) => {
              btns.current[i] = n;
            }}
            type="button"
            role="tab"
            id={`${layoutId}-tab-${it.id}`}
            aria-selected={active}
            aria-controls={panelId}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(it.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className="fx-press relative rounded-full px-4 py-2 text-sm font-semibold"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              background: active ? "transparent" : "rgba(255,255,255,0.04)",
              border: `1px solid ${active ? "transparent" : "rgba(255,255,255,0.08)"}`,
              // Eigener Stapelkontext, damit Pille und Statuspunkt (z -1) unter
              // dem Fokusring liegen; Chrome und Safari malen die Outline sonst
              // vor positionierten Kindern.
              // Reduziert: immer, damit die ausblendende Pille am alten Platz
              // sichtbar bleibt, bis sie weg ist.
              isolation: active || reduced ? "isolate" : undefined,
            }}
          >
            {reduced ? (
              // Sanfte Stufe: keine Feder-Fahrt, der Hintergrund blendet am
              // Ziel ein und am alten Platz aus (Crossfade, DUR.fade).
              <AnimatePresence initial={false}>
                {active ? (
                  <motion.span
                    key="pill"
                    aria-hidden="true"
                    className="pointer-events-none absolute rounded-full"
                    style={{ inset: -1, zIndex: -1, background: it.colorBg, border: `1px solid ${it.colorBorder}` }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: DUR.fade, ease: EASE_OUT }}
                  >
                    <span
                      className="absolute -right-1 -top-1 h-2 w-2 rounded-full"
                      style={{ background: it.color, boxShadow: `0 0 6px ${it.color}` }}
                    />
                  </motion.span>
                ) : null}
              </AnimatePresence>
            ) : active ? (
              <motion.span
                layoutId={layoutId}
                aria-hidden="true"
                className="pointer-events-none absolute rounded-full"
                style={{ inset: -1, zIndex: -1, background: it.colorBg, border: `1px solid ${it.colorBorder}` }}
                transition={SPRING.snappy}
              >
                <span
                  className="absolute -right-1 -top-1 h-2 w-2 rounded-full"
                  style={{ background: it.color, boxShadow: `0 0 6px ${it.color}` }}
                />
              </motion.span>
            ) : null}
            <span
              className="relative z-10"
              style={{
                color: active ? it.color : "rgba(255,255,255,0.5)",
                // Farbe ist auch bei reduzierter Bewegung erlaubt (sanfte Stufe)
                transition: `color 200ms ${CSS_EASE_IN_OUT}`,
              }}
            >
              {it.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export interface DotNavItem<T extends Id = Id> {
  id: T;
  label: string;
  color: string;
}

export interface DotNavProps<T extends Id = Id> {
  items: DotNavItem<T>[];
  value: T;
  onChange: (id: NoInfer<T>) => void;
  className?: string;
}

/** Punkt-Navigation: 28x24-Klickflaeche, aktive Pille per scaleX (kein width). */
export function DotNav<T extends Id>({ items, value, onChange, className }: DotNavProps<T>) {
  const reduced = useReducedMotionSafe();
  return (
    <div className={cn("flex justify-center", className)}>
      {items.map((it) => {
        const active = it.id === value;
        return (
          <button
            key={String(it.id)}
            type="button"
            aria-label={it.label}
            aria-pressed={active}
            onClick={() => onChange(it.id)}
            // focus-visible:z-10: der Fokusring liegt ueber der aktiven Nachbar-Pille
            className="fx-press relative flex h-6 w-7 items-center justify-center rounded-full focus-visible:z-10"
          >
            <span
              aria-hidden="true"
              className="block h-2 w-2 rounded-full"
              style={{
                background: active ? it.color : "rgba(255,255,255,0.15)",
                transform: active ? "scaleX(3.5)" : "scaleX(1)",
                // reduziert: nur die Farbe gleitet, die Pille springt
                transition: reduced
                  ? `background-color 300ms ${CSS_EASE_IN_OUT}`
                  : `transform 300ms ${CSS_EASE_IN_OUT}, background-color 300ms ${CSS_EASE_IN_OUT}`,
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
