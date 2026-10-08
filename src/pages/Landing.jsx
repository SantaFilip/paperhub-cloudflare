import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import PresentationIcon from "@/components/PresentationIcon";
import { useLang } from "@/lib/LanguageContext";

// One screen, no scrolling: a title slide. Header, title block and the legal
// footer are the only three rows, so everything has to stay compact enough to
// fit a short laptop viewport. `.ph-slide` in index.css hands the page back to
// normal scrolling when the window is too short to hold it.
export default function Landing() {
  const { t, lang, setLang } = useLang();
  const de = lang === "de";

  return (
    <div className="ph-banner ph-banner--slide ph-slide flex flex-col">
      <img
        className="ph-banner__art"
        src="/alexandria-banner.webp"
        alt=""
        aria-hidden="true"
        width="1672"
        height="941"
        fetchPriority="high"
        decoding="async"
      />
      <div className="ph-banner__scrim" aria-hidden="true" />

      {/* Header */}
      <header className="relative z-[2] flex items-center justify-between px-6 sm:px-10 py-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/10 border border-white/20 rounded flex items-center justify-center">
            <PresentationIcon className="w-4 h-4 text-white" />
          </div>
          <span className="font-heading font-semibold text-white text-lg tracking-tight">
            Paper<span className="text-[#F0DFB4]">Hub</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div
            role="group"
            aria-label={de ? "Sprache wählen" : "Choose language"}
            className="flex items-center border border-white/30 rounded-md overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setLang("en")}
              aria-pressed={lang === "en"}
              lang="en"
              aria-label="English"
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${lang === "en" ? "bg-white text-[#0F172A]" : "text-white hover:bg-white/15"}`}
            >EN</button>
            <button
              type="button"
              onClick={() => setLang("de")}
              aria-pressed={lang === "de"}
              lang="de"
              aria-label="Deutsch"
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${lang === "de" ? "bg-white text-[#0F172A]" : "text-white hover:bg-white/15"}`}
            >DE</button>
          </div>
          <Link
            to="/register"
            className="px-4 py-1.5 text-xs font-medium text-[#0F172A] bg-[#F0DFB4] rounded-md hover:bg-[#E6D099] transition-colors"
          >
            {t.register}
          </Link>
        </div>
      </header>

      {/* Title block */}
      <main
        id="main-content"
        tabIndex={-1}
        className="focus:outline-none relative z-[2] flex-1 flex flex-col items-center justify-center px-4 text-center"
      >
        <p className="text-[#F0DFB4] text-[11px] sm:text-xs font-medium tracking-[0.22em] uppercase mb-5">
          {de ? "Globales Wissenschafts-Archiv" : "Global Science Presentation Archive"}
        </p>

        <h1 className="font-heading text-white text-4xl sm:text-5xl lg:text-6xl font-semibold leading-tight mb-5 max-w-3xl text-balance">
          {de ? (
            <>Wissenschaft <span className="text-[#F0DFB4]">teilen</span> &amp; entdecken</>
          ) : (
            <>Share &amp; discover <span className="text-[#F0DFB4]">science</span></>
          )}
        </h1>

        <div
          aria-hidden="true"
          className="mx-auto mb-5 h-px w-24 bg-gradient-to-r from-transparent via-[#C79A52] to-transparent"
        />

        <p className="text-[#E2DDD0] text-base sm:text-lg max-w-xl mb-9 leading-relaxed">
          {de
            ? "Lade Präsentationen hoch, verknüpfe sie mit dem Original-Paper via DOI und hilf anderen, Forschung schneller zu verstehen."
            : "Upload presentations, link them to the original paper via DOI, and help others understand research faster."}
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/register"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#F0DFB4] text-[#0F172A] text-sm font-semibold rounded-lg hover:bg-[#E6D099] transition-colors min-h-[48px]"
          >
            {de ? "Kostenlos registrieren" : "Get started for free"}
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </Link>
          <Link
            to="/browse"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-white text-sm font-semibold rounded-lg border border-white/35 hover:bg-white/10 transition-colors min-h-[48px]"
          >
            {de ? "Archiv durchsuchen" : "Browse archive"}
          </Link>
        </div>

        <p className="mt-8 text-sm text-[#E2DDD0]">
          {de ? "Bereits registriert?" : "Already have an account?"}{" "}
          <Link to="/login" className="text-[#F0DFB4] font-medium underline underline-offset-2">
            {t.signIn}
          </Link>
        </p>
      </main>

      {/* Impressum, Datenschutz and the accessibility statement have to stay
          reachable from the start page, so the footer stays on the slide. */}
      <div className="relative z-[2]"><Footer tone="onDark" /></div>
    </div>
  );
}
