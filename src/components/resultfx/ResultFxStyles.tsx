// Gemeinsame CSS-Klassen der Ergebnisseite (Praefix rfx- und rv-): Filter-Pillen, tiefgruener
// Beweisabschnitt, Zeilen, Ueberschriften, Chips und der Pillen-Knopf rfx-cta. Mehrfaches
// Rendern ist harmlos. Farben kommen aus den --rv-* Variablen (tokens.tsx), damit dieselben
// Klassen auf Weiss und auf dem tiefen Gruen stimmen.
//
// Regeln des Looks: Haarlinien statt Boxen, keine Schatten (der einzige Schein liegt unter dem
// grossen Pillen-Knopf), Kreise als Marken, Pillen fuer Filter und Chips, eine Kurve
// cubic-bezier(0.16,1,0.3,1). Hover nur auf Geraeten mit echtem Hover.
import { RV_TOKEN_CSS } from "./tokens";

const EASE = "cubic-bezier(0.16,1,0.3,1)";

const CSS = `${RV_TOKEN_CSS}
/* ── Beweisabschnitt (tiefes Gruen) ─────────────────────────────────────── */
.rv-panel{position:relative;isolation:isolate;border-radius:1rem;background:#06301d;color:#e9f3ed;padding:clamp(1.25rem,4.5vw,3.5rem) clamp(1.25rem,4.5vw,3.5rem) clamp(1.5rem,4vw,3rem);font-feature-settings:'ss01','tnum'}
.rx-deep .rv-panel{background:transparent;border-radius:0;padding:0;overflow:visible}
/* Kein overflow am Panel: die Tooltips der Baender duerfen nie abgeschnitten werden. Nur die
   Ebene mit den treibenden Linien schneidet selbst (obere Ecken gerundet wie das Panel). */
.rv-ambient{position:absolute;left:0;right:0;top:0;height:min(40rem,62%);z-index:0;pointer-events:none;overflow:hidden;border-radius:1rem 1rem 0 0;-webkit-mask-image:linear-gradient(#000 30%,transparent);mask-image:linear-gradient(#000 30%,transparent)}
.rv-ambient canvas{display:block;width:100%;height:100%;opacity:.4}
.rv-inner{position:relative;z-index:1}
@media print{.rv-panel{background:none!important;color:#0c1310!important;border:1px solid rgba(12,19,16,0.3);overflow:visible}.rv-ambient{display:none}}

/* ── Filter ───────────────────────────────────────────────────────────── */
.rv-controls{display:flex;flex-wrap:wrap;align-items:center;gap:.75rem 1.25rem;margin:0 0 1.35rem}
.rv-flabel{font-weight:600;font-size:.9375rem;color:var(--rv-mute,#4f5d56)}
.rfx-rail{display:flex;flex-wrap:wrap;gap:.5rem;max-width:100%}
.rfx-pill{position:relative;display:inline-flex;align-items:center;min-height:2.75rem;padding:.5rem 1.15rem;border:0;border-radius:999px;background:transparent;box-shadow:inset 0 0 0 1px var(--rv-line,rgba(12,19,16,0.14));font:inherit;font-weight:600;font-size:.9375rem;line-height:1.2;color:var(--rv-ink,#0c1310);cursor:pointer;transition:color .2s ease,background-color .3s ${EASE},box-shadow .3s ${EASE},transform .16s ${EASE}}
.rfx-pill[aria-pressed='true']{color:var(--rv-head,#0c1310)}
.rfx-pill:disabled{cursor:not-allowed;color:var(--rv-mute,#4f5d56);opacity:.62}
.rfx-pill-in{position:relative;display:inline-flex;align-items:center;gap:.55rem}
.rfx-sled{position:absolute;inset:0;border-radius:999px;pointer-events:none;background:var(--rv-veil-2,rgba(0,128,47,0.16));box-shadow:inset 0 0 0 1px var(--rv-accent,#00802f)}
.rfx-dot{position:relative;display:inline-block;flex:none;width:.4rem;height:.4rem;border-radius:50%;background:var(--rv-line-2,rgba(12,19,16,0.38));transition:background-color .3s ease}
.rfx-pill[aria-pressed='true'] .rfx-dot{background:var(--rv-accent,#00802f)}
@media (hover:hover) and (pointer:fine){.rfx-pill:not(:disabled):not([aria-pressed='true']):hover{background:var(--rv-veil,rgba(0,128,47,0.08));box-shadow:inset 0 0 0 1px var(--rv-line-2,rgba(12,19,16,0.38))}}

/* ── Legende und Marken ──────────────────────────────────────────────── */
.rv-legend{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem 1.6rem;margin:0 0 clamp(2rem,5vw,3.25rem);font-size:.9375rem;color:var(--rv-mute,#4f5d56)}
.rv-legend>span{display:inline-flex;align-items:center;gap:.55rem}
.rv-tag{display:inline-grid;place-items:center;flex:none;width:1.5rem;height:1.5rem;border-radius:50%;box-shadow:inset 0 0 0 1px var(--rv-line-2,rgba(12,19,16,0.38));font-size:.75rem;font-weight:600;line-height:1;color:var(--rv-ink,#0c1310)}
.rv-chip{display:inline-flex;align-items:center;padding:.2rem .7rem;border-radius:999px;background:var(--rv-veil-2,rgba(0,128,47,0.16));color:var(--rv-accent-text,#006a27);font-size:.8125rem;font-weight:600;line-height:1.3}
.rv-dot{display:inline-block;flex:none;width:.5rem;height:.5rem;border-radius:50%;background:var(--rv-accent,#00802f)}

/* ── Bloecke: Haarlinie, die sich zeichnet, Ueberschrift, Lead ─────────── */
.rv-block{position:relative;border-top:1px solid var(--rv-line,rgba(12,19,16,0.14));padding-top:clamp(2.25rem,5vw,3.75rem);margin-bottom:clamp(2.5rem,6vw,4.5rem)}
.rv-block:last-child{margin-bottom:0}
.rv-rule{position:absolute;left:0;right:0;top:-1px;height:1px;pointer-events:none}
.rv-rule i{position:absolute;inset:0;background:var(--rv-accent,#00802f);opacity:.75;transform-origin:left center}
.rv-h{margin:0;max-width:17ch;font-size:clamp(1.75rem,2.75vw,2.5rem);font-weight:500;letter-spacing:-.035em;line-height:1.05;text-wrap:balance;color:var(--rv-head,#0c1310)}
.rv-em{color:var(--rv-accent-text,#006a27)}
.rv-w{display:inline-block;overflow:hidden;vertical-align:top;padding-bottom:.12em;margin-bottom:-.12em}
.rv-w>span{display:inline-block}
.rv-lead{margin:1.1rem 0 0;max-width:62ch;font-size:1.0625rem;line-height:1.6;color:var(--rv-mute,#4f5d56)}
.rv-split{display:grid;grid-template-columns:minmax(0,1fr);gap:2.25rem 3rem;align-items:center;margin-top:clamp(1.75rem,4vw,2.75rem)}
.rv-split>.rv-chart{display:flex;justify-content:center;min-width:0}
.rv-text{min-width:0}
@media (min-width:62rem){
.rv-split{grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:3rem clamp(3rem,6vw,6rem)}
.rv-split--flip{grid-template-columns:minmax(0,6fr) minmax(0,6fr)}
.rv-split--flip>.rv-text{order:2}
}
.rv-head2{display:grid;gap:1.25rem 3rem;grid-template-columns:minmax(0,1fr)}
@media (min-width:62rem){.rv-head2{grid-template-columns:minmax(0,5fr) minmax(0,7fr);align-items:end}.rv-head2 .rv-lead{margin-top:0}}

/* ── Zeilen: Gruppen, Werte ──────────────────────────────────────────── */
.rv-group{padding:.95rem 0;border-top:1px solid var(--rv-line,rgba(12,19,16,0.14))}
.rv-group:last-child{border-bottom:1px solid var(--rv-line,rgba(12,19,16,0.14))}
.rv-rowhead{display:flex;flex-wrap:wrap;align-items:center;gap:.35rem .6rem;margin:0 0 .35rem}
.rv-rowlabel{font-size:.9375rem;font-weight:500;color:var(--rv-ink,#0c1310)}
.rv-data{margin:0;font-size:.9375rem;line-height:1.5;color:var(--rv-mute,#4f5d56);font-variant-numeric:tabular-nums}
.rv-own{margin:0 0 1.35rem;font-size:1rem;line-height:1.5;color:var(--rv-ink,#0c1310);font-variant-numeric:tabular-nums}
.rv-own small{display:block;margin-top:.3rem;font-size:.875rem;color:var(--rv-mute,#4f5d56)}
.rv-num{font-size:1.2em;font-weight:600;letter-spacing:-.02em;color:var(--rv-accent-text,#006a27);font-variant-numeric:tabular-nums}
.rv-note{margin:.35rem 0 .5rem;font-size:.9375rem;font-style:italic;color:var(--rv-mute,#4f5d56)}
.rv-warn{margin:.35rem 0 0;font-size:.9375rem;color:var(--rv-warn,#8a5a12)}
.rv-pos{margin:.4rem 0 0;display:flex;flex-wrap:wrap;align-items:baseline;gap:.2rem .55rem;font-size:.9375rem;color:var(--rv-mute,#4f5d56)}
.rv-pos .rv-fig{font-size:clamp(1.5rem,2.4vw,2rem);font-weight:500;letter-spacing:-.03em;line-height:1;color:var(--rv-accent-text,#006a27);font-variant-numeric:tabular-nums;display:inline-block;min-width:1ch}
.rv-pos .rv-dot{align-self:center;box-shadow:0 0 0 2px var(--rv-ground,#ffffff)}

/* ── Faehigkeiten als Tabelle mit Haarlinien ─────────────────────────── */
.rv-caps{margin-top:clamp(1.75rem,4vw,2.75rem);border-bottom:1px solid var(--rv-line,rgba(12,19,16,0.14))}
.rv-cap{display:grid;grid-template-columns:minmax(0,1fr);gap:1rem 3rem;padding:1.7rem .25rem 1.5rem;border-top:1px solid var(--rv-line,rgba(12,19,16,0.14));transition:background-color .4s ease}
@media (min-width:48rem){.rv-cap{grid-template-columns:minmax(0,4fr) minmax(0,8fr);gap:1rem clamp(1.5rem,3vw,3rem)}}
@media (hover:hover) and (pointer:fine){.rv-cap:hover{background:linear-gradient(90deg,var(--rv-veil,rgba(0,128,47,0.08)),transparent 70%)}}
.rv-cap-name{display:flex;flex-direction:column;gap:.45rem;min-width:0;hyphens:auto;overflow-wrap:break-word;font-size:clamp(1.15rem,1.75vw,1.45rem);font-weight:500;letter-spacing:-.025em;line-height:1.12;color:var(--rv-head,#0c1310)}
.rv-cap-title{display:flex;align-items:baseline;gap:.65rem}
.rv-cap-title .rv-dot{width:.6rem;height:.6rem;transform:translateY(-.1em)}
.rv-cap-note{font-size:.875rem;font-weight:400;letter-spacing:0;line-height:1.4;color:var(--rv-mute,#4f5d56)}
.rv-after{margin-top:1.25rem}

/* ── Feldname in Worten ──────────────────────────────────────────────── */
.rv-quad{position:relative;padding-left:1.1rem}
.rv-quad-bar{position:absolute;left:0;top:.3rem;height:1.25em;width:3px;border-radius:2px;transform-origin:top;font-size:clamp(1.4rem,2.6vw,2.1rem)}
.rv-quad-name{font-size:clamp(1.4rem,2.6vw,2.1rem);font-weight:500;letter-spacing:-.025em;line-height:1.12;margin:0 0 .6rem;color:var(--rv-head,#0c1310)}
.rv-quad-desc{margin:0;max-width:46ch;font-size:1rem;line-height:1.6;color:var(--rv-mute,#4f5d56)}

/* ── Pillen-Knopf (alter Name rfx-cta, jetzt im Look des Reportings) ──── */
.rfx-cta{position:relative;border:0!important;border-radius:999px!important;background:var(--rx-green,#00802f)!important;color:#fff!important;font-family:inherit!important;font-weight:600!important;box-shadow:0 1px 0 rgba(0,0,0,0.08),0 10px 24px -12px rgba(0,128,47,0.55);transition:background-color .25s ease,box-shadow .4s ${EASE},transform .16s ${EASE}}
.rfx-cta--strong{box-shadow:0 1px 0 rgba(0,0,0,0.08),0 14px 30px -12px rgba(0,128,47,0.6)}
@media (hover:hover) and (pointer:fine){.rfx-cta:hover{background:var(--rx-green-ink,#006a27)!important;box-shadow:0 1px 0 rgba(0,0,0,0.1),0 16px 30px -12px rgba(0,128,47,0.7)}}
@media (prefers-reduced-motion:reduce){.rfx-pill,.rfx-cta,.rv-cap{transition-property:color,background-color,box-shadow}}
`;

export function ResultFxStyles() {
  return <style>{CSS}</style>;
}
