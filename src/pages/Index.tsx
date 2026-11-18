import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ThreatContext from "@/components/ThreatContext";
import SovereigntyRadarSection from "@/components/SovereigntyRadarSection";
import SovereigntyLayers from "@/components/SovereigntyLayers";
import SovereigntyModelSection from "@/components/SovereigntyModelSection";
import OrgSovereignty from "@/components/OrgSovereignty";
import Footer from "@/components/Footer";
import { PauseToggle } from "@/components/fx";

const Index = () => {
  return (
    // overflow-x-clip statt hidden, wo unterstuetzt: clip erzeugt keinen
    // Scroll-Container, position: sticky in den Sektionen funktioniert so.
    <div className="min-h-screen relative overflow-x-hidden supports-[overflow:clip]:overflow-x-clip bg-background text-foreground">
      {/* Pause-Knopf (WCAG 2.2.2): erster Tab-Stopp der Seite, sichtbar erst mit Fokus. */}
      <PauseToggle />
      {/* Navbar beobachtet diesen Punkt: liegt er ausserhalb, gilt die Seite als gescrollt. */}
      <div id="fx-top-sentinel" aria-hidden className="absolute top-10 left-0 h-px w-px pointer-events-none" />
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
