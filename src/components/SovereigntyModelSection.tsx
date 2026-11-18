// Homepage-Sektion für das Refined Digital Sovereignty Model (v13), tiefgrüner Grund.
// Steht zwischen "Die drei Dimensionen" und "Digitale Souveränität von Organisationen".
//
// Kopf: Titel mit einem Mint-Wort. Ein Feld treibender Mint-Linien liegt hinter dem Kopf und
// läuft nach unten aus, damit das Diagramm auf ruhigem Grund steht. Der frühere Scroll-Satz
// und der Farbhinweis (Blau = Exit-Pfad, grün = Kontroll-Pfad) sind auf Wunsch entfallen.
import { AmbientField, SplitHeading } from "@/rx";
import SovereigntyModelDiagram from "./SovereigntyModelDiagram";

const SovereigntyModelSection = () => {
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

      </div>

      {/* Diagramm: breiter als der Textblock, damit die Beschriftung lesbar bleibt */}
      <div className="relative z-[1] mx-auto mt-[clamp(3rem,6vw,5.5rem)] w-full max-w-[96rem] px-[clamp(1.25rem,4vw,3rem)]">
        <figure className="m-0">
          <SovereigntyModelDiagram />
          {/* Der frühere Kicker "Das Modell dahinter" bleibt als Bildunterschrift erhalten */}
          <figcaption className="mt-5 px-1 text-[0.9375rem] font-semibold text-deep-on">Das Modell dahinter</figcaption>
        </figure>
      </div>
    </section>
  );
};

export default SovereigntyModelSection;
