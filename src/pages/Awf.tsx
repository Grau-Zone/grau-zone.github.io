// Seite fuer die Teilnehmenden des 55. Anwenderforums des IWI-HSG.
//
// Ablauf: erst die Frage nach dem Kontaktwunsch, danach die drei Funktionen.
// Die Entscheidung wird im Browser gemerkt, damit die Frage beim naechsten
// Besuch nicht erneut erscheint. Ein "Nein" verlaesst das Geraet nicht.
//
// Bewusst ohne AnimatePresence: mit Wrapper-Komponenten als Kindern meldet die
// Exit-Animation nie "fertig" (siehe Kommentar in Assessment.tsx).
//
// Gestaltung: weisser Einstieg mit der Zahl 55 im Radar, darunter eine tiefgruene
// Buehne fuer Frage und Ergebnis. Die Logik ist unveraendert; Formular, Texte,
// Zustaende, Speicherschluessel und Fokusfuehrung stehen wie vorher da.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Mail, Loader2 } from "lucide-react";
import {
  readChoice, writeChoice, normalizeEmail, isValidEmail, submitAwfContact,
  AWF_CONSENT_VERSION, type AwfChoice,
} from "../data/awfContacts";
import { CountUp, Magnetic, PauseToggle, Reveal, RevealGroup, RevealItem } from "@/components/fx";
import { AmbientField } from "@/rx/AmbientField";
import { SplitHeading } from "@/rx/SplitHeading";
import SubHeader from "../components/frame/SubHeader";
import RadarLines from "../components/frame/RadarLines";
import SiteFooter from "../components/SiteFooter";
import "../components/frame/frame.css";

const PDF = import.meta.env.BASE_URL + "anwenderforum-55-iwi-hsg-2026.pdf";
const WIDERRUF = "adrian.bohrer@unisg.ch";

type Phase = "ask" | "done" | "edit";
type Status = "idle" | "sending" | "invalid" | "rejected" | "network";

const mailLink = (
  <a href={"mailto:" + WIDERRUF} className="rx-link">{WIDERRUF}</a>
);

const Awf = () => {
  const gespeichert = useRef<AwfChoice | null>(null);
  if (gespeichert.current === null) gespeichert.current = readChoice();

  const [phase, setPhase] = useState<Phase>(gespeichert.current ? "done" : "ask");
  const [choice, setChoice] = useState<AwfChoice | null>(gespeichert.current);
  const [email, setEmail] = useState(
    gespeichert.current?.choice === "yes" ? gespeichert.current.email : ""
  );
  const [status, setStatus] = useState<Status>("idle");
  // Adresse, die vor einer Aenderung schon uebermittelt war. Sie bleibt in der
  // Datenbank stehen, weil die Seite dort nur schreiben darf; der Bestaetigungs-
  // text muss das sagen, statt eine Ersetzung zu behaupten.
  const [ersetzt, setErsetzt] = useState<string | null>(null);
  const laeuft = useRef(false);

  // Fokus nach dem Wechsel ask -> done. Ohne das faellt er auf <body>, und wer
  // nicht sieht, bekommt vom Ergebnis nichts mit. Nur nach einer Entscheidung
  // in dieser Sitzung, nicht beim Laden mit gespeichertem Eintrag.
  const ergebnisRef = useRef<HTMLDivElement | null>(null);
  const fokusSetzen = useRef(false);
  useEffect(() => {
    if (phase === "done" && fokusSetzen.current) {
      fokusSetzen.current = false;
      ergebnisRef.current?.focus();
    }
  }, [phase]);

  // Die Seite ist nur fuer eingeladene Teilnehmende gedacht und gehoert nicht
  // in den Suchindex. Beim Verlassen wieder entfernen, sonst gilt noindex fuer
  // die ganze Anwendung.
  useEffect(() => {
    const vorher = document.title;
    document.title = "Anwenderforum 2026 · Sovereignty Radar";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => {
      document.title = vorher;
      meta.remove();
    };
  }, []);

  const merken = (c: AwfChoice) => {
    writeChoice(c);
    setChoice(c);
    fokusSetzen.current = true;
    setPhase("done");
    setStatus("idle");
  };

  const ablehnen = () => {
    setErsetzt(null);
    merken({ choice: "no", at: new Date().toISOString(), v: AWF_CONSENT_VERSION });
  };

  // Das Formular traegt noValidate: sonst faengt die Blase des Browsers den Submit
  // ab und die eigene, deutsche Meldung erscheint nie. Geprueft wird hier.
  const absenden = async (e: React.FormEvent) => {
    e.preventDefault();
    if (laeuft.current) return; // faengt den Doppelklick vor dem Re-Render
    const adresse = normalizeEmail(email);
    if (!isValidEmail(adresse)) {
      setStatus("invalid");
      return;
    }
    // Unveraenderte Adresse im Bearbeiten-Modus: nichts erneut senden.
    if (choice?.choice === "yes" && choice.email === adresse) {
      setPhase("done");
      setStatus("idle");
      return;
    }
    const vorherige = choice?.choice === "yes" ? choice.email : null;
    laeuft.current = true;
    setStatus("sending");
    const ergebnis = await submitAwfContact(adresse);
    laeuft.current = false;
    if (ergebnis === "ok") {
      setErsetzt(vorherige);
      merken({ choice: "yes", email: adresse, at: new Date().toISOString(), v: AWF_CONSENT_VERSION });
    } else {
      setStatus(ergebnis === "rejected" ? "rejected" : "network");
    }
  };

  const hatBereitsJa = choice?.choice === "yes";

  return (
    <div className="fr-page fr-scope">
      {/* Pause-Knopf (WCAG 2.2.2): erster Tab-Stopp, sichtbar erst mit Fokus */}
      <PauseToggle />
      <SubHeader back="Zur Startseite" />

      <main>
        {/* ── Einstieg: Dank, Lead und die 55 im Radar ── */}
        <section className="fr-hero">
          <div className="rx-wrap fr-hero__grid">
            <div>
              <SplitHeading as="h1" className="rx-h1" em="Teilnahme">
                Danke für Ihre Teilnahme.
              </SplitHeading>
              <Reveal as="p" delay={0.3} className="rx-sub">
                Wir haben uns über den Austausch beim 55. Anwenderforum gefreut. Auf dieser Seite finden
                Sie die Präsentation zum Nachlesen und die beiden Werkzeuge, die wir vorgestellt haben.
              </Reveal>
            </div>

            <div className="fr-hero__fig">
              <RadarLines tone="light" rings={4} sweep blips={[{ x: 71, y: 27 }, { x: 27, y: 67 }]} />
              <p className="fr-big55">
                <span className="fr-big55__n">
                  <CountUp value="55" duration={2.2} />
                  <span>.</span>
                </span>{" "}
                <span className="fr-big55__t">Anwenderforum des IWI-HSG</span>
              </p>
            </div>
          </div>
        </section>

        {/* ── Buehne: Kontaktfrage oder die drei Funktionen ── */}
        <section className="rx-deep fr-scope fr-stage">
          <AmbientField className="rx-ambient" />
          <div className="rx-wrap">
            {/* ── Kontaktfrage ── */}
            {(phase === "ask" || phase === "edit") && (
              <form noValidate onSubmit={absenden} className="fr-form">
                <div className="fr-form__head">
                  <SplitHeading as="h2" className="rx-h2" em="kontaktieren">
                    Dürfen wir Sie kontaktieren?
                  </SplitHeading>
                </div>

                <div>
                  <label htmlFor="awf-email" className="fr-label">
                    E-Mail-Adresse
                  </label>
                  <input
                    id="awf-email"
                    className="fr-field"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (status !== "sending") setStatus("idle"); }}
                    placeholder="vorname.nachname@unternehmen.ch"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    disabled={status === "sending"}
                    aria-invalid={status === "invalid" || status === "rejected"}
                    aria-describedby="awf-einwilligung awf-meldung"
                  />

                  <p id="awf-einwilligung" className="fr-consent">
                    Mit „Ja“ willigen Sie ein, dass das Institut für Wirtschaftsinformatik der
                    Universität St.Gallen Sie per E-Mail zu seinen Themen, Veranstaltungen und
                    Forschungsergebnissen kontaktiert. Ihre Adresse wird dafür in einer Datenbank in
                    Frankfurt am Main gespeichert und nicht an Dritte weitergegeben. Sie können die
                    Einwilligung jederzeit per E-Mail an{" "}
                    {mailLink}{" "}
                    widerrufen; Ihre Adresse wird dann gelöscht.
                  </p>
                  <p className="fr-consent fr-consent--link">
                    <Link to="/impressum#kontaktliste" className="rx-link">
                      Impressum und Datenschutz
                    </Link>
                  </p>

                  {/* Der Behaelter steht immer im Baum, damit role="alert" die spaeter
                      eingesetzte Meldung auch vorliest. */}
                  <div id="awf-meldung" role="alert" className="fr-alert">
                    {status === "invalid" && (
                      <p>
                        Bitte geben Sie eine gültige E-Mail-Adresse ein.
                      </p>
                    )}
                    {status === "rejected" && (
                      <p>
                        Die Adresse wurde nicht angenommen. Bitte prüfen Sie die Schreibweise, oder
                        schreiben Sie uns kurz an{" "}
                        {mailLink}.
                      </p>
                    )}
                    {status === "network" && (
                      <p>
                        Die Übermittlung hat nicht geklappt. Bitte versuchen Sie es noch einmal, oder
                        schreiben Sie uns an{" "}
                        {mailLink}.
                      </p>
                    )}
                  </div>

                  <div className="fr-actions">
                    <Magnetic>
                      <button type="submit" disabled={status === "sending"} className="rx-pill fr-pill-light">
                        {status === "sending"
                          ? (<><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Wird übermittelt …</>)
                          : (<><Mail size={16} aria-hidden="true" /> Ja, kontaktieren Sie mich</>)}
                      </button>
                    </Magnetic>
                    <button
                      type="button"
                      onClick={ablehnen}
                      disabled={status === "sending"}
                      className="rx-pill rx-pill--ghost"
                    >
                      Nein, danke
                    </button>
                    {phase === "edit" && (
                      <button
                        type="button"
                        onClick={() => { setPhase("done"); setStatus("idle"); }}
                        className="fr-textbtn"
                      >
                        Abbrechen
                      </button>
                    )}
                  </div>

                  {phase === "edit" && hatBereitsJa && (
                    <p className="fr-consent">
                      Ein „Nein, danke“ hält nur diese Seite fest, dass wir Sie nicht mehr fragen sollen.
                      Ihre bereits übermittelte Adresse löschen wir auf Zuruf: eine kurze Mail an{" "}
                      {mailLink}{" "}
                      genügt.
                    </p>
                  )}
                </div>
              </form>
            )}

            {/* ── Die drei Funktionen ── */}
            {phase === "done" && (
              <motion.div
                ref={ergebnisRef}
                tabIndex={-1}
                style={{ outline: "none" }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
              >
                {choice?.choice === "yes" && (
                  <div className="fr-banner">
                    <svg className="fr-check" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
                      <circle cx="24" cy="24" r="22" pathLength={1} />
                      <path d="M14.5 25l6.5 6.5L34 17" pathLength={1} />
                    </svg>
                    <p>
                      {ersetzt ? (
                        <>
                          Vielen Dank, wir melden uns an <strong>{choice.email}</strong>.{" "}
                          <span className="fr-small">
                            Die zuvor übermittelte Adresse <strong>{ersetzt}</strong> steht
                            noch in unserer Liste; diese Seite kann sie nicht selbst entfernen. Eine kurze Mail an{" "}
                            {mailLink}{" "}
                            genügt, dann löschen wir sie.
                          </span>
                        </>
                      ) : (
                        <>Vielen Dank, wir melden uns. Notiert ist <strong>{choice.email}</strong>.</>
                      )}
                    </p>
                  </div>
                )}

                <RevealGroup as="ul" stagger={0.09} className="fr-rows">
                  <RevealItem as="li">
                    <Link to="/" className="fr-row fr-row--d">
                      <span className="fr-row__t">Sovereignty Radar</span>
                      <span className="fr-row__go" aria-hidden="true"><ArrowRight size={18} /></span>
                      <span className="fr-row__d">
                        Digitale Abhängigkeiten in Europa, drei Szenarien bis 2030 und das Modell
                        dahinter.
                      </span>
                    </Link>
                  </RevealItem>
                  <RevealItem as="li">
                    <Link to="/assessment" className="fr-row fr-row--d">
                      <span className="fr-row__t">Organisation Self-Assessment</span>
                      <span className="fr-row__go" aria-hidden="true"><ArrowRight size={18} /></span>
                      <span className="fr-row__d">
                        Wie gross ist Ihr Handlungsspielraum bei einer kritischen digitalen
                        Abhängigkeit? Vier Fähigkeiten, eine Funktion, ein Anbieter.
                      </span>
                    </Link>
                  </RevealItem>
                  <RevealItem as="li">
                    <a href={PDF} download className="fr-row fr-row--d">
                      <span className="fr-row__t">Präsentation herunterladen</span>
                      <span className="fr-row__go" aria-hidden="true"><ArrowRight size={18} /></span>
                      <span className="fr-row__d">
                        Die Folien des Anwenderforums. PDF, 121 Seiten, rund 9 MB.
                      </span>
                    </a>
                  </RevealItem>
                </RevealGroup>

                <p className="fr-meta">
                  <button
                    type="button"
                    onClick={() => { setPhase("edit"); setStatus("idle"); }}
                    className="rx-link fr-textbtn"
                  >
                    Kontaktwunsch ändern
                  </button>
                  <span className="fr-meta__sep"> · </span>
                  <Link to="/impressum#kontaktliste" className="rx-link">
                    Impressum und Datenschutz
                  </Link>
                </p>
              </motion.div>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default Awf;
