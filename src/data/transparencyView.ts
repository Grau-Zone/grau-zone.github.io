// Felder und Achsen der Transparenz-Matrix (components/TransparencyMatrix.tsx).
import { avgShown, type TraQuadKey } from "./scoring";

// Durchschnitt der Faehigkeiten immer mit einer Stelle, z. B. "4,0".
export const fmtAvg = (v: number, lang: "de" | "en") => avgShown(v).toFixed(1).replace(".", lang === "de" ? "," : ".");

type T = { en: string; de: string };
const t = (en: string, de: string): T => ({ en, de });

export const TRA_QUAD: Record<TraQuadKey, { name: T; desc: T; color: string }> = {
  control: {
    name: t("In control", "Im Griff"),
    desc: t("You know what is going on and have room for manoeuvre.", "Sie wissen, was läuft, und haben Handlungsspielraum."),
    color: "#6cc2b5",
  },
  optimistic: {
    name: t("Optimistic", "Optimistisch"),
    desc: t(
      "You rate your capacities highly, but could not answer many questions. The assessment is uncertain.",
      "Sie schätzen Ihre Fähigkeiten hoch ein, konnten aber viele Fragen nicht beantworten. Die Einschätzung ist unsicher."
    ),
    color: "#6b9bd8",
  },
  bound: {
    name: t("Knowingly bound", "Bewusst gebunden"),
    desc: t("You know the situation well, but the room for manoeuvre is small.", "Sie kennen die Lage gut, der Handlungsspielraum ist aber klein."),
    color: "#d9a559",
  },
  blind: {
    name: t("Flying blind", "Blindflug"),
    desc: t(
      "Little insight and little room for manoeuvre: the first step is to ask around internally.",
      "Wenig Einblick und wenig Spielraum: Hier lohnt es sich zuerst, intern nachzufragen."
    ),
    color: "#cf87a5",
  },
};

export const AXIS_TRA = t("Transparency", "Transparenz");
export const AXIS_AVG = t("Capacities (average)", "Fähigkeiten (Durchschnitt)");
