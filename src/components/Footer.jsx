import { Link } from "react-router-dom";
import { useLang } from "@/lib/LanguageContext";

export default function Footer() {
  const { lang } = useLang();
  const takedownSubject = encodeURIComponent(lang === "de" ? "Urheberrechts-Beschwerde" : "Copyright complaint");
  return (
    <footer className="border-t border-slate-200 bg-[#FDFDFD]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <p>© {new Date().getFullYear()} PaperHub</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 justify-center">
          <Link to="/impressum" className="hover:text-[#0F172A] transition-colors">{lang === "de" ? "Impressum" : "Legal Notice"}</Link>
          <Link to="/datenschutz" className="hover:text-[#0F172A] transition-colors">{lang === "de" ? "Datenschutz" : "Privacy"}</Link>
          <Link to="/agb" className="hover:text-[#0F172A] transition-colors">{lang === "de" ? "AGB" : "Terms"}</Link>
          <Link to="/haftungsausschluss" className="hover:text-[#0F172A] transition-colors">{lang === "de" ? "Haftungsausschluss" : "Disclaimer"}</Link>
          <a href={`mailto:info@filipsudermann.com?subject=${takedownSubject}`} className="hover:text-red-600 transition-colors">{lang === "de" ? "Inhalt melden" : "Report content"}</a>
        </div>
      </div>
    </footer>
  );
}