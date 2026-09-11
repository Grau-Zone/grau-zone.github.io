// Logo des Instituts fuer Wirtschaftsinformatik der Universitaet St.Gallen.
//
// Herausgeber der Seite ist das IWI, nicht die foerdernde Stiftung. Das Logo
// gehoert deshalb auf jede Seite, zusammen mit dem Copyright und dem Link auf
// die Institutsseite; beides steckt in SiteFooter.tsx.
//
// Die Bilddatei traegt die Wortmarke in Weiss, weil die Originaldatei sie in
// reinem Schwarz fuehrt und der Seitenhintergrund nahezu schwarz ist. Erzeugt
// von tools/make_iwi_logo.py, dort steht die Begruendung. Liefert das IWI eine
// offizielle Negativfassung, wird nur v2/public/iwi-hsg-logo.png ersetzt.
export const IWI_URL = "https://iwi.unisg.ch";

const DATEI = import.meta.env.BASE_URL + "iwi-hsg-logo.png";

// 640 x 194, siehe tools/make_iwi_logo.py. Fest verdrahtet, damit width und
// height gesetzt werden koennen und beim Laden nichts springt.
const VERHAELTNIS = 640 / 194;

interface IwiLogoProps {
  /** Darstellungshoehe in Pixeln. Darunter wird die zweite Zeile des Logos,
   *  "Institut fuer Wirtschaftsinformatik", unleserlich. */
  height?: number;
  className?: string;
}

const IwiLogo = ({ height = 38, className }: IwiLogoProps) => (
  <a
    href={IWI_URL}
    className={className}
    aria-label="Institut für Wirtschaftsinformatik, Universität St.Gallen"
    style={{ display: "inline-block", lineHeight: 0, flexShrink: 0 }}
  >
    <img
      src={DATEI}
      alt="Institut für Wirtschaftsinformatik, Universität St.Gallen"
      width={Math.round(height * VERHAELTNIS)}
      height={height}
      // Bewusst nicht loading="lazy": das Logo ist die Urheberangabe und muss
      // auf jeder Seite verlaesslich stehen. Mit lazy blieb es im Test leer,
      // obwohl die Datei ausgeliefert wurde. 32 KB rechtfertigen kein Risiko.
      decoding="async"
      style={{ height, width: "auto", display: "block" }}
    />
  </a>
);

export default IwiLogo;
