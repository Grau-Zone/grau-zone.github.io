import type { ShapeDef } from "./gather";

const GREEN = "#00802f";
const INK = "#0c1310";

/**
 * Das Radar als Form fuer das Partikelfeld: vier Ringe, Achsen, Randmarken und Echos.
 * Der Suchstrahl ist bewusst nicht dabei; er liegt als drehbare Ebene darueber (Hero)
 * und folgt dem Scrollen.
 */
export const radarShape: ShapeDef = {
  draw(g, S) {
    const c = S / 2;
    const R = S * 0.43;
    g.lineCap = "round";

    // Ringe
    g.strokeStyle = GREEN;
    [1, 0.75, 0.5, 0.25].forEach((k, i) => {
      g.lineWidth = S * (i === 0 ? 0.015 : 0.01);
      g.beginPath();
      g.arc(c, c, R * k, 0, Math.PI * 2);
      g.stroke();
    });

    // Achsen
    g.strokeStyle = INK;
    g.lineWidth = S * 0.0075;
    g.beginPath();
    g.moveTo(c - R, c);
    g.lineTo(c + R, c);
    g.moveTo(c, c - R);
    g.lineTo(c, c + R);
    g.stroke();

    // Randmarken, jede fuenfte laenger
    g.lineWidth = S * 0.0075;
    g.beginPath();
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const len = i % 5 === 0 ? 0.075 : 0.04;
      const r0 = R * 1.045;
      const r1 = R * (1.045 + len);
      g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0);
      g.lineTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1);
    }
    g.stroke();

    // Echos
    const blip = (rk: number, deg: number, rad: number, colour: string) => {
      const a = (deg * Math.PI) / 180;
      g.fillStyle = colour;
      g.beginPath();
      g.arc(c + Math.cos(a) * R * rk, c + Math.sin(a) * R * rk, S * rad, 0, Math.PI * 2);
      g.fill();
    };
    blip(0.56, -58, 0.022, INK);
    blip(0.86, -34, 0.026, GREEN);
    blip(0.31, 142, 0.02, INK);
    blip(0.7, 205, 0.024, INK);
    blip(0.42, 78, 0.018, INK);
    blip(0.9, 118, 0.02, INK);
  },
};
