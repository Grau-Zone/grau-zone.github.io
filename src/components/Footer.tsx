// Abschnitt "Ueber das Projekt" (#about) und darunter die Fusszeile.
//
// Aufbau: Auf weissem Grund die Ueberschrift mit gruenem Wort, der Absatz zur
// Foerderung und das Ziel des Projekts als Aussage, deren Woerter sich beim
// Scrollen aufhellen. Darunter die beiden Partner als Zeilen mit Haarlinien.
// Danach auf tiefem Gruen die drei Projektsaeulen: grosse Nummern in Mint, eine
// Linie zeichnet sich unter jeder Zeile, links bleibt ein Radar stehen, dessen
// Ringe nacheinander aufleuchten, je nachdem welche Saeule gerade im Bild ist.
// Alle Texte sind unveraendert aus dem bisherigen Abschnitt uebernommen.
import { useEffect, useRef, useState } from "react";
import { Reveal, RevealGroup, RevealItem, ScrollWords, useFinePointer, useInViewOnce } from "@/components/fx";
import { AmbientField } from "@/rx/AmbientField";
import { SplitHeading } from "@/rx/SplitHeading";
import RadarLines from "./frame/RadarLines";
import SiteFooter from "./SiteFooter";
import "./frame/frame.css";

const PILLARS = [
  {
    n: "#1",
    title: "Makro-Ebene",
    desc: "Analyse technologischer, marktlicher und regulatorischer Entwicklungen, die digitale Abhängigkeiten von Organisationen beeinflussen.",
  },
  {
    n: "#2",
    title: "Anbieter-Ebene",
    desc: "Analyse von Eigenschaften digitaler Anbieter und Services, die Abhängigkeiten von Organisationen reduzieren oder verstärken.",
  },
  {
    n: "#3",
    title: "Organisationsebene",
    desc: "Messung des organisationalen Handlungsspielraums im Umgang mit digitalen Abhängigkeiten anhand von Switching, Internalization, Multi-Sourcing und Negotiation Capacity.",
  },
];

const ZIEL =
  "Ziel des Forschungsprojekts ist es, digitale Abhängigkeiten und den daraus resultierenden organisationalen Handlungsspielraum systematisch zu erfassen. Der Sovereignty Radar soll Organisationen dabei unterstützen, Abhängigkeiten sichtbar zu machen, zu vergleichen und gezielt zu adressieren.";

const HOT = { Handlungsspielraum: "#00802f", systematisch: "#00802f", sichtbar: "#00802f", vergleichen: "#00802f", adressieren: "#00802f" };

function PillarRow({ n, title, desc, i, onHover }: { n: string; title: string; desc: string; i: number; onHover: (i: number) => void }) {
  const ref = useRef<HTMLLIElement>(null);
  const seen = useInViewOnce(ref, { amount: 0.5, margin: "0px" });
  return (
    <li
      ref={ref}
      data-i={i}
      data-in={seen ? "true" : "false"}
      className="fr-fig"
      onMouseEnter={() => onHover(i)}
    >
      <span className="fr-fig__n">{n}</span>
      <div>
        <h4 className="fr-fig__t">{title}</h4>
        <p className="fr-fig__note">{desc}</p>
      </div>
    </li>
  );
}

const Footer = () => {
  const fine = useFinePointer();
  const listRef = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState(0);

  // Die Saeule, die gerade die Bildmitte kreuzt, bestimmt den leuchtenden Ring.
  useEffect(() => {
    const list = listRef.current;
    if (!list || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
      },
      { rootMargin: "-42% 0px -42% 0px" },
    );
    list.querySelectorAll("li").forEach((li) => io.observe(li));
    return () => io.disconnect();
  }, []);

  return (
    // aria-label: macht den Abschnitt zu einer Region, damit er (ausserhalb von main) nicht ohne Landmark steht
    <section id="about" aria-label="Über das Projekt" className="fr-about fr-scope">
      <div className="fr-about__top">
        <div className="rx-wrap">
          <div className="fr-about__grid">
            <div className="fr-about__lead">
              <SplitHeading as="h2" className="rx-h2" em="systematisch">
                Digitale Souveränität systematisch erfassen.
              </SplitHeading>
              <div className="fr-meta-row">
                <span className="fr-chip">
                  <i className="rx-dot rx-dot--done" aria-hidden="true" />
                  Über das Projekt
                </span>
              </div>
              <Reveal as="p" y={10} delay={0.1} className="rx-sub">
                Die Dieter Schwarz Stiftung und Schwarz Digits fördern das Forschungsprojekt zur
                Messung digitaler Souveränität von Organisationen.
              </Reveal>
            </div>

            <ScrollWords as="p" text={ZIEL} highlight={HOT} scanLine={false} className="fr-about__statement" />
          </div>

          {/* Partner: Zeilen mit Haarlinien statt Karten */}
          <RevealGroup as="ul" stagger={0.1} delayChildren={0.05} className="rx-rows fr-partners">
            <RevealItem as="li" className="rx-row fr-partner">
              <div className="fr-partner__t">Dieter Schwarz Stiftung / Schwarz Digits</div>
              <div>
                <p className="fr-partner__d">
                  Förder- und Praxispartner des Forschungsprojekts. Schwarz Digits bringt
                  insbesondere die Perspektive eines europäischen Anbieters digitaler
                  Infrastruktur in das Projekt ein.
                </p>
              </div>
            </RevealItem>
            <RevealItem as="li" className="rx-row fr-partner">
              <div className="fr-partner__t">IWI-HSG, Universität St. Gallen</div>
              <div>
                <p className="fr-partner__d">
                  Wissenschaftliche Durchführung durch das Institut für Wirtschaftsinformatik der
                  Universität St.Gallen. Entwicklung des Messmodells, empirische Untersuchung und
                  Analyse organisationaler digitaler Souveränität.
                </p>
                <p className="fr-partner__d">Prof. Dr. Mahei Li · Prof. Dr. Andreas Janson · Prof. Dr. Andreas Hein · Adrian Bohrer</p>
              </div>
            </RevealItem>
          </RevealGroup>
        </div>
      </div>

      {/* Die drei Projektsaeulen: tiefes Gruen, Zahlen in Mint */}
      <div className="rx-deep fr-scope fr-pillars">
        <AmbientField className="rx-ambient" />
        <div className="rx-wrap fr-pillars__grid">
          <div className="fr-pillars__intro">
            <SplitHeading as="h3" className="rx-h2">
              Projektsäulen
            </SplitHeading>
            <RadarLines tone="deep" rings={3} axes={false} active={active} className="fr-pillars__radar" />
          </div>
          <ol ref={listRef} className="fr-figs">
            {PILLARS.map((p, i) => (
              <PillarRow key={p.n} {...p} i={i} onHover={(k) => fine && setActive(k)} />
            ))}
          </ol>
        </div>
      </div>

      <SiteFooter breit />
    </section>
  );
};

export default Footer;
