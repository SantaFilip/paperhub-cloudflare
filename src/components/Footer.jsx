import { Link } from "react-router-dom";
import { useLang } from "@/lib/LanguageContext";

// `tone` only switches the colours. "onDark" is for the title slide, where the
// footer sits on the photograph instead of on the page background.
export default function Footer({ tone = "onLight" }) {
  const { lang } = useLang();
  const onDark = tone === "onDark";
  const takedownSubject = encodeURIComponent(lang === "de" ? "Urheberrechts-Beschwerde" : "Copyright complaint");

  const shell = onDark
    ? "border-t border-white/20 bg-[#070D15]/70"
    : "border-t border-slate-200 bg-[#FDFDFD]";
  const text = onDark ? "text-[#CFCABD]" : "text-slate-600";
  const link = onDark ? "hover:text-white transition-colors" : "hover:text-[#0F172A] transition-colors";
  const report = onDark ? "hover:text-[#F3B0A8] transition-colors" : "hover:text-red-700 transition-colors";

  return (
    <footer className={shell}>
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${text}`}>
        <p>© {new Date().getFullYear()} PaperHub</p>
        <nav aria-label={lang === "de" ? "Rechtliches" : "Legal"} className="flex flex-wrap items-center gap-x-4 gap-y-2 justify-center">
          <Link to="/impressum" className={link}>{lang === "de" ? "Impressum" : "Legal Notice"}</Link>
          <Link to="/datenschutz" className={link}>{lang === "de" ? "Datenschutz" : "Privacy"}</Link>
          <Link to="/agb" className={link}>{lang === "de" ? "AGB" : "Terms"}</Link>
          <Link to="/haftungsausschluss" className={link}>{lang === "de" ? "Haftungsausschluss" : "Disclaimer"}</Link>
          <Link to="/barrierefreiheit" className={link}>{lang === "de" ? "Barrierefreiheit" : "Accessibility"}</Link>
          <a href={`mailto:info@filipsudermann.com?subject=${takedownSubject}`} className={report}>{lang === "de" ? "Inhalt melden" : "Report content"}</a>
        </nav>
      </div>
    </footer>
  );
}