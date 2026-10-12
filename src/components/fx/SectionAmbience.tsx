import { useEffect, useRef } from "react";
import { withAlpha } from "./motion";

export interface SectionAmbienceProps {
  sections: { id: string; color: string }[];
}

/**
 * Farbklima je Sektion: fixe Ebenen hinter dem Inhalt, eine pro Sektion.
 * Ein IntersectionObserver setzt data-active direkt am DOM (kein State), die
 * Ueberblendung laeuft per CSS (.fx-ambience-layer in index.css).
 *
 * Derselbe Observer schaltet die Aurora-Drift des Hintergrunds: Sie laeuft
 * nur, solange die erste Sektion noch unterhalb des Bands liegt (also im
 * Hero-Bereich), und steht beim Lesen still (html[data-fx-aurora]). So muss
 * der Compositor die Glasflaechen nicht in jedem Frame neu weichzeichnen.
 */
export function SectionAmbience({ sections }: SectionAmbienceProps) {
  const layers = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const key = sections.map((s) => s.id).join("|");

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const els = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => !!el)
      .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    const first = els[0] ?? null;
    const root = document.documentElement;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const layer = layers.current.get((e.target as HTMLElement).id);
          if (layer) layer.dataset.active = e.isIntersecting ? "true" : "false";
          if (e.target === first) {
            const bandBottom = e.rootBounds?.bottom ?? window.innerHeight * 0.65;
            const inHero = !e.isIntersecting && e.boundingClientRect.top >= bandBottom;
            root.dataset.fxAurora = inHero ? "on" : "off";
          }
        }
      },
      { rootMargin: "-35% 0px -35% 0px" },
    );
    for (const el of els) io.observe(el);
    return () => {
      io.disconnect();
      delete root.dataset.fxAurora;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <div aria-hidden="true" className="fx-deco pointer-events-none fixed inset-0 z-[-1]">
      {sections.map((s) => (
        <div
          key={s.id}
          ref={(n) => {
            layers.current.set(s.id, n);
          }}
          data-active="false"
          className="fx-ambience-layer absolute inset-0"
          style={{
            background: `radial-gradient(70vmax 60vmax at 50% 45%, ${withAlpha(s.color, 0.11)}, transparent 70%)`,
          }}
        />
      ))}
    </div>
  );
}
