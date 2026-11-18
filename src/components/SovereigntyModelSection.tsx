// Homepage-Sektion für das Refined Digital Sovereignty Model (v13), tiefgrüner Grund.
// Steht zwischen "Die drei Dimensionen" und "Digitale Souveränität von Organisationen".
//
// Kopf: Titel mit einem Mint-Wort, darunter die ersten zwei Sätze als Scroll-Satz (Wörter
// hellen sich beim Scrollen auf) und rechts die Farblegende. Ein Feld treibender Mint-Linien
// liegt hinter dem Kopf und läuft nach unten aus, damit das Diagramm auf ruhigem Grund steht.
import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { EASE_IN_OUT, ScrollWords } from "@/components/fx";
import { AmbientField, SplitHeading } from "@/rx";
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
    <span className="relative font-semibold">
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
    <section id="modell" className="rx-sec rx-deep">
      {/* Treibende Mint-Linien hinter dem Kopf, nach unten ausgeblendet */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[74%]"
        style={{
          maskImage: "linear-gradient(to bottom, #000 30%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, #000 30%, transparent 100%)",
        }}
      >
        <AmbientField className="rx-ambient" />
      </div>

      <div className="rx-wrap">
        <SplitHeading as="h2" className="rx-h2 !max-w-[24ch] [&_.text-green]:text-mint" em="Wege">
          Zwei Wege, unter Abhängigkeit handlungsfähig zu bleiben.
        </SplitHeading>

        <div className="mt-[clamp(2rem,4vw,3.5rem)] grid gap-8 min-[900px]:grid-cols-12 min-[900px]:items-end min-[900px]:gap-x-10">
          <ScrollWords
            as="p"
            text="Sieben Response Capabilities wirken über zwei Mechanismen auf zwei getrennte Souveränitäts-Dimensionen. Erst beide Dimensionen zusammen tragen die Kontinuität, wenn der Anbieter ausfällt oder einseitig handelt."
            highlight={{ Kontinuität: "#6fd69a" }}
            scanLine={false}
            min={0.28}
            className="m-0 min-w-0 text-[clamp(1.4rem,2.5vw,2.2rem)] font-medium leading-[1.2] tracking-[-0.025em] text-deep-on min-[900px]:col-span-8"
          />
          <p className="m-0 min-w-0 text-[1.0625rem] leading-[1.7] text-deep-mute min-[900px]:col-span-4">
            <ColorWord color="#7fb0ea" play={built}>Blau</ColorWord> ist der Exit-Pfad (Abhängigkeit
            reduzieren), <ColorWord color="#6fd69a" play={built}>grün</ColorWord> der Kontroll-Pfad
            (Kontrolle behalten).
          </p>
        </div>
      </div>

      {/* Diagramm: breiter als der Textblock, damit die Beschriftung lesbar bleibt */}
      <div className="relative z-[1] mx-auto mt-[clamp(3rem,6vw,5.5rem)] w-full max-w-[96rem] px-[clamp(1.25rem,4vw,3rem)]">
        <figure className="m-0">
          <SovereigntyModelDiagram onBuilt={onBuilt} />
          {/* Der frühere Kicker "Das Modell dahinter" bleibt als Bildunterschrift erhalten */}
          <figcaption className="mt-5 px-1 text-[0.9375rem] font-semibold text-deep-on">Das Modell dahinter</figcaption>
        </figure>
      </div>
    </section>
  );
};

export default SovereigntyModelSection;
