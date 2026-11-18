// Impressum und Datenschutz.
//
// Der Text ist die rechtliche Grundlage der Datenverarbeitung und steht hier
// wortgleich wie vorher; geaendert sind nur Typografie und Layout. Jeder
// Abschnitt ist eine Zeile mit Haarlinie: links der Titel (bleibt beim Lesen
// stehen), rechts der Text. Die Linie zeichnet sich beim Hineinscrollen.
// Die ids vergleichswerte, ergebnis-code und kontaktliste und der Abstand
// fuer Spruenge von aussen (siehe ScrollToHash in App.tsx) sind erhalten.
import { useRef } from "react";
import { useInViewOnce } from "@/components/fx";
import { SplitHeading } from "@/rx/SplitHeading";
import SubHeader from "../components/frame/SubHeader";
import RadarLines from "../components/frame/RadarLines";
import SiteFooter from "../components/SiteFooter";
import { IWI_URL } from "../components/IwiLogo";
import "../components/frame/frame.css";

const mail = (
  <a href="mailto:adrian.bohrer@unisg.ch" className="rx-link">
    adrian.bohrer@unisg.ch
  </a>
);

// Im Genitiv, weil der Link nur an einer Stelle steht: "ein Projekt des ...".
const iwi = (
  <a href={IWI_URL} className="rx-link">
    Instituts für Wirtschaftsinformatik der Universität St.Gallen
  </a>
);

// id nur dort, wo von aussen hingesprungen wird (siehe ScrollToHash in App.tsx).
// tight: kurze Zeilen (Anschrift, Kontakt) stehen dicht untereinander, Fliesstext mit Abstand.
const sections: { title: string; id?: string; tight?: boolean; lines: React.ReactNode[] }[] = [
  {
    title: "Herausgeber",
    lines: [
      <>Der Sovereignty Radar ist ein Projekt des {iwi}.</>,
      <>© {new Date().getFullYear()} IWI-HSG, Universität St.Gallen. Alle Rechte vorbehalten.</>,
    ],
  },
  {
    title: "Angaben zum Anbieter",
    tight: true,
    lines: ["Adrian Bohrer", "Universität St.Gallen", "Müller-Friedberg-Strasse 8", "CH-9000 St.Gallen"],
  },
  {
    title: "Kontakt",
    tight: true,
    lines: [
      <>Telefon: <a href="tel:+491723266222" className="rx-link">+49 172 3266222</a></>,
      <>E-Mail: <a href="mailto:adrian.bohrer@unisg.ch" className="rx-link">adrian.bohrer@unisg.ch</a></>,
    ],
  },
  {
    title: "Vertreten durch",
    tight: true,
    lines: ["Adrian Bohrer"],
  },
  {
    title: "Verantwortlich für den Inhalt",
    tight: true,
    lines: ["Adrian Bohrer, Müller-Friedberg-Strasse 8, CH-9000 St.Gallen"],
  },
  {
    title: "Förderung",
    tight: true,
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
        <strong>Hinweis:</strong> Die Kombination
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
    title: "Veröffentlichung zusammengefasster Ergebnisse",
    id: "vergleichswerte",
    lines: [
      "Auf der Ergebnisseite zeigen wir, wie sich die bisherigen Teilnahmen verteilen. Veröffentlicht werden gerundete Quartile (Median und mittlere Hälfte), die Gesamtzahl der Teilnahmen, Gruppengrössen als Spanne und ab zehn Teilnahmen der gerundete Anteil je Quadrant der Matrix. Mittelwerte, Minima und Maxima werden nicht veröffentlicht.",
      "Eine Gruppe erscheint erst ab zwei Teilnahmen. Gruppiert wird grob, je Merkmal in genau zwei Gruppen (Branche, Grösse, Funktion, Hauptsitz) und jeweils nur nach einem Merkmal, nie nach Anbieter und nie nach Freitextangaben. Gruppen mit weniger als fünf Teilnahmen erscheinen nur in einem Merkmal gleichzeitig, damit sich Werte nicht über mehrere Merkmale hinweg einer bestimmten Kombination zuordnen lassen.",
      "In Gruppen aus zwei oder drei Teilnahmen lassen sich aus den Quartilen die einzelnen Werte ableiten. Welcher Organisation sie gehören, ist daraus nicht ersichtlich. Wer selbst zu einer solchen Gruppe gehört, kann aus den eigenen Angaben auf die Werte der anderen schliessen.",
      "Die Werte werden von Hand aus einem Export der Datenbank berechnet und mit einem Stand-Datum veröffentlicht. Ein neuer Stand erscheint erst, wenn mindestens zwei neue Teilnahmen hinzugekommen sind. Die Website kann die Datenbank weiterhin nicht lesen. Ihre eigenen Antworten fliessen frühestens in den nächsten Stand ein.",
      "Bereits veröffentlichte Stände bleiben unverändert, auch wenn ein Datensatz später gelöscht wird.",
    ],
  },
  {
    title: "Ergebnis-Code",
    id: "ergebnis-code",
    lines: [
      "Am Ende des Fragebogens zeigt die Ergebnisseite einen Ergebnis-Code aus 20 Zeichen. Er wird in Ihrem Browser aus Ihren Antworten berechnet und enthält Ihre vier Fähigkeitswerte, die drei Werte der Matrix, den Anteil der Fragen, die Sie ohne „Weiss ich nicht“ beantwortet haben, und Ihre Angaben zu Branche, Grösse, Hauptsitz und Funktion in Kurzform. Einzelne Antworten, der Anbieter und Freitext sind nicht enthalten.",
      "Mit dem Code können Sie sich auf der Startseite des Self-Assessments anmelden. Ihre Werte erscheinen dann auch auf einem anderen Gerät, als Ergebnisseite ohne Ihre einzelnen Antworten und im Vergleich mit den anderen Teilnahmen. Der Code wird dabei nur in Ihrem Browser ausgewertet und nicht an uns übermittelt. Er verweist nicht auf Ihren Datensatz in der Datenbank, die Website kann die Datenbank auch damit nicht lesen.",
      "Der Code ist nicht verschlüsselt, sondern nur kurz geschrieben: Wer ihn kennt, kann die darin enthaltenen Werte sehen. Geben Sie ihn deshalb nur weiter, wenn Sie das möchten. Nach der Anmeldung merkt sich Ihr Browser den Code, bis Sie sich abmelden.",
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

type Section = (typeof sections)[number];

function LegalSection({ section }: { section: Section }) {
  const ref = useRef<HTMLElement>(null);
  const seen = useInViewOnce(ref, { amount: 0.05, margin: "0px 0px -12% 0px" });
  return (
    <section
      ref={ref}
      id={section.id}
      data-in={seen ? "true" : "false"}
      className="fr-legal__sec"
      // sonst verschwindet die Ueberschrift beim Sprung hinter der fixierten Kopfzeile
      style={{ scrollMarginTop: "96px" }}
    >
      <h2 className="fr-legal__h">{section.title}</h2>
      <div className={"fr-legal__body" + (section.tight ? " fr-legal__body--tight" : "")}>
        {section.lines.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
    </section>
  );
}

const Impressum = () => {
  return (
    <div className="fr-page fr-scope">
      <SubHeader back="Zurück zur Startseite" />

      <main>
        <section className="fr-hero">
          <div className="rx-wrap fr-hero__grid">
            <div>
              <SplitHeading as="h1" className="rx-h1">
                Impressum
              </SplitHeading>
              <div className="fr-meta-row">
                <span className="fr-chip">
                  <i className="rx-dot rx-dot--done" aria-hidden="true" />
                  Rechtliches
                </span>
              </div>
            </div>
            <RadarLines tone="light" rings={4} className="fr-hero__radar--legal" />
          </div>
        </section>

        <div className="rx-wrap fr-legal">
          {sections.map((section) => (
            <LegalSection key={section.title} section={section} />
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};

export default Impressum;
