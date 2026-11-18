import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Einmaliger Sichtkontakt (IntersectionObserver). Ohne IntersectionObserver gilt das
 * Element sofort als gesehen, damit nichts unsichtbar bleibt.
 */
export function useSeen<T extends Element = HTMLElement>({
  threshold = 0.3,
  rootMargin = "0px 0px -6% 0px",
}: { threshold?: number; rootMargin?: string } = {}): [RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          if (e.isIntersecting) {
            setSeen(true);
            io.disconnect();
            return;
          }
        }
      },
      { threshold, rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, rootMargin]);
  return [ref, seen];
}
