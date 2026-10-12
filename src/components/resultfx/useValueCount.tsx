// Zaehler fuer Werte der Ergebnisseite: schreibt Zwischenstaende direkt in den
// Text-Knoten (kein React-State pro Frame). Der Endwert steht immer im DOM:
// ohne Animation, im Druck, bei verstecktem Tab und nach jedem Abbruch.
// Zaehlen gehoert zur sanften Stufe und laeuft daher auch bei reduzierter
// Bewegung. EASE_OUT / EASE_IN_OUT schwingen nicht ueber, das Ende ist exakt final.

import { useEffect, useLayoutEffect, useRef, type CSSProperties, type RefObject } from "react";
import { animate } from "framer-motion";
import { EASE_OUT, useInViewOnce } from "../fx";
import { canRunFx } from "./play";

export type CountOpts = {
  from: number;
  to: number;
  /** Zwischenwert -> Anzeige */
  format: (v: number) => string;
  /** exakter Endtext (steht immer im DOM, wenn nichts laeuft) */
  final: string;
  /** Millisekunden ab Sichtkontakt */
  delayMs: number;
  /** Millisekunden */
  durMs: number;
  /** Standard EASE_OUT */
  ease?: [number, number, number, number];
  /** Standard true */
  enabled?: boolean;
  /** Element, dessen Sichtkontakt den Zaehler startet */
  hostRef?: RefObject<Element | null>;
  /** alternativ: Selektor fuer textRef.current.closest(...) */
  hostClosest?: string;
};

type Ctrl = { stop: () => void };

/**
 * Schreibt Text, ohne React den Text-Knoten wegzunehmen: hat das Element genau
 * einen Text-Knoten als Kind, wird nur dessen nodeValue ersetzt.
 */
function writeText(el: Element | null | undefined, s: string) {
  if (!el) return;
  const first = el.firstChild;
  if (first && first.nodeType === 3 && el.childNodes.length === 1) first.nodeValue = s;
  else el.textContent = s;
}

/** Liegt el beim Aufruf (teilweise) im Viewport? Gleiche Schwelle wie amount 0. */
function isOnScreen(el: Element): boolean {
  if (typeof window === "undefined") return false;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return false;
  const vw = window.innerWidth || document.documentElement.clientWidth;
  const vh = window.innerHeight || document.documentElement.clientHeight;
  return r.bottom > 0 && r.right > 0 && r.top < vh && r.left < vw;
}

function hostDataset(el: Element | null | undefined): DOMStringMap | undefined {
  return (el as HTMLElement | SVGElement | null | undefined)?.dataset;
}

/**
 * Zaehlt den Text von textRef beim ersten Sichtkontakt des Hosts von from nach
 * to. Aufrufer rendern das Zielelement mit genau EINEM Ausdruck als Kind und
 * key={final}. Ein Host, der schon einmal gezaehlt hat (data-rfx-seen="1"),
 * zaehlt nach einem Remount nicht erneut.
 */
export function useValueCount(textRef: RefObject<Element | null>, o: CountOpts): void {
  const optsRef = useRef(o);
  optsRef.current = o;
  const hostInternal = useRef<Element | null>(null);
  const inView = useInViewOnce(hostInternal, { amount: 0, margin: "0px" });
  const armedRef = useRef(false);
  const startedRef = useRef(false);
  /** Startwert steht vorab im DOM (nur bei Host im Bild beim Mount). */
  const primedRef = useRef(false);
  const ctrlRef = useRef<Ctrl | null>(null);
  const firstFinalRef = useRef(o.final);

  // Host bestimmen und scharfschalten (einmal pro Mount, vor dem ersten Bild).
  // Der Startwert wird NICHT vorab geschrieben: bis zum Sichtkontakt steht der
  // Endtext im DOM (Druck, Kopieren, Markieren). Einzige Ausnahme: Der Host ist
  // schon beim Mount im Bild. Dann startet der Zaehler ohnehin im naechsten
  // Frame, und das Vorab-Schreiben verhindert ein Aufblitzen des Endwerts. Fuer
  // dieses kurze Fenster stellen Druck und verstecktes Tab den Endtext her.
  useLayoutEffect(() => {
    const el = textRef.current;
    const opts = optsRef.current;
    const host =
      opts.hostRef?.current ?? (opts.hostClosest && el ? el.closest(opts.hostClosest) : null) ?? el ?? null;
    hostInternal.current = host;
    if (!el || !host) return;
    if (opts.enabled === false || !canRunFx() || hostDataset(host)?.rfxSeen === "1") return;
    armedRef.current = true;
    if (isOnScreen(host)) {
      writeText(el, opts.format(opts.from));
      primedRef.current = true;
    }
    const restore = () => {
      if (startedRef.current || !primedRef.current) return;
      primedRef.current = false;
      writeText(el, optsRef.current.final);
    };
    const onPrint = () => {
      if (startedRef.current) return;
      armedRef.current = false;
      restore();
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") restore();
    };
    window.addEventListener("beforeprint", onPrint);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("beforeprint", onPrint);
      document.removeEventListener("visibilitychange", onVis);
      armedRef.current = false;
      primedRef.current = false;
      writeText(el, optsRef.current.final);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Endwert hat sich geaendert: nie einen alten Zwischenstand stehen lassen.
  useEffect(() => {
    if (o.final === firstFinalRef.current) return;
    firstFinalRef.current = o.final;
    if (!startedRef.current) {
      armedRef.current = false;
      primedRef.current = false;
    } else if (ctrlRef.current) {
      ctrlRef.current.stop();
      ctrlRef.current = null;
    }
    writeText(textRef.current, o.final);
  }, [o.final, textRef]);

  useEffect(() => {
    if (!inView || !armedRef.current || startedRef.current) return;
    startedRef.current = true;
    const host = hostInternal.current;
    const ds = hostDataset(host);
    if (ds) ds.rfxSeen = "1";
    const opts = optsRef.current;
    primedRef.current = false;
    const finish = () => writeText(textRef.current, optsRef.current.final);
    // canRunFx deckt verstecktes Tab und laufenden Druck ab: dann Endtext.
    if (!canRunFx()) {
      finish();
      return;
    }
    // Erst jetzt den Startwert schreiben (er steht waehrend der Verzoegerung).
    writeText(textRef.current, opts.format(opts.from));
    const controls = animate(opts.from, opts.to, {
      duration: opts.durMs / 1000,
      delay: opts.delayMs / 1000,
      ease: opts.ease ?? EASE_OUT,
      onUpdate: (v) => writeText(textRef.current, optsRef.current.format(v)),
      onComplete: () => {
        ctrlRef.current = null;
        finish();
      },
    });
    ctrlRef.current = controls;
    const stopAndFinish = () => {
      ctrlRef.current?.stop();
      ctrlRef.current = null;
      finish();
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") stopAndFinish();
    };
    window.addEventListener("beforeprint", stopAndFinish);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("beforeprint", stopAndFinish);
      document.removeEventListener("visibilitychange", onVis);
      stopAndFinish();
    };
  }, [inView, textRef]);
}

/**
 * Zaehlender Text. Sichtbar zaehlt eine aria-hidden-Kopie, Screenreader lesen
 * nur den Endwert.
 */
export function CountText(props: CountOpts & { className?: string; style?: CSSProperties }) {
  const { className, style, final } = props;
  const r = useRef<HTMLSpanElement>(null);
  useValueCount(r, props);
  return (
    <span className={className} style={style}>
      {/* select-none: Beim Markieren und Kopieren landet nur die sr-only-Kopie
          in der Zwischenablage, der Wert also nicht doppelt ("4 4"). */}
      <span ref={r} key={final} aria-hidden="true" className="select-none">
        {final}
      </span>
      <span className="sr-only">{final}</span>
    </span>
  );
}
