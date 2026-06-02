// Global liquid-glass background field, rendered fixed behind all content.
// The colour glows and dark base live in CSS (.glass-bg in index.css) so a
// media query can give phones a brighter base + stronger glows: OLED panels
// render near-black navy as pure black, which made the subtle desktop glows
// invisible on mobile. Realised as CSS radial-gradients (no blur filter, no
// mix-blend-mode) so it renders identically across iOS Safari and desktop.
const GlassBackground = () => (
  <div aria-hidden="true" className="glass-bg">
    <div className="glass-bg-grid" />
  </div>
);

export default GlassBackground;
