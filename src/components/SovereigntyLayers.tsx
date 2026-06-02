import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const layers = [
  {
    id: "infra",
    number: "01",
    title: "Infrastruktur-Souveränität",
    subtitle: "Wer besitzt die Cloud?",
    color: "#4B6EFF",
    colorBg: "rgba(75,110,255,0.08)",
    colorBorder: "rgba(75,110,255,0.2)",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="3" width="20" height="6" rx="1" />
        <rect x="2" y="12" width="20" height="6" rx="1" />
        <circle cx="6" cy="6" r="1" fill="currentColor" stroke="none" />
        <circle cx="6" cy="15" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
    description:
      "Infrastruktur-Souveränität beschreibt, wer die Cloud besitzt, wo Daten physisch liegen und welche Rechtsordnung den Zugriff regelt. Dies ist primär ein US-Hyperscaler-Problem: Amazon, Microsoft und Google kontrollieren rund 70% des europäischen Cloud-Markts.",
    keyQuestion: "Unter welchem Recht stehen meine Daten?",
    actions: [
      "European Cloud-Anbieter evaluieren: STACKIT, OVHcloud, SAP BTP",
      "Datenlokalisierung vertraglich sichern (DORA, Data Act)",
      "Exit-Strategie und Wechselkosten berechnen",
      "Hybrid-Cloud-Architektur als Übergangsmodell",
    ],
    indicators: [
      { label: "Cloud-Marktanteil EU-Anbieter", value: "15%" },
      { label: "Avg. Wechselkosten", value: "8,5 Mio. €" },
      { label: "Zeit für Migration", value: "18 Mon." },
    ],
  },
  {
    id: "model",
    number: "02",
    title: "Modell-Souveränität",
    subtitle: "Wer hat die KI trainiert?",
    color: "#A855F7",
    colorBg: "rgba(168,85,247,0.08)",
    colorBorder: "rgba(168,85,247,0.2)",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
      </svg>
    ),
    description:
      "Modell-Souveränität beschreibt, wer das KI-Modell trainiert hat, mit welchen Daten, unter welchem Governance-Framework und wer seine zukünftige Entwicklung kontrolliert. Chinesische Open-Source-Modelle wie DeepSeek und Qwen bieten massive Kostenvorteile — aber mit intransparenter Trainingsprovenienz.",
    keyQuestion: "Was steckt in meinen KI-Modellen?",
    actions: [
      "Europäische KI-Modelle priorisieren: Mistral, Aleph Alpha / PhariaAI",
      "Open-Source-Modelle auf Bias und Zensur auditieren (EuroHPC AI Factories)",
      "SAP Joule für Enterprise-Workflows als souveräne Alternative",
      "Fine-Tuning auf eigenen Daten auf europäischer Infrastruktur",
    ],
    indicators: [
      { label: "Mistral AI Bewertung", value: "13,8 Mrd. $" },
      { label: "Kostenvorteil DeepSeek", value: "20–30×" },
      { label: "Open-Weight-Adoption", value: "+67%" },
    ],
  },
  {
    id: "data",
    number: "03",
    title: "Datensouveränität",
    subtitle: "Wer kontrolliert den Datenfluss?",
    color: "#00C4A0",
    colorBg: "rgba(0,196,160,0.08)",
    colorBorder: "rgba(0,196,160,0.2)",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
    ),
    description:
      "Datensouveränität beschreibt, wo Daten liegen, wer unter welcher Rechtsgrundlage darauf zugreifen kann und wie Datenflüsse über Organisations- und Ländergrenzen hinweg geregelt werden. Catena-X zeigt mit 190+ Mitgliedern, dass souveräner Datenaustausch in der Praxis funktioniert.",
    keyQuestion: "Wer kann auf meine Daten zugreifen?",
    actions: [
      "Data-Governance-Framework einführen (EU Data Act, DORA-konform)",
      "Datenflüsse kartieren: intern, mit Partnern, mit Clouds",
      "Datentreuhänder-Modelle evaluieren (Gaia-X, Catena-X)",
      "Technische Kontrolle: Verschlüsselung, Zero-Trust-Architektur",
    ],
    indicators: [
      { label: "Catena-X Mitglieder", value: "190+" },
      { label: "DORA Compliance Frist", value: "Jan. 2025" },
      { label: "EU Data Act seit", value: "Sep. 2025" },
    ],
  },
];

const SovereigntyLayers = () => {
  const [active, setActive] = useState<string | null>(null);

  return (
    <section
      id="layers"
      className="relative py-24 lg:py-32 overflow-hidden"
      style={{ background: "transparent" }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(139,164,255,0.12), transparent)" }}
      />

      <div className="max-w-[1600px] mx-auto px-6 lg:px-10">
        {/* Header */}
        <div className="mb-16 lg:mb-20">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="inline-block text-xs font-semibold tracking-[0.2em] uppercase mb-4"
            style={{ color: "rgba(139,164,255,0.6)", fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Die drei Dimensionen
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl lg:text-5xl font-semibold text-white mb-4"
            style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.025em" }}
          >
            Souveränität ist nicht ein —<br />
            sondern drei Probleme.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="text-base max-w-xl"
            style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" }}
          >
            Der Sovereignty Radar misst drei Schichten gleichzeitig.
            Alle drei müssen parallel adressiert werden.
          </motion.p>
        </div>

        {/* Layer cards */}
        <div className="space-y-4">
          {layers.map((layer, i) => {
            const isOpen = active === layer.id;
            return (
              <motion.div
                key={layer.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl overflow-hidden cursor-pointer transition-all duration-300"
                style={{
                  background: isOpen ? layer.colorBg : "rgba(255,255,255,0.03)",
                  border: `1px solid ${isOpen ? layer.colorBorder : "rgba(255,255,255,0.07)"}`,
                }}
                onClick={() => setActive(isOpen ? null : layer.id)}
              >
                {/* Header row */}
                <div className="flex items-center gap-6 p-6 lg:p-8">
                  {/* Number */}
                  <span
                    className="text-4xl font-bold shrink-0 w-12"
                    style={{
                      color: isOpen ? layer.color : "rgba(255,255,255,0.5)",
                      fontFamily: "'Space Grotesk', sans-serif",
                      transition: "color 0.3s",
                    }}
                  >
                    {layer.number}
                  </span>

                  {/* Icon */}
                  <div
                    className="shrink-0 p-3 rounded-xl"
                    style={{
                      background: isOpen ? `${layer.color}20` : "rgba(255,255,255,0.04)",
                      color: isOpen ? layer.color : "rgba(255,255,255,0.5)",
                      transition: "all 0.3s",
                    }}
                  >
                    {layer.icon}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <h3
                      className="text-xl font-semibold text-white"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {layer.title}
                    </h3>
                    <p
                      className="text-sm mt-0.5"
                      style={{ color: isOpen ? layer.color : "rgba(255,255,255,0.5)", fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {layer.subtitle}
                    </p>
                  </div>

                  {/* Key question badge */}
                  <div
                    className="hidden lg:block text-right shrink-0"
                  >
                    <span
                      className="text-xs italic"
                      style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" }}
                    >
                      {layer.keyQuestion}
                    </span>
                  </div>

                  {/* Chevron */}
                  <div
                    className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300"
                    style={{
                      background: isOpen ? layer.colorBg : "rgba(255,255,255,0.04)",
                      border: `1px solid ${isOpen ? layer.colorBorder : "rgba(255,255,255,0.08)"}`,
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke={isOpen ? layer.color : "rgba(255,255,255,0.5)"} strokeWidth="1.5">
                      <path d="M4 6l4 4 4-4" />
                    </svg>
                  </div>
                </div>

                {/* Expanded content */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      style={{ overflow: "hidden" }}
                    >
                      <div className="px-6 lg:px-8 pb-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Description + actions */}
                        <div className="lg:col-span-2">
                          <p
                            className="text-sm leading-relaxed mb-6"
                            style={{ color: "rgba(255,255,255,0.55)", fontFamily: "'Inter', sans-serif" }}
                          >
                            {layer.description}
                          </p>
                          <div>
                            <div
                              className="text-xs font-semibold uppercase tracking-widest mb-3"
                              style={{ color: layer.color, fontFamily: "'Space Grotesk', sans-serif" }}
                            >
                              Empfohlene Maßnahmen
                            </div>
                            <ul className="space-y-2">
                              {layer.actions.map((action, j) => (
                                <li
                                  key={j}
                                  className="flex gap-3 items-start text-sm"
                                  style={{ color: "rgba(255,255,255,0.55)", fontFamily: "'Inter', sans-serif" }}
                                >
                                  <span
                                    className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full"
                                    style={{ background: layer.color }}
                                  />
                                  {action}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Indicators */}
                        <div
                          className="rounded-xl p-5"
                          style={{ background: "rgba(0,0,0,0.2)", border: `1px solid ${layer.colorBorder}` }}
                        >
                          <div
                            className="text-xs font-semibold uppercase tracking-widest mb-5"
                            style={{ color: layer.color, fontFamily: "'Space Grotesk', sans-serif" }}
                          >
                            Kennzahlen
                          </div>
                          <div className="space-y-5">
                            {layer.indicators.map(({ label, value }) => (
                              <div key={label}>
                                <div
                                  className="text-2xl font-bold text-white mb-0.5"
                                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                                >
                                  {value}
                                </div>
                                <div
                                  className="text-xs"
                                  style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" }}
                                >
                                  {label}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(139,164,255,0.12), transparent)" }}
      />
    </section>
  );
};

export default SovereigntyLayers;
