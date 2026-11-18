// Kleine Hooks fuer die Darstellung des Self-Assessments (keine Fachlogik).
import { useEffect, useState, type RefObject } from "react";
import { useReducedMotionSafe } from "@/components/fx";

// ─── Zeitpunkt nach dem ersten Paint ─────────────────────────────────────────
// Zwei rAF-Takte, damit der Startzustand einmal gemalt ist, bevor die Transition laeuft.
export function afterPaint(cb: () => void): () => void {
  if (typeof requestAnimationFrame !== "function") { cb(); return () => {}; }
  let b = 0;
  const a = requestAnimationFrame(() => { b = requestAnimationFrame(cb); });
  return () => { cancelAnimationFrame(a); cancelAnimationFrame(b); };
}

/** true, sobald das Element (view) erstmals sichtbar wird, sonst gleich nach dem ersten Paint. */
export function useSeen(ref: RefObject<Element | null>, view = false): boolean {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!view) return afterPaint(() => setSeen(true));
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setSeen(true); return; }
    const io = new IntersectionObserver(
      (es) => { if (es.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect(); } },
      { threshold: 0.25, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, view]);
  return seen;
}

// ─── Schritt betreten: nach oben, Fokus auf die Ueberschrift ─────────────────
// Nur nach einer Navigation durch die Besucherin (enabled), nicht beim ersten Laden.
// Das Scrollen folgt der Einstellung fuer reduzierte Bewegung.
export function useStepEntry(enabled: boolean, titleRef: RefObject<HTMLElement | null>): void {
  const reduced = useReducedMotionSafe();
  useEffect(() => {
    if (!enabled) return;
    try { window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" }); } catch { /* ignorieren */ }
    titleRef.current?.focus({ preventScroll: true });
    // einmal beim Einhaengen des Schritts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
