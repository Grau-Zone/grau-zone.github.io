// Das Radar-Signet der Seite.
//
// Lag bisher viermal wortgleich im Code: Navbar, Footer, Impressum, Awf. Drei
// davon waren zeichengleich, die Fusszeilen-Fassung nutzte ein abweichendes
// 24er-Koordinatensystem mit leicht anderen Radien. Vereinheitlicht auf die
// 28er-Geometrie, die Groesse kommt ueber die Prop.
//
// Nicht zu verwechseln mit dem IWI-Logo (IwiLogo.tsx): dieses Zeichen ist die
// Marke des Projekts, jenes die des herausgebenden Instituts.
interface RadarMarkProps {
  /** Kantenlaenge in Pixeln. */
  size?: number;
  className?: string;
}

const RadarMark = ({ size = 28, className }: RadarMarkProps) => (
  <svg
    viewBox="0 0 28 28"
    width={size}
    height={size}
    fill="none"
    className={className}
    aria-hidden="true"
    focusable="false"
    style={{ display: "block", flexShrink: 0 }}
  >
    <circle cx="14" cy="14" r="12" stroke="rgba(75,110,255,0.3)" strokeWidth="1" />
    <circle cx="14" cy="14" r="7" stroke="rgba(75,110,255,0.5)" strokeWidth="1" />
    <circle cx="14" cy="14" r="2.5" fill="#4B6EFF" />
    <line x1="14" y1="14" x2="14" y2="2" stroke="#4B6EFF" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export default RadarMark;
