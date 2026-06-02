import { useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowRight, Check, Loader2 } from "lucide-react";

// TODO: Eigenen Form-/Backend-Endpoint eintragen. Solange dieser leer ist, werden
// Anfragen NICHT versendet (das Formular zeigt dann einen entsprechenden Hinweis).
const CONSULTING_ENDPOINT = "";

const ACCENT = "#4B6EFF";

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

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.15)",
  color: "white",
  fontFamily: "Inter, sans-serif",
  fontSize: "14px",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "Space Grotesk, sans-serif",
  fontSize: "12px",
  fontWeight: 500,
  color: "rgba(255,255,255,0.7)",
  marginBottom: "6px",
  display: "block",
};

const ConsultingCTA = ({ strongestLabels, payload }: ConsultingCTAProps) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>("idle");

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
    <div
      style={{
        marginBottom: "20px",
        padding: "28px",
        borderRadius: "16px",
        background: "rgba(255,255,255,0.06)",
        backdropFilter: "blur(22px) saturate(160%)",
        WebkitBackdropFilter: "blur(22px) saturate(160%)",
        border: `1px solid ${ACCENT}59`,
        boxShadow: `0 0 50px ${ACCENT}1f`,
      }}
    >
      <div
        style={{
          fontFamily: "Space Grotesk, sans-serif",
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "#8ba4ff",
          marginBottom: "10px",
        }}
      >
        Nächster Schritt
      </div>

      <h3
        style={{
          fontFamily: "Space Grotesk, sans-serif",
          fontSize: "clamp(20px, 3vw, 26px)",
          fontWeight: 600,
          color: "white",
          letterSpacing: "-0.02em",
          marginBottom: "10px",
        }}
      >
        {strongestLabels.length === 0 ? (
          "Vom Profil zum Stärkungspfad"
        ) : strongestLabels.length === 1 ? (
          <>
            Ihr größter Hebel: <span style={{ color: ACCENT }}>{strongestLabels[0]}</span>
          </>
        ) : (
          <>
            Ihre größten Hebel: <span style={{ color: ACCENT }}>{strongestLabels.join(", ")}</span>
          </>
        )}
      </h3>

      <p
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: "14px",
          lineHeight: 1.6,
          color: "rgba(255,255,255,0.6)",
          maxWidth: "640px",
          marginBottom: "18px",
        }}
      >
        Im Deep-Dive-Workshop und On-Site-Audit vertiefen wir Ihr Souveränitätsprofil mit
        echten Unternehmensdaten und entwickeln daraus eine priorisierte Roadmap.
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px 18px",
          marginBottom: "22px",
        }}
      >
        {MODULES.map((m) => (
          <span
            key={m}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              fontFamily: "Inter, sans-serif",
              fontSize: "12.5px",
              color: "rgba(255,255,255,0.7)",
            }}
          >
            <span
              style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                background: ACCENT,
                flexShrink: 0,
              }}
            />
            {m}
          </span>
        ))}
      </div>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (o) setStatus("idle");
        }}
      >
        <DialogTrigger asChild>
          <button
            type="button"
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: "14px",
              fontWeight: 600,
              padding: "13px 24px",
              borderRadius: "10px",
              border: "none",
              background: ACCENT,
              color: "#fff",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: `0 8px 28px ${ACCENT}40`,
            }}
          >
            Deep-Dive anfragen <ArrowRight size={16} />
          </button>
        </DialogTrigger>

        <DialogContent
          style={{
            background: "rgba(14,16,26,0.92)",
            backdropFilter: "blur(26px) saturate(160%)",
            WebkitBackdropFilter: "blur(26px) saturate(160%)",
            border: "1px solid rgba(255,255,255,0.14)",
            color: "white",
            maxWidth: "460px",
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "Space Grotesk, sans-serif", color: "white" }}>
              Deep-Dive anfragen
            </DialogTitle>
            <DialogDescription style={{ color: "rgba(255,255,255,0.55)" }}>
              Hinterlassen Sie Ihre E-Mail-Adresse. Wir melden uns mit einem konkreten Vorschlag
              für Ihr Souveränitätsprofil.
            </DialogDescription>
          </DialogHeader>

          {done ? (
            <div style={{ padding: "8px 0 4px", textAlign: "center" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  background: "rgba(0,196,160,0.15)",
                  border: "1px solid rgba(0,196,160,0.4)",
                  display: "grid",
                  placeItems: "center",
                  margin: "0 auto 14px",
                }}
              >
                <Check size={20} style={{ color: "#00C4A0" }} />
              </div>
              <p style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "15px", color: "white", marginBottom: "6px" }}>
                Vielen Dank, wir melden uns.
              </p>
              {status === "noendpoint" && (
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "rgba(255,159,46,0.8)" }}>
                  Hinweis: Versand-Endpoint noch nicht konfiguriert (CONSULTING_ENDPOINT).
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "4px" }}>
              <div>
                <label htmlFor="cta-email" style={labelStyle}>
                  E-Mail-Adresse
                </label>
                <input
                  id="cta-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@unternehmen.de"
                  style={fieldStyle}
                />
              </div>

              <div>
                <label htmlFor="cta-message" style={labelStyle}>
                  Nachricht (optional)
                </label>
                <textarea
                  id="cta-message"
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Worum geht es konkret?"
                  style={{ ...fieldStyle, resize: "vertical" }}
                />
              </div>

              <label style={{ display: "flex", gap: "10px", alignItems: "flex-start", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  style={{ marginTop: "3px", accentColor: ACCENT, flexShrink: 0 }}
                />
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
                  Ich bin mit der Verarbeitung meiner Angaben zur Kontaktaufnahme einverstanden (
                  <a href="/datenschutz" target="_blank" rel="noreferrer" style={{ color: "#8ba4ff", textDecoration: "underline" }}>
                    Datenschutz
                  </a>
                  ).
                </span>
              </label>

              {status === "error" && (
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#f0566a" }}>
                  Senden fehlgeschlagen, bitte später erneut versuchen.
                </p>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                style={{
                  fontFamily: "Space Grotesk, sans-serif",
                  fontSize: "14px",
                  fontWeight: 600,
                  padding: "12px 20px",
                  borderRadius: "10px",
                  border: "none",
                  background: ACCENT,
                  color: "#fff",
                  cursor: canSubmit ? "pointer" : "not-allowed",
                  opacity: canSubmit ? 1 : 0.5,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                {status === "submitting" ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Senden ...
                  </>
                ) : (
                  "Anfrage senden"
                )}
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConsultingCTA;
