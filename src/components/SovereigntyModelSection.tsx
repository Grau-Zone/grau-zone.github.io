// Homepage-Sektion für das Refined Digital Sovereignty Model (v13).
// Steht zwischen "Die drei Dimensionen" und "Digitale Souveränität von Organisationen".
import { motion } from "framer-motion";
import SovereigntyModelDiagram from "./SovereigntyModelDiagram";

const SovereigntyModelSection = () => {
  return (
    <section
      id="modell"
      className="relative py-24 lg:py-36 overflow-hidden"
      style={{ background: "transparent" }}
    >
      {/* Divider top */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(139,164,255,0.15), transparent)" }}
      />

      <div className="max-w-[1600px] mx-auto px-6 lg:px-10 relative z-10">
        {/* Section header */}
        <div className="mb-16 lg:mb-20 max-w-3xl">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="inline-block text-xs font-semibold tracking-[0.2em] uppercase mb-4"
            style={{ color: "rgba(139,164,255,0.6)", fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Das Modell dahinter
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl lg:text-5xl font-semibold text-white mb-4"
            style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.025em" }}
          >
            Zwei Wege, unter Abhängigkeit<br />handlungsfähig zu bleiben.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="text-base leading-relaxed"
            style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" }}
          >
            Sieben Response Capabilities wirken über zwei Mechanismen auf zwei getrennte
            Souveränitäts-Dimensionen — und erst beide gemeinsam tragen die Kontinuität, wenn der
            Anbieter ausfällt oder einseitig handelt. Blau ist der Exit-Pfad (Abhängigkeit
            reduzieren), grün der Kontroll-Pfad (Kontrolle behalten).
          </motion.p>
        </div>

        {/* Diagramm */}
        <SovereigntyModelDiagram />
      </div>
    </section>
  );
};

export default SovereigntyModelSection;
