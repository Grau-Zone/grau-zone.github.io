import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
      <div className="max-w-[1600px] mx-auto flex items-center justify-between h-16 px-6 lg:px-10">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5 group">
          {/* Radar icon mark */}
          <div className="relative w-7 h-7">
            <svg viewBox="0 0 28 28" fill="none" className="w-full h-full">
              <circle cx="14" cy="14" r="12" stroke="rgba(75,110,255,0.3)" strokeWidth="1" />
              <circle cx="14" cy="14" r="7" stroke="rgba(75,110,255,0.5)" strokeWidth="1" />
              <circle cx="14" cy="14" r="2.5" fill="#4B6EFF" />
              <line x1="14" y1="14" x2="14" y2="2" stroke="#4B6EFF" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex flex-col leading-none">
            <span
              className="text-sm font-semibold tracking-tight text-white"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Sovereignty Radar
            </span>
            <span className="text-[10px] text-white/40 tracking-widest uppercase font-medium">
              Dieter Schwarz Stiftung
            </span>
          </div>
        </a>

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

        {/* Mobile toggle */}
        <button
          className="md:hidden text-white/70 hover:text-white"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
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
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
