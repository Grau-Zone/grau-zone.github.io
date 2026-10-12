// Gemeinsamer Fahrplan der Ergebnisseite (alle Werte in Millisekunden).
// Reihenfolge immer: Skala -> Gruppe (aus dem Median) -> eigener Wert.
// Matrix-Ping, Feldname (QuadrantReveal) und Fadenkreuz haengen an MATRIX_T,
// die Zaehler unter den Baendern an BAND_T. Nur Konstanten, keine Logik.

/** Entree der beiden Matrizen (Souveraenitaets- und Transparenz-Matrix). */
export const MATRIX_T = {
  axes: 0,
  axesDur: 900,
  plate: 0,
  grid: 150,
  ruler: 250,
  corner: 300,
  axisLabel: 250,
  cross: 200,
  quadFill: 350,
  quadLabel: 400,
  quadLabelStep: 40,
  shares: 400,
  sharesDur: 700,
  diamond: 550,
  frame: 630,
  tag: 760,
  groupStep: 80,
  guide: 800,
  guideDur: 800,
  count: 800,
  countDur: 500,
  trace: 800,
  traceDur: 1000,
  reticle: 1150,
  reticleDur: 700,
  ping: 1450,
  glow: 1450,
  quadName: 1450,
  quadDesc: 1950,
  sweepStart: 2600,
} as const;

/** Entree der Vergleichsbaender; re = Neuaufbau nach Filterwechsel. */
export const BAND_T = {
  scanDur: 420,
  median: 360,
  medianDur: 200,
  band: 420,
  bandDur: 380,
  dot: 700,
  dotDur: 280,
  lock: 640,
  lockDur: 420,
  ping: 960,
  pingDur: 700,
  countDur: 450,
  re: { median: 0, medianDur: 140, band: 40, bandDur: 300, ping: 220, pingDur: 450 },
} as const;
