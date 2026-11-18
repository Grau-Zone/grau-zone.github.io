// Kopfzeile der Unterseiten (Anwenderforum, Impressum, 404).
//
// Wie die Kopfzeile des Reportings: durchsichtig am Seitenanfang, danach
// weiss (bzw. tiefgruen) mit Haarlinie; beim Runterscrollen faehrt sie nach
// oben weg, beim Hochscrollen oder mit Tastaturfokus kommt sie zurueck.
// Darunter laeuft ein gruener Fortschrittsbalken mit dem Scrollstand.
// Bei reduzierter Bewegung bleibt sie stehen, es gibt kein Wegfahren.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useMotionTier } from "@/components/fx";
import RadarMark from "../RadarMark";
import "./frame.css";

export interface SubHeaderProps {
  /** Text des Rueckwegs zur Startseite. Ohne Angabe nur das Signet mit Wortmarke. */
  back?: string;
  /** hell (weisser Grund) oder deep (tiefgruener Grund, Mint) */
  tone?: "light" | "deep";
}

const SubHeader = ({ back, tone = "light" }: SubHeaderProps) => {
  const tier = useMotionTier();
  const [solid, setSolid] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    lastY.current = window.scrollY;
    let ticking = false;
    const run = () => {
      ticking = false;
      const y = window.scrollY;
      setSolid(y > 60);
      if (tier === "off") setHidden(false);
      else if (y > lastY.current + 8 && y > 260) setHidden(true);
      else if (y < lastY.current - 8 || y < 120) setHidden(false);
      lastY.current = y;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(run);
    };
    run();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [tier]);

  return (
    <>
      <motion.div aria-hidden="true" className={"fr-progress fr-progress--" + tone} style={{ scaleX: scrollYProgress }} />
      <header
        className={"fr-head fr-head--" + tone + (solid ? " is-solid" : "") + (hidden ? " is-hidden" : "")}
        // ein fokussiertes Element in der versteckten Kopfzeile holt sie zurueck
        onFocusCapture={() => setHidden(false)}
      >
        <Link to="/" className="fr-brand">
          <RadarMark size={28} tone={tone} />
          <span className="fr-brand__name">Sovereignty Radar</span>
        </Link>
        {back && (
          <Link to="/" className="rx-pill rx-pill--sm rx-pill--ghost rx-pill--back">
            <ArrowLeft size={15} aria-hidden="true" /> {back}
          </Link>
        )}
      </header>
    </>
  );
};

export default SubHeader;
