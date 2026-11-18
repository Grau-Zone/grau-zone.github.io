// Partikel-Feld: Punkte treiben durch ein Stroemungsfeld und fuegen sich, gesteuert vom
// Scrollfortschritt, zu Formen (Logos, Radar). Wenige Punkte suchen zuerst ihren Platz,
// dann werden es exponentiell mehr. Eigene Umsetzung nach dem Vorbild der Zurich-AI-Lab-Seite.
//
// Die Engine kennt kein React. ParticleGather.tsx haengt sie an Pause, reduzierte Bewegung
// und Sichtbarkeit.

const GREEN = "0,128,47";
const INK = "12,19,16";

// [Farbe, Alpha, Linienbreite]: 0-3 treibend, 4-6 an der Form angekommen
const BUCKETS: [string, number, number][] = [
  [GREEN, 0.85, 1.5],
  [GREEN, 0.55, 1.15],
  [GREEN, 0.32, 0.9],
  [INK, 0.5, 0.95],
  [GREEN, 1, 1.9],
  [INK, 1, 1.9],
  ["15,76,110", 1, 1.9],
];

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// Ein Punkt mit Zufallsrang u (0..1) schliesst sich zu diesem Moment des Fortschritts an,
// sodass der Anteil der angeschlossenen Punkte exponentiell waechst.
const GROWTH = 5;
const joinAt = (u: number) => (Math.log(1 + u * (Math.exp(GROWTH) - 1)) / GROWTH) * 0.88;

const flow = (x: number, y: number, t: number) => {
  const f = 0.0017;
  return Math.sin(x * f + t * 0.00019) * 2.2 + Math.cos(y * f * 1.35 - t * 0.00015) * 1.8 + Math.sin((x + y) * f * 0.55 + t * 0.0001);
};

/* ---------- Formen ---------- */

export interface ShapeDef {
  /** Bilddatei (PNG/SVG) auf weissem oder transparentem Grund */
  src?: string;
  /** oder: selbst zeichnen auf einer weissen Flaeche der Kantenlaenge S */
  draw?: (g: CanvasRenderingContext2D, S: number) => void;
  /** Groesse relativ zu den anderen Formen (1 = volle Groesse) */
  scale?: number;
  /** Platzhalter, falls src nicht ladbar ist */
  fallback?: (g: CanvasRenderingContext2D, S: number) => void;
}

interface Cand {
  edge: number[][];
  inner: number[][];
  area: number;
  bw: number;
  bh: number;
  custom: string | null;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

function newMask(S = 360): [HTMLCanvasElement, CanvasRenderingContext2D, number] {
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.fillStyle = "#fff";
  g.fillRect(0, 0, S, S);
  return [c, g, S];
}

function candidatesFromCanvas(c: HTMLCanvasElement): Cand | null {
  const S = c.width;
  const d = c.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, S, S).data;
  const inside = new Uint8Array(S * S);
  let x0 = S, y0 = S, x1 = 0, y1 = 0;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;
      const dist = Math.max(255 - d[i], 255 - d[i + 1], 255 - d[i + 2]);
      if (dist > 70 && d[i + 3] > 128) {
        inside[y * S + x] = 1;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 <= x0 || y1 <= y0) return null;
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, m = Math.max(bw, bh);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const edge: number[][] = [], inner: number[][] = [];
  let cr = 0, cg = 0, cb = 0, cn = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (!inside[y * S + x]) continue;
      const i = (y * S + x) * 4;
      const green = d[i + 1] > d[i] + 30 && d[i + 1] > d[i + 2] + 30;
      const sat = Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]);
      const cls = green ? 0 : sat > 12 ? 2 : 1;
      if (cls === 2 && sat > 40) { cr += d[i]; cg += d[i + 1]; cb += d[i + 2]; cn++; }
      const rec = [(x - cx) / m, (y - cy) / m, cls];
      const isEdge = !inside[y * S + x - 1] || !inside[y * S + x + 1] || !inside[(y - 1) * S + x] || !inside[(y + 1) * S + x];
      (isEdge ? edge : inner).push(rec);
    }
  }
  return { edge, inner, area: (edge.length + inner.length) / (m * m), bw: bw / m, bh: bh / m, custom: cn ? `${Math.round(cr / cn)},${Math.round(cg / cn)},${Math.round(cb / cn)}` : null };
}

async function candidatesFor(def: ShapeDef): Promise<Cand> {
  const [c, g, S] = newMask();
  if (def.src) {
    try {
      const img = await loadImage(def.src);
      const nw = img.naturalWidth || 300, nh = img.naturalHeight || 300;
      const sc = Math.min(S / nw, S / nh);
      g.drawImage(img, (S - nw * sc) / 2, (S - nh * sc) / 2, nw * sc, nh * sc);
      const r = candidatesFromCanvas(c);
      if (r) return r;
    } catch {
      /* Platzhalter */
    }
    def.fallback?.(g, S);
  } else {
    def.draw?.(g, S);
  }
  const r = candidatesFromCanvas(c);
  if (!r) throw new Error("Form ohne Pixel");
  return r;
}

function pick(set: Cand, n: number): number[][] {
  const out: number[][] = [];
  const nEdge = Math.min(set.edge.length, Math.round(n * 0.42));
  for (let i = 0; i < nEdge; i++) out.push(set.edge[(Math.random() * set.edge.length) | 0]);
  for (let i = nEdge; i < n; i++) out.push(set.inner[(Math.random() * set.inner.length) | 0] || set.edge[(Math.random() * set.edge.length) | 0]);
  return out;
}

/* ---------- Engine ---------- */

interface Core {
  x: number; y: number; px: number; py: number;
  tx: number; ty: number;
  v: number; fb: number; sb: number; ph: number; life: number; set: boolean; g0: number;
}
interface Extra { x: number; y: number; tx: number; ty: number; sb: number; ph: number; t0: number; a: number }

export interface GatherOptions {
  shapes: ShapeDef[];
  /** Zusaetzlicher Abstand zwischen den Formen relativ zur Formgroesse (Standard 0.4) */
  gap?: number;
  /** Mittelpunkt der Formgruppe in Anteilen der Flaeche (Standard 0.5 / 0.46) */
  center?: { x: number; y: number };
  /** Groesse der groessten Form in Anteilen von Hoehe und Breite */
  size?: (W: number, H: number) => number;
  /** Anzahl der sichtbar treibenden Punkte */
  density?: number;
  /** Bei true: statisch, alle Formen fertig */
  still?: boolean;
}

export class Gather {
  private canvas: HTMLCanvasElement;
  private g: CanvasRenderingContext2D;
  private opt: Required<Omit<GatherOptions, "size" | "center">> & { size: NonNullable<GatherOptions["size"]>; center: { x: number; y: number } };
  private cands: Cand[] | null = null;
  private W = 0;
  private H = 0;
  private parts: Core[] = [];
  private extras: Extra[] = [];
  private dotScale = 1;
  private progress = 0;
  private frames = 0;
  private last = 0;
  private mouse = { x: -1e5, y: -1e5 };
  private raf = 0;
  private running = false;
  private dead = false;
  /** Rueckgabe der Mitte jeder Form in Pixeln (fuer Beschriftungen) */
  public onLayout?: (items: { cx: number; cy: number; w: number; h: number }[], bottom: number) => void;
  /** Welche Teile der Form-Candidates schon geladen sind */
  public ready: Promise<void>;

  constructor(canvas: HTMLCanvasElement, opt: GatherOptions) {
    this.canvas = canvas;
    this.g = canvas.getContext("2d")!;
    this.opt = {
      shapes: opt.shapes,
      gap: opt.gap ?? 0.4,
      center: opt.center ?? { x: 0.5, y: 0.46 },
      size: opt.size ?? ((W, H) => (W >= 900 ? Math.min(H * 0.46, W * 0.2) : Math.min(W * 0.265, H * 0.2))),
      density: opt.density ?? 1400,
      still: !!opt.still,
    };
    this.ready = Promise.all(opt.shapes.map(candidatesFor)).then((c) => {
      if (this.dead) return;
      this.cands = c;
      const custom = c.map((x) => x.custom).find(Boolean);
      if (custom) BUCKETS[6][0] = custom;
      this.resize(true);
    });
  }

  setOptions(opt: Partial<GatherOptions>) {
    if (opt.still !== undefined) {
      this.opt.still = opt.still;
      this.resize(true);
    }
  }

  setProgress(p: number) {
    this.progress = clamp(p);
    if (this.opt.still) this.paintStill();
  }

  setPointer(x: number, y: number) {
    this.mouse.x = x;
    this.mouse.y = y;
  }

  destroy() {
    this.dead = true;
    this.stop();
  }

  start() {
    if (this.running || this.dead || this.opt.still) return;
    this.running = true;
    this.last = 0;
    this.raf = requestAnimationFrame(this.frame);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  resize(force = false) {
    const r = this.canvas.getBoundingClientRect();
    if (!force && this.parts.length && Math.abs(r.width - this.W) < 3 && Math.abs(r.height - this.H) < 3) return;
    this.W = Math.max(1, r.width);
    this.H = Math.max(1, r.height);
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.W * dpr);
    this.canvas.height = Math.round(this.H * dpr);
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.seed();
    if (this.opt.still) this.paintStill();
  }

  private layout() {
    const { W, H } = this;
    const S = this.opt.size(W, H);
    const shapes = this.opt.shapes;
    const c = this.cands!;
    const sizes = shapes.map((s) => S * (s.scale ?? 1));
    const w = c.map((x, i) => x.bw * sizes[i]);
    const gap = S * this.opt.gap;
    const total = w.reduce((a, b) => a + b, 0) + gap * (shapes.length - 1);
    let x = this.opt.center.x * W - total / 2;
    const cy = this.opt.center.y * H;
    const place = c.map((cd, i) => {
      const cx = x + w[i] / 2;
      x += w[i] + gap;
      return { cx, cy, size: sizes[i], w: w[i], h: cd.bh * sizes[i] };
    });
    return { place, S };
  }

  private seed() {
    if (!this.cands || !this.W) return;
    const { place, S } = this.layout();
    const c = this.cands;
    this.dotScale = clamp(S / 150, 0.55, 1.4);
    const sDot = 1.9 * 1.35 * this.dotScale;
    const area = c.map((cd, i) => cd.area * place[i].size * place[i].size);
    const need = area.map((a) => clamp(Math.round((a / (sDot * sDot)) * 1.9), 120, 9000));
    const coreN = Math.round(clamp((this.W * this.H) / this.opt.density, this.W >= 900 ? 700 : 450, 1500));
    const tot = area.reduce((x, y) => x + y, 0) || 1;
    const share = area.map((x) => x / tot);
    this.parts = [];
    this.extras = [];
    let id = 0;
    c.forEach((cd, si) => {
      const pts = pick(cd, need[si]);
      const core = Math.min(need[si], Math.round(coreN * share[si]));
      const P = place[si];
      pts.forEach(([u, v, cls], j) => {
        const tx = P.cx + u * P.size, ty = P.cy + v * P.size;
        if (j < core) {
          const i = id++;
          const q: Core = {
            x: 0, y: 0, px: 0, py: 0, tx, ty,
            v: 0.55 + Math.random() * 0.9,
            fb: i % 7 === 0 ? 3 : Math.floor(i / 3) % 3,
            sb: 4 + cls, ph: Math.random() * 6.28, life: 0, set: false,
            g0: joinAt(Math.random()),
          };
          this.spawn(q);
          q.life *= Math.random();
          this.parts.push(q);
        } else {
          this.extras.push({ x: tx, y: ty, tx, ty, sb: 4 + cls, ph: Math.random() * 6.28, t0: joinAt(0.03 + Math.random() * 0.97), a: 0 });
        }
      });
    });
    const bottom = Math.max(...place.map((p) => p.cy + p.h / 2));
    this.onLayout?.(place, bottom);
  }

  private spawn(q: Core) {
    q.x = Math.random() * this.W;
    q.y = Math.random() * this.H;
    q.px = q.x;
    q.py = q.y;
    q.life = 3500 + Math.random() * 4500;
  }

  private draw(gl: number) {
    const g = this.g;
    g.lineCap = "round";
    for (let b = 0; b < BUCKETS.length; b++) {
      const [rgb, a, lw] = BUCKETS[b];
      const colour = `rgba(${rgb},${a})`;
      g.strokeStyle = colour;
      g.fillStyle = colour;
      g.lineWidth = lw;
      g.beginPath();
      for (const q of this.parts) {
        if ((q.set ? q.sb : q.fb) !== b) continue;
        let dx = q.x - q.px, dy = q.y - q.py;
        const len = Math.hypot(dx, dy);
        if (len < 0.6) continue;
        if (len > 10) { dx *= 10 / len; dy *= 10 / len; }
        g.moveTo(q.x - dx, q.y - dy);
        g.lineTo(q.x, q.y);
      }
      g.stroke();
      const s = lw * 1.35 * (b >= 4 ? this.dotScale : 1);
      for (const q of this.parts) {
        if ((q.set ? q.sb : q.fb) !== b) continue;
        if (Math.hypot(q.x - q.px, q.y - q.py) < 0.6) g.fillRect(q.x - s / 2, q.y - s / 2, s, s);
      }
      if (b >= 4) {
        for (const q of this.extras) {
          if (q.sb !== b || q.a <= 0) continue;
          const e = s * (0.35 + 0.65 * q.a);
          g.fillRect(q.x - e / 2, q.y - e / 2, e, e);
        }
      }
    }
    void gl;
  }

  private frame = (t: number) => {
    if (!this.running) return;
    this.frames++;
    const { W, H, g } = this;
    const dt = this.last ? Math.min(2.5, (t - this.last) / 16.667) : 1;
    this.last = t;
    const gl = clamp(this.progress);
    const fade = 0.09 + 0.45 * smooth(0, 0.3, gl);
    if (gl > 0.3) {
      g.clearRect(0, 0, W, H);
    } else {
      g.globalCompositeOperation = "destination-out";
      g.fillStyle = `rgba(0,0,0,${(1 - Math.pow(1 - fade, dt)).toFixed(4)})`;
      g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = "source-over";
      if (this.frames % 600 === 0 && gl === 0) g.clearRect(0, 0, W, H);
    }

    const mouse = this.mouse;
    for (const q of this.parts) {
      q.px = q.x;
      q.py = q.y;
      const kq = smooth(0, 1, clamp((gl - q.g0) / 0.12));
      const free = 1 - kq;
      if (free > 0.6) {
        q.life -= 16.667 * dt;
        if (q.life <= 0) { this.spawn(q); continue; }
      }
      const ang = flow(q.x, q.y, t);
      let vx = Math.cos(ang) * q.v * 1.5, vy = Math.sin(ang) * q.v * 1.5;
      const dx = q.x - mouse.x, dy = q.y - mouse.y, d2 = dx * dx + dy * dy;
      if (d2 < 22000) {
        const d = Math.sqrt(d2) + 0.001;
        const push = ((22000 - d2) / 22000) * 6 * free;
        vx += (dx / d) * push;
        vy += (dy / d) * push;
      }
      q.x += vx * free * dt;
      q.y += vy * free * dt;
      if (kq > 0) {
        const wob = Math.sin(t * 0.0016 + q.ph) * 1.4 * (1 - kq * 0.4);
        const ex = q.tx + wob - q.x, ey = q.ty - wob - q.y, dist = Math.hypot(ex, ey) || 0.001;
        const len = Math.min(dist, Math.max(dist * 0.08 * kq, 1.4 * kq), 4 + 10 * kq) * dt;
        q.x += (ex / dist) * len;
        q.y += (ey / dist) * len;
      }
      q.set = kq > 0.3 && Math.abs(q.tx - q.x) < 9 && Math.abs(q.ty - q.y) < 9;
      if (kq < 0.4) {
        if (q.x < -12) { q.x = W + 12; q.px = q.x; } else if (q.x > W + 12) { q.x = -12; q.px = q.x; }
        if (q.y < -12) { q.y = H + 12; q.py = q.y; } else if (q.y > H + 12) { q.y = -12; q.py = q.y; }
      }
    }
    if (gl > 0.03) {
      for (const q of this.extras) {
        q.a = clamp((gl - q.t0) / 0.06);
        if (q.a > 0) {
          const wob = Math.sin(t * 0.0016 + q.ph) * 0.9;
          q.x = q.tx + wob;
          q.y = q.ty - wob;
        }
      }
    } else if (this.extras.length && this.extras[0].a > 0) {
      for (const q of this.extras) q.a = 0;
    }
    this.draw(gl);
    this.raf = requestAnimationFrame(this.frame);
  };

  /** Ruhezustand: ein Standbild mit fertigen Formen (und je nach Fortschritt weniger). */
  paintStill() {
    const { g, W, H } = this;
    if (!W) return;
    g.clearRect(0, 0, W, H);
    let s = 7;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    g.fillStyle = `rgba(${GREEN},0.22)`;
    for (let i = 0; i < Math.min(700, (W * H) / 1800); i++) g.fillRect(rnd() * W, rnd() * H, 1.4, 1.4);
    const sz = 1.9 * 1.35 * this.dotScale;
    for (let b = 4; b < BUCKETS.length; b++) {
      const [rgb, a] = BUCKETS[b];
      g.fillStyle = `rgba(${rgb},${a})`;
      for (const q of this.parts) if (q.sb === b) g.fillRect(q.tx - sz / 2, q.ty - sz / 2, sz, sz);
      for (const q of this.extras) if (q.sb === b) g.fillRect(q.tx - sz / 2, q.ty - sz / 2, sz, sz);
    }
  }
}
