// Farben und Gestaltungsregeln der Ergebnisansicht im Look des Schwarz-Stiftung-Reportings.
//
// Alle Diagramme der Ergebnisseite lesen ihre Farben aus CSS-Variablen (--rv-*) mit
// Rueckfallwerten fuer den weissen Grund. Auf weissem Grund sind sie feine Linien in
// Tinte und HSG-Gruen. Steht ein Diagramm in einem tiefgruenen Abschnitt (Klasse rv-deep
// oder rx-deep eines Vorfahren), schalten die Variablen auf Hellgruen/Mint um.
// Beide Raeume brauchen keinen Prop: das Diagramm erbt die Farben von seinem Grund.
//
// Mint steht nur auf dem tiefen Gruen, das helle HSG-Gruen nur auf Weiss.
import type { CSSProperties } from "react";

/** Farbwerte fuer SVG- und Inline-Styles (Variable mit Rueckfall auf den weissen Grund). */
export const V = {
  ink: "var(--rv-ink, #0c1310)",
  head: "var(--rv-head, #0c1310)",
  mute: "var(--rv-mute, #4f5d56)",
  line: "var(--rv-line, rgba(12,19,16,0.14))",
  line2: "var(--rv-line-2, rgba(12,19,16,0.38))",
  faint: "var(--rv-faint, rgba(12,19,16,0.07))",
  accent: "var(--rv-accent, #00802f)",
  accentText: "var(--rv-accent-text, #006a27)",
  veil: "var(--rv-veil, rgba(0,128,47,0.08))",
  veil2: "var(--rv-veil-2, rgba(0,128,47,0.16))",
  ground: "var(--rv-ground, #ffffff)",
  warn: "var(--rv-warn, #8a5a12)",
  sweep: "var(--rv-sweep, rgba(0,128,47,0.45))",
  tipBg: "var(--rv-tip-bg, #0c1310)",
  tipInk: "var(--rv-tip-ink, #ffffff)",
} as const;

/** Schrift fuer SVG-Text: erbt Switzer vom Dokument. */
export const FONT: CSSProperties = { fontFamily: "inherit" };

/** Variablen fuer tiefgruene Abschnitte (rv-deep dieser Ansicht und rx-deep der Seite). */
export const RV_TOKEN_CSS = `
.rx-deep,.rv-deep{--rv-ink:#e9f3ed;--rv-head:#ffffff;--rv-mute:#a9c7b5;--rv-line:rgba(233,243,237,0.18);--rv-line-2:rgba(233,243,237,0.42);--rv-faint:rgba(233,243,237,0.07);--rv-accent:#6fd69a;--rv-accent-text:#6fd69a;--rv-veil:rgba(111,214,154,0.1);--rv-veil-2:rgba(111,214,154,0.2);--rv-ground:#06301d;--rv-warn:#e6c07a;--rv-sweep:rgba(111,214,154,0.55);--rv-tip-bg:#0d4a2d;--rv-tip-ink:#e9f3ed}
.rx-deep :focus-visible,.rv-deep :focus-visible{outline-color:#6fd69a}
@media print{.rv-deep{--rv-ink:#0c1310;--rv-head:#0c1310;--rv-mute:#4f5d56;--rv-line:rgba(12,19,16,0.14);--rv-line-2:rgba(12,19,16,0.38);--rv-faint:rgba(12,19,16,0.07);--rv-accent:#00802f;--rv-accent-text:#006a27;--rv-veil:rgba(0,128,47,0.08);--rv-veil-2:rgba(0,128,47,0.16);--rv-ground:#ffffff;--rv-warn:#8a5a12;--rv-sweep:rgba(0,128,47,0.45);--rv-tip-bg:#0c1310;--rv-tip-ink:#ffffff}}
`;

/** Nur die Variablen (fuer Bausteine, die ohne ResultFxStyles stehen, z. B. auf der Startseite). */
export function RvTokens() {
  return <style>{RV_TOKEN_CSS}</style>;
}
