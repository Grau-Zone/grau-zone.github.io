import { motion } from "framer-motion";

const Footer = () => {
  return (
    <footer
      id="about"
      style={{ background: "hsl(228 45% 3%)", borderTop: "1px solid rgba(139,164,255,0.08)" }}
    >
      {/* About section */}
      <div className="max-w-[1600px] mx-auto px-6 lg:px-10 py-20 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start mb-16">
          {/* Left: Project info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span
              className="inline-block text-xs font-semibold tracking-[0.2em] uppercase mb-5"
              style={{ color: "rgba(139,164,255,0.5)", fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Über das Projekt
            </span>
            <h2
              className="text-3xl lg:text-4xl font-semibold text-white mb-5"
              style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.025em" }}
            >
              Digitale Souveränität<br />
              als steuerbarer Parameter.
            </h2>
            <p
              className="text-sm leading-relaxed mb-4"
              style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif", maxWidth: "42ch" }}
            >
              Die Dieter Schwarz Stiftung und Schwarz Digits fördern diese Initiative,
              um europäische KMU mit einem konkreten Instrument auszustatten: dem Sovereignty Radar.
            </p>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif", maxWidth: "42ch" }}
            >
              Ziel ist es, Souveränität von einem abstrakten Thema zu einem messbaren,
              steuerbaren ökonomischen Parameter zu machen — auf Makro-, Anbieter- und Anwenderebene.
            </p>
          </motion.div>

          {/* Right: Partners */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            {/* DSS */}
            <div
              className="p-6 rounded-2xl"
              style={{ background: "rgba(75,110,255,0.06)", border: "1px solid rgba(75,110,255,0.15)" }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(75,110,255,0.15)" }}
                >
                  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="8" stroke="#4B6EFF" strokeWidth="1.5" />
                    <circle cx="10" cy="10" r="4" stroke="#4B6EFF" strokeWidth="1.5" />
                    <circle cx="10" cy="10" r="1.5" fill="#4B6EFF" />
                  </svg>
                </div>
                <div>
                  <div
                    className="font-semibold text-white text-sm mb-1"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    Dieter Schwarz Stiftung / Schwarz Digits
                  </div>
                  <div
                    className="text-xs leading-relaxed"
                    style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" }}
                  >
                    Auftraggeber und Förderer der Initiative. STACKIT (Schwarz Digits) ist Europas
                    führender unabhängiger Cloud-Anbieter mit €11 Mrd. Investition in Lübbenau.
                  </div>
                </div>
              </div>
            </div>

            {/* HSG */}
            <div
              className="p-6 rounded-2xl"
              style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.15)" }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(168,85,247,0.15)" }}
                >
                  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
                    <path d="M10 2L2 7v2h16V7L10 2z" stroke="#A855F7" strokeWidth="1.5" strokeLinejoin="round" />
                    <path d="M4 9v7M8 9v7M12 9v7M16 9v7" stroke="#A855F7" strokeWidth="1.5" />
                    <path d="M2 16h16" stroke="#A855F7" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <div
                    className="font-semibold text-white text-sm mb-1"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    IWI-HSG, Universität St. Gallen
                  </div>
                  <div
                    className="text-xs leading-relaxed"
                    style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" }}
                  >
                    Forschungspartner. Prof. Dr. Mahei Li · Prof. Dr. Andreas Janson ·
                    Prof. Dr. Andreas Hein. Szenarioanalyse und empirische Grundlagen. März 2026.
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Three project pillars */}
        <div
          className="rounded-2xl p-6 lg:p-8 mb-16"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div
            className="text-xs font-semibold uppercase tracking-widest mb-6"
            style={{ color: "rgba(139,164,255,0.5)", fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Projektsäulen
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                n: "#1",
                title: "Makro-Ebene",
                desc: "Monitoring und Indexierung des Umfelds. Kennzahlensystem für Lock-in, Option Value und Technical Debt — als Entscheidungsgrundlage für CEOs, CFOs und Aufsichtsräte.",
              },
              {
                n: "#2",
                title: "Anbieter-Ebene",
                desc: "Transformation klassischer IT zu Plattform- und KI-Services. Compliance-by-Design und Kooperation mit vertrauenswürdigen Anbietern wie STACKIT und SAP.",
              },
              {
                n: "#3",
                title: "Anwender-Ebene",
                desc: "Strategisches IT-Management durch Enterprise Architecture (EAM). Fortbildungsprogramme und Strukturen für Transparenz über Datenflüsse im Unternehmen.",
              },
            ].map(({ n, title, desc }) => (
              <div key={n}>
                <div
                  className="text-2xl font-bold mb-2"
                  style={{ color: "rgba(139,164,255,0.5)", fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {n}
                </div>
                <div
                  className="font-semibold text-white text-sm mb-2"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {title}
                </div>
                <div
                  className="text-xs leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" }}
                >
                  {desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-8"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="relative w-6 h-6">
              <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                <circle cx="12" cy="12" r="10" stroke="rgba(75,110,255,0.3)" strokeWidth="1" />
                <circle cx="12" cy="12" r="6" stroke="rgba(75,110,255,0.5)" strokeWidth="1" />
                <circle cx="12" cy="12" r="2" fill="#4B6EFF" />
                <line x1="12" y1="12" x2="12" y2="2" stroke="#4B6EFF" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <span
              className="text-sm font-semibold text-white/60"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Sovereignty Radar
            </span>
          </div>

          {/* Links */}
          <div className="flex gap-6 flex-wrap">
            {[
              { label: "Kontakt", href: "mailto:adrian.bohrer@unisg.ch,andreas.hein@unisg.ch" },
              { label: "IWI-HSG", href: "https://iwi.unisg.ch" },
              { label: "STACKIT", href: "https://stackit.de" },
              { label: "Impressum", href: "/impressum" },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="text-xs transition-colors"
                style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Space Grotesk', sans-serif" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.6)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.5)")}
              >
                {label}
              </a>
            ))}
          </div>

          <div
            className="text-xs"
            style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" }}
          >
            © {new Date().getFullYear()} Dieter Schwarz Stiftung · IWI-HSG
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
