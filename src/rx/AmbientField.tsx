import { useEffect, useRef } from "react";
import { usePauseOffscreen, useMotionTier } from "@/components/fx";

const flow = (x: number, y: number, t: number) => {
  const f = 0.0017;
  return Math.sin(x * f + t * 0.00019) * 2.2 + Math.cos(y * f * 1.35 - t * 0.00015) * 1.8 + Math.sin((x + y) * f * 0.55 + t * 0.0001);
};

/** Feine, ruhig treibende Linien als Hintergrund tiefgruener Abschnitte. Steht bei Pause oder reduzierter Bewegung. */
export function AmbientField({ className, color = "111,214,154" }: { className?: string; color?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const tier = useMotionTier();
  const loop = useRef<{ start: () => void; stop: () => void } | null>(null);
  usePauseOffscreen(ref, { onChange: (on) => (on ? loop.current?.start() : loop.current?.stop()) });

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const g = canvas.getContext("2d")!;
    let W = 0;
    let H = 0;
    let raf = 0;
    let last = 0;
    type P = { x: number; y: number; px: number; py: number; v: number; life: number };
    let parts: P[] = [];
    const spawn = (q: P) => {
      q.x = Math.random() * W;
      q.y = Math.random() * H;
      q.px = q.x;
      q.py = q.y;
      q.life = 2500 + Math.random() * 4000;
    };
    const paintStill = () => {
      g.clearRect(0, 0, W, H);
      g.fillStyle = `rgba(${color},0.35)`;
      let s = 11;
      const rnd = () => {
        s = (s * 16807) % 2147483647;
        return s / 2147483647;
      };
      for (let i = 0; i < parts.length; i++) g.fillRect(rnd() * W, rnd() * H, 1.4, 1.4);
    };
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(520, Math.max(140, (W * H) / 2600)));
      parts = Array.from({ length: n }, () => {
        const q: P = { x: 0, y: 0, px: 0, py: 0, v: 0.5 + Math.random() * 0.8, life: 0 };
        spawn(q);
        q.life *= Math.random();
        return q;
      });
      g.clearRect(0, 0, W, H);
      if (tier === "off") paintStill();
    };
    const frame = (t: number) => {
      const dt = last ? Math.min(2.5, (t - last) / 16.667) : 1;
      last = t;
      g.globalCompositeOperation = "destination-out";
      g.fillStyle = `rgba(0,0,0,${(1 - Math.pow(1 - 0.07, dt)).toFixed(4)})`;
      g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = "source-over";
      g.strokeStyle = `rgba(${color},0.55)`;
      g.lineWidth = 1;
      g.lineCap = "round";
      g.beginPath();
      for (const q of parts) {
        q.px = q.x;
        q.py = q.y;
        q.life -= 16.667 * dt;
        if (q.life <= 0) {
          spawn(q);
          continue;
        }
        const a = flow(q.x, q.y, t);
        q.x += Math.cos(a) * q.v * 1.2 * dt;
        q.y += Math.sin(a) * q.v * 1.2 * dt;
        if (Math.hypot(q.x - q.px, q.y - q.py) > 0.4) {
          g.moveTo(q.px, q.py);
          g.lineTo(q.x, q.y);
        }
        if (q.x < -10 || q.x > W + 10 || q.y < -10 || q.y > H + 10) spawn(q);
      }
      g.stroke();
      raf = requestAnimationFrame(frame);
    };
    loop.current = {
      start: () => {
        if (tier === "off" || raf) return;
        last = 0;
        raf = requestAnimationFrame(frame);
      },
      stop: () => {
        cancelAnimationFrame(raf);
        raf = 0;
      },
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      loop.current = null;
    };
  }, [tier, color]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
