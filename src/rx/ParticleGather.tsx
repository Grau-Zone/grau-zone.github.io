import { useEffect, useRef, type RefObject } from "react";
import { usePauseOffscreen, useMotionTier } from "@/components/fx";
import { Gather, type GatherOptions } from "./gather";

export interface ParticleGatherProps extends Omit<GatherOptions, "still"> {
  /** Die gepinnte Sektion (hoch, mit sticky-Inhalt). Der Fortschritt 0..1 folgt ihrer Scrollstrecke. */
  sectionRef: RefObject<HTMLElement>;
  /** Bis zu diesem Anteil der Scrollstrecke formen sich die Zeichen (Rest: stehen lassen). */
  range?: number;
  className?: string;
  /** Mitte der Formen in Pixeln, etwa fuer Beschriftungen darunter */
  onLayout?: (items: { cx: number; cy: number; w: number; h: number }[], bottom: number) => void;
}

/**
 * Canvas mit treibenden Punkten, die sich beim Scrollen zu den Formen sammeln.
 * Respektiert Pause-Knopf, reduzierte Bewegung (dann Standbild mit fertigen Formen),
 * Sichtbarkeit und den Tab-Wechsel.
 */
export function ParticleGather({ sectionRef, range = 0.78, className, onLayout, ...opt }: ParticleGatherProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Gather | null>(null);
  const tier = useMotionTier();
  const still = tier === "off";
  const onLayoutRef = useRef(onLayout);
  onLayoutRef.current = onLayout;
  const optRef = useRef(opt);
  optRef.current = opt;

  const active = usePauseOffscreen(canvasRef, {
    onChange: (on) => {
      const e = engineRef.current;
      if (!e) return;
      if (on) e.start();
      else e.stop();
    },
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return;
    const engine = new Gather(canvas, { ...optRef.current, still });
    engine.onLayout = (items, bottom) => onLayoutRef.current?.(items, bottom);
    engineRef.current = engine;

    const update = () => {
      const r = section.getBoundingClientRect();
      const span = Math.max(1, r.height - window.innerHeight);
      engine.setProgress(still ? 1 : -r.top / span / range);
    };
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        update();
      });
    };
    const ro = new ResizeObserver(() => {
      engine.resize();
      update();
    });
    ro.observe(canvas);
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      engine.setPointer(e.clientX - r.left, e.clientY - r.top);
    };
    const onLeave = () => engine.setPointer(-1e5, -1e5);
    window.addEventListener("scroll", onScroll, { passive: true });
    section.addEventListener("pointermove", onMove);
    section.addEventListener("pointerleave", onLeave);
    engine.ready.then(() => {
      update();
      if (active.current && !still) engine.start();
    });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
      ro.disconnect();
      engine.destroy();
      engineRef.current = null;
    };
    // Die Formen werden nur beim Einhaengen gelesen; eine Aenderung von still baut alles neu auf.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionRef, still, range]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
