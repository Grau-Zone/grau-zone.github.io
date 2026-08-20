import { motion } from "framer-motion";
import { useEffect, useRef } from "react";

// Animated mini radar for hero background decoration
const MiniRadarOrb = () => (
  <svg viewBox="0 0 400 400" className="w-full h-full" fill="none">
    <defs>
      <radialGradient id="orbGrad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#c8d4ff" stopOpacity="0.18" />
        <stop offset="40%" stopColor="#4B6EFF" stopOpacity="0.08" />
        <stop offset="100%" stopColor="#4B6EFF" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="coreGrad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#dce6ff" stopOpacity="0.9" />
        <stop offset="60%" stopColor="#8ba4ff" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#4B6EFF" stopOpacity="0" />
      </radialGradient>
      <filter id="glow-hero">
        <feGaussianBlur stdDeviation="8" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>

    {/* Outer glow */}
    <circle cx="200" cy="200" r="180" fill="url(#orbGrad)" />

    {/* Radar rings */}
    {[140, 100, 65, 35].map((r, i) => (
      <circle
        key={r}
        cx="200" cy="200" r={r}
        stroke="rgba(139,164,255,0.12)"
        strokeWidth="1"
        fill={i === 3 ? "url(#coreGrad)" : "none"}
      />
    ))}

    {/* Axis lines */}
    {[-90, -30, 30, 90, 150, 210].map((angle) => {
      const rad = (angle * Math.PI) / 180;
      return (
        <line
          key={angle}
          x1={200} y1={200}
          x2={200 + 140 * Math.cos(rad)}
          y2={200 + 140 * Math.sin(rad)}
          stroke="rgba(139,164,255,0.08)"
          strokeWidth="1"
        />
      );
    })}

    {/* Data polygon - scenario 3 (teal) */}
    <polygon
      points="200,75 307,160 274,285 126,285 93,160"
      fill="rgba(0,196,160,0.07)"
      stroke="rgba(0,196,160,0.3)"
      strokeWidth="1"
      filter="url(#glow-hero)"
    />

    {/* Scan line (static in preview) */}
    <line x1={200} y1={200} x2={200} y2={62} stroke="rgba(75,110,255,0.6)" strokeWidth="1.5" filter="url(#glow-hero)" />

    {/* Center dot */}
    <circle cx="200" cy="200" r="4" fill="#4B6EFF" filter="url(#glow-hero)" />
  </svg>
);

const Hero = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Particle field
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const particles: { x: number; y: number; vx: number; vy: number; alpha: number; size: number }[] = [];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        alpha: Math.random() * 0.4 + 0.05,
        size: Math.random() * 1.5 + 0.5,
      });
    }

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139, 164, 255, ${p.alpha})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <section
      className="relative min-h-screen flex items-center overflow-hidden"
      style={{ background: "radial-gradient(ellipse 80% 60% at 60% 50%, rgba(30,45,120,0.35) 0%, transparent 70%)" }}
    >
      {/* Particle canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      <div className="relative z-10 max-w-[1600px] mx-auto px-6 lg:px-10 w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center py-28 lg:py-0 min-h-screen">
        {/* Left: Text content */}
        <div>
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 mb-8"
          >
            <span
              className="text-xs font-semibold tracking-[0.2em] uppercase px-3 py-1.5 rounded-full"
              style={{
                background: "rgba(75,110,255,0.12)",
                border: "1px solid rgba(75,110,255,0.25)",
                color: "#8ba4ff",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              Initiative 2025–2030
            </span>
            <span
              className="text-xs font-medium tracking-widest uppercase"
              style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Dieter Schwarz Stiftung
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl lg:text-6xl xl:text-7xl font-semibold leading-[1.05] mb-6 text-white"
            style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.03em" }}
          >
            Digitale<br />
            Souveränität<br />
            <span style={{ color: "#4B6EFF" }}>messbar</span> machen.
          </motion.h1>

          {/* Subline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base lg:text-lg leading-relaxed mb-10 max-w-lg"
            style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" }}
          >
            Europäische KMU stehen zwischen zwei digitalen Machtblöcken.
            Der Sovereignty Radar macht Abhängigkeiten sichtbar und zeigt Wege zu technologischer Handlungsfreiheit.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap gap-4"
          >
            <a
              href="/assessment"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold text-sm transition-all duration-200"
              style={{
                background: "#4B6EFF",
                color: "white",
                fontFamily: "'Space Grotesk', sans-serif",
                boxShadow: "0 0 40px rgba(75,110,255,0.35)",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 60px rgba(75,110,255,0.55)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 40px rgba(75,110,255,0.35)")}
            >
              Organisation Self-Assessment →
            </a>
            <a
              href="#scenarios"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold text-sm transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.8)",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              Szenarien 2030
            </a>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-14 flex gap-10 flex-wrap"
          >
            {[
              { value: "70%", label: "EU Cloud-Markt in US-Hand" },
              { value: "93%", label: "dt. Firmen digital abhängig" },
              { value: "3", label: "Zukunftspfade bis 2030" },
            ].map(({ value, label }) => (
              <div key={label}>
                <div
                  className="text-3xl font-bold text-white mb-1"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {value}
                </div>
                <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" }}>
                  {label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right: Radar orb visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="relative flex items-center justify-center"
          style={{ animation: "float-up 6s ease-in-out infinite" }}
        >
          {/* Outer glow ring */}
          <div
            className="absolute rounded-full"
            style={{
              width: "110%",
              height: "110%",
              background: "radial-gradient(circle, rgba(75,110,255,0.12) 0%, transparent 70%)",
            }}
          />

          {/* Radar container */}
          <div
            className="relative w-full max-w-md aspect-square rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(15,20,50,0.9) 0%, rgba(5,6,18,0.6) 100%)",
              border: "1px solid rgba(75,110,255,0.15)",
              boxShadow: "0 0 80px rgba(75,110,255,0.15), inset 0 0 60px rgba(5,6,18,0.5)",
            }}
          >
            {/* Rotating scan line - pure CSS for performance */}
            <div className="absolute inset-0 rounded-full overflow-hidden">
              <div
                className="absolute inset-0"
                style={{
                  background: `conic-gradient(from 0deg, rgba(75,110,255,0) 0deg, rgba(75,110,255,0.15) 30deg, rgba(75,110,255,0) 30deg)`,
                  animation: "spin 6s linear infinite",
                }}
              />
            </div>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

            <MiniRadarOrb />

            {/* Scenario labels floating */}
            <div
              className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center"
            >
              <div
                className="text-xs font-semibold tracking-widest uppercase mb-1"
                style={{ color: "rgba(139,164,255,0.6)", fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Sovereignty Radar
              </div>
              <div className="flex gap-3 justify-center">
                {[
                  { label: "S1", color: "#FF3D57" },
                  { label: "S2", color: "#FF9F2E" },
                  { label: "S3", color: "#00C4A0" },
                ].map(({ label, color }) => (
                  <span
                    key={label}
                    className="text-[10px] font-bold px-2 py-0.5 rounded"
                    style={{ background: `${color}22`, color, fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <div className="w-px h-10 bg-gradient-to-b from-transparent to-white/20" />
        <span className="text-[10px] tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Space Grotesk', sans-serif" }}>
          Scroll
        </span>
      </motion.div>
    </section>
  );
};

export default Hero;
