import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useMediaQuery, useMotionTier, useReducedMotionSafe } from "./hooks";
import { BREATHE_S } from "./motion";
import { usePausedAll } from "./pause";

export interface ParticleNetworkProps {
  className?: string;
  /** 'r,g,b' */
  color?: string;
  /** 'r,g,b' */
  accent?: string;
  areaPerParticle?: number;
  max?: number;
  /** Verbindungsdistanz in px */
  link?: number;
  pointer?: boolean;
  pings?: boolean;
}

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  node: boolean;
}

const BUCKETS = 4;
const REPEL_R = 140;
const PING_EVERY = 2500;
const PING_MS = 900;

/**
 * Partikelnetz auf Canvas 2D. Groesse folgt dem Elternelement (ResizeObserver,
 * DPR-scharf), Bewegung zeitbasiert, rAF stoppt ausserhalb des Viewports,
 * bei verstecktem Tab und beim Pause-Knopf (usePausedAll; das letzte Bild
 * bleibt stehen).
 * Reduziert (sanfte Stufe): ruhendes Netz ohne Drift, Zeiger und Pings; nur
 * Punkte und Knoten atmen langsam per Alpha (Periode BREATHE_S, 15 fps).
 */
export function ParticleNetwork({
  className,
  color = "139,164,255",
  accent = "75,110,255",
  areaPerParticle = 16000,
  max = 80,
  link = 120,
  pointer = true,
  pings = true,
}: ParticleNetworkProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const reduced = useReducedMotionSafe();
  const tier = useMotionTier();
  const coarse = useMediaQuery("(pointer: coarse)");
  const fine = useMediaQuery("(hover: hover) and (pointer: fine)");
  const pausedAll = usePausedAll();
  const pausedRef = useRef(pausedAll);
  pausedRef.current = pausedAll;
  const ctlRef = useRef<{ start: () => void; stop: () => void } | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext("2d");
    } catch {
      ctx = null;
    }
    if (!ctx) return;
    const c = ctx;

    const lite = tier !== "full" || coarse;
    const maxN = lite ? Math.min(max, 32) : max;
    const linkD = lite ? Math.min(link, 90) : link;
    const frameMs = reduced ? 1000 / 15 : lite ? 1000 / 30 : 0;
    const breatheMs = BREATHE_S * 1000;
    const usePointer = pointer && !lite && fine && !reduced;
    const usePings = pings && !reduced;

    let w = 0;
    let h = 0;
    let parts: P[] = [];
    let raf = 0;
    let last = 0;
    let lastDraw = 0;
    let visible = false;
    let shown = false;
    let lastPing = 0;
    let ping: { x: number; y: number; t0: number } | null = null;
    const ptr = { x: 0, y: 0, tx: 0, ty: 0, on: false };

    const seed = (n: number) => {
      const out: P[] = [];
      for (let i = 0; i < n; i++) {
        const prev = parts[i];
        const ang = Math.random() * Math.PI * 2;
        const sp = 0.006 + Math.random() * 0.012; // px pro ms
        out.push(
          prev ?? {
            x: Math.random() * w,
            y: Math.random() * h,
            vx: Math.cos(ang) * sp,
            vy: Math.sin(ang) * sp,
            r: 0.6 + Math.random() * 1,
            node: i % 6 === 0,
          },
        );
      }
      parts = out;
    };

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      const nw = Math.max(1, rect.width);
      const nh = Math.max(1, rect.height);
      if (w && h) {
        // vorhandene Partikel proportional mitnehmen
        for (const p of parts) {
          p.x = (p.x / w) * nw;
          p.y = (p.y / h) * nh;
        }
      }
      w = nw;
      h = nh;
      const dpr = Math.min(window.devicePixelRatio || 1, tier === "full" ? 2 : 1.5);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed(Math.round(Math.min(maxN, (w * h) / areaPerParticle)));
      draw(performance.now());
    };

    const step = (dt: number) => {
      if (usePointer) {
        const k = 1 - Math.pow(1 - 0.12, dt / 16.67);
        ptr.x += (ptr.tx - ptr.x) * k;
        ptr.y += (ptr.ty - ptr.y) * k;
      }
      for (const p of parts) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (usePointer && ptr.on) {
          const dx = p.x - ptr.x;
          const dy = p.y - ptr.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < REPEL_R * REPEL_R && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const f = (1 - d / REPEL_R) * 0.06 * dt;
            p.x += (dx / d) * f;
            p.y += (dy / d) * f;
          }
        }
        if (p.x < -10) p.x = w + 10;
        else if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        else if (p.y > h + 10) p.y = -10;
      }
    };

    const draw = (now: number) => {
      c.clearRect(0, 0, w, h);
      const n = parts.length;
      // Linien in 4 Alpha-Eimern, je ein stroke
      const buckets: Path2D[] = [];
      for (let b = 0; b < BUCKETS; b++) buckets.push(new Path2D());
      const l2 = linkD * linkD;
      for (let i = 0; i < n; i++) {
        const a = parts[i];
        for (let j = i + 1; j < n; j++) {
          const b = parts[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 >= l2) continue;
          const s = 1 - Math.sqrt(d2) / linkD;
          const bi = Math.min(BUCKETS - 1, Math.floor(s * BUCKETS));
          buckets[bi].moveTo(a.x, a.y);
          buckets[bi].lineTo(b.x, b.y);
        }
      }
      c.lineWidth = 0.6;
      for (let b = 0; b < BUCKETS; b++) {
        c.strokeStyle = `rgba(${color},${(((b + 0.5) / BUCKETS) * 0.16).toFixed(3)})`;
        c.stroke(buckets[b]);
      }

      // Zeiger-Verbindungen zu den 6 naechsten
      if (usePointer && ptr.on) {
        const near = parts
          .map((p) => ({ p, d: (p.x - ptr.x) ** 2 + (p.y - ptr.y) ** 2 }))
          .sort((x, y) => x.d - y.d)
          .slice(0, 6);
        const path = new Path2D();
        for (const { p } of near) {
          path.moveTo(ptr.x, ptr.y);
          path.lineTo(p.x, p.y);
        }
        c.strokeStyle = `rgba(${accent},0.3)`;
        c.stroke(path);
      }

      // Halos der Knoten
      const halo = new Path2D();
      const dots = new Path2D();
      const nodes = new Path2D();
      for (const p of parts) {
        if (p.node) {
          halo.moveTo(p.x + 6, p.y);
          halo.arc(p.x, p.y, 6, 0, Math.PI * 2);
          nodes.moveTo(p.x + 2, p.y);
          nodes.arc(p.x, p.y, 2, 0, Math.PI * 2);
        } else {
          dots.moveTo(p.x + p.r, p.y);
          dots.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        }
      }
      // Sanfte Stufe: Punkte und Knoten atmen (0.65..1 der Grunddeckkraft)
      const breathe = reduced ? 0.825 + 0.175 * Math.sin((now / breatheMs) * Math.PI * 2) : 1;
      c.fillStyle = `rgba(${color},${(0.08 * breathe).toFixed(3)})`;
      c.fill(halo);
      c.fillStyle = `rgba(${color},${(0.4 * breathe).toFixed(3)})`;
      c.fill(dots);
      c.fillStyle = `rgba(${color},${(0.75 * breathe).toFixed(3)})`;
      c.fill(nodes);

      // Ping an einem Knoten
      if (ping) {
        const k = (now - ping.t0) / PING_MS;
        if (k >= 1) ping = null;
        else {
          const e = 1 - Math.pow(1 - k, 3);
          c.beginPath();
          c.arc(ping.x, ping.y, Math.max(0.1, 18 * e), 0, Math.PI * 2);
          c.strokeStyle = `rgba(${accent},${(0.7 * (1 - k)).toFixed(3)})`;
          c.lineWidth = 1;
          c.stroke();
        }
      }

      if (!shown) {
        shown = true;
        canvas.style.opacity = "1";
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (frameMs && now - lastDraw < frameMs - 1) return;
      const dt = Math.min(32, last ? now - last : 16);
      last = now;
      lastDraw = now;
      if (!reduced) step(dt);
      if (usePings && now - lastPing > PING_EVERY) {
        lastPing = now;
        const nodeList = parts.filter((p) => p.node);
        const p = nodeList[Math.floor(Math.random() * nodeList.length)];
        if (p) ping = { x: p.x, y: p.y, t0: now };
      }
      draw(now);
    };

    const start = () => {
      if (raf || pausedRef.current || !visible || document.visibilityState === "hidden") return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    canvas.style.opacity = "0";
    canvas.style.transition = "opacity 1.2s cubic-bezier(0.23,1,0.32,1)";
    ctlRef.current = { start, stop };

    resize();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => resize());
      ro.observe(parent);
    } else {
      window.addEventListener("resize", resize);
    }

    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver((entries) => {
        for (const e of entries) visible = e.isIntersecting;
        if (visible) start();
        else stop();
      });
      io.observe(canvas);
    } else {
      visible = true;
      start();
    }

    const onVis = () => {
      if (document.visibilityState === "hidden") stop();
      else start();
    };
    document.addEventListener("visibilitychange", onVis);

    const onMove = (e: PointerEvent) => {
      const r = parent.getBoundingClientRect();
      ptr.tx = e.clientX - r.left;
      ptr.ty = e.clientY - r.top;
      if (!ptr.on) {
        ptr.x = ptr.tx;
        ptr.y = ptr.ty;
        ptr.on = true;
      }
    };
    const onLeave = () => {
      ptr.on = false;
    };
    if (usePointer) {
      parent.addEventListener("pointermove", onMove, { passive: true });
      parent.addEventListener("pointerleave", onLeave, { passive: true });
    }

    return () => {
      stop();
      ctlRef.current = null;
      ro?.disconnect();
      window.removeEventListener("resize", resize);
      io?.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      parent.removeEventListener("pointermove", onMove);
      parent.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced, tier, coarse, fine, color, accent, areaPerParticle, max, link, pointer, pings]);

  // Pause-Knopf: rAF beenden bzw. wieder aufnehmen
  useEffect(() => {
    const ctl = ctlRef.current;
    if (!ctl) return;
    if (pausedAll) ctl.stop();
    else ctl.start();
  }, [pausedAll]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={cn("fx-deco pointer-events-none", className)}
      style={{ opacity: 0 }}
    />
  );
}
