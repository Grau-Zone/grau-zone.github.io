// Gestaltung der Karten auf /dashboard und im Vergleich (ComparisonView).
import type { CSSProperties } from "react";

export const panelStyles: Record<"card" | "h2" | "lead", CSSProperties> = {
  card: {
    background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "22px 24px",
  },
  h2: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: "18px", color: "white", margin: "0 0 4px" },
  lead: { fontFamily: "Inter, sans-serif", fontSize: "13px", lineHeight: 1.6, color: "rgba(255,255,255,0.5)", margin: "0 0 18px" },
};
