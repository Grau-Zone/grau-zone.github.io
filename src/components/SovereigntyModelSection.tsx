// Homepage-Sektion für das Refined Digital Sovereignty Model (v13).
// Steht zwischen "Die drei Dimensionen" und "Digitale Souveränität von Organisationen".
import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { EASE_IN_OUT, ScanDivider, SectionHeader } from "@/components/fx";
import SovereigntyModelDiagram from "./SovereigntyModelDiagram";

/**
 * Farbwort im Lead: Sobald das Diagramm steht, deckt sich eine farbige Kopie
 * (aria-hidden) von links nach rechts über dem Wort auf. Der clip-path-Wipe
 * bewegt nichts und läuft deshalb auch bei reduzierter Bewegung (sanfte Stufe).
 * Die Kopie kommt aus ::after (content: attr(data-text)), damit sie weder in
 * textContent/innerText noch in Auswahl oder Seitensuche auftaucht.
 */
function ColorWord({ color, play, children }: { color: string; play: boolean; children: string }) {
  return (
    <span className="relative">
      {children}
      <motion.span
        aria-hidden="true"
        data-text={children}
        // Vertikal zentriert statt top-0: Die Inline-Box des Worts ist so hoch wie die
        // Schrift, die Kopie so hoch wie die Zeile (leading-relaxed). Erst zentriert
        // liegen beide Grundlinien genau aufeinander.
        className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 select-none whitespace-nowrap after:content-[attr(data-text)]"
        style={{ color }}
        initial={{ clipPath: "inset(0% 100% 0% 0%)" }}
        animate={play ? { clipPath: "inset(0% 0% 0% 0%)" } : undefined}
        transition={{ duration: 0.5, ease: EASE_IN_OUT }}
      />
    </span>
  );
}

const SovereigntyModelSection = () => {
  const [built, setBuilt] = useState(false);
  const onBuilt = useCallback(() => setBuilt(true), []);

  return (
    <section
      id="modell"
      className="relative py-24 lg:py-36 overflow-hidden"
      style={{ background: "transparent" }}
    >
      {/* Divider top */}
      <ScanDivider position="top" />

      <div className="max-w-[1600px] mx-auto px-6 lg:px-10 relative z-10">
        {/* Section header */}
        <SectionHeader
          eyebrow="Das Modell dahinter"
          lines={["Zwei Wege, unter Abhängigkeit", "handlungsfähig zu bleiben."]}
          className="mb-16 lg:mb-20 max-w-3xl"
          leadClassName="text-base leading-relaxed"
          lead={
            <>
              Sieben Response Capabilities wirken über zwei Mechanismen auf zwei getrennte
              Souveränitäts-Dimensionen. Erst beide Dimensionen zusammen tragen die Kontinuität, wenn
              der Anbieter ausfällt oder einseitig handelt.{" "}
              <ColorWord color="#6b9bd8" play={built}>Blau</ColorWord> ist der Exit-Pfad (Abhängigkeit
              reduzieren),{" "}
              <ColorWord color="#5cbf8a" play={built}>grün</ColorWord> der Kontroll-Pfad (Kontrolle behalten).
            </>
          }
        />

        {/* Diagramm */}
        <SovereigntyModelDiagram onBuilt={onBuilt} />
      </div>
    </section>
  );
};

export default SovereigntyModelSection;
