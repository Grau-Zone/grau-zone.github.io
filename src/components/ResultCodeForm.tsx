// Eingabe des Ergebnis-Codes (data/resultCode.ts) auf der Startseite von /assessment.
// Prueft nur im Browser; uebergibt einen gueltigen Code in fester
// Schreibweise an onLogin. Nichts wird uebertragen.
//
// Redesign: Das Feld ist eine Haarlinien-Pille, der Knopf eine Pille mit Pfeil, der beim Hover
// 4 px wandert (nur auf Geraeten mit Hover). Fehler und Hinweis stehen unveraendert unter dem
// Feld (aria-describedby, role="alert" bei Fehler). Farben aus den --rv-* Variablen: auf Weiss
// Tinte und HSG-Gruen, in einem rx-deep Abschnitt Hellgruen und Mint.
import { forwardRef, useState } from "react";
import { decodeResult, formatCode } from "../data/resultCode";
import type { Lang } from "../data/instrument";
import { RvTokens } from "./resultfx/tokens";

type T = { en: string; de: string };
const t = (en: string, de: string): T => ({ en, de });

const TXT = {
  label: t("Sign in with your result code", "Mit Ihrem Ergebnis-Code anmelden"),
  hint: t(
    "You will find the result code at the end of the self-assessment. With it, your values appear on any device.",
    "Den Ergebnis-Code finden Sie am Ende des Self-Assessments. Damit erscheinen Ihre Werte auf jedem Gerät."
  ),
  button: t("Sign in", "Anmelden"),
  error: t("This code is not valid. Please check your entry.", "Dieser Code ist ungültig. Bitte prüfen Sie die Eingabe."),
  rid: t(
    "This is your response ID, not the result code. The result code looks like XXXX-XXXX-XXXX-XXXX-XXXX and is shown at the end of the self-assessment. For an earlier participation, you can request it by e-mail to adrian.bohrer@unisg.ch.",
    "Das ist Ihre Antwort-Kennung, nicht der Ergebnis-Code. Der Ergebnis-Code hat die Form XXXX-XXXX-XXXX-XXXX-XXXX und steht am Ende des Self-Assessments. Für eine frühere Teilnahme erhalten Sie ihn auf Anfrage per E-Mail an adrian.bohrer@unisg.ch."
  ),
};

// Haeufige Verwechslung: die Antwort-Kennung (UUID bzw. "r-..." aus submit.ts).
const looksLikeResponseId = (s: string) => /^\s*([0-9a-f]{8}-[0-9a-f]{4}-|r-[a-z0-9]{6,})/i.test(s);

const CSS = `
.rcf{font-size:1rem;line-height:1.55;color:var(--rv-ink,#0c1310)}
.rcf-label{display:block;margin:0 0 .65rem;font-weight:600;font-size:.9375rem;color:var(--rv-ink,#0c1310)}
.rcf-row{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center}
.rcf-input{box-sizing:border-box;width:20rem;max-width:100%;min-height:2.75rem;padding:.55rem 1.2rem;border-radius:999px;border:0;background:transparent;box-shadow:inset 0 0 0 1px var(--rv-line-2,rgba(12,19,16,0.38));color:var(--rv-ink,#0c1310);font-family:'Share Tech Mono',ui-monospace,monospace;font-size:1rem;letter-spacing:.08em;transition:box-shadow .3s cubic-bezier(0.16,1,0.3,1)}
.rcf-input::placeholder{color:var(--rv-mute,#4f5d56);opacity:.7}
.rcf-input:hover{box-shadow:inset 0 0 0 1px var(--rv-ink,#0c1310)}
.rcf-input:focus{outline:none;box-shadow:inset 0 0 0 2px var(--rv-accent,#00802f)}
.rcf-input:focus-visible{outline:2px solid var(--rv-accent,#00802f);outline-offset:3px;box-shadow:inset 0 0 0 1px var(--rv-accent,#00802f)}
.rcf-input[aria-invalid='true']{box-shadow:inset 0 0 0 2px var(--rv-warn,#8a5a12)}
.rcf-btn{display:inline-flex;align-items:center;gap:.6rem;min-height:2.75rem;padding:.7rem 1.4rem;border:0;border-radius:999px;background:var(--rcf-btn-bg,var(--rx-green,#00802f));color:var(--rcf-btn-ink,#fff);font:inherit;font-weight:600;font-size:.9375rem;cursor:pointer;transition:background-color .25s ease,transform .16s cubic-bezier(0.16,1,0.3,1)}
.rx-deep .rcf-btn,.rv-deep .rcf-btn{--rcf-btn-bg:#6fd69a;--rcf-btn-ink:#06301d}
.rcf-btn:active{transform:scale(0.97)}
.rcf-btn svg{transition:transform .4s cubic-bezier(0.16,1,0.3,1)}
@media (hover:hover) and (pointer:fine){.rcf-btn:hover{background:var(--rcf-btn-hover,var(--rx-green-ink,#006a27))}.rcf-btn:hover svg{transform:translateX(4px)}.rx-deep .rcf-btn:hover,.rv-deep .rcf-btn:hover{--rcf-btn-hover:#8be3b0}}
@media (prefers-reduced-motion:reduce){.rcf-btn:active{transform:none}.rcf-btn svg{transition:none}.rcf-btn:hover svg{transform:none}}
.rcf-hint{margin:.65rem 0 0;max-width:62ch;font-size:.9375rem;color:var(--rv-mute,#4f5d56)}
.rcf-hint[role='alert']{color:var(--rv-warn,#8a5a12)}
.rcf[data-align='center'] .rcf-hint{margin-inline:auto}
`;

type Props = {
  lang: Lang;
  onLogin: (code: string) => void;
  id?: string;
  label?: T;
  hint?: T;
  button?: T;
  align?: "left" | "center";
};

const ResultCodeForm = forwardRef<HTMLInputElement, Props>(function ResultCodeForm(
  { lang, onLogin, id = "result-code", label = TXT.label, hint = TXT.hint, button = TXT.button, align = "left" },
  ref,
) {
  const p = (v: T) => (lang === "en" ? v.en : v.de);
  const [value, setValue] = useState("");
  const [err, setErr] = useState<"invalid" | "rid" | null>(null);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!decodeResult(value)) { setErr(looksLikeResponseId(value) ? "rid" : "invalid"); return; }
    setValue(""); setErr(null);
    onLogin(formatCode(value));
  };
  return (
    <form onSubmit={submit} className="rcf" data-align={align} style={{ textAlign: align }}>
      <RvTokens />
      <style>{CSS}</style>
      <label htmlFor={id} className="rcf-label">
        {p(label)}
      </label>
      <div className="rcf-row" style={{ justifyContent: align === "center" ? "center" : "flex-start" }}>
        <input
          ref={ref} id={id} value={value} placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
          onChange={(e) => { setValue(e.target.value); setErr(null); }}
          autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={44}
          aria-invalid={!!err} aria-describedby={id + "-hint"}
          className="rcf-input"
        />
        <button type="submit" className="rcf-btn">
          {p(button)}
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" />
          </svg>
        </button>
      </div>
      <p id={id + "-hint"} role={err ? "alert" : undefined} className="rcf-hint">
        {p(err === "rid" ? TXT.rid : err ? TXT.error : hint)}
      </p>
    </form>
  );
});

export default ResultCodeForm;
