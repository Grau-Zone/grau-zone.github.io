// Eingabe des Ergebnis-Codes (data/resultCode.ts) auf der Startseite von /assessment.
// Prueft nur im Browser; uebergibt einen gueltigen Code in fester
// Schreibweise an onLogin. Nichts wird uebertragen.
import { forwardRef, useState } from "react";
import { decodeResult, formatCode } from "../data/resultCode";
import type { Lang } from "../data/instrument";

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
    <form onSubmit={submit} style={{ fontFamily: "Inter, sans-serif", fontSize: "12.5px", lineHeight: 1.6, textAlign: align }}>
      <label htmlFor={id} style={{ display: "block", color: "rgba(255,255,255,0.75)", marginBottom: "6px" }}>
        {p(label)}
      </label>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", justifyContent: align === "center" ? "center" : "flex-start" }}>
        <input
          ref={ref} id={id} value={value} placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
          onChange={(e) => { setValue(e.target.value); setErr(null); }}
          autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={44}
          aria-invalid={!!err} aria-describedby={id + "-hint"}
          style={{
            fontFamily: "'Share Tech Mono', monospace", fontSize: "15px", letterSpacing: "0.08em",
            padding: "8px 12px", borderRadius: "8px", width: "280px", maxWidth: "100%",
            background: "rgba(255,255,255,0.05)", color: "#fff",
            border: `1px solid ${err ? "#d9a559" : "rgba(255,255,255,0.18)"}`,
          }}
        />
        <button type="submit" style={{
          fontFamily: "Inter, sans-serif", fontSize: "13px", padding: "8px 16px", borderRadius: "8px", cursor: "pointer",
          border: "1px solid rgba(139,164,255,0.55)", background: "rgba(75,110,255,0.18)", color: "#c3d0ff",
        }}>
          {p(button)}
        </button>
      </div>
      <p id={id + "-hint"} role={err ? "alert" : undefined}
        style={{ margin: "6px 0 0", color: err ? "#d9a559" : "rgba(255,255,255,0.5)" }}>
        {p(err === "rid" ? TXT.rid : err ? TXT.error : hint)}
      </p>
    </form>
  );
});

export default ResultCodeForm;
