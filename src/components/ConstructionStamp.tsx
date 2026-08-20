// TEMP: temporärer "In Construction!"-Stempel.
// Zum Entfernen: diese Datei löschen und die beiden <ConstructionStamp />-Zeilen
// (+ Importe) in src/pages/Index.tsx und src/pages/Assessment.tsx entfernen.
const STAMP = "rgba(225,45,45,0.5)";

const ConstructionStamp = () => (
  <div
    aria-hidden
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      pointerEvents: "none", // blockiert keine Klicks/Scroll, Seite bleibt bedienbar
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <div
      style={{
        transform: "rotate(-14deg)",
        border: `6px solid ${STAMP}`,
        borderRadius: "14px",
        padding: "clamp(8px, 1.8vw, 18px) clamp(16px, 4vw, 44px)",
        color: STAMP,
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        fontSize: "clamp(22px, 6.2vw, 66px)",
        lineHeight: 1.05,
        whiteSpace: "nowrap",
        textShadow: "0 2px 14px rgba(0,0,0,0.25)",
        boxShadow: `inset 0 0 0 2px ${STAMP}`,
      }}
    >
      Under Construction
    </div>
  </div>
);

export default ConstructionStamp;
