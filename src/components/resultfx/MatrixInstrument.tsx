// Instrumenten-Deko fuer beide Matrizen (Souveraenitaets- und
// Transparenz-Matrix): Grundplatte, feines Raster, Lineale ohne Zahlen,
// Luenetten-Ecken, sich zeichnende Achsen, Fadenkreuz und Spur. Alles ist
// aria-hidden, nicht klickbar (fx-deco) und traegt keine Werte: Positionen,
// Skalen und die Teilung bei 0.5 bleiben allein Sache der Matrix selbst.
// Reine Deko-Overlays (Achsen, Fadenkreuz, Spur) enden unsichtbar.

import { useId } from "react";
import { CSS_EASE_IN_OUT, CSS_EASE_OUT } from "../fx";
import type { FxStep } from "./play";
import { MATRIX_T } from "./timeline";

/** Eindeutige, in SVG-ids zulaessige Kennung. */
export function useSvgUid(): string {
  return useId().replace(/[^a-zA-Z0-9_-]/g, "");
}

type Box = { W: number; H: number; P: number };

const NS = "non-scaling-stroke" as const;

/** Weicher Lichtfleck hinter dem Feld. Als ERSTES Kind der Matrix rendern. */
export function MatrixPlate({ W, H, P }: Box) {
  const uid = useSvgUid();
  return (
    <g aria-hidden="true" className="fx-deco" pointerEvents="none" data-mx="plate">
      <defs>
        <radialGradient id={`${uid}pl`} gradientUnits="userSpaceOnUse" cx={W / 2} cy={H / 2} r={(W - 2 * P) * 0.75}>
          <stop offset="0" stopColor="#8BA4FF" stopOpacity="0.075" />
          <stop offset="1" stopColor="#8BA4FF" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x={P} y={P} width={W - 2 * P} height={H - 2 * P} fill={`url(#${uid}pl)`} />
    </g>
  );
}

export type MatrixInstrumentProps = Box & {
  /** Rasterlinien, normiert 0..1 (0.5 wird ignoriert: die Teilung bleibt allein) */
  xGrid: number[];
  yGrid: number[];
  /** Lineal-Striche, normiert 0..1 */
  xMajor: number[];
  xMinor: number[];
  yMajor: number[];
  yMinor: number[];
};

const notHalf = (v: number) => Math.abs(v - 0.5) > 1e-9;

/** Raster, Lineale nach aussen und Luenetten-Ecken. */
export function MatrixInstrument({ W, H, P, xGrid, yGrid, xMajor, xMinor, yMajor, yMinor }: MatrixInstrumentProps) {
  const iw = W - 2 * P;
  const ih = H - 2 * P;
  const X = (v: number) => P + v * iw;
  const Y = (v: number) => H - P - v * ih;

  const grid = [
    ...xGrid.filter(notHalf).map((v) => `M ${X(v)} ${P} L ${X(v)} ${H - P}`),
    ...yGrid.filter(notHalf).map((v) => `M ${P} ${Y(v)} L ${W - P} ${Y(v)}`),
  ].join(" ");

  const ticks = (xs: number[], ys: number[], len: number) =>
    [
      ...xs.map((v) => `M ${X(v)} ${H - P} L ${X(v)} ${H - P + len}`),
      ...ys.map((v) => `M ${P - len} ${Y(v)} L ${P} ${Y(v)}`),
    ].join(" ");
  const major = ticks(xMajor, yMajor, 6);
  const minor = ticks(xMinor, yMinor, 3);

  const corners: Array<[number, number]> = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ];

  return (
    <g aria-hidden="true" className="fx-deco" pointerEvents="none">
      {grid && (
        <path
          data-mx="grid"
          d={grid}
          fill="none"
          stroke="rgba(190,210,230,0.05)"
          strokeWidth={0.75}
          vectorEffect={NS}
        />
      )}
      {major && (
        <path data-mx="ruler" d={major} fill="none" stroke="rgba(190,210,230,0.35)" strokeWidth={1} vectorEffect={NS} />
      )}
      {minor && (
        <path data-mx="ruler" d={minor} fill="none" stroke="rgba(190,210,230,0.18)" strokeWidth={1} vectorEffect={NS} />
      )}
      {corners.map(([sx, sy]) => {
        const cx = sx < 0 ? P : W - P;
        const cy = sy < 0 ? P : H - P;
        return (
          <path
            key={`${sx}${sy}`}
            data-mx="corner"
            data-sx={sx}
            data-sy={sy}
            d={`M ${cx} ${cy - sy * 12} L ${cx} ${cy} L ${cx - sx * 12} ${cy}`}
            fill="none"
            stroke="rgba(139,164,255,0.42)"
            strokeWidth={1.4}
            strokeLinecap="square"
            vectorEffect={NS}
          />
        );
      })}
    </g>
  );
}

/**
 * Zwei helle Kopien der Rahmenlinien, die sich vom Ursprung unten links
 * zeichnen, den Rahmen schliessen und wieder verschwinden (Endzustand unsichtbar).
 */
export function MatrixAxesDraw({ W, H, P }: Box) {
  const d1 = `M ${P} ${H - P} L ${P} ${P} L ${W - P} ${P}`;
  const d2 = `M ${P} ${H - P} L ${W - P} ${H - P} L ${W - P} ${P}`;
  return (
    <g aria-hidden="true" className="fx-deco" pointerEvents="none">
      {[d1, d2].map((d) => (
        <path
          key={d}
          data-mx="axis"
          d={d}
          pathLength={1}
          strokeDasharray="1 1"
          strokeDashoffset={0}
          fill="none"
          stroke="rgba(214,230,245,0.8)"
          strokeWidth="1.2"
          style={{ opacity: 0 }}
        />
      ))}
    </g>
  );
}

/** Rundes Fadenkreuz um den eigenen Punkt; rastet einmal ein und endet unsichtbar. */
export function MatrixReticle({ cx, cy, color }: { cx: number; cy: number; color: string }) {
  const arms = [
    `M ${cx} ${cy - 15} L ${cx} ${cy - 20}`,
    `M ${cx + 15} ${cy} L ${cx + 20} ${cy}`,
    `M ${cx} ${cy + 15} L ${cx} ${cy + 20}`,
    `M ${cx - 15} ${cy} L ${cx - 20} ${cy}`,
  ].join(" ");
  return (
    <g
      data-mx="reticle"
      aria-hidden="true"
      className="fx-deco"
      pointerEvents="none"
      style={{ opacity: 0, transformBox: "fill-box", transformOrigin: "center" }}
    >
      <circle cx={cx} cy={cy} r={13} fill="none" stroke={color} strokeWidth={1.2} />
      <path d={arms} fill="none" stroke="rgba(214,230,245,0.8)" strokeWidth={1} />
    </g>
  );
}

/** Helle Spur entlang eines Pfads; zeichnet sich und blendet aus (Endzustand unsichtbar). */
export function TraceDraw({ d, color, width = 2.4 }: { d: string; color: string; width?: number }) {
  return (
    <path
      data-mx="trace"
      aria-hidden="true"
      className="fx-deco"
      pointerEvents="none"
      d={d}
      pathLength={1}
      strokeDasharray="1 1"
      strokeDashoffset={0}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      style={{ opacity: 0 }}
    />
  );
}

const FADE_IN: Keyframe[] = [{ opacity: 0 }, { opacity: 1 }];

/** Zeichnen bis drawEnd, danach Ausblenden; Ende unsichtbar. */
function drawThenFade(drawEnd: number): Keyframe[] {
  return [
    { strokeDashoffset: 1, opacity: 1, offset: 0, easing: CSS_EASE_IN_OUT },
    { strokeDashoffset: 0, opacity: 1, offset: drawEnd, easing: "ease-out" },
    { strokeDashoffset: 0, opacity: 0, offset: 1 },
  ];
}

function all(host: Element, key: string): Element[] {
  return Array.from(host.querySelectorAll(`[data-mx="${key}"]`));
}

/** Entree-Schritte der Instrumenten-Deko (Zeiten aus MATRIX_T). */
export function instrumentSteps(host: Element, reduced: boolean): FxStep[] {
  const T = MATRIX_T;
  const steps: FxStep[] = [];
  all(host, "plate").forEach((el) => steps.push({ el, keyframes: FADE_IN, duration: 600, delay: T.plate }));
  all(host, "grid").forEach((el) => steps.push({ el, keyframes: FADE_IN, duration: 500, delay: T.grid }));
  all(host, "ruler").forEach((el, i) =>
    steps.push({ el, keyframes: FADE_IN, duration: 400, delay: T.ruler + i * 60 }),
  );
  all(host, "corner").forEach((el) => {
    const sx = Number(el.getAttribute("data-sx")) || 0;
    const sy = Number(el.getAttribute("data-sy")) || 0;
    steps.push({
      el,
      keyframes: reduced
        ? FADE_IN
        : [
            // Start 6 px weiter aussen (links/oben = negativ), faehrt ins Feld ein
            { transform: `translate(${sx * 6}px,${sy * 6}px)`, opacity: 0 },
            { transform: "translate(0px,0px)", opacity: 1 },
          ],
      duration: 450,
      delay: T.corner,
      easing: CSS_EASE_OUT,
    });
  });
  all(host, "axis").forEach((el) =>
    steps.push({ el, keyframes: drawThenFade(0.7), duration: T.axesDur, delay: T.axes, easing: "linear" }),
  );
  all(host, "axis-label").forEach((el) =>
    steps.push({ el, keyframes: FADE_IN, duration: 300, delay: T.axisLabel }),
  );
  all(host, "reticle").forEach((el) =>
    steps.push({
      el,
      keyframes: reduced
        ? [{ opacity: 0 }, { opacity: 1, offset: 0.4 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }]
        : [
            { transform: "scale(1.8)", opacity: 0, offset: 0, easing: CSS_EASE_OUT },
            { transform: "scale(1)", opacity: 1, offset: 0.4 },
            { transform: "scale(1)", opacity: 1, offset: 0.75 },
            { transform: "scale(1)", opacity: 0, offset: 1 },
          ],
      duration: T.reticleDur,
      delay: T.reticle,
      easing: "linear",
    }),
  );
  all(host, "trace").forEach((el) =>
    steps.push({ el, keyframes: drawThenFade(0.625), duration: T.traceDur, delay: T.trace, easing: "linear" }),
  );
  return steps;
}
