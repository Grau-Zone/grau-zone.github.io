import { useRef, useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowRight, Loader2 } from "lucide-react";
import { Magnetic, Reveal, useInViewOnce } from "@/components/fx";
import { AmbientField } from "@/rx/AmbientField";
import RadarLines from "./frame/RadarLines";
import "./frame/frame.css";

// Heute wird diese Komponente nirgends eingebunden (siehe FUNKTIONEN.md, F33).
// Die Gestaltung ist trotzdem fertig, damit sie ohne weitere Arbeit in eine Seite
// gesetzt werden kann: ein tiefgruenes Feld mit ruhigen Linien, einem grossen Radar,
// der sich beim Hineinscrollen zeichnet, und einem weissen Knopf, der den Dialog oeffnet.

// TODO: Eigenen Form-/Backend-Endpoint eintragen. Solange dieser leer ist, werden
// Anfragen NICHT versendet (das Formular zeigt dann einen entsprechenden Hinweis).
const CONSULTING_ENDPOINT = "";

const MODULES = [
  "Cloud Dependency Mapping",
  "Data Sovereignty & Governance",
  "Regulatory Readiness (DORA, NIS2, GDPR, AI Act)",
  "Strategische Handlungsfelder",
];

type Status = "idle" | "submitting" | "success" | "error" | "noendpoint";

interface ConsultingCTAProps {
  strongestLabels: string[];
  payload?: Record<string, unknown>;
}

const ConsultingCTA = ({ strongestLabels, payload }: ConsultingCTAProps) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const boxRef = useRef<HTMLDivElement>(null);
  const seen = useInViewOnce(boxRef, { amount: 0.25, margin: "0px" });

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canSubmit = emailValid && consent && status !== "submitting";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const body = {
      email,
      message,
      strongestCapacities: strongestLabels,
      ...payload,
      timestamp: new Date().toISOString(),
    };
    if (!CONSULTING_ENDPOINT) {
      console.warn(
        "ConsultingCTA: CONSULTING_ENDPOINT ist nicht gesetzt, Anfrage wurde nicht versendet.",
        body
      );
      setStatus("noendpoint");
      return;
    }
    setStatus("submitting");
    try {
      const res = await fetch(CONSULTING_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  const done = status === "success" || status === "noendpoint";

  return (
    <div ref={boxRef} data-in={seen ? "true" : "false"} className="rx-deep fr-scope fr-cta">
      <AmbientField className="rx-ambient" />
      <RadarLines tone="deep" rings={5} sweep className="fr-cta__radar" />

      <div className="fr-cta__in">
        <Reveal as="h3" className="fr-cta__h">
          {strongestLabels.length === 0 ? (
            "Vom Profil zum Stärkungspfad"
          ) : strongestLabels.length === 1 ? (
            <>
              Ihr größter Hebel: <span className="fr-cta__hot">{strongestLabels[0]}</span>
            </>
          ) : (
            <>
              Ihre größten Hebel: <span className="fr-cta__hot">{strongestLabels.join(", ")}</span>
            </>
          )}
        </Reveal>

        <div className="fr-meta-row">
          <span className="fr-chip">
            <i className="rx-dot rx-dot--done" aria-hidden="true" />
            Nächster Schritt
          </span>
        </div>

        <Reveal as="p" delay={0.1} className="fr-cta__p">
          Im Deep-Dive-Workshop und On-Site-Audit vertiefen wir Ihr Souveränitätsprofil mit
          echten Unternehmensdaten und entwickeln daraus eine priorisierte Roadmap.
        </Reveal>

        <ul className="fr-cta__mods">
          {MODULES.map((m, i) => (
            <li key={m} className="fr-cta__mod" style={{ ["--d" as string]: `${0.2 + i * 0.16}s` }}>
              <i className="rx-dot rx-dot--done" aria-hidden="true" />
              {m}
            </li>
          ))}
        </ul>

        <div className="fr-cta__act">
          <Dialog
            open={open}
            onOpenChange={(o) => {
              setOpen(o);
              if (o) setStatus("idle");
            }}
          >
            <Magnetic>
              <DialogTrigger asChild>
                <button type="button" className="rx-pill fr-pill-light">
                  Deep-Dive anfragen <ArrowRight size={16} aria-hidden="true" />
                </button>
              </DialogTrigger>
            </Magnetic>

            <DialogContent className="fr-dialog fr-scope">
              <DialogHeader>
                <DialogTitle>Deep-Dive anfragen</DialogTitle>
                <DialogDescription>
                  Hinterlassen Sie Ihre E-Mail-Adresse. Wir melden uns mit einem konkreten Vorschlag
                  für Ihr Souveränitätsprofil.
                </DialogDescription>
              </DialogHeader>

              {done ? (
                <div className="fr-done">
                  <svg className="fr-check" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
                    <circle cx="24" cy="24" r="22" pathLength={1} />
                    <path d="M14.5 25l6.5 6.5L34 17" pathLength={1} />
                  </svg>
                  <p className="fr-done__t">Vielen Dank, wir melden uns.</p>
                  {status === "noendpoint" && (
                    <p className="fr-done__n">
                      Hinweis: Versand-Endpoint noch nicht konfiguriert (CONSULTING_ENDPOINT).
                    </p>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="fr-form-light">
                  <div>
                    <label htmlFor="cta-email" className="fr-flabel">
                      E-Mail-Adresse
                    </label>
                    <input
                      id="cta-email"
                      className="fr-in"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@unternehmen.de"
                    />
                  </div>

                  <div>
                    <label htmlFor="cta-message" className="fr-flabel">
                      Nachricht (optional)
                    </label>
                    <textarea
                      id="cta-message"
                      className="fr-in"
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Worum geht es konkret?"
                      style={{ resize: "vertical" }}
                    />
                  </div>

                  <label className="fr-consent-light">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                    />
                    <span>
                      Ich bin mit der Verarbeitung meiner Angaben zur Kontaktaufnahme einverstanden (
                      <a href="/datenschutz" target="_blank" rel="noreferrer">
                        Datenschutz
                      </a>
                      ).
                    </span>
                  </label>

                  {status === "error" && (
                    <p className="fr-err">
                      Senden fehlgeschlagen, bitte später erneut versuchen.
                    </p>
                  )}

                  <div>
                    <button type="submit" disabled={!canSubmit} className="rx-pill">
                      {status === "submitting" ? (
                        <>
                          <Loader2 size={16} className="animate-spin" aria-hidden="true" /> Senden ...
                        </>
                      ) : (
                        "Anfrage senden"
                      )}
                    </button>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default ConsultingCTA;
