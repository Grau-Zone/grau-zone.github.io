// Die Fusszeile aller Seiten.
//
// Herausgeber ist das Institut fuer Wirtschaftsinformatik der Universitaet
// St.Gallen. Die Dieter Schwarz Stiftung foerdert das Institut, sie ist nicht
// Urheberin; STACKIT ist weder Traeger noch Herausgeber. Deshalb steht hier
// ausschliesslich das IWI, und deshalb erscheint diese Zeile auf jeder Seite
// und nicht nur auf der Startseite.
//
// Vorher lag das Copyright an genau einer Stelle im Projekt, in der unteren
// Leiste von Footer.tsx, und damit nur auf "/". Vier von fuenf Seiten trugen
// weder Logo noch Copyright noch einen Link auf das Institut.
import { Link } from "react-router-dom";
import IwiLogo, { IWI_URL } from "./IwiLogo";

const CDET_URL = IWI_URL + "/cdet";
const KONTAKT = "mailto:adrian.bohrer@unisg.ch,andreas.hein@unisg.ch";

const linkStil: React.CSSProperties = {
  color: "rgba(255,255,255,0.5)",
  fontFamily: "'Space Grotesk', sans-serif",
  textDecoration: "none",
  transition: "color 0.15s",
};

const an = (e: React.SyntheticEvent<HTMLElement>) => {
  e.currentTarget.style.color = "rgba(255,255,255,0.8)";
};
const aus = (e: React.SyntheticEvent<HTMLElement>) => {
  e.currentTarget.style.color = "rgba(255,255,255,0.5)";
};

const extern = [
  { label: "IWI-HSG", href: IWI_URL },
  { label: "CDET", href: CDET_URL },
  { label: "Kontakt", href: KONTAKT },
];

interface SiteFooterProps {
  /** Startseite: gleiche Breite wie ihr Inhalt. Sonst die schmale Spalte der Unterseiten. */
  breit?: boolean;
}

const SiteFooter = ({ breit = false }: SiteFooterProps) => (
  <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
    <div
      className={
        (breit ? "max-w-[1600px] px-6 lg:px-10" : "max-w-3xl px-6") +
        " mx-auto py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-5"
      }
    >
      <IwiLogo height={38} />

      <nav className="flex gap-5 flex-wrap">
        {extern.map(({ label, href }) => (
          <a
            key={label}
            href={href}
            className="text-xs"
            style={linkStil}
            onMouseEnter={an}
            onMouseLeave={aus}
            onFocus={an}
            onBlur={aus}
          >
            {label}
          </a>
        ))}
        {/* Als Link, nicht als <a>: der Router laeuft mit basename, ein rohes
            href wuerde ihn umgehen und die Seite komplett neu laden. */}
        <Link
          to="/impressum"
          className="text-xs"
          style={linkStil}
          onMouseEnter={an}
          onMouseLeave={aus}
          onFocus={an}
          onBlur={aus}
        >
          Impressum
        </Link>
      </nav>

      <div
        className="text-xs"
        style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" }}
      >
        © {new Date().getFullYear()} IWI-HSG, Universität St.Gallen
      </div>
    </div>
  </footer>
);

export default SiteFooter;
