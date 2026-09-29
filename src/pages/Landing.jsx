import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { BookOpen, Star, Download, MessageSquare, FileText, ChevronRight, Search } from "lucide-react";
import PresentationIcon from "@/components/PresentationIcon";
import { useLang } from "@/lib/LanguageContext";

// Decorative floating paper cards for background
const mockPapers = [];

function PaperCard({ paper, style, rotate }) {
  if (!paper) return null;
  return (
    <div
      className="absolute bg-white border border-slate-200 rounded-xl shadow-lg p-4 w-64 pointer-events-none select-none"
      style={{ ...style, transform: `rotate(${rotate}deg)`, opacity: 0.85 }}
    >
      {/* Slide preview bar */}
      <div className="flex items-center gap-1.5 mb-3">
        <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center flex-shrink-0">
          <FileText className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-800 leading-tight truncate">{paper.title}</p>
          <span className="text-xs text-blue-600 font-medium">{paper.discipline}</span>
        </div>
      </div>
      {/* Slide strip */}
      <div className="flex gap-1 mb-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className={`flex-1 h-8 rounded ${i === 0 ? "bg-blue-100 border border-blue-200" : "bg-slate-100 border border-slate-200"} flex items-center justify-center`}>
            <div className={`w-4 h-0.5 ${i === 0 ? "bg-blue-300" : "bg-slate-300"} rounded`} />
          </div>
        ))}
      </div>
      {/* Stats row */}
      <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-1">
          <Star className="w-3 h-3 text-amber-700 fill-amber-500" />
          <span className="text-xs font-bold text-slate-700">{paper.rating}</span>
        </div>
        <div className="flex items-center gap-1">
          <Download className="w-3 h-3 text-slate-500" />
          <span className="text-xs text-slate-500">{paper.downloads}</span>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <FileText className="w-3 h-3 text-slate-500" />
          <span className="text-xs text-slate-500">{paper.slides} slides</span>
        </div>
      </div>
      {/* Comment box */}
      <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5">
        <div className="flex items-center gap-1.5 mb-1">
          <MessageSquare className="w-3 h-3 text-blue-500" />
          <span className="text-xs font-semibold text-slate-600">{paper.reviewer}</span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">"{paper.comment}"</p>
      </div>
    </div>
  );
}

export default function Landing() {
  const { t, lang, setLang } = useLang();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-white overflow-hidden relative flex flex-col">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(37,99,235,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(37,99,235,0.04)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

      {/* Floating paper cards — desktop only */}
      <div className="hidden lg:block">
        <PaperCard paper={mockPapers[0]} style={{ top: "80px", left: "-40px" }} rotate={-6} />
        <PaperCard paper={mockPapers[1]} style={{ top: "320px", left: "-20px" }} rotate={3} />
        <PaperCard paper={mockPapers[2]} style={{ bottom: "60px", left: "20px" }} rotate={-4} />
        <PaperCard paper={mockPapers[3]} style={{ top: "80px", right: "-30px" }} rotate={5} />
        <PaperCard paper={mockPapers[4]} style={{ top: "340px", right: "-10px" }} rotate={-3} />
        <PaperCard paper={mockPapers[5]} style={{ bottom: "60px", right: "10px" }} rotate={4} />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#1E293B] rounded flex items-center justify-center">
            <PresentationIcon className="w-4 h-4 text-white" />
          </div>
          <span className="font-heading font-semibold text-[#0F172A] text-lg tracking-tight">
            Paper<span className="text-[#2563EB]">Hub</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Language switcher */}
          <div role="group" aria-label={lang === "de" ? "Sprache wählen" : "Choose language"} className="flex items-center border border-slate-300 rounded-md overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => setLang("en")}
              aria-pressed={lang === "en"}
              lang="en"
              aria-label="English"
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${lang === "en" ? "bg-[#1E293B] text-white" : "text-slate-700 hover:bg-slate-100"}`}
            >EN</button>
            <button
              type="button"
              onClick={() => setLang("de")}
              aria-pressed={lang === "de"}
              lang="de"
              aria-label="Deutsch"
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${lang === "de" ? "bg-[#1E293B] text-white" : "text-slate-700 hover:bg-slate-100"}`}
            >DE</button>
          </div>
          <Link
            to="/register"
            className="px-4 py-1.5 text-xs font-medium text-white bg-[#2563EB] rounded-md hover:bg-blue-700 transition-colors"
          >
            {t.register}
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main id="main-content" tabIndex={-1} className="focus:outline-none relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full text-xs font-medium text-blue-700 mb-6">
          <Search className="w-3 h-3" />
          {lang === "de" ? "Globales Wissenschafts-Archiv" : "Global Science Presentation Archive"}
        </div>

        <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-[#0F172A] mb-4 leading-tight max-w-2xl">
          {lang === "de" ? (
            <>Wissenschaft <span className="text-[#2563EB]">teilen</span> & entdecken</>
          ) : (
            <>Share & discover <span className="text-[#2563EB]">science</span></>
          )}
        </h1>
        <p className="text-slate-500 text-base sm:text-lg max-w-lg mb-10 leading-relaxed">
          {lang === "de"
            ? "Lade Präsentationen hoch, verknüpfe sie mit dem Original-Paper via DOI und hilf anderen, Forschung schneller zu verstehen."
            : "Upload presentations, link them to the original paper via DOI, and help others understand research faster."}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-12">
          <Link
            to="/register"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#2563EB] text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-md shadow-blue-200 min-h-[48px]"
          >
            {lang === "de" ? "Kostenlos registrieren" : "Get started for free"}
            <ChevronRight className="w-4 h-4" />
          </Link>
          <Link
            to="/browse"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white text-[#0F172A] text-sm font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors min-h-[48px]"
          >
            {lang === "de" ? "Archiv durchsuchen" : "Browse archive"}
          </Link>
        </div>

        {/* Feature tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full">
          {[
            {
              icon: FileText,
              title: lang === "de" ? "PPT & PDF Upload" : "PPT & PDF Upload",
              desc: lang === "de" ? "Präsentationen direkt hochladen" : "Upload your slides directly",
            },
            {
              icon: BookOpen,
              title: "DOI Linking",
              desc: lang === "de" ? "Jede Präsentation mit dem Originalpaper verknüpft" : "Every slide linked to the source paper",
            },
            {
              icon: Star,
              title: lang === "de" ? "Bewertungen" : "Peer Ratings",
              desc: lang === "de" ? "Community bewertet und kommentiert" : "Community rates and reviews",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="group bg-white border border-slate-200 rounded-2xl p-5 text-left shadow-sm hover:shadow-lg hover:shadow-blue-100/60 hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden">
              <div className="absolute -top-6 -right-6 w-20 h-20 bg-blue-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative w-10 h-10 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center mb-3 ring-1 ring-blue-100">
                <Icon className="w-5 h-5 text-[#2563EB]" />
              </div>
              <p className="relative text-sm font-semibold text-[#0F172A] mb-1">{title}</p>
              <p className="relative text-xs text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
        {/* Sign-in hint */}
        <p className="mt-16 text-center text-sm text-slate-600">
          {lang === "de" ? "Bereits registriert?" : "Already have an account?"}{" "}
          <Link to="/login" className="text-[#1D4ED8] font-medium">
            {t.signIn}
          </Link>
        </p>
      </main>
      <div className="relative z-10"><Footer /></div>
    </div>
  );
}