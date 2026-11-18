// 404. Lag vorher als ungestyltes shadcn-Standardmarkup auf Englisch vor, mit
// hellem Hintergrund mitten in einer durchgehend dunklen Seite.
//
// Der Ruecksprung war ein rohes <a href="/">. Der Router laeuft mit
// basename={import.meta.env.BASE_URL}; ein solcher Link umgeht ihn und landet
// bei einem Deployment unter einem Unterpfad im Leeren.
//
// Gestaltung: tiefes Gruen mit ruhig treibenden Linien, ein leerer Radar, dessen
// Keil nichts findet, und die 404 in Mint, die von null hochzaehlt. Der Radar
// dreht sich nur ohne reduzierte Bewegung; der Pause-Knopf haelt ihn an.
import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { CountUp, Magnetic, PauseToggle, Reveal } from "@/components/fx";
import { AmbientField } from "@/rx/AmbientField";
import { SplitHeading } from "@/rx/SplitHeading";
import SubHeader from "../components/frame/SubHeader";
import RadarLines from "../components/frame/RadarLines";
import SiteFooter from "../components/SiteFooter";
import "../components/frame/frame.css";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404: Aufruf einer nicht vorhandenen Route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="fr-page fr-scope">
      {/* Pause-Knopf (WCAG 2.2.2): erster Tab-Stopp, sichtbar erst mit Fokus */}
      <PauseToggle />
      <SubHeader tone="deep" />

      <main className="rx-deep fr-scope fr-nf">
        <AmbientField className="rx-ambient" />
        <div className="rx-wrap fr-nf__grid">
          <div>
            <SplitHeading as="h1" className="rx-h1" em="nicht">
              Diese Seite gibt es nicht.
            </SplitHeading>

            <div className="fr-meta-row">
              <span className="fr-chip">
                <i className="rx-dot rx-dot--done" aria-hidden="true" />
                Fehler 404
              </span>
            </div>

            {/* margin="0px": Absatz und Rueckweg liegen auf dem Handy im unteren Zwoelftel des
                ersten Bildschirms; mit dem Standardrand (-12 %) blieben sie dort unsichtbar,
                bis jemand scrollt, und die 404 hat sonst keinen sichtbaren Weg zurueck. */}
            <Reveal as="p" delay={0.35} margin="0px" className="rx-sub">
              Vielleicht ist der Link veraltet oder hat sich ein Tippfehler eingeschlichen.
            </Reveal>

            <Reveal delay={0.5} margin="0px" className="fr-nf__cta">
              <Magnetic>
                <Link to="/" className="rx-pill fr-pill-light rx-pill--back">
                  <ArrowLeft size={16} aria-hidden="true" /> Zur Startseite
                </Link>
              </Magnetic>
            </Reveal>
          </div>

          <div className="fr-nf__fig" aria-hidden="true">
            <RadarLines tone="deep" rings={5} sweep />
            <span className="fr-nf__num">
              <CountUp value="404" duration={2} />
            </span>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};

export default NotFound;
