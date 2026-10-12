import { useEffect, useRef } from "react";
import { usePausedAll, useReducedMotionSafe } from "@/components/fx";

// Global liquid-glass background field, rendered fixed behind all content.
// The colour glows and dark base live in CSS (.glass-bg in index.css) so a
// media query can give phones a brighter base + stronger glows: OLED panels
// render near-black navy as pure black, which made the subtle desktop glows
// invisible on mobile. Realised as CSS radial-gradients (no blur filter, no
// mix-blend-mode) so it renders identically across iOS Safari and desktop.
//
// Die drei Glows liegen auf eigenen Ebenen, damit sie auf der Startseite
// driften koennen (Aurora). Ob sie driften, entscheidet allein das CSS ueber
// html[data-fx-page='home'] und prefers-reduced-motion (bei reduce steht die
// Aurora, ebenso die Raster-Drift); der Pause-Knopf haelt sie ueber
// html[data-fx-paused='true'] an. Hier laeuft kein JS.
const GlassBackground = () => (
  <div aria-hidden="true" className="glass-bg">
    <div className="glass-blob glass-blob--1" />
    <div className="glass-blob glass-blob--2" />
    <div className="glass-blob glass-blob--3" />
    <div className="glass-bg-grid">
      <div className="glass-bg-grid__lines" />
    </div>
    <div className="glass-grain" />
  </div>
);

export default GlassBackground;

/** Halbe Kantenlaenge des Lichtkegels (.grid-flash ist 480 px gross). */
const HALF = 240;
/** Rasterweite des Grundrasters (.glass-bg-grid__lines). */
const CELL = 64;
/** Weg der Raster-Drift ueber die ganze Seite (Keyframes fx-grid-drift). */
const DRIFT = 192;
const LERP = 0.15;
const EPS = 0.1;

const mod = (a: number, n: number) => ((a % n) + n) % n;

function supportsScrollTimeline(): boolean {
  try {
    return typeof CSS !== "undefined" && typeof CSS.supports === "function" && CSS.supports("animation-timeline: scroll()");
  } catch {
    return false;
  }
}

/**
 * Lichtkegel, der dem Zeiger ueber das Grundraster folgt und dessen Linien
 * aufhellt. Nur fuer feinen Zeiger (entscheidet der Aufrufer). Bei reduzierter
 * Bewegung (zeigergekoppelter Effekt) und bei gedruecktem Pause-Knopf rendert
 * er nichts; der rAF wird beim Abbau beendet. Die Events speichern nur
 * Zielwerte; ein rAF gleitet hinterher, schreibt die Transforms direkt ins
 * DOM und beendet sich, sobald er ruht.
 *
 * Deckungsgleichheit: Das Grundraster liegt bei x = 0 (mod 64) und, mit
 * Raster-Drift, bei y = D (mod 64), D = -192 * Scrollfortschritt (das ist der
 * translateY von fx-grid-drift). Die inneren Linien werden so verschoben, dass
 * ihr Ursprung im Viewport genau auf diese Werte faellt.
 */
export function GridSpotlight() {
  const reduced = useReducedMotionSafe();
  const paused = usePausedAll();
  const enabled = !reduced && !paused;
  const outerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner || typeof window === "undefined") return;

    const root = document.documentElement;
    const timeline = supportsScrollTimeline();
    const wide = typeof window.matchMedia === "function" ? window.matchMedia("(min-width: 768px)") : null;

    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    let started = false;
    let on = false;
    // Versatz des Grundrasters in y (<= 0), so wie ihn fx-grid-drift setzt.
    let drift = 0;
    let lastDrift = Number.NaN;
    let raf = 0;

    const measureDrift = () => {
      if (!timeline || !wide?.matches) {
        drift = 0;
        return;
      }
      const range = root.scrollHeight - root.clientHeight;
      const p = range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0;
      drift = -p * DRIFT;
    };

    const write = () => {
      const ox = cx - HALF;
      const oy = cy - HALF;
      outer.style.transform = `translate3d(${ox}px, ${oy}px, 0)`;
      inner.style.transform = `translate3d(${-mod(ox, CELL)}px, ${-mod(oy - drift, CELL)}px, 0)`;
      lastDrift = drift;
    };

    const tick = () => {
      raf = 0;
      const dx = tx - cx;
      const dy = ty - cy;
      const settled = Math.abs(dx) < EPS && Math.abs(dy) < EPS;
      if (settled) {
        cx = tx;
        cy = ty;
      } else {
        cx += dx * LERP;
        cy += dy * LERP;
      }
      write();
      if (!settled) raf = requestAnimationFrame(tick);
    };

    const kick = () => {
      if (!started || raf) return;
      raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      tx = e.clientX;
      ty = e.clientY;
      if (!started) {
        // erster Kontakt: direkt am Zeiger beginnen statt von (0, 0) heranzufliegen
        started = true;
        cx = tx;
        cy = ty;
      }
      if (!on) {
        on = true;
        outer.dataset.on = "true";
      }
      kick();
    };

    const onLeave = () => {
      if (!on) return;
      on = false;
      outer.dataset.on = "false";
    };

    const onScroll = () => {
      measureDrift();
      if (drift !== lastDrift) kick();
    };

    measureDrift();

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    root.addEventListener("pointerleave", onLeave, { passive: true });
    wide?.addEventListener?.("change", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      root.removeEventListener("pointerleave", onLeave);
      wide?.removeEventListener?.("change", onScroll);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div ref={outerRef} aria-hidden="true" data-on="false" className="grid-flash">
      <div ref={innerRef} className="grid-flash__lines" />
    </div>
  );
}
