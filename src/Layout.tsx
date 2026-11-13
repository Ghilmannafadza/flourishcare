import { Outlet } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { GrainOverlay } from "./components/GrainOverlay";
import { WhatsAppFab } from "./components/WhatsAppFab";

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col font-sans relative">
      <GrainOverlay />
      <Navbar />
      <main className="flex-grow relative z-10">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppFab />
    </div>
  );
}
