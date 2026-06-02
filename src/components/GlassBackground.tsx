// Liquid-glass background field: dark base with soft animated colour blobs and a
// faint grid. Sits fixed behind all content (z -2) so translucent panels refract it.
const blob = (
  color: string,
  pos: React.CSSProperties,
  anim: string,
  opacity = 0.5
): React.CSSProperties => ({
  position: "absolute",
  width: "48vw",
  height: "48vw",
  borderRadius: "50%",
  filter: "blur(100px)",
  opacity,
  mixBlendMode: "screen",
  background: color,
  animation: `${anim} ease-in-out infinite alternate`,
  ...pos,
});

const GlassBackground = () => (
  <div
    aria-hidden="true"
    style={{
      position: "fixed",
      inset: 0,
      zIndex: -2,
      overflow: "hidden",
      pointerEvents: "none",
      background: "radial-gradient(120% 120% at 50% 0%, #010103 0%, #000000 40%)",
    }}
  >
    <span data-glass-blob style={blob("#3a55d8", { top: "-16%", left: "-12%" }, "glass-drift1 24s", 0.13)} />
    <span data-glass-blob style={blob("#6d3fc0", { top: "30%", right: "-16%" }, "glass-drift2 28s", 0.09)} />
    <span data-glass-blob style={blob("#0a8f78", { bottom: "-20%", left: "20%" }, "glass-drift3 32s", 0.07)} />
    <span data-glass-blob style={blob("rgba(255,255,255,0.7)", { top: "58%", left: "-12%" }, "glass-drift1 30s", 0.025)} />
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
        backgroundSize: "64px 64px",
        WebkitMaskImage: "radial-gradient(120% 80% at 50% 30%, #000 30%, transparent 80%)",
        maskImage: "radial-gradient(120% 80% at 50% 30%, #000 30%, transparent 80%)",
      }}
    />
  </div>
);

export default GlassBackground;
