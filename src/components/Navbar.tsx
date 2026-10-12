import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import {
  motion,
  AnimatePresence,
  animate,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  type AnimationPlaybackControlsWithThen,
  type Variants,
} from "framer-motion";
import RadarMark from "./RadarMark";
import {
  DUR,
  EASE_IN_OUT,
  EASE_OUT,
  Magnetic,
  SPRING,
  ScrollProgress,
  useFinePointer,
  usePauseOffscreen,
  useReducedMotionSafe,
} from "@/components/fx";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Szenarien", href: "#scenarios" },
  { label: "Radar", href: "#radar" },
  { label: "Dimensionen", href: "#layers" },
  { label: "Organisationen", href: "#organisationen" },
  { label: "Über das Projekt", href: "#about" },
];

// Scrollspy: beobachtete Sektionen in Dokumentreihenfolge. #modell gehoert
// zum Eintrag Organisationen.
const SPY_IDS = ["scenarios", "radar", "layers", "modell", "organisationen", "about"];
const spyHref = (id: string) => (id === "modell" ? "#organisationen" : `#${id}`);
/** Ortungs-Ring am Logo hoechstens alle 6 s. */
const PING_GAP_MS = 6000;
/** So lange haelt ein Klick den Wert fest, falls die Zielsektion nie ins Band kommt. */
const CLICK_LOCK_MS = 2000;

const FONT = { fontFamily: "'Space Grotesk', sans-serif" };

// CTA: Farben als Klassen, damit Hover und Fokus per CSS laufen.
const CTA_BASE =
  "fx-press fx-ring-host rounded-full font-semibold border border-[rgba(75,110,255,0.4)] bg-[rgba(75,110,255,0.15)] text-[#8ba4ff] " +
  "hover:bg-[rgba(75,110,255,0.25)] hover:text-white focus-visible:bg-[rgba(75,110,255,0.25)] focus-visible:text-white " +
  "[transition:background-color_200ms,color_200ms,transform_160ms_var(--ease-out)]";

const RingSweep = () => <span aria-hidden="true" className="fx-ring-sweep fx-loop" />;

const menuVariants: Variants = {
  hidden: { opacity: 0, y: -10 },
  shown: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: EASE_OUT, staggerChildren: 0.03 },
  },
  exit: { opacity: 0, y: -10, transition: { duration: 0.12, ease: EASE_OUT } },
};

const menuItemVariants: Variants = {
  hidden: { opacity: 0, y: -4 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.2, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: 0.12, ease: EASE_OUT } },
};

// Reduzierte Bewegung (sanfte Stufe): nur Deckkraft, kein y-Versatz. framer
// setzt Transformationen bei reduce sofort, das Panel spraenge sonst beim
// Schliessen sichtbar 10 px nach oben.
const menuVariantsReduced: Variants = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { duration: 0.2, ease: EASE_OUT, staggerChildren: 0.03 } },
  exit: { opacity: 0, transition: { duration: 0.12, ease: EASE_OUT } },
};

const menuItemVariantsReduced: Variants = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { duration: 0.2, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: 0.12, ease: EASE_OUT } },
};

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [ping, setPing] = useState(0);
  const headerRef = useRef<HTMLElement | null>(null);
  const reduced = useReducedMotionSafe();
  const fine = useFinePointer();

  // Endlosschleifen im Header (Kantenlicht der CTAs) ruhen bei verstecktem Tab
  // und bei gedruecktem Pause-Knopf (zusaetzlich html[data-fx-paused] im CSS).
  // Bei reduzierter Bewegung schaltet das CSS das Kantenlicht ganz ab.
  usePauseOffscreen(headerRef);

  // ── Gescrollt-Zustand: Observer auf den Sentinel, schreibt direkt ins DOM ──
  useEffect(() => {
    const header = headerRef.current;
    const sentinel = document.getElementById("fx-top-sentinel");
    if (!header || !sentinel || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      const e = entries[entries.length - 1];
      header.dataset.scrolled = e.isIntersecting ? "false" : "true";
    });
    io.observe(sentinel);
    return () => io.disconnect();
  }, []);

  // ── Scrollspy: setState nur beim Wechsel ──
  const activeRef = useRef<string | null>(null);
  const lastPingRef = useRef(Number.NEGATIVE_INFINITY);
  const lockRef = useRef<string | null>(null);
  const lockTimer = useRef<number | undefined>(undefined);
  const evaluateRef = useRef<(() => void) | null>(null);

  const commit = useCallback((next: string | null) => {
    if (next === activeRef.current) return;
    activeRef.current = next;
    setActive(next);
    if (next) {
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      if (now - lastPingRef.current >= PING_GAP_MS) {
        lastPingRef.current = now;
        setPing((p) => p + 1);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const els = SPY_IDS.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    if (!els.length) return;
    const inBand = new Set<string>();
    // Die Fusszeile (#about) ist kuerzer als der halbe Viewport und erreicht das
    // Band nie; sie zaehlt, sobald sie fast ganz sichtbar ist.
    let aboutFull = false;

    const evaluate = () => {
      let candidate: string | null | undefined;
      if (aboutFull) candidate = "#about";
      else {
        const hit = SPY_IDS.find((id) => inBand.has(id));
        if (hit) candidate = spyHref(hit);
        else if (els[0].getBoundingClientRect().top > window.innerHeight * 0.5) candidate = null;
        // sonst: zwischen zwei Sektionen, letzter Wert bleibt
      }
      if (lockRef.current) {
        if (candidate !== lockRef.current) return;
        lockRef.current = null;
        window.clearTimeout(lockTimer.current);
      }
      if (candidate !== undefined) commit(candidate);
    };
    evaluateRef.current = evaluate;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement).id;
          if (e.isIntersecting) inBand.add(id);
          else inBand.delete(id);
        }
        evaluate();
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    els.forEach((el) => io.observe(el));

    const about = document.getElementById("about");
    const aboutIo = about
      ? new IntersectionObserver(
          (entries) => {
            const e = entries[entries.length - 1];
            const full = e.isIntersecting && e.intersectionRatio >= 0.85;
            if (full === aboutFull) return;
            aboutFull = full;
            evaluate();
          },
          { threshold: [0, 0.85] },
        )
      : null;
    if (about) aboutIo?.observe(about);

    return () => {
      io.disconnect();
      aboutIo?.disconnect();
      evaluateRef.current = null;
      window.clearTimeout(lockTimer.current);
    };
  }, [commit]);

  // Klick: Wert sofort setzen und festhalten, bis die Zielsektion im Band ist.
  const select = useCallback(
    (href: string) => {
      commit(href);
      lockRef.current = href;
      window.clearTimeout(lockTimer.current);
      lockTimer.current = window.setTimeout(() => {
        lockRef.current = null;
        evaluateRef.current?.();
      }, CLICK_LOCK_MS);
    },
    [commit],
  );

  // ── Logo: Zeiger dreht mit dem Scrollfortschritt (2 Umdrehungen) ──
  // Bei reduzierter Bewegung (sanfte Stufe) steht der Zeiger: keine
  // scroll-gekoppelte Drehung, keine Intro- und Hover-Umdrehung. Die
  // Fortschrittsleiste bleibt, der Ortungs-Ring am Logo waechst dann hoechstens
  // auf scale 1.15 (SvgPing). Die Drehungen sind keine Endlosschleifen
  // (Intro einmalig 1.1 s, sonst nur auf Scroll oder Hover), daher kein
  // Pause-Zweig.
  const { scrollYProgress } = useScroll();
  const scrollRot = useSpring(useTransform(scrollYProgress, [0, 1], [0, 720]), { stiffness: 120, damping: 30 });
  const introRot = useMotionValue(0);
  const hoverRot = useMotionValue(0);
  const sweep = useTransform([scrollRot, introRot, hoverRot], ([s, i, h]: number[]) => s + i + h);
  const spinRef = useRef<AnimationPlaybackControlsWithThen | null>(null);

  const spin = useCallback((controls: AnimationPlaybackControlsWithThen) => {
    spinRef.current = controls;
    controls.then(() => {
      if (spinRef.current === controls) spinRef.current = null;
    });
  }, []);

  useEffect(() => {
    if (reduced) return;
    const c = animate(introRot, 360, { duration: 1.1, ease: EASE_IN_OUT, delay: 0.4 });
    spin(c);
    return () => {
      c.stop();
      if (spinRef.current === c) spinRef.current = null;
    };
  }, [reduced, introRot, spin]);

  useEffect(() => () => spinRef.current?.stop(), []);

  const onLogoEnter = (e: ReactPointerEvent<HTMLAnchorElement>) => {
    if (e.pointerType !== "mouse" || !fine || reduced || spinRef.current) return;
    spin(animate(hoverRot, hoverRot.get() + 360, { duration: 0.8, ease: EASE_IN_OUT }));
  };

  const iconTransition = { duration: 0.18, ease: EASE_OUT };
  // Reduzierte Bewegung: reiner Crossfade, rotate bleibt 0 (framer wuerde den
  // Winkel sofort setzen, das ausblendende Icon staende dann gekippt da). rotate
  // und filter bleiben als Ruhewerte drin, damit ein Wechsel der OS-Einstellung
  // zur Laufzeit keinen alten Winkel am versteckten Icon zuruecklaesst.
  const iconOn = { opacity: 1, rotate: 0, filter: reduced ? "none" : "blur(0px)" };
  const iconOff = (deg: number) => ({ opacity: 0, rotate: reduced ? 0 : deg, filter: reduced ? "none" : "blur(2px)" });
  const menuV = reduced ? menuVariantsReduced : menuVariants;
  const menuItemV = reduced ? menuItemVariantsReduced : menuItemVariants;

  return (
    <header ref={headerRef} className="group fixed top-0 left-0 right-0 z-50">
      {/* Hintergrund als eigene Ebene: backdrop-filter bleibt dauerhaft an, nur die Deckkraft wechselt. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity [transition-duration:240ms] ease-fx-out group-data-[scrolled=true]:opacity-100"
        style={{
          background: "rgba(5, 6, 18, 0.78)",
          backdropFilter: "blur(16px) saturate(160%)",
          WebkitBackdropFilter: "blur(16px) saturate(160%)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      />

      <div className="relative max-w-[1600px] mx-auto flex items-center justify-between h-16 px-4 sm:px-6 lg:px-10">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2.5 group rounded-md"
          style={{ textDecoration: "none" }}
          onPointerEnter={onLogoEnter}
        >
          <RadarMark size={28} sweep={sweep} ping={ping} />
          <div className="flex flex-col leading-none">
            <span
              className="text-sm font-semibold tracking-tight text-white"
              style={FONT}
            >
              Sovereignty Radar
            </span>
            {/* Herausgeber ist das Institut, nicht die foerdernde Stiftung.
                Ausgeschrieben ist der Name so breit, dass er bei 375 px den
                Self-Assessment-Knopf aus der Leiste draengt; dort deshalb die
                Kurzform. Die vollstaendige Angabe steht ohnehin auf jeder Seite
                in der Fusszeile. */}
            <span className="text-[10px] text-white/40 tracking-widest uppercase font-medium whitespace-nowrap">
              <span className="sm:hidden">IWI-HSG</span>
              <span className="hidden sm:inline">HSG - Institut für Wirtschaftsinformatik</span>
            </span>
          </div>
        </Link>

        {/* Desktop nav (erst ab xl: darunter reicht der Platz nicht fuer Name, fuenf Links und CTA) */}
        <nav className="hidden xl:flex items-center gap-6 2xl:gap-8">
          {navItems.map((item) => {
            const isActive = active === item.href;
            return (
              <a
                key={item.label}
                href={item.href}
                onClick={() => select(item.href)}
                aria-current={isActive ? "location" : undefined}
                className={cn(
                  "relative isolate rounded-full whitespace-nowrap text-sm font-medium transition-colors duration-200",
                  isActive ? "text-white" : "text-white/60 hover:text-white",
                )}
                style={FONT}
              >
                {reduced ? (
                  // Sanfte Stufe: keine Feder-Fahrt, die Pille blendet am Ziel ein
                  // und am alten Platz aus (Crossfade, DUR.fade); die Textfarbe gleitet.
                  <AnimatePresence initial={false}>
                    {isActive && (
                      <motion.span
                        key="nav-active"
                        aria-hidden="true"
                        className="pointer-events-none absolute -inset-x-3 -inset-y-1.5 -z-10 rounded-full"
                        style={{ background: "rgba(75,110,255,0.14)", border: "1px solid rgba(139,164,255,0.3)" }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: DUR.fade, ease: EASE_OUT }}
                      />
                    )}
                  </AnimatePresence>
                ) : (
                  isActive && (
                    <motion.span
                      layoutId="nav-active"
                      aria-hidden="true"
                      className="pointer-events-none absolute -inset-x-3 -inset-y-1.5 -z-10 rounded-full"
                      style={{ background: "rgba(75,110,255,0.14)", border: "1px solid rgba(139,164,255,0.3)" }}
                      transition={SPRING.snappy}
                    />
                  )
                )}
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* CTA */}
        <div className="hidden xl:flex items-center gap-4">
          <Magnetic strength={0.2} max={6}>
            <Link to="/assessment" className={cn(CTA_BASE, "text-sm px-5 py-2 whitespace-nowrap")} style={FONT}>
              Organisation Self-Assessment <span className="fx-arrow">→</span>
              <RingSweep />
            </Link>
          </Magnetic>
        </div>

        {/* Kompakt (unter xl): kurzer CTA + Menue */}
        <div className="flex xl:hidden items-center gap-2">
          <Link
            to="/assessment"
            className={cn(CTA_BASE, "text-xs px-3 py-1.5 whitespace-nowrap")}
            style={FONT}
          >
            Self-Assessment
            <RingSweep />
          </Link>
          <button
            type="button"
            className="-m-2 p-2 rounded-md text-white/70 hover:text-white transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menü"
            aria-expanded={mobileOpen}
            aria-controls="navbar-mobile-menu"
          >
            <span className="relative block w-5 h-5">
              <motion.span
                className="absolute inset-0"
                initial={false}
                animate={mobileOpen ? iconOff(45) : iconOn}
                transition={iconTransition}
              >
                <Menu className="w-5 h-5" />
              </motion.span>
              <motion.span
                className="absolute inset-0"
                initial={false}
                animate={mobileOpen ? iconOn : iconOff(-45)}
                transition={iconTransition}
              >
                <X className="w-5 h-5" />
              </motion.span>
            </span>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="navbar-mobile-menu"
            variants={menuV}
            initial="hidden"
            animate="shown"
            exit="exit"
            className="relative xl:hidden px-6 pb-5 pt-2 space-y-3"
            style={{ background: "rgba(5, 6, 18, 0.98)", borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            {navItems.map((item) => {
              const isActive = active === item.href;
              return (
                <motion.a
                  key={item.label}
                  variants={menuItemV}
                  href={item.href}
                  onClick={() => {
                    select(item.href);
                    setMobileOpen(false);
                  }}
                  aria-current={isActive ? "location" : undefined}
                  className={cn(
                    "relative block whitespace-nowrap text-sm font-medium py-2 transition-colors",
                    isActive ? "text-white" : "text-white/70 hover:text-white",
                  )}
                  style={FONT}
                >
                  {isActive && (
                    <motion.span
                      aria-hidden="true"
                      className="pointer-events-none absolute -left-3 top-2 bottom-2 w-[2px] rounded-full origin-top"
                      style={{ background: "#8BA4FF" }}
                      // reduzierte Bewegung: Einblenden statt Wachsen
                      initial={reduced ? { opacity: 0 } : { scaleY: 0 }}
                      animate={reduced ? { opacity: 1 } : { scaleY: 1 }}
                      transition={{ duration: 0.2, ease: EASE_OUT }}
                    />
                  )}
                  {item.label}
                </motion.a>
              );
            })}
            <motion.div variants={menuItemV}>
              <Link
                to="/assessment"
                onClick={() => setMobileOpen(false)}
                className={cn(CTA_BASE, "block text-center text-sm px-5 py-3 mt-2")}
                style={FONT}
              >
                Organisation Self-Assessment <span className="fx-arrow">→</span>
                <RingSweep />
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lesefortschritt, nur sichtbar, solange gescrollt wurde */}
      <ScrollProgress className="absolute left-0 right-0 -bottom-px opacity-0 transition-opacity [transition-duration:240ms] ease-fx-out group-data-[scrolled=true]:opacity-100" />
    </header>
  );
};

export default Navbar;
