import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import RadarVisual, { SCENARIOS } from "./RadarVisual";

const SovereigntyRadarSection = () => {
  const [active, setActive] = useState(1); // Default: Hybrid Control
  const scenario = SCENARIOS[active];

  return (
    <section
      id="radar"
      className="relative py-24 lg:py-36 overflow-hidden"
      style={{ background: "transparent" }}
    >
      {/* Subtle background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${scenario.color}08 0%, transparent 70%)`,
          transition: "background 0.8s ease",
        }}
      />

      <div className="max-w-[1600px] mx-auto px-6 lg:px-10 relative z-10">
        {/* Section header */}
        <div className="mb-16 lg:mb-20">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="inline-block text-xs font-semibold tracking-[0.2em] uppercase mb-4"
            style={{ color: "rgba(139,164,255,0.6)", fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Interaktiver Sovereignty Radar
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl lg:text-5xl font-semibold text-white mb-4"
            style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.025em" }}
          >
            Drei Pfade für Europa, 2030
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="text-base max-w-xl"
            style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" }}
          >
            Die drei Szenarien zeigen, wie sich unterschiedliche technologische, marktliche und
            regulatorische Entwicklungen auf digitale Abhängigkeiten in Europa auswirken könnten.
          </motion.p>
        </div>

        {/* Main grid: Radar + Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Radar */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="flex justify-center"
          >
            <div
              className="relative p-6 lg:p-8 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.05)",
                backdropFilter: "blur(20px) saturate(160%)",
                WebkitBackdropFilter: "blur(20px) saturate(160%)",
                border: "1px solid rgba(255,255,255,0.14)",
                boxShadow: `0 0 60px ${scenario.color}15, 0 0 120px ${scenario.color}08`,
                transition: "box-shadow 0.6s ease",
              }}
            >
              <RadarVisual activeScenario={active} size={420} showSweep={false} />
            </div>
          </motion.div>

          {/* Right: Scenario info */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            {/* Scenario selector tabs */}
            <div className="flex gap-3 mb-8 flex-wrap">
              {SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActive(s.id)}
                  className="relative px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    background: active === s.id ? s.colorBg : "rgba(255,255,255,0.04)",
                    border: `1px solid ${active === s.id ? s.colorBorder : "rgba(255,255,255,0.08)"}`,
                    color: active === s.id ? s.color : "rgba(255,255,255,0.5)",
                    transform: active === s.id ? "scale(1.02)" : "scale(1)",
                  }}
                >
                  {s.tag}
                  {active === s.id && (
                    <span
                      className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                      style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Scenario content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
              >
                {/* Title */}
                <div className="mb-2">
                  <span
                    className="text-xs font-bold tracking-widest uppercase"
                    style={{ color: scenario.color, fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {scenario.tag}
                  </span>
                </div>
                <h3
                  className="text-3xl font-semibold text-white mb-2"
                  style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}
                >
                  {scenario.title}
                </h3>
                <p
                  className="text-base mb-6"
                  style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {scenario.subtitle}
                </p>
                <p
                  className="text-sm leading-relaxed mb-8"
                  style={{ color: "rgba(255,255,255,0.55)", fontFamily: "'Inter', sans-serif" }}
                >
                  {scenario.description}
                </p>

                {/* Bereiche, in denen Abhängigkeiten entstehen */}
                <div className="mb-8">
                  <div
                    className="text-xs font-semibold uppercase tracking-widest mb-3"
                    style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    Betroffene Bereiche
                  </div>
                  <div className="space-y-2.5">
                    {[
                      "Cloud- und Infrastrukturabhängigkeiten",
                      "Abhängigkeiten von KI-Modellen und -Anbietern",
                      "Daten- und Schnittstellenabhängigkeiten",
                    ].map((label) => (
                      <div key={label} className="flex items-center gap-3">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: scenario.color }}
                        />
                        <span
                          className="text-xs font-medium"
                          style={{ color: "rgba(255,255,255,0.55)", fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Key metrics */}
                <div
                  className="rounded-xl p-5"
                  style={{
                    background: scenario.colorBg,
                    border: `1px solid ${scenario.colorBorder}`,
                  }}
                >
                  <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: scenario.color, fontFamily: "'Space Grotesk', sans-serif" }}>
                    Schlüsselzahlen
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {scenario.stats.map(({ label, value }) => (
                      <div key={label}>
                        <div
                          className="text-lg font-bold text-white mb-0.5"
                          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          {value}
                        </div>
                        <div
                          className="text-[10px] leading-tight"
                          style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" }}
                        >
                          {label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Bottom navigation hint */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-16 flex justify-center gap-2"
        >
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className="rounded-full transition-all duration-300"
              style={{
                width: active === s.id ? 28 : 8,
                height: 8,
                background: active === s.id ? s.color : "rgba(255,255,255,0.15)",
              }}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default SovereigntyRadarSection;
