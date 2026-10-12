import { useEffect, useRef, type RefObject } from "react";
import { useMotionValueEvent, useScroll } from "framer-motion";
import { BREATHE_S, useIsMobile, useMotionTier, usePausedAll, usePauseOffscreen } from "@/components/fx";

/**
 * Abhaengigkeitsnetz hinter der Ausgangslage (#scenarios).
 *
 * Ein sticky Canvas ueber die Hoehe des Viewports. Knoten liegen frei
 * verteilt und werden beim Lesen der Karten in Ringe um drei Anbieter-Hubs
 * gezogen (Kartenfarben); am Leitsatz loest sich das Netz wieder.
 * Gezeichnet wird nur bei Scroll-Aenderung und, auf starken Geraeten, mit
 * 24 fps Leerlauf-Rauschen, solange der Canvas sichtbar, der Tab aktiv und
 * der Pause-Knopf nicht gedrueckt ist. Kein React-State, kein shadowBlur,
 * O(n) pro Bild.
 *
 * Reduzierte Bewegung (sanfte Stufe): keine Scroll-Kopplung und kein
 * Rauschen. Das Netz ruht im halb gefangenen Zustand; Knoten, Linien und
 * Hubs atmen je Hubfarbe phasenversetzt per Alpha (Periode BREATHE_S,
 * 15 fps). Bei Pause steht das Bild; Scroll-Aenderungen werden ohne
 * Leerlauf-Schleife einmalig gezeichnet.
 */

const HUB_COLORS = ["#4B6EFF", "#FF3D57", "#FF9F2E"] as const;
const HUB_RGB = HUB_COLORS.map((hex) => {
  const h = hex.slice(1);
  return `${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)}`;
});
const NODE_RGB = "139,164,255";
const NODE_ALPHA = 0.5;
const NODE_R = 1.6;
const WOBBLE = 4;
const IDLE_FRAME_MS = 1000 / 24;
/** Atem-Schleife bei reduzierter Bewegung: 15 fps reichen fuer Alpha. */
const BREATHE_FRAME_MS = 1000 / 15;
/** Alpha-Faktor beim Atmen: 1 -> 0.55 -> 1 (wie fx-breathe). */
const BREATHE_MIN = 0.55;
/** Glow-Sprite: Kantenlaenge in CSS-Pixeln (vor Skalierung). */
const SPRITE_CSS = 96;
const SCROLL_OFFSET = ["start end", "end start"];

type ScrollOffset = NonNullable<NonNullable<Parameters<typeof useScroll>[0]>["offset"]>;

export interface DependencyNetProps {
  sectionRef: RefObject<HTMLElement | null>;
  /** Die drei Karten (Reihenfolge = Hubfarben). */
  hubRefs: RefObject<HTMLElement | null>[];
}

function clamp01(x: number) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function smoothstep(a: number, b: number, x: number) {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

/** Fang-Grad aus dem Scrollfortschritt der Sektion. */
function captureAt(p: number): number {
  return clamp01(smoothstep(0.15, 0.55, p) - 0.6 * smoothstep(0.75, 0.95, p));
}

/** Deterministischer PRNG (mulberry32). */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Halton-Folge: gleichmaessige, deterministische Streuung. */
function halton(index: number, base: number) {
  let f = 1;
  let r = 0;
  let i = index;
  while (i > 0) {
    f /= base;
    r += f * (i % base);
    i = Math.floor(i / base);
  }
  return r;
}

interface NodeSeed {
  u: number;
  v: number;
  hub: number;
  angle: number;
  radius: number;
  phase: number;
}

function makeSeeds(count: number): NodeSeed[] {
  const rnd = mulberry32(0x5eed1);
  const out: NodeSeed[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      u: halton(i + 7, 2),
      v: halton(i + 7, 3),
      hub: i % 3,
      angle: i * 2.399963 + rnd() * 0.6,
      radius: 40 + rnd() * 70,
      phase: rnd() * Math.PI * 2,
    });
  }
  return out;
}

function makeSprite(rgb: string, dpr: number): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  const px = Math.max(1, Math.round(SPRITE_CSS * dpr));
  c.width = px;
  c.height = px;
  const g = c.getContext("2d");
  if (!g) return null;
  const m = px / 2;
  const grad = g.createRadialGradient(m, m, 0, m, m, m);
  grad.addColorStop(0, `rgba(${rgb},0.55)`);
  grad.addColorStop(0.18, `rgba(${rgb},0.28)`);
  grad.addColorStop(0.5, `rgba(${rgb},0.08)`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, px, px);
  g.fillStyle = `rgba(${rgb},1)`;
  g.beginPath();
  g.arc(m, m, 3.2 * dpr, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "rgba(255,255,255,0.85)";
  g.beginPath();
  g.arc(m, m, 1.3 * dpr, 0, Math.PI * 2);
  g.fill();
  return c;
}

interface Engine {
  /** Zeichnet beim naechsten Frame (Scroll-Aenderung). */
  invalidate: () => void;
  setActive: (active: boolean) => void;
}

const DependencyNet = ({ sectionRef, hubRefs }: DependencyNetProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tier = useMotionTier();
  const mobile = useIsMobile();
  const reduced = tier === "off";
  const lite = tier === "lite" || mobile;

  const engineRef = useRef<Engine | null>(null);
  const captureRef = useRef(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef as RefObject<HTMLElement>,
    offset: SCROLL_OFFSET as unknown as ScrollOffset,
  });

  const pausedAll = usePausedAll();
  const pausedRef = useRef(pausedAll);
  pausedRef.current = pausedAll;

  const activeRef = usePauseOffscreen(canvasRef, {
    onChange: (active) => engineRef.current?.setActive(active),
  });

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    if (reduced) return;
    captureRef.current = captureAt(p);
    engineRef.current?.invalidate();
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const count = reduced ? (mobile ? 40 : 90) : lite ? 40 : 90;
    // Leerlauf-Schleife: Rauschen (voll) bzw. Atmen (reduziert), nie auf lite
    const idleAllowed = !lite;
    const frameMs = reduced ? BREATHE_FRAME_MS : IDLE_FRAME_MS;
    const breatheAmp = (1 - BREATHE_MIN) / 2;
    const breatheMid = 1 - breatheAmp;
    const breath = [1, 1, 1];
    const seeds = makeSeeds(count);
    const byHub: number[][] = [[], [], []];
    seeds.forEach((s, i) => byHub[s.hub].push(i));

    const freeX = new Float32Array(count);
    const freeY = new Float32Array(count);
    const capX = new Float32Array(count);
    const capY = new Float32Array(count);
    const posX = new Float32Array(count);
    const posY = new Float32Array(count);
    const hubX = [0, 0, 0];
    const hubY = [0, 0, 0];

    let w = 0;
    let h = 0;
    let dpr = 1;
    let sprites: (HTMLCanvasElement | null)[] = [null, null, null];
    let spriteDpr = 0;

    let raf = 0;
    let dirty = true;
    let last = 0;
    let disposed = false;

    const measure = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      const devDpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      dpr = Math.min(devDpr, lite || reduced ? 1.5 : 2);
      const bw = Math.round(w * dpr);
      const bh = Math.round(h * dpr);
      if (canvas.width !== bw) canvas.width = bw;
      if (canvas.height !== bh) canvas.height = bh;

      if (spriteDpr !== dpr) {
        sprites = HUB_RGB.map((rgb) => makeSprite(rgb, dpr));
        spriteDpr = dpr;
      }

      const wide = typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia("(min-width: 1024px)").matches
        : false;
      for (let k = 0; k < 3; k++) {
        const card = wide ? hubRefs[k]?.current : null;
        if (card) {
          const r = card.getBoundingClientRect();
          hubX[k] = r.left + r.width / 2 - rect.left;
          hubY[k] = h * 0.3;
        } else {
          hubX[k] = w * (0.2 + 0.3 * k);
          hubY[k] = h * (wide ? 0.3 : 0.16);
        }
      }

      const padX = Math.min(40, w * 0.05);
      const padY = Math.min(40, h * 0.05);
      for (let i = 0; i < count; i++) {
        const s = seeds[i];
        freeX[i] = padX + s.u * (w - padX * 2);
        freeY[i] = padY + s.v * (h - padY * 2);
        const ringScale = wide ? 1 : 0.75;
        capX[i] = hubX[s.hub] + Math.cos(s.angle) * s.radius * ringScale;
        capY[i] = hubY[s.hub] + Math.sin(s.angle) * s.radius * ringScale;
      }
      dirty = true;
    };

    const draw = (c: number, t: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const wob = reduced ? 0 : WOBBLE;
      for (let k = 0; k < 3; k++) {
        breath[k] = reduced
          ? breatheMid + breatheAmp * Math.cos((t / BREATHE_S) * Math.PI * 2 + (k * Math.PI * 2) / 3)
          : 1;
      }
      for (let i = 0; i < count; i++) {
        const ph = seeds[i].phase;
        posX[i] = freeX[i] + (capX[i] - freeX[i]) * c + Math.sin(t * 0.6 + ph) * wob;
        posY[i] = freeY[i] + (capY[i] - freeY[i]) * c + Math.sin(t * 0.6 + ph * 1.7 + 1.3) * wob;
      }

      // Verbindungen: ein Pfad und ein stroke je Hubfarbe
      ctx.lineWidth = 0.6 + c * 0.8;
      const lineAlpha = 0.04 + c * 0.22;
      for (let k = 0; k < 3; k++) {
        const list = byHub[k];
        ctx.beginPath();
        for (let j = 0; j < list.length; j++) {
          const i = list[j];
          ctx.moveTo(posX[i], posY[i]);
          ctx.lineTo(hubX[k], hubY[k]);
        }
        ctx.strokeStyle = `rgba(${HUB_RGB[k]},${(lineAlpha * breath[k]).toFixed(3)})`;
        ctx.stroke();
      }

      // Hubs: vorgerenderte Glow-Sprites
      const scale = 1 + c * 0.4;
      const size = SPRITE_CSS * scale;
      for (let k = 0; k < 3; k++) {
        const sp = sprites[k];
        if (!sp) continue;
        ctx.globalAlpha = breath[k];
        ctx.drawImage(sp, hubX[k] - size / 2, hubY[k] - size / 2, size, size);
      }
      ctx.globalAlpha = 1;

      // Knoten: ein Pfad und ein fill je Hubfarbe (Atem-Phase)
      for (let k = 0; k < 3; k++) {
        const list = byHub[k];
        ctx.fillStyle = `rgba(${NODE_RGB},${(NODE_ALPHA * breath[k]).toFixed(3)})`;
        ctx.beginPath();
        for (let j = 0; j < list.length; j++) {
          const i = list[j];
          ctx.moveTo(posX[i] + NODE_R, posY[i]);
          ctx.arc(posX[i], posY[i], NODE_R, 0, Math.PI * 2);
        }
        ctx.fill();
      }
    };

    const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

    const docVisible = () => !(typeof document !== "undefined" && document.visibilityState === "hidden");
    // Leerlauf-Schleife nur sichtbar, Tab aktiv und ohne Pause-Knopf
    // (activeRef aus usePauseOffscreen beruecksichtigt alle drei).
    const loopOn = () => idleAllowed && activeRef.current && docVisible();
    // Einzelbilder (Scroll) auch bei gedruecktem Pause-Knopf
    const canDraw = () => docVisible() && (activeRef.current || pausedRef.current);

    const frame = (ts: number) => {
      raf = 0;
      if (disposed) return;
      if (!canDraw()) return;
      const loop = loopOn();
      if (dirty || (loop && ts - last >= frameMs)) {
        dirty = false;
        last = ts;
        draw(captureRef.current, ts / 1000);
      }
      if (loop) raf = requestAnimationFrame(frame);
    };

    const kick = () => {
      if (raf || disposed || typeof requestAnimationFrame !== "function") return;
      raf = requestAnimationFrame(frame);
    };

    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    // Startwert aus der aktuellen Scrollposition (reduziert: ruhender Zustand)
    captureRef.current = reduced ? 0.5 : captureAt(scrollYProgress.get());
    measure();
    dirty = false;
    draw(captureRef.current, now() / 1000);

    engineRef.current = {
      invalidate: () => {
        dirty = true;
        if (canDraw()) kick();
      },
      setActive: (active) => {
        if (active) {
          dirty = true;
          kick();
        } else {
          stop();
        }
      },
    };
    if (loopOn()) kick();

    const onResize = () => {
      measure();
      if (canDraw()) kick();
      else {
        dirty = false;
        draw(captureRef.current, now() / 1000);
      }
    };
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(onResize);
      ro.observe(canvas);
    }
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      disposed = true;
      stop();
      ro?.disconnect();
      window.removeEventListener("resize", onResize);
      engineRef.current = null;
    };
    // hubRefs/sectionRef sind stabile Ref-Objekte
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, lite, mobile]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`fx-deco fx-loop${reduced ? " fx-soft" : ""} pointer-events-none sticky top-0 block h-[100svh] w-full`}
    />
  );
};

export default DependencyNet;
