// Seite fuer die Teilnehmenden des 55. Anwenderforums des IWI-HSG.
//
// Ablauf: erst die Frage nach dem Kontaktwunsch, danach die drei Funktionen.
// Die Entscheidung wird im Browser gemerkt, damit die Frage beim naechsten
// Besuch nicht erneut erscheint. Ein "Nein" verlaesst das Geraet nicht.
//
// Bewusst ohne AnimatePresence: mit Wrapper-Komponenten als Kindern meldet die
// Exit-Animation nie "fertig" (siehe Kommentar in Assessment.tsx).
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Radar, ClipboardCheck, FileDown, Mail, Check, Loader2,
} from "lucide-react";
import {
  readChoice, writeChoice, normalizeEmail, isValidEmail, submitAwfContact,
  AWF_CONSENT_VERSION, type AwfChoice,
} from "../data/awfContacts";
import RadarMark from "../components/RadarMark";
import SiteFooter from "../components/SiteFooter";

const PDF = import.meta.env.BASE_URL + "anwenderforum-55-iwi-hsg-2026.pdf";
const WIDERRUF = "adrian.bohrer@unisg.ch";

type Phase = "ask" | "done" | "edit";
type Status = "idle" | "sending" | "invalid" | "rejected" | "network";

const AKZENT = "#8ba4ff";

const RAND_RUHE = "rgba(255,255,255,0.12)";
const RAND_FEHLER = "rgba(217,165,89,0.65)";

const feldStil: React.CSSProperties = {
  width: "100%", padding: "13px 16px", borderRadius: "10px",
  background: "rgba(255,255,255,0.04)", border: "1px solid " + RAND_RUHE,
  color: "white", fontFamily: "'Inter', sans-serif", fontSize: "15px",
  // Der Fokusring wird in onFocus/onBlur am Feld selbst gesetzt, und zwar ueber
  // outline: box-shadow gehoert der Autofill-Abdeckung in index.css. Ohne den
  // Ring sieht niemand, der mit der Tastatur bedient, wo er gerade steht:
  // ausgerechnet in dem Feld, ueber das die Einwilligung erteilt wird.
  outline: "none", transition: "border-color 0.15s",
};

const karteStil: React.CSSProperties = {
  background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)",
};

// Inline-Styles schlagen Tailwinds hover:-Klassen, deshalb wie in Hero.tsx und
// Footer.tsx ueber currentTarget. onFocus/onBlur zusaetzlich, damit die Karten
// auch bei Tastaturbedienung sichtbar reagieren.
const setzeKarte = (el: HTMLElement, an: boolean) => {
  el.style.background = an ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.025)";
  el.style.borderColor = an ? "rgba(139,164,255,0.3)" : "rgba(255,255,255,0.07)";
};
const karteAn = (e: React.SyntheticEvent<HTMLElement>) => setzeKarte(e.currentTarget, true);
const karteAus = (e: React.SyntheticEvent<HTMLElement>) => setzeKarte(e.currentTarget, false);

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
    <div style={{ minHeight: "100vh", background: "hsl(228 45% 4%)" }}>
      {/* Kopfzeile, wie auf der Impressumsseite */}
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
            <ArrowLeft size={15} /> Zur Startseite
          </Link>
        </div>
      </div>

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
          55. Anwenderforum des IWI-HSG
        </span>
        <h1
          className="text-4xl lg:text-5xl font-semibold text-white mb-5"
          style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.025em" }}
        >
          Danke für Ihre Teilnahme.
        </h1>
        <p
          className="text-base leading-relaxed mb-12"
          style={{ color: "rgba(255,255,255,0.65)", fontFamily: "'Inter', sans-serif", maxWidth: "62ch" }}
        >
          Wir haben uns über den Austausch beim 55. Anwenderforum gefreut. Auf dieser Seite finden
          Sie die Präsentation zum Nachlesen und die beiden Werkzeuge, die wir vorgestellt haben.
        </p>

        {/* ── Kontaktfrage ── */}
        {(phase === "ask" || phase === "edit") && (
          <form noValidate onSubmit={absenden} className="rounded-2xl p-6 lg:p-7 mb-10" style={karteStil}>
            <h2
              className="text-xs font-semibold uppercase tracking-widest mb-4"
              style={{ color: "rgba(139,164,255,0.7)", fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Dürfen wir Sie kontaktieren?
            </h2>

            <label
              htmlFor="awf-email"
              className="block text-sm mb-2"
              style={{ color: "rgba(255,255,255,0.75)", fontFamily: "'Inter', sans-serif" }}
            >
              E-Mail-Adresse
            </label>
            <input
              id="awf-email"
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
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "rgba(139,164,255,0.75)";
                e.currentTarget.style.outline = "3px solid rgba(75,110,255,0.4)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = status === "invalid" ? RAND_FEHLER : RAND_RUHE;
                e.currentTarget.style.outline = "none";
              }}
              style={{ ...feldStil, borderColor: status === "invalid" ? RAND_FEHLER : RAND_RUHE }}
            />

            <p
              id="awf-einwilligung"
              className="text-xs leading-relaxed mt-4"
              style={{ color: "rgba(255,255,255,0.55)", fontFamily: "'Inter', sans-serif" }}
            >
              Mit „Ja“ willigen Sie ein, dass das Institut für Wirtschaftsinformatik der
              Universität St.Gallen Sie per E-Mail zu seinen Themen, Veranstaltungen und
              Forschungsergebnissen kontaktiert. Ihre Adresse wird dafür in einer Datenbank in
              Frankfurt am Main gespeichert und nicht an Dritte weitergegeben. Sie können die
              Einwilligung jederzeit per E-Mail an{" "}
              <a href={"mailto:" + WIDERRUF} style={{ color: AKZENT, textDecoration: "none" }}>{WIDERRUF}</a>{" "}
              widerrufen; Ihre Adresse wird dann gelöscht.
            </p>
            <p className="text-xs mt-2" style={{ fontFamily: "'Inter', sans-serif" }}>
              <Link to="/impressum#kontaktliste" style={{ color: "rgba(139,164,255,0.85)", textDecoration: "none" }}>
                Impressum und Datenschutz
              </Link>
            </p>

            {/* Der Behaelter steht immer im Baum, damit role="alert" die spaeter
                eingesetzte Meldung auch vorliest. */}
            <div id="awf-meldung" role="alert">
              {status === "invalid" && (
                <p className="text-sm mt-4" style={{ color: "#d9a559", fontFamily: "'Inter', sans-serif" }}>
                  Bitte geben Sie eine gültige E-Mail-Adresse ein.
                </p>
              )}
              {status === "rejected" && (
                <p className="text-sm mt-4 leading-relaxed" style={{ color: "#d9a559", fontFamily: "'Inter', sans-serif" }}>
                  Die Adresse wurde nicht angenommen. Bitte prüfen Sie die Schreibweise, oder
                  schreiben Sie uns kurz an{" "}
                  <a href={"mailto:" + WIDERRUF} style={{ color: AKZENT, textDecoration: "none" }}>{WIDERRUF}</a>.
                </p>
              )}
              {status === "network" && (
                <p className="text-sm mt-4 leading-relaxed" style={{ color: "#d9a559", fontFamily: "'Inter', sans-serif" }}>
                  Die Übermittlung hat nicht geklappt. Bitte versuchen Sie es noch einmal, oder
                  schreiben Sie uns an{" "}
                  <a href={"mailto:" + WIDERRUF} style={{ color: AKZENT, textDecoration: "none" }}>{WIDERRUF}</a>.
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-3 mt-6">
              <button
                type="submit"
                disabled={status === "sending"}
                className="inline-flex items-center gap-2"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif", fontSize: "15px", fontWeight: 500,
                  padding: "13px 24px", borderRadius: "10px",
                  border: "1px solid rgba(75,110,255,0.45)", background: "rgba(75,110,255,0.18)",
                  color: "#a8bcff", cursor: status === "sending" ? "default" : "pointer",
                  opacity: status === "sending" ? 0.6 : 1,
                }}
              >
                {status === "sending"
                  ? (<><Loader2 size={16} className="animate-spin" /> Wird übermittelt …</>)
                  : (<><Mail size={16} /> Ja, kontaktieren Sie mich</>)}
              </button>
              <button
                type="button"
                onClick={ablehnen}
                disabled={status === "sending"}
                style={{
                  fontFamily: "'Space Grotesk', sans-serif", fontSize: "15px",
                  padding: "13px 22px", borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)",
                  color: "rgba(255,255,255,0.7)", cursor: "pointer",
                }}
              >
                Nein, danke
              </button>
              {phase === "edit" && (
                <button
                  type="button"
                  onClick={() => { setPhase("done"); setStatus("idle"); }}
                  className="text-sm"
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Abbrechen
                </button>
              )}
            </div>

            {phase === "edit" && hatBereitsJa && (
              <p className="text-xs mt-4 leading-relaxed" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" }}>
                Ein „Nein, danke“ hält nur diese Seite fest, dass wir Sie nicht mehr fragen sollen.
                Ihre bereits übermittelte Adresse löschen wir auf Zuruf: eine kurze Mail an{" "}
                <a href={"mailto:" + WIDERRUF} style={{ color: AKZENT, textDecoration: "none" }}>{WIDERRUF}</a>{" "}
                genügt.
              </p>
            )}
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
              <div
                className="rounded-2xl px-5 py-4 mb-8 flex items-start gap-3"
                style={{ background: "rgba(108,194,181,0.07)", border: "1px solid rgba(108,194,181,0.22)" }}
              >
                <Check size={17} style={{ color: "#6cc2b5", marginTop: "2px", flexShrink: 0 }} />
                <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.75)", fontFamily: "'Inter', sans-serif" }}>
                  {ersetzt ? (
                    <>
                      Vielen Dank, wir melden uns an <strong style={{ color: "white" }}>{choice.email}</strong>.
                      Die zuvor übermittelte Adresse <strong style={{ color: "white" }}>{ersetzt}</strong> steht
                      noch in unserer Liste; diese Seite kann sie nicht selbst entfernen. Eine kurze Mail an{" "}
                      <a href={"mailto:" + WIDERRUF} style={{ color: AKZENT, textDecoration: "none" }}>{WIDERRUF}</a>{" "}
                      genügt, dann löschen wir sie.
                    </>
                  ) : (
                    <>Vielen Dank, wir melden uns. Notiert ist <strong style={{ color: "white" }}>{choice.email}</strong>.</>
                  )}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <Link to="/" className="block rounded-2xl p-6 lg:p-7 transition-colors" style={karteStil} onMouseEnter={karteAn} onMouseLeave={karteAus} onFocus={karteAn} onBlur={karteAus}>
                <div className="flex items-start gap-4">
                  <Radar size={22} style={{ color: AKZENT, marginTop: "3px", flexShrink: 0 }} />
                  <div className="flex-1">
                    <div className="text-lg font-semibold text-white mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      Sovereignty Radar
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.65)", fontFamily: "'Inter', sans-serif" }}>
                      Digitale Abhängigkeiten in Europa, drei Szenarien bis 2030 und das Modell
                      dahinter.
                    </p>
                  </div>
                  <ArrowRight size={17} style={{ color: "rgba(255,255,255,0.35)", marginTop: "5px", flexShrink: 0 }} />
                </div>
              </Link>

              <Link to="/assessment" className="block rounded-2xl p-6 lg:p-7 transition-colors" style={karteStil} onMouseEnter={karteAn} onMouseLeave={karteAus} onFocus={karteAn} onBlur={karteAus}>
                <div className="flex items-start gap-4">
                  <ClipboardCheck size={22} style={{ color: "#6cc2b5", marginTop: "3px", flexShrink: 0 }} />
                  <div className="flex-1">
                    <div className="text-lg font-semibold text-white mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      Organisation Self-Assessment
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.65)", fontFamily: "'Inter', sans-serif" }}>
                      Wie gross ist Ihr Handlungsspielraum bei einer kritischen digitalen
                      Abhängigkeit? Vier Fähigkeiten, eine Funktion, ein Anbieter.
                    </p>
                  </div>
                  <ArrowRight size={17} style={{ color: "rgba(255,255,255,0.35)", marginTop: "5px", flexShrink: 0 }} />
                </div>
              </Link>

              <a href={PDF} download className="block rounded-2xl p-6 lg:p-7 transition-colors" style={{ ...karteStil, textDecoration: "none" }} onMouseEnter={karteAn} onMouseLeave={karteAus} onFocus={karteAn} onBlur={karteAus}>
                <div className="flex items-start gap-4">
                  <FileDown size={22} style={{ color: "#d9a559", marginTop: "3px", flexShrink: 0 }} />
                  <div className="flex-1">
                    <div className="text-lg font-semibold text-white mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      Präsentation herunterladen
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.65)", fontFamily: "'Inter', sans-serif" }}>
                      Die Folien des Anwenderforums. PDF, 121 Seiten, rund 9 MB.
                    </p>
                  </div>
                  <ArrowRight size={17} style={{ color: "rgba(255,255,255,0.35)", marginTop: "5px", flexShrink: 0 }} />
                </div>
              </a>
            </div>

            <p className="text-xs mt-8" style={{ fontFamily: "'Inter', sans-serif" }}>
              <button
                type="button"
                onClick={() => { setPhase("edit"); setStatus("idle"); }}
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "rgba(255,255,255,0.55)", fontFamily: "'Inter', sans-serif" }}
              >
                Kontaktwunsch ändern
              </button>
              <span style={{ color: "rgba(255,255,255,0.25)" }}> · </span>
              <Link to="/impressum#kontaktliste" style={{ color: "rgba(255,255,255,0.55)", textDecoration: "none" }}>
                Impressum und Datenschutz
              </Link>
            </p>
          </motion.div>
        )}
      </motion.div>

      <SiteFooter />
    </div>
  );
};

export default Awf;
