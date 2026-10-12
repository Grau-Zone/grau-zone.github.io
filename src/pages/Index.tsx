import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ThreatContext from "@/components/ThreatContext";
import SovereigntyRadarSection from "@/components/SovereigntyRadarSection";
import SovereigntyLayers from "@/components/SovereigntyLayers";
import SovereigntyModelSection from "@/components/SovereigntyModelSection";
import OrgSovereignty from "@/components/OrgSovereignty";
import Footer from "@/components/Footer";
import { GridSpotlight } from "@/components/GlassBackground";
import { PauseToggle, SectionAmbience, useFinePointer, useHtmlFlag } from "@/components/fx";

// Farbklima je Sektion (SectionAmbience). Statisch, damit der Observer nicht
// bei jedem Render neu aufgesetzt wird.
const AMBIENCE = [
  { id: "scenarios", color: "#FF3D57" },
  { id: "radar", color: "#FF9F2E" },
  { id: "layers", color: "#A855F7" },
  { id: "modell", color: "#6cc2b5" },
  { id: "organisationen", color: "#4B6EFF" },
  { id: "about", color: "#8BA4FF" },
];

const Index = () => {
  // Aurora und Raster-Drift laufen nur auf der Startseite (CSS haengt an
  // html[data-fx-page='home']).
  useHtmlFlag("fxPage", "home");
  // Lichtkegel nur bei feinem Zeiger; reduzierte Bewegung und Pause-Knopf
  // prueft GridSpotlight selbst (rendert dann nichts).
  const fine = useFinePointer();

  return (
    // overflow-x-clip statt hidden, wo unterstuetzt: clip erzeugt keinen
    // Scroll-Container, position: sticky in den Sektionen funktioniert so.
    <div className="min-h-screen relative overflow-x-hidden supports-[overflow:clip]:overflow-x-clip">
      {/* Pause-Knopf (WCAG 2.2.2): erster Tab-Stopp der Seite, sichtbar erst mit Fokus. */}
      <PauseToggle />
      {/* Navbar beobachtet diesen Punkt: liegt er ausserhalb, gilt die Seite als gescrollt. */}
      <div id="fx-top-sentinel" aria-hidden className="absolute top-10 left-0 h-px w-px pointer-events-none" />
      <SectionAmbience sections={AMBIENCE} />
      {fine && <GridSpotlight />}
      <Navbar />
      <Hero />
      <ThreatContext />
      <SovereigntyRadarSection />
      <SovereigntyLayers />
      <SovereigntyModelSection />
      <OrgSovereignty />
      <Footer />
    </div>
  );
};

export default Index;
