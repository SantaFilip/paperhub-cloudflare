import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "@/api/client";
import { Search, X, Menu } from "lucide-react";
import PresentationIcon from "./PresentationIcon";
import { useLang } from "@/lib/LanguageContext";
import AccountMenu from "./AccountMenu";

export default function Navigation() {
  const { lang, setLang, t } = useLang();
  const [user, setUser] = useState(null);
  const [visible, setVisible] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const lastScrollY = useRef(0);
  const location = useLocation();

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;
      if (current < 60) { setVisible(true); return; }
      if (current < lastScrollY.current - 5) setVisible(true);
      else if (current > lastScrollY.current + 5) setVisible(false);
      lastScrollY.current = current;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/browse?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  return (
    <header
      onFocus={() => setVisible(true)}
      className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out ${
        visible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="bg-[#FDFDFD]/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            {/* Logo */}
            <Link to="/landing" className="flex items-center gap-2 flex-shrink-0 group" aria-label={lang === "de" ? "PaperHub – zur Startseite" : "PaperHub – home"}>
              <div className="w-8 h-8 bg-[#1E293B] rounded flex items-center justify-center" aria-hidden="true">
                <PresentationIcon className="w-4 h-4 text-white" />
              </div>
              <span className="font-heading font-semibold text-[#0F172A] text-lg tracking-tight">
                Paper<span className="text-[#2563EB]">Hub</span>
              </span>
            </Link>

            {/* Search — desktop */}
            <form role="search" onSubmit={handleSearch} className="flex-1 max-w-xl mx-auto hidden md:flex">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" aria-hidden="true" />
                <input
                  type="search"
                  aria-label={lang === "de" ? "Präsentationen durchsuchen" : "Search presentations"}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-slate-100 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white transition-all text-[#0F172A] placeholder-slate-500"
                />
              </div>
            </form>

            {/* Desktop Nav */}
            <nav aria-label={lang === "de" ? "Hauptnavigation" : "Main navigation"} className="hidden md:flex items-center gap-1">
              <Link
                to="/browse"
                aria-current={location.pathname === "/browse" ? "page" : undefined}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  location.pathname === "/browse"
                    ? "text-[#2563EB] bg-blue-50"
                    : "text-slate-600 hover:text-[#0F172A] hover:bg-slate-100"
                }`}
              >
                {t.discover}
              </Link>
              <Link
                to="/upload"
                aria-current={location.pathname === "/upload" ? "page" : undefined}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  location.pathname === "/upload"
                    ? "text-[#2563EB] bg-blue-50"
                    : "text-slate-600 hover:text-[#0F172A] hover:bg-slate-100"
                }`}
              >
                {t.upload}
              </Link>
              {/* Language switcher */}
              <div role="group" aria-label={lang === "de" ? "Sprache wählen" : "Choose language"} className="flex items-center border border-slate-300 rounded-md overflow-hidden ml-1">
                <button
                  type="button"
                  onClick={() => setLang("en")}
                  aria-pressed={lang === "en"}
                  lang="en"
                  aria-label="English"
                  className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${lang === "en" ? "bg-[#1E293B] text-white" : "text-slate-700 hover:bg-slate-100"}`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLang("de")}
                  aria-pressed={lang === "de"}
                  lang="de"
                  aria-label="Deutsch"
                  className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${lang === "de" ? "bg-[#1E293B] text-white" : "text-slate-700 hover:bg-slate-100"}`}
                >
                  DE
                </button>
              </div>
              <AccountMenu user={user} />
            </nav>

            {/* Mobile: Language + AccountMenu + Hamburger */}
             <div className="md:hidden flex items-center gap-2 ml-auto">
               {/* Language switcher */}
               <div role="group" aria-label={lang === "de" ? "Sprache wählen" : "Choose language"} className="flex items-center border border-slate-300 rounded-md overflow-hidden">
                 <button
                   type="button"
                   onClick={() => setLang("en")}
                   aria-pressed={lang === "en"}
                   lang="en"
                   aria-label="English"
                   className={`px-2.5 py-1.5 min-w-[32px] text-xs font-medium transition-colors ${lang === "en" ? "bg-[#1E293B] text-white" : "text-slate-700 hover:bg-slate-100"}`}
                 >
                   EN
                 </button>
                 <button
                   type="button"
                   onClick={() => setLang("de")}
                   aria-pressed={lang === "de"}
                   lang="de"
                   aria-label="Deutsch"
                   className={`px-2.5 py-1.5 min-w-[32px] text-xs font-medium transition-colors ${lang === "de" ? "bg-[#1E293B] text-white" : "text-slate-700 hover:bg-slate-100"}`}
                 >
                   DE
                 </button>
               </div>
               {/* AccountMenu on mobile */}
               <AccountMenu user={user} />
               <button
                 type="button"
                 onClick={() => setMobileOpen(!mobileOpen)}
                 aria-expanded={mobileOpen}
                 aria-controls="mobile-menu"
                 aria-label={mobileOpen ? (lang === "de" ? "Menü schließen" : "Close menu") : (lang === "de" ? "Menü öffnen" : "Open menu")}
                 className="p-2 rounded-md text-slate-700 hover:bg-slate-100"
               >
                 {mobileOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
               </button>
             </div>
          </div>
        </div>

        {/* Mobile Menu — no auth buttons */}
        {mobileOpen && (
          <nav id="mobile-menu" aria-label={lang === "de" ? "Mobile Navigation" : "Mobile navigation"} className="md:hidden border-t border-slate-200 bg-[#FDFDFD] px-4 py-4 space-y-2">
            <form role="search" onSubmit={handleSearch} className="mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" aria-hidden="true" />
                <input
                  type="search"
                  aria-label={lang === "de" ? "Präsentationen durchsuchen" : "Search presentations"}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>
            </form>
            <Link to="/browse" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md">{t.discover}</Link>
            <Link to="/upload" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md">{t.upload}</Link>
            {user && <Link to="/profile" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md">{t.profile}</Link>}
          </nav>
        )}
      </div>
    </header>
  );
}