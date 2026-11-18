// Gestaltung der Bloecke im Vergleich (frueher ComparisonView-Karten). Die Ergebnisansicht
// nutzt inzwischen Klassen aus resultfx/ResultFxStyles (rv-block, rv-h, rv-lead); die Objekte
// bleiben fuer Aufrufer erhalten, die sie noch lesen, in den Farben des Reportings.
import type { CSSProperties } from "react";
import { V } from "./resultfx/tokens";

export const panelStyles: Record<"card" | "h2" | "lead", CSSProperties> = {
  card: {
    background: "transparent", border: 0, borderTop: `1px solid ${V.line}`, borderRadius: 0, padding: "2.25rem 0 0",
  },
  h2: { fontWeight: 500, fontSize: "clamp(1.75rem, 3.4vw, 2.9rem)", letterSpacing: "-0.035em", lineHeight: 1.05, color: V.head, margin: 0 },
  lead: { fontSize: "1.0625rem", lineHeight: 1.6, color: V.mute, margin: "1.1rem 0 0", maxWidth: "62ch" },
};
