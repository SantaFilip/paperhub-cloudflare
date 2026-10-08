import { Outlet } from "react-router-dom";
import Navigation from "./Navigation";
import Footer from "./Footer";
import ScrollToTop from "./ScrollToTop";
import SkipLink from "./a11y/SkipLink";

export default function Layout() {
  return (
    <div className="min-h-screen bg-[#FDFDFD] flex flex-col">
      <SkipLink />
      <ScrollToTop />
      <Navigation />
      <main id="main-content" tabIndex={-1} className="pt-16 flex-1 focus:outline-none">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}