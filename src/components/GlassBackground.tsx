// Liquid-glass background field: a dark base with soft colour glows, realised as
// CSS radial-gradients (no blur filter, no mix-blend-mode, no separate elements).
// This renders identically on mobile (iOS Safari) and desktop, where the previous
// blurred + screen-blended blob elements were unreliable. A faint grid sits on top.
// Sizes use vmax so the glows scale on tall, narrow phone screens too.
const GLOWS = [
  "radial-gradient(70vmax 70vmax at 12% -5%, rgba(58,85,216,0.26), transparent 60%)",
  "radial-gradient(60vmax 60vmax at 92% 26%, rgba(109,63,192,0.18), transparent 60%)",
  "radial-gradient(65vmax 65vmax at 25% 108%, rgba(10,143,120,0.14), transparent 62%)",
  "radial-gradient(140% 120% at 50% 0%, #05070f 0%, #010207 60%)",
].join(", ");

const GlassBackground = () => (
  <div
    aria-hidden="true"
    style={{
      position: "fixed",
      inset: 0,
      zIndex: -2,
      pointerEvents: "none",
      background: GLOWS,
    }}
  >
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
