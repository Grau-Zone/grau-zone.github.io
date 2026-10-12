// Gemeinsame CSS-Klassen der Ergebnisseite (Praefix rfx-): Filter-Pillen,
// Pillen-Schiene und CTA-Glas. Mehrfaches Rendern ist harmlos.
// Der Hover-Schein der CTAs liegt statisch auf ::after; animiert wird nur
// dessen opacity (kein box-shadow-Uebergang, vgl. .fx-glow::before).

const CSS = `
.rfx-pill{transition:color 200ms cubic-bezier(0.77,0,0.175,1),background-color 150ms ease,transform 160ms cubic-bezier(0.23,1,0.32,1)}
.rfx-rail{display:inline-flex;flex-wrap:wrap;gap:4px;padding:4px;border-radius:20px;background:rgba(255,255,255,0.03);box-shadow:inset 0 1px 2px rgba(0,0,0,0.5),inset 0 0 0 1px rgba(255,255,255,0.06);max-width:100%}
.rfx-cta{position:relative;border:1px solid rgba(139,164,255,0.34);background:linear-gradient(180deg,rgba(75,110,255,0.20),rgba(75,110,255,0.07));box-shadow:inset 0 1px 0 rgba(255,255,255,0.12),0 12px 32px -14px rgba(75,110,255,0.55);transition:border-color 200ms ease,background-color 200ms ease,transform 160ms cubic-bezier(0.23,1,0.32,1)}
.rfx-cta::after{content:"";position:absolute;inset:-1px;border-radius:inherit;box-shadow:0 14px 36px -14px rgba(75,110,255,0.35);opacity:0;transition:opacity 200ms ease;pointer-events:none}
.rfx-cta--strong{border-color:rgba(139,164,255,0.45);background:linear-gradient(180deg,rgba(75,110,255,0.28),rgba(75,110,255,0.12))}
.rfx-cta:focus-visible{border-color:rgba(139,164,255,0.75)}
@media (hover:hover) and (pointer:fine){.rfx-pill:not(:disabled):not([aria-pressed='true']):hover{background-color:rgba(255,255,255,0.05)!important;color:rgba(255,255,255,0.92)!important}.rfx-cta:hover{border-color:rgba(139,164,255,0.6)}.rfx-cta:hover::after{opacity:1}.rfx-cta--strong:hover{border-color:rgba(139,164,255,0.75)}}
@media (prefers-reduced-motion:reduce){.rfx-pill,.rfx-cta{transition-property:color,background-color,border-color}}
`;

export function ResultFxStyles() {
  return <style>{CSS}</style>;
}
