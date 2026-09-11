import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import RadarMark from "../components/RadarMark";
import SiteFooter from "../components/SiteFooter";
import { IWI_URL } from "../components/IwiLogo";

const mail = (
  <a href="mailto:adrian.bohrer@unisg.ch" style={{ color: "#8ba4ff", textDecoration: "none" }}>
    adrian.bohrer@unisg.ch
  </a>
);

const iwi = (
  <a href={IWI_URL} style={{ color: "#8ba4ff", textDecoration: "none" }}>
    Institut für Wirtschaftsinformatik der Universität St.Gallen
  </a>
);

// id nur dort, wo von aussen hingesprungen wird (siehe ScrollToHash in App.tsx).
const sections: { title: string; id?: string; lines: React.ReactNode[] }[] = [
  {
    title: "Herausgeber",
    lines: [
      <>Der Sovereignty Radar ist ein Projekt des {iwi}.</>,
      <>© {new Date().getFullYear()} IWI-HSG, Universität St.Gallen. Alle Rechte vorbehalten.</>,
    ],
  },
  {
    title: "Angaben zum Anbieter",
    lines: ["Adrian Bohrer", "Universität St.Gallen", "Müller-Friedberg-Strasse 8", "CH-9000 St.Gallen"],
  },
  {
    title: "Kontakt",
    lines: [
      <>Telefon: <a href="tel:+491723266222" style={{ color: "#8ba4ff", textDecoration: "none" }}>+49 172 3266222</a></>,
      <>E-Mail: <a href="mailto:adrian.bohrer@unisg.ch" style={{ color: "#8ba4ff", textDecoration: "none" }}>adrian.bohrer@unisg.ch</a></>,
    ],
  },
  {
    title: "Vertreten durch",
    lines: ["Adrian Bohrer"],
  },
  {
    title: "Verantwortlich für den Inhalt",
    lines: ["Adrian Bohrer, Müller-Friedberg-Strasse 8, CH-9000 St.Gallen"],
  },
  {
    title: "Förderung",
    lines: ["Dieses Forschungsprojekt wird durch die Schwarz Stiftung gefördert."],
  },
  {
    title: "Datenschutz · Verantwortliche Stelle",
    lines: [
      "Universität St.Gallen, Institut für Wirtschaftsinformatik, Müller-Friedberg-Strasse 8, CH-9000 St.Gallen",
      "Vertreten durch Adrian Bohrer, verantwortlich für die Durchführung der Erhebung.",
      <>Anfragen zum Datenschutz: {mail}</>,
    ],
  },
  {
    title: "Welche Daten das Self-Assessment erhebt",
    lines: [
      "Ihre Antworten auf die 39 Fragen des Self-Assessments.",
      "Die digitale Funktion, die Sie betrachten, und den Namen des Anbieters, den Sie eintragen.",
      "Freiwillige Angaben zu Ihrer Organisation: Größenklasse, Branchen-Hauptkategorie und Hauptsitz.",
      "Erhebungssprache, Zeitpunkt der Übermittlung und eine zufällig erzeugte Antwort-Kennung.",
      "Nicht erhoben werden Name, E-Mail-Adresse und IP-Adresse.",
      <>
        <strong style={{ color: "rgba(255,255,255,0.85)" }}>Hinweis:</strong> Die Kombination
        aus Branche, Größenklasse, Hauptsitz und Anbietername kann in kleinen Märkten Rückschlüsse auf
        eine bestimmte Organisation zulassen. Berücksichtigen Sie das bei Freitextangaben.
      </>,
    ],
  },
  {
    title: "Zweck und Rechtsgrundlage",
    lines: [
      "Die Daten dienen der Forschung zur digitalen Souveränität von Organisationen am Institut für Wirtschaftsinformatik der Universität St.Gallen.",
      "Rechtsgrundlage ist Ihre Einwilligung, die vor der ersten Frage eingeholt wird. Ohne Einwilligung startet der Fragebogen nicht.",
      "Die Teilnahme ist freiwillig. Sie können den Fragebogen jederzeit abbrechen. Dann wird nichts übermittelt.",
    ],
  },
  {
    title: "Speicherung",
    lines: [
      "Abgeschlossene Fragebögen werden in einer Datenbank des Anbieters Supabase im Rechenzentrum Frankfurt am Main gespeichert.",
      "Die Website kann in diese Datenbank ausschließlich schreiben. Lesen, Ändern und Löschen sind ihr technisch verwehrt. Zugriff auf die Daten hat allein das Forschungsteam.",
      "Supabase wird als Auftragsverarbeiter eingesetzt. Die Daten verlassen das Rechenzentrum in Frankfurt am Main nicht.",
      "Die Daten werden bis zum Abschluss des Forschungsprojekts und der zugehörigen Veröffentlichungen aufbewahrt, längstens zehn Jahre nach der Erhebung. Danach werden sie gelöscht. Die Frist folgt den Regeln guter wissenschaftlicher Praxis zur Nachvollziehbarkeit von Forschungsergebnissen.",
    ],
  },
  {
    title: "Fortschritt in Ihrem Browser",
    lines: [
      "Der Fragebogen speichert Ihren Fortschritt lokal in Ihrem Browser, damit Sie unterbrechen können. Diese Daten bleiben auf Ihrem Gerät, bis Sie den Fragebogen abschließen und absenden.",
      "Die Schaltfläche „Erneut durchführen“ am Ende des Fragebogens löscht sie.",
    ],
  },
  {
    title: "Kontaktliste Anwenderforum",
    id: "kontaktliste",
    lines: [
      "Auf der Seite /awf können Teilnehmende des 55. Anwenderforums des IWI-HSG ihre E-Mail-Adresse hinterlassen, damit das Institut für Wirtschaftsinformatik sie zu seinen Themen, Veranstaltungen und Forschungsergebnissen kontaktieren kann.",
      "Gespeichert werden die E-Mail-Adresse, der Zeitpunkt und die Fassung des Einwilligungstexts. Name und IP-Adresse werden nicht erhoben.",
      "Rechtsgrundlage ist Ihre Einwilligung, die Sie durch die Eingabe der Adresse und den Klick auf „Ja“ erteilen. Ohne Einwilligung wird nichts übermittelt.",
      "Die Adressen liegen in einer Datenbank des Anbieters Supabase im Rechenzentrum Frankfurt am Main. Die Website kann dort ausschließlich schreiben, Zugriff hat allein das Forschungsteam.",
      "Die Adressen bleiben gespeichert, bis Sie Ihre Einwilligung widerrufen. Eine feste Frist ist damit nicht verbunden.",
      <>Sie können die Einwilligung jederzeit per E-Mail an {mail} widerrufen. Ihre Adresse wird dann umgehend gelöscht.</>,
      "Ihre Entscheidung, auch ein Nein, wird nur in Ihrem Browser gespeichert, damit die Frage nicht erneut erscheint. Bei einem Nein wird nichts an uns übermittelt.",
    ],
  },
  {
    title: "Hosting, Schriftarten, kein Tracking",
    lines: [
      "Diese Seite wird über GitHub Pages (GitHub Inc.) ausgeliefert. Beim Aufruf verarbeitet GitHub technisch notwendige Verbindungsdaten einschließlich Ihrer IP-Adresse. Darauf haben wir keinen Zugriff.",
      "Die Schriftarten werden zusammen mit der Seite ausgeliefert. Eine Verbindung zu Google Fonts oder anderen Anbietern von Schriftarten besteht nicht, und dabei wird keine IP-Adresse an Dritte übertragen.",
      "Es werden keine Analyse- oder Trackingwerkzeuge eingesetzt. Cookies zu Werbe- oder Analysezwecken werden nicht gesetzt.",
    ],
  },
  {
    title: "Ihre Rechte",
    lines: [
      "Sie haben das Recht auf Auskunft, Berichtigung und Löschung Ihrer Daten sowie das Recht, Ihre Einwilligung jederzeit zu widerrufen.",
      "Im Self-Assessment erheben wir keine Kontaktdaten. Ihr Datensatz lässt sich deshalb nur über die Antwort-Kennung auffinden, die am Ende des Fragebogens angezeigt wird. Notieren Sie diese Kennung, wenn Sie sich diese Möglichkeit offenhalten möchten.",
      <>Für Auskunft, Löschung oder Widerruf genügt eine E-Mail an {mail}. Bei einem Datensatz aus dem Self-Assessment geben Sie darin bitte die Antwort-Kennung an; für die Kontaktliste des Anwenderforums genügt die E-Mail-Adresse selbst.</>,
      "Fragen und Beanstandungen zum Datenschutz können Sie ausserdem an die Datenschutzbeauftragte der Universität St.Gallen richten.",
    ],
  },
  {
    title: "Haftungsausschluss",
    lines: [
      "Die Inhalte dieser Seite wurden mit Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte wird keine Gewähr übernommen. Für Inhalte verlinkter externer Seiten sind ausschließlich deren Betreiber verantwortlich.",
    ],
  },
];

const Impressum = () => {
  return (
    <div style={{ minHeight: "100vh", background: "hsl(228 45% 4%)" }}>
      {/* Top bar */}
      <div
        className="fixed top-0 left-0 right-0 z-50"
        style={{ background: "rgba(5,6,18,0.92)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between h-16 px-6">
          <Link to="/" className="flex items-center gap-2.5" style={{ textDecoration: "none" }}>
            <RadarMark size={28} />
            <span className="text-sm font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Sovereignty Radar
            </span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-white/60 hover:text-white transition-colors"
            style={{ fontFamily: "'Space Grotesk', sans-serif", textDecoration: "none" }}
          >
            <ArrowLeft size={15} /> Zurück zur Startseite
          </Link>
        </div>
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-3xl mx-auto px-6"
        style={{ paddingTop: "128px", paddingBottom: "96px" }}
      >
        <span
          className="inline-block text-xs font-semibold tracking-[0.2em] uppercase mb-4"
          style={{ color: "rgba(139,164,255,0.6)", fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Rechtliches
        </span>
        <h1
          className="text-4xl lg:text-5xl font-semibold text-white mb-12"
          style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.025em" }}
        >
          Impressum
        </h1>

        <div className="space-y-8">
          {sections.map((section) => (
            <div
              key={section.title}
              id={section.id}
              className="rounded-2xl p-6 lg:p-7"
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.07)",
                // sonst verschwindet die Ueberschrift beim Sprung hinter der fixierten Kopfzeile
                scrollMarginTop: "96px",
              }}
            >
              <h2
                className="text-xs font-semibold uppercase tracking-widest mb-4"
                style={{ color: "rgba(139,164,255,0.7)", fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {section.title}
              </h2>
              <div className="space-y-1.5">
                {section.lines.map((line, i) => (
                  <p
                    key={i}
                    className="text-sm leading-relaxed"
                    style={{ color: "rgba(255,255,255,0.7)", fontFamily: "'Inter', sans-serif" }}
                  >
                    {line}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <SiteFooter />
    </div>
  );
};

export default Impressum;
