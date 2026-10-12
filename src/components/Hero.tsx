import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Link } from "react-router-dom";
import {
  CSS_EASE_IN_OUT,
  CSS_EASE_OUT,
  CountUp,
  EASE_OUT,
  LineReveal,
  LockOn,
  Magnetic,
  ParticleNetwork,
  safeAnimate,
  useFinePointer,
  useInViewOnce,
  useMediaQuery,
  usePauseOffscreen,
  useReducedMotionSafe,
} from "@/components/fx";
import HeroRadarOrb from "./HeroRadarOrb";

const TICKS = Array.from({ length: 11 }, (_, i) => i);

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
      safeAnimate(trackRef.current, [{ transform: "translateX(0%)" }, { transform: "translateX(100%)" }], {
        duration: glide,
        delay,
        easing: CSS_EASE_IN_OUT,
        fill: "backwards",
      }),
    );
    const op = fadeIn ? 0 : 1;
    out.push(
      safeAnimate(
        markerRef.current,
        [
          { opacity: op, transform: "scale(1)", offset: 0 },
          { opacity: 1, transform: "scale(1)", offset: Math.min(g, 150 / (glide + snap)) },
          { opacity: 1, transform: "scale(1)", offset: g },
          { opacity: 1, transform: "scale(1.3)", offset: g, easing: CSS_EASE_OUT },
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
          { duration: 300, delay: T0 + 100 + i * 25, easing: CSS_EASE_OUT, fill: "backwards" },
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
      if (e.pointerType && e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      const now = performance.now();
      if (now < busyUntil.current) return;
      busyUntil.current = now + 500 + 450;
      anims.current = [...anims.current.filter((a) => a && a.playState !== "finished"), ...runMarker(0, 500, false)];
    };
    host.addEventListener("pointerenter", onEnter);
    return () => host.removeEventListener("pointerenter", onEnter);
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
        style={{ height: 1.5, background: "#4B6EFF", transformOrigin: "left center" }}
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
              background: "rgba(75,110,255,0.75)",
            }}
          />
        );
      })}
      {/* Marker: die Spur verschiebt sich um ihre eigene Breite (= Lineal) */}
      <span ref={trackRef} className="absolute inset-0" style={{ transform: "translateX(100%)" }}>
        <span
          ref={glowRef}
          className="absolute rounded-full"
          style={{
            left: -3,
            bottom: 0,
            width: 6,
            height: 6,
            background: "rgba(139,164,255,0.6)",
            boxShadow: "0 0 8px 2px rgba(139,164,255,0.9)",
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
            background: "#8BA4FF",
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
const StatValue = ({ value, delay, play }: { value: string; delay: number; play: boolean }) => {
  const lock = useDelayedFlag(play, delay);
  return (
    <LockOn color="#8BA4FF" play={lock}>
      <CountUp value={value} start={play} delay={delay} duration={0.6} />
    </LockOn>
  );
};

const STATS = [
  { value: "70%", label: "EU Cloud-Markt in US-Hand", delay: 0.65 },
  { value: "93%", label: "dt. Firmen digital abhängig", delay: 0.75 },
  { value: "3", label: "Zukunftspfade bis 2030", delay: 0.85 },
];

const Hero = () => {
  const reduced = useReducedMotionSafe();
  const lg = useMediaQuery("(min-width: 1024px)");
  const sectionRef = useRef<HTMLElement | null>(null);
  const h1Ref = useRef<HTMLElement | null>(null);
  const statsRef = useRef<HTMLDivElement | null>(null);
  const ctaRef = useRef<HTMLAnchorElement | null>(null);

  // Endlosschleifen (Sweep, Blips) und der begrenzte Tropfen laufen nur, solange der Hero sichtbar ist
  usePauseOffscreen(sectionRef);

  const statsInView = useInViewOnce(statsRef, { amount: 0.6 });

  // Scroll-Kopplung
  const { scrollYProgress: heroProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const { scrollY } = useScroll();
  // Reduzierte Bewegung (sanfte Stufe): keine scroll-gekoppelte Verschiebung,
  // die Opacity-Kopplung an den Scroll bleibt erlaubt.
  const textOut = lg;
  const textMove = lg && !reduced;
  const textY = useTransform(heroProgress, (p) => (textMove ? -50 * Math.max(0, (p - 0.4) / 0.6) : 0));
  const textOpacity = useTransform(heroProgress, (p) => (textOut ? 1 - 0.85 * Math.max(0, (p - 0.4) / 0.6) : 1));
  const hintOpacity = useTransform(scrollY, (y) => 1 - Math.min(1, Math.max(0, y / 80)));

  // Einmaliger Glanz ueber den Primaer-CTA, 1.3 s nach dem Laden
  useEffect(() => {
    if (reduced) return;
    const el = ctaRef.current;
    if (!el) return;
    const t1 = window.setTimeout(() => el.classList.add("fx-sheen-once"), 1300);
    const t2 = window.setTimeout(() => el.classList.remove("fx-sheen-once"), 1300 + 900);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      el.classList.remove("fx-sheen-once");
    };
  }, [reduced]);

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
    <section
      ref={sectionRef}
      className="relative flex items-center overflow-hidden"
      style={{ background: "radial-gradient(ellipse 80% 60% at 60% 50%, rgba(30,45,120,0.35) 0%, transparent 70%)" }}
    >
      {/* Particle network */}
      <ParticleNetwork className="absolute inset-0 w-full h-full" />

      {/* Auf Desktop oben ausgerichtet statt vertikal zentriert: bei Zentrierung
          waechst der Abstand zur Navigationsleiste mit der Fensterhoehe und der
          Inhalt rutscht bei kleinen Fenstern darunter. pt entspricht exakt der
          Hoehe der fixierten Leiste (65 px), der Inhalt beginnt also unmittelbar
          darunter, ohne Puffer und ohne Ueberlappung.

          Kein min-h-screen mehr, weder hier noch auf der Section: zusammen mit
          items-start sammelte sich der gesamte Ueberschuss unten. Der Inhalt
          endete immer auf derselben Hoehe, die Section wuchs aber mit dem
          Fenster, die Luecke also eins zu eins mit. Bei 2200x1240 waren 48 % des
          Hero leer. Jetzt bestimmt der Inhalt die Hoehe. */}
      <div className="relative z-10 max-w-[1600px] mx-auto px-6 lg:px-10 w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center lg:items-start pt-[65px] pb-28 lg:pb-32">
        {/* Left: Text content */}
        <motion.div style={{ y: textY, opacity: textOpacity }}>
          {/* Headline: Zeilen gleiten aus der Maske, die h1 selbst bleibt sichtbar (LCP) */}
          <LineReveal
            ref={h1Ref}
            as="h1"
            trigger="mount"
            delay={0.08}
            stagger={0.09}
            duration={0.8}
            className="text-5xl lg:text-6xl xl:text-7xl font-semibold leading-[1.05] mb-6 text-white"
            style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.03em" }}
            lines={[
              "Digitale",
              "Souveränität",
              <>
                <span className="relative inline-block" style={{ color: "#4B6EFF" }}>
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
            className="text-base lg:text-lg leading-relaxed mb-10 max-w-lg"
            style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" }}
          >
            Organisationen sind bei digitalen Technologien zunehmend von externen Anbietern und
            technologischen Ökosystemen abhängig. Der Sovereignty Radar macht diese Abhängigkeiten
            und den daraus resultierenden organisationalen Handlungsspielraum messbar.
          </motion.p>

          {/* CTAs */}
          <motion.div {...follow(0.51)} className="flex flex-wrap gap-4">
            <Magnetic strength={0.3} max={10}>
              <Link
                ref={ctaRef}
                to="/assessment"
                className="fx-glow fx-sheen-host fx-press inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold text-sm"
                style={{
                  background: "#4B6EFF",
                  color: "white",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                <span className="fx-sheen" aria-hidden="true" />
                {/* inline-block statt flex: sonst faellt das Leerzeichen vor dem Pfeil weg */}
                <span data-magnet-inner="" className="relative inline-block">
                  Organisation Self-Assessment{" "}<span className="fx-arrow">→</span>
                </span>
              </Link>
            </Magnetic>
            <a
              href="#scenarios"
              className="fx-press inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold text-sm bg-white/[0.06] hover:bg-white/10"
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.8)",
                fontFamily: "'Space Grotesk', sans-serif",
                transition: "transform 160ms var(--ease-out), background-color 200ms var(--ease-out)",
              }}
            >
              Szenarien 2030
            </a>
          </motion.div>

          {/* Stats row */}
          <motion.div ref={statsRef} {...follow(0.57)} className="mt-14 flex gap-10 flex-wrap">
            {STATS.map(({ value, label, delay }) => (
              <div key={label}>
                <div
                  className="relative text-3xl font-bold text-white mb-1"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <StatValue value={value} delay={delay} play={statsInView} />
                  {/* Hairline, synchron zur Zaehlung; absolut, also ohne Layout-Einfluss.
                      Reduzierte Bewegung: per clip-path aufgedeckt statt skaliert. */}
                  <motion.span
                    aria-hidden="true"
                    className="fx-deco pointer-events-none absolute left-0 -bottom-0.5 h-px w-6"
                    style={{ background: "#4B6EFF", transformOrigin: "left center" }}
                    initial={reduced ? { clipPath: "inset(0 100% 0 0)" } : { transform: "scaleX(0)" }}
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
                <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" }}>
                  {label}
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Right: Radar orb visual */}
        <HeroRadarOrb heroRef={sectionRef} progress={heroProgress} />
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div className="flex flex-col items-center gap-2" style={{ opacity: hintOpacity }}>
          <div className="relative w-px h-10 overflow-hidden bg-gradient-to-b from-transparent to-white/20">
            {reduced ? null : (
              <span
                aria-hidden="true"
                className="fx-deco fx-drop fx-loop pointer-events-none absolute left-0 top-0 w-px h-3 bg-gradient-to-b from-transparent to-white/70"
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
          <span className="text-[10px] tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Space Grotesk', sans-serif" }}>
            Scroll
          </span>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;
