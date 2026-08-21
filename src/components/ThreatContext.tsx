import { motion } from "framer-motion";

const threats = [
  {
    title: "Cloud-Infrastruktur",
    subtitle: "Abhängigkeit von Infrastruktur-Anbietern",
    stat: "70%",
    statLabel: "des EU-Cloud-Markts",
    color: "#4B6EFF",
    colorBg: "rgba(75,110,255,0.07)",
    colorBorder: "rgba(75,110,255,0.2)",
    points: [
      "Amazon, Microsoft und Google kontrollieren ~70% des europäischen Cloud-Markts",
      "Wechselkosten: bis zu 8,5 Mio. € pro Organisation",
      "Microsoft blockierte ICC-Mitarbeiter nach US-Sanktionen",
      "Ein AWS-Ausfall (Okt. 2025) legte 3.500 Unternehmen in 60+ Ländern lahm",
    ],
  },
  {
    title: "KI-Modelle",
    subtitle: "Abhängigkeit von Modellen und Modellanbietern",
    stat: "15%",
    statLabel: "globale KI-Nutzung",
    color: "#FF3D57",
    colorBg: "rgba(255,61,87,0.07)",
    colorBorder: "rgba(255,61,87,0.2)",
    points: [
      "DeepSeek R1: 0,10 $ / Mio. Token gegenüber OpenAI 4,40 $. Kostenvorteil 20–30×",
      "Alibaba Qwen unter Apache-2.0-Lizenz: kostenlose Nutzung und Anpassung",
      "Trainingsherkunft intransparent. Bias und Zensur sind schwer nachweisbar",
      "Open-Weight-Adoption stieg von 23% auf 67% (2025–2027)",
    ],
  },
  {
    title: "Regulatorisches Umfeld",
    subtitle: "Anforderungen an den Einsatz digitaler Technologien",
    stat: "93%",
    statLabel: "dt. Firmen digital abhängig",
    color: "#FF9F2E",
    colorBg: "rgba(255,159,46,0.07)",
    colorBorder: "rgba(255,159,46,0.2)",
    points: [
      "Data Act, AI Act, NIS2 und DORA definieren Anforderungen an den Technologieeinsatz",
      "GAIA-X: 600 Katalog-Services. Der CEO bestätigt Anbieterengpässe",
      "Hyperscaler-Investitionen 2025: 240 Mrd. $ (US) gegenüber ~15 Mrd. € (EU)",
      "»Wir haben kein Erkenntnisproblem, sondern ein Umsetzungsproblem.« (SAP)",
    ],
  },
];

const ThreatContext = () => {
  return (
    <section
      id="scenarios"
      className="relative py-24 lg:py-32 overflow-hidden"
      style={{
        background: "transparent",
      }}
    >
      {/* Divider line top */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(139,164,255,0.15), transparent)" }}
      />

      <div className="max-w-[1600px] mx-auto px-6 lg:px-10">
        {/* Header */}
        <div className="max-w-2xl mb-16 lg:mb-20">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="inline-block text-xs font-semibold tracking-[0.2em] uppercase mb-4"
            style={{ color: "rgba(139,164,255,0.6)", fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Die Ausgangslage
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl lg:text-5xl font-semibold text-white mb-4"
            style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.025em" }}
          >
            Digitale Abhängigkeiten in Europa
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="text-base leading-relaxed"
            style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" }}
          >
            Europäische Organisationen sind bei Cloud-Infrastruktur, KI-Modellen und digitalen
            Technologien in hohem Mass von externen Anbietern abhängig. Gleichzeitig verändern
            regulatorische Anforderungen die Bedingungen, unter denen diese Technologien
            eingesetzt werden.
          </motion.p>
        </div>

        {/* Threat cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {threats.map((threat, i) => (
            <motion.div
              key={threat.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.6 }}
              className="group relative rounded-2xl p-6 lg:p-8 flex flex-col transition-all duration-300"
              style={{
                background: threat.colorBg,
                border: `1px solid ${threat.colorBorder}`,
              }}
            >
              {/* Big stat */}
              <div className="mb-5">
                <div
                  className="text-5xl font-bold text-white mb-1"
                  style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.03em" }}
                >
                  {threat.stat}
                </div>
                <div
                  className="text-xs"
                  style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" }}
                >
                  {threat.statLabel}
                </div>
              </div>

              {/* Title */}
              <h3
                className="text-xl font-semibold text-white mb-1"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {threat.title}
              </h3>
              <p
                className="text-sm mb-6"
                style={{ color: threat.color, fontFamily: "'Space Grotesk', sans-serif", opacity: 0.8 }}
              >
                {threat.subtitle}
              </p>

              {/* Point list */}
              <ul className="space-y-3 flex-1">
                {threat.points.map((point, j) => (
                  <li
                    key={j}
                    className="flex gap-3 items-start text-xs leading-relaxed"
                    style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" }}
                  >
                    <span
                      className="mt-1.5 shrink-0 w-1 h-1 rounded-full"
                      style={{ background: threat.color }}
                    />
                    {point}
                  </li>
                ))}
              </ul>

              {/* Hover glow */}
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ boxShadow: `inset 0 0 40px ${threat.color}10` }}
              />
            </motion.div>
          ))}
        </div>

        {/* Closing statement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-16 text-center"
        >
          <p
            className="text-xl lg:text-2xl font-medium text-white/60 max-w-3xl mx-auto leading-relaxed"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Digitale Souveränität zeigt sich darin, welche Handlungsoptionen Organisationen im
            Umgang mit kritischen digitalen Abhängigkeiten tatsächlich besitzen.
          </p>
        </motion.div>
      </div>

      {/* Divider line bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(139,164,255,0.15), transparent)" }}
      />
    </section>
  );
};

export default ThreatContext;
