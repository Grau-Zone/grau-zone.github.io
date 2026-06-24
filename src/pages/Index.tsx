import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ThreatContext from "@/components/ThreatContext";
import SovereigntyRadarSection from "@/components/SovereigntyRadarSection";
import SovereigntyLayers from "@/components/SovereigntyLayers";
import OrgSovereignty from "@/components/OrgSovereignty";
import Footer from "@/components/Footer";
import ConstructionStamp from "@/components/ConstructionStamp"; // TEMP

const Index = () => {
  return (
    <div className="min-h-screen overflow-x-hidden relative">
      {/* TEMP: In-Construction-Stempel — diese Zeile + den Import löschen zum Entfernen */}
      <ConstructionStamp />
      <Navbar />
      <Hero />
      <ThreatContext />
      <SovereigntyRadarSection />
      <SovereigntyLayers />
      <OrgSovereignty />
      <Footer />
    </div>
  );
};

export default Index;
