import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

const sections: { title: string; lines: React.ReactNode[] }[] = [
  {
    title: "Angaben zum Anbieter",
    lines: ["Adrian Bohrer", "Universität St.Gallen", "Müller-Friedberg-Strasse 8", "CH-9000 St.Gallen"],
  },
  {
    title: "Kontakt",
    lines: [
      <>Telefon: <a href="tel:+491723266222" style={{ color: "#8ba4ff", textDecoration: "none" }}>+49 172 3266222</a></>,
      <>E-Mail: <a href="mailto:adrian.bohrer@unisg.ch" style={{ color: "#8ba4ff", textDecoration: "none" }}>adrian.bohrer@unisg.ch</a></>,
    ],
  },
  {
    title: "Vertreten durch",
    lines: ["Adrian Bohrer"],
  },
  {
    title: "Verantwortlich für den Inhalt",
    lines: ["Adrian Bohrer, Müller-Friedberg-Strasse 8, CH-9000 St.Gallen"],
  },
  {
    title: "Förderung",
    lines: ["Dieses Forschungsprojekt wird durch die Schwarz Stiftung gefördert."],
  },
  {
    title: "Haftungsausschluss",
    lines: [
      "Die Inhalte dieser Seite wurden mit Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte wird keine Gewähr übernommen. Für Inhalte verlinkter externer Seiten sind ausschließlich deren Betreiber verantwortlich.",
    ],
  },
];

const Impressum = () => {
  return (
    <div style={{ minHeight: "100vh", background: "hsl(228 45% 4%)" }}>
      {/* Top bar */}
      <div
        className="fixed top-0 left-0 right-0 z-50"
        style={{ background: "rgba(5,6,18,0.92)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between h-16 px-6">
          <Link to="/" className="flex items-center gap-2.5" style={{ textDecoration: "none" }}>
            <div className="relative w-7 h-7">
              <svg viewBox="0 0 28 28" fill="none" className="w-full h-full">
                <circle cx="14" cy="14" r="12" stroke="rgba(75,110,255,0.3)" strokeWidth="1" />
                <circle cx="14" cy="14" r="7" stroke="rgba(75,110,255,0.5)" strokeWidth="1" />
                <circle cx="14" cy="14" r="2.5" fill="#4B6EFF" />
                <line x1="14" y1="14" x2="14" y2="2" stroke="#4B6EFF" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Sovereignty Radar
            </span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-white/60 hover:text-white transition-colors"
            style={{ fontFamily: "'Space Grotesk', sans-serif", textDecoration: "none" }}
          >
            <ArrowLeft size={15} /> Zurück zur Startseite
          </Link>
        </div>
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-3xl mx-auto px-6"
        style={{ paddingTop: "128px", paddingBottom: "96px" }}
      >
        <span
          className="inline-block text-xs font-semibold tracking-[0.2em] uppercase mb-4"
          style={{ color: "rgba(139,164,255,0.6)", fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Rechtliches
        </span>
        <h1
          className="text-4xl lg:text-5xl font-semibold text-white mb-12"
          style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.025em" }}
        >
          Impressum
        </h1>

        <div className="space-y-8">
          {sections.map((section) => (
            <div
              key={section.title}
              className="rounded-2xl p-6 lg:p-7"
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <h2
                className="text-xs font-semibold uppercase tracking-widest mb-4"
                style={{ color: "rgba(139,164,255,0.7)", fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {section.title}
              </h2>
              <div className="space-y-1.5">
                {section.lines.map((line, i) => (
                  <p
                    key={i}
                    className="text-sm leading-relaxed"
                    style={{ color: "rgba(255,255,255,0.7)", fontFamily: "'Inter', sans-serif" }}
                  >
                    {line}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Impressum;
