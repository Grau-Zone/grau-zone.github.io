import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { Link } from "react-router-dom";
import {
  CSS_EASE_IN_OUT,
  CSS_EASE_OUT,
  CountUp,
  EASE_OUT,
  LineReveal,
  LockOn,
  Magnetic,
  safeAnimate,
  useFinePointer,
  useInViewOnce,
  useMediaQuery,
  useReducedMotionSafe,
} from "@/components/fx";
import { ParticleGather, radarShape } from "@/rx";

const TICKS = Array.from({ length: 11 }, (_, i) => i);
const GREEN = "#00802f";

/** Startet ein Effekt-Bündel und liefert alle laufenden Animationen. */
type Anim = Animation | null;

/**
 * Messlineal unter "messbar": Grundlinie zieht sich auf, Ticks fallen ein,
 * ein Marker gleitet von 0 auf 100 % und rastet ein. Sitzt in der
 * Unterlaengenzone ("messbar" hat keine Unterlaengen). Der Endzustand steht
 * im DOM, die Animationen laufen nur dorthin (fill: backwards).
 */
const MeasureRuler = ({ hostRef }: { hostRef: RefObject<HTMLElement> }) => {
  const reduced = useReducedMotionSafe();
  const fine = useFinePointer();
  const baseRef = useRef<HTMLSpanElement | null>(null);
  const tickRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const trackRef = useRef<HTMLSpanElement | null>(null);
  const markerRef = useRef<HTMLSpanElement | null>(null);
  const glowRef = useRef<HTMLSpanElement | null>(null);
  const busyUntil = useRef(0);
  const anims = useRef<Anim[]>([]);

  const runMarker = (delay: number, glide: number, fadeIn: boolean): Anim[] => {
    const snap = 150;
    const settle = 450;
    const g = glide / (glide + snap);
    const out: Anim[] = [];
    out.push(
      safeAnimate(
        trackRef.current,
        [{ transform: "translateX(0%)" }, { transform: "translateX(100%)" }],
        {
          duration: glide,
          delay,
          easing: CSS_EASE_IN_OUT,
          fill: "backwards",
        },
      ),
    );
    const op = fadeIn ? 0 : 1;
    out.push(
      safeAnimate(
        markerRef.current,
        [
          { opacity: op, transform: "scale(1)", offset: 0 },
          {
            opacity: 1,
            transform: "scale(1)",
            offset: Math.min(g, 150 / (glide + snap)),
          },
          { opacity: 1, transform: "scale(1)", offset: g },
          {
            opacity: 1,
            transform: "scale(1.3)",
            offset: g,
            easing: CSS_EASE_OUT,
          },
          { opacity: 1, transform: "scale(1)", offset: 1 },
        ],
        { duration: glide + snap, delay, fill: "backwards" },
      ),
    );
    const gg = glide / (glide + settle);
    out.push(
      safeAnimate(
        glowRef.current,
        [
          { opacity: fadeIn ? 0 : 0.35, offset: 0 },
          { opacity: fadeIn ? 0 : 0.35, offset: gg },
          { opacity: 0.8, offset: gg, easing: CSS_EASE_OUT },
          { opacity: 0.35, offset: 1 },
        ],
        { duration: glide + settle, delay, fill: "backwards" },
      ),
    );
    return out;
  };

  // Erster Durchgang ab 0.9 s. Reduzierte Bewegung (sanfte Stufe): Die
  // Grundlinie deckt sich per clip-path auf (zeichnet sich, ohne zu wachsen),
  // die Ticks blenden nur ein, der Marker steht bei 100 % und blendet ein
  // (kein Gleiten, kein Einrasten per scale), der Schein glimmt per opacity auf.
  useEffect(() => {
    const T0 = 900;
    const list: Anim[] = [];
    list.push(
      safeAnimate(
        baseRef.current,
        reduced
          ? [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)" }]
          : [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
        {
          duration: 500,
          delay: T0,
          easing: CSS_EASE_OUT,
          fill: "backwards",
        },
      ),
    );
    tickRefs.current.forEach((el, i) => {
      list.push(
        safeAnimate(
          el,
          reduced
            ? [{ opacity: 0 }, { opacity: 1 }]
            : [
                { opacity: 0, transform: "translateY(-4px)" },
                { opacity: 1, transform: "translateY(0px)" },
              ],
          {
            duration: 300,
            delay: T0 + 100 + i * 25,
            easing: CSS_EASE_OUT,
            fill: "backwards",
          },
        ),
      );
    });
    const M = T0 + 500;
    if (reduced) {
      list.push(
        safeAnimate(markerRef.current, [{ opacity: 0 }, { opacity: 1 }], {
          duration: 600,
          delay: M,
          easing: CSS_EASE_OUT,
          fill: "backwards",
        }),
        safeAnimate(
          glowRef.current,
          [
            { opacity: 0, offset: 0 },
            { opacity: 0.8, offset: 0.55, easing: CSS_EASE_OUT },
            { opacity: 0.35, offset: 1 },
          ],
          { duration: 600 + 450, delay: M, fill: "backwards" },
        ),
      );
    } else {
      list.push(...runMarker(M, 600, true));
    }
    anims.current = list;
    busyUntil.current = performance.now() + M + 600 + 450;

    const onPrint = () =>
      anims.current.forEach((a) => {
        try {
          a?.finish();
        } catch {
          /* ignorieren */
        }
      });
    window.addEventListener("beforeprint", onPrint);
    return () => {
      window.removeEventListener("beforeprint", onPrint);
      anims.current.forEach((a) => a?.cancel());
      anims.current = [];
    };
  }, [reduced]);

  // Hover ueber der h1 (feiner Zeiger): Marker laeuft erneut, nie mitten im Durchgang
  useEffect(() => {
    const host = hostRef.current;
    if (!host || reduced || !fine) return;
    const onEnter = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== "mouse" && e.pointerType !== "pen")
        return;
      const now = performance.now();
      if (now < busyUntil.current) return;
      busyUntil.current = now + 500 + 450;
      anims.current = [
        ...anims.current.filter((a) => a && a.playState !== "finished"),
        ...runMarker(0, 500, false),
      ];
    };
    host.addEventListener("pointerenter", onEnter);
    return () => host.removeEventListener("pointerenter", onEnter);
    // runMarker ist stabil genug: es liest nur Refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostRef, reduced, fine]);

  return (
    <span
      aria-hidden="true"
      className="fx-deco pointer-events-none absolute left-0 w-full"
      style={{ bottom: "0.02em", height: "0.16em" }}
    >
      {/* Grundlinie */}
      <span
        ref={baseRef}
        className="absolute left-0 bottom-0 w-full"
        style={{
          height: 1.5,
          background: GREEN,
          transformOrigin: "left center",
        }}
      />
      {/* 11 Ticks, 0/50/100 doppelt hoch */}
      {TICKS.map((i) => {
        const major = i === 0 || i === 5 || i === 10;
        return (
          <span
            key={i}
            ref={(el) => {
              tickRefs.current[i] = el;
            }}
            className="absolute bottom-0"
            style={{
              left: `${i * 10}%`,
              width: 1,
              marginLeft: i === 0 ? 0 : i === 10 ? -1 : -0.5,
              height: major ? "100%" : "50%",
              background: "rgba(0,128,47,0.8)",
            }}
          />
        );
      })}
      {/* Marker: die Spur verschiebt sich um ihre eigene Breite (= Lineal) */}
      <span
        ref={trackRef}
        className="absolute inset-0"
        style={{ transform: "translateX(100%)" }}
      >
        <span
          ref={glowRef}
          className="absolute rounded-full"
          style={{
            left: -3,
            bottom: 0,
            width: 6,
            height: 6,
            background: "rgba(0,128,47,0.35)",
            boxShadow: "0 0 0 3px rgba(0,128,47,0.14)",
            opacity: 0.35,
          }}
        />
        <span
          ref={markerRef}
          className="absolute"
          style={{
            left: -3,
            bottom: 1.5,
            width: 6,
            height: 5,
            background: GREEN,
            clipPath: "polygon(0 0, 100% 0, 50% 100%)",
            transformOrigin: "50% 100%",
          }}
        />
      </span>
    </span>
  );
};

/** Schaltet einmalig nach `delay` Sekunden auf true, sobald `flag` true ist (ein Render). */
const useDelayedFlag = (flag: boolean, delay: number) => {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!flag || on) return;
    const t = window.setTimeout(() => setOn(true), delay * 1000);
    return () => window.clearTimeout(t);
  }, [flag, on, delay]);
  return on;
};

/** Kennzahl mit Zielerfassung; die Ecken greifen zeitgleich mit dem Zaehlstart. */
const StatValue = ({
  value,
  delay,
  play,
}: {
  value: string;
  delay: number;
  play: boolean;
}) => {
  const lock = useDelayedFlag(play, delay);
  return (
    <LockOn color={GREEN} play={lock}>
      <CountUp value={value} start={play} delay={delay} duration={0.6} />
    </LockOn>
  );
};

const STATS = [
  { value: "70%", label: "EU Cloud-Markt in US-Hand", delay: 0.65 },
  { value: "93%", label: "dt. Firmen digital abhängig", delay: 0.75 },
  { value: "3", label: "Zukunftspfade bis 2030", delay: 0.85 },
];

/** Kennzahlen mit Zaehlung. Auf dem Handy steht die Reihe unter dem Hero, damit sie das Radar nicht ueberdeckt. */
const StatsRow = ({ className }: { className?: string }) => {
  const reduced = useReducedMotionSafe();
  const statsRef = useRef<HTMLDivElement | null>(null);
  // Ohne Randabzug: Die Reihe steht im gepinnten Hero bei 80 bis 90 % der Bildhoehe, der
  // Standardrand (-12 % unten) loeste erst beim Entpinnen aus und setzte die sichtbaren
  // Zahlen dann von 70 % auf 0 % zurueck.
  const statsInView = useInViewOnce(statsRef, { amount: 0.6, margin: "0px" });
  const follow = (delay: number) =>
    reduced
      ? {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          transition: { duration: 0.5, ease: EASE_OUT, delay },
        }
      : {
          initial: { opacity: 0, transform: "translateY(10px)" },
          animate: { opacity: 1, transform: "translateY(0px)" },
          transition: { duration: 0.5, ease: EASE_OUT, delay },
        };
  return (
    <motion.div
      ref={statsRef}
      {...follow(0.57)}
      className={
        "max-w-[32rem] grid-cols-3 gap-4 border-t border-border pt-5 lg:gap-8 " +
        (className ?? "grid")
      }
    >
      {STATS.map(({ value, label, delay }) => (
        <div key={label}>
          <div
            className="relative mb-1 text-3xl font-medium tabular-nums text-ink lg:text-4xl"
            style={{ letterSpacing: "-0.03em" }}
          >
            <StatValue value={value} delay={delay} play={statsInView} />
            {/* Hairline, synchron zur Zaehlung; absolut, also ohne Layout-Einfluss.
                Reduzierte Bewegung: per clip-path aufgedeckt statt skaliert. */}
            <motion.span
              aria-hidden="true"
              className="fx-deco pointer-events-none absolute left-0 -bottom-1 h-px w-6"
              style={{ background: GREEN, transformOrigin: "left center" }}
              initial={
                reduced
                  ? { clipPath: "inset(0 100% 0 0)" }
                  : { transform: "scaleX(0)" }
              }
              animate={
                statsInView
                  ? reduced
                    ? { clipPath: "inset(0 0% 0 0)" }
                    : { transform: "scaleX(1)" }
                  : undefined
              }
              transition={{ duration: 0.6, ease: EASE_OUT, delay }}
            />
          </div>
          <div className="text-xs leading-snug text-muted-foreground">
            {label}
          </div>
        </div>
      ))}
    </motion.div>
  );
};

type Place = { cx: number; cy: number; w: number; h: number };

/** Handy: Abstand zwischen Text und Radar sowie kleinster Radar, der noch neben den Text passt. */
const RADAR_GAP = 20;
const RADAR_MIN = 200;
/** Gemessene Lage des Textblocks (Handy). flow: Text plus Radar passen nicht in die Hoehe. */
type Fit = { flow: boolean; text: number; zone: number; size: number; W: number; H: number };

const Hero = () => {
  const reduced = useReducedMotionSafe();
  const lg = useMediaQuery("(min-width: 1024px)");
  // 1024 bis 1279 px: Das Radar wird kleiner und rueckt nach rechts, damit es den Textblock nicht ueberlagert.
  const xl = useMediaQuery("(min-width: 1280px)");
  const sectionRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLDivElement | null>(null);
  const probeRef = useRef<HTMLDivElement | null>(null);
  const h1Ref = useRef<HTMLElement | null>(null);
  const ctaRef = useRef<HTMLAnchorElement | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [fit, setFit] = useState<Fit | null>(null);

  // Handy: Der gepinnte Rahmen ist genau eine Bildschirmhoehe hoch und schneidet ab,
  // was darueber hinausragt. Auf kurzen Schirmen (360x740, 320x568) laege das Radar
  // sonst ueber dem Text, oder die Knoepfe waeren abgeschnitten. Dort wird nicht
  // gepinnt: Der Text steht in voller Hoehe, das Radar bekommt eine eigene Zone
  // darunter (Partikel sammeln sich beim Scrollen weiterhin dorthin).
  useLayoutEffect(() => {
    if (lg) {
      setFit(null);
      return;
    }
    const stage = stageRef.current;
    const text = textRef.current;
    const probe = probeRef.current;
    if (!stage || !text || !probe) return;
    const measure = () => {
      const H = probe.offsetHeight || window.innerHeight;
      const W = stage.clientWidth;
      const bottom = Math.ceil(text.getBoundingClientRect().bottom - stage.getBoundingClientRect().top);
      const flow = bottom + RADAR_GAP + RADAR_MIN + 12 > H;
      const size = Math.round(Math.min(W * 0.78, 300));
      const zone = Math.round(Math.max(size + 48, H * 0.6));
      setFit((prev) =>
        prev && prev.flow === flow && prev.text === bottom && prev.W === W && prev.H === H
          ? prev
          : { flow, text: bottom, zone, size, W, H },
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(text);
    ro.observe(stage);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [lg]);

  const flow = !lg && !!fit?.flow;
  const flowH = flow && fit ? fit.text + RADAR_GAP + fit.zone : 0;
  // Gepinnt auf dem Handy: Radar nie in den Text hinein, kleiner statt ueberlappend.
  const pinSize = !lg && fit && !fit.flow ? Math.max(120, Math.min(fit.W * 0.78, fit.H * 0.3, fit.H - fit.text - RADAR_GAP - 16)) : null;
  const pinCy = pinSize && fit ? Math.max(0.8, (fit.text + RADAR_GAP + pinSize / 2) / fit.H) : 0.8;
  const gatherKey = lg ? (xl ? "xl" : "lg") : flow ? `flow-${flowH}-${fit?.size}` : `sm-${pinSize ?? 0}`;
  const gatherCenter = lg
    ? xl
      ? { x: 0.74, y: 0.54 }
      : { x: 0.82, y: 0.54 }
    : flow && fit
      ? { x: 0.5, y: (fit.text + RADAR_GAP + fit.zone / 2) / flowH }
      : { x: 0.5, y: pinCy };

  // Scroll-Kopplung: Suchstrahl dreht mit dem Scrollen, das Radar erscheint, sobald die Punkte sich sammeln
  const { scrollYProgress: pin } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const { scrollY } = useScroll();
  const sweepRot = useTransform(pin, (p) => (reduced ? 40 : -50 + 420 * p));
  const sweepOpacity = useTransform(pin, (p) =>
    reduced ? 1 : Math.min(1, Math.max(0, (p - 0.5) / 0.28)),
  );
  const hintOpacity = useTransform(
    scrollY,
    (y) => 1 - Math.min(1, Math.max(0, y / 80)),
  );

  // Reduzierte Bewegung (sanfte Stufe): gleiches Einblenden, ohne y-Versatz
  const follow = (delay: number) =>
    reduced
      ? {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          transition: { duration: 0.5, ease: EASE_OUT, delay },
        }
      : {
          initial: { opacity: 0, transform: "translateY(10px)" },
          animate: { opacity: 1, transform: "translateY(0px)" },
          transition: { duration: 0.5, ease: EASE_OUT, delay },
        };

  return (
    <>
      <section
        ref={sectionRef}
        className="relative"
        style={{ height: flow ? "auto" : lg ? "250vh" : "230vh" }}
      >
        <div
          ref={stageRef}
          className={flow ? "relative overflow-hidden" : "sticky top-0 overflow-hidden"}
          style={{ height: flow ? flowH : "100svh" }}
        >
          {/* Messfuehler: Hoehe des gepinnten Rahmens (100svh), auch im ungepinnten Zustand */}
          <div
            ref={probeRef}
            aria-hidden="true"
            className="pointer-events-none invisible absolute left-0 top-0 w-px"
            style={{ height: "100svh" }}
          />
          {/* Punkte treiben durch ein Strömungsfeld und sammeln sich beim Scrollen zum Radar */}
          {(lg || fit) && (
            <ParticleGather
              key={gatherKey}
              className="absolute inset-0 h-full w-full"
              sectionRef={sectionRef}
              shapes={[radarShape]}
              center={gatherCenter}
              size={(W, H) =>
                lg
                  ? xl
                    ? Math.min(H * 0.8, W * 0.42)
                    : Math.min(H * 0.7, W * 0.31)
                  : flow && fit
                    ? fit.size
                    : pinSize ?? Math.min(W * 0.78, H * 0.3)
              }
              range={0.8}
              onLayout={(items) => setPlace(items[0] ?? null)}
            />
          )}

          {/* Suchstrahl: dreht mit dem Scrollen, kein Dauerlauf */}
          {place && (
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute rounded-full"
              style={{
                left: place.cx - place.w * 0.45,
                top: place.cy - place.w * 0.45,
                width: place.w * 0.9,
                height: place.w * 0.9,
                rotate: sweepRot,
                opacity: sweepOpacity,
                background:
                  "conic-gradient(from 0deg, rgba(0,128,47,0) 0deg 292deg, rgba(0,128,47,0.05) 292deg, rgba(0,128,47,0.2) 358.6deg, rgba(0,128,47,0.85) 360deg)",
                WebkitMaskImage:
                  "radial-gradient(circle, #000 0 99.2%, transparent 100%)",
                maskImage:
                  "radial-gradient(circle, #000 0 99.2%, transparent 100%)",
              }}
            />
          )}

          {/* Heller Grund unter dem Text, damit die Punkte die Schrift nicht stören */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background: lg
                ? "radial-gradient(ellipse 52% 70% at 22% 50%, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.7) 55%, transparent 100%)"
                : flow && fit
                  ? `linear-gradient(180deg, rgba(255,255,255,0.95) 0px, rgba(255,255,255,0.88) ${Math.round(fit.text * 0.74)}px, transparent ${fit.text + RADAR_GAP}px)`
                  : "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.88) 46%, transparent 62%)",
            }}
          />

          {/* Text */}
          <div className="rx-wrap flex h-full flex-col justify-start pt-[96px] lg:justify-center lg:pt-16">
            <div ref={textRef} className="max-w-[40rem]">
              {/* Headline: Zeilen gleiten aus der Maske, die h1 selbst bleibt sichtbar (LCP) */}
              <LineReveal
                ref={h1Ref}
                as="h1"
                trigger="mount"
                delay={0.08}
                stagger={0.09}
                duration={0.8}
                className="rx-h1 mb-6 !text-[clamp(2.5rem,6.2vw,5.6rem)] text-ink"
                lines={[
                  "Digitale",
                  "Souveränität",
                  <>
                    <span className="relative inline-block text-green">
                      messbar
                      <MeasureRuler hostRef={h1Ref} />
                    </span>{" "}
                    machen.
                  </>,
                ]}
              />

              {/* Subline */}
              <motion.p
                {...follow(0.45)}
                className="rx-sub !mt-0 mb-8 max-w-[34rem] !text-base lg:!text-lg"
              >
                Organisationen hängen zunehmend von externen Anbietern ab. Der
                Sovereignty Radar macht ihren Handlungsspielraum messbar.
              </motion.p>

              {/* CTAs */}
              <motion.div {...follow(0.51)} className="flex flex-wrap gap-3">
                <Magnetic strength={0.3} max={10}>
                  <Link
                    ref={ctaRef}
                    to="/assessment"
                    className="rx-pill fx-press text-sm"
                  >
                    {/* inline-block statt flex: sonst faellt das Leerzeichen vor dem Pfeil weg */}
                    <span
                      data-magnet-inner=""
                      className="relative inline-block"
                    >
                      Organisation Self-Assessment{" "}
                      <span className="fx-arrow">→</span>
                    </span>
                  </Link>
                </Magnetic>
                <a
                  href="#scenarios"
                  className="rx-pill rx-pill--ghost fx-press text-sm"
                >
                  Szenarien 2030
                </a>
              </motion.div>

              <StatsRow className="mt-12 hidden lg:grid" />
            </div>
          </div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 lg:block"
          >
            <motion.div
              className="flex flex-col items-center gap-2"
              style={{ opacity: hintOpacity }}
            >
              <div className="relative h-10 w-px overflow-hidden bg-gradient-to-b from-transparent to-ink/25">
                {reduced ? null : (
                  <span
                    aria-hidden="true"
                    className="fx-deco fx-drop fx-loop pointer-events-none absolute left-0 top-0 h-3 w-px bg-gradient-to-b from-transparent to-green"
                    style={{
                      ["--fx-drop-travel" as string]: "40px",
                      // Keine Dauerschleife: drei Tropfen ab dem Einblenden des Hinweises,
                      // danach bleibt der Tropfen unsichtbar (Endframe opacity 0).
                      animationDelay: "1.2s",
                      animationIterationCount: 3,
                      animationFillMode: "both",
                    }}
                  />
                )}
              </div>
              <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                Scroll
              </span>
            </motion.div>
          </motion.div>
        </div>
      </section>
      <div className="rx-wrap pb-10 pt-2 lg:hidden">
        <StatsRow className="grid" />
      </div>
    </>
  );
};

export default Hero;
