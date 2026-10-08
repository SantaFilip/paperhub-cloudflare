import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";
import Footer from "./Footer";

export function H2({ children }) {
  return <h2 className="font-heading text-lg font-semibold text-[#0F172A] mt-6 mb-2">{children}</h2>;
}

export function P({ children }) {
  return <p className="text-sm text-slate-700 leading-relaxed">{children}</p>;
}

export function UL({ items }) {
  return (
    <ul className="text-sm text-slate-700 leading-relaxed list-disc pl-5 space-y-1">
      {items.map((it, i) => <li key={i}>{it}</li>)}
    </ul>
  );
}

export default function LegalPage({ title, children, updated = "05.07.2026" }) {
  const { lang } = useLang();
  return (
    <div className="min-h-screen bg-[#FDFDFD]">
      <main id="main-content" tabIndex={-1} className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 focus:outline-none">
        <Link to="/browse" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#0F172A] transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          {lang === "de" ? "Zurück zum Erkunden" : "Back to browse"}
        </Link>
        <h1 className="font-heading text-3xl font-semibold text-[#0F172A] mb-4">{title}</h1>
        <div className="space-y-1">{children}</div>
        <p className="text-xs text-slate-600 mt-10">Stand: {updated}</p>
      </main>
      <Footer />
    </div>
  );
}