// Bewegungssprache der Seite: Kurven, Dauern, Federn und kleine Helfer.
// Alle Effekte beziehen ihre Werte von hier, damit Entree, Bewegung auf dem
// Bildschirm und Exit ueberall gleich klingen.

export type Bezier = [number, number, number, number];

/** Entree: schneller Start, weiches Auslaufen. */
export const EASE_OUT: Bezier = [0.23, 1, 0.32, 1];
/** Bewegung auf dem Bildschirm (von A nach B). */
export const EASE_IN_OUT: Bezier = [0.77, 0, 0.175, 1];
/** Schubladen/Paneele. */
export const EASE_DRAWER: Bezier = [0.32, 0.72, 0, 1];

export const CSS_EASE_OUT = "cubic-bezier(0.23,1,0.32,1)";
export const CSS_EASE_IN_OUT = "cubic-bezier(0.77,0,0.175,1)";

/** Dauern in Sekunden. */
export const DUR = {
  press: 0.16,
  ui: 0.24,
  exit: 0.14,
  reveal: 0.65,
  draw: 0.9,
  count: 1.2,
  /** Crossfade alt -> neu (sanfte Stufe statt Feder/Morph) */
  fade: 0.3,
} as const;

/**
 * Periode (Sekunden) der sanften Opacity-Schleifen bei reduzierter Bewegung
 * (Glow atmet, Strahl atmet, Partikel atmen). Muss >= 2 s bleiben.
 */
export const BREATHE_S = 4;

export const STAGGER = 0.06;

export const SPRING = {
  snappy: { type: "spring", duration: 0.45, bounce: 0.15 },
  morph: { type: "spring", duration: 0.6, bounce: 0.18 },
  soft: { type: "spring", duration: 0.8, bounce: 0.25 },
  /** fuer useSpring */
  tilt: { stiffness: 150, damping: 20 },
  /** fuer useSpring */
  magnet: { stiffness: 260, damping: 18, mass: 0.6 },
} as const;

/** Reveal feuert erst, wenn das Element 12 % ueber dem unteren Rand steht. */
export const VIEWPORT_ONCE = { once: true, margin: "0px 0px -12% 0px" } as const;

/**
 * Verzoegerung (Sekunden, immer >= 0), bis der Strahl eines RadarSweep den
 * Winkel thetaDeg erreicht. RadarSweep startet mit der Vorderkante auf 12 Uhr
 * und dreht im Uhrzeigersinn; theta wird ebenfalls ab 12 Uhr im Uhrzeigersinn
 * gemessen.
 */
export function sweepDelay(thetaDeg: number, periodS: number): number {
  return ((((thetaDeg % 360) + 360) % 360) / 360) * periodS;
}

/**
 * Farbe mit Deckkraft. Versteht #rgb, #rrggbb, #rrggbbaa (Alpha wird
 * multipliziert) und 'r,g,b'-Tripel; alles andere (rgb(), var(), Namen)
 * laeuft ueber color-mix.
 */
export function withAlpha(color: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  const c = color.trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(c);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split("").map((ch) => ch + ch).join("");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const base = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return `rgba(${r},${g},${b},${round3(a * base)})`;
  }
  if (/^\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}$/.test(c)) return `rgba(${c},${round3(a)})`;
  return `color-mix(in srgb, ${c} ${round3(a * 100)}%, transparent)`;
}

function round3(n: number) {
  return Math.round(n * 1000) / 1000;
}

/** Sicherer WAAPI-Aufruf (jsdom und alte Browser kennen element.animate nicht). */
export function safeAnimate(
  el: Element | null | undefined,
  keyframes: Keyframe[] | PropertyIndexedKeyframes,
  options: KeyframeAnimationOptions,
): Animation | null {
  if (!el || typeof (el as HTMLElement).animate !== "function") return null;
  try {
    return (el as HTMLElement).animate(keyframes, options);
  } catch {
    return null;
  }
}

/** Groesste Skalierung eines Pings bei reduzierter Bewegung. */
export const PING_SOFT_MAX_SCALE = 1.15;

/**
 * Keyframe-Skalen eines Pings. Reduziert (sanfte Stufe): Start bei hoechstens
 * 1, Ende bei hoechstens PING_SOFT_MAX_SCALE; der Ring blendet vor allem
 * ueber opacity aus.
 */
export function pingScales(fromScale: number, scale: number, reduced: boolean): [number, number] {
  if (!reduced) return [fromScale, scale];
  const from = Math.min(fromScale, 1);
  return [from, Math.max(from, Math.min(scale, PING_SOFT_MAX_SCALE))];
}
