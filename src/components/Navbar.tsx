import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import RadarMark from "./RadarMark";

const navItems = [
  { label: "Szenarien", href: "#scenarios" },
  { label: "Radar", href: "#radar" },
  { label: "Dimensionen", href: "#layers" },
  { label: "Organisationen", href: "#organisationen" },
  { label: "Über das Projekt", href: "#about" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled
          ? "rgba(5, 6, 18, 0.92)"
          : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
      }}
    >
      <div className="max-w-[1600px] mx-auto flex items-center justify-between h-16 px-4 sm:px-6 lg:px-10">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group" style={{ textDecoration: "none" }}>
          <RadarMark size={28} />
          <div className="flex flex-col leading-none">
            <span
              className="text-sm font-semibold tracking-tight text-white"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Sovereignty Radar
            </span>
            {/* Herausgeber ist das Institut, nicht die foerdernde Stiftung.
                Ausgeschrieben ist der Name so breit, dass er bei 375 px den
                Self-Assessment-Knopf aus der Leiste draengt; dort deshalb die
                Kurzform. Die vollstaendige Angabe steht ohnehin auf jeder Seite
                in der Fusszeile. */}
            <span className="text-[10px] text-white/40 tracking-widest uppercase font-medium whitespace-nowrap">
              <span className="sm:hidden">IWI-HSG</span>
              <span className="hidden sm:inline">Institut für Wirtschaftsinformatik</span>
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-sm font-medium text-white/60 hover:text-white transition-colors duration-200"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-4">
          <a
            href="/assessment"
            className="text-sm font-semibold px-5 py-2 rounded-full transition-all duration-200"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              background: "rgba(75, 110, 255, 0.15)",
              border: "1px solid rgba(75, 110, 255, 0.4)",
              color: "#8ba4ff",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "rgba(75, 110, 255, 0.25)";
              (e.currentTarget as HTMLAnchorElement).style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "rgba(75, 110, 255, 0.15)";
              (e.currentTarget as HTMLAnchorElement).style.color = "#8ba4ff";
            }}
          >
            Organisation Self-Assessment →
          </a>
        </div>

        {/* Mobile: compact CTA + toggle */}
        <div className="flex md:hidden items-center gap-2">
          <a
            href="/assessment"
            className="text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              background: "rgba(75, 110, 255, 0.15)",
              border: "1px solid rgba(75, 110, 255, 0.4)",
              color: "#8ba4ff",
            }}
          >
            Self-Assessment
          </a>
          <button
            className="text-white/70 hover:text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menü"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="md:hidden px-6 pb-5 pt-2 space-y-3"
            style={{ background: "rgba(5, 6, 18, 0.98)", borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="block text-sm font-medium text-white/70 py-2 hover:text-white transition-colors"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {item.label}
              </a>
            ))}
            <a
              href="/assessment"
              onClick={() => setMobileOpen(false)}
              className="block text-center text-sm font-semibold px-5 py-3 rounded-full mt-2"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                background: "rgba(75, 110, 255, 0.15)",
                border: "1px solid rgba(75, 110, 255, 0.4)",
                color: "#8ba4ff",
              }}
            >
              Organisation Self-Assessment →
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
