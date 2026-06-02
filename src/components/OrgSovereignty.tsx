import { useState, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CapacityRadar, { CAPACITIES, BASELINE_VALUES } from "./CapacityRadar";

const OrgSovereignty = () => {
  const [active, setActive] = useState(0);
  const cap = CAPACITIES[active];
  // selected capacity rises to 80%, the others sit at their baseline
  const radarValues = BASELINE_VALUES.map((b, i) => (i === active ? 0.8 : b));

  return (
    <section
      id="organisationen"
      className="relative py-24 lg:py-36 overflow-hidden"
      style={{ background: "hsl(228 45% 4%)" }}
    >
      {/* Divider top */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(139,164,255,0.15), transparent)" }}
      />

      {/* Subtle background glow that follows the active capacity */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${cap.color}08 0%, transparent 70%)`,
          transition: "background 0.8s ease",
        }}
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
            Digitale Souveränität von Organisationen
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl lg:text-5xl font-semibold text-white mb-4"
            style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.025em" }}
          >
            Vier Capacities machen<br />Organisationen souverän.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="text-base leading-relaxed"
            style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" }}
          >
            Souveränität auf Organisationsebene ist die Fähigkeit, bei kritischen digitalen
            Funktionen auch unter externer Abhängigkeit einen kontrollierten Handlungsraum zu
            behalten. Sie entsteht formativ aus vier Capacities. Alle vier zusammen bestimmen den
            Handlungsspielraum Ihrer Organisation.
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
                background: "rgba(10,12,30,0.8)",
                border: "1px solid rgba(139,164,255,0.1)",
                boxShadow: `0 0 60px ${cap.color}15, 0 0 120px ${cap.color}08`,
                transition: "box-shadow 0.6s ease",
              }}
            >
              <CapacityRadar values={radarValues} color={cap.color} activeIndex={active} size={560} />
            </div>
          </motion.div>

          {/* Right: Capacity info */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            {/* Capacity selector tabs */}
            <div className="flex gap-3 mb-8 flex-wrap">
              {CAPACITIES.map((c, i) => (
                <button
                  key={c.key}
                  onClick={() => setActive(i)}
                  className="relative px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    background: active === i ? c.colorBg : "rgba(255,255,255,0.04)",
                    border: `1px solid ${active === i ? c.colorBorder : "rgba(255,255,255,0.08)"}`,
                    color: active === i ? c.color : "rgba(255,255,255,0.5)",
                    transform: active === i ? "scale(1.02)" : "scale(1)",
                  }}
                >
                  {c.tag}
                  {active === i && (
                    <span
                      className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                      style={{ background: c.color, boxShadow: `0 0 6px ${c.color}` }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Capacity content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
              >
                <div className="mb-2 flex items-center gap-3">
                  <span
                    className="text-xs font-bold tracking-widest uppercase"
                    style={{ color: cap.color, fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    Capacity 0{active + 1} · {cap.tag}
                  </span>
                </div>
                <h3
                  className="text-3xl font-semibold text-white mb-2"
                  style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}
                >
                  {cap.title}
                </h3>
                <p
                  className="text-base mb-5 italic"
                  style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {cap.keyQuestion}
                </p>
                <p
                  className="text-sm font-medium mb-4 pl-4"
                  style={{
                    color: "rgba(255,255,255,0.7)",
                    fontFamily: "'Inter', sans-serif",
                    borderLeft: `2px solid ${cap.color}`,
                  }}
                >
                  {cap.definition}
                </p>
                <p
                  className="text-sm leading-relaxed mb-7"
                  style={{ color: "rgba(255,255,255,0.55)", fontFamily: "'Inter', sans-serif" }}
                >
                  {cap.description}
                </p>

                {/* Woran es hängt — three fixed roles, comparable across all four cards */}
                <div className="rounded-xl p-5 mb-7" style={{ background: cap.colorBg, border: `1px solid ${cap.colorBorder}` }}>
                  <div
                    className="text-xs font-semibold uppercase tracking-widest mb-4"
                    style={{ color: cap.color, fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    Woran es hängt
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "max-content 1fr", columnGap: "12px", rowGap: "11px", alignItems: "baseline" }}>
                    {cap.drivers.map((d) => (
                      <Fragment key={d.role}>
                        <span
                          className="text-[11px] font-semibold uppercase tracking-wider"
                          style={{ color: cap.color, fontFamily: "'Space Grotesk', sans-serif", whiteSpace: "nowrap" }}
                        >
                          {d.role}:
                        </span>
                        <span
                          className="text-sm"
                          style={{ color: "rgba(255,255,255,0.8)", fontFamily: "'Inter', sans-serif" }}
                        >
                          {d.name}
                        </span>
                      </Fragment>
                    ))}
                  </div>
                </div>

                {/* Recommended actions */}
                <div>
                  <div
                    className="text-xs font-semibold uppercase tracking-widest mb-3"
                    style={{ color: cap.color, fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    Empfohlene Maßnahmen
                  </div>
                  <ul className="space-y-2">
                    {cap.actions.map((action, j) => (
                      <li
                        key={j}
                        className="flex gap-3 items-start text-sm"
                        style={{ color: "rgba(255,255,255,0.55)", fontFamily: "'Inter', sans-serif" }}
                      >
                        <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full" style={{ background: cap.color }} />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Bottom dot navigation */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-16 flex justify-center gap-2"
        >
          {CAPACITIES.map((c, i) => (
            <button
              key={c.key}
              onClick={() => setActive(i)}
              className="rounded-full transition-all duration-300"
              style={{
                width: active === i ? 28 : 8,
                height: 8,
                background: active === i ? c.color : "rgba(255,255,255,0.15)",
              }}
            />
          ))}
        </motion.div>
      </div>

      {/* Divider bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(139,164,255,0.15), transparent)" }}
      />
    </section>
  );
};

export default OrgSovereignty;
