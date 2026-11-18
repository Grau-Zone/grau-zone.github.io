// Logo des Instituts fuer Wirtschaftsinformatik der Universitaet St.Gallen.
//
// Herausgeber der Seite ist das IWI, nicht die foerdernde Stiftung. Das Logo
// gehoert deshalb auf jede Seite, zusammen mit dem Copyright und dem Link auf
// die Institutsseite; beides steckt in SiteFooter.tsx.
//
// Die Bilddatei traegt die Bildmarke in HSG-Gruen und die Wortmarke in Weiss,
// weil die Originaldatei die Wortmarke in reinem Schwarz fuehrt und der Grund
// der Fusszeile jetzt Tinte ist. Erzeugt von tools/make_iwi_logo.py, dort steht
// die Begruendung. Liefert das IWI eine offizielle Negativfassung, wird nur
// v2/public/iwi-hsg-logo.png ersetzt.
//
// tone="ink" (Standard): die Datei unveraendert, fuer Tinte und tiefes Gruen.
// tone="light": fuer weissen Grund. Die Wortmarke wird per Filter dunkel, die
// gruene Bildmarke bleibt. Beide Teile sind dieselbe Datei, nur anders
// beschnitten (Bildmarke 0 bis 123 px, Wortmarke ab 151 px von 640).
export const IWI_URL = "https://iwi.unisg.ch";

const DATEI = import.meta.env.BASE_URL + "iwi-hsg-logo.png";
const ALT = "Institut für Wirtschaftsinformatik, Universität St.Gallen";

// 640 x 194, siehe tools/make_iwi_logo.py. Fest verdrahtet, damit width und
// height gesetzt werden koennen und beim Laden nichts springt.
const VERHAELTNIS = 640 / 194;

// Trennlinie zwischen Bild- und Wortmarke in Prozent der Breite (137 von 640 px)
const TRENNER = 21.4;

interface IwiLogoProps {
  /** Darstellungshoehe in Pixeln. Darunter wird die zweite Zeile des Logos,
   *  "Institut fuer Wirtschaftsinformatik", unleserlich. */
  height?: number;
  className?: string;
  /** Grund, auf dem das Logo steht: "ink" (dunkel, Standard) oder "light" (weiss). */
  tone?: "ink" | "light";
}

const IwiLogo = ({ height = 38, className, tone = "ink" }: IwiLogoProps) => {
  const width = Math.round(height * VERHAELTNIS);
  return (
    <a
      href={IWI_URL}
      className={className}
      aria-label={ALT}
      style={{ display: "inline-block", lineHeight: 0, flexShrink: 0 }}
    >
      {tone === "light" ? (
        <span style={{ position: "relative", display: "block", width, height }}>
          <img
            src={DATEI}
            alt={ALT}
            width={width}
            height={height}
            decoding="async"
            style={{ display: "block", height, width, filter: "brightness(0)", clipPath: `inset(0 0 0 ${TRENNER}%)` }}
          />
          <img
            src={DATEI}
            alt=""
            aria-hidden="true"
            width={width}
            height={height}
            decoding="async"
            style={{ position: "absolute", inset: 0, display: "block", height, width, clipPath: `inset(0 ${100 - TRENNER}% 0 0)` }}
          />
        </span>
      ) : (
        <img
          src={DATEI}
          alt={ALT}
          width={width}
          height={height}
          // Bewusst nicht loading="lazy": das Logo ist die Urheberangabe und muss
          // auf jeder Seite verlaesslich stehen. Mit lazy blieb es im Test leer,
          // obwohl die Datei ausgeliefert wurde. 32 KB rechtfertigen kein Risiko.
          decoding="async"
          style={{ height, width: "auto", display: "block" }}
        />
      )}
    </a>
  );
};

export default IwiLogo;
